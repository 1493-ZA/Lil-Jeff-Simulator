import test from 'node:test';
import assert from 'node:assert/strict';
import { missionOneCleared, crewAtPoint, CLAIM_POINTS, waveCount } from '../src/campaign.js';

test('Mission 1 cannot end with any surviving opp or before car/ambush tasks',()=>{
  const g={level:1,stage:2,ambushStarted:true,car:{lockState:'ready'},enemies:[{health:0,driveBy:true},{health:1}]};
  assert.equal(missionOneCleared(g),false);
  g.enemies[1].health=0;assert.equal(missionOneCleared(g),true);
  g.ambushStarted=false;assert.equal(missionOneCleared(g),false);
  g.ambushStarted=true;g.car.lockState='opened';assert.equal(missionOneCleared(g),false);
});

test('claim checkpoints require every crew member in the capture zone',()=>{
  const crew=[-4,0,4].map(x=>({health:125,group:{position:{x,z:-3}}}));
  assert.equal(crewAtPoint(crew,-3),true);
  crew[2].group.position.z=12;assert.equal(crewAtPoint(crew,-3),false);
  crew[2].group.position.z=-3;crew[1].health=0;assert.equal(crewAtPoint(crew,-3),false);
});

test('four claim waves have escalating body requirements; past/future kills do not count',()=>{
  assert.deepEqual(CLAIM_POINTS.map(p=>p.quota),[6,8,10,12]);
  const g={claim:{point:1},enemies:[{claimWave:0,health:0},{claimWave:1,health:0},{claimWave:1,health:90},{claimWave:2,health:0}]};
  assert.equal(waveCount(g),1);
});
