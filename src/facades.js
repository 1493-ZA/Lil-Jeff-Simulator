import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// CC0 Poly Haven street and building sets (public/textures/building, /street).
// Boxes get world-scaled UVs so bricks, slabs and shutter ribs keep their real
// size on any wall, then each material is merged into a single draw call.
const BASE=(import.meta.env?.BASE_URL||'/')+'textures/';
// Metres covered by one repeat of each texture.
export const TILE={'building/brick-red':1.6,'building/brick-dark':1.8,'building/shutter-rust':2,'building/window-frame':1,'building/concrete-trim':2,'street/asphalt':4,'street/sidewalk':3,'street/curb':1};
const textures={},materials=new Map();
function load(name,file,srgb){
 const key=`${name}/${file}`;if(textures[key])return textures[key];
 const t=new THREE.TextureLoader().load(`${BASE}${key}.jpg`);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;if(srgb)t.colorSpace=THREE.SRGBColorSpace;
 return textures[key]=t;
}
// Shared PBR material (the world is built once, so every quality level gets the full set).
const TINT={'building/brick-red':'#e8a08c'};
export function surface(game,name,{color=TINT[name]||'#ffffff',normal=1,roughness=1,metalness=0}={}){
 const key=[name,color,normal,roughness,metalness].join('|');if(materials.has(key))return materials.get(key);
 const props={color,roughness,metalness};
 if(typeof document!=='undefined'){
  props.map=load(name,'color',true);
  props.normalMap=load(name,'normal',false);props.normalScale=new THREE.Vector2(normal,normal);props.roughnessMap=load(name,'roughness',false);
 }
 const m=new THREE.MeshStandardMaterial(props);m.userData.tile=TILE[name]||1;materials.set(key,m);return m;
}
// BoxGeometry whose UVs measure world metres divided by the texture's tile size.
export function worldBox(w,h,d,tile=1){
 const g=new THREE.BoxGeometry(w,h,d),uv=g.attributes.uv;
 // Face order: +x, -x, +y, -y, +z, -z (four vertices each).
 const dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
 for(let f=0;f<6;f++)for(let v=0;v<4;v++){const i=f*4+v;uv.setXY(i,uv.getX(i)*dims[f][0]/tile,uv.getY(i)*dims[f][1]/tile);}
 return g;
}
export class FacadeBatch{
 constructor(){this.groups=new Map();}
 add(material,w,h,d,x,y,z,{collider=null}={}){
  const g=worldBox(w,h,d,material.userData.tile||1);g.translate(x,y,z);
  if(!this.groups.has(material))this.groups.set(material,[]);this.groups.get(material).push(g);
  if(collider)collider.push(new THREE.Box3(new THREE.Vector3(x-w/2,y-h/2,z-d/2),new THREE.Vector3(x+w/2,y+h/2,z+d/2)));
 }
 flush(parent,name='facade'){
  for(const [material,list]of this.groups){const mesh=new THREE.Mesh(mergeGeometries(list),material);list.forEach(g=>g.dispose());mesh.castShadow=mesh.receiveShadow=true;mesh.name=name;parent.add(mesh);}
  this.groups.clear();
 }
}
// One street-facing window: concrete sill and lintel, painted frame, mullion and
// glass (some lit from inside). `side` is the facade normal along x.
export function addWindow(batch,game,{x,y,z,side,w=1.35,h=1.9,lit=false}){
 const trim=surface(game,'building/concrete-trim',{color:'#cfc6b8'}),frame=surface(game,'building/window-frame',{color:'#d7d2c8',roughness:.8});
 const glass=lit?litGlass(game):darkGlass(game);
 batch.add(glass,.06,h,w,x+side*.02,y,z);
 batch.add(frame,.1,h+.1,.07,x+side*.05,y,z-w/2);batch.add(frame,.1,h+.1,.07,x+side*.05,y,z+w/2);
 batch.add(frame,.1,.07,w,x+side*.05,y+h/2,z);batch.add(frame,.09,.05,w,x+side*.05,y+.12,z);batch.add(frame,.09,h,.05,x+side*.05,y,z);
 batch.add(trim,.2,.1,w+.3,x+side*.1,y-h/2-.06,z);batch.add(trim,.12,.14,w+.24,x+side*.06,y+h/2+.1,z);
}
// Roll-down storefront shutter with its housing box and side guide rails.
export function addShutter(batch,game,{x,y=0,z,side,w=1.9,h=2.5}){
 const rust=surface(game,'building/shutter-rust',{metalness:.12,roughness:1}),trim=surface(game,'building/concrete-trim',{color:'#b9b0a2'});
 batch.add(rust,.05,h,w,x+side*.03,y+h/2,z);
 batch.add(rust,.28,.3,w+.2,x+side*.14,y+h+.15,z);
 for(const s of [-1,1])batch.add(trim,.1,h,.08,x+side*.06,y+h/2,z+s*(w/2+.04));
}
let dark=null,lit=null;
function darkGlass(game){return dark??=Object.assign(new THREE.MeshPhysicalMaterial({color:'#24303b',roughness:.08,metalness:.4,clearcoat:game.quality==='high'?1:0}),{userData:{tile:1}});}
function litGlass(game){return lit??=Object.assign(new THREE.MeshStandardMaterial({color:'#3a3026',emissive:'#ffc77a',emissiveIntensity:.9,roughness:.2}),{userData:{tile:1}});}
