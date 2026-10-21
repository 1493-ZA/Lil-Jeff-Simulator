import {STREET_BARS} from './dialogue.js';
export function updateRapFeedback(rap,times,dt){
 rap.results??=Array(8).fill(null);rap.flash=Math.max(0,(rap.flash||0)-dt);
 for(let i=0;i<8;i++)if(!rap.judged[i]&&rap.time>times[i]+.23){rap.judged[i]=true;rap.results[i]=false;rap.flash=.22;rap.lastSuccess=false;rap.feedback='MISSED · catch the next beat';}
}
export function markRap(rap,index,success){rap.results??=Array(8).fill(null);rap.results[index]=success;rap.lastSuccess=success;rap.flash=.25;}
export function rapPresentation(game,dt){
 if(!game.rap)return;
 const p=game.characters[game.rap.purpose==='studio'?game.active:game.rap.owner??1],performing=game.rap.time>=(game.rap.leadIn||1.5);
 if(game.rap.purpose!=='studio'){
  const r=game.rap,index=r.owner??1,line=Math.min(2,Math.max(0,Math.floor((r.time-1.5)/1.75)));
  if(r.time>=1.5&&(r.spoken??-1)<line){r.spoken=line;game.voices.say(`street-${index}-${line}`,`${['Draco','doom','Z78'][index]}: ${STREET_BARS[index][line]}`,index,{force:true,duration:1.75});}
  if(r.time>=1.5)document.querySelector('#rap-lyric').textContent=STREET_BARS[index][line];
  if(r.hits>=5&&!r.cheered){r.cheered=true;game.toast(`Crew: That’s valid! ${game.characters[index].xp} cred and still outside.`,3);}
 }
 p.weaponRigs.flat().forEach(g=>g.group.visible=false);
 p.arms.rotation.x=performing?-.45+Math.sin(game.elapsed*9)*.22:-.2;
 p.leftArm.rotation.x=performing?Math.sin(game.elapsed*5)*.35:0;
 p.body.rotation.z=performing?Math.sin(game.elapsed*7)*.035:0;
 const panel=document.querySelector('#rap-panel');panel.classList.toggle('rap-good',game.rap.flash>0&&game.rap.lastSuccess);panel.classList.toggle('rap-bad',game.rap.flash>0&&!game.rap.lastSuccess);
 const lead=game.rap.leadIn||1.5;if(game.rap.time<lead)document.querySelector('#rap-feedback').textContent=`GET READY · ${Math.ceil((lead-game.rap.time)*2)}`;
}
export function renderNotes(pattern,times,r,input){return pattern.map((code,i)=>`<span class="rap-note ${r.results?.[i]===true?'hit':r.results?.[i]===false?'miss':''}" style="left:${20+(times[i]-r.time)*24}%">${input?.device==='controller'?{KeyJ:'ⓧ',KeyK:'Ⓨ',KeyL:'Ⓑ'}[code]:code.slice(-1)}</span>`).join('');}
