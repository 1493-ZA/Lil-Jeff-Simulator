import { test, expect } from '@playwright/test';

async function enter(page) {
  await page.goto('/?test=1&quality=low');
  await page.waitForFunction(() => !!window.__game);
  await page.locator('#start').click();
  await page.waitForFunction(() => window.__game.running);
}

test('renders Enter CHIRAQ and supports movement, airborne shooting, slide, switching, draw and reload', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?test=1&quality=low');
  await expect(page.locator('h1').first()).toContainText('CHIRAQ');
  await page.waitForFunction(() => !!window.__game);
  await page.screenshot({ path: 'test-results/chiraq-menu.png' });
  await page.locator('#start').click();
  // Isolate controls from combat randomness; actual combat is exercised below.
  await page.evaluate(() => { window.__game.reinforcementTimer=Infinity; window.__game.enemies.forEach(e => { e.health = 0; e.group.visible = false; }); });
  const before = await page.evaluate(() => window.__game.player.group.position.z);
  await page.keyboard.down('KeyW');
  await page.waitForFunction(before => window.__game.player.group.position.z < before - 1.5, before);
  await page.keyboard.up('KeyW');
  expect(await page.evaluate(() => window.__game.player.group.position.z)).toBeLessThan(before - 1);
  await page.waitForFunction(() => window.__game.player.draw === 0);
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__game.player.group.position.y > .5);
  await page.mouse.down();
  await page.waitForFunction(() => window.__game.shots > 0 && !window.__game.player.grounded);
  await page.mouse.up();
  expect(await page.evaluate(() => window.__game.shots)).toBeGreaterThan(0);
  await page.waitForFunction(() => window.__game.player.grounded);
  await page.keyboard.press('KeyC');
  await page.waitForFunction(() => window.__game.player.slide > .1 && window.__game.player.legs.every(leg=>leg.rotation.x>1.1));
  expect(await page.evaluate(()=>window.__game.player.legs.every(leg=>leg.rotation.x>1.1))).toBe(true);
  expect(await page.evaluate(()=>window.__game.player.body.rotation.x)).toBeGreaterThan(0);
  const fired = await page.evaluate(() => window.__game.shots);
  await page.mouse.down();
  await page.waitForFunction(fired => window.__game.shots > fired && window.__game.player.slide > 0, fired);
  await page.mouse.up();
  expect(await page.evaluate(() => window.__game.shots)).toBeGreaterThan(fired);
  await page.keyboard.press('Digit2');
  expect(await page.evaluate(() => window.__game.characters[0].slide)).toBe(0);
  expect(await page.evaluate(() => window.__game.characters[0].body.position.y)).toBe(0);
  await expect(page.locator('#weapon-name')).toHaveText('AR-P');
  await expect(page.locator('#weapon-status')).toContainText('DRAWING');
  await page.waitForFunction(() => window.__game.player.draw === 0);
  await page.keyboard.press('KeyQ');
  await expect(page.locator('#weapon-name')).toHaveText('GLOCK WITH SWITCH');
  await page.waitForFunction(() => window.__game.player.draw === 0);
  const sidearmShots = await page.evaluate(() => window.__game.shots);
  await page.mouse.down();
  await page.waitForFunction(before => window.__game.shots > before, sidearmShots);
  await page.mouse.up();
  await page.keyboard.press('KeyR');
  await expect(page.locator('#weapon-status')).toContainText('RELOADING');
  await expect(page.locator('#ammo')).toHaveText('30', { timeout: 10000 });
  await expect(page.locator('#spares')).toHaveText('4');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => window.__game.player.group.position.y > .4);
  const oldPosition = await page.evaluate(() => ({ x: window.__game.player.group.position.x, z: window.__game.player.group.position.z }));
  await page.keyboard.press('Digit3');
  await page.waitForFunction(() => window.__game.characters[1].grounded);
  expect(await page.evaluate(old => Math.hypot(window.__game.characters[1].group.position.x-old.x,window.__game.characters[1].group.position.z-old.z),oldPosition)).toBeLessThan(8);
  expect(await page.evaluate(() => window.__game.characters[1].loadout[1].rounds[0])).toBe(30);
  await page.screenshot({ path: 'test-results/chiraq-gameplay.png' });
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause-menu')).toBeVisible();
  expect(await page.evaluate(() => window.__game.running)).toBe(false);
  expect(errors).toEqual([]);
});

test('muzzle rays damage targets, respect cover, and do not snap to camera yaw', async ({ page }) => {
  await enter(page);
  const result = await page.evaluate(() => {
    const game = window.__game;
    game.running = false;
    const p = game.player;
    p.group.position.set(-.4, 0, 0);
    p.group.rotation.set(0, 0, 0);
    p.arms.rotation.set(0, 0, 0);
    p.body.position.y = 0;
    p.body.rotation.x = 0;
    p.draw = 0;
    game.yaw = Math.PI / 2;
    const target = game.enemies[0];
    target.group.position.set(0, 0, -5);
    game.enemies.slice(1).forEach(enemy => enemy.health = 0);
    const start = target.health;
    game.shoot(p);
    const damaged = target.health;
    game.box(4, 4, .5, '#666666', 0, 2, -2.5, { solid: true });
    game.shoot(p);
    const covered=target.health;
    game.active=2;
    const z=game.player;
    game.shoot(z);
    const first={rounds:[...z.loadout[0].rounds],flash:z.guns.map(g=>g.flash.visible),recoil:z.guns.map(g=>g.recoil)};
    game.shoot(z);
    return { start, damaged, covered, first, second:[...z.loadout[0].rounds] };
  });
  expect(result.damaged).toBeLessThan(result.start);
  expect(result.covered).toBe(result.damaged);
  expect(result.first.rounds).toEqual([49,50]);
  expect(result.first.flash).toEqual([true,false]);
  expect(result.first.recoil[0]).toBeGreaterThan(0);
  expect(result.first.recoil[1]).toBe(0);
  expect(result.second).toEqual([49,49]);
});

test('pause, resume, and return to main menu reset a run without reloading', async ({ page }) => {
  await enter(page);
  await page.evaluate(() => {
    const g=window.__game;
    g.enemies.forEach(e => e.cooldown=Infinity);
    g.player.loadout[0].rounds[0]=17;
    g.player.health=43;
    g.player.kills=2;
  });
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause-menu')).toBeVisible();
  const time=await page.evaluate(()=>window.__game.elapsed);
  await page.waitForTimeout(300);
  expect(await page.evaluate(()=>window.__game.elapsed)).toBe(time);
  await page.locator('#resume').click();
  await page.waitForFunction(()=>window.__game.running);
  await page.keyboard.press('Escape');
  await page.locator('#quit').click();
  await expect(page.locator('#menu')).toBeVisible();
  await expect(page.locator('#pause-menu')).toBeHidden();
  expect(await page.evaluate(()=>({running:__game.running,started:__game.started,stage:__game.stage,ammo:__game.player.loadout[0].rounds[0],health:__game.player.health,kills:__game.player.kills}))).toEqual({running:false,started:false,stage:0,ammo:100,health:100,kills:0});
  await page.locator('#start').click();
  await page.waitForFunction(()=>window.__game.running);
  expect(await page.evaluate(()=>window.__game.player.guns[0].group.name)).toBe('weapon-draco');
  expect(await page.evaluate(()=>window.__game.characters.map(p=>p.hair?.name || 'original hair'))).toEqual(['shoulder-length loose locs','original hair','tied crown locs with violet tips']);
});

test('personal story requires Draco takedowns, timed rap inputs and actual driving through every gate', async ({ page }) => {
  await enter(page);
  await page.evaluate(()=>window.__game.enemies.forEach(e=>e.cooldown=Infinity));
  await page.keyboard.press('Digit2');
  await page.evaluate(()=>window.__game.player.group.position.set(-11,0,-23));
  await page.keyboard.press('KeyE');
  expect(await page.evaluate(()=>window.__game.stage)).toBe(0);
  expect(await page.evaluate(()=>window.__game.rap)).toBeNull();
  // Score real muzzle-ray takedowns, positioned deterministically to isolate attribution.
  await page.evaluate(()=>{
    const g=window.__game; g.running=false; g.active=0;
    const p=g.player;
    p.group.position.set(-.4,0,4); p.group.rotation.set(0,0,0);
    p.body.position.y=0; p.body.rotation.set(0,0,0); p.arms.rotation.set(0,0,0);
    g.enemies.forEach(e=>e.health=0);
    for(let i=0;i<3;i++) {
      const target=g.enemies[i]; target.health=20;
      target.group.position.set(0,0,-2); target.group.rotation.set(0,0,0);
      for(let shot=0;shot<3 && target.health>0;shot++) { p.recoil=0; g.shoot(p); }
      if(target.health>0) throw Error('Expected muzzle hit did not land');
    }
    g.running=true;
  });
  await page.waitForFunction(()=>window.__game.stage===1);
  expect(await page.evaluate(()=>window.__game.characters[0].kills)).toBe(3);
  await page.evaluate(()=>window.__game.player.group.position.set(-11,0,-23));
  await expect(page.locator('#interaction')).toContainText('SWITCH TO LIL DOOM');
  await page.keyboard.press('KeyE');
  expect(await page.evaluate(()=>window.__game.rap)).toBeNull();
  await page.keyboard.press('Digit2');
  await page.evaluate(()=>window.__game.player.group.position.set(-11,0,-23));
  await page.keyboard.press('KeyE');
  await expect(page.locator('#rap-panel')).toBeVisible();
  // A silent round must fail instead of accepting a held interaction key.
  await page.waitForFunction(()=>window.__game.rap===null);
  expect(await page.evaluate(()=>window.__game.stage)).toBe(1);
  await page.keyboard.press('KeyE');
  const keys=['KeyJ','KeyK','KeyL','KeyJ','KeyL','KeyK','KeyJ','KeyL'];
  for(let i=0;i<keys.length;i++) {
    await page.waitForFunction(i=>window.__game.rap && window.__game.rap.time>=1.5+i*.65-.14,i);
    await page.keyboard.press(keys[i]);
  }
  await page.waitForFunction(()=>window.__game.stage===2);
  expect(await page.evaluate(()=>window.__game.rapScore)).toBeGreaterThanOrEqual(6);
  await page.evaluate(()=>window.__game.player.group.position.set(4,0,-34));
  await page.keyboard.press('KeyE');
  expect(await page.evaluate(()=>window.__game.driving)).toBe(false);
  await page.keyboard.press('Digit3');
  await page.evaluate(()=>window.__game.player.group.position.set(4,0,-34));
  await page.keyboard.press('KeyE');
  await expect(page.locator('#drive-panel')).toBeVisible();
  const before=await page.evaluate(()=>window.__game.car.group.position.z);
  await page.keyboard.down('KeyW');
  await page.waitForFunction(z=>window.__game.car.group.position.z<z-2,before);
  await page.keyboard.up('KeyW');
  // Steer via the same input state as the keyboard; never teleport across a gate.
  await page.evaluate(()=>{
    const route=[[4,-49],[-3,-61],[2,-74]];
    window.__driveController=setInterval(()=>{
      const g=window.__game;
      if(!g.running || !g.driving) return;
      const next=route[g.car.gate]; if(!next) return;
      const dx=next[0]-g.car.group.position.x, dz=next[1]-g.car.group.position.z;
      const desired=Math.atan2(-dx,-dz);
      const error=Math.atan2(Math.sin(desired-g.car.yaw),Math.cos(desired-g.car.yaw));
      g.keys.delete('KeyA');g.keys.delete('KeyD');g.keys.delete('KeyW');g.keys.delete('Space');
      if(error>.06)g.keys.add('KeyA'); if(error<-.06)g.keys.add('KeyD');
      if(g.car.speed<8)g.keys.add('KeyW');
      if(Math.abs(error)>.6 && g.car.speed>4)g.keys.add('Space');
    },16);
  });
  await page.waitForFunction(()=>window.__game.car.gate>=1,null,{timeout:15000});
  await page.evaluate(()=>clearInterval(window.__driveController));
  await page.keyboard.press('Digit1');
  await page.waitForFunction(()=>window.__game.gunner);
  await page.keyboard.press('Escape');
  const gunnerPosition=await page.evaluate(()=>window.__game.car.group.position.z);
  await page.waitForTimeout(200);
  expect(await page.evaluate(()=>window.__game.car.group.position.z)).toBe(gunnerPosition);
  await page.locator('#resume').click();
  expect(await page.evaluate(()=>window.__game.gunner)).toBe(true);
  // Track the armed ambush through the gun's actual world-space muzzle, not a kill shortcut.
  await page.evaluate(()=>{
    window.__gunnerAim=setInterval(()=>{
      const g=window.__game;
      if(!g.running||!g.gunner)return;
      const target=g.enemies.find(e=>e.driveBy&&e.health>0);
      if(!target)return;
      const p=g.player,gun=p.guns[0];
      g.scene.updateMatrixWorld(true);
      const origin=gun.muzzle.getWorldPosition(p.group.position.clone());
      const aim=target.group.position.clone();aim.y+=1.25;
      const delta=aim.sub(origin);
      g.yaw=Math.atan2(-delta.x,-delta.z);
      g.pitch=Math.atan2(delta.y,Math.hypot(delta.x,delta.z))-p.recoil-gun.recoil;
    },16);
  });
  await page.waitForFunction(()=>window.__game.player.draw===0);
  await page.screenshot({path:'test-results/chiraq-back-seat.png'});
  await page.mouse.down();
  await page.waitForFunction(()=>window.__game.driveByKills>=2,null,{timeout:20000});
  await page.mouse.up();
  await page.evaluate(()=>clearInterval(window.__gunnerAim));
  await page.waitForFunction(()=>window.__game.finished,null,{timeout:25000});
  await expect(page.locator('#result-title')).toHaveText('CREWEXTRACTED.');
  expect(await page.evaluate(()=>window.__game.car.gate)).toBe(3);
  expect(await page.evaluate(()=>window.__game.driveByKills)).toBeGreaterThanOrEqual(2);
  expect(await page.evaluate(()=>window.__game.characters[0].xp)).toBe(100);
  await page.locator('#result-menu').click();
  await expect(page.locator('#menu')).toBeVisible();
  expect(await page.evaluate(()=>({gate:__game.car.gate,driving:__game.driving,rap:__game.rap,score:__game.rapScore}))).toEqual({gate:0,driving:false,rap:null,score:0});
  expect(await page.evaluate(()=>({gunner:__game.gunner,driveBy:__game.driveByKills,xp:__game.characters[0].xp}))).toEqual({gunner:false,driveBy:0,xp:100});
});

test('rap and driving can pause and quit; cars collide and all mission state resets', async ({ page }) => {
  await enter(page);
  // Set up each activity directly; the preceding test exercises their story gates.
  await page.evaluate(()=>{
    const g=window.__game; g.enemies.forEach(e=>e.cooldown=Infinity);
    g.stage=1; g.switchCharacter(1); g.player.group.position.set(-11,0,-23);
  });
  await page.keyboard.press('KeyE');
  await page.waitForFunction(()=>window.__game.rap?.time>.4);
  await page.keyboard.press('Escape');
  const pausedBeat=await page.evaluate(()=>window.__game.rap.time);
  await page.waitForTimeout(250);
  expect(await page.evaluate(()=>window.__game.rap.time)).toBe(pausedBeat);
  await page.locator('#resume').click();
  await page.waitForFunction(time=>window.__game.rap.time>time,pausedBeat);
  await page.keyboard.press('Escape');
  await page.locator('#quit').click();
  await expect(page.locator('#rap-panel')).toBeHidden();
  expect(await page.evaluate(()=>window.__game.rap)).toBeNull();
  await page.locator('#start').click();
  await page.evaluate(()=>{
    const g=window.__game; g.enemies.forEach(e=>e.cooldown=Infinity);
    g.stage=2; g.switchCharacter(2); g.player.group.position.set(4,0,-34);
  });
  await page.keyboard.press('KeyE');
  await page.waitForFunction(()=>window.__game.driving);
  await page.keyboard.down('KeyW');
  await page.waitForFunction(()=>window.__game.car.speed>2);
  await page.keyboard.up('KeyW');
  await page.keyboard.press('KeyE');
  expect(await page.evaluate(()=>window.__game.driving)).toBe(false);
  expect(await page.evaluate(()=>window.__game.characters.every(p=>p.group.visible))).toBe(true);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(()=>window.__game.driving);
  await page.evaluate(()=>window.__game.car.group.position.set(7,0,-55));
  await page.keyboard.down('KeyW');
  await page.waitForFunction(()=>window.__game.car.integrity<100);
  await page.keyboard.up('KeyW');
  expect(await page.evaluate(()=>window.__game.car.group.position.z)).toBeGreaterThan(-57);
  await page.screenshot({path:'test-results/chiraq-driving.png'});
  await page.keyboard.press('Escape');
  await page.locator('#quit').click();
  await expect(page.locator('#menu')).toBeVisible();
  await expect(page.locator('#drive-panel')).toBeHidden();
  expect(await page.evaluate(()=>({speed:__game.car.speed,gate:__game.car.gate,integrity:__game.car.integrity,driving:__game.driving,visible:__game.characters.every(p=>p.group.visible)}))).toEqual({speed:0,gate:0,integrity:100,driving:false,visible:true});
});

test('a Special Opp completes Draco task without any kill ranking', async ({page})=>{
  await enter(page);
  await page.evaluate(()=>{
    const g=window.__game;g.running=false;
    g.characters[1].kills=50;g.characters[2].kills=50;
    const target=g.enemies.find(e=>e.special);
    g.enemies.forEach(e=>e.health=0);target.health=1;
    target.group.position.set(0,0,-2);
    const p=g.player;p.group.position.set(-.4,0,4);p.group.rotation.set(0,0,0);
    p.arms.rotation.set(-.04,0,0);p.body.position.y=0;p.body.rotation.set(0,0,0);
    g.shoot(p);g.running=true;
  });
  await page.waitForFunction(()=>window.__game.stage===1);
  expect(await page.evaluate(()=>({kills:__game.player.kills,special:__game.player.specialKills,xp:__game.player.xp}))).toEqual({kills:1,special:1,xp:80});
});

test('companions follow safely, use weak fire, and cannot die while inactive', async ({page})=>{
  await enter(page);
  const damage=await page.evaluate(()=>{
    const g=window.__game;g.running=false;
    const p=g.characters[0],target=g.enemies[0];
    p.group.position.set(-.4,0,4);p.group.rotation.set(0,0,0);p.body.position.y=0;p.body.rotation.set(0,0,0);p.arms.rotation.set(-.04,0,0);
    g.enemies.forEach(e=>e.health=0);target.health=85;target.group.position.set(0,0,-2);
    g.shoot(p);const active=85-target.health;
    target.health=85;p.recoil=0;g.active=1;
    g.shoot(p);const support=85-target.health;
    g.active=0;
    g.player.group.position.set(20,0,18);g.characters[1].group.position.set(0,0,0);g.characters[1].health=20;g.characters[2].group.position.set(20,0,19);
    target.health=85;target.group.position.set(0,0,-4);target.cooldown=0;
    const random=Math.random;Math.random=()=>0;
    try{g.updateAI(.016);}finally{Math.random=random;}
    const health=g.characters[1].health,finished=g.finished;
    g.enemies.forEach(e=>e.health=0);g.reinforcementTimer=Infinity;
    g.characters.forEach((p,i)=>{p.health=100;p.group.position.set(i===0?0:i===1?-2:2,0,i===0?-6:12);p.aiGoal=null;p.aiPlanCooldown=0;});
    g.running=true;
    return{active,support,health,finished};
  });
  expect(damage.active).toBeGreaterThan(20);
  expect(damage.support).toBeGreaterThan(0);
  expect(damage.support).toBeLessThan(damage.active*.3);
  expect(damage.health).toBeGreaterThanOrEqual(20);
  expect(damage.finished).toBe(false);
  await page.waitForFunction(()=>window.__game.characters[1].group.position.z<8);
  expect(await page.evaluate(()=>window.__game.characters.every(p=>p.health===100))).toBe(true);
  expect(await page.evaluate(()=>window.__game.characters.slice(1).every(p=>!window.__game.colliders.some(b=>p.group.position.x+.35>b.min.x&&p.group.position.x-.35<b.max.x&&p.group.position.z+.35>b.min.z&&p.group.position.z-.35<b.max.z&&b.max.y>.1)))).toBe(true);
});

test('narration queues, can be reread, and XP stays saved without consuming an unassigned special',async({page})=>{
  await enter(page);
  await page.evaluate(()=>{
    const g=window.__game;g.enemies.forEach(e=>e.cooldown=Infinity);
    g.toast('First line for a slow reader.');g.toast('Second line waits its turn.');g.awardXP(1,60);
  });
  expect(await page.evaluate(()=>window.__game.toastTime)).toBeGreaterThan(4);
  expect(await page.evaluate(()=>window.__game.narrationQueue.includes('Second line waits its turn.'))).toBe(true);
  await page.keyboard.press('Escape');
  await page.locator('.dialogue-history summary').click();
  await expect(page.locator('#narration-log')).toContainText('First line for a slow reader.');
  await expect(page.locator('#narration-log')).toContainText('Second line waits its turn.');
  await page.reload();
  await page.waitForFunction(()=>Boolean(window.__game));
  expect(await page.evaluate(()=>window.__game.characters[1].xp)).toBe(60);
  await page.locator('#start').click();
  await page.keyboard.press('Digit2');
  await page.evaluate(()=>window.__game.awardXP(1,40));
  await expect(page.locator('#xp-label-1')).toHaveText('SPECIAL READY');
  await page.keyboard.press('KeyF');
  expect(await page.evaluate(()=>window.__game.player.xp)).toBe(100);
  expect(await page.evaluate(()=>window.__game.dialogueLog.some(line=>line.includes('not assigned yet')))).toBe(true);
});

test('normal opps and the Special Opp patrol with moving legs and attached markers',async({page})=>{
  await enter(page);
  const before=await page.evaluate(()=>{
    const g=window.__game;g.enemies.forEach(e=>e.cooldown=Infinity);
    return [g.enemies[0],g.enemies.find(e=>e.special)].map(e=>({x:e.group.position.x,z:e.group.position.z}));
  });
  await page.waitForFunction(points=>{
    const g=window.__game;
    return [g.enemies[0],g.enemies.find(e=>e.special)].every((e,i)=>Math.hypot(e.group.position.x-points[i].x,e.group.position.z-points[i].z)>1);
  },before);
  expect(await page.evaluate(()=>window.__game.enemies.some(e=>e.legs.some(l=>Math.abs(l.rotation.x)>.1)))).toBe(true);
  expect(await page.evaluate(()=>{const e=window.__game.enemies.find(e=>e.special);return Math.abs(e.badge.position.x-e.group.position.x)+Math.abs(e.badge.position.z-e.group.position.z);})).toBeLessThan(.1);
});

test('crew fires autonomously, driver shoots one-handed while steering, and AI driving can run over opps',async({page})=>{
  await enter(page);
  await page.evaluate(()=>{
    const g=window.__game;g.enemies.forEach(e=>e.health=0);g.stage=2;g.switchCharacter(2);g.player.group.position.set(4,0,-34);
  });
  await page.keyboard.press('KeyE');
  await page.waitForFunction(()=>window.__game.driving);
  await page.evaluate(()=>{
    const g=window.__game;
    for(const [x,z]of[[-4,-38],[7.5,-38]]){
      const e=g.spawnEnemy(x,z);e.health=10000;e.cooldown=Infinity;e.moveTimer=Infinity;e.moveGoal=e.group.position.clone();
    }
  });
  await page.waitForFunction(()=>window.__game.characters[0].loadout[0].rounds[0]<100&&window.__game.characters[1].loadout[0].rounds[0]<50);
  expect(await page.evaluate(()=>window.__game.active)).toBe(2);
  expect(await page.evaluate(()=>window.__game.characters[2].guns[1].group.visible)).toBe(false);
  const start=await page.evaluate(()=>window.__game.car.group.position.z);
  await page.keyboard.down('KeyW');
  await page.mouse.down();
  await page.waitForFunction(z=>window.__game.car.group.position.z<z-.8&&window.__game.characters[2].loadout[0].rounds[0]<50,start);
  await page.mouse.up();await page.keyboard.up('KeyW');
  expect(await page.evaluate(()=>window.__game.characters[2].loadout[0].rounds[1])).toBe(50);
  await page.keyboard.press('Digit2');
  await page.waitForFunction(()=>window.__game.active===1&&window.__game.gunner);
  const passengerStart=await page.evaluate(()=>window.__game.car.group.position.z);
  await page.waitForFunction(z=>window.__game.car.group.position.z<z-.5,passengerStart);
  await page.evaluate(()=>{
    const g=window.__game,p=g.car.group.position;
    const e=g.spawnEnemy(p.x,p.z-3.1);e.health=65;e.driveBy=true;e.cooldown=Infinity;e.moveTimer=Infinity;e.moveGoal=e.group.position.clone();window.__ramTarget=e;
  });
  await page.waitForFunction(()=>window.__ramTarget.health<=0);
  expect(await page.evaluate(()=>window.__game.characters[2].kills)).toBeGreaterThanOrEqual(1);
  expect(await page.evaluate(()=>window.__game.driveByKills)).toBeGreaterThanOrEqual(1);
  expect(await page.evaluate(()=>window.__game.active)).toBe(1);
  await page.keyboard.press('Digit1');
  await page.waitForFunction(()=>window.__game.active===0&&window.__game.gunner);
  const dracoStart=await page.evaluate(()=>window.__game.car.group.position.z);
  await page.waitForFunction(z=>window.__game.car.group.position.z<z-.4,dracoStart);
  await page.screenshot({path:'test-results/crew-vehicle.png'});
  await page.keyboard.press('Digit3');
  expect(await page.evaluate(()=>({active:__game.active,gunner:__game.gunner}))).toEqual({active:2,gunner:false});
});

test('subtitles are compact bottom text and original music has audible output, mute, pause and rap ducking',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await enter(page);
  const subtitle=await page.locator('#toast').evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return{top:r.top,bottom:r.bottom,height:r.height,background:s.backgroundColor,border:s.borderTopWidth,screen:innerHeight};});
  expect(subtitle.top).toBeGreaterThan(subtitle.screen*.75);
  expect(subtitle.bottom).toBeLessThan(subtitle.screen-30);
  expect(subtitle.height).toBeLessThan(100);
  expect(subtitle.background).toBe('rgba(0, 0, 0, 0)');
  expect(subtitle.border).toBe('0px');
  await page.evaluate(()=>{
    const g=window.__game;g.enemies.forEach(e=>e.cooldown=Infinity);
    const analyser=g.audio.createAnalyser();analyser.fftSize=2048;g.music.bus.connect(analyser);window.__musicAnalyser=analyser;
  });
  await page.waitForFunction(()=>{
    const data=new Float32Array(2048);window.__musicAnalyser.getFloatTimeDomainData(data);return data.some(v=>Math.abs(v)>.0005);
  });
  expect(await page.evaluate(()=>window.__game.music.active)).toBe(true);
  await page.keyboard.press('KeyM');
  await expect(page.locator('#music-toggle')).toHaveText('MUSIC OFF');
  expect(await page.evaluate(()=>window.__game.music.muted)).toBe(true);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(()=>window.__game.music.active)).toBe(false);
  await page.locator('#music-volume').fill('35');
  await page.locator('#resume').click();
  expect(await page.evaluate(()=>window.__game.music.volume)).toBe(.35);
  await page.keyboard.press('KeyM');
  await page.evaluate(()=>{
    const g=window.__game;g.narrationQueue=[];g.toastTime=0;g.stage=1;g.switchCharacter(1);g.player.group.position.set(-11,0,-23);g.narrationQueue=[];g.toastTime=0;
  });
  await page.keyboard.press('KeyE');
  await page.waitForFunction(()=>window.__game.music.ducked);
  expect(await page.evaluate(()=>window.__game.toastTime)).toBeLessThanOrEqual(3.5);
  await expect(page.locator('#toast-text')).toHaveText('Doom: Watch me catch this pocket.');
  await page.screenshot({path:'test-results/compact-subtitles.png'});
  await page.keyboard.press('Escape');await page.locator('#quit').click();
  expect(await page.evaluate(()=>window.__game.music.active)).toBe(false);
  await page.reload();await page.waitForFunction(()=>Boolean(window.__game));
  expect(await page.evaluate(()=>window.__game.music.volume)).toBe(.35);
  expect(errors).toEqual([]);
});
