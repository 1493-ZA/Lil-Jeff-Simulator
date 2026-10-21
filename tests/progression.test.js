import test from 'node:test';
import assert from 'node:assert/strict';
import { readCharges, awardCharge, narrationDuration, XP_REWARDS } from '../src/progression.js';

test('kill and task XP fills a character meter once, with no overflow',()=>{
  const p={xp:0};
  for(let i=0;i<3;i++)assert.equal(awardCharge(p,XP_REWARDS.kill),false);
  assert.equal(p.xp,60);
  assert.equal(awardCharge(p,XP_REWARDS.combat),true);
  assert.equal(p.xp,100);
  assert.equal(awardCharge(p,20),false);
  assert.equal(p.xp,100);
});

test('saved charges tolerate malformed, unavailable, and out-of-range storage',()=>{
  assert.deepEqual(readCharges({getItem:()=>'[40,200,-10]'}),[40,100,0]);
  assert.deepEqual(readCharges({getItem:()=>'{broken'}),[0,0,0]);
  assert.deepEqual(readCharges({getItem:()=>{throw Error('disabled')}}),[0,0,0]);
  assert.deepEqual(readCharges({getItem:()=>'[null,"20",5.6]'}),[0,0,5]);
});

test('slow-reader narration stays at least twelve seconds and scales with word count',()=>{
  assert.equal(narrationDuration('Stay close.'),12);
  assert.ok(narrationDuration(Array(30).fill('word').join(' '))>20);
  assert.ok(narrationDuration(Array(100).fill('word').join(' '))<=35);
});
