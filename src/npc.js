import {attachNpcModel} from './crew-models.js';
import * as THREE from 'three';
import {safeFooting} from './companions.js';
import {groundHeight} from './ground.js';
import {animateLocomotion} from './animation.js';
// Modular civilian catalog. Looks are assembled from independent parts
// (hair, hat, top, pants, shoes, skin, build, height, face details), giving
// thousands of combinations. Loc styles, the black taper fade and the crew's
// exact clothing colours are reserved for King Draco, Lil doom and Z78, so a
// civilian can never recreate a named character.
export const HAIR_STYLES=['buzz','crop','high-top','afro','puffs','cornrows','twists','waves','bald','curly-top','ponytail','bun','braids','bob','mohawk','long-waves'];
export const HATS=[null,null,null,null,'beanie','cap','cap-back','durag','bucket','hood'];
export const OUTFITS=['hoodie','tee','open-jacket','puffer','tracksuit','flannel','vest','long-coat','jersey','sweater','windbreaker','tank','bomber','overshirt','zip-hoodie','longsleeve'];
export const RESERVED={hair:['shoulder-locs','tied-locs','black-fade'],tops:['#3c4043','#354d49','#353342']};
const SKINS=['#f0c9a5','#d9a882','#c08a64','#a87452','#8e5c3e','#74482f','#5c3826','#45291c'];
const HAIR_COLORS=['#14110f','#2b1d14','#4a3020','#6b4a2b','#a37b4f','#c9b28a','#7a2f22','#2a2a30'];
const TOPS=['#8a7f6e','#5f6b5b','#6e5a4a','#b7b0a1','#2f2f33','#7d6b8c','#4f6670','#a0703f','#c9c2b3','#556b4e','#8c4f3e','#d1a24a','#5c5470','#3e4f44','#9b8f7c','#e2ddd1'];
const PANTS=['#3d4e66','#2b2f36','#5a5f66','#7a6e58','#4d5340','#1f2226','#6d6153','#8f8676'];
const SHOES=['#f2f0ea','#1b1c1f','#7a7d80','#b58e5f','#c23b2f','#e6d27a','#2e5a8f'];
// Team colours: our block locals sometimes wear crew red; Opp Block locals blue.
const TEAM_TOPS={home:['#9e2b26','#b8322c'],opp:['#1f5fe0','#2a4fae']};
export function seeded(seed){let s=seed*2654435761>>>0||1;return()=>((s=Math.imul(s^s>>>15,2246822507)+3266489909>>>0)/4294967296);}
export function randomLook(seed,team=null){
 const r=seeded(seed+11),pick=list=>list[Math.floor(r()*list.length)];
 const outfit=pick(OUTFITS),hair=pick(HAIR_STYLES);
 let top=pick(TOPS);if(team&&r()<.45)top=pick(TEAM_TOPS[team]);
 const look={seed,outfit,hair,hat:pick(HATS),top,pants:pick(PANTS),shoes:pick(SHOES),skin:pick(SKINS),hairColor:pick(HAIR_COLORS),
  build:.9+r()*.22,height:.93+r()*.12,beard:r()<.3,glasses:r()<.2,earring:r()<.25,chain:r()<.2,shorts:outfit==='tank'?r()<.6:r()<.12};
 look.sleeves=outfit==='tank'?look.skin:outfit==='tee'||outfit==='jersey'?(r()<.5?look.skin:top):top;
 look.layer=pick(TOPS.filter(c=>c!==top));
 look.decorate=(game,parts)=>decorate(game,parts,look);
 return look;
}
export const lookSignature=l=>[l.outfit,l.hair,l.hat,l.top,l.pants,l.shoes,l.skin].join('|');
function decorate(game,{body,round,skin,cloth},look){
 const box=(w,h,d,c,x,y,z)=>game.box(w,h,d,c,x,y,z,{parent:body});const hc=look.hairColor;
 // Hair: every style sits on the shaped skull (crown ≈ y 2.08).
 const h=look.hat==='hood'?'bald':look.hair;
 if(h==='buzz')round(0,2.0,.02,.157,.072,.172,hc);
 if(h==='crop'){round(0,2.02,.02,.16,.08,.175,hc);round(0,2.06,.05,.12,.04,.13,hc);}
 if(h==='high-top'){round(0,2.0,.02,.157,.07,.172,hc);const top=game.cylinder(.13,.2,hc,0,2.15,.02,body);top.scale.z=1.1;}
 if(h==='afro')round(0,2.06,.03,.24,.2,.25,hc);
 if(h==='puffs'){round(0,2.0,.02,.157,.07,.172,hc);round(-.14,2.12,.03,.09,.09,.09,hc);round(.14,2.12,.03,.09,.09,.09,hc);}
 if(h==='cornrows'){round(0,2.0,.02,.158,.07,.173,hc);for(let i=-2;i<=2;i++)box(.018,.02,.32,hc,i*.05,2.085-Math.abs(i)*.012,.03);}
 if(h==='twists'){round(0,2.0,.02,.16,.075,.175,hc);for(let i=0;i<14;i++){const a=i/14*Math.PI*2;const t=game.cylinder(.022,.12,hc,Math.sin(a)*.12,2.08,Math.cos(a)*.12+.02,body);t.rotation.z=Math.sin(a)*.4;t.rotation.x=Math.cos(a)*.4;}}
 if(h==='waves'){round(0,2.0,.02,.158,.074,.173,hc);for(let i=0;i<3;i++)box(.24,.008,.02,'#2b2522',0,2.04+i*.012,-.06+i*.07);}
 if(h==='curly-top'){round(0,2.0,.02,.157,.07,.172,hc);for(let i=0;i<9;i++)round(Math.sin(i*2.1)*.08,2.1+Math.cos(i*1.3)*.02,Math.cos(i*2.1)*.08,.055,.05,.055,hc);}
 if(h==='ponytail'){round(0,2.02,.02,.16,.08,.175,hc);const tail=game.cylinder(.04,.3,hc,0,1.9,.2,body);tail.rotation.x=.4;}
 if(h==='bun'){round(0,2.02,.02,.16,.08,.175,hc);round(0,2.15,.1,.08,.07,.08,hc);}
 if(h==='braids'){round(0,2.02,.02,.16,.08,.175,hc);for(const x of [-.13,.13]){const b=game.cylinder(.03,.42,hc,x,1.78,.1,body);b.rotation.z=x>0?-.1:.1;}}
 if(h==='bob'){round(0,1.99,.03,.18,.12,.19,hc);box(.36,.14,.12,hc,0,1.87,.11);}
 if(h==='mohawk'){round(0,1.99,.02,.155,.06,.17,'#2a2420');box(.05,.11,.3,hc,0,2.12,.02);}
 if(h==='long-waves'){round(0,2.0,.03,.175,.1,.185,hc);box(.38,.38,.1,hc,0,1.78,.13);}
 // Hats.
 if(look.hat==='beanie'){round(0,2.05,.02,.17,.1,.18,look.layer);box(.35,.05,.36,look.layer,0,1.98,.02);}
 if(look.hat==='cap'||look.hat==='cap-back'){round(0,2.04,.02,.165,.085,.175,look.layer);const brim=box(.22,.022,.15,look.layer,0,2.0,look.hat==='cap'?-.2:.24);brim.rotation.x=look.hat==='cap'?.12:-.12;}
 if(look.hat==='durag'){round(0,2.02,.03,.164,.09,.178,look.layer);const tail=box(.08,.2,.02,look.layer,0,1.9,.2);tail.rotation.x=.3;}
 if(look.hat==='bucket'){round(0,2.05,.02,.16,.09,.17,look.layer);const brim=game.cylinder(.23,.025,look.layer,0,2.0,.02,body);brim.scale.z=1.05;}
 if(look.hat==='hood')round(0,1.98,.06,.205,.2,.2,cloth);
 // Clothing layers on the torso.
 const o=look.outfit;
 if(o==='hoodie'||o==='zip-hoodie'){round(0,1.62,.12,.2,.12,.12,cloth);box(.14,.14,.03,look.layer,0,1.12,-.22);if(o==='zip-hoodie')box(.012,.55,.03,'#c9c4b8',0,1.22,-.226);}
 if(o==='open-jacket'||o==='bomber'||o==='overshirt'){for(const s of [-1,1])game.box(.17,.66,.04,look.layer,s*.15,1.2,-.215,{parent:body,fabric:o==='overshirt'?'fleece':'leather'});if(o==='bomber')round(0,1.5,.04,.2,.05,.16,look.layer);}
 if(o==='puffer'){for(let i=0;i<4;i++)box(.6,.025,.44,look.layer,0,.98+i*.16,0);}
 if(o==='tracksuit'){for(const s of [-1,1])box(.02,.6,.03,'#ece8de',s*.25,1.2,-.16);}
 if(o==='flannel'){for(let i=0;i<4;i++)box(.58,.02,.43,look.layer,0,.96+i*.15,0);for(const s of [-1,1])box(.02,.66,.43,look.layer,s*.14,1.2,0);}
 if(o==='vest'){for(const s of [-1,1])box(.18,.6,.05,look.layer,s*.14,1.18,-.21);}
 if(o==='long-coat')box(.56,.42,.42,cloth,0,.78,.0);
 if(o==='jersey'){box(.18,.16,.02,'#f2efe6',0,1.25,-.225);box(.08,.1,.02,look.layer,0,1.25,-.232);}
 if(o==='sweater'){box(.57,.06,.42,look.layer,0,.92,0);box(.2,.05,.16,look.layer,0,1.55,-.07);}
 if(o==='windbreaker'){box(.58,.18,.43,look.layer,0,1.36,0);}
 // Face details.
 if(look.beard){round(0,1.79,-.05,.12,.065,.1,look.hairColor);}
 if(look.glasses){for(const x of [-.075,.075])box(.06,.035,.012,'#1a1a1c',x,1.95,-.186);box(.05,.008,.01,'#1a1a1c',0,1.955,-.188);}
 if(look.earring)round(.162,1.88,0,.012,.012,.012,'#d9c27a');
 if(look.chain){const chain=game.cylinder(.12,.02,'#cdb56f',0,1.55,-.12,body);chain.rotation.x=.7;}
}
export function buildCivilian(game,seed,team=null){
 const look=randomLook(seed,team);game.material('#000');[look.top,look.layer].forEach(c=>game.fabric.add(c));game.denim.add(look.pants);
 const p=game.buildPerson(look.top,false,-1,look);
 p.group.scale.setScalar(look.height);p.look=look;p.group.name=`civilian ${lookSignature(look)}`;
 p.arms.rotation.x=-1.25;p.leftArm.rotation.x=.12;
 attachNpcModel(game,p,{seed});
 return p;
}
// ── Walking pedestrians ──────────────────────────────────────────────────────
// Sidewalk lanes: [x or z fixed, from, to, axis]. Passage lanes link the blocks.
const LANES=[[-12,16,-76,'z','home'],[12,16,-76,'z','home'],[45.5,16,-74,'z','opp'],[66.5,16,-74,'z','opp'],[-31,16,44,'x','commerce'],[-29.5,44,16,'x','commerce'],[-11.4,10,-70,'z','home'],[67,-6,-70,'z','opp']];
const COUNTS={low:6,medium:10,high:14};
export class Crowd{
 constructor(game){
  this.game=game;this.people=[];this.frame=0;
  const count=COUNTS[game.quality]||12;
  for(let i=0;i<count;i++){
   const lane=LANES[i%LANES.length],team=lane[4]==='commerce'?null:lane[4];
   const p=buildCivilian(game,1000+i*37+Math.floor(Math.random()*9000),team);
   p.lane=lane;p.dir=i%2?1:-1;p.t=Math.random();p.speed=1.15+Math.random()*.5;p.offset=0;p.panic=0;
   this.place(p);p.gaitPosition=null;this.people.push(p);
  }
 }
 lanePoint(p){const [fixed,a,b,axis]=p.lane,v=a+(b-a)*p.t;return axis==='z'?new THREE.Vector3(fixed+p.offset,0,v):new THREE.Vector3(v,0,fixed+p.offset);}
 place(p){const pos=this.lanePoint(p);p.group.position.set(pos.x,groundHeight(pos.x,pos.z),pos.z);}
 update(dt){
  const g=this.game,eye=g.camera.position,far=g.quality==='low'?45:g.quality==='medium'?60:75;this.frame++;
  const gunfire=g.lastGunfire&&g.elapsed-g.lastGunfire.time<2.5?g.lastGunfire.position:null;
  for(const [i,p]of this.people.entries()){
   const dist=p.group.position.distanceTo(eye);
   // Distance-based updates: full rate nearby, every 4th frame mid-range,
   // hidden but still progressing along the lane far away.
   const visible=dist<far;p.group.visible=visible;
   // Only nearby pedestrians cast shadows; distant ones are cheap silhouettes.
   const shadow=dist<22;if(p.shadow!==shadow){p.shadow=shadow;p.group.traverse(m=>{if(m.isMesh)m.castShadow=shadow;});}
   const tick=dist<30?1:dist<far?4:12;if((this.frame+i)%tick)continue;const step=dt*tick;
   if(gunfire&&p.group.position.distanceTo(gunfire)<28&&p.panic<=0){p.panic=4;p.dir=Math.sign(this.lanePointDelta(p,gunfire))||p.dir;}
   p.panic=Math.max(0,p.panic-step);
   const [,a,b]=p.lane,length=Math.abs(b-a),speed=p.panic>0?4.2:p.speed;
   p.t+=p.dir*speed*step/length;if(p.t>1||p.t<0){p.t=THREE.MathUtils.clamp(p.t,0,1);p.dir*=-1;}
   // Step around obstacles and the player instead of walking through them.
   let next=this.lanePoint(p);const player=g.player.group.position;
   const blocked=!safeFooting(g,next,.35)||next.distanceTo(player)<1.1;
   p.offset=THREE.MathUtils.damp(p.offset,blocked?(p.offset>0?1.1:-1.1):0,3,step);next=this.lanePoint(p);
   const from=p.group.position.clone();p.group.position.set(next.x,groundHeight(next.x,next.z),next.z);
   const d=next.clone().sub(from);if(d.lengthSq()>1e-6)p.group.rotation.y=THREE.MathUtils.lerp(p.group.rotation.y,p.group.rotation.y+Math.atan2(Math.sin(Math.atan2(-d.x,-d.z)-p.group.rotation.y),Math.cos(Math.atan2(-d.x,-d.z)-p.group.rotation.y)),Math.min(1,step*8));
   if(visible){animateLocomotion(p,step,{});p.arms.rotation.x=THREE.MathUtils.damp(p.arms.rotation.x,p.panic>0?-2.2:-1.3+Math.sin(p.gaitPhase||0)*.15,8,step);if(p.hair)p.hair.visible=dist<30;}
  }
 }
 lanePointDelta(p,from){const [, , ,axis]=p.lane;const pos=p.group.position;const away=axis==='z'?pos.z-from.z:pos.x-from.x;const forward=p.lane[2]>p.lane[1]?1:-1;return away*forward;}
 dispose(){for(const p of this.people){p.group.removeFromParent();p.group.traverse(m=>{if(m.isMesh){m.geometry.dispose();m.material.dispose();}});}this.people=[];}
}
