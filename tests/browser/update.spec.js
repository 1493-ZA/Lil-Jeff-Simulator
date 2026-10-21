import {test,expect} from '@playwright/test';
async function enter(page){await page.goto('/?test=1&quality=low');await page.waitForFunction(()=>!!window.__game);await page.evaluate(()=>__game.renderer.setPixelRatio(.65));await page.locator('#start').click();}
test('crosshair convergence stays accurate on foot and through the sunroof; muzzle cover still blocks',async({page})=>{
 await enter(page);const result=await page.evaluate(async()=>{
  const {aimPoint,alignWeapon,shotSpread}=await import('/src/handling.js');const {WEAPONS}=await import('/src/combat.js');const g=__game;g.running=false;g.enemies.forEach(e=>e.health=0);const p=g.player;
  const errors=[];for(const roof of [false,true]){g.driving=g.gunner=roof;g.level=roof?3:1;
   for(const yaw of [-2,-.7,0,1.8])for(const pitch of [-.4,0,.35]){p.group.position.set(0,roof?1.05:0,-20);g.yaw=yaw;g.pitch=pitch;g.updateCamera(1);const target=aimPoint(g);alignWeapon(g,p,target);g.scene.updateMatrixWorld(true);const muzzle=p.guns[0].muzzle;const o=muzzle.getWorldPosition(p.group.position.clone()),d=p.group.position.clone().set(0,0,-1).applyQuaternion(muzzle.getWorldQuaternion(p.group.quaternion.clone()));errors.push(d.angleTo(target.sub(o).normalize()));}}
  return{maxError:Math.max(...errors),settled:shotSpread(WEAPONS.draco,{grounded:true,aimTime:1,heat:0},{aiming:true}),hip:shotSpread(WEAPONS.draco,{grounded:true,heat:0}),hair:g.characters[0].hair.children.some(m=>m.geometry?.type==='BoxGeometry')};
 });expect(result.maxError).toBeLessThan(.0001);expect(result.settled).toBeLessThan(result.hip);expect(result.hair).toBe(false);
});
test('hotwire requires three correct circuits, wrong links cannot start car, pause does not solve it',async({page})=>{
 await enter(page);await page.evaluate(()=>{const g=__game;g.stage=2;g.active=2;g.enemies.forEach(e=>e.cooldown=Infinity);g.player.group.position.set(4,0,-35);g.car.lockState='opened';});await page.keyboard.press('KeyE');await expect(page.locator('#wire-puzzle')).toBeVisible();
 const answers=await page.evaluate(()=>__game.carWork.order.map(c=>['AMBER','CYAN','VIOLET'].indexOf(c)));
 await page.keyboard.press('Digit1');await page.keyboard.press(['KeyJ','KeyK','KeyL'][answers.findIndex(v=>v!==0)]);
 await expect(page.locator('#wire-puzzle .failure')).toContainText('WRONG');expect(await page.evaluate(()=>__game.driving)).toBe(false);
 for(let source=0;source<3;source++){await page.keyboard.press(`Digit${source+1}`);await page.keyboard.press(['KeyJ','KeyK','KeyL'][answers.indexOf(source)]);}
 await page.waitForFunction(()=>__game.driving);expect(await page.evaluate(()=>__game.car.lockState)).toBe('ready');
});
test('free roam offers repeatable activities and keeps Mission 4 gated without auto-starting',async({page})=>{
 await enter(page);await page.evaluate(async()=>{const {beginPursuit,unlockFreeRoam}=await import('/src/pursuit.js');const g=__game;beginPursuit(g);g.studioProps={visible:true};unlockFreeRoam(g);g.characters.forEach(p=>p.xp=0);g.player.group.position.set(5,0,0);});
 await page.keyboard.press('KeyE');expect(await page.evaluate(()=>__game.street.active.type)).toBe('combat');
 await page.evaluate(()=>{const g=__game;g.street.active.enemies.forEach(e=>g.defeatEnemy(e,g.active));});
 await page.waitForFunction(()=>__game.street.active===null);expect(await page.evaluate(()=>__game.street.money)).toBe(100);
 await expect(page.locator('#enemy-remaining')).toContainText('MISSION 4 LOCKED');
 await page.evaluate(()=>{const g=__game;g.characters[0].xp=5000;g.player.group.position.set(0,0,-76);});await page.keyboard.press('KeyE');
 await expect(page.locator('#enemy-remaining')).toContainText('MISSION 4 LOCATION UNLOCKED');expect(await page.evaluate(()=>__game.level)).toBe(3);
});
test('Xbox-style input provides analog movement, switches prompts and supports minigames and pause',async({page})=>{
 await enter(page);await page.evaluate(()=>{const g=__game;g.enemies.forEach(e=>e.health=0);g.reinforcementTimer=Infinity;window.__pad={connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0})),vibrationActuator:{playEffect:()=>Promise.resolve()}};navigator.getGamepads=()=>[window.__pad];window.__pad.axes[0]=.6;});
 await page.waitForFunction(()=>__game.input.device==='controller');await expect(page.locator('[data-action="jump"]').first()).toHaveText('Ⓐ');
 const x=await page.evaluate(()=>__game.player.group.position.x);await page.waitForFunction(x=>__game.player.group.position.x>x+.5,x);
 await page.evaluate(()=>{__pad.axes[0]=0;__pad.buttons[9].pressed=true;});await expect(page.locator('#pause-menu')).toBeVisible();await page.evaluate(()=>__pad.buttons[9].pressed=false);
 // Physical keyboard input switches the HUD back immediately.
 await page.keyboard.press('KeyW');await expect(page.locator('[data-action="jump"]').first()).toHaveText('SPACE');
});
test('camera visibility never permits a shot through cover in front of the actual muzzle',async({page})=>{
 await enter(page);const result=await page.evaluate(async()=>{const g=__game;g.running=false;g.enemies.forEach(e=>e.health=0);const e=g.enemies[0];e.health=1000;e.group.position.set(0,0,-6);const p=g.player;p.group.position.set(-.4,0,4);p.group.rotation.set(0,0,0);p.body.position.set(0,0,0);p.arms.position.set(0,1.5,0);p.arms.rotation.set(0,0,0);g.camera.position.set(0,2.8,8);g.camera.lookAt(0,1.35,-6);g.camera.updateMatrixWorld(true);const cover=g.box(4,1.7,.5,'#666666',0,.85,1,{solid:true});const random=Math.random;Math.random=()=>.5;try{g.running=true;g.shoot(p);g.running=false;const covered=e.health;g.colliders.pop();cover.visible=false;g.running=true;g.shoot(p);g.running=false;return{covered,exposed:e.health};}finally{g.running=false;Math.random=random;}});expect(result.covered).toBe(1000);expect(result.exposed).toBeLessThan(1000);
});
test('controller buttons complete the circuit and judge rap notes with green and red feedback',async({page})=>{
 await enter(page);await page.evaluate(()=>{const g=__game;g.enemies.forEach(e=>e.health=0);g.reinforcementTimer=Infinity;g.stage=2;g.active=2;g.player.group.position.set(4,0,-35);g.car.lockState='opened';g.interact();window.__pad={connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false}))};navigator.getGamepads=()=>[__pad];const press=b=>{__pad.buttons[b].pressed=true;g.input.poll(.016);__pad.buttons[b].pressed=false;g.input.poll(.016);};for(let source=0;source<3;source++){press(2);const target=g.carWork.order.indexOf(['AMBER','CYAN','VIOLET'][source]);while(g.carWork.destination!==target)press(15);press(0);if(source<2)press(13);}});
 await page.waitForFunction(()=>__game.driving);const result=await page.evaluate(async()=>{const {createRap}=await import('/src/mission.js');const g=__game;g.driving=false;g.active=1;g.rap=createRap();g.rap.time=1.5;const press=b=>{__pad.buttons[b].pressed=true;g.input.poll(.016);__pad.buttons[b].pressed=false;g.input.poll(.016);};press(2);const hit=g.rap.results[0];g.rap.time=2.15;press(1);return{hit,wrong:g.rap.results[1],device:g.input.device};});expect(result).toEqual({hit:true,wrong:false,device:'controller'});
 await expect(page.locator('#rap-notes .rap-note.miss').first()).toHaveText('Ⓨ');
});
