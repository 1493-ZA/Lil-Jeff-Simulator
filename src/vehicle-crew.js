import * as THREE from 'three';
import { assistAim } from './cover.js';
import { needsReload, WEAPONS } from './combat.js';

const UP=new THREE.Vector3(0,1,0);
const seats=[[-1.2,.25,.8],[1.2,.25,-.65],[-1.2,.25,-.65]];
export function updateVehicleCrew(game,dt) {
  const car=game.car;
  for(const p of game.characters) {
    p.group.visible=true;
    p.group.position.copy(new THREE.Vector3(...seats[p.index]).applyAxisAngle(UP,car.yaw).add(car.group.position));
    p.body.position.y=-.1;p.body.rotation.x=0;p.legs.forEach(leg=>leg.visible=false);
    if(p.leftArm)p.leftArm.rotation.x=p.index===2?-.35-p.arms.rotation.x:0;
    if(p.index===2 && p.guns[1])p.guns[1].group.visible=false;
    p.recoil=THREE.MathUtils.damp(p.recoil,0,6,dt);
    if(p===game.player) {
      p.group.rotation.y+=Math.atan2(Math.sin(game.yaw-p.group.rotation.y),Math.cos(game.yaw-p.group.rotation.y))*Math.min(1,dt*10);
      p.arms.rotation.x=THREE.MathUtils.damp(p.arms.rotation.x,game.pitch+p.recoil+(p.draw>0||p.reloading>0?-.85:0),12,dt);
      assistAim(game,p,dt);
      if(game.shooting&&p.draw<=0&&p.reloading<=0&&p.cooldown<=0)game.shoot(p);
      continue;
    }
    const candidates=game.enemies.filter(e=>e.health>0&&e.group.position.distanceTo(car.group.position)<28).filter(e=>{
      const local=e.group.position.clone().sub(car.group.position).applyAxisAngle(UP,-car.yaw);
      return p.index===1?local.x>.5:local.x<-.5;
    }).sort((a,b)=>a.group.position.distanceToSquared(p.group.position)-b.group.position.distanceToSquared(p.group.position));
    const target=candidates.find(e=>game.hasLineOfSight(p.group.position.clone().add(new THREE.Vector3(0,1.4,0)),e.group.position.clone().add(new THREE.Vector3(0,1.2,0))));
    if(!target)continue;
    const delta=target.group.position.clone().add(new THREE.Vector3(0,1.25,0)).sub(p.group.position.clone().add(new THREE.Vector3(0,1.4,0)));
    const desired=Math.atan2(-delta.x,-delta.z);
    const turn=Math.atan2(Math.sin(desired-p.group.rotation.y),Math.cos(desired-p.group.rotation.y));
    p.group.rotation.y+=turn*Math.min(1,dt*8);
    p.arms.rotation.x=THREE.MathUtils.damp(p.arms.rotation.x,Math.atan2(delta.y,Math.hypot(delta.x,delta.z)),12,dt);
    if(Math.abs(turn)>.22 || p.cooldown>0 || p.draw>0 || p.reloading>0)continue;
    const state=p.loadout[p.slot];
    const empty=p.index===2?state.rounds[0]===0:!state.rounds.some(n=>n>0);
    if(empty) {
      if(needsReload(state))p.reloading=WEAPONS[state.id].reload;
      else if(p.slot===0){p.slot=1;p.guns=p.weaponRigs[1];p.draw=WEAPONS.switch.draw;}
    } else {game.shoot(p);p.cooldown=.65;}
  }
}
