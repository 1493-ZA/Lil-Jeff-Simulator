import * as THREE from 'three';

// Deterministic, locally generated surface maps; no external image downloads.
export function streetMaterial() {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d');
  const image=ctx.createImageData(512,512);
  let seed=629;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<image.data.length;i+=4){const tone=47+random()*32;image.data[i]=tone;image.data[i+1]=tone+2;image.data[i+2]=tone+5;image.data[i+3]=255;}
  ctx.putImageData(image,0,0);
  ctx.strokeStyle='#262a30';ctx.lineWidth=1.2;
  for(let i=0;i<22;i++){
    let x=random()*512,y=random()*512;ctx.beginPath();ctx.moveTo(x,y);
    for(let j=0;j<8;j++){x+=(random()-.5)*35;y+=random()*24;ctx.lineTo(x,y);}ctx.stroke();
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(4,12);map.anisotropy=4;
  const bump=map.clone();bump.colorSpace=THREE.NoColorSpace;
  return new THREE.MeshStandardMaterial({color:'#a6a8ac',map,bumpMap:bump,bumpScale:.035,roughness:.64,metalness:.15});
}

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
