import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {groundHeight} from './ground.js';
// Optional imported models (public/models/**.glb). Every slot keeps its
// code-built fallback, so a missing or broken file never breaks the game:
// the fallback is only hidden once the model has loaded successfully.
const BASE=(import.meta.env?.BASE_URL||'/')+'models/';
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache=new Map();
export function loadModel(path){
 if(!cache.has(path))cache.set(path,loader.loadAsync(BASE+path).catch(()=>null));
 return cache.get(path);
}
// Scale a model to a real-world height, centre it, and put its base at y=0,
// whatever units or pivot the exporting tool used.
export function normalizeModel(scene,{height=null,length=null}={}){
 const box=new THREE.Box3().setFromObject(scene),size=box.getSize(new THREE.Vector3());
 const scale=height?height/Math.max(size.y,1e-4):length?length/Math.max(size.x,size.z,1e-4):1;
 scene.scale.multiplyScalar(scale);
 box.setFromObject(scene);const center=box.getCenter(new THREE.Vector3());
 scene.position.x-=center.x;scene.position.z-=center.z;scene.position.y-=box.min.y;
 const holder=new THREE.Group();holder.add(scene);
 scene.traverse(m=>{if(m.isMesh){m.castShadow=m.receiveShadow=true;}});
 return holder;
}
// Replace a group of code-built props with copies of an imported model.
export async function swapProps(game,path,fallback,placements,options={}){
 const gltf=await loadModel(path);if(!gltf)return false;
 const model=normalizeModel(gltf.scene,options);
 for(const [x,z,rotation=0] of placements){
  const copy=model.clone(true);copy.position.set(x,groundHeight(x,z),z);copy.rotation.y=rotation;copy.name=`model ${path}`;game.scene.add(copy);
 }
 if(fallback)fallback.visible=false;
 return true;
}
// Weapons: GLB files point their barrel along +Z with the grip at the origin
// and an empty named "muzzle" at the barrel tip. Game guns point along -Z, so
// the model is turned 180°, the code-built gun is hidden, and the gun's
// muzzle/flash move to the model's real barrel tip (shots start there).
const WEAPON_FILES={draco:'draco',arp:'arp',switch:'switch',akimbo:'switch'};
// Characters are stylized (about 2.1 m, chunky hands), so real-size guns read as
// toys. Each model is scaled to the length of the gun it replaces.
const WEAPON_LENGTH={draco:.8,arp:1.02,switch:.34,akimbo:.34};
export async function upgradeWeapon(game,id,gun){
 if(game.quality==='low')return false;
 const gltf=await loadModel(`weapons/${WEAPON_FILES[id]}.glb`);if(!gltf||!gun.group.parent)return false;
 const model=gltf.scene.clone(true);model.rotation.y=Math.PI;model.name=`weapon model ${id}`;
 gltf.length??=new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3()).z;model.scale.setScalar(WEAPON_LENGTH[id]/Math.max(gltf.length,.01));
 model.traverse(m=>{if(m.isMesh){m.castShadow=true;m.userData.weaponPart=true;}});
 gun.group.children.filter(c=>c.isMesh).forEach(c=>c.visible=false);
 gun.group.add(model);model.updateMatrixWorld(true);
 const tip=model.getObjectByName('muzzle');
 if(tip){const p=gun.group.worldToLocal(tip.getWorldPosition(new THREE.Vector3()));gun.muzzle.position.copy(p);gun.flash.position.set(p.x,p.y,p.z-.16);}
 gun.model=model;return true;
}
// Cars: GLB nodes body, wheel_FL/FR/RL/RR (pivot at the hub) and door_driver
// (pivot on the front hinge). Models face +Z, so the holder is turned 180°;
// the game then spins the wheel nodes and swings the door node itself.
export async function upgradeCar(game,car,file,tint=null){
 const gltf=await loadModel(`cars/${file}.glb`);if(!gltf||!car.group.parent)return false;
 const model=gltf.scene.clone(true),holder=new THREE.Group();holder.rotation.y=Math.PI;holder.add(model);holder.name=`car model ${file}`;
 model.traverse(m=>{if(m.isMesh){m.castShadow=m.receiveShadow=true;}});
 // Optional paint tint on the body only (territory colours for parked cars).
 if(tint)model.getObjectByName('body')?.traverse(m=>{if(m.isMesh){m.material=m.material.clone();m.material.color.set(tint);}});
 const wheels=['wheel_FL','wheel_FR','wheel_RL','wheel_RR'].map(n=>model.getObjectByName(n)).filter(Boolean),door=model.getObjectByName('door_driver');
 if(wheels.length!==4||!door)return false;
 const doorAngle=car.door.rotation.y;
 car.group.children.forEach(c=>c.visible=false);car.group.add(holder);
 door.rotation.y=doorAngle;
 Object.assign(car,{wheels,door,windowMeshes:[new THREE.Object3D()],model:holder});
 return true;
}
// Dusk street HDRI (CC0, Poly Haven) for image-based lighting and reflections.
// The painted sky stays; the HDRI only replaces the neutral studio environment.
export function loadEnvironment(game){
 // Low graphics keeps the cheap built-in studio environment (no HDR download or PMREM pass).
 if(game.quality==='low')return;
 import('three/addons/loaders/HDRLoader.js').then(({HDRLoader})=>{
  const file=game.quality==='high'?'dusk-city-2k.hdr':'dusk-city-1k.hdr';
  new HDRLoader().load((import.meta.env?.BASE_URL||'/')+'textures/hdri/'+file,texture=>{
   const pmrem=new THREE.PMREMGenerator(game.renderer),env=pmrem.fromEquirectangular(texture).texture;
   texture.dispose();pmrem.dispose();
   game.scene.environment=env;game.scene.environmentIntensity=.55;game.environmentMap=env;
  },undefined,()=>{/* Keep the built-in environment. */});
 }).catch(()=>{});
}
