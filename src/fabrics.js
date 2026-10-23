import * as THREE from 'three';
import {clothingMap} from './surfaces.js';
// CC0 Poly Haven fabric sets (public/textures/fabric): fleece for tops,
// denim for pants, leather for jackets and shoes. Loaded once and shared.
const BASE=(import.meta.env?.BASE_URL||'/')+'textures/fabric/';
const sets={};
export function fabric(kind){
 if(typeof document==='undefined')return null;
 if(!sets[kind]){
  const loader=new THREE.TextureLoader(),load=(file,srgb)=>{const t=loader.load(`${BASE}${kind}/${file}.jpg`,undefined,undefined,()=>{sets[kind].failed=true;});t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(kind==='leather'?1.5:2.5,kind==='leather'?1.5:2.5);if(srgb)t.colorSpace=THREE.SRGBColorSpace;return t;};
  sets[kind]={map:load('color',true),normalMap:load('normal',false),roughnessMap:load('roughness',false)};
 }
 return sets[kind];
}
// Material properties for a cloth colour; falls back to the procedural weave.
export function fabricProps(kind){
 const set=fabric(kind);
 if(!set)return{map:clothingMap(),bumpMap:clothingMap(),bumpScale:.025};
 return{map:set.map,normalMap:set.normalMap,normalScale:new THREE.Vector2(.6,.6),roughnessMap:set.roughnessMap,roughness:1};
}
