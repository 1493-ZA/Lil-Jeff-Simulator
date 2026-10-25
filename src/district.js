import * as THREE from 'three';
import {batchStatic} from './quality.js';
import {buildCar} from './models.js';
import {registerParkedCar} from './carjack.js';
import {FacadeBatch,surface,addWindow,addShutter} from './facades.js';
import {propSpot,propFallback} from './props.js';
// Compact second block reached through the passage at z=-31. Render batches
// are local to each building so the renderer can cull individual lots.
export function buildDistrict(game){
 const root=new THREE.Group();root.name='Commerce Row and Rival Block';game.scene.add(root);
 const box=(w,h,d,c,x,y,z,solid=false,parent=root)=>game.box(w,h,d,c,x,y,z,{parent,solid});
 const facade=new FacadeBatch(),asphalt=surface(game,'street/asphalt',{color:'#c9c9c9'}),sidewalk=surface(game,'street/sidewalk',{color:'#d8d4cc'});
 facade.add(surface(game,'street/asphalt',{color:'#8e8e8a'}),54,.18,104,52,-.14,-29);
 facade.add(sidewalk,54,.12,6,35,-.04,-31);facade.add(asphalt,18,.1,101,56,-.06,-29);
 for(const x of [45.5,66.5]){facade.add(sidewalk,3,.14,100,x,.01,-29);facade.add(surface(game,'street/curb',{color:'#cfcac0'}),.2,.2,100,x+(x<56?1.6:-1.6),.03,-29);}
 for(let z=15;z>-79;z-=7)box(.12,.015,3,'#b7aa79',56,.01,z);
 for(const side of [-1,1])for(let i=0;i<5;i++){
  const z=8-i*20;if(side<0&&(i===0||i===2))continue;
  const x=56+side*17,h=6+(i%3)*2;
  const lot=new THREE.Group();root.add(lot);
  // Brick lots: shuttered storefronts at street level, framed windows above.
  const lotFacade=new FacadeBatch(),face=x-side*5,out=-side;
  lotFacade.add(surface(game,'building/'+(i%2?'brick-dark':'brick-red')),10,h,14,x,h/2,z,{collider:game.colliders});
  lotFacade.add(surface(game,'building/concrete-trim',{color:'#9a958d'}),10.4,.2,14.4,x,h,z);
  for(const n of [-1,1])addShutter(lotFacade,game,{x:face,z:z+n*4,side:out,h:2.3});
  for(let f=1;f<Math.max(2,Math.floor(h/2.5));f++)for(let n=-1;n<=1;n++)addWindow(lotFacade,game,{x:face,y:2+f*2.5,z:z+n*4,side:out,h:1.5,w:1.3,lit:(n+f+i+side)%3===0});
  const door=new THREE.Group();lot.add(door);box(.1,2.3,1.2,'#263d5e',x-side*5.1,1.2,z,false,door);propFallback(game,'door',door);propSpot(game,'door',x-side*5,.05,z,-side*Math.PI/2);lotFacade.flush(lot,'district facade');batchStatic(lot);
 }
 const sign=game.label('COMMERCE ROW','#e6d7a8',6,33,3,-31,30);sign.name='neutral district sign';
 const rival=game.label('OPP BLOCK','#72a9ff',5,56,4,-54,34);rival.name='rival district sign';
 const home=game.label('OUR BLOCK','#ff8a7a',5,12,4,-31,34);home.name='home district sign';
 // Back-building alleys: pass-through gaps remain open at -31 and -47.
 const dumpsters=new THREE.Group();root.add(dumpsters);propFallback(game,'dumpster',dumpsters);
 for(const [x,z]of [[28,-40],[29,-55],[43,-16],[68,-44],[44,-65]]){
  box(1.6,1.3,2.2,'#42594e',x,.65,z,true,dumpsters);box(1.7,.1,2.3,'#263c35',x,1.35,z,false,dumpsters);propSpot(game,'dumpster',x,null,z);
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
  const parked=buildCar(game,[x,0,z],{paint:'#1f4fc4',parked:true,detail:game.quality==='high',model:x>55?'muscle-1':'sedan-1',tint:'#2a5fd8'});parked.group.name='opp block parked car';
  registerParkedCar(game,parked,new THREE.Box3(new THREE.Vector3(x-1.2,0,z-2.5),new THREE.Vector3(x+1.2,1.8,z+2.5)));
 }
 for(const x of [28,69])for(let n=0;n<8;n++)box(.035,1.7,.035,'#7d8582',x,.85,-58+n*.3);
 const mural=game.label('MAKE SOMETHING / AFTER HOURS','#c792eb',5,26.3,3,-64,24);mural.rotation.y=Math.PI/2;
 facade.flush(root,"district street");batchStatic(root);game.district=root;
}
