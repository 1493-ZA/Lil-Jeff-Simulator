import * as THREE from 'three';
import {ROSTER} from './combat.js';
import {createRap,RAP_PATTERN,beatTime,RAP_PASS} from './mission.js';
import {updateRapFeedback} from './performance.js';
import {createContact,updateContact,exchange,disposeProp} from './contacts.js';
export const MISSION_FOUR_CRED=5000;
const SAVE='lil-jeff-street-v1';
export const streetCred=g=>g.characters.reduce((n,p)=>n+p.xp,0);
export const missionFourAvailable=g=>streetCred(g)>=MISSION_FOUR_CRED;
export function loadStreet(storage){try{const s=JSON.parse(storage.getItem(SAVE));return{money:Math.max(0,Number(s?.money)||0),completed:Math.max(0,Number(s?.completed)||0)};}catch{return{money:0,completed:0};}}
export function saveStreet(g){try{localStorage.setItem(SAVE,JSON.stringify({money:g.street.money,completed:g.street.completed}));}catch{}}
export const ACTIVITIES=[{name:'CORNER CYPHER',type:'rap',owner:1,x:-11,z:-25,reward:100,cash:60},{name:'RIVAL ENCOUNTER',type:'combat',x:5,z:0,reward:150,cash:100},{name:'NIGHT COURIER',type:'delivery',owner:2,x:12,z:-18,reward:120,cash:150},{name:'PRIORITY: CINDER',type:'target',x:56,z:-64,reward:200,cash:200}];
export const DELIVERY_JOBS=[
 {name:'AMBER CASE',description:'One valuable case. Expect rivals on the east side.',stops:[3],reward:180,cash:250,risk:true},
 {name:'VIOLET PARCELS',description:'Three handoffs. Cross Commerce Row and finish on the home block.',stops:[1,2,4],reward:160,cash:210},
 {name:'CYAN ENVELOPE',description:'A quick, quiet drop behind the home block.',stops:[4],reward:75,cash:90},
];
const CONTACTS=[{x:12,z:-18,name:'RELAY / SUPPLIER'},{x:33,z:-31,name:'NOVA / NIGHT MARKET'},{x:66,z:-35,name:'PATCH / EAST YARD'},{x:66,z:-66,name:'JUNO / LOADING BAY'},{x:30,z:-47,name:'MOSS / NIGHT COURIER'}];
export function announce(g,title,detail=''){
 g.streetNoticeUntil=g.elapsed+4;const el=document.querySelector('#completion-banner');el.textContent=`${title}\n${detail}`;el.classList.remove('hidden');g.beatSound();
 // Phase changes take priority over queued story narration.
 g.narrationQueue=[];g.toastTime=0;g.toast(`${title}. ${detail}`);
}
export function clearStreet(g){if(!g.street)return;for(const m of g.street.props)disposeProp(m);g.street=null;document.querySelector('#minimap-panel').classList.add('hidden');document.querySelector('#completion-banner').classList.add('hidden');}
export function beginStreet(g){
 clearStreet(g);const saved=loadStreet(localStorage);g.street={...saved,active:null,props:[],contacts:[],cooldowns:{},serial:0,deliverySerial:Math.floor(Math.random()*3)};
 for(const [i,a]of ACTIVITIES.entries()){const marker=g.label(`${{rap:'♫',combat:'◆',delivery:'▣',target:'◎'}[a.type]} ${a.name}${a.owner===undefined?'':' / '+ROSTER[a.owner].tag}`,a.owner===undefined?'#e3c492':ROSTER[a.owner].color,3.8,a.x,2.8,a.z,26);marker.userData.activity=i;g.street.props.push(marker);}
 for(const [i,c]of CONTACTS.entries()){const p=createContact(g,c.x,c.z,i,c.name);g.street.contacts.push(p);g.street.props.push(p.group);}
 for(const [i,x,z]of [[5,-12,-22],[6,11,-29],[7,34,-29]]){const p=createContact(g,x,z,i,'AFTER HOURS LOCAL');g.street.contacts.push(p);g.street.props.push(p.group);}
 g.street.props.push(g.label('MISSION 4 / STREET CRED 5000','#edc889',4.5,0,3,-76,25));
 for(const [x,z]of [[56,-20],[58,-45]]){const e=g.spawnEnemy(x,z);e.streetPatrol=true;e.cooldown=2.5;}
 g.toast('Free roam. Home block to the west, East Yard across Commerce Row. Check the map for cyphers, courier jobs and rivals.');
}
function setDeliveryStop(g,a){const id=a.stops[a.leg],c=CONTACTS[id];a.contact=id;a.phase='handoff';a.destination=new THREE.Vector3(c.x,0,c.z);announce(g,'NEW OBJECTIVE: MEET THE CLIENT',`${c.name} · HANDOFF ${a.leg+1}/${a.stops.length}`);}
export function streetInteract(g){
 const s=g.street;if(!s)return false;const pos=g.player.group.position;
 if(s.active){const a=s.active;if(a.type!=='delivery'||pos.distanceTo(a.destination)>3)return false;
  if(a.owner!==g.active){g.toast('Z78 handles this run. Switch to 3.');return true;}
  if(g.elapsed<(a.exchangeUntil||0))return true;
  if(a.phase==='handoff'&&a.enemies.some(e=>e.health>0)){g.toast('Z78: Clear the blue jackets before the handoff.');return true;}
  const p=s.contacts[a.contact];exchange(g,p);a.exchangeUntil=g.elapsed+1.1;
  if(a.phase==='supplier'){const job=DELIVERY_JOBS[s.deliverySerial++%DELIVERY_JOBS.length];Object.assign(a,job,{stops:[...job.stops],leg:0,pending:'collect'});g.toast(`Relay: ${job.name}. ${job.description} Z78: Locked in.`);}
  else {a.pending='handoff';g.voices.say(`handoff-${a.leg%3}`,['Client: Yeah, that’s me. We good.','Client: Right on time, folks.','Client: Valid. Catch you round.'][a.leg%3],2,{force:true});}
  return true;
 }
 if(pos.distanceTo(new THREE.Vector3(0,0,-76))<4){g.toast(missionFourAvailable(g)?'MISSION 4 LOCATION UNLOCKED. The next story mission is coming in a future update.':`MISSION 4 LOCKED. Earn ${MISSION_FOUR_CRED-streetCred(g)} more crew Street Cred.`);return true;}
 for(const e of g.enemies.filter(e=>e.streetActivity&&e.health<=0))disposeProp(e.group);g.enemies=g.enemies.filter(e=>!e.streetActivity||e.health>0);
 const index=ACTIVITIES.findIndex((a,i)=>!(s.cooldowns[i]>g.elapsed)&&Math.hypot(pos.x-a.x,pos.z-a.z)<3);if(index<0)return false;
 const a={...ACTIVITIES[index],index,leg:0,enemies:[],phase:'combat'};
 if(a.owner!==undefined&&a.owner!==g.active){g.toast(`Switch to ${a.owner===1?'Lil doom':'Z78'} for this activity.`);return true;}s.active=a;
 if(a.type==='rap'){g.player.group.position.set(-11,0,-24);g.rap=createRap();g.rap.purpose='free';g.rap.owner=g.active;document.querySelector('#rap-panel').classList.remove('hidden');g.keys.clear();}
 if(a.type==='delivery'){a.phase='supplier';a.contact=0;a.destination=new THREE.Vector3(12,0,-18);announce(g,'NIGHT COURIER','Meet Relay. Interact to collect a sealed fictional job.');}
 if(a.type==='combat'||a.type==='target'){
  const offset=(s.serial++%3)-1;for(let n=0;n<(a.type==='target'?4:3);n++){const e=g.spawnEnemy(a.x+(n%2?3:-3)+offset,a.z-3-Math.floor(n/2)*3);e.streetActivity=true;a.enemies.push(e);if(n===0&&a.type==='target'){e.alias='Cinder';e.special=true;e.health=80;}}
  announce(g,a.type==='target'?'PRIORITY: CINDER':'RIVAL ENCOUNTER',a.type==='target'?'Clear Cinder’s escort. Watch the map for the escape route.':'Clear the three armed rivals.');
 }
 return true;
}
function finishActivity(g){
 const s=g.street,a=s.active;if(!a)return;const owner=a.owner??g.active;s.money+=a.cash;s.completed++;g.awardXP(owner,a.reward);s.cooldowns[a.index]=g.elapsed+45;s.active=null;saveStreet(g);
 const p=g.characters[owner];p.health=p.maxHealth;for(const state of p.loadout)state.spares=Math.max(2,state.spares);
 announce(g,`${a.type==='delivery'?'ALLEY HANDOFF':a.name} COMPLETE`,`+${a.reward} STREET CRED · +$${a.cash}\nHealth restored · reserve ammo supplied`);
}
export function updateStreet(g,dt){
 const s=g.street;if(!s)return;const a=s.active,pos=g.player.group.position;
 if(g.elapsed>(g.streetNoticeUntil||0))document.querySelector('#completion-banner').classList.add('hidden');
 for(const p of s.contacts)updateContact(g,p,dt);
 s.props.forEach(m=>{if(m.isMesh)m.lookAt(g.camera.position);if(m.userData.activity!==undefined)m.visible=!s.active&&!(s.cooldowns[m.userData.activity]>g.elapsed);});
 if(a?.type==='delivery'&&a.pending&&g.elapsed>=a.exchangeUntil){
  const pending=a.pending;delete a.pending;
  if(pending==='collect'){
   setDeliveryStop(g,a);if(a.risk){const c=CONTACTS[a.stops[0]];for(const dx of [-4,4]){const e=g.spawnEnemy(c.x+dx,c.z-4);e.streetActivity=true;a.enemies.push(e);}g.toast('Z78: Blue jackets by the drop. Keep your head up.');}
  }else if(++a.leg>=a.stops.length)finishActivity(g);else setDeliveryStop(g,a);
 }
 if(a?.type==='rap'&&g.rap){const r=g.rap;r.time+=dt;updateRapFeedback(r,RAP_PATTERN.map((_,i)=>beatTime(i)),dt);if(r.time>beatTime(7)+.5){g.rap=null;g.player.body.rotation.z=0;g.player.leftArm.rotation.x=0;document.querySelector('#rap-panel').classList.add('hidden');if(r.hits>=RAP_PASS)finishActivity(g);else{s.active=null;g.toast(`${r.hits}/8. Need six. Return to the mic and run it back.`);}}}
 if(a&&(a.type==='combat'||a.type==='target')&&a.enemies.every(e=>e.health<=0)){
  if(a.type==='target'){if(a.phase!=='escape'){a.phase='escape';a.destination=new THREE.Vector3(33,0,-31);announce(g,'TARGET DOWN','NEW OBJECTIVE: ESCAPE THE AREA · Commerce Row. Follow the arrow.');}if(pos.distanceTo(a.destination)<3)finishActivity(g);}else finishActivity(g);
 }
 const prompt=document.querySelector('#interaction');prompt.classList.add('hidden');
 if(a?.destination){prompt.classList.remove('hidden');prompt.textContent=`${a.phase==='escape'?'ESCAPE TO COMMERCE ROW':a.phase==='supplier'?'MEET RELAY':CONTACTS[a.contact]?.name||'DESTINATION'} · ${Math.ceil(pos.distanceTo(a.destination))}m${a.type==='delivery'?` · ${g.input.label('interact')} ${a.phase==='supplier'?'COLLECT JOB':'HANDOFF'}`:''}`;}
 else if(!a){const nearby=ACTIVITIES.find((a,i)=>!(s.cooldowns[i]>g.elapsed)&&Math.hypot(pos.x-a.x,pos.z-a.z)<3);if(nearby){prompt.classList.remove('hidden');prompt.textContent=`${g.input.label('interact')} START ${nearby.name}${nearby.owner===undefined?'':' · '+['DRACO','LIL DOOM','Z78'][nearby.owner]}`;}else if(pos.distanceTo(new THREE.Vector3(0,0,-76))<4){prompt.classList.remove('hidden');prompt.textContent=`${g.input.label('interact')} MISSION 4 BRIEFING · ${missionFourAvailable(g)?'LOCATION UNLOCKED':'LOCKED'}`;}}
}
export function streetHUD(g){if(!g.street)return;const cred=streetCred(g),a=g.street.active;
 document.querySelector('#objective-title').textContent=a?a.phase==='escape'?'ESCAPE THE AREA':a.name:'MAKE YOUR NAME';document.querySelector('#objective-description').textContent=a?a.phase==='escape'?'Target down. Reach Commerce Row. Follow the navigation arrow and map.':a.type==='delivery'?`${a.phase==='supplier'?'Collect a job from Relay':`Meet ${CONTACTS[a.contact]?.name} · ${a.leg+1}/${a.stops.length}`}. Z78 handles the exchange.`:'Finish the marked activity. The crew provides covering fire.':'Home Block: cypher and supplier. East Yard: rivals and priority targets. Cross through Commerce Row.';
 document.querySelector('#objective-count').textContent=`◇ CRED ${cred} / ${MISSION_FOUR_CRED} · $${g.street.money} · ACTIVITIES ${g.street.completed}`;
 document.querySelector('#enemy-remaining').textContent=missionFourAvailable(g)?'MISSION 4 LOCATION UNLOCKED · SOUTH MARKER':`MISSION 4 LOCKED · EARN ${MISSION_FOUR_CRED-cred} MORE CRED`;
 document.querySelector('#objective-progress').style.width=`${Math.min(100,cred/MISSION_FOUR_CRED*100)}%`;
}
