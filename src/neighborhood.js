import * as THREE from 'three';
import {buildDistrict} from './district.js';
import { OBJECTIVES, DRIVE_ROUTE } from './mission.js';
import { buildCar } from './models.js';
import { streetMaterial, addSky } from './surfaces.js';

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
  // Crosswalk, resurfaced asphalt, stoops and narrow residential lots.
  for(let x=-7.5;x<8;x+=1.7) for(const z of [-17,-66]) box(.9,.02,3.4,'#c2bca9',x,.015,z);
  [[-3,3,2,3],[5,-22,2.5,4],[-4,-46,3,5]].forEach(([x,z,w,d])=>box(w,.015,d,'#303844',x,.015,z));
  for(const side of [-1,1]) for(let i=0;i<6;i++) {
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
  for(const [x,z,color] of [[-7,2,'#76625b'],[7,-13,'#3f5268'],[-7,-32,'#645b78'],[7,-61,'#726e59']]) {
    box(2.4,.8,4.5,color,x,.8,z,true);
    box(2.05,.7,2.3,'#425163',x,1.5,z);
    for(const dx of [-1.2,1.2]) for(const dz of [-1.4,1.4]) box(.25,.65,.65,'#19252d',x+dx,.4,z+dz);
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
  // Elevated rail crossing: steel columns, ties and a silver train silhouette.
  for(const x of [-10.5,10.5]) for(const z of [-50,-56]) box(.45,8,.45,'#3e4b51',x,4,z,true);
  box(65,.8,6.8,'#39464d',0,8,-53);
  for(let x=-31;x<32;x+=1.2) box(.18,.2,6.5,'#736e65',x,8.6,-53);
  for(const z of [-51,-55]) box(65,.15,.1,'#a0a7ab',0,8.8,z);
  box(19,2.6,4.2,'#9caaa9',-18,10.2,-53);
  for(let x=-26;x<-9;x+=2.3) box(1.4,1.15,.03,'#415867',x,10.5,-50.87);
  box(19,.18,.04,'#b98b72',-18,9.3,-50.85);
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
  game.car=buildCar(game);
  game.terminals=OBJECTIVES.map((o,i)=>{
    const ring=new THREE.Mesh(new THREE.TorusGeometry(i===2?3.5:2,.035,5,48),new THREE.MeshBasicMaterial({color:o.color,transparent:true,opacity:.6}));
    ring.rotation.x=Math.PI/2;
    ring.position.set(o.position[0],.14,o.position[2]); game.scene.add(ring);
    const marker=game.label(`0${i+1} / ${['DRACO','THE MIC','GETAWAY'][i]}`,o.color,3.7,o.position[0],3.4,o.position[2]);
    return {ring,marker};
  });
  game.routeMarkers=DRIVE_ROUTE.map(([x,z],i)=>{
    const ring=new THREE.Mesh(new THREE.TorusGeometry(2.7,.12,6,40),new THREE.MeshBasicMaterial({color:'#bca1ff',transparent:true,opacity:.85}));
    ring.position.set(x,2.3,z); game.scene.add(ring); ring.visible=false;
    const label=game.label(`ROUTE 0${i+1}`,'#d6bdff',3,x,5,z);
    label.visible=false;
    return {ring,label};
  });
  buildDistrict(game,brick);
  const dummy=new THREE.Object3D();
  const geometry=new THREE.BoxGeometry(1,1,1);
  for(const {material,items} of batches.values()) {
    const mesh=new THREE.InstancedMesh(geometry,material,items.length);
    items.forEach((item,i)=>{dummy.position.set(item.x,item.y,item.z);dummy.scale.set(item.w,item.h,item.d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
    mesh.castShadow=mesh.receiveShadow=true;
    game.scene.add(mesh);
  }
}
