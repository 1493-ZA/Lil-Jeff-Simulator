import * as THREE from 'three';

// Deterministic, locally generated surface maps; no external image downloads.
export function addSky(game) {
  const canvas=document.createElement('canvas');canvas.width=16;canvas.height=256;
  const ctx=canvas.getContext('2d');
  const gradient=ctx.createLinearGradient(0,0,0,256);
  gradient.addColorStop(0,'#18233a');gradient.addColorStop(.45,'#576579');gradient.addColorStop(.6,'#be8a79');gradient.addColorStop(.75,'#7d7777');gradient.addColorStop(1,'#3b414d');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,16,256);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sky=new THREE.Mesh(new THREE.SphereGeometry(80,24,16),new THREE.MeshBasicMaterial({map:texture,side:THREE.BackSide,depthWrite:false,fog:false}));
  sky.position.set(0,0,-25);game.sky=sky;game.scene.add(sky);
}

let clothMap;
export function clothingMap(){
  if(clothMap)return clothMap;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');
  let seed=88;for(let y=0;y<128;y++)for(let x=0;x<128;x++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const v=180+(seed%45)+(x%3===0?15:0)-(y%4===0?12:0);ctx.fillStyle=`rgb(${v},${v},${v})`;ctx.fillRect(x,y,1,1);}
  clothMap=new THREE.CanvasTexture(canvas);clothMap.wrapS=clothMap.wrapT=THREE.RepeatWrapping;clothMap.repeat.set(3,3);clothMap.colorSpace=THREE.SRGBColorSpace;return clothMap;
}
