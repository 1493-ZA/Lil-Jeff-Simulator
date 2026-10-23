import * as THREE from 'three';
import {clearBlood} from './blood.js';
import {disposeProp,updateContact} from './contacts.js';
import {ALLEY_STOPS,alleyInstruction} from './alley.js';
import { findCover, posture } from './cover.js';
import { beginPursuit } from './pursuit.js';
import { createLoadout, ROSTER, ENEMY_HEALTH } from './combat.js';

export const CLAIM_POINTS = [
  { name:'TAKE THE CORNER', z:-3, cover:12.7, quota:6 },
  { name:'CORNER CYPHER', z:-24, cover:-8, quota:8, role:1 },
  { name:'SPIN THE SIDE LANE', z:-46, cover:-30, quota:10, role:2 },
  { name:'CLAIM THE BLOCK', z:-69, cover:-53, quota:12 },
];

export const livingOpps=game=>game.enemies.filter(e=>e.health>0).length;
export const missionOneCleared=game=>game.level===1 && game.stage===2 && game.ambushStarted && game.car.lockState==='ready' && game.car.gate===3 && livingOpps(game)===0;
export const crewAtPoint=(characters,z)=>characters.every(p=>p.health>0 && Math.abs(p.group.position.x)<10 && Math.abs(p.group.position.z-z)<=5);
export const waveCount=game=>game.enemies.filter(e=>e.claimWave===game.claim.point && e.health<=0).length;

export function clearEnemies(game) {
  for(const enemy of game.enemies) {
    game.scene.remove(enemy.group);
    enemy.group.traverse(mesh=>{if(mesh.isMesh){mesh.geometry.dispose();mesh.material.dispose();}});
    if(enemy.badge){game.scene.remove(enemy.badge);enemy.badge.geometry.dispose();enemy.badge.material.map?.dispose();enemy.badge.material.dispose();}
  }
  game.enemies=[];clearBlood(game);
}

export function clearClaimProps(game) {
  if(!game.claimProps)return;
  game.colliders=game.colliders.filter(box=>!game.claimColliders.includes(box));
  for(const mesh of game.claimProps)disposeProp(mesh);
  game.claimProps=[];game.claimColliders=[];game.claimMarkers=[];
}

function buildClaimProps(game) {
  if(game.claimProps?.length)return;
  game.claimProps=[];game.claimColliders=[];game.claimMarkers=[];
  CLAIM_POINTS.forEach((point,i)=>{
    for(const x of [-4,0,4]) {
      const cover=game.box(1.8,1.65,1.1,'#646862',x,.825,point.cover,{solid:true});
      game.claimColliders.push(game.colliders.at(-1));game.claimProps.push(cover);
      for(const dx of [-.6,0,.6])game.claimProps.push(game.box(.2,1.25,.025,'#c5a76b',x+dx,.825,point.cover+.56));
    }
    const ring=new THREE.Mesh(new THREE.RingGeometry(3.6,3.7,48),new THREE.MeshBasicMaterial({color:'#c6edb8',side:THREE.DoubleSide,transparent:true,opacity:.65}));
    ring.rotation.x=-Math.PI/2;ring.position.set(0,.05,point.z);game.scene.add(ring);
    const label=game.label(`0${i+1} / ${point.name}`,'#d5e8b9',5,0,3,point.z,27);
    game.claimProps.push(ring,label);game.claimMarkers.push({ring,label});
  });
  const flank=game.label('Z78 / ALLEY HANDOFF','#cfb9ff',3.5,12,3,-40,30);
  game.claimProps.push(flank);game.flankMarker=flank;
}

export function spawnClaimWave(game) {
  const point=CLAIM_POINTS[game.claim.point];
  for(let i=0;i<point.quota;i++) {
    const x=[-6,-2,2,6][i%4],z=point.z-1-Math.floor(i/4)*3;
    const enemy=game.spawnEnemy(x,z);enemy.claimWave=game.claim.point;
    enemy.health=ENEMY_HEALTH.claimBase+game.claim.point*ENEMY_HEALTH.claimStep;enemy.cooldown=1.8+i*.12;
    if(game.claim.point===2&&i===0){enemy.alias='Switchback';enemy.special=true;enemy.health=ENEMY_HEALTH.switchback;}
    if(game.claim.point===3&&i===point.quota-1){
      enemy.special=true;enemy.alias='Vex';enemy.health=ENEMY_HEALTH.vex;enemy.group.userData.torso.material.color.set('#1769ee');
    }
  }
}

export function beginClaimBlock(game,retry=false) {
  if(!retry)game.missionOneKills=game.characters.map(p=>p.kills);
  game.level=2;game.stage=0;game.driving=game.gunner=game.shooting=game.aiming=false;
  game.carWork=null;game.rap=null;game.car.speed=0;game.car.group.visible=false;
  game.keys.clear();game.active=0;game.yaw=0;game.pitch=-.08;
  game.claim={point:0,verseDone:false,exitTagged:false,complete:false};
  clearEnemies(game);buildClaimProps(game);
  game.characters.forEach((p,i)=>{
    p.maxHealth=125;p.health=125;p.kills=game.missionOneKills?.[i]||0;
    p.loadout=createLoadout(ROSTER[i].primary);p.slot=0;p.guns=p.weaponRigs[0];
    p.group.visible=true;p.group.position.set((i-1)*4,0,14.4);p.group.rotation.set(0,0,0);
    p.body.position.set(0,0,0);p.body.rotation.set(0,0,0);p.body.scale.set(1,1,1);
    p.legs.forEach(leg=>{leg.visible=true;leg.rotation.x=0;});
    if(p.leftArm)p.leftArm.rotation.x=0;
    p.crouched=false;p.peek=false;p.coverBox=findCover(game,p);posture(p,1);p.slide=0;p.velocityY=0;p.grounded=true;p.reloading=0;p.cooldown=0;p.draw=.5;p.recoil=0;
    p.coverAnchor=p.group.position.clone();p.aiGoal=null;p.aiPlanCooldown=0;p.lastHitAt=-Infinity;
  });
  game.terminals.forEach(t=>{t.ring.visible=t.marker.visible=false;});
  game.routeMarkers.forEach(t=>{t.ring.visible=t.label.visible=false;});
  for(const selector of ['#result','#pause-menu','#drive-panel','#rap-panel','#car-work-panel','#interaction'])document.querySelector(selector).classList.add('hidden');
  document.querySelector('#hud').classList.remove('hidden');
  game.finished=false;game.running=true;game.started=true;
  spawnClaimWave(game);
  game.narrationQueue=[];game.toastTime=0;
  game.toast(retry?'CLAIM THE BLOCK. Crew back in cover. Let’s run it again.':'MISSION 1 CLEAR. +25 MAX HEALTH for the whole crew. CLAIM THE BLOCK starts now. Ammo refilled. C to duck, aim to peek.');
  game.updateCamera(1);game.updateHUD();
  if(game.audio){game.music.setDucked(false);game.music.start(game.audio);}
}

export function updateClaimBlock(game) {
  if(game.alleyClient&&game.alleyClient.group.parent)updateContact(game,game.alleyClient,1/60);
  const point=CLAIM_POINTS[game.claim.point];
  game.claimMarkers.forEach((marker,i)=>{marker.ring.visible=i===game.claim.point;marker.label.visible=false;});
  game.flankMarker.visible=false;
  const clear=waveCount(game)>=point.quota;
  const together=crewAtPoint(game.characters,point.z);
  const roleDone=point.role===1?game.claim.verseDone:point.role===2?game.claim.exitTagged:true;
  if(clear&&together&&roleDone) {
    game.characters.forEach(p=>game.awardXP(p.index,15));
    if(game.claim.point===CLAIM_POINTS.length-1){game.claim.complete=true;beginPursuit(game);return;}
    game.claim.point++;game.characters.forEach(p=>{p.coverAnchor=null;p.aiGoal=null;p.aiPlanCooldown=0;});
    spawnClaimWave(game);game.toast(`Checkpoint clear. ${CLAIM_POINTS[game.claim.point].name}. Keep the crew together.`);
  }
}
