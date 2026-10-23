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
