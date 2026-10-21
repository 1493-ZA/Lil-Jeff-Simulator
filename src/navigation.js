import * as THREE from 'three';
import {ROSTER} from './combat.js';
import {OBJECTIVES,DRIVE_ROUTE} from './mission.js';
import {CLAIM_POINTS,waveCount} from './campaign.js';
import {ALLEY_STOPS} from './alley.js';
import {ACTIVITIES} from './street.js';
const point=(x,z)=>new THREE.Vector3(x,0,z);
export function currentObjective(g){
 if(g.level===1){const o=OBJECTIVES[Math.min(g.stage,2)];if(g.driving){const route=DRIVE_ROUTE[g.car.gate];if(route)return{position:point(...route),label:'GETAWAY CHECKPOINT',icon:'➜',category:'#dbc18b'};const enemy=g.enemies.find(e=>e.health>0);return enemy?{position:enemy.group.position,label:'CLEAR REMAINING RIVALS',icon:'◆',category:'#ff8880'}:null;}
 return{position:new THREE.Vector3(...o.position),owner:o.character,label:o.title.toUpperCase(),category:'#e1c58d',icon:'◇'};}
 if(g.level===2){const p=CLAIM_POINTS[g.claim.point];if(waveCount(g)<p.quota)return{position:point(0,p.z),label:'CLEAR THE CHECKPOINT',category:'#f09c86',icon:'◆'};
 if(p.role===1&&!g.claim.verseDone)return{position:point(0,p.z),owner:1,label:'CORNER VERSE',category:'#d3be88',icon:'♫'};
 if(p.role===2&&!g.claim.exitTagged){const stop=ALLEY_STOPS[Math.min(g.claim.alley?.step||0,2)];return{position:point(...stop),owner:2,label:g.claim.alley?.step===2?'CLIENT HANDOFF':'ALLEY JOB',category:'#d3be88',icon:'▣'};}
 return{position:point(0,p.z),label:'BRING THE CREW HERE',category:'#9bdbbf',icon:'◇'};}
 if(g.pursuit?.phase==='entry')return{position:g.car.group.position,owner:2,label:'NEW GETAWAY CAR',category:'#d3be88',icon:'▣'};
 if(g.pursuit?.phase!=='free')return null;
 const nearby=ACTIVITIES.find(a=>a.owner!==undefined&&a.owner!==g.active&&Math.hypot(g.player.group.position.x-a.x,g.player.group.position.z-a.z)<5);
 const a=g.street?.active||nearby;if(a)return{position:a.destination||point(a.x,a.z),owner:a.owner,label:a.phase==='escape'?'ESCAPE THE AREA':a.phase==='handoff'?'MEET THE CLIENT':a.name,category:a.phase==='escape'?'#9be7dc':'#e3c492',icon:a.phase==='escape'?'➜':a.type==='delivery'?'▣':a.type==='rap'?'♫':'◆'};
 return null;
}
function screenPosition(g,world,element){
 const v=world.clone().project(g.camera);const behind=v.z>1;let x=v.x,y=-v.y;
 if(behind){x=-x;y=-y;}
 const outside=behind||Math.abs(x)>.84||Math.abs(y)>.72;
 if(outside){const scale=Math.max(Math.abs(x)/.84,Math.abs(y)/.72,1);x/=scale;y/=scale;}
 element.style.setProperty('--bearing',`${Math.atan2(y,x)*180/Math.PI}deg`);
 element.style.left=`${(x+1)*50}%`;element.style.top=`${(y+1)*50}%`;element.classList.toggle('offscreen',outside);return outside;
}
export function updateNavigation(g){
 const objective=currentObjective(g),el=document.querySelector('#destination-indicator'),required=document.querySelector('#required-character');
 required.classList.add('hidden');el.classList.add('hidden');
 if(objective&&!g.rap){
  const distance=Math.round(g.player.group.position.distanceTo(objective.position));
  el.classList.remove('hidden');el.style.setProperty('--destination',objective.category);screenPosition(g,objective.position.clone().add(new THREE.Vector3(0,2.8,0)),el);
  el.textContent=`${objective.icon} ${objective.label} · ${distance}m`;
  if(objective.owner!==undefined&&objective.owner!==g.active){const p=g.characters[objective.owner];required.classList.remove('hidden');required.style.setProperty('--owner',ROSTER[objective.owner].color);screenPosition(g,p.group.position.clone().add(new THREE.Vector3(0,3,0)),required);required.textContent=`▼ SWITCH ${objective.owner+1} · ${ROSTER[objective.owner].name}`;}
 }
 const free=g.pursuit?.phase==='free';document.querySelector('#minimap-panel').classList.toggle('hidden',!free);
 if(!free)return;
 const canvas=document.querySelector('#minimap'),ctx=canvas.getContext('2d'),pos=g.player.group.position,scale=2.15;
 const xy=p=>[110+(p.x-pos.x)*scale,110+(p.z-pos.z)*scale];
 ctx.fillStyle='#10212be8';ctx.fillRect(0,0,220,220);ctx.save();ctx.beginPath();ctx.rect(4,4,212,212);ctx.clip();
 // North-up, with real collision footprints and two connected streets.
 ctx.fillStyle='#354753';for(const x of [0,56]){const [a,b]=xy({x:x-9,z:-81});ctx.fillRect(a,b,18*scale,105*scale);}let [a,b]=xy({x:-9,z:-36});ctx.fillRect(a,b,74*scale,12*scale);
 ctx.fillStyle='#69716e';for(const box of g.colliders){if(box.max.y<3)continue;const [x,y]=xy(box.min);ctx.fillRect(x,y,(box.max.x-box.min.x)*scale,(box.max.z-box.min.z)*scale);}
 function icon(p,text,color,edge=false){let [x,y]=xy(p);if(!edge&&(x<5||x>215||y<5||y>215))return;const off=x<15||x>205||y<15||y>205;x=Math.max(15,Math.min(205,x));y=Math.max(15,Math.min(205,y));ctx.fillStyle='#10202b';ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fill();ctx.fillStyle=color;ctx.font='bold 13px Arial';ctx.textAlign='center';ctx.fillText(text,x,y+4);if(off&&edge){ctx.strokeStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.stroke();}}
 for(const [i,item]of ACTIVITIES.entries())if(!(g.street.cooldowns[i]>g.elapsed)&&!g.street.active)icon(item,{rap:'♫',combat:'◆',delivery:'▣',target:'◎'}[item.type],item.owner===undefined?'#e3c492':ROSTER[item.owner].color,true);
 icon({x:0,z:-76},'4','#e6ba73',true);icon({x:12,z:-23},'S','#b9e3e0');
 for(const p of g.characters)icon(p.group.position,p===g.player?'▲':'●',ROSTER[p.index].color,true);
 if(objective)icon(objective.position,objective.icon,objective.category,true);
 ctx.restore();ctx.fillStyle='#e2e7df';ctx.font='bold 11px Arial';ctx.fillText('N ↑',12,15);
 document.querySelector('#map-zone').textContent=pos.x>44?'RIVAL BLOCK':pos.x>25?'COMMERCE ROW':'HOME BLOCK';
}
