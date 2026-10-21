import * as THREE from 'three';
import { safeFooting } from './companions.js';

export function moveEnemy(game,enemy,dt) {
  const pos=enemy.group.position;
  enemy.moveTimer=(enemy.moveTimer || 0)-dt;
  const target=game.driving?game.car.group.position:game.player.group.position;
  if(enemy.moveTimer<=0 || !enemy.moveGoal) {
    const phase=game.elapsed*.7+enemy.home.x*1.7+enemy.home.z*.4;
    const radius=enemy.special?4:2.3;
    let goal=enemy.home.clone().add(new THREE.Vector3(Math.cos(phase)*radius,0,Math.sin(phase)*radius));
    if(!game.driving && enemy.special && pos.distanceTo(target)<18 && pos.distanceTo(target)>9) {
      goal=target.clone().add(pos.clone().sub(target).setY(0).normalize().multiplyScalar(7));
    }
    goal.x=THREE.MathUtils.clamp(goal.x,-8,8);goal.y=0;
    if(safeFooting(game,goal))enemy.moveGoal=goal;
    enemy.moveTimer=1.2;
  }
  const delta=(enemy.moveGoal || pos).clone().sub(pos).setY(0);
  let moving=false;
  if(delta.length()>.35) {
    delta.normalize();
    for(const angle of [0,.8,-.8,1.5,-1.5]) {
      const step=delta.clone().applyAxisAngle(new THREE.Vector3(0,1,0),angle).multiplyScalar((enemy.special?2:1.35)*dt);
      if(!safeFooting(game,pos.clone().add(step)))continue;
      game.moveWithCollision(enemy,step);moving=true;break;
    }
  }
  enemy.legs.forEach((leg,i)=>leg.rotation.x=moving?Math.sin(game.elapsed*8+i*Math.PI)*.42:THREE.MathUtils.damp(leg.rotation.x,0,10,dt));
  enemy.body.position.y=moving?Math.sin(game.elapsed*16)*.012:0;
}
