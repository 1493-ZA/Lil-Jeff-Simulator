import * as THREE from 'three';
import {groundHeight} from './ground.js';
// Lightweight procedural "ragdoll": each body tips over from its hips into one
// of several resting poses, and every frame of the fall is lifted so its lowest
// point rests on the sampled ground. Once settled it stops updating.
const POSES=[
 // Characters face -Z, so +X tilts the head backward (onto the back).
 {name:'back',axis:'x',angle:Math.PI/2,arms:[1.2,1.6],legs:[.15,-.1]},
 {name:'front',axis:'x',angle:-Math.PI/2,arms:[-1.3,-1],legs:[-.05,.2]},
 {name:'left side',axis:'z',angle:Math.PI/2,arms:[-.4,.8],legs:[.5,-.15]},
 {name:'right side',axis:'z',angle:-Math.PI/2,arms:[.5,-.6],legs:[-.2,.6]},
];
const box=new THREE.Box3(),part=new THREE.Box3(),UP=new THREE.Vector3(0,1,0),v=new THREE.Vector3();
export function beginRagdoll(game,victim,from=null){
 const away=from?victim.group.position.clone().sub(from).setY(0):null;
 // Rigged models play their death clip instead: turned to face the shooter so
 // they fall back away from them, upright on the ground, no rig tilt.
 if(victim.skin){
  if(away&&away.lengthSq()>.01)victim.group.rotation.y=Math.atan2(away.x,away.z);
  victim.group.position.y=groundHeight(victim.group.position.x,victim.group.position.z);
  // The gun belongs to the upright rig, so it drops out of sight.
  for(const gun of victim.guns||[])gun.group.visible=false;
  victim.ragdoll={pose:'animated',settled:true};return;
 }
 // Bodies fall away from the shooter when possible, otherwise vary the pose.
 let pose=POSES[(victim.variant+(game.kills||0))%POSES.length];
 if(away&&away.lengthSq()>.01){
  const local=away.normalize().applyAxisAngle(UP,-victim.group.rotation.y);
  pose=Math.abs(local.z)>Math.abs(local.x)?(local.z>0?POSES[0]:POSES[1]):(local.x>0?POSES[3]:POSES[2]);
  if(Math.random()<.25)pose=POSES[Math.floor(Math.random()*POSES.length)];
 }
 const start=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,victim.group.rotation.y,0));
 const tilt=new THREE.Euler(pose.axis==='x'?pose.angle:0,0,pose.axis==='z'?pose.angle:0);
 const end=start.clone().multiply(new THREE.Quaternion().setFromEuler(tilt));
 victim.body.position.set(0,0,0);victim.body.rotation.set(0,0,0);if(victim.hips)victim.hips.rotation.set(0,0,0);
 victim.ragdoll={pose:pose.name,start,end,t:0,twist:(Math.random()-.5)*.5,arms:pose.arms,legs:pose.legs,settled:false};
}
export function updateRagdolls(game,dt){
 for(const e of game.enemies){
  const r=e.ragdoll;if(!r||r.settled)continue;
  r.t=Math.min(1,r.t+dt/.55);const k=r.t<1?1-Math.pow(1-r.t,3):1;
  e.group.quaternion.slerpQuaternions(r.start,r.end,k);
  e.arms.rotation.x=THREE.MathUtils.lerp(e.arms.rotation.x,r.arms[0],k);
  if(e.leftArm)e.leftArm.rotation.x=THREE.MathUtils.lerp(0,r.arms[1],k);
  e.legs.forEach((leg,i)=>{leg.rotation.x=r.legs[i]*k;leg.rotation.z=(i?-1:1)*.12*k;if(leg.userData.shin)leg.userData.shin.rotation.x=(i?.35:.1)*k;});
  e.body.rotation.y=r.twist*k;
  settle(e,r.t>=1);
  if(r.t>=1)r.settled=true;
 }
}
// Lift (or lower) the whole body so its lowest vertex touches the surface.
// Only visible meshes count: hidden muzzle flashes must not prop a body up.
export function lowestPoint(group,precise=false){
 group.updateMatrixWorld(true);box.makeEmpty();
 const visit=o=>{if(!o.visible)return;if(o.isMesh){
  if(precise){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);box.expandByPoint(v);}}
  else{o.geometry.boundingBox||o.geometry.computeBoundingBox();part.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);box.union(part);}}
  for(const c of o.children)visit(c);};
 visit(group);return box.min.y;
}
export function settle(e,precise=false){
 lowestPoint(e.group,precise);
 const floor=groundHeight(e.group.position.x,e.group.position.z);
 if(Number.isFinite(box.min.y))e.group.position.y+=floor+.012-box.min.y;
}
