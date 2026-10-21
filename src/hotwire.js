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
 if(code==='Escape'){game.carWork=null;document.querySelector('#car-work-panel').classList.add('hidden');return true;}
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
 const row=(color,i,left)=>`<button data-wire-side="${left?'left':'right'}" data-wire="${i}" class="wire-node ${t.connected.includes(left?i:['AMBER','CYAN','VIOLET'].indexOf(color))?'connected':''} ${(left?t.source:t.destination)===i?'focused':''} ${left&&t.selected===i?'selected':''}" style="--wire:${{AMBER:'#ffc366',CYAN:'#67dfed',VIOLET:'#c2a1ff'}[color]}">${color} <small>${left?i+1:['J','K','L'][i]}</small></button>`;
 box.innerHTML=`<div class="wire-columns"><div>${['AMBER','CYAN','VIOLET'].map((c,i)=>row(c,i,true)).join('')}</div><b>→</b><div>${t.order.map((c,i)=>row(c,i,false)).join('')}</div></div><p class="${t.error?'failure':'success'}">${t.feedback}</p><small>${game.input?.device==='controller'?'D-PAD ↑↓ LEFT NODE · ←→ RIGHT NODE · X SELECT · A CONNECT':'1 / 2 / 3 LEFT NODE → J / K / L MATCHING RIGHT NODE · or click nodes'}</small>`;
 box.querySelectorAll('button').forEach(b=>b.onclick=()=>{if(b.dataset.wireSide==='left')t.selected=Number(b.dataset.wire);else connectCircuit(t,Number(b.dataset.wire));renderCircuit(game);});
}
