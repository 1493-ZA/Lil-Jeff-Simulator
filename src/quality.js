import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export const QUALITY={low:{ratio:1,shadow:0,far:100,fx:20},medium:{ratio:1.25,shadow:1024,far:150,fx:40},high:{ratio:1.5,shadow:2048,far:220,fx:70}};
// Static parts share a draw call per material. Moving arms, legs and flashes stay separate.
export function batchStatic(group,recursive=false){
 group.updateWorldMatrix(true,true);const inverse=group.matrixWorld.clone().invert(),batches=new Map();
 const meshes=[];if(recursive)group.traverse(m=>{if(m.isMesh&&m.visible)meshes.push(m);});else meshes.push(...group.children.filter(m=>m.isMesh&&m.visible));
 for(const mesh of meshes){if(mesh.name==='torso')continue;const material=mesh.material,key=[material.color.getHex(),material.roughness,material.metalness].join(':');if(material.map||material.transparent)continue;
  if(!batches.has(key))batches.set(key,[]);batches.get(key).push(mesh);
 }
 for(const meshes of batches.values()){
  if(meshes.length<2)continue;const pieces=meshes.map(m=>m.geometry.clone().toNonIndexed().applyMatrix4(inverse.clone().multiply(m.matrixWorld)));const geometry=mergeGeometries(pieces);pieces.forEach(g=>g.dispose());if(!geometry)continue;
  const combined=new THREE.Mesh(geometry,meshes[0].material);combined.castShadow=true;combined.receiveShadow=true;combined.name='batched static detail';group.add(combined);
  for(const [i,m]of meshes.entries()){m.removeFromParent();m.geometry.dispose();if(i)m.material.dispose();}
 }
}
export function setQuality(game,name){
 const settings=QUALITY[name]||QUALITY.medium;game.quality=QUALITY[name]?name:'medium';game.qualitySettings=settings;
 game.renderer.setPixelRatio(Math.min(devicePixelRatio,settings.ratio));game.renderer.shadowMap.enabled=Boolean(settings.shadow);game.camera.far=settings.far;game.camera.updateProjectionMatrix();
 game.scene.traverse(o=>{if(o.isDirectionalLight){o.castShadow=Boolean(settings.shadow);o.shadow.mapSize.set(settings.shadow||512,settings.shadow||512);o.shadow.map?.dispose();o.shadow.map=null;}});game.resize();
 try{localStorage.setItem('lil-jeff-quality',game.quality);}catch{}
 document.querySelectorAll('[data-quality]').forEach(el=>el.value=game.quality);
}
