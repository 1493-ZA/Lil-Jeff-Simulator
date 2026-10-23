import {test,expect} from '@playwright/test';
async function enter(page){await page.goto('/?test=1&quality=low');await page.waitForFunction(()=>!!window.__game);await page.evaluate(()=>__game.renderer.setPixelRatio(.6));await page.locator('#start').click();await page.evaluate(()=>__game.enemies.forEach(e=>e.cooldown=Infinity));}
async function free(page){await enter(page);await page.evaluate(async()=>{const {beginPursuit,unlockFreeRoam}=await import('/src/pursuit.js');beginPursuit(__game);__game.studioProps={visible:true};unlockFreeRoam(__game);});}
test('weighted movement settles without skating; shaped faces, black fade and cobalt variants stay consistent',async({page})=>{
 await enter(page);const result=await page.evaluate(()=>{const g=__game;g.running=false;g.enemies.forEach(e=>e.health=0);const p=g.player;p.group.position.set(0,0,12);g.keys.add('KeyW');const speed=[];for(let i=0;i<20;i++){g.updatePlayer(1/60);speed.push(p.moveVelocity.length());}g.keys.clear();for(let i=0;i<40;i++)g.updatePlayer(1/60);const skulls=g.characters.map(p=>p.body.getObjectByName('sculpted skull and jaw')?.geometry.type);const fade=g.characters[1].body.getObjectByName('doom black fade crown');return{speed,stop:p.moveVelocity.length(),skulls,fade:!!fade,scale:g.characters.map(p=>p.body.scale.toArray()),blue:g.enemies.map(e=>e.group.userData.torso.material.color.b),phase:p.gaitPhase};});
 expect(result.speed[0]).toBeLessThan(result.speed[15]);expect(result.stop).toBeLessThan(.001);expect(result.phase).toBeGreaterThan(1);expect(result.skulls).toEqual(['LatheGeometry','LatheGeometry','LatheGeometry']);expect(result.fade).toBe(true);expect(result.scale).toEqual([[1,1,1],[1,1,1],[1,1,1]]);expect(result.blue.every(n=>n>.2)).toBe(true);
});
test('required character marker tracks offscreen crew and clears immediately on switch; active health dominates',async({page})=>{
 await enter(page);await page.evaluate(()=>{const g=__game;g.stage=1;g.characters[1].group.position.set(8,0,-25);g.updateHUD();});await expect(page.locator('#required-character')).toBeVisible();await expect(page.locator('#required-character')).toContainText('Lil doom');
 await page.keyboard.press('Digit2');await expect(page.locator('#required-character')).toBeHidden();await expect(page.locator('[data-character="1"]')).toHaveClass(/selected/);
 const sizes=await page.locator('.squad-card').evaluateAll(cards=>cards.map(c=>c.getBoundingClientRect().height));expect(sizes[1]).toBeGreaterThan(sizes[0]);
 await page.evaluate(()=>{__game.player.health=20;__game.updateHUD();});await expect(page.locator('#low-health')).toBeVisible();
});
test('Z78 autonomously drives all three checkpoints after switching between both passengers',async({page})=>{
 await enter(page);const result=await page.evaluate(()=>{const g=__game;g.running=false;g.stage=2;g.active=2;g.car.lockState='ready';g.boardCar();g.enterGunner(0);for(let i=0;i<2400&&g.car.gate<3;i++){if(i===800)g.enterGunner(1);if(i===1400)g.enterGunner(0);g.updateDriving(1/60);}return{gate:g.car.gate,health:g.car.integrity,driver:g.characters[2].group.position.toArray(),car:g.car.group.position.toArray(),active:g.active};});expect(result.gate).toBe(3);expect(result.health).toBeGreaterThan(0);expect(result.active).not.toBe(2);expect(Math.abs(result.driver[2]-result.car[2])).toBeLessThan(2);
});
test('break-in opens the real door and seats Z78 before the puzzle; all four logic puzzles are solvable',async({page})=>{
 await enter(page);await page.evaluate(()=>{const g=__game;g.stage=2;g.active=2;g.player.group.position.set(4,0,-35);g.nextPuzzleType='circuit';});await page.keyboard.down('KeyE');await page.waitForFunction(()=>__game.car.door.rotation.y<-.2);expect(await page.evaluate(()=>__game.car.lockState)).toBe('locked');await page.waitForFunction(()=>__game.carWork?.phase==='wire');await page.keyboard.up('KeyE');await page.waitForFunction(()=>!__game.player.legs[0].visible);await page.keyboard.press('Escape');
 for(const type of ['circuit','grid','rotate','fuse']){
  await page.evaluate(type=>{const g=__game;g.nextPuzzleType=type;g.car.lockState='opened';g.player.group.position.set(2,0,-38);g.interact();},type);
  await expect(page.locator('#wire-puzzle .puzzle-instruction')).not.toBeEmpty();
  if(type==='circuit'){const order=await page.evaluate(()=>__game.carWork.order);for(let i=0;i<3;i++){await page.keyboard.press(`Digit${i+1}`);await page.keyboard.press(['KeyJ','KeyK','KeyL'][order.indexOf(['AMBER','CYAN','VIOLET'][i])]);}}
  if(type==='fuse'){const plan=await page.evaluate(()=>{const t=__game.carWork;return t.slots.map((s,i)=>[t.fuses.findIndex(f=>f.shape===s.shape&&f.rating===s.rating),i]);});for(const [f,slot]of plan){await page.keyboard.press(`Digit${f+1}`);await page.keyboard.press(['KeyJ','KeyK','KeyL'][slot]);}}
  if(type==='rotate'){await page.evaluate(async()=>{const H=await import('/src/hotwire.js');const t=__game.carWork;const best=(function search(i,cur){if(i===9)return H.rotateSolved({...t,tiles:cur})?cur:null;let m=cur[i];for(let r=0;r<4;r++){const next=[...cur];next[i]=m;const res=search(i+1,next);if(res)return res;m=H.rotateMask(m);}return null;})(0,[...t.tiles]);
    // Rotate through the real keyboard path: move the cursor, press Space.
    for(let i=0;i<9;i++)while(__game.carWork&&__game.carWork.tiles[i]!==best[i]){__game.carWork.cursor=i;window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space'}));}});}
  if(type==='grid'){await page.evaluate(()=>{const t=__game.carWork,N=4;const solve=(i,used)=>{if(i===3)return [];const [a,b]=t.terminals[i];let found=null;const dfs=(cell,path)=>{if(found)return;if(cell===b){const rest=solve(i+1,new Set([...used,...path]));if(rest)found=[path,...rest];return;}const r=Math.floor(cell/N),c=cell%N;for(const [dr,dc]of [[0,1],[1,0],[0,-1],[-1,0]]){const nr=r+dr,nc=c+dc,n=nr*N+nc;if(nr<0||nr>=N||nc<0||nc>=N||path.includes(n)||used.has(n)||t.terminals.some((p,j)=>j!==i&&p.includes(n)))continue;dfs(n,[...path,n]);}};dfs(a,[a]);return found;};
    const key=code=>window.dispatchEvent(new KeyboardEvent('keydown',{code}));
    for(const path of solve(0,new Set())){__game.carWork.cursor=path[0];key('Space');for(let k=1;k<path.length;k++){const d=path[k]-path[k-1];key(d===1?'ArrowRight':d===-1?'ArrowLeft':d===N?'ArrowDown':'ArrowUp');}}});}
  await page.waitForFunction(()=>__game.driving);expect(await page.evaluate(()=>__game.car.lockState)).toBe('ready');await page.evaluate(()=>{__game.exitCar();__game.active=2;});
 }
});
test('deep alley handoff has a client beyond the original street and awards only after guarded exchange',async({page})=>{
 await enter(page);const result=await page.evaluate(async()=>{const {beginClaimBlock}=await import('/src/campaign.js');const {alleyInteract}=await import('/src/alley.js');const g=__game;beginClaimBlock(g);g.running=false;g.claim.point=2;g.active=2;g.player.group.position.set(12,0,-40);alleyInteract(g);g.player.group.position.set(12,0,-47);alleyInteract(g);g.player.group.position.set(30,0,-47);alleyInteract(g);const blocked=!g.claim.exitTagged;g.claim.alley.guards.forEach(e=>g.defeatEnemy(e,0));const before=g.player.xp;alleyInteract(g);return{blocked,done:g.claim.exitTagged,earned:g.player.xp-before,npc:g.alleyClient.group.name,x:g.alleyClient.group.position.x};});expect(result).toMatchObject({blocked:true,done:true,earned:40});expect(result.npc).toContain('MOSS');expect(result.x).toBeGreaterThan(25);
});
test('all courier routes use NPCs, animate exchanges, pay once and hide completed markers',async({page})=>{
 await free(page);const result=await page.evaluate(async()=>{const {streetInteract,updateStreet}=await import('/src/street.js');const g=__game;g.running=false;g.active=2;const routes=[];
 for(let run=0;run<3;run++){g.street.deliverySerial=run;g.street.cooldowns={};g.player.group.position.set(12,0,-18);streetInteract(g);g.elapsed+=1.2;updateStreet(g,.016);const a0=g.street.active;if(a0.phase!=='pickup')throw Error('no pickup phase');a0.encounter='quiet';let handoffs=0;
 while(g.street.active){const a=g.street.active;a.enemies.forEach(e=>g.defeatEnemy(e,0));g.player.group.position.copy(a.destination);const pickup=a.phase==='pickup';const client=g.street.contacts[a.contact];if(!pickup&&!client.group.parent)throw Error('missing client');streetInteract(g);if(!pickup&&!client.exchangeUntil)throw Error('missing exchange animation');g.elapsed+=1.2;updateStreet(g,.016);if(!pickup)handoffs++;if(handoffs>4)throw Error('stuck run');}routes.push(handoffs);}
 const cash=g.street.money;updateStreet(g,.016);return{routes,cash,still:g.street.money,complete:g.street.completed,visible:g.street.props.find(m=>m.userData.activity===2).visible};});expect(result.routes).toEqual([1,3,1]);expect(result.cash).toBe(550);expect(result.still).toBe(550);expect(result.complete).toBe(3);expect(result.visible).toBe(false);await expect(page.locator('#completion-banner')).toContainText('HANDOFF COMPLETE');
});
test('priority escape changes objective and navigation immediately; map shows the expanded neighborhood',async({page})=>{
 await free(page);await page.evaluate(()=>{const g=__game;g.player.group.position.set(56,0,-64);g.interact();g.street.active.enemies.forEach(e=>g.defeatEnemy(e,0));});await expect(page.locator('#objective-title')).toHaveText('ESCAPE TO COMMERCE ROW');await expect(page.locator('#destination-indicator')).toContainText('ESCAPE TO COMMERCE ROW');await expect(page.locator('#minimap-panel')).toBeVisible();await expect(page.locator('#map-zone')).toHaveText('OPP BLOCK');
 expect(await page.evaluate(()=>__game.district.children.length)).toBeGreaterThan(5);await page.screenshot({path:'test-results/east-yard-navigation.png'});
 await page.evaluate(()=>__game.player.group.position.set(33,0,-31));await page.waitForFunction(()=>__game.street.active===null);await expect(page.locator('#completion-banner')).toContainText('COMPLETE');
});
test('street cypher decodes character vocals and preserves the staged studio microphone',async({page})=>{
 await free(page);await page.evaluate(()=>{__game.active=1;__game.player.group.position.set(-11,0,-25);__game.interact();});await page.waitForFunction(()=>__game.voices.last?.id==='street-1-0');await page.waitForFunction(()=>__game.voices.buffers.has('street-1-0'));expect(await page.evaluate(()=>__game.voices.buffers.get('street-1-0').duration)).toBeGreaterThan(1);
 await page.evaluate(async()=>{const {beginStudio}=await import('/src/pursuit.js');beginStudio(__game);});expect(await page.evaluate(()=>{let n=0;__game.studioProps.traverse(m=>{if(m.name==='central studio microphone')n++;});return n;})).toBe(1);await page.waitForFunction(()=>__game.rap.time>2);await page.screenshot({path:'test-results/polished-crew-studio.png'});
});
test('car doors swing outward from the front hinge on the imported getaway sedan and the code-built coupe',async({page})=>{
 await enter(page);await page.waitForFunction(()=>!!__game.car.model,null,{timeout:30000});const result=await page.evaluate(async()=>{const {DOOR_OPEN}=await import('/src/models.js');const {beginPursuit}=await import('/src/pursuit.js');const g=__game;g.running=false;const V=g.car.group.position.constructor;
  // Works for code-built and imported doors: the door's outermost point in the car's own frame (driver side is -X).
  const B=g.colliders[0].constructor;const outer=car=>{car.group.updateMatrixWorld(true);const b=new B().setFromObject(car.door);return Math.min(...[[b.min.x,b.min.z],[b.min.x,b.max.z],[b.max.x,b.min.z],[b.max.x,b.max.z]].map(([x,z])=>car.group.worldToLocal(new V(x,b.min.y,z)).x));};
  const tip=car=>{car.door.rotation.y=0;const closedX=outer(car);car.door.rotation.y=DOOR_OPEN;const openX=outer(car);car.door.rotation.y=0;return{closedX,openX};};
  const first=tip(g.car);beginPursuit(g);const second=tip(g.car);return{first,second};});
 for(const car of [result.first,result.second]){expect(car.openX).toBeLessThan(car.closedX-.5);}
});
test('Z78 keeps lapping after the route gates and recovers after the player crashes into a kerb',async({page})=>{
 await enter(page);const result=await page.evaluate(()=>{const g=__game;g.running=false;g.enemies.forEach(e=>e.health=0);g.ambushStarted=true;g.stage=2;g.active=2;g.car.lockState='ready';g.boardCar();g.enterGunner(0);
  let crashes=0,last=g.car.integrity;const visited=new Set();for(let i=0;i<60*90;i++){g.updateDriving(1/60);visited.add(g.car.ai.target);if(g.car.integrity<last-5)crashes++;last=g.car.integrity;}
  const lap=visited.size;g.returnToDriver();g.car.group.position.set(6.6,0,-20);g.car.yaw=-Math.PI/2;g.car.speed=0;for(let i=0;i<60;i++){g.keys.add('KeyW');g.updateDriving(1/60);}g.keys.clear();g.enterGunner(1);
  const start=g.car.group.position.clone();for(let i=0;i<60*20;i++)g.updateDriving(1/60);
  return{gate:g.car.gate,lap,crashes,moved:g.car.group.position.distanceTo(start),mode:g.car.driverMode};});
 expect(result.gate).toBe(3);expect(result.lap).toBeGreaterThanOrEqual(10);expect(result.crashes).toBe(0);expect(result.moved).toBeGreaterThan(15);expect(result.mode).toBe('AI');
});
test('rivals stay on the surface while patrolling and bodies rest on the ground',async({page})=>{
 await enter(page);const result=await page.evaluate(async()=>{const {moveEnemy}=await import('/src/enemies.js');const {updateRagdolls,lowestPoint}=await import('/src/ragdoll.js');const {groundHeight}=await import('/src/ground.js');const g=__game;g.running=false;
  for(let i=0;i<60*40;i++){g.elapsed+=1/60;for(const e of g.enemies)moveEnemy(g,e,1/60);}
  const drift=Math.max(...g.enemies.map(e=>Math.abs(e.body.position.y))),below=Math.min(...g.enemies.map(e=>e.group.position.y-groundHeight(e.group.position.x,e.group.position.z)));
  g.enemies.forEach((e,i)=>g.defeatEnemy(e,0,e.group.position.clone().add(new (e.group.position.constructor)(i%2?2:-2,0,i%3?2:-2))));for(let i=0;i<60;i++)updateRagdolls(g,1/60);
  return{drift,below,rest:g.enemies.map(e=>lowestPoint(e.group,true)-groundHeight(e.group.position.x,e.group.position.z)),poses:new Set(g.enemies.map(e=>e.ragdoll.pose)).size,stains:g.stains.length};});
 expect(result.drift).toBeLessThan(.05);expect(result.below).toBeGreaterThanOrEqual(0);for(const r of result.rest){expect(r).toBeGreaterThan(-.01);expect(r).toBeLessThan(.06);}expect(result.poses).toBeGreaterThan(1);expect(result.stains).toBe(6);
});
