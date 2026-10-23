import {test,expect} from '@playwright/test';
import {PeerServer} from 'peer';
async function enter(page,query=''){await page.goto('/?test=1&quality=low'+query);await page.waitForFunction(()=>!!window.__game);await page.evaluate(()=>__game.renderer.setPixelRatio(.5));await page.locator('#start').click();await page.evaluate(()=>__game.enemies.forEach(e=>e.cooldown=Infinity));}
async function free(page){await enter(page);await page.evaluate(async()=>{const {beginPursuit,unlockFreeRoam}=await import('/src/pursuit.js');beginPursuit(__game);__game.studioProps={visible:true};unlockFreeRoam(__game);});}
test('crossing blocks shows a subtle notice; Opp Block heat climbs to max, forces an escape and clears outside',async({page})=>{
 await free(page);
 // Software rendering compiles many shaders on the first free-roam frames; allow time.
 await page.evaluate(()=>{__game.player.group.position.set(36,0,-31);});await expect(page.locator('#zone-notice')).toHaveText('NOW ENTERING: COMMERCE ROW',{timeout:30000});
 await page.evaluate(()=>{__game.player.group.position.set(50,0,-31);});await expect(page.locator('#zone-notice')).toHaveText('NOW ENTERING: OPP BLOCK',{timeout:30000});await expect(page.locator('#heat-meter')).toBeVisible();
 const result=await page.evaluate(async()=>{const S=await import('/src/street.js');const g=__game;g.running=false;const levels=new Set();
  for(let i=0;i<60*170&&!g.street.heat.escape;i++){g.elapsed+=1/60;S.updateStreet(g,1/60);levels.add(g.street.heat.level);}
  const escape=g.street.heat.escape,spawned=g.street.heat.spawned.length,chasing=g.enemies.filter(e=>e.heatSpawn&&e.chase).length;g.updateHUD();
  const title=document.querySelector('#objective-title').textContent,marker=document.querySelector('#destination-indicator').textContent;
  g.player.group.position.set(36,0,-31);for(let i=0;i<60*20;i++){g.elapsed+=1/60;S.updateStreet(g,1/60);}
  return{levels:[...levels].sort(),escape,spawned,chasing,title,marker,after:g.street.heat.value,stillEscape:g.street.heat.escape};});
 expect(result.levels).toEqual([0,1,2,3,4]);expect(result.escape).toBe(true);expect(result.spawned).toBeGreaterThanOrEqual(4);expect(result.chasing).toBeGreaterThan(0);
 expect(result.title).toBe('GET OUT THE OPP BLOCK');expect(result.marker).toContain('GET OUT THE OPP BLOCK');expect(result.after).toBe(0);expect(result.stillEscape).toBe(false);
});
test('civilians come from the modular catalog and never copy a named crew member',async({page})=>{
 await free(page);const result=await page.evaluate(async()=>{const N=await import('/src/npc.js');const g=__game;const signatures=new Set();
  for(let i=0;i<300;i++)signatures.add(N.lookSignature(N.randomLook(i)));
  const people=[...g.crowd.people,...g.street.contacts];
  const crewHair=people.some(p=>p.hair||p.body.getObjectByName('doom black fade crown'));
  const reserved=people.some(p=>N.RESERVED.tops.includes(p.look.top)||N.RESERVED.hair.includes(p.look.hair));
  return{unique:signatures.size,hair:N.HAIR_STYLES.length,outfits:N.OUTFITS.length,crowd:g.crowd.people.length,crewHair,reserved,distinctNearby:new Set(people.map(p=>N.lookSignature(p.look))).size,total:people.length};});
 expect(result.hair).toBeGreaterThanOrEqual(15);expect(result.outfits).toBeGreaterThanOrEqual(15);expect(result.unique).toBeGreaterThan(290);
 expect(result.crewHair).toBe(false);expect(result.reserved).toBe(false);expect(result.distinctNearby).toBe(result.total);expect(result.crowd).toBeGreaterThan(4);
});
test('ammo stash flow: secure the guards, interact, then see the restocked reserve',async({page})=>{
 await free(page);const result=await page.evaluate(async()=>{const S=await import('/src/street.js');const g=__game;g.running=false;const A=S.ACTIVITIES.find(a=>a.guarded);g.player.loadout.forEach(s=>s.spares=0);g.player.group.position.set(A.x,0,A.z);
  S.streetInteract(g);const guards=g.street.active.enemies.length;const title=(S.streetHUD(g),document.querySelector('#objective-description').textContent);
  S.streetInteract(g);const blocked=g.player.loadout.every(s=>s.spares===0);g.street.active.enemies.forEach(e=>g.defeatEnemy(e,0));S.streetInteract(g);
  return{guards,title,blocked,spares:g.player.loadout.map(s=>s.spares),banner:document.querySelector('#completion-banner').textContent};});
 expect(result.guards).toBe(3);expect(result.title).toContain('Secure');expect(result.blocked).toBe(true);expect(result.spares.every(n=>n>0)).toBe(true);expect(result.banner).toContain('RESERVE AMMO: +');
});
test('alley handoffs vary between quiet, watched, ambushed and chased runs',async({page})=>{
 await free(page);const result=await page.evaluate(async()=>{const S=await import('/src/street.js');const g=__game;g.running=false;g.active=2;const out={};
  for(const encounter of S.ENCOUNTERS){g.street.cooldowns={};g.street.deliverySerial=2;g.player.group.position.set(12,0,-18);S.streetInteract(g);g.elapsed+=1.2;S.updateStreet(g,.016);const a=g.street.active;a.encounter=encounter;
   g.player.group.position.copy(a.destination);S.streetInteract(g);g.elapsed+=1.2;S.updateStreet(g,.016);
   out[encounter]={hostile:a.enemies.filter(e=>e.health>0).length,watchers:a.watchers.filter(e=>e.passive).length,phase:a.phase};
   a.enemies.forEach(e=>g.defeatEnemy(e,0));g.player.group.position.copy(a.destination);S.streetInteract(g);g.elapsed+=1.2;S.updateStreet(g,.016);
   if(g.street.active?.phase==='chase'){out[encounter].chase=g.street.active.enemies.filter(e=>e.health>0&&e.chase).length;g.street.active.enemies.forEach(e=>g.defeatEnemy(e,0));S.updateStreet(g,.016);}
   out[encounter].done=!g.street.active;}
  return out;});
 expect(result.quiet).toMatchObject({hostile:0,watchers:0,done:true});expect(result.suspicious.watchers).toBe(2);expect(result.ambush.hostile).toBe(3);expect(result.chase.chase).toBe(3);for(const r of Object.values(result))expect(r.done).toBe(true);
});
test('railway: no building crosses the deck and the station stairs reach the platform',async({page})=>{
 await free(page);const result=await page.evaluate(()=>{const g=__game;g.running=false;const deck=g.railBoxes[0];
  const crossing=g.colliders.filter(b=>!g.railBoxes.includes(b)&&b.max.y>deck.min.y&&b.min.y<deck.max.y&&b.max.x>deck.min.x&&b.min.x<deck.max.x&&b.max.z>deck.min.z&&b.min.z<deck.max.z).length;
  const p=g.player;const walk=(yaw,n)=>{g.yaw=yaw;g.keys=new Set(['KeyW']);for(let i=0;i<n;i++)g.updatePlayer(1/60);g.keys.clear();for(let i=0;i<20;i++)g.updatePlayer(1/60);};
  p.group.position.set(-14,0,-62.5);walk(Math.PI/2,90);const landing=p.group.position.y;p.group.position.set(-23.2,4.2,-60.5);p.grounded=true;walk(-Math.PI/2,140);walk(Math.PI,40);
  return{crossing,landing,platform:p.group.position.y,z:p.group.position.z};});
 expect(result.crossing).toBe(0);expect(result.landing).toBeCloseTo(4.2,1);expect(result.platform).toBeCloseTo(8.4,1);expect(result.z).toBeGreaterThan(-59.6);
});
test('HOST GAME gives a room code and a second browser joins with only that code',async({browser})=>{
 test.setTimeout(180000);const server=PeerServer({port:9123,host:'127.0.0.1',path:'/'});
 try{
  const pages=[];for(let i=0;i<2;i++){const p=await browser.newPage({viewport:{width:960,height:600}});await p.goto('/?test=1&quality=low&peer=127.0.0.1:9123',{timeout:60000});await p.waitForFunction(()=>!!window.__game);await p.evaluate(()=>__game.renderer.setPixelRatio(.4));pages.push(p);}
  const [host,guest]=pages;
  await host.locator('.coop-settings>summary').click();await host.locator('#coop-host').click();await expect(host.locator('#coop-room-card')).toBeVisible({timeout:20000});
  const code=(await host.locator('#coop-room-code').textContent()).trim();expect(code).toMatch(/^[2-9A-Z]{6}$/);
  await guest.locator('.coop-settings>summary').click();await guest.locator('#coop-code').fill(code.toLowerCase());await guest.locator('#coop-join').click();
  await guest.waitForFunction(()=>__game.net.slot===1,null,{timeout:30000});await expect(guest.locator('#coop-players')).toContainText('LIL DOOM');
  await host.waitForFunction(()=>__game.net.slots.length===2);await host.locator('#start').click();
  await guest.waitForFunction(()=>__game.started&&__game.level===1,null,{timeout:20000});
  await host.evaluate(()=>__game.defeatEnemy(__game.enemies[0],0));await guest.waitForFunction(()=>__game.enemies[0]?.health===0,null,{timeout:10000});
  await guest.evaluate(()=>__game.net.disconnect());await host.waitForFunction(()=>__game.net.slots.length===1,null,{timeout:15000});
  await host.evaluate(()=>__game.net.disconnect());
 }finally{await new Promise(r=>server.close?.(r)??r());}
});
