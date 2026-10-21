export const SPECIAL_NAMES=['Static','Switchback','Vex'];
export const KILL_LINES=[['He’s down. Watch the alley.','I got him. Check the right side.','Keep moving. I’ll cover you.'],['He’s down. You both good?','Watch that corner. Stay sharp.','I got you. Stay behind me.'],['Clear on my side. Let’s move.','Stay close. Don’t get caught out.','Watch behind us. I got the front.']];
export const TAUNTS=['I see you behind that car!','Draco! You ain’t walking out of here!','Get around them! Don’t let them through!','Stay on them! Don’t let them leave!','They’re on the corner! Push up!'];
const base=(import.meta.env?.BASE_URL||'/')+'audio/';
export class CrewVoices{
  constructor(game){this.game=game;this.buffers=new Map();this.playing=new Set();this.next=0;}
  async load(id){if(this.buffers.has(id))return this.buffers.get(id);const response=await fetch(base+id+'.ogg');if(!response.ok)return null;const buffer=await this.game.audio.decodeAudioData(await response.arrayBuffer());this.buffers.set(id,buffer);return buffer;}
  async say(id,text,speaker=0,{force=false,duration=3.4,rate=1}={}){
    const g=this.game,generation=this.generation;if(!force&&g.elapsed<this.next){if(id.startsWith('kill-'))this.pending={id,text,speaker};return;}this.next=g.elapsed+3;
    this.last={id,text,speaker};document.querySelector('#bark-text').textContent=text;document.querySelector('#bark').classList.remove('hidden');this.until=g.elapsed+duration;if(g.rap?.purpose==='studio')document.querySelector('#bark').classList.add('hidden');
    if(!g.audio)return;
    try{const buffer=await this.load(id);if(!buffer||!g.running||generation!==this.generation)return;
      const source=g.audio.createBufferSource(),gain=g.audio.createGain();source.buffer=buffer;source.playbackRate.value=rate;gain.gain.value=.85;
      source.connect(gain).connect(g.audio.destination);source.start();this.playing.add(source);source.onended=()=>this.playing.delete(source);
    }catch{/* Subtitles remain available if audio decoding fails. */}
  }
  stop(){this.generation=(this.generation||0)+1;for(const source of this.playing){try{source.stop();}catch{}}this.playing.clear();this.pending=null;}
  tick(){if(this.pending&&this.game.elapsed>=this.next&&!this.game.rap){const line=this.pending;this.pending=null;this.say(line.id,line.text,line.speaker);}if(this.game.elapsed>this.until)document.querySelector('#bark').classList.add('hidden');}
}
export function killDialogue(game,victim,index){
  const p=game.characters[index];
  if(victim.alias){game.defeatedNames??=[];if(!game.defeatedNames.some(e=>e.name===victim.alias))game.defeatedNames.push({name:victim.alias,killer:index});}
  p.streak=game.elapsed-(p.lastKillAt??-100)<12?(p.streak||0)+1:1;p.lastKillAt=game.elapsed;
  if(p.streak>=3){p.onFireUntil=game.elapsed+20;p.rapBoostReady=true;game.toast(`${['Draco','doom','Z78'][index]} ON FIRE · bonus street cred in the booth`,4);}
  const line=(p.kills-1)%3;game.voices.say(`kill-${index}-${line}`,`${['Draco','doom','Z78'][index]}: ${KILL_LINES[index][line]}`,index);
}
export function combatBarks(game){
  game.voices.tick();if(game.rap||game.level===3||game.elapsed<(game.nextTaunt||5))return;
  game.nextTaunt=game.elapsed+9;
  if(!game.enemies.some(e=>e.health>0&&e.group.position.distanceTo(game.player.group.position)<24))return;
  const n=(game.tauntIndex||0)%TAUNTS.length;game.tauntIndex=n+1;game.voices.say(`taunt-${n}`,`Opp: ${TAUNTS[n]}`,3);
}
