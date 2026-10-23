import * as THREE from 'three';
import {ROSTER,WEAPONS} from './combat.js';
import {createRap,RAP_PATTERN,beatTime,RAP_PASS} from './mission.js';
import {updateRapFeedback,streetRapDone} from './performance.js';
import {createContact,updateContact,exchange,disposeProp} from './contacts.js';
import {createHeat,updateHeat,addHeat,zoneAt} from './territory.js';
import {safeFooting} from './companions.js';
import {Crowd} from './npc.js';
export const MISSION_FOUR_CRED=5000;
export const MISSION_FOUR=new THREE.Vector3(0,0,-76);
const SAVE='lil-jeff-street-v1';
export const streetCred=g=>g.characters.reduce((n,p)=>n+p.xp,0);
export const missionFourAvailable=g=>streetCred(g)>=MISSION_FOUR_CRED;
export function loadStreet(storage){try{const s=JSON.parse(storage.getItem(SAVE));return{money:Math.max(0,Number(s?.money)||0),completed:Math.max(0,Number(s?.completed)||0)};}catch{return{money:0,completed:0};}}
export function saveStreet(g){try{localStorage.setItem(SAVE,JSON.stringify({money:g.street.money,completed:g.street.completed}));}catch{}}
export const ACTIVITIES=[
 {name:'CORNER CYPHER',short:'CYPHER',icon:'♫',verb:'START CYPHER',type:'rap',owner:1,x:-11,z:-25,reward:100,cash:60},
 {name:'RIVAL ENCOUNTER',short:'RIVALS',icon:'◆',verb:'START ENCOUNTER',type:'combat',x:5,z:0,reward:150,cash:100},
 {name:'NIGHT COURIER',short:'COURIER',icon:'▣',verb:'TALK TO RELAY',type:'delivery',owner:2,x:12,z:-18,reward:120,cash:150},
 {name:'PRIORITY: CINDER',short:'CINDER',icon:'◎',verb:'START TARGET',type:'target',x:56,z:-64,reward:200,cash:200},
 {name:'AMMO STASH',short:'AMMO STASH',icon:'▤',verb:'CHECK STASH',type:'stash',x:31.6,z:-64,reward:60,cash:0},
 {name:'OPP STASH',short:'OPP STASH',icon:'▤',verb:'RAID STASH',type:'stash',x:66.6,z:-42,reward:120,cash:40,guarded:true},
];
export const AMMO_STASHES=ACTIVITIES.filter(a=>a.type==='stash');
export const DELIVERY_JOBS=[
 {name:'AMBER CASE',description:'One valuable case. Expect rivals on the east side.',stops:[3],reward:180,cash:250,encounter:'ambush'},
 {name:'VIOLET PARCELS',description:'Three handoffs. Cross Commerce Row and finish on our block.',stops:[1,2,4],reward:160,cash:210},
 {name:'CYAN ENVELOPE',description:'A quick, quiet drop behind our block.',stops:[4],reward:75,cash:90,encounter:'quiet'},
];
// Alley handoffs vary: some are quiet, some are watched, some go wrong.
export const ENCOUNTERS=['quiet','suspicious','ambush','chase'];
export function pickEncounter(random=Math.random){const r=random();return r<.35?'quiet':r<.6?'suspicious':r<.85?'ambush':'chase';}
export const CONTACTS=[{x:12,z:-18,name:'RELAY / SUPPLIER',short:'RELAY'},{x:33,z:-31,name:'NOVA / NIGHT MARKET',short:'NOVA'},{x:66,z:-35,name:'PATCH / OPP BLOCK',short:'PATCH'},{x:66,z:-66,name:'JUNO / LOADING BAY',short:'JUNO'},{x:30,z:-47,name:'MOSS / NIGHT COURIER',short:'MOSS'}];
// Abstract sealed packages are picked up from a drop point before each run.
const PICKUPS=[[28.5,-39],[43,-18],[26,-58]];
export function announce(g,title,detail=''){
 g.streetNoticeUntil=g.elapsed+4;const el=document.querySelector('#completion-banner');el.textContent=`${title}\n${detail}`;el.classList.remove('hidden');g.beatSound();
 // Phase changes take priority over queued story narration.
 g.narrationQueue=[];g.toastTime=0;g.toast(`${title}. ${detail}`);
}
export function clearStreet(g){g.crowd?.dispose();g.crowd=null;if(!g.street)return;for(const m of g.street.props)disposeProp(m);g.street=null;document.querySelector('#minimap-panel').classList.add('hidden');document.querySelector('#completion-banner').classList.add('hidden');document.querySelector('#heat-meter')?.classList.add('hidden');}
function activityRing(g,a,i){
 const color=a.owner===undefined?'#e3c492':ROSTER[a.owner].color;
 const ring=new THREE.Mesh(new THREE.RingGeometry(.9,1.02,40),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.7,side:THREE.DoubleSide,depthWrite:false}));
 ring.rotation.x=-Math.PI/2;ring.position.set(a.x,.13,a.z);ring.name=`${a.name} marker`;ring.userData.activity=i;g.scene.add(ring);return ring;
}
function stashProp(g,a){
 const group=new THREE.Group();group.name=`${a.name} crates`;group.position.set(a.x,0,a.z);g.scene.add(group);
 const crate=(w,h,d,x,y,z,c)=>g.box(w,h,d,c,x,y,z,{parent:group});
 crate(.9,.55,.6,0,.28,0,a.guarded?'#2c4f8f':'#5e5240');crate(.7,.4,.5,.15,.75,.02,'#3c4a3e');crate(.95,.05,.65,0,.57,0,'#9a8b62');
 return group;
}
export function beginStreet(g){
 clearStreet(g);const saved=loadStreet(localStorage);
 g.street={...saved,active:null,props:[],contacts:[],cooldowns:{},serial:0,deliverySerial:Math.floor(Math.random()*3),heat:createHeat(),notify:(t,d)=>announce(g,t,d)};
 for(const [i,a]of ACTIVITIES.entries()){g.street.props.push(activityRing(g,a,i));if(a.type==='stash')g.street.props.push(stashProp(g,a));}
 for(const [i,c]of CONTACTS.entries()){const p=createContact(g,c.x,c.z,i,c.name);g.street.contacts.push(p);g.street.props.push(p.group);}
 const mission=new THREE.Mesh(new THREE.RingGeometry(1.3,1.45,40),new THREE.MeshBasicMaterial({color:'#edc889',transparent:true,opacity:.6,side:THREE.DoubleSide,depthWrite:false}));mission.rotation.x=-Math.PI/2;mission.position.set(MISSION_FOUR.x,.13,MISSION_FOUR.z);g.scene.add(mission);g.street.props.push(mission);
 // Opp Block patrols are watchful, not instantly hostile.
 for(const [x,z]of [[56,-20],[58,-45]]){const e=g.spawnEnemy(x,z);e.streetPatrol=true;e.passive=true;e.cooldown=2.5;}
 g.crowd=new Crowd(g);g.zone=zoneAt(g.player.group.position.x).id;
 g.toast('Free roam. Our block to the west, Opp Block across Commerce Row. Check the map for cyphers, jobs and stashes.');
}
// Nudge a requested spawn to the nearest open, walkable spot.
function footing(g,x,z){for(const r of [0,1.5,3,4.5,6])for(let i=0;i<8;i++){const p=new THREE.Vector3(x+Math.cos(i*Math.PI/4)*r,0,z+Math.sin(i*Math.PI/4)*r);if(safeFooting(g,p,.5))return[p.x,p.z];}return[x,z];}
function spawnRivals(g,a,positions,{passive=false,chase=false}={}){
 const made=[];for(const [x,z]of positions){const [fx,fz]=footing(g,x,z);const e=g.spawnEnemy(fx,fz);e.streetActivity=true;e.passive=passive;e.chase=chase;e.cooldown=1.6+Math.random();made.push(e);}
 return made;
}
function setDeliveryStop(g,a){const id=a.stops[a.leg],c=CONTACTS[id];a.contact=id;a.phase='handoff';a.destination=new THREE.Vector3(c.x,0,c.z);announce(g,'NEW OBJECTIVE: MEET THE CLIENT',`${c.short} is waiting · HANDOFF ${a.leg+1}/${a.stops.length}`);
 if(a.encounter==='suspicious'&&a.leg===0){a.watchers=spawnRivals(g,a,[[c.x-5,c.z+4],[c.x+4,c.z+5]],{passive:true});g.toast('Z78: Couple of blue jackets watching the drop. Stay cool.',3.5);}
}
function startDelivery(g,a){
 const job=DELIVERY_JOBS[g.street.deliverySerial++%DELIVERY_JOBS.length],pickup=PICKUPS[a.serial%PICKUPS.length];
 Object.assign(a,job,{stops:[...job.stops],leg:0,phase:'pickup',encounter:job.encounter||pickEncounter(),destination:new THREE.Vector3(pickup[0],0,pickup[1])});
 const pack=g.box(.42,.3,.32,'#3d3346',pickup[0],.16,pickup[1]);pack.name='sealed package';a.package=pack;g.street.props.push(pack);
 announce(g,job.name,`${job.description}\nPick up the sealed package`);
}
export function streetInteract(g){
 const s=g.street;if(!s)return false;const pos=g.player.group.position;
 if(s.active){const a=s.active;if(!a.destination||pos.distanceTo(a.destination)>3)return false;
  if(a.type==='stash')return stashInteract(g,a);
  if(a.type!=='delivery')return false;
  if(a.owner!==g.active){g.toast('Z78 handles this run. Switch to 3.');return true;}
  if(g.elapsed<(a.exchangeUntil||0))return true;
  if(a.enemies.some(e=>e.health>0)){g.toast('Z78: Clear the blue jackets first.');return true;}
  if(a.phase==='supplier'){exchange(g,s.contacts[0]);a.exchangeUntil=g.elapsed+1.1;a.pending='job';return true;}
  if(a.phase==='pickup'){g.player.leftArm.rotation.x=-.9;a.exchangeUntil=g.elapsed+.6;a.pending='collect';if(a.package){a.package.visible=false;}return true;}
  const p=s.contacts[a.contact];exchange(g,p);a.exchangeUntil=g.elapsed+1.1;a.pending='handoff';
  g.voices.say(`handoff-${a.leg%3}`,['Client: Yeah, that’s me. We good.','Client: Right on time, folks.','Client: Valid. Catch you round.'][a.leg%3],2,{force:true});
  return true;
 }
 if(pos.distanceTo(MISSION_FOUR)<4){g.toast(missionFourAvailable(g)?'MISSION 4 LOCATION UNLOCKED. The next story mission is coming in a future update.':`MISSION 4 LOCKED. Earn ${MISSION_FOUR_CRED-streetCred(g)} more crew Street Cred.`);return true;}
 g.removeEnemies(e=>e.streetActivity&&e.health<=0&&e.group.position.distanceTo(pos)>25);
 const index=ACTIVITIES.findIndex((a,i)=>!(s.cooldowns[i]>g.elapsed)&&Math.hypot(pos.x-a.x,pos.z-a.z)<3);if(index<0)return false;
 const a={...ACTIVITIES[index],index,leg:0,enemies:[],watchers:[],phase:'combat',serial:s.serial++};
 if(a.owner!==undefined&&a.owner!==g.active){g.toast(`Switch to ${a.owner===1?'Lil doom':'Z78'} for this activity.`);return true;}s.active=a;
 if(a.type==='rap'){g.rap=createRap();g.rap.purpose='free';g.rap.owner=g.active;document.querySelector('#rap-panel').classList.remove('hidden');g.keys.clear();}
 if(a.type==='delivery'){a.phase='supplier';a.contact=0;a.destination=new THREE.Vector3(12,0,-18);streetInteract(g);}
 if(a.type==='combat'||a.type==='target'){
  const offset=(a.serial%3)-1;for(let n=0;n<(a.type==='target'?4:3);n++){const [e]=spawnRivals(g,a,[[a.x+(n%2?3:-3)+offset,a.z-3-Math.floor(n/2)*3]]);a.enemies.push(e);if(n===0&&a.type==='target'){e.alias='Cinder';e.special=true;e.health=80;}}
  if(a.x>44)addHeat(g,12);
  announce(g,a.type==='target'?'PRIORITY: CINDER':'RIVAL ENCOUNTER',a.type==='target'?'Take down Cinder and the escort, then get out.':'Clear the three armed rivals.');
 }
 if(a.type==='stash'){a.destination=new THREE.Vector3(a.x,0,a.z);stashInteract(g,a);}
 return true;
}
// Ammo stash: travel there, secure it if guarded, interact, see the restock.
function stashInteract(g,a){
 if(a.guarded&&!a.secured){
  if(!a.enemies.length){a.enemies=spawnRivals(g,a,[[a.x-4,a.z+5],[a.x-6,a.z-4],[a.x-9,a.z+1]]);addHeat(g,15);announce(g,'OPP STASH','Rivals guarding it. Secure the area.');return true;}
  if(a.enemies.some(e=>e.health>0)){g.toast('Secure the area before touching the stash.');return true;}
  a.secured=true;
 }
 const p=g.player,lines=[];
 for(const state of p.loadout){const before=state.spares,full=WEAPONS[state.id].spares;state.spares=Math.max(state.spares,full);if(state.spares>before)lines.push(`+${state.spares-before} ${WEAPONS[state.id].name}`);}
 p.leftArm.rotation.x=-.8;
 a.restock=lines.length?lines.join(' · '):'Reserves already full';finishActivity(g);return true;
}
function finishActivity(g){
 const s=g.street,a=s.active;if(!a)return;const owner=a.owner??g.active;s.money+=a.cash;s.completed++;g.awardXP(owner,a.reward);s.cooldowns[a.index]=g.elapsed+45;s.active=null;saveStreet(g);
 if(a.package)a.package.visible=false;for(const w of a.watchers||[])w.passive=false;
 const p=g.characters[owner];p.health=p.maxHealth;
 if(a.type==='stash'){announce(g,`${a.name} SECURED`,`RESERVE AMMO: ${a.restock}\n+${a.reward} STREET CRED${a.cash?` · +$${a.cash}`:''}`);return;}
 const restocked=[];for(const state of p.loadout)if(state.spares<2){restocked.push(WEAPONS[state.id].name);state.spares=2;}
 announce(g,`${a.type==='delivery'?'ALLEY HANDOFF':a.name} COMPLETE`,`+${a.reward} STREET CRED · +$${a.cash}\nHealth restored${restocked.length?` · reserve ammo: ${restocked.join(', ')}`:''}`);
}
export function updateStreet(g,dt){
 const s=g.street;if(!s)return;const a=s.active,pos=g.player.group.position;
 updateHeat(g,dt);
 if(g.elapsed>(g.streetNoticeUntil||0))document.querySelector('#completion-banner').classList.add('hidden');
 for(const p of s.contacts)updateContact(g,p,dt);
 g.crowd?.update(dt);
 s.props.forEach(m=>{if(m.userData.activity!==undefined){m.visible=!s.active&&!(s.cooldowns[m.userData.activity]>g.elapsed);m.material.opacity=.45+Math.sin(g.elapsed*3)*.2;}});
 if(a?.type==='delivery'){
  // Watchers turn hostile if the crew lingers or opens fire.
  for(const w of a.watchers||[])if(w.passive&&w.health>0&&(w.group.position.distanceTo(pos)<5||w.provoked))w.passive=false;
  if(a.pending&&g.elapsed>=a.exchangeUntil){
   const pending=a.pending;delete a.pending;
   if(pending==='job')startDelivery(g,a);
   else if(pending==='collect'){
    if(a.encounter==='ambush'){const c=a.destination;a.enemies.push(...spawnRivals(g,a,[[c.x+6,c.z-5],[c.x-5,c.z-6],[c.x+2,c.z+7]]));announce(g,'AMBUSH','Rivals hit the pickup. Clear them, then meet the client.');}
    setDeliveryStop(g,a);
   }
   else if(++a.leg>=a.stops.length){
    if(a.encounter==='chase'&&!a.chaseStarted){a.chaseStarted=true;a.phase='chase';const behind=pos.clone();a.enemies.push(...spawnRivals(g,a,[[behind.x+14,behind.z-12],[behind.x-12,behind.z-14],[behind.x+3,behind.z+16]].map(([x,z])=>[THREE.MathUtils.clamp(x,-22,74),THREE.MathUtils.clamp(z,-76,18)]),{chase:true}));a.destination=null;announce(g,'CHASE','Rivals saw the handoff. Lose them or take them down.');}
    else finishActivity(g);
   }else setDeliveryStop(g,a);
  }
  if(a.phase==='chase'){const alive=a.enemies.filter(e=>e.health>0);if(!alive.length||alive.every(e=>e.group.position.distanceTo(pos)>45))finishActivity(g);}
 }
 if(a?.type==='rap'&&g.rap){const r=g.rap;r.time+=dt;updateRapFeedback(r,RAP_PATTERN.map((_,i)=>beatTime(i)),dt);if(streetRapDone(g,r)){g.rap=null;g.player.body.rotation.z=0;g.player.leftArm.rotation.x=0;document.querySelector('#rap-panel').classList.add('hidden');if(r.hits>=RAP_PASS)finishActivity(g);else{s.active=null;g.toast(`${r.hits}/8. Need six. Return to the mic and run it back.`);}}}
 if(a&&(a.type==='combat'||a.type==='target')&&a.enemies.every(e=>e.health<=0)){
  if(a.type==='target'){if(a.phase!=='escape'){a.phase='escape';a.destination=new THREE.Vector3(33,0,-31);addHeat(g,25);announce(g,'TARGET DOWN','NEW OBJECTIVE: ESCAPE TO COMMERCE ROW');}if(Math.hypot(pos.x-a.destination.x,pos.z-a.destination.z)<3.5){a.name='PRIORITY: CINDER';finishActivity(g);announce(g,'AREA CLEAR','PRIORITY: CINDER COMPLETE · +200 STREET CRED');}}else finishActivity(g);
 }
}
export function streetHUD(g){if(!g.street)return;const cred=streetCred(g),a=g.street.active;
 const alive=a?.enemies?.filter(e=>e.health>0).length||0;
 document.querySelector('#objective-title').textContent=g.street.heat?.escape?'GET OUT THE OPP BLOCK':a?a.phase==='escape'?'ESCAPE TO COMMERCE ROW':a.name:'MAKE YOUR NAME';
 document.querySelector('#objective-description').textContent=g.street.heat?.escape?'Max heat. Reach Commerce Row or our block.':a?a.phase==='escape'?'Target down. Follow the arrow.':a.type==='delivery'?{supplier:'Talk to Relay.',pickup:'Pick up the sealed package.',handoff:`Meet ${CONTACTS[a.contact]?.short} for handoff ${a.leg+1}/${a.stops.length}.`,chase:'Lose the rivals or take them down.'}[a.phase]:a.type==='stash'?(a.guarded&&!a.secured?'Secure the area, then restock.':'Restock reserve ammo.'):a.type==='rap'?'Hit 6 of 8 notes.':'Clear the marked rivals.':'Our block: cypher and jobs. Opp Block: rivals and stashes.';
 document.querySelector('#objective-count').textContent=alive?`RIVALS REMAINING: ${alive}`:`◇ CRED ${cred} / ${MISSION_FOUR_CRED} · $${g.street.money} · ACTIVITIES ${g.street.completed}`;
 document.querySelector('#enemy-remaining').textContent=missionFourAvailable(g)?'MISSION 4 LOCATION UNLOCKED · SOUTH MARKER':`MISSION 4 LOCKED · EARN ${MISSION_FOUR_CRED-cred} MORE CRED`;
 document.querySelector('#objective-progress').style.width=`${Math.min(100,cred/MISSION_FOUR_CRED*100)}%`;
}
