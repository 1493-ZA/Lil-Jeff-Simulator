export const LABELS={keyboard:{interact:'E',aim:'RMB',fire:'LMB',jump:'SPACE',reload:'R',swap:'Q',cover:'C',sprint:'SHIFT',crew:'1 / 2 / 3',rap:'J / K / L',menu:'ESC',move:'W A S D'},controller:{interact:'ⓧ',aim:'LT',fire:'RT',jump:'Ⓐ',reload:'RB',swap:'Ⓨ',cover:'Ⓑ',sprint:'LB',crew:'D-PAD ← / ↑ / →',rap:'ⓧ / Ⓨ / Ⓑ',menu:'☰',move:'LEFT STICK'}};
export function deadzone(value,zone=.16){return Math.abs(value)<zone?0:Math.sign(value)*(Math.abs(value)-zone)/(1-zone);}
export class ActionInput{
 constructor(game){this.game=game;this.device='keyboard';this.previous=[];this.focus=0;this.textCache=new WeakMap();
  for(const type of ['keydown','mousemove','mousedown'])window.addEventListener(type,e=>{if(e.isTrusted)this.setDevice('keyboard');},true);
 }
 label(action){return LABELS[this.device][action]||action;}
 setDevice(device){if(device===this.device)return;if(this.device==='controller'){this.game.padMove=null;for(const code of ['KeyW','KeyA','KeyS','KeyD','ShiftLeft'])this.game.keys.delete(code);this.game.shooting=this.game.aiming=false;}this.device=device;document.body.dataset.input=device;this.prompts();}
 prompts(){document.querySelectorAll('[data-action]').forEach(el=>el.textContent=this.label(el.dataset.action));
  document.querySelectorAll('kbd').forEach(el=>{if(el.dataset.action)return;const raw=el.dataset.key||el.textContent;el.dataset.key=raw;if(this.device==='controller')el.textContent=raw==='C'?'Ⓑ':raw==='E'?'ⓧ':raw==='2'?'↑':raw==='3'?'→':raw==='1'?'←':raw;else el.textContent=raw;});
  for(const selector of ['#objective-description','#objective-count','#rap-feedback','#drive-help','#stance-status','.squad-panel .eyebrow span','.controls-note','#car-work-panel>.eyebrow','#car-work-panel>small','#toast small','#toast-text']){
   const el=document.querySelector(selector);if(!el)continue;const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node;
   while((node=walker.nextNode())){const old=this.textCache.get(node),raw=old&&node.nodeValue===old.last?old.raw:node.nodeValue;const value=formatPrompt(raw,this.device);if(node.nodeValue!==value)node.nodeValue=value;this.textCache.set(node,{raw,last:value});}
  }
  document.querySelectorAll('#interaction kbd').forEach(el=>{const reverse=Object.keys(LABELS.keyboard).find(k=>LABELS.keyboard[k]===el.textContent);if(reverse)el.textContent=this.label(reverse);else if(this.device==='controller'&&/^[123]$/.test(el.textContent))el.textContent={'1':'←','2':'↑','3':'→'}[el.textContent];});
 }
 key(code,down){window.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code}));}
 rumble(){try{this.pad?.vibrationActuator?.playEffect('dual-rumble',{duration:65,strongMagnitude:.2,weakMagnitude:.35})?.catch(()=>{});}catch{}}
 poll(dt){
  const pad=Array.from(navigator.getGamepads?.()||[]).find(p=>p?.connected);if(!pad){if(this.pad){this.game.padMove=null;this.game.shooting=this.game.aiming=false;this.setDevice('keyboard');}this.pad=null;return;}
  this.pad=pad;if(this.game.running)this.menuPanel=null;const buttons=pad.buttons.map(b=>b.pressed),axes=pad.axes.map(v=>deadzone(v));
  if(buttons.some((b,i)=>b&&!this.previous[i])||axes.some(v=>Math.abs(v)>.08))this.setDevice('controller');
  const edge=i=>buttons[i]&&!this.previous[i];const g=this.game;
  if(this.device==='controller'){
   if(!g.running){
    const panel=!document.querySelector('#pause-menu').classList.contains('hidden')?'#pause-menu':!document.querySelector('#result').classList.contains('hidden')?'#result':'#menu';
    if(this.menuPanel!==panel){this.menuPanel=panel;this.focus=0;}
    const items=Array.from(document.querySelectorAll(`${panel} button,${panel} select,${panel} input,${panel} summary`)).filter(el=>el.offsetParent!==null);
    if(edge(13)||edge(12)){this.focus=(this.focus+(edge(13)?1:items.length-1))%Math.max(1,items.length);items[this.focus]?.focus();}
    const focused=items[this.focus];if(focused?.tagName==='SELECT'&&(edge(14)||edge(15))){focused.selectedIndex=(focused.selectedIndex+(edge(15)?1:focused.options.length-1))%focused.options.length;focused.dispatchEvent(new Event('change'));}
    if(edge(0))items[this.focus]?.click();if(edge(9)&&g.started)document.querySelector('#resume').click();
   }else{
    g.padMove={x:axes[0]||0,z:axes[1]||0};
    g.yaw-=(axes[2]||0)*dt*(g.aiming?1.5:2.4);g.pitch=Math.max(-.85,Math.min(.65,g.pitch-(axes[3]||0)*dt*(g.aiming?1.1:1.8)));
    if(Math.abs(axes[2]||0)+Math.abs(axes[3]||0)>.05)g.lookHold=2;
    if(edge(9))this.key('Escape',true);
    if(g.carWork?.phase==='wire'){
     for(const [b,code]of [[12,'ArrowUp'],[13,'ArrowDown'],[14,'ArrowLeft'],[15,'ArrowRight'],[2,'KeyE'],[0,'Space']])if(edge(b))this.key(code,true);
    }else if(g.rap){for(const [b,code]of [[2,'KeyJ'],[3,'KeyK'],[1,'KeyL']])if(edge(b)){this.key(code,true);this.key(code,false);}}
    else{
     if(buttons[4])g.keys.add('ShiftLeft');else g.keys.delete('ShiftLeft');
     if(edge(8)){g.music.toggle();g.updateMusicUI();}if(edge(11))this.key('KeyN',true);
     for(const [b,code]of [[0,'Space'],[1,'KeyC'],[2,'KeyE'],[3,'KeyQ'],[5,'KeyR'],[14,'Digit1'],[12,'Digit2'],[15,'Digit3'],[13,'KeyF']]){if(edge(b))this.key(code,true);if(!buttons[b]&&this.previous[b])this.key(code,false);}
     if(buttons[4])g.keys.add('ShiftLeft');else g.keys.delete('ShiftLeft');
     g.shooting=Boolean(buttons[7]);g.aiming=Boolean(buttons[6]);
     if(!g.aiming)g.aimSession=null;
     if(g.driving&&g.active===2){for(const [code,value]of [['KeyW',axes[1]<-.2],['KeyS',axes[1]>.2],['KeyA',axes[0]<-.2],['KeyD',axes[0]>.2]]){if(value)g.keys.add(code);else g.keys.delete(code);}}
    }
   }
  }this.previous=buttons;
 }
}

export function formatPrompt(text,device){
 if(device!=='controller')return text;
 for(const [from,to]of [['1 / 2 / 3','D-PAD ← / ↑ / →'],['1–3','D-PAD'],['J / K / L','ⓧ / Ⓨ / Ⓑ'],['J/K/L','ⓧ/Ⓨ/Ⓑ'],['RMB','LT'],['LMB','RT'],['WASD','LEFT STICK'],['W / S','LEFT STICK ↑↓'],['A / D','LEFT STICK ←→'],['SHIFT','LB'],['SPACE','Ⓐ'],['ESC','☰'],['Hold E','Hold ⓧ'],['hold E','hold ⓧ'],['Press E','Press ⓧ'],['press E','press ⓧ'],['Press 2','D-pad ↑'],['Press 3','D-pad →'],['Press 1','D-pad ←'],['E to','ⓧ to'],['E exit','ⓧ exit'],['E near','ⓧ near'],['C CROUCH','Ⓑ CROUCH'],['C DUCK','Ⓑ DUCK'],['C LEAVE','Ⓑ LEAVE'],['Q SIDEARM','Ⓨ SIDEARM'],['R RELOAD','RB RELOAD'],['N NEXT','R-STICK CLICK NEXT']])text=text.replaceAll(from,to);
 return text;
}
