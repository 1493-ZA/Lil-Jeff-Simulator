import * as THREE from 'three';
import {batchStatic} from './quality.js';
// Compact second block reached through the passage at z=-31. Render batches
// are local to each building so the renderer can cull individual lots.
export function buildDistrict(game,brick){
 const root=new THREE.Group();root.name='Commerce Row and Rival Block';game.scene.add(root);
 const box=(w,h,d,c,x,y,z,solid=false,parent=root)=>game.box(w,h,d,c,x,y,z,{parent,solid});
 box(54,.18,104,'#616260',52,-.14,-29);
 box(54,.12,6,'#62676a',35,-.04,-31);box(18,.1,101,'#414850',56,-.06,-29);
 for(const x of [45.5,66.5])box(3,.14,100,'#96938a',x,.01,-29);
 for(let z=15;z>-79;z-=7)box(.12,.015,3,'#b7aa79',56,.01,z);
 for(const side of [-1,1])for(let i=0;i<5;i++){
  const z=8-i*20;if(side<0&&(i===0||i===2))continue;
  const x=56+side*17,h=6+(i%3)*2;
  const lot=new THREE.Group();root.add(lot);
  const wall=box(10,h,14,i%2?'#73685f':'#8b6b5b',x,h/2,z,true,lot);wall.material.map=brick.map;wall.material.bumpMap=brick.bumpMap;wall.material.bumpScale=.04;
  box(10.4,.2,14.4,'#373d44',x,h,z,false,lot);
  for(let f=0;f<2;f++)for(let n=-1;n<=1;n++){box(.06,1.5,1.3,'#374c60',x-side*5.05,2+f*2.5,z+n*4,false,lot);box(.09,.1,1.5,'#b4aca0',x-side*5.1,1.2+f*2.5,z+n*4,false,lot);}
  box(.1,2.3,1.2,'#263d5e',x-side*5.1,1.2,z,false,lot);batchStatic(lot);
 }
 const sign=game.label('COMMERCE ROW / NIGHT MARKET','#e6d7a8',6,33,3,-31,27);sign.name='neutral district sign';
 const rival=game.label('EAST YARD / FICTIONAL RIVALS','#72a9ff',6,56,4,-54,27);
 const home=game.label('AFTER HOURS / HOME BLOCK','#9de5c6',6,12,4,-31,27);
 // Back-building alleys: pass-through gaps remain open at -31 and -47.
 for(const [x,z]of [[28,-40],[29,-55],[43,-16],[68,-44],[44,-65]]){
  box(1.6,1.3,2.2,'#42594e',x,.65,z,true);box(1.7,.1,2.3,'#263c35',x,1.35,z);
  box(.8,1,.25,'#626b68',x+.8,.8,z+2);
  for(let n=0;n<3;n++){const bag=new THREE.Mesh(new THREE.IcosahedronGeometry(.28,1),game.material('#252c31'));bag.position.set(x-1+n*.28,.24,z+1.8);root.add(bag);}
 }
 for(const [x,z]of [[26,-39],[26,-59],[68,-11],[44,-54]]){
  box(.1,2.2,1.1,'#4c4c46',x,1.1,z);
  for(let f=0;f<3;f++){
   box(1.8,.08,3,'#333d42',x+1,2.7+f*2.2,z);
   for(let n=0;n<5;n++)box(.04,.8,.04,'#68716d',x+1.9,3.1+f*2.2,z-1.2+n*.6);
   for(let n=0;n<7;n++)box(.8,.04,.18,'#58635f',x+1,1.2+f*2.2+n*.2,z-1.4+n*.4);
  }
 }
 for(const x of [30,65])for(const z of [-20,-58]){
  box(.14,5,.14,'#424c50',x,2.5,z);const lamp=new THREE.PointLight(x===30?'#ffc992':'#79abff',10,11,2);lamp.position.set(x,4.5,z);root.add(lamp);
 }
 for(const [x,z]of [[33,-12],[70,-64],[29,-64]]){box(2,1.2,1,'#667166',x,.6,z,true);box(2.1,.1,1.1,'#929888',x,1.25,z);}
 for(const [x,z]of [[63,-13],[49,-58]]){
  box(2.2,.65,4.2,'#3a4b59',x,.8,z,true);box(1.9,.6,2.3,'#445b68',x,1.4,z);
  for(const side of [-1,1])for(const dz of [-1.3,1.3])box(.25,.6,.65,'#20272d',x+side*1.1,.4,z+dz);
 }
 for(const x of [28,69])for(let n=0;n<8;n++)box(.035,1.7,.035,'#7d8582',x,.85,-58+n*.3);
 const mural=game.label('MAKE SOMETHING / AFTER HOURS','#c792eb',5,30,3,-56,24);mural.rotation.y=Math.PI/2;
 batchStatic(root);game.district=root;
}
