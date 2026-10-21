import * as THREE from 'three';
const damp=THREE.MathUtils.damp;
const angle=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
// Distance, rather than wall-clock time, drives the gait. Stopping never freezes
// a foot half way through a step, and aiming does not force the hips forward.
export function animateLocomotion(p,dt,{aiming=false,crouched=false,sliding=false}={}){
 const pos=p.group.position;
 const previous=p.gaitPosition||pos.clone();
 const delta=pos.clone().sub(previous).setY(0),distance=Math.min(delta.length(),dt*12);
 p.gaitPosition=pos.clone();p.gaitPhase=(p.gaitPhase||0)+distance*3.9;
 p.gaitWeight=damp(p.gaitWeight||0,Math.min(1,distance/Math.max(dt,.001)/2),12,dt);
 const weight=p.gaitWeight,phase=p.gaitPhase;
 const local=delta.clone().applyAxisAngle(new THREE.Vector3(0,1,0),-p.group.rotation.y);
 const strafe=Math.abs(local.x)>Math.abs(local.z)*1.2;
 const backward=local.z>0?-1:1;
 if(p.hips){const turn=distance>.002?THREE.MathUtils.clamp(Math.atan2(-local.x,Math.abs(local.z)+.001),-.65,.65):0;p.hips.rotation.y+=angle(p.hips.rotation.y,turn)*Math.min(1,dt*9);}
 p.legs.forEach((leg,i)=>{
  const cycle=phase+i*Math.PI,swing=Math.sin(cycle)*weight;
  const target=sliding?1.35:crouched?-.95+swing*.15:swing*(strafe?.22:.48)*backward;
  leg.rotation.x=damp(leg.rotation.x,target,16,dt);
  leg.rotation.z=damp(leg.rotation.z,sliding?(i?-.1:.1):strafe?swing*.2:0,12,dt);
  if(leg.userData.shin)leg.userData.shin.rotation.x=damp(leg.userData.shin.rotation.x,sliding?.25:crouched?1.55:Math.max(0,-swing)*.7,16,dt);
 });
 if(!crouched&&!sliding)p.body.position.y+=((Math.cos(phase*2)*.014-.006)*weight)*Math.min(1,dt*12);
 p.body.rotation.z=damp(p.body.rotation.z,sliding?0:THREE.MathUtils.clamp(-local.x/Math.max(dt,.001)*.007,-.045,.045),8,dt);
 if(p.leftArm&&!aiming&&!sliding)p.leftArm.rotation.x=damp(p.leftArm.rotation.x,Math.sin(phase+Math.PI)*weight*.12,10,dt);
 // A visible support-hand reach during reload; no change to actual fire origins.
 if(p.reloading>0&&p.leftArm)p.leftArm.rotation.x=damp(p.leftArm.rotation.x,-.55+Math.sin(p.reloading*7)*.18,14,dt);
}
export function acceleratedStep(p,direction,speed,dt){
 p.moveVelocity??=new THREE.Vector3();
 const target=direction.clone().multiplyScalar(speed),gain=1-Math.exp(-dt*(direction.lengthSq()?14:19));
 p.moveVelocity.lerp(target,gain);
 if(p.moveVelocity.lengthSq()<.0001)p.moveVelocity.set(0,0,0);
 return p.moveVelocity.clone().multiplyScalar(dt);
}
