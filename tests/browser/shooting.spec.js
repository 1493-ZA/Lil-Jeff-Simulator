import {test,expect} from '@playwright/test';
test('camera crosshair tracking disables all moving pursuit waves with bounded ammo and normal recoil',async({page})=>{
 test.setTimeout(90000);await page.goto('/?test=1&quality=low');await page.waitForFunction(()=>!!window.__game);await page.evaluate(()=>__game.renderer.setPixelRatio(.65));await page.locator('#start').click();
 await page.evaluate(async()=>{const {beginPursuit,launchChase}=await import('/src/pursuit.js');const g=__game;beginPursuit(g);g.car.lockState='ready';launchChase(g);g.player.draw=0;g.aiming=true;g.aimSession={character:0,start:-100,target:null};g.renderer.setPixelRatio(.65);});
 const run=await page.evaluate(()=>new Promise((resolve,reject)=>{const g=__game,start=performance.now();const track=()=>{
  if(g.pursuit.disabled===6){g.shooting=false;resolve({shots:g.shots,hits:g.hits,disabled:g.pursuit.disabled,integrity:g.car.integrity});return;}
  if(performance.now()-start>55000){g.shooting=false;reject(Error(JSON.stringify({shots:g.shots,hits:g.hits,disabled:g.pursuit.disabled,ammo:g.weaponState.rounds,yaw:g.yaw,pitch:g.pitch})));return;}
  const car=g.pursuit.cops.find(c=>!c.disabled);if(car){g.scene.updateMatrixWorld(true);const tire=car.parts.find(p=>p.userData.police.type==='tire'&&p.userData.police.health>0),point=tire.getWorldPosition(g.player.group.position.clone()),screen=point.project(g.camera);g.yaw-=screen.x*.8;g.pitch=Math.max(-.85,Math.min(.65,g.pitch+screen.y*.8));g.shooting=Math.abs(screen.x)<.018&&Math.abs(screen.y)<.018;if(g.weaponState.rounds.every(n=>n===0))g.beginReload();}
  requestAnimationFrame(track);
 };track();}));
 expect(run.disabled).toBe(6);expect(run.shots).toBeLessThan(180);expect(run.hits/run.shots).toBeGreaterThan(.25);expect(run.integrity).toBeGreaterThan(0);
});
