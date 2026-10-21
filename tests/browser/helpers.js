export async function solveCircuit(page){
 await page.waitForFunction(()=>__game.carWork?.phase==='wire');
 const type=await page.evaluate(()=>__game.carWork.type||'circuit');
 if(type==='sequence'){await page.waitForFunction(()=>__game.carWork.timer>=1.8);const sequence=await page.evaluate(()=>__game.carWork.sequence);for(const i of sequence)await page.keyboard.press(`Digit${i+1}`);return;}
 if(type==='timing'){await page.evaluate(()=>new Promise(resolve=>{const poll=()=>{const t=__game.carWork;if(!t){resolve();return;}const v=(t.timer*.65)%1;if(v>.4&&v<.6&&t.timer>(t.lastTestPress||-1)+.12){t.lastTestPress=t.timer;window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space'}));}requestAnimationFrame(poll);};poll();}));return;}
 const order=await page.evaluate(()=>__game.carWork.order);
 for(const [i,color]of ['AMBER','CYAN','VIOLET'].entries()){await page.keyboard.press(`Digit${i+1}`);await page.keyboard.press(['KeyJ','KeyK','KeyL'][order.indexOf(color)]);}
}
