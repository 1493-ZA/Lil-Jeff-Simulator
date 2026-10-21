import test from 'node:test';
import assert from 'node:assert/strict';
import {ENEMY_HEALTH,hitLocation,woundDamage,WEAPONS} from '../src/combat.js';
test('all street, named and checkpoint opps have reduced health',()=>{
 assert.equal(ENEMY_HEALTH.street,50);assert.equal(ENEMY_HEALTH.static,90);assert.equal(ENEMY_HEALTH.ambush,40);
 assert.deepEqual([0,1,2,3].map(i=>ENEMY_HEALTH.claimBase+i*ENEMY_HEALTH.claimStep),[45,50,55,60]);
 assert.equal(ENEMY_HEALTH.switchback,80);assert.equal(ENEMY_HEALTH.vex,100);
});
test('real impact height determines ordered damage zones and preserves range/support penalties',()=>{
 const heights=[1.9,1.5,.95,.7,.4,.1],zones=['head','chest','abdomen','pelvis','leg','foot'];
 assert.deepEqual(heights.map(hitLocation),zones);
 const damage=zones.map(z=>woundDamage(24,z));assert.ok(damage.every((n,i)=>i===0||damage[i-1]>n));
 assert.equal(woundDamage(24,'head'),60);assert.equal(woundDamage(24,'chest',.5,true),24*1.35*.5*.18);
 assert.ok(woundDamage(WEAPONS.draco.damage,'head')>=ENEMY_HEALTH.claimBase);
});
