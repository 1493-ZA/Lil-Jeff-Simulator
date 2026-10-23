import {batchStatic} from './quality.js';
import {upgradeWeapon,upgradeCar} from './assets.js';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function buildHair(game, person, style) {
  const hair = new THREE.Group();
  hair.name = style === 0 ? 'shoulder-length loose locs' : 'tied crown locs with violet tips';
  person.body.add(hair);
  const dark = '#171518';
  const scalp=new THREE.Mesh(new THREE.SphereGeometry(1,16,10),game.material(dark));
  scalp.name='fitted hairline';scalp.scale.set(.153,.075,.167);scalp.position.set(0,2.03,.015);hair.add(scalp);
  const count = style === 0 ? 22 : 16;
  for (let i = 0; i < count; i++) {
    const angle = Math.PI + .8 + i / (count - 1) * (Math.PI * 2 - 1.6);
    const length = style === 0 ? .5 + (i % 3) * .055 : .65 + (i % 4) * .045;
    const pivot = new THREE.Group();
    pivot.position.set(Math.sin(angle) * .155, style === 0 ? 2.04 : 2.09, Math.cos(angle) * .17);
    pivot.rotation.z = Math.sin(angle) * (style === 0 ? .1 : .3);
    hair.add(pivot);
    for (let j = 0; j < 4; j++) {
      const strand = game.cylinder(style === 0 ? .03 : .035, length / 4 + .02, style === 1 && j === 3 ? '#71518c' : dark, Math.sin(j * .9 + i) * .025, -j * length / 4, 0, pivot);
      strand.rotation.z = Math.sin(i + j) * .12;
    }
  }
  if (style === 1) {
    const knot=new THREE.Mesh(new THREE.SphereGeometry(.09,12,8),game.material(dark));knot.position.set(0,2.14,.05);hair.add(knot);
    game.cylinder(.074,.025,'#bca1ff',0,2.13,.05,hair);
  }
  batchStatic(hair,true);return hair;
}

export function buildWeapon(game, id, parent, x) {
  const group = new THREE.Group();
  group.name = `weapon-${id}`;
  group.position.set(x, -.02, -.57);
  parent.add(group);
  const add = (w, h, d, color, px, py, pz) => game.box(w, h, d, color, px, py, pz, { parent: group, metalness: .55 });
  const steel = '#242b30', black = '#12191d';
  const pistol = id === 'switch' || id === 'akimbo';
  let length;
  if (id === 'draco') {
    add(.19, .2, .48, steel, 0, 0, -.12);
    add(.24, .18, .25, '#925b32', 0, -.035, -.45); // Distinct short wood fore-end.
    add(.1, .1, .22, black, 0, .02, -.63);
    add(.07, .055, .3, steel, 0, .135, -.43);
    add(.035, .1, .035, black, 0, .18, -.65);
    add(.09, .25, .14, '#795338', 0, -.19, .02).rotation.x = -.22;
    length = .77;
  } else if (id === 'arp') {
    add(.18, .2, .42, steel, 0, 0, -.12);
    add(.19, .19, .45, '#35434a', 0, .02, -.53);
    add(.07, .07, .25, black, 0, .03, -.85);
    add(.08, .04, .72, black, 0, .14, -.4);
    add(.12, .12, .2, '#333e45', 0, .19, -.16); // Optic silhouette.
    add(.065, .065, .025, '#9bdfc6', 0, .2, -.27);
    add(.09, .12, .25, '#202b31', 0, .02, .2); // Bare rear tube, no stock.
    add(.09, .24, .13, black, 0, -.19, .01).rotation.x = -.17;
    for (let z = -.7; z < -.35; z += .09) add(.195, .035, .035, black, 0, .045, z);
    length = 1.02;
  } else {
    add(.13, .13, .4, id === 'akimbo' ? '#6a7072' : '#3c4449', 0, .025, -.09);
    add(.13, .08, .3, black, 0, -.07, -.05);
    add(.105, .24, .13, black, 0, -.2, .04).rotation.x = -.16;
    add(.03, .025, .03, '#d4ddc5', 0, .11, -.26);
    if (id === 'switch') add(.09, .21, .11, '#343b40', 0, -.4, .07);
    length = .32;
  }
  if (id !== 'switch') {
    const drum = game.cylinder(pistol ? .18 : .24, .24, '#1d282d', 0, -.32, -.19, group);
    drum.rotation.x = Math.PI / 2;
    game.box(pistol ? .1 : .13, .2, .1, '#26333a', 0, -.19, -.19, { parent: group });
  }
  for(const side of [-1,1]){
    for(let n=0;n<4;n++)add(.012,.075,.016,'#747d80',side*(pistol?.068:.098),.025,.02-n*.035);
    add(.015,.027,pistol?.22:.37,'#525c61',side*(pistol?.068:.098),-.04,-.08);
  }
  add(.025,.035,.04,'#d8d5b8',0,.12,-length+.08);
  add(.04,.035,.035,black,-.045,.12,.055);add(.04,.035,.035,black,.045,.12,.055);
  const bore=game.cylinder(pistol?.029:.04,.055,'#090d10',0,.025,-length,group);bore.rotation.x=Math.PI/2;
  const guard=new THREE.Mesh(new THREE.TorusGeometry(.063,.012,4,12,Math.PI*1.8),game.material(steel,{metalness:.6}));guard.rotation.y=Math.PI/2;guard.position.set(0,-.15,-.08);group.add(guard);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, .025, -length);
  group.add(muzzle);
  const flash=new THREE.Group();
  const core=new THREE.Mesh(new THREE.ConeGeometry(id==='draco'?.13:.08,id==='draco'?.5:.3,8),new THREE.MeshBasicMaterial({color:'#fff0c5',transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));core.rotation.x=-Math.PI/2;flash.add(core);
  const shape=new THREE.Shape();for(let n=0;n<16;n++){const a=n*Math.PI/8,r=n%2?.045:(id==='draco'?.23:.15);const x=Math.cos(a)*r,y=Math.sin(a)*r;if(n)shape.lineTo(x,y);else shape.moveTo(x,y);}shape.closePath();
  const flare=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:'#ffb856',side:THREE.DoubleSide,transparent:true,opacity:.65,blending:THREE.AdditiveBlending,depthWrite:false}));flash.add(flare);
  flash.position.set(0, .025, -length - .16);
  flash.visible = false;
  group.add(flash);
  batchStatic(group);const gun={ group, muzzle, flash, recoil: 0, flashTime: 0 };
  upgradeWeapon(game,id,gun);return gun;
}

// The driver door is on the car's left (-X) side, hinged at its front edge.
// Rotating about +Y by a negative angle swings the rear edge outward (-X).
export const DOOR_OPEN=-1.05;
// Side profile (z, y) extruded across the car's width with a soft bevel gives
// rounded hood, nose, trunk and wheel arches instead of stacked boxes.
function profile(points){
 const shape=new THREE.Shape();shape.moveTo(points[0][0],points[0][1]);
 for(const p of points.slice(1)){
  if(p.arc){shape.absarc(p.arc[0],p.arc[1],p.arc[2],p.arc[3],p.arc[4],p.arc[5]);continue;}
  const [z,y,cz,cy]=p;if(cz!==undefined)shape.quadraticCurveTo(cz,cy,z,y);else shape.lineTo(z,y);
 }
 shape.closePath();return shape;
}
function extrudeSide(shape,width,bevel,detail){
 const g=new THREE.ExtrudeGeometry(shape,{depth:width-bevel*2,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:detail?4:2,curveSegments:detail?14:6});
 // Shape x → car z, extrusion → car x (centred).
 g.rotateY(-Math.PI/2);g.translate((width-bevel*2)/2,0,0);g.computeVertexNormals();return g;
}
const ARCH=.53,ARCH_Y=.45,ARCH_DX=Math.sqrt(ARCH*ARCH-.09*.09),ARCH_A=Math.atan2(.09,ARCH_DX);
export function buildCar(game, position = [4, 0, -38], {paint='#343340',roof=null,trim='#1a1d22',detail=true,parked=false,model=null,tint=null}={}) {
  const group = new THREE.Group();
  group.position.set(...position);
  group.name = 'Z78 getaway sedan';
  game.scene.add(group);
  const high=detail&&game.quality!=='low';
  const paintMat=()=>high?new THREE.MeshPhysicalMaterial({color:paint,roughness:.32,metalness:.5,clearcoat:.8,clearcoatRoughness:.18}):game.material(paint,{roughness:.35,metalness:.45});
  const mesh=(geometry,material,x=0,y=0,z=0,parent=group)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
  const rounded=(w,h,d,color,x,y,z,r=.06,extra={},parent=group)=>mesh(new RoundedBoxGeometry(w,h,d,high?3:1,Math.min(r,w/2.2,h/2.2,d/2.2)),game.material(color,{roughness:.4,metalness:.35,...extra}),x,y,z,parent);
  // Front clip (nose + hood) and rear clip (trunk), each with a wheel arch.
  const front=profile([[-.9,.36],[-1.5+ARCH_DX,.36],{arc:[-1.5,ARCH_Y,ARCH,-ARCH_A,Math.PI+ARCH_A,false]},[-2.32,.36],[-2.46,.62,-2.5,.42],[-2.36,.92,-2.47,.88],[-.9,1.08,-1.6,1.1]]);
  const rear=profile([[.9,.36],[.9,1.12],[2.3,1.06,1.7,1.13],[2.46,.7,2.47,1.0],[2.32,.36,2.47,.42],[1.5+ARCH_DX,.36],{arc:[1.5,ARCH_Y,ARCH,-ARCH_A,Math.PI+ARCH_A,false]}]);
  mesh(extrudeSide(front,2.36,.1,high),paintMat());mesh(extrudeSide(rear,2.36,.1,high),paintMat());
  // Rockers, passenger door, roof rails, pillars (with an open sunroof above).
  for(const x of [-1.1,1.1])rounded(.18,.24,1.82,paint,x,.48,0,.07);
  rounded(.09,.62,1.76,paint,1.17,.86,0,.04);
  for(const x of [-.98,.98]){rounded(.11,.82,.12,trim,x,1.43,-.64,.04).rotation.x=.7;rounded(.11,.74,.12,trim,x,1.44,.71,.04).rotation.x=-.61;rounded(.2,.09,.95,paint,x,1.76,.05,.04);}
  rounded(1.86,.09,.22,paint,0,1.76,-.32,.04);rounded(1.86,.09,.22,paint,0,1.76,.42,.04);
  const glass=new THREE.MeshPhysicalMaterial({color:'#7d9aa6',roughness:.08,metalness:.2,transparent:true,opacity:.3,depthWrite:false});
  const windshield=mesh(new THREE.PlaneGeometry(1.86,.81),glass,0,1.43,-.64);windshield.rotation.x=.7;windshield.castShadow=false;
  const backlight=mesh(new THREE.PlaneGeometry(1.86,.73),glass,0,1.44,.71);backlight.rotation.x=-.61;backlight.castShadow=false;
  const windowMeshes=[];
  for(const x of [-1.13,1.13]){const side=mesh(new THREE.PlaneGeometry(1.42,.5),glass,x,1.43,.03);side.rotation.y=Math.PI/2;side.castShadow=false;windowMeshes.push(side);}
  // Bumpers, grille, lights, plate, mirrors.
  rounded(2.38,.26,.28,trim,0,.48,-2.44,.11);rounded(2.38,.26,.28,trim,0,.48,2.44,.11);
  rounded(1.1,.2,.06,'#0e1114',0,.68,-2.48,.05);
  const headlight=game.material('#fff1cf',{emissive:'#ffe2a8',emissiveIntensity:1.2,roughness:.2});
  const taillight=game.material('#c63a35',{emissive:'#ff2a1f',emissiveIntensity:.9,roughness:.25});
  for(const x of [-.82,.82]){mesh(new RoundedBoxGeometry(.46,.15,.08,2,.04),headlight,x,.84,-2.4);mesh(new RoundedBoxGeometry(.5,.13,.08,2,.04),taillight,x,.9,2.42);}
  rounded(.42,.14,.03,'#d9d6c8',0,.55,2.57,.02);
  const details=new THREE.Group();details.name='car detail';group.add(details);
  for(const x of [-1.27,1.27]){rounded(.06,.05,.1,trim,x*.97,1.15,-.8,.02,{},details);rounded(.16,.12,.24,paint,x,1.18,-.84,.05,{},details);}
  // Door seams and handles on the passenger side (driver door has its own).
  rounded(.02,.6,.02,'#111317',1.215,.86,-.88,.01,{},details);rounded(.02,.6,.02,'#111317',1.215,.86,.88,.01,{},details);rounded(.03,.04,.16,'#b9bcb8',1.22,1.0,.5,.015,{},details);
  // Interior: seats, rear bench, dashboard and steering wheel.
  if(high&&!parked){
   for(const x of [-.5,.5]){rounded(.55,.16,.5,'#22262c',x,.78,-.3,.05,{},details);rounded(.55,.6,.14,'#22262c',x,1.07,-.02,.05,{},details);}
   rounded(1.8,.16,.45,'#22262c',0,.78,.55,.05,{},details);rounded(1.8,.48,.14,'#22262c',0,1.03,.78,.05,{},details);
   rounded(1.9,.2,.3,'#181b20',0,1.1,-.8,.05,{},details);
   const wheel=mesh(new THREE.TorusGeometry(.17,.025,6,18),game.material('#121418'),-.5,1.2,-.62,details);wheel.rotation.x=-.45;
  }
  // Animated driver door: panel, window, trim line and handle on a front hinge.
  const door=new THREE.Group();door.name='animated driver door';door.position.set(-1.17,.86,-.88);group.add(door);
  const panel=rounded(.09,.62,1.76,paint,-1.17,.86,0,.04);door.attach(panel);door.attach(windowMeshes[0]);
  const trimLine=rounded(.03,.04,1.64,'#9a9e9b',-1.22,1.13,0,.015);door.attach(trimLine);
  const handle=rounded(.03,.04,.16,'#b9bcb8',-1.22,1.0,.5,.015);door.attach(handle);
  // Wheels: rounded tyre profile with a five-spoke rim. The tyre mesh is the
  // hit target for pursuit shots; rims ride on it.
  const tyreShape=[[.22,-.12],[.4,-.13],[.44,-.08],[.45,0],[.44,.08],[.4,.13],[.22,.12]].map(([r,y])=>new THREE.Vector2(r,y));
  const tyreGeometry=new THREE.LatheGeometry(tyreShape,high?20:10);const rubber=game.material('#141619',{roughness:.9});
  const wheels=[];
  for (const x of [-1.12,1.12]) for (const z of [-1.5,1.5]) {
    const wheel=mesh(tyreGeometry,rubber,x,.45,z);wheel.rotation.z=Math.PI/2;wheels.push(wheel);
    const rim=mesh(new THREE.CylinderGeometry(.24,.24,.235,high?16:8),game.material('#b5b9bd',{metalness:.8,roughness:.28}),0,0,0,wheel);
    if(high)for(let n=0;n<5;n++){const spoke=mesh(new THREE.BoxGeometry(.05,.03,.4),game.material('#2a2d31',{metalness:.6,roughness:.4}),0,x>0?-.122:.122,0,wheel);spoke.rotation.y=n*Math.PI*2/5;}
    rim.castShadow=false;
  }
  if(roof)group.traverse(m=>{if(m.isMesh&&m.position.y>1.6&&m!==windshield)m.material=game.material(roof,{roughness:.35,metalness:.3});});
  batchStatic(group);batchStatic(details);
  const car={ group, wheels, windowMeshes, door, details, roofY:1.79, lockState:'locked', speed: 0, yaw: 0, gate: 0, integrity: 100, collisionCooldown: 0 };
  // An imported model (public/models/cars) replaces the code-built body when it loads.
  if(model)upgradeCar(game,car,model,tint);
  return car;
}
