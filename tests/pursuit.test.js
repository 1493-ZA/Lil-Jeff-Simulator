import test from 'node:test';
import assert from 'node:assert/strict';
import {pursuitCleared,studioComplete,PURSUIT_TOTAL,STUDIO_THRESHOLD,STUDIO_FLOWS,studioNoteTime,STUDIO_TURN} from '../src/pursuit.js';
test('chase cannot end until all six police cars have arrived and are disabled',()=>{
 const state={spawned:2,cops:[{disabled:true},{disabled:true}]};assert.equal(pursuitCleared(state),false);
 state.spawned=PURSUIT_TOTAL;state.cops.push({disabled:false},{disabled:true},{disabled:true},{disabled:true});assert.equal(pursuitCleared(state),false);
 state.cops[2].disabled=true;assert.equal(pursuitCleared(state),true);
});
test('studio threshold alone cannot skip a crew member’s verse',()=>{
 const s={credEarned:STUDIO_THRESHOLD,completed:[true,true,false]};assert.equal(studioComplete(s),false);
 s.completed[2]=true;assert.equal(studioComplete(s),true);
 s.credEarned--;assert.equal(studioComplete(s),false);
});
test('each flow has eight ordered notes inside the same continuous beat turn',()=>{
 for(let t=0;t<3;t++){const times=STUDIO_FLOWS[t].map((_,i)=>studioNoteTime(i,t));assert.equal(times.length,8);assert.ok(times.every((n,i)=>n>=(times[i-1]??0)&&n<STUDIO_TURN));}
 assert.notDeepEqual(STUDIO_FLOWS[0],STUDIO_FLOWS[1]);assert.notDeepEqual(STUDIO_FLOWS[1],STUDIO_FLOWS[2]);
});
