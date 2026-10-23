export const SPECIAL_NAMES=['Static','Switchback','Vex'];
export const KILL_LINES=[['That lane’s clear. Stay locked in.','On bro, watch the right.','Keep slidin. I got this corner.'],['You both good? Don’t get caught out.','Shorty was tweakin. Watch the alley.','Whole crew valid. Keep it moving.'],['Clear road. Come on, folks.','Stay close. I’m bringing us through.','Back lane’s open. We can spin out.']];
export const TAUNTS=['You can’t hide behind that ride!','Draco, you still outside?','Go round the side. They’re boxed in!','You trippin if you think this lane’s clear!','They’re at the corner. Stay locked in!'];
export const STREET_BARS=[['Locked in, streetlights paint the lane.','Crew kept pace, put respect on the name.','No cap, whole block hear the refrain.','Corner stay lit, we don’t play the same.'],['Doom in the pocket, I don’t chase the beat.','Foenem by the corner, let the bass line breathe.','New page, same crew, got the whole block with me.','Mic still warm, hear the crowd on repeat.'],['Z took the turn, kept the whole crew steady.','Night run finished, got the next verse ready.','One more spin, hear the kick drum heavy.','Engine still hot, and the block stay ready.']];
// Crew reactions after a cypher: [hype, encouragement] per crew member.
export const CYPHER_REACTIONS=[['Ayy, that’s valid! Whole block heard that.','Run it back, bro. You got it.'],['Yeah! Snapped on that one!','Shake it off. Next one’s yours.'],['He cooking right now! Let’s go!','Lock in. Catch the next one.']];
const base=(import.meta.env?.BASE_URL||'/')+'audio/';
export class CrewVoices{
  constructor(game){this.game=game;this.buffers=new Map();this.playing=new Set();this.next=0;}
  async load(id){if(this.buffers.has(id))return this.buffers.get(id);const response=await fetch(base+id+'.ogg');if(!response.ok)return null;const buffer=await this.game.audio.decodeAudioData(await response.arrayBuffer());this.buffers.set(id,buffer);return buffer;}
  async say(id,text,speaker=0,{force=false,duration=3.4,rate=1,gain:level=.85}={}){
    const g=this.game,generation=this.generation;if(!force&&g.elapsed<this.next){if(id.startsWith('kill-'))this.pending={id,text,speaker};return;}this.next=g.elapsed+3;
    this.last={id,text,speaker};document.querySelector('#bark-text').textContent=text;document.querySelector('#bark').classList.remove('hidden');this.until=g.elapsed+duration;if(g.rap?.purpose==='studio')document.querySelector('#bark').classList.add('hidden');
    if(!g.audio)return;
    try{const buffer=await this.load(id);if(!buffer||!g.running||generation!==this.generation)return;
      const source=g.audio.createBufferSource(),gain=g.audio.createGain();source.buffer=buffer;source.playbackRate.value=rate;gain.gain.value=level;
      source.connect(gain).connect(g.audio.destination);source.start();this.playing.add(source);source.onended=()=>this.playing.delete(source);
    }catch{/* Subtitles remain available if audio decoding fails. */}
  }
  // Ambient one-shots (crowd) play alongside dialogue without subtitles.
  async play(id,{gain:level=.7}={}){const g=this.game,generation=this.generation;if(!g.audio)return;try{const buffer=await this.load(id);if(!buffer||generation!==this.generation)return;const source=g.audio.createBufferSource(),gain=g.audio.createGain();source.buffer=buffer;gain.gain.value=level;source.connect(gain).connect(g.audio.destination);source.start();this.playing.add(source);source.onended=()=>this.playing.delete(source);}catch{/* Optional ambience. */}}
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
