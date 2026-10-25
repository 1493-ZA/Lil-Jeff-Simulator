import * as THREE from 'three';
import {loadModel} from './assets.js';
import {groundHeight} from './ground.js';
// Street prop models (public/models/props). They are modelled at real size
// with the origin where the spec puts it, so they are placed as they are. The
// code-built version of each prop is tagged while the world is built and only
// hidden once its model has loaded; colliders never change.
export function propSpot(game,file,x,y,z,rotation=0,extra={}){
 ((game.propSpots??={})[file]??=[]).push({x,y,z,rotation,...extra});
}
export function propFallback(game,file,object){((game.propFallbacks??={})[file]??=[]).push(object);}
export async function installProps(game){
 await Promise.all(Object.entries(game.propSpots||{}).map(async([file,spots])=>{
  const gltf=await loadModel(`props/${file}.glb`);if(!gltf)return;
  const group=new THREE.Group();group.name=`props ${file}`;
  for(const s of spots){
   const m=gltf.scene.clone(true);m.position.set(s.x,s.y??groundHeight(s.x,s.z),s.z);m.rotation.y=s.rotation;if(s.scaleX)m.scale.x=s.scaleX;
   m.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;
    // Trash cans take the territory colour on their `paint` material.
    if(s.tint&&o.material?.name==='paint'){o.material=o.material.clone();o.material.color.set(s.tint);}});
   group.add(m);
  }
  game.scene.add(group);
  for(const f of game.propFallbacks?.[file]||[])f.visible=false;
 }));
}
