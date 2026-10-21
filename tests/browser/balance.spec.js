import {test,expect} from '@playwright/test';
async function enter(page){await page.goto('/?test=1&quality=low');await page.waitForFunction(()=>!!window.__game);await page.evaluate(()=>__game.renderer.setPixelRatio(.65));await page.locator('#start').click();}
test('actual muzzle impacts apply head, chest, abdomen and leg damage',async({page})=>{
 await enter(page);
 const wounds=await page.evaluate(()=>{
  const g=__game;g.running=false;g.enemies.forEach(e=>e.health=0);const enemy=g.enemies[0];enemy.group.position.set(0,0,-3);enemy.group.rotation.set(0,0,0);
  const p=g.player;p.group.position.set(-.4,0,3);p.body.position.set(0,0,0);p.body.rotation.set(0,0,0);p.arms.position.set(0,1.5,0);
  const random=Math.random;Math.random=()=>.5;const results=[];
  try{for(const [x,y]of [[0,1.9],[0,1.35],[0,.95],[.17,.45]]){
    enemy.health=1000;p.recoil=0;p.guns[0].group.rotation.x=0;
    for(let n=0;n<10;n++){g.scene.updateMatrixWorld(true);const origin=p.guns[0].muzzle.getWorldPosition(p.group.position.clone()),d=enemy.group.position.clone().add(p.group.position.clone().set(x,y,0)).sub(origin);p.group.rotation.y=Math.atan2(-d.x,-d.z);p.arms.rotation.x=Math.atan2(d.y,Math.hypot(d.x,d.z));}
    g.lastWound=null;g.shoot(p);results.push(g.lastWound&&{location:g.lastWound.location,damage:g.lastWound.damage});
  }}finally{Math.random=random;}return results;
 });
 expect(wounds.map(w=>w?.location)).toEqual(['head','chest','abdomen','leg']);
 expect(wounds.map(w=>Math.round(w.damage*10)/10)).toEqual([60,32.4,24,15.6]);
});
test('aim follows the same moving opp for one second, expires, and resets on release',async({page})=>{
 await enter(page);
 const result=await page.evaluate(async()=>{
  const {assistAim}=await import('/src/cover.js');const g=__game;g.running=false;g.enemies.forEach(e=>e.health=0);const enemy=g.enemies[0];enemy.health=500;enemy.group.position.set(0,0,-3);
  const p=g.player;p.group.position.set(-.4,0,4);p.group.rotation.y=0;p.body.position.set(0,0,0);p.body.rotation.set(0,0,0);p.arms.position.set(0,1.5,0);p.arms.rotation.x=0;
  g.yaw=0;g.pitch=0;g.elapsed=10;g.aiming=true;g.aimSession=null;assistAim(g,p,1/60);const acquired=g.aimTarget===enemy;
  enemy.group.position.x=5;g.elapsed=10.5;for(let i=0;i<15;i++)assistAim(g,p,1/60);const tracked=g.aimTarget===enemy&&g.yaw<-.2;
  g.elapsed=11.01;enemy.group.position.x=-5;const before=g.yaw;assistAim(g,p,1/60);const expired=g.aimTarget===null&&g.yaw===before;
  g.aiming=false;assistAim(g,p,1/60);enemy.group.position.x=0;g.yaw=0;g.pitch=0;p.group.rotation.y=0;p.arms.rotation.x=0;g.aiming=true;g.elapsed=12;assistAim(g,p,1/60);const reacquired=g.aimTarget===enemy;
  enemy.health=0;g.elapsed=12.2;assistAim(g,p,1/60);return{acquired,tracked,expired,reacquired,deadReleased:g.aimTarget===null};
 });expect(result).toEqual({acquired:true,tracked:true,expired:true,reacquired:true,deadReleased:true});
});
test('Level 2 starts at full standing height with taller cover and inactive crew automatically seek it',async({page})=>{
 await enter(page);
 const start=await page.evaluate(()=>{const g=__game;const standing=g.characters.map(p=>p.body.position.y);g.level=2;g.reset();g.enemies.forEach(e=>e.cooldown=Infinity);g.characters.slice(1).forEach(p=>p.cooldown=Infinity);return{standing,level2:g.characters.map(p=>({y:p.body.position.y,scale:p.body.scale.toArray(),crouched:p.crouched})),cover:g.claimColliders[0].max.y,health:g.enemies.map(e=>e.health)};});
 expect(start.level2.every(p=>Math.abs(p.y)<.01&&p.scale.every(n=>n===1)&&!p.crouched)).toBe(true);expect(start.cover).toBeCloseTo(1.65,5);expect(start.health.every(h=>h===45)).toBe(true);
 await page.evaluate(()=>{__game.characters[1].group.position.set(0,0,5);__game.characters[1].aiGoal=null;});
 try{await page.waitForFunction(()=>__game.characters[1].aiState==='IN COVER'&&__game.characters[1].group.position.z>13.5,null,{timeout:25000});}catch(error){console.log(await page.evaluate(()=>__game.characters.map(p=>({pos:p.group.position.toArray(),goal:p.aiGoal?.toArray(),state:p.aiState,cover:p.coverBox?.min.toArray()}))));throw error;}
 expect(await page.evaluate(()=>__game.characters[1].coverBox===__game.claimColliders[1])).toBe(true);
 await page.screenshot({path:'test-results/full-height-level2.png'});
 await page.evaluate(()=>{const g=__game;g.enemies.forEach(e=>e.health=0);const e=g.enemies[0];e.health=500;e.group.position.set(0,0,-1);e.moveTimer=Infinity;e.moveGoal=e.group.position.clone();g.characters[1].cooldown=0;g.characters[1].draw=0;window.__supportTarget=e;});
 await page.waitForFunction(()=>window.__supportTarget.health<500,null,{timeout:10000});
});
