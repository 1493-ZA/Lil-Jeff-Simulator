import * as THREE from 'three';
import {groundHeight} from './ground.js';
// Restrained, non-graphic impact feedback: a few short-lived dark droplets on
// hit and a small soft stain beneath a defeated rival. Counts are capped.
const MAX_STAINS=24,MAX_DROPS=48;
let stainTexture=null,dropGeometry=null,dropMaterial=null;
function texture(){
 if(stainTexture)return stainTexture;
 const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');
 const g=ctx.createRadialGradient(32,32,4,32,32,30);g.addColorStop(0,'rgba(92,10,14,.9)');g.addColorStop(.65,'rgba(70,8,12,.55)');g.addColorStop(1,'rgba(50,6,10,0)');
 ctx.fillStyle=g;ctx.beginPath();for(let i=0;i<14;i++){const a=i/14*Math.PI*2,r=24+Math.sin(i*2.7)*5;ctx[i?'lineTo':'moveTo'](32+Math.cos(a)*r,32+Math.sin(a)*r);}ctx.fill();
 stainTexture=new THREE.CanvasTexture(c);stainTexture.colorSpace=THREE.SRGBColorSpace;return stainTexture;
}
export function impactDroplets(game,point,direction){
 game.drops??=[];const limit=Math.min(MAX_DROPS,game.qualitySettings?.fx??40);
 for(let i=0;i<3&&game.drops.length<limit;i++){
  dropGeometry??=new THREE.SphereGeometry(.025,5,4);dropMaterial??=new THREE.MeshBasicMaterial({color:'#5c0d12'});
  const mesh=new THREE.Mesh(dropGeometry,dropMaterial);
  mesh.position.copy(point);game.scene.add(mesh);
  const velocity=direction.clone().multiplyScalar(1.2).add(new THREE.Vector3((Math.random()-.5)*1.6,Math.random()*1.4,(Math.random()-.5)*1.6));
  game.drops.push({mesh,velocity,life:.45});
 }
}
export function groundStain(game,position,size=.55){
 game.stains??=[];
 if(game.stains.length>=MAX_STAINS){const old=game.stains.shift();old.mesh.removeFromParent();old.mesh.geometry.dispose();old.mesh.material.dispose();}
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:texture(),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,opacity:.8}));
 mesh.name='ground stain';mesh.rotation.set(-Math.PI/2,0,Math.random()*Math.PI);
 mesh.position.set(position.x,groundHeight(position.x,position.z)+.015,position.z);mesh.scale.setScalar(.05);
 game.scene.add(mesh);game.stains.push({mesh,size,age:0});
}
export function updateBlood(game,dt){
 for(let i=(game.drops?.length||0)-1;i>=0;i--){const d=game.drops[i];d.life-=dt;d.velocity.y-=9*dt;d.mesh.position.addScaledVector(d.velocity,dt);
  const floor=groundHeight(d.mesh.position.x,d.mesh.position.z);
  if(d.life<=0||d.mesh.position.y<floor){d.mesh.removeFromParent();game.drops.splice(i,1);}}
 for(const s of game.stains||[])if(s.age<2.5){s.age+=dt;s.mesh.scale.setScalar(.05+s.size*Math.min(1,s.age/2.5));}
}
export function clearBlood(game){for(const d of game.drops||[])d.mesh.removeFromParent();for(const s of game.stains||[]){s.mesh.removeFromParent();s.mesh.geometry.dispose();s.mesh.material.dispose();}game.drops=[];game.stains=[];}
