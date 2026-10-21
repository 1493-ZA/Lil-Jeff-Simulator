import * as THREE from 'three';
const UP=new THREE.Vector3(0,1,0);
export function findCover(game,p){
  return game.colliders.filter(b=>b.max.y>=.8&&b.max.y<=1.9&&b.distanceToPoint(p.group.position)<2.1).sort((a,b)=>a.distanceToPoint(p.group.position)-b.distanceToPoint(p.group.position))[0]||null;
}
export function toggleCover(game){
  const p=game.player;p.crouched=!p.crouched;p.coverBox=p.crouched?findCover(game,p):null;p.peek=false;
}
export function posture(p,dt,{crouched=p.crouched,peek=p.peek,lean=0,armsShift=0,sliding=false,moving=false,time=0}={}){
  // Bend hips and knees. Neither the body nor any limb changes scale.
  p.body.scale.set(1,1,1);p.arms.position.x=THREE.MathUtils.damp(p.arms.position.x,armsShift,18,dt);
  p.body.position.y=THREE.MathUtils.damp(p.body.position.y,sliding?-.55:crouched?peek&&!lean?-.04:-.32:0,18,dt);
  p.arms.position.y=THREE.MathUtils.damp(p.arms.position.y,peek&&!lean?1.9:1.5,18,dt);
  p.body.position.x=THREE.MathUtils.damp(p.body.position.x,lean,18,dt);
  p.body.rotation.x=THREE.MathUtils.damp(p.body.rotation.x,sliding?.16:crouched?.1:0,16,dt);
  p.legs.forEach((leg,i)=>{
    leg.rotation.x=THREE.MathUtils.damp(leg.rotation.x,sliding?1.35:crouched?-.95:leg.rotation.x,14,dt);
    if(leg.userData.shin)leg.userData.shin.rotation.x=THREE.MathUtils.damp(leg.userData.shin.rotation.x,crouched?1.55:0,14,dt);
  });
}
export function updateCover(game,p,dt,moving){
  if(p.coverBox&&p.coverBox.distanceToPoint(p.group.position)>2.2)p.coverBox=null;
  if(p.coverBox&&(game.keys.has('KeyS')||game.keys.has('ArrowDown'))){p.crouched=false;p.coverBox=null;}
  if(p.crouched&&!p.coverBox)p.coverBox=findCover(game,p);
  let lean=0,armsShift=0;p.peek=Boolean((p.crouched||p.coverBox)&&game.aiming);
  if(p.peek&&p.coverBox){
    const box=p.coverBox,center=box.getCenter(new THREE.Vector3()),pos=p.group.position;
    // Project the cursor's camera ray onto the cover plane to choose a face.
    const forward=new THREE.Vector3(-Math.sin(game.yaw),Math.sin(game.pitch),-Math.cos(game.yaw));
    const right=new THREE.Vector3(Math.cos(game.yaw),0,-Math.sin(game.yaw));
    const distance=Math.max(1,center.clone().sub(pos).dot(forward));
    const target=pos.clone().add(new THREE.Vector3(0,1.6,0)).addScaledVector(forward,distance);
    const side=target.clone().sub(center).dot(right);
    const half=Math.abs(right.x)*(box.max.x-box.min.x)/2+Math.abs(right.z)*(box.max.z-box.min.z)/2;
    let edge=Math.abs(side)>half*.6?Math.sign(side):0;
    if(game.keys.has('KeyZ'))edge=-1;if(game.keys.has('KeyX'))edge=1;
    if(edge){armsShift=edge<0?-.75:0;const gunOffset=p.guns[0].group.position.x+armsShift;lean=edge*(half+.38)-gunOffset;}
  }
  posture(p,dt,{lean,armsShift,crouched:p.crouched,peek:p.peek,sliding:p.slide>0,moving,time:game.elapsed});
}
export function assistAim(game,p,dt){
  if(game.net?.remoteTarget)return;
  game.aimTarget=null;
  if(!game.aiming||p!==game.player||game.rap){game.aimSession=null;return;}
  if(!game.aimSession||game.aimSession.character!==p.index)game.aimSession={character:p.index,start:game.elapsed,target:null};
  const session=game.aimSession;
  if(game.elapsed-session.start>=1){session.target=null;return;}
  game.scene.updateMatrixWorld(true);
  const origin=p.guns[0].muzzle.getWorldPosition(new THREE.Vector3());
  const forward=new THREE.Vector3(-Math.sin(game.yaw)*Math.cos(game.pitch),Math.sin(game.pitch),-Math.cos(game.yaw)*Math.cos(game.pitch));
  const targets=game.enemies.filter(e=>e.health>0).map(e=>({enemy:e,point:e.group.position.clone().add(new THREE.Vector3(0,1.25,0))}));
  if(game.level===3&&game.pursuit?.phase==='chase')for(const cop of game.pursuit.cops)if(!cop.disabled)for(const part of cop.parts)targets.push({enemy:part,point:part.getWorldPosition(new THREE.Vector3())});
  const visible=t=>t.point.distanceTo(origin)<40&&game.hasLineOfSight(origin,t.point);
  let best=targets.find(t=>t.enemy===session.target&&visible(t));
  if(session.target&&!best){session.target=null;session.broken=true;}
  if(!best&&!session.broken){let score=.94;for(const t of targets){const dot=t.point.clone().sub(origin).normalize().dot(forward);if(dot>score&&visible(t)){best=t;score=dot;}}}
  if(!best)return;
  session.target=best.enemy;game.aimTarget=best.enemy;
  const d=best.point.clone().sub(origin),yaw=Math.atan2(-d.x,-d.z),pitch=Math.atan2(d.y,Math.hypot(d.x,d.z));
  const view=game.camera.getWorldDirection(new THREE.Vector3()),delta=best.point.clone().sub(game.camera.position);
  const currentYaw=Math.atan2(-view.x,-view.z),targetYaw=Math.atan2(-delta.x,-delta.z);
  const currentPitch=Math.atan2(view.y,Math.hypot(view.x,view.z)),targetPitch=Math.atan2(delta.y,Math.hypot(delta.x,delta.z));
  const gain=Math.min(1,dt*9);
  game.yaw+=Math.atan2(Math.sin(targetYaw-currentYaw),Math.cos(targetYaw-currentYaw))*gain;
  game.pitch=THREE.MathUtils.clamp(game.pitch+(targetPitch-currentPitch)*gain,-.85,.65);
  p.group.rotation.y+=Math.atan2(Math.sin(yaw-p.group.rotation.y),Math.cos(yaw-p.group.rotation.y))*Math.min(1,dt*18);
  p.arms.rotation.x=THREE.MathUtils.damp(p.arms.rotation.x,pitch-p.body.rotation.x,18,dt);
}
