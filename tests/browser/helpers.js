export async function solveCircuit(page){
 await page.waitForFunction(()=>__game.carWork?.phase==='wire');
 const order=await page.evaluate(()=>__game.carWork.order);
 for(const [i,color]of ['AMBER','CYAN','VIOLET'].entries()){await page.keyboard.press(`Digit${i+1}`);await page.keyboard.press(['KeyJ','KeyK','KeyL'][order.indexOf(color)]);}
}
