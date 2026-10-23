import * as THREE from 'three';
// One small, consistent marker language for the whole HUD (the style first
// used for the alley drop): icon + short label + distance. Markers sit on the
// world position they describe and clamp to the screen edge with an arrow when
// the target is off screen. Elements are pooled; only changed text is written.
const v=new THREE.Vector3();
export function placeMarker(game,el,world,{edge=true,margin=[.88,.8]}={}){
 v.copy(world).project(game.camera);
 const behind=v.z>1;let x=v.x,y=-v.y;
 if(behind){x=-x;y=-y;if(Math.abs(x)<.01&&Math.abs(y)<.01)y=1;}
 const outside=behind||Math.abs(x)>margin[0]||Math.abs(y)>margin[1];
 if(outside&&!edge){el.classList.add('hidden');return null;}
 if(outside){const scale=Math.max(Math.abs(x)/margin[0],Math.abs(y)/margin[1],1);x/=scale;y/=scale;}
 el.classList.remove('hidden');
 el.style.left=`${(x+1)*50}%`;el.style.top=`${(y+1)*50}%`;
 el.style.setProperty('--bearing',`${Math.atan2(y,x)*180/Math.PI+90}deg`);
 el.classList.toggle('offscreen',outside);
 return {outside,depth:v.z};
}
export function setContent(el,html){if(el.dataset.html!==html){el.dataset.html=html;el.innerHTML=html;}}
export function markerHTML({icon='',text='',distance=null,key=null}){
 return `${key?`<kbd>${key}</kbd>`:''}${icon?`<i>${icon}</i>`:''}${text?`<b>${text}</b>`:''}${distance!==null?`<span>${distance}m</span>`:''}`;
}
export class MarkerPool{
 constructor(root){this.root=root;this.items=[];this.used=0;}
 begin(){this.used=0;}
 add(game,world,options){
  let el=this.items[this.used];
  if(!el){el=document.createElement('div');this.root.append(el);this.items.push(el);}
  this.used++;el.className=`wm ${options.kind||'objective'}`;el.style.setProperty('--c',options.color||'#e3c492');
  el.style.opacity=options.opacity??1;
  setContent(el,markerHTML(options));
  placeMarker(game,el,world,{edge:!!options.edge});
  return el;
 }
 end(){for(let i=this.used;i<this.items.length;i++)this.items[i].classList.add('hidden');}
}
