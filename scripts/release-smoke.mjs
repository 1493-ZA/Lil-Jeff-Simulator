// Production-path smoke and native-resolution visual captures. This deliberately
// stages campaign phases; the browser suite separately tests mission progression.
import {chromium} from '@playwright/test';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(`${r.url()}: ${r.failure()?.errorText}`));
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:4187/Lil-Jeff-Simulator/?test=1&quality=low');await page.waitForFunction(()=>!!window.__game);await page.locator('#start').click();await page.waitForFunction(()=>__game.music.samples.size===6);
 const studio=await page.evaluate(()=>{const g=__game;g.level=3;g.reset();g.running=false;g.car.lockState='ready';g.boardCar();for(let i=0;i<600&&g.pursuit.phase!=='studio';i++){g.pursuit.cops.forEach(c=>c.disabled=true);g.updateDriving(1/60);}if(g.pursuit.phase!=='studio')throw Error('Studio staging failed');g.updateObjectives(2.5);g.updateCamera(1);g.updateHUD();g.renderer.render(g.scene,g.camera);return{phase:g.pursuit.phase,portraitCount:document.querySelectorAll('.portrait svg').length,skulls:g.characters.map(p=>p.body.getObjectByName('sculpted skull and jaw')?.geometry.type),fade:!!g.characters[1].body.getObjectByName('doom black fade crown'),scales:g.characters.map(p=>p.body.scale.toArray())};});
 await page.screenshot({path:'test-results/release-studio.png'});
 const street=await page.evaluate(()=>{const g=__game;g.pursuit.completed=[true,true,true];g.pursuit.credEarned=180;g.rap.time=10;g.updateObjectives(.02);g.updateCamera(1);g.updateHUD();g.renderer.render(g.scene,g.camera);return{phase:g.pursuit.phase,contacts:g.street.contacts.length,patrols:g.enemies.filter(e=>e.streetPatrol).length,clearOfCar:g.characters.every(p=>p.group.position.distanceTo(g.car.group.position)>3),activities:g.street.props.filter(m=>m.userData.activity!==undefined).length,mapVisible:!document.querySelector('#minimap-panel').classList.contains('hidden')};});
 await page.screenshot({path:'test-results/release-free-roam.png'});
 console.log(JSON.stringify({studio,street,errors},null,2));if(errors.length)throw Error('Production browser errors');
}finally{await browser.close();}
