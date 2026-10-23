import * as THREE from 'three';
import {STREET_BARS,CYPHER_REACTIONS} from './dialogue.js';
import {beatTime,BEAT_SECONDS} from './mission.js';
// mission.js imports this module too, so nothing from it is read at load time.
const NAMES=['Draco','doom','Z78'];
export function updateRapFeedback(rap,times,dt){
 rap.results??=Array(8).fill(null);rap.flash=Math.max(0,(rap.flash||0)-dt);
 for(let i=0;i<8;i++)if(!rap.judged[i]&&rap.time>times[i]+.23){rap.judged[i]=true;rap.results[i]=false;rap.flash=.22;rap.lastSuccess=false;rap.feedback='MISSED · catch the next beat';}
}
export function markRap(rap,index,success){rap.results??=Array(8).fill(null);rap.results[index]=success;rap.lastSuccess=success;rap.flash=.25;}
// Street cypher sequence: approach the mic → beat starts → four bars of vocals
// (one bar per two notes) while the notes are judged → crew and crowd react.
export const STREET_BAR=.65*2,STREET_OUTRO=1.7;
const MIC_SPOT=new THREE.Vector3(-11,0,-23.9);
export function streetRapDone(game,rap){
 const end=beatTime(7)+.45;
 if(rap.time>=end&&!rap.reacted){rap.reacted=true;crowdReaction(game,rap,rap.hits>=6);}
 return rap.time>end+STREET_OUTRO;
}
export function crowdReaction(game,rap,success){
 const performer=rap.owner??1,crew=[0,1,2].filter(i=>i!==performer),speaker=crew[(rap.hits+performer)%2];
 game.voices.play(success?'crowd-cheer':'crowd-aww',{gain:.7});
 game.voices.say(`react-${speaker}-${success?0:1}`,`${NAMES[speaker]}: ${CYPHER_REACTIONS[speaker][success?0:1]}`,speaker,{force:true,duration:2.2});
 // Nearby locals throw their hands up for a good verse.
 for(const p of game.street?.contacts||[])if(p.group.position.distanceTo(game.player.group.position)<20)p.cheerUntil=game.elapsed+(success?2.6:.8);
 for(const p of game.characters)if(p.index!==performer)p.cheerUntil=game.elapsed+(success?2:0);
}
// A half-time cypher groove locked to the note grid (92 BPM), built from the
// game's own synthesized drum samples.
function cypherBeat(game,rap,previous){
 const audio=game.audio,music=game.music;if(!audio||audio.state!=='running'||music.muted)return;
 const step=BEAT_SECONDS/2,origin=beatTime(0)-BEAT_SECONDS*2,last=beatTime(7)+BEAT_SECONDS*2;
 const from=Math.floor((previous-origin)/step)+1,to=Math.floor((rap.time-origin)/step);
 for(let n=Math.max(0,from);n<=to;n++){
  const t=origin+n*step;if(t>last)break;const bar=n%8,when=audio.currentTime+Math.max(0,t-rap.time);
  const hits=[['hat',.32]];if(bar===0||bar===3||bar===5&&n%16>8)hits.push(['kick',.9]);if(bar===2||bar===6)hits.push(['snare',.75]);if(bar===7)hits.push(['openhat',.25]);if(bar===6&&n%16===14)hits.push(['clap',.5]);
  for(const [name,level]of hits){const buffer=music.samples.get(name);if(!buffer)continue;const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=buffer;gain.gain.value=level*music.volume*.9;source.connect(gain).connect(audio.destination);source.start(when);}
 }
}
export function rapPresentation(game,dt){
 if(!game.rap)return;
 const studio=game.rap.purpose==='studio',p=game.characters[studio?game.active:game.rap.owner??1],performing=game.rap.time>=(game.rap.leadIn||1.5);
 if(!studio){
  const r=game.rap,index=r.owner??1,line=Math.min(3,Math.max(0,Math.floor((r.time-beatTime(0))/STREET_BAR)));
  cypherBeat(game,r,r.lastBeatTime??r.time-dt);r.lastBeatTime=r.time;
  // Walk up to the mic during the count-in (street mics only).
  if(r.purpose!=='claim'&&r.time<1.3){r.approachFrom??=p.group.position.clone();const k=Math.min(1,r.time/1.1);p.group.position.lerpVectors(r.approachFrom,MIC_SPOT.clone().setY(r.approachFrom.y),k*k*(3-2*k));p.group.rotation.y=THREE.MathUtils.damp(p.group.rotation.y,0,8,dt);p.legs.forEach((leg,i)=>leg.rotation.x=k<1?Math.sin(r.time*11+i*Math.PI)*.4:0);}
  if(r.time>=beatTime(0)&&(r.spoken??-1)<line&&r.time<beatTime(7)+.4){r.spoken=line;game.voices.say(`street-${index}-${line}`,`${NAMES[index]}: ${STREET_BARS[index][line]}`,index,{force:true,duration:STREET_BAR,gain:1.1});}
  if(r.time>=beatTime(0))document.querySelector('#rap-lyric').textContent=STREET_BARS[index][line];
  if(r.hits>=5&&!r.cheered){r.cheered=true;game.voices.play('crowd-cheer',{gain:.35});}
 }
 p.weaponRigs.flat().forEach(g=>g.group.visible=false);
 p.arms.rotation.x=performing?-.45+Math.sin(game.elapsed*9)*.22:-.2;
 p.leftArm.rotation.x=performing?Math.sin(game.elapsed*5)*.35:0;
 p.body.rotation.z=performing?Math.sin(game.elapsed*7)*.035:0;
 // The rest of the crew bob to the beat and react.
 if(!studio)for(const c of game.characters)if(c!==p&&!game.driving){c.body.position.y=Math.abs(Math.sin(game.rap.time*Math.PI/BEAT_SECONDS))*.025;if(game.elapsed<(c.cheerUntil||0)){c.leftArm.rotation.x=-1.6;}}
 const panel=document.querySelector('#rap-panel');panel.classList.toggle('rap-good',game.rap.flash>0&&game.rap.lastSuccess);panel.classList.toggle('rap-bad',game.rap.flash>0&&!game.rap.lastSuccess);
 const lead=game.rap.leadIn||1.5;if(game.rap.time<lead)document.querySelector('#rap-feedback').textContent=`GET READY · ${Math.ceil((lead-game.rap.time)*2)}`;
}
export function renderNotes(pattern,times,r,input){return pattern.map((code,i)=>`<span class="rap-note ${r.results?.[i]===true?'hit':r.results?.[i]===false?'miss':''}" style="left:${20+(times[i]-r.time)*24}%">${input?.device==='controller'?{KeyJ:'ⓧ',KeyK:'Ⓨ',KeyL:'Ⓑ'}[code]:code.slice(-1)}</span>`).join('');}
