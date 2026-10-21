import * as THREE from 'three';
import {createRap,RAP_PATTERN,beatTime,RAP_PASS} from './mission.js';
import {updateRapFeedback} from './performance.js';
export const MISSION_FOUR_CRED=5000;
const SAVE='lil-jeff-street-v1';
export const streetCred=game=>game.characters.reduce((n,p)=>n+p.xp,0);
export const missionFourAvailable=game=>streetCred(game)>=MISSION_FOUR_CRED;
export function loadStreet(storage){try{const s=JSON.parse(storage.getItem(SAVE));return{money:Math.max(0,Number(s?.money)||0),completed:Math.max(0,Number(s?.completed)||0)};}catch{return{money:0,completed:0};}}
export function saveStreet(game){try{localStorage.setItem(SAVE,JSON.stringify({money:game.street.money,completed:game.street.completed}));}catch{}}
export const ACTIVITIES=[{name:'CORNER CYPHER',type:'rap',x:-11,z:-25,reward:100,cash:60},{name:'RIVAL ENCOUNTER',type:'combat',x:5,z:0,reward:150,cash:100},{name:'ALLEY RUN',type:'delivery',x:12,z:-18,reward:120,cash:150},{name:'PRIORITY: CINDER',type:'target',x:-5,z:-64,reward:200,cash:200}];
export function clearStreet(game){if(!game.street)return;for(const mesh of game.street.props){game.scene.remove(mesh);mesh.geometry.dispose();mesh.material.map?.dispose();mesh.material.dispose();}game.street=null;}
export function beginStreet(game){
 clearStreet(game);const saved=loadStreet(localStorage);game.street={...saved,active:null,props:[],cooldowns:{},serial:0};
 for(const [i,a]of ACTIVITIES.entries()){const label=game.label(`${a.name} / +${a.reward} CRED`,'#b6f0cd',3.8,a.x,2.8,a.z,26);label.userData.activity=i;game.street.props.push(label);}
 const gate=game.label('MISSION 4 / STREET CRED 5000','#edc889',4.5,0,3,-76,25);game.street.props.push(gate);
 game.toast('FREE ROAM. Green markers offer repeatable activities. Earn 5,000 crew Street Cred to unlock the Mission 4 location. Start activities yourself.');
}
export function streetInteract(game){
 const s=game.street;if(!s)return false;const pos=game.player.group.position;
 if(s.active){const a=s.active;
  if(a.type==='delivery'&&pos.distanceTo(a.destination)<3){if(a.leg===0){a.leg=1;a.destination.set(-11,0,-58);game.toast('Package secured. Choose the left alley route or cross the street. Reach the west-side handoff.');}else finishActivity(game);return true;}
  return false;
 }
 if(pos.distanceTo(new THREE.Vector3(0,0,-76))<4){game.toast(missionFourAvailable(game)?'MISSION 4 LOCATION UNLOCKED. The next story mission is coming in a future update.':`MISSION 4 LOCKED. Earn ${MISSION_FOUR_CRED-streetCred(game)} more crew Street Cred.`);return true;}
 for(const enemy of game.enemies.filter(e=>e.streetActivity&&e.health<=0)){enemy.group.removeFromParent();enemy.group.traverse(m=>{if(m.isMesh){m.geometry.dispose();m.material.dispose();}});}game.enemies=game.enemies.filter(e=>!e.streetActivity||e.health>0);
 const index=ACTIVITIES.findIndex((a,i)=>!(s.cooldowns[i]>game.elapsed)&&Math.hypot(pos.x-a.x,pos.z-a.z)<3);
 if(index<0)return false;const a={...ACTIVITIES[index],index,leg:0,enemies:[]};s.active=a;
 if(a.type==='rap'){game.active=1;game.player.group.position.set(-11,0,-24);game.rap=createRap();game.rap.purpose='free';document.querySelector('#rap-panel').classList.remove('hidden');game.keys.clear();}
 if(a.type==='delivery'){a.destination=new THREE.Vector3(12,0,-42);game.toast('ALLEY RUN. Collect the marked fictional package on the east sidewalk, then cross to the west-side handoff.');}
 if(a.type==='combat'||a.type==='target'){
  const offset=(s.serial++%3)-1;for(let n=0;n<(a.type==='target'?4:3);n++){const e=game.spawnEnemy((n%2?3:-3)+offset,a.z-3-Math.floor(n/2)*3);e.streetActivity=true;a.enemies.push(e);if(n===0&&a.type==='target'){e.alias='Cinder';e.special=true;e.health=80;}}
  game.toast(a.type==='target'?'Locate Cinder and defeat the escort. Then reach the escape marker at the west sidewalk.':'Rival encounter. Clear the three armed rivals.');
 }
 return true;
}
function finishActivity(game){
 const s=game.street,a=s.active;if(!a)return;s.money+=a.cash;s.completed++;game.awardXP(game.active,a.reward);s.cooldowns[a.index]=game.elapsed+45;s.active=null;saveStreet(game);
 const p=game.player;p.health=p.maxHealth;for(const state of p.loadout)state.spares=Math.max(2,state.spares);
 game.toast(`ACTIVITY CLEAR · +${a.reward} STREET CRED · $${a.cash} · health restored / reserve ammo supplied. Another activity opens in 45 seconds.`);
}
export function updateStreet(game,dt){
 const s=game.street;if(!s)return;const a=s.active;const pos=game.player.group.position;
 s.props.forEach(m=>{m.lookAt(game.camera.position);if(m.userData.activity!==undefined)m.visible=!(s.cooldowns[m.userData.activity]>game.elapsed);});
 if(a?.type==='rap'&&game.rap){const r=game.rap;r.time+=dt;updateRapFeedback(r,RAP_PATTERN.map((_,i)=>beatTime(i)),dt);if(r.time>beatTime(7)+.5){game.rap=null;game.player.body.rotation.z=0;game.player.leftArm.rotation.x=0;document.querySelector('#rap-panel').classList.add('hidden');if(r.hits>=RAP_PASS)finishActivity(game);else{s.active=null;game.toast(`${r.hits}/8. Need six. Return to the mic and try again.`);}}}
 if(a&&(a.type==='combat'||a.type==='target')&&a.enemies.every(e=>e.health<=0)){
  if(a.type==='target'){a.destination??=new THREE.Vector3(-11,0,-58);if(pos.distanceTo(a.destination)<3)finishActivity(game);}else finishActivity(game);
 }
 const prompt=document.querySelector('#interaction');prompt.classList.add('hidden');
 if(a?.destination){const d=a.destination;prompt.classList.remove('hidden');prompt.textContent=`${a.type==='target'?'ESCAPE THE AREA':'DELIVERY'} → ${d.x>0?'EAST':'WEST'} SIDEWALK / ${Math.ceil(pos.distanceTo(d))}m${a.type==='delivery'?` · ${game.input.label('interact')} HANDOFF`:''}`;}
 else if(!a){const nearby=ACTIVITIES.find((a,i)=>!(s.cooldowns[i]>game.elapsed)&&Math.hypot(pos.x-a.x,pos.z-a.z)<3);if(nearby){prompt.classList.remove('hidden');prompt.textContent=`${game.input.label('interact')} START ${nearby.name}`;}else if(pos.distanceTo(new THREE.Vector3(0,0,-76))<4){prompt.classList.remove('hidden');prompt.textContent=`${game.input.label('interact')} MISSION 4 BRIEFING · ${missionFourAvailable(game)?'LOCATION UNLOCKED':'LOCKED'}`;}}
}
export function streetHUD(game){if(!game.street)return;const cred=streetCred(game),a=game.street.active;
 document.querySelector('#objective-title').textContent=a?a.name:'MAKE YOUR NAME';document.querySelector('#objective-description').textContent=a?'Finish the marked activity. Crew members keep up and provide covering fire.':'Green markers: rap, rivals, alley delivery, priority target. Travel to a marker and interact to start.';
 document.querySelector('#objective-count').textContent=`STREET CRED ${cred} / ${MISSION_FOUR_CRED} · $${game.street.money} · ACTIVITIES ${game.street.completed}`;
 document.querySelector('#enemy-remaining').textContent=missionFourAvailable(game)?'MISSION 4 LOCATION UNLOCKED · TRAVEL TO SOUTH MARKER':`MISSION 4 LOCKED · EARN ${MISSION_FOUR_CRED-cred} MORE CRED`;
 document.querySelector('#objective-progress').style.width=`${Math.min(100,cred/MISSION_FOUR_CRED*100)}%`;
}
