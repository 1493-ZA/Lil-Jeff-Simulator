import {solveCircuit} from './helpers.js';
import {test,expect} from '@playwright/test';
async function enterPursuit(page){
 await page.goto('/?test=1&quality=low');await page.waitForFunction(()=>!!window.__game);await page.evaluate(()=>__game.renderer.setPixelRatio(.65));await page.locator('#start').click();
 await page.evaluate(()=>{const g=window.__game;g.defeatedNames=[{name:'Static',killer:0},{name:'Switchback',killer:1},{name:'Vex',killer:2}];g.level=3;g.reset();});
}
async function startCar(page){
 await page.keyboard.down('KeyE');await page.waitForFunction(()=>__game.car.lockState==='opened');await page.keyboard.up('KeyE');
 await page.keyboard.press('KeyE');await solveCircuit(page);await page.waitForFunction(()=>__game.pursuit.phase==='chase');
}
async function disableWave(page,type='tire'){
 return page.evaluate(type=>{
   const g=__game,wasRunning=g.running;g.running=false;g.scene.updateMatrixWorld(true);const p=g.player;
   const random=Math.random;Math.random=()=>.5;
   try{for(const cop of g.pursuit.cops.filter(c=>!c.disabled)){
     // Freeze targets in a clear lane to isolate real tire/driver muzzle hits.
     cop.group.position.set(0,0,Math.max(-68,Math.min(10,g.car.group.position.z+12)));g.scene.updateMatrixWorld(true);
     const target=cop.parts.find(m=>m.userData.police.type===type);const point=target.getWorldPosition(p.group.position.clone());
     for(let shot=0;shot<14&&!cop.disabled;shot++){
       p.recoil=0;p.guns[0].recoil=0;p.guns[0].group.rotation.set(0,0,0);
       for(let n=0;n<8;n++){
         g.scene.updateMatrixWorld(true);const origin=p.guns[0].muzzle.getWorldPosition(p.group.position.clone()),d=point.clone().sub(origin);
         p.group.rotation.y=Math.atan2(-d.x,-d.z);p.arms.rotation.x=Math.atan2(d.y,Math.hypot(d.x,d.z));
       }
       g.shoot(p);
     }
     if(!cop.disabled){g.scene.updateMatrixWorld(true);const gun=p.guns[0],origin=gun.muzzle.getWorldPosition(p.group.position.clone()),direction=p.group.position.clone().set(0,0,-1).applyQuaternion(gun.muzzle.getWorldQuaternion(p.group.quaternion.clone()));throw Error(JSON.stringify({type,origin:origin.toArray(),target:point.toArray(),direction:direction.toArray(),health:target.userData.police.health,ammo:p.loadout[p.slot].rounds,trace:Array.from(g.effects.at(-1).mesh.geometry.attributes.position.array)}));}
   }}finally{Math.random=random;g.running=wasRunning;}
   return g.pursuit.disabled;
 },type);
}
test('Mission 3 requires a second hotwire, automatically selects roof Draco, and every police wave must be shot down',async({page})=>{
 test.setTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await enterPursuit(page);await startCar(page);
 expect(await page.evaluate(()=>({active:__game.active,gunner:__game.gunner,ready:__game.car.lockState,parts:__game.pursuit.cops[0].parts.length}))).toEqual({active:0,gunner:true,ready:'ready',parts:5});
 const before=await page.evaluate(()=>__game.car.group.position.z);
 await page.waitForFunction(z=>Math.abs(__game.car.group.position.z-z)>2,before);
 await page.keyboard.press('Digit3');await page.locator('[data-character="2"]').evaluate(el=>el.click());expect(await page.evaluate(()=>__game.active)).toBe(0);
 await page.keyboard.press('KeyQ');await expect(page.locator('#weapon-name')).toHaveText('GLOCK WITH SWITCH');await page.keyboard.press('KeyQ');
 await page.keyboard.press('KeyR');await page.waitForFunction(()=>__game.player.reloading===0);
 await page.screenshot({path:'test-results/sunroof-chase.png'});
 expect(await disableWave(page,'tire')).toBe(2);
 await page.waitForFunction(()=>__game.pursuit.spawned===4);
 expect(await page.evaluate(()=>__game.pursuit.phase)).toBe('chase');
 expect(await disableWave(page,'driver')).toBe(4);
 await page.waitForFunction(()=>__game.pursuit.spawned===6);
 expect(await disableWave(page,'tire')).toBe(6);
 await page.waitForFunction(()=>__game.pursuit.phase==='studio',null,{timeout:25000});
 expect(await page.evaluate(()=>({beat:__game.music.scene,rap:__game.rap.purpose,driving:__game.driving}))).toEqual({beat:'studio',rap:'studio',driving:false});
 await page.screenshot({path:'test-results/studio-crew.png'});
 await page.keyboard.press('Escape');const paused=await page.evaluate(()=>__game.rap.time);await page.waitForTimeout(150);expect(await page.evaluate(()=>__game.rap.time)).toBe(paused);
 await page.locator('#quit').click();expect(await page.evaluate(()=>({level:__game.level,chase:__game.pursuit}))).toEqual({level:1,chase:null});expect(errors).toEqual([]);
});
test('studio shares one beat, all three change flows, on-fire boosts cred and only all completed verses unlock free roam',async({page})=>{
 test.setTimeout(90000);await enterPursuit(page);await startCar(page);
 // Skip the already-covered shooting stage; use the actual route-to-studio transition.
 await page.evaluate(()=>{const g=__game;g.pursuit.phase='toStudio';g.car.group.position.set(0,0,-23);g.characters.forEach(p=>p.onFireUntil=g.elapsed+60);});
 await page.waitForFunction(()=>__game.pursuit.phase==='studio');
 const patterns=[['KeyJ','KeyK','KeyL','KeyJ','KeyL','KeyK','KeyJ','KeyL'],['KeyL','KeyJ','KeyK','KeyK','KeyJ','KeyL','KeyK','KeyJ'],['KeyK','KeyL','KeyJ','KeyL','KeyK','KeyJ','KeyL','KeyK']];
 const flows=[[0,2,4,6,8,10,12,14],[0,1.5,3,6,7.5,9,12,14],[0,2/3,2,4,6,8+2/3,10,14]];
 const seen=[];
 for(let turn=0;turn<3;turn++){
   await page.waitForFunction(t=>__game.pursuit.turn===t,turn);seen.push(await page.evaluate(()=>__game.active));
   // Dispatch from the render frame to preserve triplet timing on software GPUs.
   await page.evaluate(({turn,pattern,flow})=>new Promise(resolve=>{
     const g=__game;let index=0;const hit=()=>{
       if(g.pursuit.turn!==turn){resolve();return;}
       while(index<8&&g.rap.time>=6*60/148+flow[index]*60/148-.08){window.dispatchEvent(new KeyboardEvent('keydown',{code:pattern[index]}));window.dispatchEvent(new KeyboardEvent('keyup',{code:pattern[index]}));index++;}
       if(index===8){resolve();return;}requestAnimationFrame(hit);
     };hit();
   }),{turn,pattern:patterns[turn],flow:flows[turn]});
   await page.waitForFunction(t=>__game.pursuit.turn>t||__game.pursuit.phase==='free',turn);
 }
 expect(seen).toEqual([0,1,2]);await page.waitForFunction(()=>__game.pursuit.phase==='free');
 expect(await page.evaluate(()=>__game.pursuit.credEarned)).toBeGreaterThanOrEqual(270);
 expect(await page.evaluate(()=>__game.pursuit.completed)).toEqual([true,true,true]);
 const z=await page.evaluate(()=>__game.player.group.position.z);await page.keyboard.down('KeyW');await page.waitForFunction(z=>__game.player.group.position.z<z-1,z);await page.keyboard.up('KeyW');
 await page.keyboard.press('Digit2');expect(await page.evaluate(()=>__game.active)).toBe(1);
 await expect(page.locator('#chapter-label')).toHaveText('FREE ROAM');await page.screenshot({path:'test-results/free-roam.png'});
 await page.keyboard.press('Escape');await page.locator('#quit').click();
});
test('locally bundled combat voices decode and music defaults are louder with a compressed output',async({page})=>{
 const errors=[];page.on('response',r=>{if(r.url().includes('/audio/')&&r.status()>=400)errors.push(r.url());});
 await page.goto('/?test=1&quality=low');await page.waitForFunction(()=>!!window.__game);await page.evaluate(()=>__game.renderer.setPixelRatio(.65));await page.locator('#start').click();
 expect(await page.evaluate(()=>__game.music.volume)).toBeGreaterThan(.6);
 await page.waitForFunction(()=>__game.music.samples.size===6);
 await page.evaluate(async()=>{await __game.voices.say('taunt-0','Opp: I see you behind that car!',3,{force:true});});
 await page.waitForFunction(()=>__game.voices.buffers.has('taunt-0'));
 await expect(page.locator('#bark-text')).toContainText('behind that car');
 await page.evaluate(()=>{const g=__game;g.enemies.forEach(e=>e.cooldown=Infinity);for(let i=0;i<3;i++){const e=g.spawnEnemy(0,-6);e.alias=i===0?'Static':null;g.defeatEnemy(e,0);}});
 expect(await page.evaluate(()=>__game.player.onFireUntil>__game.elapsed)).toBe(true);
 expect(await page.evaluate(()=>__game.defeatedNames)).toContainEqual({name:'Static',killer:0});
 const energy=await page.evaluate(async()=>{
   const g=__game,analyzer=g.audio.createAnalyser();g.music.compressor.connect(analyzer);const sample=new Float32Array(analyzer.fftSize);
   let peak=0;for(let i=0;i<20;i++){await new Promise(r=>setTimeout(r,100));analyzer.getFloatTimeDomainData(sample);peak=Math.max(peak,sample.reduce((s,v)=>s+v*v,0)/sample.length);}g.music.compressor.disconnect(analyzer);if(peak===0)console.log({running:g.running,context:g.audio.state,active:g.music.active,muted:g.music.muted,ducked:g.music.ducked,gain:g.music.bus.gain.value,nodes:g.music.nodes.size,step:g.music.step});return peak;
 });expect(energy).toBeGreaterThan(.000001);expect(errors).toEqual([]);
});
