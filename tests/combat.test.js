import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoadout, fireRound, reload, needsReload, WEAPONS } from '../src/combat.js';

test('every character receives the specified primary and common sidearm', () => {
  for (const id of ['draco', 'arp', 'akimbo']) {
    const [primary, sidearm] = createLoadout(id);
    assert.equal(primary.spares, WEAPONS[id].spares);
    assert.deepEqual(primary.rounds, Array(WEAPONS[id].barrels).fill(WEAPONS[id].capacity));
    assert.deepEqual(sidearm.rounds, [30]);
    assert.equal(sidearm.spares, 5);
  }
});

test('akimbo alternates hands, exhausts 100 rounds, and consumes two of six spare drums per full reload', () => {
  const state = createLoadout('akimbo')[0];
  for (let shot = 0; shot < 100; shot++) assert.equal(fireRound(state), shot % 2);
  assert.equal(fireRound(state), -1);
  assert.deepEqual(state.rounds, [0, 0]);
  reload(state);
  assert.deepEqual(state.rounds, [50, 50]);
  assert.equal(state.spares, 4);
});

test('reload never creates ammunition when no spares remain', () => {
  const state = createLoadout('switch')[1];
  state.spares = 0;
  state.rounds[0] = 3;
  assert.equal(needsReload(state), false);
  reload(state);
  assert.deepEqual(state.rounds, [3]);
});

test('a driver can empty one akimbo pistol without firing the steering hand',()=>{
  const state=createLoadout('akimbo')[0];
  for(let i=0;i<50;i++)assert.equal(fireRound(state,0),0);
  assert.equal(fireRound(state,0),-1);
  assert.deepEqual(state.rounds,[0,50]);
  reload(state);
  assert.deepEqual(state.rounds,[50,50]);
  assert.equal(state.spares,5);
});

test('partial reload discards the old magazine and consumes one spare', () => {
  const state = createLoadout('arp')[0];
  fireRound(state);
  assert.equal(needsReload(state), true);
  reload(state);
  assert.equal(state.rounds[0], 50);
  assert.equal(state.spares, 5);
  assert.equal(needsReload(state), false);
  reload(state);
  assert.equal(state.spares, 5);
});
