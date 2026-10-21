import test from 'node:test';
import assert from 'node:assert/strict';
import { combatTarget, createRap, judgeRap, beatTime, RAP_PATTERN, advanceCar } from '../src/mission.js';

test('Draco must have at least three takedowns and lead both other characters', () => {
  assert.equal(combatTarget([0,0,0]),3);
  assert.equal(combatTarget([2,4,1]),5);
  assert.equal(combatTarget([3,0,3]),4);
});

test('rap rewards timed correct inputs once per note and rejects off-beat spam', () => {
  const rap=createRap();
  assert.equal(judgeRap(rap,'KeyJ'),false);
  RAP_PATTERN.forEach((key,i)=>{
    rap.time=beatTime(i);
    assert.equal(judgeRap(rap,key),true);
    assert.equal(judgeRap(rap,key),false);
  });
  assert.equal(rap.hits,8);
});

test('a wrong rap key consumes that note and cannot be corrected by mashing', () => {
  const rap=createRap();
  rap.time=beatTime(0);
  assert.equal(judgeRap(rap,'KeyL'),false);
  assert.equal(judgeRap(rap,'KeyJ'),false);
  assert.equal(rap.hits,0);
});

test('car accelerates, steers with momentum, brakes, and reverses', () => {
  const car={speed:0,yaw:0};
  for(let i=0;i<120;i++) advanceCar(car,{forward:true},1/60);
  assert.ok(car.speed>10 && car.speed<=18);
  const original=car.speed;
  const movement=advanceCar(car,{forward:true,left:true},.1);
  assert.ok(car.yaw>0 && movement.x<0 && movement.z<0);
  for(let i=0;i<60;i++) advanceCar(car,{brake:true},1/60);
  assert.ok(car.speed<original*.1);
  for(let i=0;i<60;i++) advanceCar(car,{backward:true},1/60);
  assert.ok(car.speed<0 && car.speed>=-7);
});
