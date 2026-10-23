// Hotwire minigames: short, visual logic puzzles. These are abstract game
// mechanisms, not real vehicle procedures. Every puzzle works with mouse,
// keyboard and controller (D-pad = arrows, A = Space, X = E).
const COLORS=['AMBER','CYAN','VIOLET'],HEX={AMBER:'#ffc366',CYAN:'#67dfed',VIOLET:'#c2a1ff'};
export const PUZZLE_TYPES=['circuit','grid','rotate','fuse'];
export const PUZZLE_INFO={
 circuit:{title:'MATCH THE COLORS',instruction:'MATCH EACH COLOR ON THE LEFT TO THE SAME COLOR ON THE RIGHT'},
 grid:{title:'WIRING GRID',instruction:'CONNECT EACH COLOR WITHOUT CROSSING WIRES'},
 rotate:{title:'ROTATE THE CIRCUIT',instruction:'ROTATE TILES UNTIL POWER FLOWS FROM ⚡ TO ◉'},
 fuse:{title:'FUSE ROUTING',instruction:'PUT EACH FUSE IN THE SLOT WITH THE SAME SHAPE AND NUMBER'},
};
const shuffle=(list,random)=>{for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;};

// ── Circuit match (original puzzle) ──────────────────────────────────────────
export function createCircuit(random=Math.random){
 return {phase:'wire',type:'circuit',order:shuffle([...COLORS],random),connected:[],source:0,destination:0,selected:null,feedback:'Choose a left node, then its matching right node.',error:false};
}
export function connectCircuit(task,destination){
 if(task.selected===null)return false;
 const valid=COLORS[task.selected]===task.order[destination];
 if(valid&&!task.connected.includes(task.selected))task.connected.push(task.selected);
 task.error=!valid;task.feedback=valid?'CONNECTED · circuit stable':'WRONG CONNECTION · try another color';task.selected=null;return valid;
}

// ── 4×4 wiring grid: draw non-overlapping paths between matching terminals ──
const N=4,key=(r,c)=>r*N+c,adjacent=(a,b)=>Math.abs(Math.floor(a/N)-Math.floor(b/N))+Math.abs(a%N-b%N)===1;
// Built from three real non-overlapping paths, so every layout is solvable.
export function createGrid(random=Math.random){
 for(let attempt=0;attempt<200;attempt++){
  const used=new Set(),terminals=[];let ok=true;
  for(let color=0;color<3&&ok;color++){
   const free=[...Array(N*N).keys()].filter(i=>!used.has(i));let path=null;
   for(let tries=0;tries<30&&!path;tries++){
    const start=free[Math.floor(random()*free.length)],length=3+Math.floor(random()*3),cells=[start];
    while(cells.length<length){const last=cells.at(-1),next=[-N,N,-1,1].map(d=>last+d).filter(n=>n>=0&&n<N*N&&adjacent(last,n)&&!used.has(n)&&!cells.includes(n));if(!next.length)break;cells.push(next[Math.floor(random()*next.length)]);}
    const [a,b]=[cells[0],cells.at(-1)];
    if(cells.length===length&&Math.abs(Math.floor(a/N)-Math.floor(b/N))+Math.abs(a%N-b%N)>=2)path=cells;
   }
   if(!path){ok=false;break;}path.forEach(i=>used.add(i));terminals.push([path[0],path.at(-1)]);
  }
  if(ok)return{phase:'wire',type:'grid',terminals,paths:[[],[],[]],cursor:terminals[0][0],pen:null,connected:[],feedback:'Start on a colored dot and trace to its partner.',error:false};
 }
 throw Error('grid generation failed');
}
const terminalColor=(t,cell)=>t.terminals.findIndex(pair=>pair.includes(cell));
const pathOwner=(t,cell)=>t.paths.findIndex(p=>p.includes(cell));
function gridSolved(t){t.connected=t.paths.map((p,i)=>p.length>1&&t.terminals[i].every(e=>p.includes(e))?i:-1).filter(i=>i>=0);return t.connected.length===3;}
export function gridStart(t,cell){
 const color=terminalColor(t,cell);if(color<0){t.feedback='Start on a colored dot.';return false;}
 t.paths[color]=[cell];t.pen=color;t.cursor=cell;t.error=false;t.feedback=`Drawing ${COLORS[color]}`;gridSolved(t);return true;
}
export function gridMove(t,cell){
 if(t.pen===null){t.cursor=cell;return false;}
 const path=t.paths[t.pen],last=path.at(-1);
 if(!adjacent(last,cell))return false;
 const back=path.indexOf(cell);
 if(back>=0){path.length=back+1;t.cursor=cell;gridSolved(t);return true;}
 const terminal=terminalColor(t,cell),owner=pathOwner(t,cell);
 if(terminal>=0&&terminal!==t.pen||owner>=0&&owner!==t.pen){t.error=true;t.feedback='WIRES CANNOT CROSS · go around';return false;}
 path.push(cell);t.cursor=cell;t.error=false;
 if(terminal===t.pen&&cell!==path[0]){t.pen=null;t.feedback=gridSolved(t)?'ALL CONNECTED':`${COLORS[terminal]} CONNECTED`;}
 else gridSolved(t);
 return true;
}
export function gridEnd(t){t.pen=null;gridSolved(t);}

// ── Rotate circuit: 3×3 pipe tiles, power enters left and must exit right ──
const NORTH=1,EAST=2,SOUTH=4,WEST=8;
export const rotateMask=m=>((m<<1)|(m>>3))&15;
export function createRotate(random=Math.random){
 for(let attempt=0;attempt<100;attempt++){
  const startRow=Math.floor(random()*3);const cells=[[startRow,0]];const entry=[WEST];let r=startRow,c=0;const seen=new Set([key(r,c)]);
  while(c<2){const moves=[[0,1,EAST,WEST],[-1,0,NORTH,SOUTH],[1,0,SOUTH,NORTH]].filter(([dr,dc])=>r+dr>=0&&r+dr<3&&!seen.has(key(r+dr,c+dc)));const [dr,dc,out,back]=moves[Math.floor(random()*moves.length)];
   entry.push(back);cells.at(-1).push(out);r+=dr;c+=dc;seen.add(key(r,c));cells.push([r,c]);}
  cells.at(-1).push(EAST);
  const tiles=Array(9).fill(0);
  cells.forEach(([row,col,out],i)=>{tiles[row*3+col]=entry[i]|out;});
  for(let i=0;i<9;i++)if(!tiles[i])tiles[i]=[NORTH|SOUTH,NORTH|EAST,NORTH|EAST|SOUTH][Math.floor(random()*3)];
  const t={phase:'wire',type:'rotate',tiles,startRow,endRow:r,cursor:startRow*3,connected:[],powered:[],feedback:'Click or press Space to rotate a tile.',error:false};
  // Scramble, but never hand out an already-solved board.
  for(let i=0;i<9;i++){const turns=Math.floor(random()*4);for(let n=0;n<turns;n++)t.tiles[i]=rotateMask(t.tiles[i]);}
  if(!rotateSolved(t))return t;
 }
 throw Error('rotate generation failed');
}
export function rotateSolved(t){
 const powered=new Set(),queue=[];const start=t.startRow*3;
 if(t.tiles[start]&WEST){powered.add(start);queue.push(start);}
 while(queue.length){const i=queue.shift(),r=Math.floor(i/3),c=i%3,m=t.tiles[i];
  for(const [bit,dr,dc,opposite]of [[NORTH,-1,0,SOUTH],[EAST,0,1,WEST],[SOUTH,1,0,NORTH],[WEST,0,-1,EAST]]){
   const nr=r+dr,nc=c+dc,n=nr*3+nc;if(!(m&bit)||nr<0||nr>2||nc<0||nc>2||powered.has(n)||!(t.tiles[n]&opposite))continue;powered.add(n);queue.push(n);}}
 t.powered=[...powered];const end=t.endRow*3+2;const solved=powered.has(end)&&(t.tiles[end]&EAST)>0;
 t.connected=solved?[0,1,2]:[];return solved;
}
export function rotateTile(t,i){t.tiles[i]=rotateMask(t.tiles[i]);t.cursor=i;const solved=rotateSolved(t);t.error=false;t.feedback=solved?'POWER FLOWING':`${t.powered.length} of 9 tiles powered`;return solved;}

// ── Fuse routing: three slots, four fuses (one decoy) ───────────────────────
const SHAPES=['▲','●','■'];
export function createFuse(random=Math.random){
 const shapes=shuffle([...SHAPES],random),slots=shapes.map((shape,i)=>({shape,rating:1+Math.floor(random()*3),color:COLORS[i],filled:null}));
 const fuses=slots.map(s=>({shape:s.shape,rating:s.rating}));
 const decoySlot=slots[Math.floor(random()*3)];fuses.push({shape:decoySlot.shape,rating:decoySlot.rating%3+1,decoy:true});
 shuffle(fuses,random);
 return{phase:'wire',type:'fuse',slots,fuses,selected:null,source:0,destination:0,connected:[],feedback:'Pick a fuse, then the slot it fits.',error:false};
}
export function placeFuse(t,slot){
 if(t.selected===null){t.feedback='Pick a fuse first.';return false;}
 const fuse=t.fuses[t.selected],target=t.slots[slot];
 if(target.filled!==null||fuse.used){t.selected=null;return false;}
 const valid=fuse.shape===target.shape&&fuse.rating===target.rating;
 if(valid){target.filled=t.selected;fuse.used=true;t.connected=t.slots.map((s,i)=>s.filled!==null?i:-1).filter(i=>i>=0);}
 t.error=!valid;t.feedback=valid?(t.connected.length===3?'ALL FUSES SEATED':'FUSE SEATED'):'WRONG FUSE · shape and number must both match';t.selected=null;return valid;
}

export function createBypass(game){
 const allowed=PUZZLE_TYPES.filter(t=>t!==game.lastBypass);
 const type=game.nextPuzzleType||allowed[Math.floor(Math.random()*allowed.length)];game.nextPuzzleType=null;game.lastBypass=type;
 const t=type==='grid'?createGrid():type==='rotate'?createRotate():type==='fuse'?createFuse():createCircuit();t.timer=0;return t;
}

// Keyboard / controller input (controller buttons arrive as these codes).
export function circuitInput(game,code){
 const t=game.carWork;if(t?.phase!=='wire')return false;
 if(code==='Escape'){resetEntryPose(game);game.carWork=null;document.querySelector('#car-work-panel').classList.add('hidden');return true;}
 const dir={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]}[code];
 if(t.type==='grid'){
  if(dir){const r=Math.floor(t.cursor/N)+dir[0],c=t.cursor%N+dir[1];if(r>=0&&r<N&&c>=0&&c<N){const cell=key(r,c);if(t.pen===null)t.cursor=cell;else gridMove(t,cell);}}
  if(code==='Space'||code==='KeyE'){if(t.pen===null)gridStart(t,t.cursor);else gridEnd(t);}
  if(code==='KeyR'){t.paths=[[],[],[]];t.pen=null;t.connected=[];t.feedback='Cleared.';}
 }else if(t.type==='rotate'){
  if(dir){const r=Math.min(2,Math.max(0,Math.floor(t.cursor/3)+dir[0])),c=Math.min(2,Math.max(0,t.cursor%3+dir[1]));t.cursor=r*3+c;}
  if(code==='Space'||code==='KeyE')rotateTile(t,t.cursor);
 }else if(t.type==='fuse'){
  if(code==='ArrowUp')t.source=(t.source+3)%4;if(code==='ArrowDown')t.source=(t.source+1)%4;
  if(code==='ArrowLeft')t.destination=(t.destination+2)%3;if(code==='ArrowRight')t.destination=(t.destination+1)%3;
  if(/^Digit[1-4]$/.test(code))t.selected=Number(code.slice(-1))-1;
  if(code==='KeyE')t.selected=t.source;
  if(['KeyJ','KeyK','KeyL'].includes(code))placeFuse(t,['KeyJ','KeyK','KeyL'].indexOf(code));
  if(code==='Space')placeFuse(t,t.destination);
 }else{
  if(code==='ArrowUp')t.source=(t.source+2)%3;
  if(code==='ArrowDown')t.source=(t.source+1)%3;
  if(code==='ArrowLeft')t.destination=(t.destination+2)%3;
  if(code==='ArrowRight')t.destination=(t.destination+1)%3;
  if(['Digit1','Digit2','Digit3'].includes(code))t.selected=Number(code.slice(-1))-1;
  if(['KeyJ','KeyK','KeyL'].includes(code))connectCircuit(t,['KeyJ','KeyK','KeyL'].indexOf(code));
  if(code==='KeyE')t.selected=t.source;
  if(code==='Space')connectCircuit(t,t.destination);
 }
 renderCircuit(game);return true;
}
// Pointer actions are routed through here so co-op guests can forward them.
export function puzzleAction(game,action,a=0,b=0){
 const t=game.carWork;if(t?.phase!=='wire')return;
 if(action==='node'){if(t.type==='circuit')t.selected=a;else if(t.type==='fuse'){if(!t.fuses[a].used)t.selected=a;}}
 if(action==='slot'){if(t.type==='circuit')connectCircuit(t,a);else if(t.type==='fuse')placeFuse(t,a);}
 if(action==='rotate')rotateTile(t,a);
 if(action==='down')gridStart(t,a);
 if(action==='enter'&&t.pen!==null)gridMove(t,a);
 if(action==='up')gridEnd(t);
 renderCircuit(game);
}
function send(game,action,a,b){if(game.net?.guest)game.net.commands.push(`Puzzle:${action}:${a??0}:${b??0}`);else puzzleAction(game,action,a,b);}
const PIPE={[NORTH]:'M30 30V0',[EAST]:'M30 30H60',[SOUTH]:'M30 30V60',[WEST]:'M30 30H0'};
export function renderCircuit(game){
 const t=game.carWork;if(t?.phase!=='wire')return;
 const box=document.querySelector('#wire-puzzle');box.classList.remove('hidden');
 const pad=game.input?.device==='controller',info=PUZZLE_INFO[t.type]||PUZZLE_INFO.circuit;
 const status=`<p class="${t.error?'failure':'success'}">${t.feedback} · ${t.connected.length}/3</p>`;
 const head=`<p class="puzzle-instruction">${info.instruction}</p>`;
 let body='',help='';
 if(t.type==='grid'){
  body=`<div class="wire-grid" style="--n:${N}">${[...Array(N*N).keys()].map(i=>{const term=terminalColor(t,i),owner=pathOwner(t,i),color=COLORS[term>=0?term:owner];
   const path=owner>=0?t.paths[owner]:null,idx=path?path.indexOf(i):-1,links=path?[path[idx-1],path[idx+1]].filter(n=>n!==undefined).map(n=>n===i-N?'n':n===i+N?'s':n===i-1?'w':'e').join(''):'';
   return `<button data-cell="${i}" class="cell ${term>=0?'terminal':''} ${owner>=0?'wired':''} ${t.cursor===i?'focused':''} ${links.split('').map(l=>'link-'+l).join(' ')}" style="--wire:${color?HEX[color]:'transparent'}"></button>`;}).join('')}</div>`;
  help=pad?'D-PAD MOVE · Ⓐ START / STOP A WIRE':'DRAG FROM A DOT · or ARROWS + SPACE · R CLEAR';
 }else if(t.type==='rotate'){
  body=`<div class="rotate-grid"><span class="power-in" style="--row:${t.startRow}">⚡</span>${t.tiles.map((m,i)=>`<button data-tile="${i}" class="tile ${t.powered.includes(i)?'powered':''} ${t.cursor===i?'focused':''}"><svg viewBox="0 0 60 60">${[NORTH,EAST,SOUTH,WEST].filter(b=>m&b).map(b=>`<path d="${PIPE[b]}"/>`).join('')}<circle cx="30" cy="30" r="5"/></svg></button>`).join('')}<span class="power-out" style="--row:${t.endRow}">◉</span></div>`;
  help=pad?'D-PAD SELECT · Ⓐ ROTATE':'CLICK A TILE · or ARROWS + SPACE TO ROTATE';
 }else if(t.type==='fuse'){
  body=`<div class="fuse-board"><div>${t.fuses.map((f,i)=>`<button data-fuse="${i}" class="fuse ${f.used?'used':''} ${t.selected===i?'selected':''} ${t.source===i?'focused':''}">${f.shape} <b>${f.rating}</b><small>${pad?'':i+1}</small></button>`).join('')}</div><b>→</b><div>${t.slots.map((s,i)=>`<button data-slot="${i}" class="slot ${s.filled!==null?'connected':''} ${t.destination===i?'focused':''}" style="--wire:${HEX[s.color]}">${s.shape} <b>${s.rating}</b><small>${pad?'':['J','K','L'][i]}</small></button>`).join('')}</div></div>`;
  help=pad?'D-PAD ↑↓ FUSE · ←→ SLOT · ⓧ PICK · Ⓐ PLACE':'CLICK A FUSE, THEN A SLOT · or 1–4 then J / K / L';
 }else{
  const row=(color,i,left)=>`<button data-wire-side="${left?'left':'right'}" data-wire="${i}" class="wire-node ${t.connected.includes(left?i:COLORS.indexOf(color))?'connected':''} ${(left?t.source:t.destination)===i?'focused':''} ${left&&t.selected===i?'selected':''}" style="--wire:${HEX[color]}">${color} <small>${left?i+1:['J','K','L'][i]}</small></button>`;
  body=`<div class="wire-columns"><div>${COLORS.map((c,i)=>row(c,i,true)).join('')}</div><b>→</b><div>${t.order.map((c,i)=>row(c,i,false)).join('')}</div></div>`;
  help=pad?'D-PAD ↑↓ LEFT NODE · ←→ RIGHT NODE · ⓧ SELECT · Ⓐ CONNECT':'1 / 2 / 3 LEFT NODE → J / K / L MATCHING RIGHT NODE · or click nodes';
 }
 box.innerHTML=`${head}${body}${status}<small>${help}</small>`;
 box.querySelectorAll('[data-wire]').forEach(b=>b.onclick=()=>send(game,b.dataset.wireSide==='left'?'node':'slot',Number(b.dataset.wire)));
 box.querySelectorAll('[data-fuse]').forEach(b=>b.onclick=()=>send(game,'node',Number(b.dataset.fuse)));
 box.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>send(game,'slot',Number(b.dataset.slot)));
 box.querySelectorAll('[data-tile]').forEach(b=>b.onclick=()=>send(game,'rotate',Number(b.dataset.tile)));
 box.querySelectorAll('[data-cell]').forEach(b=>{const i=Number(b.dataset.cell);b.onpointerdown=e=>{e.preventDefault();send(game,'down',i);};b.onpointerenter=e=>{if(e.buttons&1)send(game,'enter',i);};});
 box.onpointerup=()=>{if(t.type==='grid'&&t.pen!==null)send(game,'up');};
}
export function resetEntryPose(game){const p=game.characters[2];p.legs.forEach(l=>l.visible=true);p.leftArm.rotation.x=0;p.body.rotation.x=0;}
