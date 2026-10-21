import * as THREE from 'three';
export function createContact(game,x,z,variant=0,name='CONTACT'){
 const p=game.buildPerson('#d9bb7c',false,variant%3);p.group.name=`contact ${name}`;p.group.position.set(x,0,z);
 p.guns.forEach(g=>disposeProp(g.group));p.guns=[];p.arms.rotation.x=-1;p.leftArm.rotation.x=.15;
 p.group.userData.torso.material.color.set(['#8d694e','#817a67','#7c536b','#506e68'][variant%4]);
 const bag=game.box(.3,.26,.13,'#322c31',.25,1.06,-.19,{parent:p.body});bag.rotation.z=-.2;
 p.name=name;p.variant=variant;p.origin=p.group.position.clone();return p;
}
export function updateContact(game,p,dt){
 p.body.rotation.z=Math.sin(game.elapsed*1.6+p.variant)*.015;
 p.arms.rotation.x=THREE.MathUtils.damp(p.arms.rotation.x,game.elapsed<(p.exchangeUntil||0)?-.25:-1,9,dt);
 const delta=game.player.group.position.clone().sub(p.group.position);
 if(delta.length()<7)p.group.rotation.y=Math.atan2(-delta.x,-delta.z);
}
export function exchange(game,p){p.exchangeUntil=game.elapsed+1.1;game.player.leftArm.rotation.x=-.65;}
export function disposeProp(prop){prop.removeFromParent();prop.traverse(m=>{if(m.isMesh){m.geometry.dispose();if(m.geometry.type==='PlaneGeometry')m.material.map?.dispose();m.material.dispose();}});}
