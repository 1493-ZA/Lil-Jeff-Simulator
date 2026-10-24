import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {loadModel} from './assets.js';
// Rigged crew models (public/models/characters/crew) on the shared Mixamo clips
// in animations.glb. The code-built body stays as the invisible gameplay rig:
// it still owns position, aim, guns, muzzles and posture. Each frame the model
// picks a clip from what that rig is doing, turns its chest back to the aim,
// and reaches both hands onto the real guns with two-bone IK.
const FILES=['draco','doom','z78'];
// Models are 1.8 m; the game's characters stand about 2.05 m.
const SCALE=1.13;
// Car-local height of a seated model's origin (hips land on the seat cushion).
const SEAT_Y=.08;
const UP=new THREE.Vector3(0,1,0),DOWN=new THREE.Vector3(0,-1,0);
const v1=new THREE.Vector3(),v2=new THREE.Vector3(),v3=new THREE.Vector3(),q1=new THREE.Quaternion(),q2=new THREE.Quaternion();
let clipsPromise=null;
function loadClips(){
 clipsPromise??=loadModel('characters/animations.glb').then(gltf=>{
  if(!gltf)return null;const clips={};
  // Only the hips keep translation: other bones use each character's own lengths.
  for(const clip of gltf.animations){clip.tracks=clip.tracks.filter(t=>!t.name.endsWith('.position')||/Hips\.position$/.test(t.name));clips[clip.name]=clip;}
  return clips;
 });
 return clipsPromise;
}
const insideWeapon=o=>{for(let n=o;n;n=n.parent)if(n.name?.startsWith('weapon'))return true;return false;};
const shown=o=>{for(let n=o;n;n=n.parent)if(!n.visible)return false;return true;};
// Diamonds: transmission would add a whole extra render pass, so stones become
// bright, mirror-smooth metal with a small animated glint instead.
function jewellery(model,skin){
 model.traverse(m=>{
  if(!m.isMesh)return;m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false;
  const mat=m.material;if(!mat)return;
  if(mat.transmission>0){mat.transmission=0;mat.metalness=.85;mat.roughness=.04;mat.envMapIntensity=2.6;mat.emissive=new THREE.Color('#ffffff');mat.emissiveIntensity=.1;skin.stones.push(mat);}
  else if(/chain|pendant|watch|earring/.test(m.name+(m.parent?.name||''))){mat.envMapIntensity=1.8;}
 });
}
export async function attachCrewModel(game,p){
 if(game.quality==='low'||typeof document==='undefined')return false;
 const [gltf,clips]=await Promise.all([loadModel(`characters/crew/${FILES[p.index]}.glb`),loadClips()]);
 if(!gltf||!clips||!p.group.parent)return false;
 const model=clone(gltf.scene);model.rotation.y=Math.PI;model.name=`crew model ${FILES[p.index]}`;
 const root=new THREE.Group();root.scale.setScalar(SCALE);root.add(model);p.group.add(root);
 const bone=n=>model.getObjectByName(`mixamorig${n}`);
 const skin={root,model,mixer:new THREE.AnimationMixer(model),actions:{},current:null,stones:[],speed:0,last:p.group.position.clone(),
  bones:{hips:bone('Hips'),spine:[bone('Spine'),bone('Spine1'),bone('Spine2')],neck:bone('Neck'),
   right:[bone('RightArm'),bone('RightForeArm'),bone('RightHand')],left:[bone('LeftArm'),bone('LeftForeArm'),bone('LeftHand')]}};
 if(Object.values(skin.bones).flat().some(b=>!b)){root.removeFromParent();return false;}
 for(const [name,clip]of Object.entries(clips)){const a=skin.mixer.clipAction(clip);if(name==='death'||name==='jump'){a.setLoop(THREE.LoopOnce);a.clampWhenFinished=true;}skin.actions[name]=a;}
 jewellery(model,skin);
 // The code-built body becomes an invisible rig; guns stay visible.
 p.body.traverse(m=>{if(m.isMesh&&!insideWeapon(m))m.visible=false;});
 if(p.hair){p.hair.removeFromParent();p.hair=null;}
 pullGunsIn(p);p.skin=skin;play(skin,'idle');
 return true;
}
function play(skin,name,fade=.22){
 if(skin.current===name)return skin.actions[name];
 const next=skin.actions[name],prev=skin.actions[skin.current];
 next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(fade).play();
 if(prev)prev.fadeOut(fade);skin.current=name;return next;
}
function rotateWorld(bone,axis,angle){
 bone.parent.getWorldQuaternion(q1);q2.setFromAxisAngle(axis,angle);
 bone.quaternion.premultiply(q1.clone().invert().multiply(q2).multiply(q1));bone.updateMatrixWorld(true);
}
// Turn `bone` so that its child (at `from` in world space) points at `to`.
function aimBone(bone,from,to){
 const origin=bone.getWorldPosition(v3);
 const a=from.clone().sub(origin).normalize(),b=to.clone().sub(origin).normalize();
 bone.parent.getWorldQuaternion(q1);q2.setFromUnitVectors(a,b);
 bone.quaternion.premultiply(q1.clone().invert().multiply(q2).multiply(q1));bone.updateMatrixWorld(true);
}
// Analytic two-bone IK: shoulder → elbow → wrist onto `target`, elbow toward `pole`.
function reach([upper,lower,hand],target,pole,fingers){
 const a=upper.getWorldPosition(new THREE.Vector3()),b=lower.getWorldPosition(new THREE.Vector3()),c=hand.getWorldPosition(new THREE.Vector3());
 const l1=a.distanceTo(b),l2=b.distanceTo(c),toTarget=target.clone().sub(a);
 const d=THREE.MathUtils.clamp(toTarget.length(),Math.abs(l1-l2)+1e-3,l1+l2-1e-3),dir=toTarget.normalize();
 const cosA=THREE.MathUtils.clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1),sinA=Math.sqrt(1-cosA*cosA);
 const bend=pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
 const elbow=a.clone().addScaledVector(dir,cosA*l1).addScaledVector(bend,sinA*l1);
 aimBone(upper,b,elbow);
 aimBone(lower,hand.getWorldPosition(new THREE.Vector3()),a.clone().addScaledVector(dir,d));
 // Fingers (the hand bone's +Y) wrap toward the gun.
 if(fingers){hand.getWorldQuaternion(q1);const y=UP.clone().applyQuaternion(q1);q2.setFromUnitVectors(y,fingers);hand.parent.getWorldQuaternion(q1);hand.quaternion.premultiply(q1.clone().invert().multiply(q2).multiply(q1));hand.updateMatrixWorld(true);}
}
// Where each wrist goes on a gun, in the gun's own space (grip at the origin).
const GRIP=[0,-.03,.07];
const SUPPORT={draco:[-.03,-.07,-.28],arp:[-.03,-.06,-.3],switch:[-.04,-.07,.05],akimbo:[-.04,-.07,.05]};
// Real arms are shorter than the old block arms: rifles come in to the
// shoulder, a single pistol is held two-handed at centre, akimbo stays wide.
// [x, y, forward] in the arms group; shots still leave from the muzzle.
function holdPose(id,i,count){
 if(id==='draco'||id==='arp')return[.1,.06,-.22];
 if(count>1)return[i?-.3:.3,0,-.42];
 return[.08,.02,-.42];
}
function pullGunsIn(p){
 for(const rig of p.weaponRigs||[])rig.forEach((gun,i)=>{const [x,y,z]=holdPose(gunId(gun),i,rig.length);gun.group.position.x=x;gun.group.position.y=-.02+y;gun.reach=z;gun.group.position.z=z;});
}
const gunId=g=>g.group.name.replace(/^weapon-/,'');
function holdGuns(game,p,skin){
 const guns=p.guns.filter(g=>shown(g.group));if(!guns.length)return;
 p.group.updateWorldMatrix(true,true);
 const right=v1.set(1,0,0).applyQuaternion(p.group.getWorldQuaternion(q1)).clone();
 const main=guns[0];
 // Wrist → knuckles points along the barrel, tipped slightly up; fingers curl round.
 const fingers=g=>new THREE.Vector3(0,.18,-1).applyQuaternion(g.group.getWorldQuaternion(q1)).normalize();
 reach(skin.bones.right,main.group.localToWorld(new THREE.Vector3(...GRIP)),DOWN.clone().addScaledVector(right,.6),fingers(main));
 const off=guns[1]?guns[1].group.localToWorld(new THREE.Vector3(...GRIP)):main.group.localToWorld(new THREE.Vector3(...SUPPORT[gunId(main)]||SUPPORT.switch));
 reach(skin.bones.left,off,DOWN.clone().addScaledVector(right,-.6),fingers(guns[1]||main));
}
function choose(game,p,skin,dt){
 const pos=p.group.position,delta=pos.clone().sub(skin.last).setY(0);skin.last.copy(pos);
 const speed=delta.length()/Math.max(dt,1e-3);skin.speed=THREE.MathUtils.damp(skin.speed,speed>25?0:speed,8,dt);
 const local=delta.applyAxisAngle(UP,-p.group.rotation.y),back=local.z>.002&&Math.abs(local.z)>Math.abs(local.x);
 const seated=!p.legs[0].visible,s=skin.speed;
 if(p.health<=0)return['death',1];
 if(game.rap){const performer=game.rap.purpose==='studio'?game.active:game.rap.owner??game.active;if(p.index===performer)return['talk',1];if(game.rap.purpose==='studio')return['dance',1];}
 if(seated)return['sit_drive',1];
 if(p.grounded===false)return['jump',1];
 if(p.crouched||p.slide>0)return s>.4?['crouch_walk',(back?-1:1)*THREE.MathUtils.clamp(s/1.6,.6,1.5)]:['crouch_idle',1];
 if(s<.35){const aiming=p===game.player&&(game.aiming||game.shooting);return[aiming?(p.loadout[p.slot].id==='switch'||p.loadout[p.slot].id==='akimbo'?'pistol_aim':'rifle_aim'):'idle',1];}
 const dir=back?-1:1;
 if(s<3.4)return['walk',dir*THREE.MathUtils.clamp(s/1.6,.55,1.6)];
 if(s<6.5)return['run',dir*THREE.MathUtils.clamp(s/4.2,.7,1.4)];
 return['sprint',dir*THREE.MathUtils.clamp(s/6.4,.8,1.3)];
}
export function updateCrewModels(game,dt){
 for(const p of game.characters){
  const skin=p.skin;if(!skin||!p.group.visible)continue;
  const [name,rate]=choose(game,p,skin,dt);play(skin,name).timeScale=rate;
  const seated=name==='sit_drive'&&game.car,toCar=seated?game.car.yaw-p.group.rotation.y:0;
  // Seated: hips go on the car seat whatever height the gameplay rig uses.
  const seatY=seated?(game.car.group.position.y+SEAT_Y-p.group.position.y):0;
  skin.root.position.y=THREE.MathUtils.damp(skin.root.position.y,seatY,seated?30:12,dt);
  // Lower body follows the rig's hip turn (or stays facing the dashboard when
  // seated); the spine twists the chest back to the aim.
  const hipYaw=seated?Math.atan2(Math.sin(toCar),Math.cos(toCar)):p.hips?.rotation.y||0;skin.root.rotation.y=hipYaw;
  skin.mixer.update(dt);
  skin.root.updateMatrixWorld(true);
  if(name!=='death'&&name!=='talk'&&name!=='dance'){
   for(const b of skin.bones.spine)rotateWorld(b,UP,-hipYaw/3);
   const pitch=THREE.MathUtils.clamp(p.arms.rotation.x,-.9,.7),right=v2.set(1,0,0).applyQuaternion(p.group.getWorldQuaternion(q1)).clone();
   rotateWorld(skin.bones.spine[2],right,pitch*.35);rotateWorld(skin.bones.neck,right,pitch*.3);
   holdGuns(game,p,skin);
  }
  // Diamond glint: a quick random sparkle per stone set.
  for(const m of skin.stones)m.emissiveIntensity=THREE.MathUtils.damp(m.emissiveIntensity,Math.random()<.04?.9:.08,14,dt);
 }
}
