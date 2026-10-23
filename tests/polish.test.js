import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {acceleratedStep} from '../src/animation.js';
import {createBypass} from '../src/hotwire.js';
import {currentObjective} from '../src/navigation.js';
import {DELIVERY_JOBS} from '../src/street.js';
test('acceleration reaches responsive speed and release settles without a hard snap',()=>{
 const p={},forward=new THREE.Vector3(0,0,-1);let first;
 for(let i=0;i<30;i++){acceleratedStep(p,forward,5,1/60);if(i===0)first=p.moveVelocity.length();}
 assert(first>0&&first<2);assert(p.moveVelocity.length()>4.9);
 const before=p.moveVelocity.length();acceleratedStep(p,new THREE.Vector3(),5,1/60);assert(p.moveVelocity.length()>0&&p.moveVelocity.length()<before);
 for(let i=0;i<60;i++)acceleratedStep(p,new THREE.Vector3(),5,1/60);assert.equal(p.moveVelocity.length(),0);
});
test('rotating puzzle pool excludes the previous type',()=>{
 const game={};for(let i=0;i<20;i++){const previous=game.lastBypass,t=createBypass(game);assert.notEqual(t.type,previous);assert.ok(['circuit','grid','rotate','fuse'].includes(t.type));}
});
test('priority escape navigation follows destination while package jobs have distinct routes and rewards',()=>{
 const g={level:3,pursuit:{phase:'free'},player:{group:{position:new THREE.Vector3()}},street:{active:{name:'PRIORITY',phase:'escape',type:'target',destination:new THREE.Vector3(33,0,-31)}}};
 const o=currentObjective(g);assert.equal(o.label,'ESCAPE TO COMMERCE ROW');assert.equal(o.ring,true);assert.equal(o.position.x,33);assert.equal(o.owner,undefined);
 assert.deepEqual(DELIVERY_JOBS.map(j=>j.stops.length),[1,3,1]);assert.equal(DELIVERY_JOBS[0].encounter,'ambush');assert(DELIVERY_JOBS[0].cash>DELIVERY_JOBS[2].cash);
});
