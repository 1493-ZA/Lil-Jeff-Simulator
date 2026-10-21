import * as THREE from 'three';
import { posture } from './cover.js';
import { WEAPONS, needsReload } from './combat.js';

const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
// Route around solid corners instead of repeatedly walking into a barricade.
function companionWaypoint(game,pos,goal) {
  const obstacles=game.colliders.filter(box=>box.max.y>.6&&box.min.y<.6).map(box=>{
    const expanded=box.clone();expanded.min.x-=.4;expanded.max.x+=.4;expanded.min.z-=.4;expanded.max.z+=.4;return expanded;
  });
  const blocked=(from,to)=>{
    const origin=from.clone().setY(.6),direction=to.clone().setY(.6).sub(origin),distance=direction.length();
    if(distance<.01)return null;
    const ray=new THREE.Ray(origin,direction.normalize());
    let first=null,nearest=distance;
    for(const box of obstacles){const hit=ray.intersectBox(box,new THREE.Vector3());if(hit&&origin.distanceTo(hit)<nearest){nearest=origin.distanceTo(hit);first=box;}}
    return first;
  };
  const obstacle=blocked(pos,goal);
  if(!obstacle)return goal;
  const corners=[];
  for(const x of [obstacle.min.x-.25,obstacle.max.x+.25])for(const z of [obstacle.min.z-.25,obstacle.max.z+.25]){
    const corner=new THREE.Vector3(x,0,z);
    if(pos.distanceTo(corner)>.2&&safeFooting(game,corner)&&!blocked(pos,corner))corners.push(corner);
  }
  corners.sort((a,b)=>pos.distanceTo(a)+a.distanceTo(goal)-pos.distanceTo(b)-b.distanceTo(goal));
  return corners[0]||goal;
}
export function safeFooting(game, point, radius=.4) {
  return Math.abs(point.x)<24.5 && point.z>-79 && point.z<20 && !game.colliders.some(box=>
    box.max.y>point.y+.05 && box.min.y<point.y+1.8 && point.x+radius>box.min.x && point.x-radius<box.max.x && point.z+radius>box.min.z && point.z-radius<box.max.z);
}

export function updateCompanions(game,dt) {
  if(game.driving) return;
  for(const p of game.characters) {
    if(p===game.player || p.health<=0) continue;
    const pos=p.group.position;
    const enemies=game.enemies.filter(e=>e.health>0 && !e.driveBy);
    const nearest=enemies.sort((a,b)=>a.group.position.distanceToSquared(pos)-b.group.position.distanceToSquared(pos))[0];
    const hurt=p.health<45;
    if(p.health<65 && game.elapsed-p.lastHitAt>3) p.health=Math.min(65,p.health+dt*3);
    p.aiPlanCooldown-=dt;
    const leader=game.player.group.position;
    const holdCover=game.level===2&&p.coverAnchor&&leader.distanceTo(p.coverAnchor)<10&&enemies.some(e=>e.health>0);
    if(holdCover){p.aiGoal=p.coverAnchor.clone();p.aiPlanCooldown=.8;}
    else p.coverAnchor=null;
    if(!holdCover&&(p.aiPlanCooldown<=0 || !p.aiGoal || p.aiGoal.distanceTo(leader)>12)) {
      const side=p.index%2 ? -1 : 1;
      const formation=new THREE.Vector3(side*2.3,0,3.5+(p.index===2?1:0)).applyAxisAngle(new THREE.Vector3(0,1,0),game.player.group.rotation.y).add(leader);
      formation.y=0;
      const candidates=[formation,formation.clone().add(new THREE.Vector3(-2,0,1)),formation.clone().add(new THREE.Vector3(2,0,1))];
      if(nearest) for(const box of game.colliders) {
        const size=box.getSize(new THREE.Vector3());
        if(size.y>3 || size.x>7 || size.z>7 || size.y<.7) continue;
        const center=box.getCenter(new THREE.Vector3());
        if(center.distanceTo(leader)>11) continue;
        const away=center.clone().sub(nearest.group.position).setY(0).normalize();
        candidates.push(center.addScaledVector(away,Math.max(size.x,size.z)*.5+.9).setY(0));
      }
      let best=null,bestScore=Infinity;
      for(const candidate of candidates) {
        if(!safeFooting(game,candidate))continue;
        const exposed=nearest && game.hasLineOfSight(nearest.group.position.clone().add(new THREE.Vector3(0,1.4,0)),candidate.clone().add(new THREE.Vector3(0,1.2,0)));
        const score=candidate.distanceTo(formation)+pos.distanceTo(candidate)*.3+(exposed ? hurt?30:7 : 0);
        if(score<bestScore){best=candidate;bestScore=score;}
      }
      p.aiGoal=best || pos.clone();
      p.aiPlanCooldown=.8;
    }
    const waypoint=companionWaypoint(game,pos,p.aiGoal);
    const desired=waypoint.clone().sub(pos).setY(0);
    let moving=false;
    if(desired.length()>(waypoint===p.aiGoal ? .65 : .1) && p.grounded) {
      desired.normalize();
      for(const angle of [0,.65,-.65,1.2,-1.2]) {
        const step=desired.clone().applyAxisAngle(new THREE.Vector3(0,1,0),angle).multiplyScalar((hurt?3.4:2.8)*dt);
        const next=pos.clone().add(step);
        if(!safeFooting(game,next) || nearest && next.distanceTo(nearest.group.position)<2.5)continue;
        game.moveWithCollision(p,step); moving=true;
        p.group.rotation.y+=angleDelta(p.group.rotation.y,Math.atan2(-step.x,-step.z))*Math.min(1,dt*6);
        break;
      }
    }
    p.aiState=hurt?'RETREATING':moving?'FOLLOWING':'IN COVER';
    const nearCover=game.colliders.some(box=>box.max.y>.8&&box.max.y<1.4&&box.distanceToPoint(pos)<2.5);
    p.crouched=game.level===2&&!moving&&nearCover;
    p.peek=Boolean(p.crouched&&nearest&&!hurt&&p.cooldown<=0&&p.draw<=0&&p.reloading<=0);
    posture(p,dt,{crouched:p.crouched,peek:p.peek,moving,time:game.elapsed});
    p.recoil=THREE.MathUtils.damp(p.recoil,0,7,dt);
    if(!nearest || hurt || pos.distanceTo(nearest.group.position)>19 || p.cooldown>0 || p.draw>0 || p.reloading>0)continue;
    const from=pos.clone().add(new THREE.Vector3(0,1.5,0));
    const to=nearest.group.position.clone().add(new THREE.Vector3(0,1.3,0));
    if(!game.hasLineOfSight(from,to))continue;
    const direction=to.sub(from);
    p.group.rotation.y+=angleDelta(p.group.rotation.y,Math.atan2(-direction.x,-direction.z))*Math.min(1,dt*8);
    p.arms.rotation.x=Math.atan2(direction.y,Math.hypot(direction.x,direction.z))+p.recoil;
    const state=p.loadout[p.slot];
    if(!state.rounds.some(n=>n>0)) {
      if(needsReload(state))p.reloading=WEAPONS[state.id].reload;
      else if(p.slot===0){p.slot=1;p.guns=p.weaponRigs[1];p.draw=WEAPONS.switch.draw;}
    } else {
      game.shoot(p);
      p.cooldown=1.1;
    }
  }
}
