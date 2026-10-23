import test from 'node:test';
import assert from 'node:assert/strict';
import {createGrid,gridStart,gridMove,createRotate,rotateSolved,rotateMask,rotateTile,createFuse,placeFuse,PUZZLE_TYPES,PUZZLE_INFO} from '../src/hotwire.js';
const seeded=seed=>()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
function solveGrid(t,i=0,used=new Set()){
  if(i===3)return [];const [a,b]=t.terminals[i];let found=null;
  const dfs=(cell,path)=>{if(found)return;if(cell===b){const rest=solveGrid(t,i+1,new Set([...used,...path]));if(rest)found=[path,...rest];return;}
    for(const n of [cell+1,cell-1,cell+4,cell-4]){if(n<0||n>15||Math.abs(n%4-cell%4)+Math.abs(Math.floor(n/4)-Math.floor(cell/4))!==1||path.includes(n)||used.has(n)||t.terminals.some((p,j)=>j!==i&&p.includes(n)))continue;dfs(n,[...path,n]);}};
  dfs(a,[a]);return found;
}
test('every hotwire puzzle is a visual logic puzzle with a one-sentence instruction',()=>{
  assert.deepEqual(PUZZLE_TYPES,['circuit','grid','rotate','fuse']);
  for(const type of PUZZLE_TYPES)assert.match(PUZZLE_INFO[type].instruction,/^[A-Z0-9 ⚡◉,]+$/);
});
test('wiring grids are always solvable through the drawing rules and wires cannot cross',()=>{
  for(let n=0;n<40;n++){
    const t=createGrid(seeded(n+1)),ends=t.terminals.flat();assert.equal(new Set(ends).size,6);
    const empty=[...Array(16).keys()].find(i=>!ends.includes(i));assert.equal(gridStart(t,empty),false);
    const solution=solveGrid(t);assert.ok(solution,'layout must be solvable');
    for(const path of solution){assert.equal(gridStart(t,path[0]),true);for(const cell of path.slice(1))assert.equal(gridMove(t,cell),true);}
    assert.equal(t.connected.length,3);
    // A wire may never enter a cell already used by another colour.
    gridStart(t,t.terminals[0][0]);const blocked=solution[1][1];
    if([1,-1,4,-4].includes(blocked-t.terminals[0][0]))assert.equal(gridMove(t,blocked),false);
  }
});
test('rotate circuits start unsolved and can be solved by rotating tiles',()=>{
  for(let n=0;n<8;n++){
    const t=createRotate(seeded(n+7));assert.equal(rotateSolved(t),false);
    const target=(function search(i,cur){if(i===9)return rotateSolved({...t,tiles:cur})?cur:null;let m=cur[i];for(let r=0;r<4;r++){const next=[...cur];next[i]=m;const res=search(i+1,next);if(res)return res;m=rotateMask(m);}return null;})(0,[...t.tiles]);
    assert.ok(target);let solved=false;
    for(let i=0;i<9;i++)while(t.tiles[i]!==target[i])solved=rotateTile(t,i);
    assert.equal(solved||rotateSolved(t),true);
  }
});
test('fuse routing rejects the decoy and wrong slots',()=>{
  const t=createFuse(seeded(3));
  const decoy=t.fuses.findIndex(f=>f.decoy),slotForDecoy=t.slots.findIndex(s=>s.shape===t.fuses[decoy].shape);
  t.selected=decoy;assert.equal(placeFuse(t,slotForDecoy),false);
  t.slots.forEach((s,i)=>{t.selected=t.fuses.findIndex(f=>!f.decoy&&f.shape===s.shape&&f.rating===s.rating);assert.equal(placeFuse(t,i),true);});
  assert.equal(t.connected.length,3);
});
