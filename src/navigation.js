import * as THREE from 'three';
import {ROSTER} from './combat.js';
import {OBJECTIVES,DRIVE_ROUTE} from './mission.js';
import {CLAIM_POINTS,waveCount} from './campaign.js';
import {ALLEY_STOPS} from './alley.js';
import {ACTIVITIES,CONTACTS,MISSION_FOUR,AMMO_STASHES} from './street.js';
import {placeMarker,setContent,markerHTML,MarkerPool} from './markers.js';
import {zoneAt,ZONES} from './territory.js';
const point=(x,z)=>new THREE.Vector3(x,0,z);
const NAMES=['DRACO','DOOM','Z78'];
const living=g=>g.enemies.filter(e=>e.health>0);
// Approximate combat zone: the centre of the remaining group, never each rival.
function combatZone(enemies){const c=new THREE.Vector3();enemies.forEach(e=>c.add(e.group.position));return c.multiplyScalar(1/enemies.length).setY(0);}
export function currentObjective(g){
 if(g.level===1){
  if(g.driving){const route=DRIVE_ROUTE[g.car.gate];if(route)return{position:point(...route),label:`CHECKPOINT ${g.car.gate+1}/3`,icon:'➜',category:'#dbc18b'};const alive=living(g);return alive.length?{position:combatZone(alive),label:`RIVALS REMAINING: ${alive.length}`,icon:'◆',category:'#ff8880',zone:true}:null;}
  const o=OBJECTIVES[Math.min(g.stage,2)];
  if(g.stage===0){const alive=living(g);return alive.length?{position:combatZone(alive),label:'SETTLE THE SCORE',icon:'◆',category:'#ff8880',owner:0,zone:true}:null;}
  if(g.stage===2&&g.car.lockState==='ready'){const alive=living(g);return alive.length?{position:combatZone(alive),label:`RIVALS REMAINING: ${alive.length}`,icon:'◆',category:'#ff8880',zone:true}:null;}
  return{position:g.stage===2?g.car.group.position.clone().setY(0):new THREE.Vector3(...o.position),owner:o.character,label:g.stage===1?'THE MIC':'GETAWAY CAR',category:o.color,icon:g.stage===1?'♫':'▣',ring:g.stage===1};
 }
 if(g.level===2){const p=CLAIM_POINTS[g.claim.point],left=p.quota-waveCount(g);
  if(left>0)return{position:point(0,p.z),label:`RIVALS REMAINING: ${living(g).length}`,category:'#f09c86',icon:'◆',zone:true};
  if(p.role===1&&!g.claim.verseDone)return{position:point(0,p.z),owner:1,label:'CORNER CYPHER',category:ROSTER[1].color,icon:'♫',ring:true};
  if(p.role===2&&!g.claim.exitTagged){const step=g.claim.alley?.step||0,stop=ALLEY_STOPS[step===0?0:2];const guards=g.claim.alley?.guards.filter(e=>e.health>0)||[];
   if(guards.length)return{position:combatZone(guards),owner:2,label:`RIVALS REMAINING: ${guards.length}`,category:'#ff8880',icon:'◆',zone:true};
   return{position:point(...stop),owner:2,label:step===0?'PICK UP PACKAGE':'MEET MOSS',category:ROSTER[2].color,icon:'▣',ring:true};}
  return{position:point(0,p.z),label:'BRING THE CREW',category:'#9bdbbf',icon:'◇',ring:true};}
 if(g.pursuit?.phase==='entry')return{position:g.car.group.position.clone().setY(0),owner:2,label:'NEW GETAWAY CAR',category:ROSTER[2].color,icon:'▣'};
 if(g.pursuit?.phase!=='free')return null;
 const a=g.street?.active;
 if(g.street?.heat?.escape)return{position:g.street.heat.exit,label:`GET OUT THE OPP BLOCK`,category:'#7fb2ff',icon:'➜',ring:true,escape:true};
 if(a){
  if(a.type==='combat'||a.type==='target'){const alive=(a.enemies||[]).filter(e=>e.health>0);if(alive.length)return{position:combatZone(alive),label:`RIVALS REMAINING: ${alive.length}`,category:'#ff8880',icon:'◆',zone:true};}
  if(a.phase==='escape')return{position:a.destination,label:'ESCAPE TO COMMERCE ROW',category:'#9be7dc',icon:'➜',ring:true,escape:true};
  if(a.type==='delivery'){const guards=a.enemies.filter(e=>e.health>0);if(guards.length&&a.phase==='handoff')return{position:combatZone(guards),owner:2,label:`RIVALS REMAINING: ${guards.length}`,category:'#ff8880',icon:'◆',zone:true};
   return{position:a.destination,owner:2,label:a.phase==='supplier'?'MEET RELAY':a.phase==='pickup'?'PICK UP PACKAGE':`HANDOFF · ${CONTACTS[a.contact]?.short||'CLIENT'}`,category:ROSTER[2].color,icon:'▣',ring:true};}
  if(a.type==='stash')return{position:a.destination,label:a.enemies.some(e=>e.health>0)?'SECURE THE STASH':'AMMO STASH',category:'#e3c492',icon:'▤',ring:true};
 }
 return null;
}
// The one interaction available right now, placed on the object itself and
// shown only when the player is close enough to use it.
export function contextPrompt(g){
 const pos=g.player.group.position,near=(p,r)=>Math.hypot(pos.x-p.x,pos.z-p.z)<r;
 if(g.rap||g.carWork||g.finished)return null;
 const carPrompt=()=>near(g.car.group.position,4.5)?{position:g.car.group.position.clone().add(new THREE.Vector3(0,2.2,0)),owner:2,text:g.car.lockState==='locked'?'BREAK IN':g.car.lockState==='opened'?'HOTWIRE':'GET IN',hold:g.car.lockState==='locked'}:null;
 if(g.level===1){if(g.driving)return null;
  if(g.stage===1&&near(new THREE.Vector3(...OBJECTIVES[1].position),3))return{position:new THREE.Vector3(-11,1.9,-25),owner:1,text:'TAKE THE MIC'};
  if(g.stage===2)return carPrompt();return null;}
 if(g.level===2){const p=CLAIM_POINTS[g.claim.point];if(waveCount(g)<p.quota)return null;
  if(p.role===1&&!g.claim.verseDone&&Math.abs(pos.z-p.z)<7&&Math.abs(pos.x)<9)return{position:new THREE.Vector3(pos.x*.5,1.8,p.z),owner:1,text:'CORNER CYPHER'};
  if(p.role===2&&!g.claim.exitTagged){const a=g.claim.alley,step=a?.step||0,stop=ALLEY_STOPS[step===0?0:2];if(near(point(...stop),3)&&!(a?.guards||[]).some(e=>e.health>0))return{position:new THREE.Vector3(stop[0],1.3,stop[1]),owner:2,text:step===0?'PICK UP':'HAND OFF'};}
  return null;}
 if(g.pursuit?.phase==='entry')return carPrompt();
 if(g.pursuit?.phase!=='free'||!g.street)return null;
 const a=g.street.active;
 if(a){if(a.destination&&near(a.destination,3)){
   if(a.type==='delivery'&&!a.enemies.some(e=>e.health>0)&&g.elapsed>=(a.exchangeUntil||0))return{position:a.destination.clone().setY(1.9),owner:2,text:a.phase==='supplier'?'COLLECT JOB':a.phase==='pickup'?'PICK UP':'HAND OFF'};
   if(a.type==='stash'&&!a.enemies.some(e=>e.health>0))return{position:a.destination.clone().setY(1.2),text:'RESTOCK AMMO'};}
  return null;}
 if(near(MISSION_FOUR,3))return{position:MISSION_FOUR.clone().setY(1.6),text:'MISSION 4'};
 for(const [i,act]of ACTIVITIES.entries())if(!(g.street.cooldowns[i]>g.elapsed)&&near(point(act.x,act.z),3))return{position:new THREE.Vector3(act.x,1.6,act.z),owner:act.owner,text:act.verb||'START'};
 return null;
}
let pool=null,ring=null;
function destinationRing(g){
 if(ring?.parent===g.scene)return ring;
 ring=new THREE.Mesh(new THREE.RingGeometry(1.15,1.32,48),new THREE.MeshBasicMaterial({color:'#e3c492',transparent:true,opacity:.75,side:THREE.DoubleSide,depthWrite:false}));
 ring.rotation.x=-Math.PI/2;ring.name='destination ring';g.scene.add(ring);return ring;
}
export function updateNavigation(g){
 const objective=currentObjective(g),prompt=contextPrompt(g),pos=g.player.group.position;
 const el=document.querySelector('#destination-indicator'),required=document.querySelector('#required-character'),interaction=document.querySelector('#interaction');
 pool??=new MarkerPool(document.querySelector('#world-markers'));pool.begin();
 required.classList.add('hidden');el.classList.add('hidden');interaction.classList.add('hidden');
 const r=destinationRing(g);r.visible=false;
 const owner=prompt?.owner!==undefined&&prompt.owner!==g.active?prompt.owner:objective?.owner!==undefined&&objective.owner!==g.active&&!g.driving?objective.owner:null;
 if(objective&&!g.rap&&!g.carWork){
  const distance=Math.round(Math.hypot(pos.x-objective.position.x,pos.z-objective.position.z));
  // Hide the destination once its own interaction prompt takes over.
  if(!(prompt&&distance<5)){
   el.style.setProperty('--destination',objective.category);el.className=`wm objective${objective.escape?' escape':''}${objective.zone?' zone':''}`;
   setContent(el,markerHTML({icon:objective.icon,text:objective.label,distance}));
   placeMarker(g,el,objective.position.clone().add(new THREE.Vector3(0,objective.zone?2.4:2.2,0)));
  }
  if(objective.ring){r.visible=true;r.position.set(objective.position.x,objective.position.y+.06,objective.position.z);r.material.color.set(objective.category);r.material.opacity=.5+Math.sin(g.elapsed*4)*.22;}
 }
 if(owner!==null&&!g.rap&&!g.carWork){const p=g.characters[owner];required.style.setProperty('--owner',ROSTER[owner].color);required.className='wm crew';setContent(required,`<b>SWITCH TO ${ROSTER[owner].name}</b><kbd>${g.input.device==='controller'?['←','↑','→'][owner]:owner+1}</kbd>`);placeMarker(g,required,p.group.position.clone().add(new THREE.Vector3(0,2.55,0)));}
 if(prompt&&(prompt.owner===undefined||prompt.owner===g.active)){
  interaction.className='wm interact';setContent(interaction,`<kbd>${g.input.label('interact')}</kbd><b>${prompt.hold?'HOLD · ':''}${prompt.text}</b>`);placeMarker(g,interaction,prompt.position,{edge:false});
 }
 // Named rivals: a small tag only while actually in view, never through walls.
 const eye=g.camera.position;
 for(const e of g.enemies){if(!e.alias||e.health<=0)continue;const head=e.group.position.clone().add(new THREE.Vector3(0,2.35,0));if(head.distanceTo(eye)>38||!g.hasLineOfSight(eye,head))continue;pool.add(g,head,{kind:'tag',text:e.alias.toUpperCase(),color:'#ffb48a'});}
 const free=g.pursuit?.phase==='free';
 if(free&&!g.street?.active&&!g.rap){
  for(const [i,a]of ACTIVITIES.entries()){if(g.street.cooldowns[i]>g.elapsed)continue;const d=Math.hypot(pos.x-a.x,pos.z-a.z);if(d>65||d<3)continue;pool.add(g,new THREE.Vector3(a.x,2.1,a.z),{kind:'activity',icon:a.icon,text:a.short||a.name,distance:Math.round(d),color:a.owner===undefined?'#e3c492':ROSTER[a.owner].color,opacity:d>40?.55:.92});}
 }
 pool.end();
 document.querySelector('#minimap-panel').classList.toggle('hidden',!free);
 if(free)drawMinimap(g,objective);
}
function drawMinimap(g,objective){
 const canvas=document.querySelector('#minimap'),ctx=canvas.getContext('2d'),pos=g.player.group.position,scale=2.15;
 const xy=p=>[110+(p.x-pos.x)*scale,110+(p.z-pos.z)*scale];
 ctx.fillStyle='#10212be8';ctx.fillRect(0,0,220,220);ctx.save();ctx.beginPath();ctx.rect(4,4,212,212);ctx.clip();
 // Territory tint underneath the streets keeps the three areas readable.
 for(const z of ZONES){const [a,b]=xy({x:z.minX,z:-82});ctx.fillStyle=z.map;ctx.fillRect(a,b,(z.maxX-z.minX)*scale,106*scale);}
 // North-up, with real collision footprints and two connected streets.
 ctx.fillStyle='#354753';for(const x of [0,56]){const [a,b]=xy({x:x-9,z:-81});ctx.fillRect(a,b,18*scale,105*scale);}let [a,b]=xy({x:-9,z:-34});ctx.fillRect(a,b,74*scale,6*scale);
 ctx.fillStyle='#69716e';for(const box of g.colliders){if(box.max.y<3||g.railBoxes?.includes(box)||box.min.y>1)continue;const [x,y]=xy(box.min);ctx.fillRect(x,y,(box.max.x-box.min.x)*scale,(box.max.z-box.min.z)*scale);}
 if(g.rail){ctx.fillStyle='#8d7d6a';const [rx,ry]=xy({x:g.rail.minX,z:g.rail.z-1.6});ctx.fillRect(rx,ry,(g.rail.maxX-g.rail.minX)*scale,3.2*scale);}
 function icon(p,text,color,edge=false){let [x,y]=xy(p);if(!edge&&(x<5||x>215||y<5||y>215))return;const off=x<15||x>205||y<15||y>205;x=Math.max(15,Math.min(205,x));y=Math.max(15,Math.min(205,y));ctx.fillStyle='#10202b';ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fill();ctx.fillStyle=color;ctx.font='bold 13px Arial';ctx.textAlign='center';ctx.fillText(text,x,y+4);if(off&&edge){ctx.strokeStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.stroke();}}
 if(!g.street.active)for(const [i,item]of ACTIVITIES.entries())if(!(g.street.cooldowns[i]>g.elapsed))icon(item,item.icon,item.owner===undefined?'#e3c492':ROSTER[item.owner].color,true);
 icon(MISSION_FOUR,'4','#e6ba73',true);
 for(const s of AMMO_STASHES)icon(s,'▤','#cfc6a6');
 for(const p of g.characters)icon(p.group.position,p===g.player?'▲':'●',ROSTER[p.index].color,true);
 if(objective)icon(objective.position,objective.icon,objective.category,true);
 ctx.restore();ctx.fillStyle='#e2e7df';ctx.font='bold 11px Arial';ctx.textAlign='left';ctx.fillText('N ↑',12,15);
 document.querySelector('#map-zone').textContent=zoneAt(pos.x).name;
}
