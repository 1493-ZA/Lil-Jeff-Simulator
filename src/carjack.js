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
// Put every parked car back where it started (missions reuse the same street).
export function resetParkedCars(g){
 for(const e of g.parkedCars||[]){
  const c=e.car;c.group.position.copy(e.home.position);c.yaw=e.home.yaw;c.group.rotation.set(0,c.yaw,0);c.speed=0;c.ai=null;c.door.rotation.y=0;c.wrecked=false;c.integrity=100;c.lockState='locked';c.windowMeshes[0].visible=true;c.group.visible=true;
  drop(g,e.collider);e.collider=footprint(c);g.colliders.push(e.collider);
 }
}
