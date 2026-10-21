export function createCircuit(random=Math.random){
 const order=['AMBER','CYAN','VIOLET'];for(let i=2;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
 return {phase:'wire',order,connected:[],source:0,destination:0,selected:null,feedback:'Match each color. Choose a left node, then a right node.',error:false};
}
export function connectCircuit(task,destination){
 if(task.selected===null)return false;
 const valid=['AMBER','CYAN','VIOLET'][task.selected]===task.order[destination];
 if(valid&&!task.connected.includes(task.selected))task.connected.push(task.selected);
 task.error=!valid;task.feedback=valid?'CONNECTED · circuit stable':'WRONG CONNECTION · try another color';task.selected=null;return valid;
}
export function circuitInput(game,code){
 const t=game.carWork;if(t?.phase!=='wire')return false;
 if(code==='Escape'){resetEntryPose(game);game.carWork=null;document.querySelector('#car-work-panel').classList.add('hidden');return true;}
 if(t.type==='sequence'||t.type==='timing'){
  const keys=['Digit1','Digit2','Digit3','KeyJ','KeyK','KeyL'];
  if(keys.includes(code))puzzleInput(t,keys.indexOf(code)%3);
  if(code==='KeyE'||code==='Space')puzzleInput(t,t.source);
  if(code==='ArrowUp'||code==='ArrowLeft')t.source=(t.source+2)%3;
  if(code==='ArrowDown'||code==='ArrowRight')t.source=(t.source+1)%3;
  renderCircuit(game);return true;
 }
 if(code==='ArrowUp')t.source=(t.source+2)%3;
 if(code==='ArrowDown')t.source=(t.source+1)%3;
 if(code==='ArrowLeft')t.destination=(t.destination+2)%3;
 if(code==='ArrowRight')t.destination=(t.destination+1)%3;
 if(['Digit1','Digit2','Digit3'].includes(code))t.selected=Number(code.slice(-1))-1;
 if(['KeyJ','KeyK','KeyL'].includes(code))connectCircuit(t,['KeyJ','KeyK','KeyL'].indexOf(code));
 if(code==='KeyE')t.selected=t.source;
 if(code==='Space')connectCircuit(t,t.destination);
 renderCircuit(game);return true;
}
export function renderCircuit(game){
 const t=game.carWork;if(t?.phase!=='wire')return;
 const box=document.querySelector('#wire-puzzle');box.classList.remove('hidden');
 if(t.type==='sequence'||t.type==='timing'){
  const sequence=t.timer<1.8?t.sequence.map(n=>['AMBER','CYAN','VIOLET'][n]).join(' → '):'REPEAT THE SEQUENCE';
  const content=t.type==='sequence'?`<p class="sequence-display">${sequence}</p><div class="pulse-buttons">${['AMBER','CYAN','VIOLET'].map((n,i)=>`<button data-pulse="${i}" class="${t.source===i?'focused':''}">${n} · ${i+1}</button>`).join('')}</div>`:`<div class="timing-track"><i style="left:${(t.timer*.65)%1*100}%"></i><b></b></div><button data-pulse="0">SPACE / A · LOCK PULSE</button>`;
  box.innerHTML=`${content}<p class="${t.error?'failure':'success'}">${t.feedback} · ${t.connected.length}/3</p><small>${game.input?.device==='controller'?'D-PAD CHOOSE · X / A SUBMIT':'1 / 2 / 3 or J / K / L · SPACE FOR TIMING'}</small>`;
  box.querySelectorAll('[data-pulse]').forEach(b=>b.onclick=()=>{puzzleInput(t,Number(b.dataset.pulse));renderCircuit(game);});return;
 }
 const row=(color,i,left)=>`<button data-wire-side="${left?'left':'right'}" data-wire="${i}" class="wire-node ${t.connected.includes(left?i:['AMBER','CYAN','VIOLET'].indexOf(color))?'connected':''} ${(left?t.source:t.destination)===i?'focused':''} ${left&&t.selected===i?'selected':''}" style="--wire:${{AMBER:'#ffc366',CYAN:'#67dfed',VIOLET:'#c2a1ff'}[color]}">${color} <small>${left?i+1:['J','K','L'][i]}</small></button>`;
 box.innerHTML=`<div class="wire-columns"><div>${['AMBER','CYAN','VIOLET'].map((c,i)=>row(c,i,true)).join('')}</div><b>→</b><div>${t.order.map((c,i)=>row(c,i,false)).join('')}</div></div><p class="${t.error?'failure':'success'}">${t.feedback}</p><small>${game.input?.device==='controller'?'D-PAD ↑↓ LEFT NODE · ←→ RIGHT NODE · X SELECT · A CONNECT':'1 / 2 / 3 LEFT NODE → J / K / L MATCHING RIGHT NODE · or click nodes'}</small>`;
 box.querySelectorAll('button').forEach(b=>b.onclick=()=>{if(b.dataset.wireSide==='left')t.selected=Number(b.dataset.wire);else connectCircuit(t,Number(b.dataset.wire));renderCircuit(game);});
}

export const PUZZLE_TYPES=['circuit','sequence','timing'];
export function createBypass(game){
 const allowed=PUZZLE_TYPES.filter(t=>t!==game.lastBypass);
 const type=game.nextPuzzleType||allowed[Math.floor(Math.random()*allowed.length)];game.nextPuzzleType=null;game.lastBypass=type;
 const t=createCircuit();t.type=type;t.timer=0;t.sequence=[0,1,2];for(let i=2;i>0;i--){const j=Math.floor(Math.random()*(i+1));[t.sequence[i],t.sequence[j]]=[t.sequence[j],t.sequence[i]];}t.cursor=0;t.feedback=type==='sequence'?'Watch the pulse sequence, then repeat it.':type==='timing'?'Stop the pulse inside the green zone three times.':t.feedback;return t;
}
export function puzzleInput(task,index){
 if(task.connected.length>=3)return false;
 if(task.type==='sequence'){
  if(task.timer<1.8){task.feedback='Watch first. Repeat after the countdown.';return false;}
  if(index===task.sequence[task.cursor]){task.connected.push(task.cursor++);task.error=false;task.feedback='VALID PULSE';}
  else {task.connected=[];task.cursor=0;task.error=true;task.feedback='SEQUENCE RESET · try again';}return true;
 }
 if(task.type==='timing'){
  const cycle=Math.floor(task.timer*.65),value=(task.timer*.65)%1;
  if(task.lastCycle===cycle){task.feedback='WAIT FOR THE NEXT PULSE';return false;}
  task.lastCycle=cycle;const valid=value>=.35&&value<=.65;task.error=!valid;
  if(valid)task.connected.push(task.connected.length);else task.connected=[];
  task.feedback=valid?'PULSE LOCKED':'MISSED ZONE · locks reset';return true;
 }
 return false;
}
export function resetEntryPose(game){const p=game.characters[2];p.legs.forEach(l=>l.visible=true);p.leftArm.rotation.x=0;p.body.rotation.x=0;}
