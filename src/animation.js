import * as THREE from 'three';
const damp=THREE.MathUtils.damp,clamp=THREE.MathUtils.clamp;
const angle=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const UP=new THREE.Vector3(0,1,0);
// Procedural locomotion with weight. Distance (not wall-clock time) drives the
// gait and stride length grows with speed, so feet travel roughly as far as the
// body does and do not skate. Hips turn toward travel while the torso keeps
// facing the aim; acceleration pitches the body forward, braking leans it back,
// and turning rolls it into the curve.
export function animateLocomotion(p,dt,{aiming=false,crouched=false,sliding=false,sprinting=false}={}){
 const pos=p.group.position,previous=p.gaitPosition||pos.clone();
 const delta=pos.clone().sub(previous).setY(0),distance=Math.min(delta.length(),dt*12);
 p.gaitPosition=pos.clone();
 const speed=distance/Math.max(dt,.001);
 const yaw=p.group.rotation.y,turnRate=angle(p.gaitYaw??yaw,yaw)/Math.max(dt,.001);p.gaitYaw=yaw;
 // Stride (one full two-step cycle) lengthens with speed: walk → run → sprint.
 const cycle=1.25+Math.min(speed,9)*.16;
 // Turning on the spot shuffles the feet instead of spinning on rails.
 const shuffle=speed<.6&&Math.abs(turnRate)>1.2&&!crouched&&!sliding;
 p.gaitPhase=(p.gaitPhase||0)+distance*(Math.PI*2/cycle)+(shuffle?Math.abs(turnRate)*dt*1.6:0);
 p.gaitWeight=damp(p.gaitWeight||0,shuffle?.32:Math.min(1,speed/2.2),speed>.3?10:7,dt);
 const weight=p.gaitWeight,phase=p.gaitPhase,amplitude=clamp(.24+speed*.065,.3,.82);
 const local=delta.clone().applyAxisAngle(UP,-yaw);
 const strafe=Math.abs(local.x)>Math.abs(local.z)*1.2;
 const backward=local.z>.0005?-1:1;
 // Lower body faces the travel direction (up to ~75°); the torso keeps the aim.
 if(p.hips){const turn=distance>.002?clamp(Math.atan2(-local.x,Math.abs(local.z)+.001),-1.3,1.3):0;p.hips.rotation.y+=angle(p.hips.rotation.y,strafe?turn*.75:turn*.55)*Math.min(1,dt*(speed>4?7:10));}
 p.legs.forEach((leg,i)=>{
  const c=phase+i*Math.PI,swing=Math.sin(c)*weight;
  const target=sliding?1.35:crouched?-.95+swing*.15:swing*(strafe?amplitude*.55:amplitude)*backward;
  leg.rotation.x=damp(leg.rotation.x,target,18,dt);
  leg.rotation.z=damp(leg.rotation.z,sliding?(i?-.1:.1):strafe?Math.sin(c)*weight*.16:0,12,dt);
  // The knee folds while the leg swings through and straightens on contact.
  const knee=Math.max(0,Math.sin(c+Math.PI*.5))*weight*(.35+amplitude*.6);
  if(leg.userData.shin)leg.userData.shin.rotation.x=damp(leg.userData.shin.rotation.x,sliding?.25:crouched?1.55:knee,18,dt);
 });
 // Vertical bob: only the change is applied, so it never accumulates.
 const bob=crouched||sliding?0:(Math.cos(phase*2)*(.012+amplitude*.012)-.006)*weight;
 p.body.position.y+=bob-(p.gaitBob||0);p.gaitBob=bob;
 // Weight shift: forward on acceleration, back on braking, roll into turns.
 const forwardSpeed=-local.z/Math.max(dt,.001),accel=(forwardSpeed-(p.gaitForward||0))/Math.max(dt,.001);p.gaitForward=forwardSpeed;
 p.lean=damp(p.lean||0,sliding||crouched?0:clamp(accel*.012,-.14,.16)+(sprinting?.11:speed>4?.05:0),6,dt);
 const roll=clamp(-local.x/Math.max(dt,.001)*.008-turnRate*speed*.006,-.09,.09);
 p.body.rotation.z=damp(p.body.rotation.z,sliding?0:roll,8,dt);
 if(!p.postureManaged)p.body.rotation.x=damp(p.body.rotation.x,p.lean,8,dt);
 if(p.leftArm&&!aiming&&!sliding)p.leftArm.rotation.x=damp(p.leftArm.rotation.x,Math.sin(phase+Math.PI)*weight*(.1+amplitude*.12),10,dt);
 // A visible support-hand reach during reload; no change to actual fire origins.
 if(p.reloading>0&&p.leftArm)p.leftArm.rotation.x=damp(p.leftArm.rotation.x,-.55+Math.sin(p.reloading*7)*.18,14,dt);
}
// Responsive but weighted: quick to start, a short slide to stop, and a hard
// plant (brief pivot) when reversing direction at speed.
export function acceleratedStep(p,direction,speed,dt){
 p.moveVelocity??=new THREE.Vector3();
 const v=p.moveVelocity,current=v.length(),wants=direction.lengthSq()>.0001;
 const target=direction.clone().multiplyScalar(speed);
 if(wants&&current>4&&v.dot(direction)/current<-.25&&!(p.pivot>0))p.pivot=.2;
 p.pivot=Math.max(0,(p.pivot||0)-dt);
 const rate=p.pivot>0?42:!wants?26:current<speed*.5?30:speed>6?14:22;
 const change=target.sub(v),limit=rate*dt;
 if(change.length()>limit)change.setLength(limit);
 v.add(change);
 if(!wants&&v.lengthSq()<.0004)v.set(0,0,0);
 return v.clone().multiplyScalar(dt);
}
// Upper-body weapon pose: low-ready while moving without aiming, raised when
// aiming or firing, tucked while sprinting.
export function weaponCarry(p,dt,{aiming,shooting,sprinting,moving}){
 p.readyTimer=aiming||shooting?0:(p.readyTimer||0)+dt;
 const target=sprinting?-.62:p.readyTimer>.7&&moving?-.32:p.readyTimer>2.5?-.22:0;
 p.carry=damp(p.carry||0,target,aiming||shooting?16:5,dt);
 return p.carry;
}
