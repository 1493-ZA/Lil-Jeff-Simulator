import * as THREE from 'three';
import {batchStatic} from './quality.js';
import {safeFooting} from './companions.js';
import {propSpot,propFallback} from './props.js';
// Three readable areas, split along the east-west axis of the map.
export const ZONES=[
 {id:'home',name:'OUR BLOCK',minX:-30,maxX:25,color:'#ff6f61',map:'#3a1d22'},
 {id:'commerce',name:'COMMERCE ROW',minX:25,maxX:44,color:'#e6d7a8',map:'#2a2a24'},
 {id:'opp',name:'OPP BLOCK',minX:44,maxX:80,color:'#6fa8ff',map:'#17264a'},
];
export const zoneAt=x=>ZONES.find(z=>x<z.maxX)||ZONES[2];
export const HEAT_MAX=100,HEAT_LEVELS=[25,50,75,100];
export const heatLevel=h=>HEAT_LEVELS.filter(t=>h>=t).length;
const EXIT=new THREE.Vector3(39,0,-31);
const $=s=>document.querySelector(s);

// Subtle "NOW ENTERING" notice whenever the active character crosses a boundary.
export function updateZone(g){
 const zone=zoneAt(g.player.group.position.x);
 if(g.zone===zone.id)return zone;
 const first=g.zone===undefined;g.zone=zone.id;
 if(!first&&g.level!==3||!first&&g.pursuit?.phase==='free'){const el=$('#zone-notice');el.textContent=`NOW ENTERING: ${zone.name}`;el.style.setProperty('--zone',zone.color);el.classList.remove('hidden');el.classList.remove('show');void el.offsetWidth;el.classList.add('show');clearTimeout(g.zoneTimer);g.zoneTimer=setTimeout(()=>el.classList.add('hidden'),2600);}
 return zone;
}
export function createHeat(){return{value:0,level:0,escape:false,spawnTimer:4,grace:0,exit:EXIT.clone(),spawned:[]};}
export function addHeat(g,amount){const h=g.street?.heat;if(!h||zoneAt(g.player.group.position.x).id!=='opp')return;h.value=Math.min(HEAT_MAX,h.value+amount);}
function spawnHeatGroup(g,count){
 const pos=g.player.group.position,h=g.street.heat;
 const candidates=[];for(const dz of [-24,24,-32,32])for(const x of [49,63,56])candidates.push(new THREE.Vector3(x,0,THREE.MathUtils.clamp(pos.z+dz,-76,18)));
 candidates.sort(()=>Math.random()-.5);
 let made=0;for(const c of candidates){if(made>=count)break;if(c.distanceTo(pos)<16||!safeFooting(g,c))continue;
  const e=g.spawnEnemy(c.x,c.z);e.heatSpawn=true;e.streetPatrol=true;e.cooldown=2+Math.random();e.chase=h.level>=3;h.spawned.push(e);made++;}
}
// Rival-territory pressure. Time spent in the Opp Block, gunfire and kills
// raise HEAT; each level makes the block more hostile until the crew has to
// get out. Leaving the block lets it cool down.
export function updateHeat(g,dt){
 const h=g.street?.heat;if(!h)return;
 const pos=g.player.group.position,inside=zoneAt(pos.x).id==='opp';
 if(inside){
  h.grace=0;let rate=.75;
  if(g.street.active&&['target','stash'].includes(g.street.active.type)&&g.street.active.x>44)rate+=.9;
  if(g.shooting)rate+=4;
  h.value=Math.min(HEAT_MAX,h.value+rate*dt);
 }else{h.grace+=dt;if(h.grace>2)h.value=Math.max(0,h.value-(h.escape?12:7)*dt);}
 const level=heatLevel(h.value),previous=h.level;h.level=level;
 if(level>previous){
  if(level===1)g.toast('Z78: They clocking us. Opp Block’s getting hot.',3.5);
  if(level===2){spawnHeatGroup(g,2);g.toast('Draco: Small group pulling up. Heads on a swivel.',3.5);}
  if(level===3){spawnHeatGroup(g,3);g.toast('Doom: They’re all coming this way!',3.5);}
  if(level===4&&inside){h.escape=true;g.street.notify('MAX HEAT','GET OUT THE OPP BLOCK · Follow the arrow to Commerce Row');}
 }
 // Patrols stay watchful until the block heats up or someone gets shot.
 for(const e of g.enemies)if(e.streetPatrol&&e.health>0){if(level>=2)e.passive=false;e.chase=level>=3&&inside;}
 if(inside&&level>=2){h.spawnTimer-=dt;const alive=h.spawned.filter(e=>e.health>0).length;if(h.spawnTimer<=0&&alive<(level>=3?6:3)){spawnHeatGroup(g,level>=3?2:1);h.spawnTimer=level>=3?7:12;}}
 if(h.escape&&!inside){h.escape=false;g.street.notify('AREA CLEAR','Out of the Opp Block · heat fading');}
 if(!inside&&level===0&&h.spawned.length){
  // Cooled down: rivals that came looking head home and leave the street.
  for(const e of h.spawned)if(e.group.position.distanceTo(pos)>40){e.remove=true;}
  h.spawned=h.spawned.filter(e=>!e.remove);g.removeEnemies(e=>e.remove);
 }
 renderHeatMeter(g);
}
// Also used by co-op guests, who receive heat in the host snapshot.
export function renderHeatMeter(g){
 const h=g.street?.heat,meter=$('#heat-meter');if(!h){meter.classList.add('hidden');return;}
 const show=zoneAt(g.player.group.position.x).id==='opp'||h.value>0;meter.classList.toggle('hidden',!show);if(!show)return;
 const bars=Math.ceil(h.value/20),level=heatLevel(h.value);meter.dataset.level=String(level);meter.querySelector('b').textContent='█'.repeat(bars)+'░'.repeat(5-bars);meter.querySelector('small').textContent=h.escape?'GET OUT':['WATCHFUL','SUSPICIOUS','HOSTILE','CONVERGING','MAX HEAT'][level];
}
// Environmental colour identity: blue accents in the Opp Block, red (crew
// placeholder colour) on Our Block. Accents only; the blocks stay realistic.
function muralTexture(colors){
 const c=document.createElement('canvas');c.width=256;c.height=128;const ctx=c.getContext('2d');
 ctx.fillStyle='#1d2228';ctx.fillRect(0,0,256,128);
 for(let i=0;i<9;i++){ctx.fillStyle=colors[i%colors.length];ctx.globalAlpha=.85;ctx.beginPath();const x=i*30+10,y=20+((i*37)%70);ctx.arc(x,y,18+(i%3)*9,0,Math.PI*2);ctx.fill();}
 ctx.globalAlpha=1;ctx.strokeStyle='#f2efe6';ctx.lineWidth=5;ctx.beginPath();for(let x=0;x<=256;x+=16)ctx.lineTo(x,64+Math.sin(x/20)*22);ctx.stroke();
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
export function decorateTerritories(game){
 const root=new THREE.Group();root.name='territory accents';game.scene.add(root);
 const box=(w,h,d,c,x,y,z,extra={})=>game.box(w,h,d,c,x,y,z,{parent:root,...extra});
 const accent=(team)=>team==='opp'?{main:'#1f5fe0',light:'#4d8dff',glow:'#2a6bff'}:{main:'#b8322c',light:'#e25548',glow:'#ff3b2f'};
 // Facade banners, storefront light strips and low painted shutter murals.
 // Facades: Opp Block buildings front x=44/68, our block x=±14.5.
 const facades={opp:[[67.95,-12],[67.95,-52],[44.05,-12],[44.05,-72],[67.95,8]],home:[[-14.46,9],[14.46,-7],[-14.46,-7],[14.46,-39],[14.46,-71]]};
 for(const team of ['opp','home']){const a=accent(team),center=team==='opp'?56:0;
  const colors=team==='opp'?['#1e5ae0','#3f8cff','#0f2f86','#79b0ff']:['#b4302b','#e4584a','#7d1d1b','#f08a62'];
  for(const [i,[x,z]]of facades[team].entries()){const side=Math.sign(x-center);
   box(.05,1.6,.7,a.main,x-side*.06,4.2,z-1.2);box(.05,1.6,.7,a.main,x-side*.06,4.2,z+1.2);
   const strip=box(.06,.12,2.4,a.light,x-side*.08,2.62,z,{emissive:a.glow,emissiveIntensity:1.4});strip.name=`${team} storefront light`;
   // Murals use abstract shapes only: no real logos, gang marks or slogans.
   if(i%2===0)for(const dz of [-4,4]){const mural=new THREE.Mesh(new THREE.PlaneGeometry(2.6,.95),new THREE.MeshStandardMaterial({map:muralTexture(colors),roughness:.9}));mural.position.set(x-side*.07,.68,z+dz);mural.rotation.y=-side*Math.PI/2;mural.name=`${team} mural`;root.add(mural);}
  }
 }
 for(const [x,z,team]of [[56,-24,'opp'],[56,-44,'opp'],[0,-8,'home'],[0,-36,'home']]){const a=accent(team);const width=team==='opp'?20:22;
  for(let n=0;n<9;n++){const bulb=box(.12,.12,.12,a.light,x-width/2+n*width/8,6.4+Math.sin(n*.7)*.15,z,{emissive:a.glow,emissiveIntensity:2});bulb.castShadow=false;}
  box(width,.02,.02,'#2a2a2a',x,6.45,z);
 }
 // Team-coloured street props (parked car colours are set where the cars are built).
 const cans=new THREE.Group();cans.name='trash can fallback';propFallback(game,'trash-can',cans);
 for(const [x,z]of [[47.2,-36],[64.8,-50],[47.2,-8]]){box(.5,1,.5,'#1d4fb8',x,.5,z,{parent:cans});box(.55,.08,.55,'#2f6bea',x,1.03,z,{parent:cans});propSpot(game,'trash-can',x,null,z,0,{tint:'#1d4fb8'});}
 for(const [x,z]of [[-9.6,-14],[9.6,-50],[-9.6,-60]]){box(.5,1,.5,'#9e2b26',x,.5,z,{parent:cans});box(.55,.08,.55,'#c9413a',x,1.03,z,{parent:cans});propSpot(game,'trash-can',x,null,z,0,{tint:'#9e2b26'});}
 // Glow comes from emissive strips and bulbs only: extra point lights would
 // make every material in the scene more expensive to shade.
 batchStatic(root,true);root.add(cans);game.territory=root;
}
