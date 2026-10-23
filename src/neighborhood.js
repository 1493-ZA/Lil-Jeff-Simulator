import * as THREE from 'three';
import {buildDistrict} from './district.js';
import { OBJECTIVES, DRIVE_ROUTE } from './mission.js';
import { buildCar } from './models.js';
import { streetMaterial, addSky } from './surfaces.js';
import { decorateTerritories } from './territory.js';
import { swapProps } from './assets.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// A fictional Chicago-inspired streetscape. Decorative boxes are instanced to
// keep the denser neighborhood affordable on integrated graphics.
export function buildNeighborhood(game) {
  game.scene.background = new THREE.Color('#555c72');
  addSky(game);
  game.scene.fog = new THREE.FogExp2('#555c72', .008);
  game.scene.add(new THREE.HemisphereLight('#a8b9df', '#38312f', 1.1));
  const sun = new THREE.DirectionalLight('#ffcfaa', 3.2);
  sun.position.set(-35, 40, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 60, bottom: -60, far: 160 });
  sun.shadow.bias = -.00025;sun.shadow.normalBias=.025;sun.shadow.radius=3;
  sun.target.position.set(0,0,-26);
  game.scene.add(sun, sun.target);
  const batches = new Map();
  function box(w,h,d,color,x,y,z,solid=false,material=null) {
    const key = material ? color + '-brick' : color;
    if (!batches.has(key)) batches.set(key, { material: material || game.material(color, ['#2d3744','#415867','#425163'].includes(color)?{roughness:.27,metalness:.3}:{}), items: [] });
    batches.get(key).items.push({w,h,d,x,y,z});
    if (solid) game.colliders.push(new THREE.Box3(new THREE.Vector3(x-w/2,y-h/2,z-d/2),new THREE.Vector3(x+w/2,y+h/2,z+d/2)));
  }
  const brickCanvas = document.createElement('canvas');
  brickCanvas.width=256; brickCanvas.height=128;
  const ctx=brickCanvas.getContext('2d');
  ctx.fillStyle='#78675d'; ctx.fillRect(0,0,256,128);
  for(let row=0;row<8;row++) for(let col=-1;col<8;col++) {
    ctx.fillStyle=['#9b5946','#9f604b','#8d4f40','#aa6950'][(row*7+col+8)%4];
    ctx.fillRect(col*40+(row%2)*20,row*16+1,38,14);
    for(let k=0;k<18;k++){ctx.fillStyle=k%2?'#392e282c':'#e7c5a220';ctx.fillRect(col*40+(row%2)*20+(k*17%37),row*16+2+(k*5%12),2,1);}
  }
  const brickTexture=new THREE.CanvasTexture(brickCanvas);
  brickTexture.colorSpace=THREE.SRGBColorSpace;
  brickTexture.wrapS=brickTexture.wrapT=THREE.RepeatWrapping;
  brickTexture.repeat.set(2,2);
  const bump=brickTexture.clone();bump.colorSpace=THREE.NoColorSpace;
  const brick=game.material('#ad9388',{map:brickTexture,bumpMap:bump,bumpScale:.065,roughness:.96});
  box(58,.5,108,'#asphalt',0,-.26,-28,false,streetMaterial());
  box(6,.16,106,'#92918b',-12,.02,-28);
  box(6,.16,106,'#92918b',12,.02,-28);
  box(.2,.25,106,'#c0b4a2',-9,.06,-28);
  box(.2,.25,106,'#c0b4a2',9,.06,-28);
  for(let z=19;z>-81;z-=5) {
    box(.12,.012,2.2,'#c4a96b',-.14,.01,z);
    box(.12,.012,2.2,'#c4a96b',.14,.01,z);
    box(5.6,.018,.055,'#797e81',-12,.115,z);
    box(5.6,.018,.055,'#797e81',12,.115,z);
  }
  for(const [x,z] of [[3,4],[-4,-19],[2,-40],[-2,-65]]){const puddle=new THREE.Mesh(new THREE.CircleGeometry(1,32),game.material('#35414a',{roughness:.14,metalness:.45,transparent:true,opacity:.6}));puddle.rotation.x=-Math.PI/2;puddle.scale.set(1.7,.7,1);puddle.position.set(x,.021,z);game.scene.add(puddle);}
  // Street furniture: manholes, kerb drains, stop lines, hydrants, AC units
  // and window ledges break up the flat road and plain facades.
  for(const [x,z] of [[-3,-6],[4,-29],[-2,-47],[3,-71],[1,10]]){const lid=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.02,20),game.material('#3b3d3e',{roughness:.6,metalness:.5}));lid.position.set(x,.012,z);lid.receiveShadow=true;game.scene.add(lid);for(let n=-1;n<=1;n++)box(.7,.004,.04,'#2a2c2d',x,.024,z+n*.14);}
  for(let z=15;z>-80;z-=14)for(const side of [-1,1]){box(.5,.03,.25,'#1e2224',side*8.75,.02,z);for(let n=0;n<4;n++)box(.04,.032,.22,'#3a3f42',side*8.75-.18+n*.12,.022,z);}
  for(const z of [-15.2,-64.2])box(8.4,.012,.32,'#d9d3c0',z<-40?-4.2:4.2,.014,z);
  // Hydrants: code-built fallback, replaced by public/models/props/hydrant.glb if present.
  const hydrants=new THREE.Group();hydrants.name='hydrant fallback';game.scene.add(hydrants);
  const hydrantSpots=[[-9.6,-4,Math.PI/2],[9.6,-28,-Math.PI/2],[-9.6,-58,Math.PI/2]];
  for(const [x,z] of hydrantSpots){game.box(.26,.55,.26,'#b23b2c',x,.28,z,{parent:hydrants});game.box(.34,.08,.34,'#b23b2c',x,.58,z,{parent:hydrants});game.box(.4,.1,.12,'#9b3326',x,.38,z,{parent:hydrants});}
  swapProps(game,'props/hydrant.glb',hydrants,hydrantSpots,{height:.8});
  // Crosswalk, resurfaced asphalt, stoops and narrow residential lots.
  for(let x=-7.5;x<8;x+=1.7) for(const z of [-17,-66]) box(.9,.02,3.4,'#c2bca9',x,.015,z);
  [[-3,3,2,3],[5,-22,2.5,4],[-4,-46,3,5]].forEach(([x,z,w,d])=>box(w,.015,d,'#303844',x,.015,z));
  for(const side of [-1,1]) for(let i=0;i<6;i++) {
    // Lot 4 (z -61…-49) stays open on both sides: the elevated railway crosses
    // there, with the station stairs on the west lot and parking on the east.
    if(i===4)continue;
    const z=9-i*16;
    const x=side*20;
    const h=9+(i%3)*1.8;
    box(11,h,12,'#brick',x,h/2,z,true,brick);
    box(11.4,.3,12.4,'#514541',x,h,z);
    box(11.3,.25,12.3,'#b49f84',x,h-.6,z);
    for(let floor=0;floor<3;floor++) for(let j=0;j<3;j++) {
      const wz=z-4+j*4;
      box(.08,1.9,1.35,'#2d3744',side*14.44,2.2+floor*2.8,wz);
      box(.09,.09,1.55,'#c1af91',side*14.38,1.2+floor*2.8,wz);
      box(.09,2.05,.07,'#b09a81',side*14.38,2.2+floor*2.8,wz);
      if((j+floor+i)%3!==0) box(.1,1.55,1.05,'#c38e56',side*14.35,2.2+floor*2.8,wz);
    }
    box(.1,2.4,1.2,'#3b3432',side*14.4,1.25,z);
    for(let floor=0;floor<3;floor++)box(.12,.08,12.2,'#9c8a76',side*14.5,3.6+floor*2.8,z);
    if(i%2===0){box(.6,.45,.7,'#a7aba6',side*14.15,5.3,z-4);box(.62,.06,.72,'#7c807b',side*14.15,5.55,z-4);}
    for(let step=0;step<3;step++) box(1.1,.18*(step+1),2,'#8b8376',side*(13.2+step*.35),.09*(step+1),z,true);
    for(const dz of [-6.5,6.5]) {
      box(2.5,.05,.05,'#303a40',side*13,1.2,z+dz);
      for(let p=0;p<6;p++) box(.035,1.4,.035,'#303a40',side*(11.8+p*.45),.7,z+dz);
    }
  }
  // Corner businesses face the street, with no real store names or gang marks.
  const store=game.label('AFTER HOURS / CORNER STORE','#f5d99a',8,-14.25,3.6,-23,30);
  store.rotation.y=Math.PI/2;
  const laundry=game.label('SPIN CITY / LAUNDROMAT','#a8e2e7',8,14.25,3.6,-8,28);
  laundry.rotation.y=-Math.PI/2;
  const mural=game.label('KEEP THE LIGHTS ON','#f0b482',7,-14.25,5.3,-43,31);
  mural.rotation.y=Math.PI/2;
  // Alley dumpsters, utility poles, parked cars and a small basketball court.
  for(const [x,z] of [[12,-3],[-12,-42],[12,-56]]) {
    box(1.7,1.4,2.3,'#3e5b52',x,.75,z,true);
    box(1.85,.12,2.4,'#243835',x,1.5,z);
  }
  // Parked cars use the same rounded car model (lighter detail, no interior).
  // Imported muscle cars and sedans (public/models/cars) replace these when they load;
  // the red car keeps our block's colour as a tint.
  for(const [x,z,color,turn,model,tint] of [[-7,2,'#76625b',0,'muscle-1'],[7,-13,'#3f5268',1,'sedan-1'],[-7,-32,'#a3302b',0,'muscle-2','#c23a32'],[7,-61,'#726e59',1,'sedan-1']]) {
    const parked=buildCar(game,[x,0,z],{paint:color,parked:true,detail:game.quality==='high',model,tint});parked.group.rotation.y=turn*Math.PI;parked.group.name='parked car';
    game.colliders.push(new THREE.Box3(new THREE.Vector3(x-1.2,0,z-2.5),new THREE.Vector3(x+1.2,1.8,z+2.5)));
  }
  for(let z=14;z>-82;z-=23) for(const side of [-1,1]) {
    const x=side*10.8;
    box(.18,8,.18,'#514b47',x,4,z);
    box(2.3,.14,.45,'#58606c',x-side,8,z);
    box(1.1,.07,.5,'#ffdc9c',x-side*1.5,7.88,z);
    if(side<0) {
      const lamp=new THREE.PointLight('#ffbd76',20,16,2);
      lamp.position.set(x,7.5,z); game.scene.add(lamp);
    }
    box(1.5,.08,.1,'#453c35',x,8.7,z);
    box(.025,.025,23,'#34343d',x,8.8,z-11.5);
  }
  buildRailway(game,box);
  box(.12,4,.12,'#4b4b4b',12,2,18);
  box(.15,1.6,2.1,'#babfb7',12,4.1,18);
  box(.9,.08,.8,'#ce825e',11.5,3.4,18);
  const streetSign=game.label('SOUTH SIDE / AFTER HOURS','#d6e6da',5,0,7,-80,28);
  streetSign.name='fictional neighborhood sign';
  const mic=game.cylinder(.045,1.6,'#4c555c',-11,.8,-25);
  game.cylinder(.12,.25,'#a2aaa7',-11,1.75,-25);
  box(1.1,1.5,.6,'#202a35',-12.8,.8,-25,true);
  box(.7,.7,.05,'#62636e',-12.8,.85,-24.68);
  box(1.4,.08,.7,'#38434e',-10,1.1,-26);
  game.car=buildCar(game,undefined,{model:'sedan-2'});
  game.terminals=OBJECTIVES.map((o,i)=>{
    const ring=new THREE.Mesh(new THREE.TorusGeometry(i===2?3.5:2,.035,5,48),new THREE.MeshBasicMaterial({color:o.color,transparent:true,opacity:.6}));
    ring.rotation.x=Math.PI/2;
    ring.position.set(o.position[0],.14,o.position[2]); game.scene.add(ring);
    const marker=game.label(`0${i+1} / ${['DRACO','THE MIC','GETAWAY'][i]}`,o.color,3.7,o.position[0],3.4,o.position[2]);marker.visible=false;ring.visible=false;
    return {ring,marker};
  });
  game.routeMarkers=DRIVE_ROUTE.map(([x,z],i)=>{
    const ring=new THREE.Mesh(new THREE.TorusGeometry(2.7,.12,6,40),new THREE.MeshBasicMaterial({color:'#bca1ff',transparent:true,opacity:.85}));
    ring.position.set(x,2.3,z); game.scene.add(ring); ring.visible=false;
    const label=game.label(`ROUTE 0${i+1}`,'#d6bdff',3,x,5,z);
    label.visible=false;
    return {ring,label};
  });
  buildDistrict(game,brick);decorateTerritories(game);
  const dummy=new THREE.Object3D();
  const geometry=new THREE.BoxGeometry(1,1,1);
  for(const {material,items} of batches.values()) {
    const mesh=new THREE.InstancedMesh(geometry,material,items.length);
    items.forEach((item,i)=>{dummy.position.set(item.x,item.y,item.z);dummy.scale.set(item.w,item.h,item.d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
    mesh.castShadow=mesh.receiveShadow=true;
    game.scene.add(mesh);
  }
}

// Elevated railway over the street at z=-53. The deck clears the street by
// 7.6 units, rests on piers outside the traffic lanes, and passes over open
// lots only (no buildings). The west lot holds a station: two stair flights
// up to a platform beside the tracks. Mission 4 will build on this later.
export const RAIL={z:-53,minX:-40,maxX:33,top:8.4};
function buildRailway(game,box){
 const z=RAIL.z,solid=true;
 game.railBoxes=[];const deck=(w,h,d,c,x,y,zz)=>{box(w,h,d,c,x,y,zz,solid);game.railBoxes.push(game.colliders.at(-1));};
 deck(RAIL.maxX-RAIL.minX,.8,6.8,'#39464d',(RAIL.minX+RAIL.maxX)/2,8,z);
 for(const dz of [-3.55,3.55])box(RAIL.maxX-RAIL.minX,1.1,.3,'#2f3a40',(RAIL.minX+RAIL.maxX)/2,8.2,z+dz);
 for(let x=RAIL.minX+.6;x<RAIL.maxX;x+=1.2)box(.18,.2,6.2,'#736e65',x,8.5,z);
 for(const dz of [-1.6,1.6,-.85,.85])box(RAIL.maxX-RAIL.minX,.15,.1,'#a0a7ab',0+(RAIL.minX+RAIL.maxX)/2,8.68,z+dz);
 // Piers: at the kerbs (never in a lane), inside the open lots and at the end.
 for(const x of [-10.5,10.5,-20,20,-31,31.5])for(const dz of [-3,3])box(.5,7.6,.5,'#3e4b51',x,3.8,z+dz,solid);
 box(2,7.6,7,'#55585a',32.5,3.8,z,solid);
 // A stopped train at the station (rounded silhouette, windows both sides).
 const train=new THREE.Group();train.name='elevated train';game.scene.add(train);
 const car=(x)=>{const body=new THREE.Mesh(new RoundedBoxGeometry(9.2,2.5,3.1,4,.35),game.material('#a7b2b3',{metalness:.55,roughness:.35}));body.position.set(x,10.15,z-1.1);train.add(body);
  for(const side of [-1,1]){for(let w=-3.6;w<=3.6;w+=1.8){const glass=game.box(1.3,.95,.04,'#2f4552',x+w,10.45,z-1.1+side*1.57,{parent:train,roughness:.15,metalness:.4});glass.castShadow=false;}game.box(9.2,.14,.05,'#b98b72',x,9.55,z-1.1+side*1.57,{parent:train});}
  for(const dx of [-3,3]){game.box(1.8,.45,2.4,'#25292c',x+dx,8.95,z-1.1,{parent:train});}
  game.colliders.push(new THREE.Box3(new THREE.Vector3(x-4.6,8.7,z-2.65),new THREE.Vector3(x+4.6,11.4,z+.45)));game.railBoxes.push(game.colliders.at(-1));};
 car(-26.5);car(-17);
 // West lot: station platform south of the deck, reached by two stair flights.
 deck(10,.3,3.2,'#6f7472',-20,8.25,-58);
 // Platform rail leaves an opening where the upper flight arrives (x≈-16.5).
 for(let x=-24.8;x<=-17.6;x+=.8)box(.05,1,.05,'#3b4246',x,8.9,-59.55);box(7.4,.06,.06,'#3b4246',-21.1,9.4,-59.55);
 const rise=.35,run=.5;
 for(let n=0;n<12;n++){const h=rise*(n+1);box(run,h,1.8,'#7d807c',-16-n*run-run/2,h/2,-62.5,solid);}
 box(2,4.2,3.8,'#7d807c',-23.2,2.1,-61.5,solid);
 for(let n=0;n<12;n++){const h=4.2+rise*(n+1);box(run,h,1.8,'#7d807c',-22.2+n*run+run/2,h/2,-60.5,solid);}
 for(const [x,y,zz,len]of [[-19.1,3.2,-63.45,6],[-19.1,7.4,-61.45,6]])box(len,.06,.06,'#3b4246',x,y,zz);
 box(.12,1.1,1.8,'#3b4246',-15.95,8.95,-60.5,solid);box(.12,1.1,3.2,'#3b4246',-14.95,8.95,-58,solid);
 const sign=game.label('AFTER HOURS STATION','#f3e2b8',4.5,-20,9.9,-59.7,30);sign.rotation.y=Math.PI;
 // East lot: fenced parking under the tracks.
 for(let x=15.5;x<25.5;x+=.6)box(.05,1.4,.05,'#4a5154',x,.7,-60.6);
 box(.05,.05,10,'#4a5154',15.2,1.35,-55);
 game.rail={minX:RAIL.minX,maxX:RAIL.maxX,z};
}
