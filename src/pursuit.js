import * as THREE from 'three';
import {beginStreet,updateStreet,streetHUD} from './street.js';
import { updateRapFeedback,markRap,renderNotes } from './performance.js';
import { buildCar } from './models.js';
import { clearEnemies,clearClaimProps } from './campaign.js';
import { createLoadout,ROSTER } from './combat.js';
import { resetParkedCars } from './carjack.js';
const $=s=>document.querySelector(s),UP=new THREE.Vector3(0,1,0);
export const PURSUIT_TOTAL=6,STUDIO_THRESHOLD=180;
export const STUDIO_TURN=60/148*24;
export const STUDIO_PATTERNS=[['KeyJ','KeyK','KeyL','KeyJ','KeyL','KeyK','KeyJ','KeyL'],['KeyL','KeyJ','KeyK','KeyK','KeyJ','KeyL','KeyK','KeyJ'],['KeyK','KeyL','KeyJ','KeyL','KeyK','KeyJ','KeyL','KeyK']];
export const STUDIO_FLOWS=[[0,2,4,6,8,10,12,14],[0,1.5,3,6,7.5,9,12,14],[0,2/3,2,4,6,8+2/3,10,14]];
export const studioNoteTime=(index,turn)=>6*60/148+STUDIO_FLOWS[turn%3][index]*60/148;
export function pursuitCleared(state){return state.spawned===PURSUIT_TOTAL&&state.cops.length===PURSUIT_TOTAL&&state.cops.every(c=>c.disabled);}
export function studioComplete(state){return state.completed.every(Boolean)&&state.credEarned>=STUDIO_THRESHOLD;}
function removeCops(game){for(const cop of game.pursuit.cops){game.scene.remove(cop.group);cop.group.traverse(m=>{if(m.isMesh){m.geometry.dispose();m.material.dispose();}});}game.pursuit.cops=[];}
export function clearPursuit(game){
  if(game.pursuit)removeCops(game);resetParkedCars(game);
  if(game.studioProps){game.scene.remove(game.studioProps);game.studioProps.traverse(m=>{if(m.isMesh){m.geometry.dispose();m.material.map?.dispose();m.material.dispose();}});game.studioProps=null;}
  if(game.chaseCar){game.scene.remove(game.chaseCar.group);game.chaseCar.group.traverse(m=>{if(m.isMesh){m.geometry.dispose();m.material.dispose();}});game.chaseCar=null;}
  if(game.firstCar){game.car=game.firstCar;game.firstCar=null;}
  game.pursuit=null;
}
export function beginPursuit(game,retry=false){
  const kills=game.characters.map(p=>p.kills);if(!retry)game.missionTwoKills=kills;
  clearEnemies(game);clearClaimProps(game);clearPursuit(game);
  game.firstCar=game.car;game.firstCar.group.visible=false;
  game.chaseCar=buildCar(game,[0,0,-62],{paint:'#454c52'});game.car=game.chaseCar;game.car.group.name='sunroof escape coupe';
  game.terminals.forEach(t=>t.ring.visible=t.marker.visible=false);game.routeMarkers.forEach(t=>t.ring.visible=t.label.visible=false);
  game.level=3;game.stage=0;game.active=2;game.driving=game.gunner=game.aiming=game.shooting=false;game.carWork=null;game.rap=null;
  game.pursuit={phase:'entry',cops:[],spawned:0,disabled:0,route:0,time:0,completed:[false,false,false],credEarned:0,turn:0};
  game.characters.forEach((p,i)=>{p.kills=game.missionTwoKills?.[i]||0;p.health=p.maxHealth;p.group.visible=true;p.group.position.set((i-1)*2,0,-58);p.body.scale.set(1,1,1);p.body.position.set(0,0,0);p.body.rotation.set(0,0,0);p.crouched=p.peek=false;p.arms.position.set(0,1.5,0);p.coverBox=null;p.coverAnchor=null;p.aiGoal=null;p.aiWaypoint=null;p.slide=0;p.velocityY=0;p.grounded=true;p.loadout=createLoadout(ROSTER[i].primary);p.slot=0;p.guns=p.weaponRigs[0];p.draw=.5;p.reloading=0;p.cooldown=0;p.legs.forEach(l=>{l.visible=true;l.rotation.x=0;if(l.userData.shin)l.userData.shin.rotation.x=0;});});
  game.keys.clear();game.yaw=0;game.pitch=-.08;game.finished=false;game.started=game.running=true;
  ['#result','#pause-menu','#rap-panel','#drive-panel','#car-work-panel'].forEach(s=>$(s).classList.add('hidden'));$('#hud').classList.remove('hidden');
  game.narrationQueue=[];game.toastTime=0;game.toast('MISSION 03 / BLUE LIGHTS. Z78: New ride. Hold E to break in, then solve the hotwire puzzle to get us moving.');
  game.music.setScene('chase');game.updateCamera(1);game.updateHUD();
}
export function launchChase(game){
  game.pursuit.phase='chase';game.active=0;game.driving=game.gunner=true;game.shooting=game.aiming=false;game.keys.clear();game.yaw=Math.PI;game.pitch=-.12;
  game.player.draw=.5;game.toast('Draco: I’m up through the roof. Z, drive! Aim for the tires or the driver. Six pursuit cars to shake.');
  $('#interaction').classList.add('hidden');spawnCops(game);
}
export function spawnCops(game){
  for(let i=0;i<2&&game.pursuit.spawned<PURSUIT_TOTAL;i++){
    const pos=game.car.group.position.clone().add(new THREE.Vector3(i?4:-4,0,15));
    pos.x=THREE.MathUtils.clamp(pos.x,-3.5,3.5);pos.z=THREE.MathUtils.clamp(pos.z,-75,17);
    const car=buildCar(game,pos.toArray(),{paint:'#202b33',roof:'#d8dfdf',detail:game.quality==='high'});car.group.name='police pursuit car';car.parts=[];car.disabled=false;car.health=160;
    car.wheels.forEach(w=>{w.userData.police={car,type:'tire',health:30};car.parts.push(w);});
    const driver=new THREE.Mesh(new THREE.SphereGeometry(.28,16,12),game.material('#b1967d'));driver.position.set(-.5,1.42,-.25);driver.userData.police={car,type:'driver',health:50};car.group.add(driver);car.parts.push(driver);
    const lightbar=game.box(1.7,.12,.3,'#253343',0,car.roofY+.06,.05,{parent:car.group});
    car.lights=[game.box(.7,.14,.31,'#6e1722',-.45,car.roofY+.15,.05,{parent:car.group}),game.box(.7,.14,.31,'#123c9b',.45,car.roofY+.15,.05,{parent:car.group})];
    car.lights.forEach((m,i)=>{m.material.emissive.set(i?'#086bff':'#ff1831');m.material.emissiveIntensity=2;});
    car.group.userData.lightbar=lightbar;game.pursuit.cops.push(car);game.pursuit.spawned++;
  }
}
export function policeRayHit(game,origin,direction,maxDistance,damage){
  if(game.level!==3||game.pursuit.phase!=='chase')return null;
  const raycaster=new THREE.Raycaster(origin,direction,0,maxDistance);
  const hits=raycaster.intersectObjects(game.pursuit.cops.filter(c=>!c.disabled).flatMap(c=>c.parts),false);
  if(!hits.length)return null;
  const hit=hits[0],part=hit.object.userData.police;part.health-=damage;
  if(part.health<=0){part.car.disabled=true;game.pursuit.disabled++;hit.object.material.color.set('#222222');game.awardXP(0,25);game.voices.say('kill-0-1','Draco: On bro, watch the right.',0);}
  return hit;
}
function steerTo(game,target,dt,speed=8){
  const car=game.car,delta=target.clone().sub(car.group.position).setY(0),distance=delta.length();
  if(distance<.8){car.speed=0;return true;}
  const desired=Math.atan2(-delta.x,-delta.z);car.yaw+=Math.atan2(Math.sin(desired-car.yaw),Math.cos(desired-car.yaw))*Math.min(1,dt*3);
  car.speed=Math.min(speed,distance*2);const step=Math.min(distance,car.speed*dt);
  // Z78 steers along the cleared road; no player camera input affects the driver.
  car.group.position.addScaledVector(delta.normalize(),step);car.group.rotation.y=car.yaw;car.wheels.forEach(w=>w.rotation.x+=step*2);return false;
}
export function updateChaseDriving(game,dt){
  const state=game.pursuit;state.time+=dt;
  if(state.phase==='chase'){
    const route=[[0,-74],[-3,-50],[-3,-8],[0,9],[3,-8],[3,-50]];
    const target=new THREE.Vector3(route[state.route][0],0,route[state.route][1]);
    if(steerTo(game,target,dt,7))state.route=(state.route+1)%route.length;
    const trailing=new THREE.Vector3(Math.sin(game.car.yaw),0,Math.cos(game.car.yaw));
    for(const [i,cop]of state.cops.entries()){
      if(cop.disabled){cop.group.rotation.z=THREE.MathUtils.damp(cop.group.rotation.z,.1,2,dt);continue;}
      const target=game.car.group.position.clone().addScaledVector(trailing,11+(i%2)*4);target.x+=(i%2?3:-3);target.x=THREE.MathUtils.clamp(target.x,-3.5,3.5);
      const d=target.sub(cop.group.position);cop.group.position.addScaledVector(d,Math.min(1,dt*1.2));cop.group.rotation.y=game.car.yaw;
      cop.wheels.forEach(w=>w.rotation.x+=dt*9);cop.lights.forEach((l,j)=>l.material.emissiveIntensity=Math.sin(state.time*15+j*Math.PI)>0?4:.1);
    }
    if(state.cops.every(c=>c.disabled)&&state.spawned<PURSUIT_TOTAL)spawnCops(game);
    if(pursuitCleared(state)){state.phase='toStudio';game.music.setScene('street');game.toast('Z78: Lost the tail. After Hours Studio. Let’s put this night on wax.');game.shooting=false;}
    // Incoming pursuit pressure is slow enough to reward deliberate tire shots.
    if(Math.floor(state.time/4)>Math.floor((state.time-dt)/4))game.car.integrity=Math.max(0,game.car.integrity-2);
    if(game.car.integrity<=0)game.finish(false);
  }else if(state.phase==='toStudio'&&steerTo(game,new THREE.Vector3(0,0,-23),dt,9))beginStudio(game);
  if(state.phase==='chase'||state.phase==='toStudio')game.updateRoofCrew(dt);
}
export function beginStudio(game){
  const s=game.pursuit;s.phase='studio';s.turn=0;s.credEarned=0;s.completed=[false,false,false];s.studioStart=game.elapsed;
  game.driving=game.gunner=game.shooting=game.aiming=false;game.car.speed=0;game.keys.clear();game.music.setScene('studio');game.narrationQueue=[];game.toastTime=0;$('#drive-panel').classList.add('hidden');$('#interaction').classList.add('hidden');
  const room=new THREE.Group();game.scene.add(room);game.studioProps=room;
  const box=(w,h,d,color,x,y,z)=>game.box(w,h,d,color,x+45,y,z,{parent:room});
  box(12,.15,11,'#332b28',0,-.08,2);box(12,4,.2,'#24242d',0,2,7);box(.2,4,11,'#292b31',-6,2,2);box(.2,4,11,'#292b31',6,2,2);box(12,.15,11,'#202126',0,4,2);
  for(let i=0;i<8;i++){box(.65,2,.18,i%2?'#4b4148':'#1c1b20',-4+i*1.1,2,6.8);}
  const light=new THREE.PointLight('#dc9cff',45,16);light.position.set(45,3,2);room.add(light);
  box(2,1,.8,'#242632',-4,.5,4);box(2,1,.8,'#242632',4,.5,4);
  game.characters.forEach((p,i)=>{p.group.position.set(42+i*3,0,5);p.group.rotation.y=0;p.body.position.set(0,0,0);p.body.rotation.set(0,0,0);p.crouched=p.peek=false;p.body.scale.set(1,1,1);p.legs.forEach(l=>{l.visible=true;l.rotation.x=0;if(l.userData.shin)l.userData.shin.rotation.x=0;});p.leftArm.rotation.x=0;});
  const mic=game.cylinder(.035,1.45,'#a6a0aa',45,.72,2,room);mic.name='central studio microphone';game.cylinder(.09,.24,'#b2b3b7',45,1.55,2,room);
  game.toast('AFTER HOURS STUDIO. Same beat, three voices. J / K / L on the line. Finish a verse with each member and earn 180 session street cred.');
  startStudioTurn(game);
}
export function studioLines(game,index){
  const names=new Set((game.defeatedNames||[]).map(e=>e.name));
  const run=[`${game.characters[index].kills} on my count, crew made two stages.`,`${game.characters[index].xp} cred in my name, hear the pages.`,`Crew brought ${game.kills} down, now we leave with wages.`];
  return [
    [names.has('Static')?'Static went quiet, we cleared that lane.':'We cleared that corner, we held that lane.',names.has('Vex')?'Vex lost the block, now we own the stage.':'We held that block, now we own the stage.',run[0]],
    ['Doom in the pocket, let the kick drum burst.',names.has('Switchback')?'Switchback fell, put his name in a verse.':'Crew held it down, put the night in a verse.',run[1]],
    ['One hand steering, crew riding with me.',names.has('Vex')?'Vex in the rear view, blue lights leave.':'Block in the rear view, blue lights leave.',run[2]],
  ][index];
}
function startStudioTurn(game){
  const s=game.pursuit,index=s.turn%3;game.active=index;game.rap={purpose:'studio',leadIn:6*60/148,time:0,hits:0,judged:Array(8).fill(false),feedback:['STRAIGHT POCKET','SYNCOPATED SWITCH','TRIPLET SWITCH'][index],lines:studioLines(game,index),spoken:-1};
  $('#rap-panel').classList.remove('hidden');game.music.setDucked(false);
}
export function judgeStudio(game,code){
  const r=game.rap,turn=game.pursuit.turn%3;
  const i=r.judged.findIndex((done,i)=>!done&&Math.abs(r.time-studioNoteTime(i,turn))<.22);
  if(i<0){r.feedback='OFF BEAT · catch the next note';r.flash=.25;r.lastSuccess=false;return false;}
  r.judged[i]=true;const success=code===STUDIO_PATTERNS[turn][i];markRap(r,i,success);
  if(success){r.hits++;const hot=game.player.rapBoostReady||game.player.onFireUntil>game.elapsed||r.hits>=5;const amount=hot?15:10;game.awardXP(game.active,amount);game.pursuit.credEarned+=amount;if(r.hits>=5)game.player.onFireUntil=game.elapsed+20;r.feedback=hot?'ON FIRE · +15 STREET CRED':'+10 STREET CRED';}
  else r.feedback='WRONG KEY · stay in the pocket';return success;
}
export function updatePursuit(game,dt){
  const s=game.pursuit;
  if(s.phase==='free'){updateStreet(game,dt);return;}
  if(s.phase==='entry'){
  }
  if(s.phase==='studio'){
    const r=game.rap;r.time+=dt;updateRapFeedback(r,STUDIO_PATTERNS[s.turn%3].map((_,i)=>studioNoteTime(i,s.turn)),dt);
    const line=Math.min(2,Math.floor(r.time/(STUDIO_TURN/3)));
    if(line>r.spoken){r.spoken=line;const named=[['Static','Vex',null],[null,'Switchback',null],[null,'Vex',null]][game.active][line];const clean=named&&!(game.defeatedNames||[]).some(e=>e.name===named);if(line===2){game.voices.stop();game.toast(`${ROSTER[game.active].name}: ${r.lines[line]}`,STUDIO_TURN/3);}else game.voices.say(`rap-${game.active}-${line}${clean?'-clean':''}`,`${ROSTER[game.active].name}: ${r.lines[line]}`,game.active,{force:true,duration:STUDIO_TURN/3,rate:1});}
    game.characters.forEach((p,i)=>{p.weaponRigs.flat().forEach(g=>g.group.visible=false);const goal=new THREE.Vector3(i===game.active&&r.time>.7?45:42+i*2,0,i===game.active&&r.time>.7?2.6:5);const delta=goal.sub(p.group.position);const moving=delta.length()>.05;p.group.position.addScaledVector(delta,Math.min(1,dt*4));p.legs.forEach((leg,n)=>leg.rotation.x=moving?Math.sin(game.elapsed*9+n*Math.PI)*.3:0);p.arms.rotation.x=Math.sin(game.elapsed*(i+5))*.15;});
    if(r.time>=STUDIO_TURN){
      if(r.hits>=6){s.completed[s.turn%3]=true;game.player.rapBoostReady=false;}
      if(studioComplete(s)){unlockFreeRoam(game);return;}
      s.turn++;startStudioTurn(game);
    }
  }
}
export function unlockFreeRoam(game){
  // The pursuit is over: the disabled police cars leave the street.
  removeCops(game);game.driving=game.gunner=false;$('#drive-panel').classList.add('hidden');game.pursuit.phase='free';game.narrationQueue=[];game.toastTime=0;game.rap=null;game.voices.stop();$('#rap-panel').classList.add('hidden');game.active=0;game.yaw=0;game.pitch=-.08;
  game.characters.forEach((p,i)=>{p.group.position.set((i-1)*2,0,-18);p.group.rotation.y=0;p.body.position.set(0,0,0);p.arms.rotation.x=0;p.body.rotation.z=0;p.leftArm.rotation.x=0;p.weaponRigs[p.slot].forEach(g=>g.group.visible=true);});
  beginStreet(game);game.studioProps.visible=false;game.keys.clear();game.music.setScene('street');game.toast('MISSION 03 CLEAR / STREET CRED EARNED. Free roam unlocked. The block is yours—walk around and switch the crew.');
}
export function pursuitHUD(game){
  const s=game.pursuit;if(!s)return;
  $('#level-title').textContent=s.phase==='free'?'FREE ROAM':'BLUE LIGHTS / RED RECORD';$('#chapter-label').textContent=s.phase==='free'?'FREE ROAM':'MISSION 03';
  const titles={entry:'NEW RIDE. SAME CREW.',chase:'SHAKE THE BLUE LIGHTS',toStudio:'AFTER HOURS STUDIO',studio:'PUT THE NIGHT ON WAX',free:'THE BLOCK IS YOURS'};
  $('#objective-title').textContent=titles[s.phase];$('#mission-step').textContent=s.phase==='free'?'OPEN MAP':'03 / 03';
  $('#objective-description').textContent={entry:'Z78: break into the sunroof car and hotwire it.',chase:'Draco · Aim from the sunroof. Disable tires or drivers. Z78 handles the wheel.',toStudio:'Pursuit cleared. Z78 is taking the crew to the studio.',studio:'J / K / L on beat. Each member needs 6/8 and the session needs 180 street cred.',free:'Explore on foot. 1 / 2 / 3 switches the crew. Esc returns to the menu.'}[s.phase];
  $('#objective-count').textContent=s.phase==='studio'?`SESSION CRED ${s.credEarned}/${STUDIO_THRESHOLD} · VERSES ${s.completed.filter(Boolean).length}/3`:`PURSUIT CARS ${s.disabled}/${PURSUIT_TOTAL}`;
  $('#objective-progress').style.width=`${s.phase==='studio'?Math.min(100,s.credEarned/STUDIO_THRESHOLD*100):s.disabled/PURSUIT_TOTAL*100}%`;
  $('#enemy-remaining').textContent=s.phase==='free'?'FREE ROAM UNLOCKED':s.phase==='studio'?'ONE BEAT · THREE VOICES':`POLICE CARS LEFT ${PURSUIT_TOTAL-s.disabled}`;
  if(game.driving&&s.phase==='free')$('#drive-kills').textContent='E GET OUT';
  else if(game.driving){$('#drive-mode').textContent='DRACO / SUNROOF · Z78 / AUTOPILOT';$('#drive-help').textContent='RMB AIM ASSIST · LMB FIRE · R RELOAD · Q SIDEARM';$('#drive-kills').textContent=`DISABLED ${s.disabled}/${PURSUIT_TOTAL}`;}
  if(s.phase==='free')streetHUD(game);
  if(game.rap?.purpose==='studio'){
    const r=game.rap,turn=s.turn%3;$('#rap-session-name').textContent='AFTER HOURS / CREW CYPHER';$('#rap-score').textContent=`${ROSTER[turn].name} · ${r.hits}/8`;$('#rap-feedback').textContent=r.feedback;$('#rap-lyric').textContent=r.lines[Math.min(2,Math.floor(r.time/(STUDIO_TURN/3)))];
    $('#rap-notes').innerHTML=renderNotes(STUDIO_PATTERNS[turn],STUDIO_PATTERNS[turn].map((_,i)=>studioNoteTime(i,turn)),r,game.input);
  }
}
