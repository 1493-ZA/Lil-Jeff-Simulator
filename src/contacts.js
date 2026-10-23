import * as THREE from 'three';
import {plantOnGround} from './ground.js';
import {buildCivilian} from './npc.js';
export function createContact(game,x,z,variant=0,name='CONTACT'){
 // Contacts come from the civilian catalog: never a copy of a crew member.
 const p=buildCivilian(game,500+variant*97+name.length*13,x>44?'opp':x<25?'home':null);p.group.name=`contact ${name}`;p.group.position.set(x,0,z);plantOnGround(p);
 p.arms.rotation.x=-1;p.leftArm.rotation.x=.15;
 const bag=game.box(.3,.26,.13,'#322c31',.25,1.06,-.19,{parent:p.body});bag.rotation.z=-.2;
 p.name=name;p.variant=variant;p.origin=p.group.position.clone();return p;
}
export function updateContact(game,p,dt){
 p.body.rotation.z=Math.sin(game.elapsed*1.6+p.variant)*.015;
 const cheering=game.elapsed<(p.cheerUntil||0);
 p.arms.rotation.x=THREE.MathUtils.damp(p.arms.rotation.x,cheering?-2.5+Math.sin(game.elapsed*9)*.25:game.elapsed<(p.exchangeUntil||0)?-.25:-1,9,dt);
 const delta=game.player.group.position.clone().sub(p.group.position);
 if(delta.length()<7)p.group.rotation.y=Math.atan2(-delta.x,-delta.z);
}
export function exchange(game,p){p.exchangeUntil=game.elapsed+1.1;game.player.leftArm.rotation.x=-.65;}
export function disposeProp(prop){prop.removeFromParent();prop.traverse(m=>{if(m.isMesh){m.geometry.dispose();if(m.geometry.type==='PlaneGeometry')m.material.map?.dispose();m.material.dispose();}});}
