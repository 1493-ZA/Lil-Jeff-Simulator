import * as THREE from 'three';
import {DRIVE_ROUTE} from './mission.js';
import {carExtents} from './driver.js';
import {createBypass,renderCircuit} from './hotwire.js';
// Free roam: every parked car (and the Mission 3 coupe) can be stolen. Z78
// breaks in and hotwires as in the missions; the crew rides along.
const $=s=>document.querySelector(s);
const STEAL_RANGE=4.5;
export const freeRoamActive=g=>g.level===3&&g.pursuit?.phase==='free';
// Parked cars register here so they can be stolen and put back between missions.
export function registerParkedCar(game,car,collider){
 car.yaw=car.group.rotation.y;
 (game.parkedCars??=[]).push({car,collider,home:{position:car.group.position.clone(),yaw:car.yaw}});
 game.colliders.push(collider);
}
export function stealableCars(g){return [g.chaseCar,...(g.parkedCars||[]).map(e=>e.car)].filter(c=>c&&c.group.visible&&!c.wrecked);}
export function nearestCar(g,range=STEAL_RANGE){
 const pos=g.player.group.position;let best=null,distance=range;
 for(const car of stealableCars(g)){const d=Math.hypot(pos.x-car.group.position.x,pos.z-car.group.position.z);if(d<distance){distance=d;best=car;}}
 return best;
}
export function carPromptText(car){return car.lockState==='locked'?'STEAL · BREAK IN':car.lockState==='opened'?'HOTWIRE':'GET IN';}
function entryOf(g,car){return g.parkedCars?.find(e=>e.car===car);}
function footprint(car){
 const e=carExtents(car.yaw),p=car.group.position;
 return new THREE.Box3(new THREE.Vector3(p.x-e.x+.2,0,p.z-e.z+.2),new THREE.Vector3(p.x+e.x-.2,1.8,p.z+e.z-.2));
}
// A parked car stops being an obstacle while it is the car being worked on or driven.
const drop=(g,box)=>{const i=g.colliders.indexOf(box);if(i>=0)g.colliders.splice(i,1);};
function release(g,car){const entry=entryOf(g,car);if(entry)drop(g,entry.collider);}
function park(g,car){const entry=entryOf(g,car);if(!entry)return;drop(g,entry.collider);entry.collider=footprint(car);g.colliders.push(entry.collider);}
export function stealCar(g){
 const car=nearestCar(g);if(!car)return false;
 car.home??={position:car.group.position.clone(),yaw:car.group.rotation.y};
 if(g.active!==2){g.toast('Z78 handles the cars. Switch to 3.');return true;}
 if(g.car!==car&&g.car)park(g,g.car);
 g.car=car;car.yaw=car.group.rotation.y;car.speed=0;car.gate=DRIVE_ROUTE.length;car.ai=null;release(g,car);
 if(car.lockState==='ready'){g.boardCar();return true;}
 g.carWork=car.lockState==='locked'?{phase:'break',progress:0}:createBypass(g);renderCircuit(g);
 g.shooting=g.aiming=false;$('#car-work-panel').classList.remove('hidden');
 return true;
}
// Cancelled break-ins leave the car where it is, solid again.
export function abandonCarWork(g){if(freeRoamActive(g)&&!g.driving)park(g,g.car);}
export function leaveCar(g){park(g,g.car);}
export function wreckCar(g){
 const car=g.car;car.wrecked=true;car.speed=0;g.exitCar();car.door.rotation.y=-.5;
 g.toast('Z78: She’s done. Find another ride.');
}
// H: a stuck or wrecked car goes back to where it was first found, and the
// crew is left standing on the road where they were.
export function despawnCar(g){
 const pos=g.player.group.position,away=c=>{const h=entryOf(g,c)?.home||c.home;return h&&c.group.position.distanceTo(h.position)>1;};
 const car=g.driving?g.car:[g.chaseCar,...(g.parkedCars||[]).map(e=>e.car)].find(c=>c&&away(c)&&c.group.position.distanceTo(pos)<7);
 if(!car||!away(car)){g.toast('Nothing to despawn. Stand next to the car (or sit in it) and press H.');return false;}
 if(g.driving)g.exitCar();if(g.carWork){g.carWork=null;$('#car-work-panel').classList.add('hidden');}
 const entry=entryOf(g,car),home=entry?.home||car.home;
 car.group.position.copy(home.position);car.yaw=home.yaw;car.group.rotation.set(0,car.yaw,0);car.speed=0;car.ai=null;car.door.rotation.y=0;car.wrecked=false;car.integrity=100;
 if(entry){drop(g,entry.collider);entry.collider=footprint(car);g.colliders.push(entry.collider);}
 g.toast('Car despawned. It is back where you found it.');return true;
}
// Pause menu: put the crew back on Our Block if anyone gets stuck.
export function respawnCrew(g){
 if(g.driving)g.exitCar();if(g.carWork){g.carWork=null;$('#car-work-panel').classList.add('hidden');}
 g.characters.forEach((p,i)=>{p.group.position.set((i-1)*2,0,-18);p.group.visible=true;p.velocityY=0;p.grounded=true;p.slide=0;p.crouched=p.peek=false;p.coverBox=null;p.legs.forEach(l=>l.visible=true);p.body.position.set(0,0,0);p.body.rotation.set(0,0,0);p.moveVelocity?.set(0,0,0);});
 g.yaw=0;g.pitch=-.08;g.toast('Crew respawned on Our Block.');
}
// Put every parked car back where it started (missions reuse the same street).
export function resetParkedCars(g){
 for(const e of g.parkedCars||[]){
  const c=e.car;c.group.position.copy(e.home.position);c.yaw=e.home.yaw;c.group.rotation.set(0,c.yaw,0);c.speed=0;c.ai=null;c.door.rotation.y=0;c.wrecked=false;c.integrity=100;c.lockState='locked';c.windowMeshes[0].visible=true;c.group.visible=true;
  drop(g,e.collider);e.collider=footprint(c);g.colliders.push(e.collider);
 }
}
