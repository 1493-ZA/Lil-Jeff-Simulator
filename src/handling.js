import * as THREE from 'three';
const FORWARD=new THREE.Vector3(0,0,-1);
export function updateHandling(p,aiming,dt){
  p.aimTime=aiming?(p.aimTime||0)+dt:0;
  p.heat=Math.max(0,(p.heat||0)-dt*.65);
  p.recoil=THREE.MathUtils.damp(p.recoil,0,10,dt);
}
export function shotSpread(weapon,p,{support=false,moving=false,aiming=false}={}){
  const settled=aiming?THREE.MathUtils.lerp(.5,.2,Math.min(1,(p.aimTime||0)/.35)):.7;
  return weapon.spread*settled*(1+(p.heat||0)*.7)*(support?4:1)*(moving?1.25:1)*(p.grounded===false?1.5:1)*(p.slide>0?1.4:1);
}
// The camera chooses intent. The real muzzle still tests nearby cover.
export function aimPoint(game){
  if(game.net?.remoteTarget)return game.net.remoteTarget.clone();
  game.camera.updateMatrixWorld(true);
  const raycaster=new THREE.Raycaster();raycaster.setFromCamera(new THREE.Vector2(),game.camera);
  let distance=100;
  for(const box of game.colliders){const hit=raycaster.ray.intersectBox(box,new THREE.Vector3());if(hit)distance=Math.min(distance,hit.distanceTo(raycaster.ray.origin));}
  const targets=game.enemies.filter(e=>e.health>0).map(e=>e.group);
  if(game.pursuit)targets.push(...game.pursuit.cops.filter(c=>!c.disabled).flatMap(c=>c.parts));
  for(const hit of raycaster.intersectObjects(targets,true))if(!hit.object.userData.weaponPart)distance=Math.min(distance,hit.distance);
  return raycaster.ray.at(distance,new THREE.Vector3());
}
export function alignWeapon(game,p,target){
  game.scene.updateMatrixWorld(true);
  for(const gun of p.guns){
    for(let i=0;i<3;i++){
      const origin=gun.muzzle.getWorldPosition(new THREE.Vector3());
      const direction=target.clone().sub(origin).normalize();
      const world=new THREE.Quaternion().setFromUnitVectors(FORWARD,direction);
      gun.group.quaternion.copy(gun.group.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));
      gun.group.updateWorldMatrix(false,true);
    }
  }
  const from=p.guns[0].muzzle.getWorldPosition(new THREE.Vector3());
  if(p===game.player)game.muzzleBlocked=!game.hasLineOfSight(from,target.clone().lerp(from,.002));
}
