import {test,expect} from '@playwright/test';
async function free(page){await page.goto('/?test=1&quality=low');await page.waitForFunction(()=>!!window.__game);await page.evaluate(()=>__game.renderer.setPixelRatio(.6));await page.locator('#start').click();
 await page.evaluate(async()=>{const {beginPursuit,launchChase,unlockFreeRoam}=await import('/src/pursuit.js');const g=__game;g.enemies.forEach(e=>e.cooldown=Infinity);beginPursuit(g);launchChase(g);g.studioProps={visible:true};unlockFreeRoam(g);g.running=false;});}

test('free roam has no police cars and every parked car can be stolen, driven and left',async({page})=>{
 await free(page);
 const result=await page.evaluate(async()=>{
  const g=__game,{stealableCars}=await import('/src/carjack.js');
  const police=[];g.scene.traverse(o=>{if(o.name==='police pursuit car')police.push(o);});
  const cars=stealableCars(g),out={police:police.length,cops:g.pursuit.cops.length,stealable:cars.length};
  // Z78 steals the blue Opp Block muscle car.
  g.running=true;g.switchCharacter(2);g.running=false;out.active=g.active;const car=g.parkedCars.find(e=>e.car.group.position.x>55).car,collider=g.parkedCars.find(e=>e.car===car).collider;
  g.player.group.position.set(car.group.position.x-2,0,car.group.position.z);g.keys.add('KeyE');g.interact();out.work=g.carWork?.phase;
  for(let i=0;i<120&&g.carWork?.phase==='break';i++)g.updateCarWork(1/60);g.keys.clear();out.afterBreak=g.carWork?.phase;
  g.carWork.connected=[0,1,2];g.updateCarWork(1/60);
  out.driving=g.driving;out.isCar=g.car===car;out.colliderGone=!g.colliders.includes(collider);
  // Drive west out of the Opp Block, through the Commerce Row passage, onto our block.
  car.group.position.set(56,0,-31);car.yaw=Math.PI/2;g.keys.add('KeyW');
  for(let i=0;i<60*14;i++){g.updateDriving(1/60);if(car.group.position.x<0)break;}
  g.keys.clear();out.x=car.group.position.x;
  g.interact();out.exited=!g.driving;const entry=g.parkedCars.find(e=>e.car===car);out.parkedAgain=g.colliders.includes(entry.collider)&&entry.collider.containsPoint(car.group.position.clone().setY(.5));
  // Starting a story mission again puts the cars back.
  const {clearPursuit}=await import('/src/pursuit.js');g.studioProps=null;clearPursuit(g);out.home=car.group.position.x;out.locked=car.lockState;
  return out;
 });
 expect(result.police).toBe(0);expect(result.cops).toBe(0);expect(result.stealable).toBeGreaterThanOrEqual(7);
 expect(result.work).toBe('break');expect(result.afterBreak).toBe('wire');
 expect(result.driving).toBe(true);expect(result.isCar).toBe(true);expect(result.colliderGone).toBe(true);
 expect(result.x).toBeLessThan(5);expect(result.exited).toBe(true);expect(result.parkedAgain).toBe(true);
 expect(result.home).toBeGreaterThan(55);expect(result.locked).toBe('locked');
});

test('the cross street drives from our block to the Opp Block; H despawns a car; pause menu respawns the crew',async({page})=>{
 await free(page);
 const r=await page.evaluate(async()=>{
  const g=__game,{despawnCar,respawnCrew}=await import('/src/carjack.js');
  g.running=true;g.switchCharacter(2);g.running=false;
  const entry=g.parkedCars.find(e=>e.car.group.position.x<0),car=entry.car,home=car.group.position.clone();
  g.player.group.position.set(car.group.position.x+2,0,car.group.position.z);g.keys.add('KeyE');g.interact();
  for(let i=0;i<120&&g.carWork?.phase==='break';i++)g.updateCarWork(1/60);g.keys.clear();g.carWork.connected=[0,1,2];g.updateCarWork(1/60);
  // From the middle of our street, turn east onto the cross street and drive to the Opp Block.
  car.group.position.set(0,0,-30);car.yaw=-Math.PI/2;g.keys.add('KeyW');
  for(let i=0;i<60*16;i++){g.updateDriving(1/60);if(car.group.position.x>52)break;}
  g.keys.clear();const reached=car.group.position.x;
  despawnCar(g);const back=car.group.position.distanceTo(home),driving=g.driving,colliderBack=g.colliders.includes(entry.collider);
  g.characters.forEach(p=>p.group.position.set(70,0,10));respawnCrew(g);
  return {reached,back,driving,colliderBack,crew:g.characters.map(p=>p.group.position.z)};
 });
 expect(r.reached).toBeGreaterThan(50);expect(r.back).toBeLessThan(.01);expect(r.driving).toBe(false);expect(r.colliderBack).toBe(true);expect(r.crew).toEqual([-18,-18,-18]);
});

test('shooting a pedestrian drops them and sends nearby pedestrians running',async({page})=>{
 await free(page);
 const r=await page.evaluate(async()=>{
  const g=__game,T=await import('/node_modules/.vite/deps/three.js');const crowd=g.crowd,p=crowd.people[0],q=crowd.people[1];
  p.group.visible=q.group.visible=true;q.group.position.copy(p.group.position).add(new T.Vector3(3,0,0));
  const target=p.group.position.clone().add(new T.Vector3(0,1.2,0)),origin=target.clone().add(new T.Vector3(0,0,6));
  const ray=new T.Raycaster(origin,target.clone().sub(origin).normalize());g.scene.updateMatrixWorld(true);
  const hit=crowd.hit(ray,50);crowd.kill(hit.person,origin,hit.point,ray.ray.direction);
  return {hit:hit.person===p,dead:p.dead,panic:q.panic};
 });
 expect(r.hit).toBe(true);expect(r.dead).toBe(true);expect(r.panic).toBeGreaterThan(0);
});
