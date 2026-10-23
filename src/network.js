import * as THREE from 'three';
import {assistAim} from './cover.js';
import {renderCircuit,puzzleAction} from './hotwire.js';
import {rapPresentation} from './performance.js';
import {aimPoint,alignWeapon} from './handling.js';
import {ROSTER} from './combat.js';
import {createContact,updateContact} from './contacts.js';
import {ALLEY_STOPS,alleyInstruction} from './alley.js';
import {ACTIVITIES} from './street.js';
import {OBJECTIVES} from './mission.js';
import {PeerLink,makeRoomCode,normalizeCode} from './peer-link.js';
import {renderHeatMeter,updateZone} from './territory.js';
import {CLAIM_POINTS,waveCount,beginClaimBlock,clearEnemies} from './campaign.js';
import {beginPursuit,launchChase,beginStudio,spawnCops,unlockFreeRoam} from './pursuit.js';
const $=s=>document.querySelector(s),finite=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
const KEYS=new Set(['Digit4','KeyR','KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','Space','KeyC','KeyV','KeyE','KeyQ','KeyR','KeyJ','KeyK','KeyL','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Digit1','Digit2','Digit3']);
export class CoopSession{
 constructor(game){this.game=game;this.events=[];this.peers=new Map();this.slots=[];this.assignments={};this.slot=null;this.remoteInput=false;this.sequence=0;this.lastSequence=-1;this.commands=[];this.clock=0;}
 get host(){return this.socket?.readyState===1&&this.slot===0;}
 get character(){return this.assignments[this.slot]??this.slot;}
 get guest(){return this.socket?.readyState===1&&this.slot>0;}
 aiming(index){const peer=[...this.peers.entries()].find(([id])=>(this.assignments[id]??id)===index)?.[1];return !!peer?.aiming&&performance.now()-peer.received<500;}
 controlled(index){return this.host&&this.slots.some(slot=>slot!==0&&(this.assignments[slot]??slot)===index);}
 resetButtons(){const start=$('#start'),restart=$('#restart');if(start){start.disabled=false;start.innerHTML='ENTER CHIRAQ <span>→</span>';}if(restart){restart.disabled=false;restart.innerHTML='RUN IT BACK <span>→</span>';}}
 requestCharacter(index){if(index===0||this.slots.some(id=>id!==this.slot&&(id===0?this.hostActive:(this.assignments[id]??id))===index)){this.game.toast('That character is controlled by another player. Draco is reserved for the host.');return;}this.commands.push(`Digit${index+1}`);}
 status(text){$('#coop-status').textContent=text;}
 // HOST GAME: create a room code; this browser is the host and the relay.
 hostGame(){this.disconnect();const code=makeRoomCode();this.attach(new PeerLink({host:true,code}),code,'Creating your room…');return code;}
 // JOIN GAME: connect to the host who owns this code.
 joinGame(text){const code=normalizeCode(text);if(code.length!==6){this.status('Enter the 6-character code from the host.');return false;}this.disconnect();this.attach(new PeerLink({host:false,code}),code,`Joining ${code}…`);return true;}
 // Advanced: a self-hosted WebSocket relay (server/relay.js).
 connect(url,room=''){
  this.disconnect();let endpoint;try{endpoint=new URL(url);if(!['ws:','wss:'].includes(endpoint.protocol))throw Error();if(location.protocol==='https:'&&endpoint.protocol!=='wss:')throw Error();}catch{this.status(location.protocol==='https:'?'Relay addresses on this site must start with wss:// (see WHAT IS A RELAY ADDRESS?).':'Relay addresses start with ws:// or wss://, e.g. ws://192.168.1.25:8787.');return;}
  const socket=new WebSocket(endpoint);socket.onerror=()=>this.status('Relay unavailable. Check its address and that it is running.');this.attach(socket,room,'Connecting to relay…');
 }
 attach(socket,room,message){
  this.socket=socket;this.sequence=0;this.lastSequence=-1;this.status(message);clearInterval(this.backgroundPump);this.backgroundPump=setInterval(()=>{if(this.host&&document.hidden)this.game.tick();},50);
  socket.onopen=()=>socket.send(JSON.stringify({type:'join',room}));
  socket.onclose=()=>{if(this.socket!==socket)return;const guest=this.slot>0;this.socket=null;this.slot=null;this.slots=[];this.peers.clear();clearInterval(this.backgroundPump);this.resetButtons();if(guest)this.game.pause();if(!this.errorShown)this.status('Session ended. Single-player remains available.');this.errorShown=false;this.game.onRoom?.(null);};
  socket.onmessage=event=>{let packet;try{packet=JSON.parse(event.data);}catch{return;}
   if(packet.type==='welcome'){this.slot=packet.slot;this.room=packet.room;if(this.slot>0){$('#start').disabled=true;$('#start').textContent='WAITING FOR HOST';}this.status(this.slot===0?`You are hosting as King Draco. Share the room code; press ENTER CHIRAQ when everyone is in.`:`Joined room ${packet.room} as ${['King Draco','Lil doom','Z78'][this.slot]}. Waiting for the host to start.`);this.game.onRoom?.({room:packet.room,slot:this.slot});}
   if(packet.type==='members'){this.slots=packet.slots;this.game.onRoom?.({room:this.room,slot:this.slot,players:packet.slots.length});if(this.host){for(const slot of this.slots)if(this.assignments[slot]===undefined)this.assignments[slot]=slot;for(const key of Object.keys(this.assignments))if(!this.slots.includes(Number(key)))delete this.assignments[key];if(this.controlled(this.game.active)&&!this.game.rap)this.game.active=[0,1,2].find(i=>!this.controlled(i))??0;}for(const slot of this.peers.keys())if(!this.slots.includes(slot))this.peers.delete(slot);}
   if(packet.type==='input'&&this.host){const input=packet.input;if(!input||!this.slots.includes(packet.slot))return;this.peers.set(packet.slot,{aimSession:this.peers.get(packet.slot)?.aimSession,...input,received:performance.now(),commands:(Array.isArray(input.commands)?input.commands:[]).filter(c=>KEYS.has(c)||/^Puzzle:(node|slot|rotate|down|enter|up):\d{1,2}:\d{1,2}$/.test(c)).slice(0,12)});}
   if(packet.type==='snapshot'&&this.guest&&packet.state?.seq>this.lastSequence){this.lastSequence=packet.state.seq;this.apply(packet.state);}
   if(packet.type==='error'){this.status(packet.message);this.errorShown=true;this.game.onRoom?.(null);}
  };
 }
 disconnect(){this.commands.length=0;this.events.length=0;this.locallyPaused=false;this.voiceKey=null;this.musicEpoch=null;this.resetButtons();clearInterval(this.backgroundPump);if(this.socket){const socket=this.socket;this.socket=null;socket.close();}this.slot=null;this.slots=[];this.assignments={};this.peers.clear();}
 send(packet){if(this.socket?.readyState===1&&this.socket.bufferedAmount<128000)this.socket.send(JSON.stringify(packet));}
 routeKey(event){
  if(this.remoteInput)return false;
  if(this.guest){if(event.code==='Escape'){if(this.game.carWork?.phase==='wire'){this.commands.push('Escape');return true;}return false;}if(/^Digit[123]$/.test(event.code)&&!this.game.carWork&&!this.game.rap){if(!event.repeat)this.requestCharacter(Number(event.code.slice(-1))-1);return true;}if(KEYS.has(event.code)&&!event.repeat)this.commands.push(event.code);if(KEYS.has(event.code))this.game.keys.add(event.code);return true;}
  if(this.host){const owner=this.game.rap?(this.game.rap.purpose==='studio'?this.game.pursuit.turn%3:this.game.rap.owner??1):this.game.carWork?2:null;if(owner!==null&&this.controlled(owner)&&event.code!=='Escape')return true;}
  return false;
 }
 pack(){const g=this.game;return{toast:{text:$('#toast-text').textContent,time:g.toastTime},voice:{...g.voices.last,until:g.voices.until},seq:++this.sequence,sentAt:Date.now(),assignments:this.assignments,result:{title:$('#result-title').textContent,detail:$('#result-detail').textContent,tag:$('#result-tag').textContent},level:g.level,stage:g.stage,active:g.active,running:g.running,started:g.started,finished:g.finished,elapsed:g.elapsed,kills:g.kills,shots:g.shots,hits:g.hits,ambushStarted:g.ambushStarted,driveByKills:g.driveByKills,defeatedNames:g.defeatedNames,
  characters:g.characters.map(p=>({position:p.group.position.toArray(),rotation:p.group.rotation.toArray().slice(0,3),body:p.body.position.toArray(),bodyRotation:p.body.rotation.toArray().slice(0,3),arms:p.arms.rotation.toArray().slice(0,3),armPosition:p.arms.position.toArray(),health:p.health,maxHealth:p.maxHealth,kills:p.kills,specialKills:p.specialKills,xp:p.xp,slot:p.slot,loadout:p.loadout,draw:p.draw,reloading:p.reloading,crouched:p.crouched,peek:p.peek,slide:p.slide,onFireUntil:p.onFireUntil,rapBoostReady:p.rapBoostReady,aiState:this.controlled(p.index)?'CO-OP':p.aiState,guns:p.guns.map(g=>g.group.quaternion.toArray())})),
  enemies:g.enemies.map(e=>({position:e.group.position.toArray(),rotation:e.group.rotation.toArray().slice(0,3),health:e.health,variant:e.variant,alias:e.alias,special:e.special,driveBy:e.driveBy,claimWave:e.claimWave,alleyGuard:e.alleyGuard})),
  car:{position:g.car.group.position.toArray(),yaw:g.car.yaw,speed:g.car.speed,gate:g.car.gate,integrity:g.car.integrity,lockState:g.car.lockState,door:g.car.door.rotation.y},driving:g.driving,gunner:g.gunner,claim:g.claim?{...g.claim,alley:g.claim.alley?{...g.claim.alley,guards:g.claim.alley.guards.map(e=>g.enemies.indexOf(e))}:null}:null,
  pursuit:g.pursuit?{...g.pursuit,cops:g.pursuit.cops.map(c=>({position:c.group.position.toArray(),yaw:c.group.rotation.y,disabled:c.disabled,parts:c.parts.map(p=>p.userData.police.health)}))}:null,
  rap:g.rap,carWork:g.carWork,street:g.street?{money:g.street.money,completed:g.street.completed,cooldowns:g.street.cooldowns,heat:g.street.heat?{value:g.street.heat.value,level:g.street.heat.level,escape:g.street.heat.escape,exit:g.street.heat.exit,spawned:[],spawnTimer:0,grace:0}:null,active:g.street.active?{...g.street.active,package:undefined,enemies:g.street.active.enemies.map(e=>g.enemies.indexOf(e)),watchers:(g.street.active.watchers||[]).map(e=>g.enemies.indexOf(e))}:null}:null,events:this.events.splice(0,32)};
 }
 apply(s){const g=this.game;if(![1,2,3].includes(s.level)||!Array.isArray(s.characters)||s.characters.length!==3)return;
  if(s.level!==g.level){if(s.level===1)g.resetMission();if(s.level===2)beginClaimBlock(g);if(s.level===3)beginPursuit(g);clearEnemies(g);}
  if(s.pursuit&&g.pursuit){const phase=s.pursuit.phase;if(['chase','toStudio','studio','free'].includes(phase)&&g.pursuit.phase==='entry')launchChase(g);while(g.pursuit.spawned<s.pursuit.spawned)spawnCops(g);if(['studio','free'].includes(phase)&&!['studio','free'].includes(g.pursuit.phase))beginStudio(g);if(phase==='free'&&g.pursuit.phase!=='free')unlockFreeRoam(g);}
  for(const key of ['stage','started','finished','elapsed','kills','shots','hits','ambushStarted','driveByKills','defeatedNames','driving','rap','carWork'])g[key]=s[key];
  if(g.rap)g.rap.time+=Math.max(0,Math.min(.4,(Date.now()-s.sentAt)/1000));
  this.hostActive=s.active;this.assignments=s.assignments||{};g.running=s.running&&!this.locallyPaused;g.active=s.rap?(s.rap.purpose==='studio'?s.active:s.rap.owner??1):s.driving&&s.level===3?0:this.character;g.gunner=s.driving&&g.active!==2;
  if(g.enemies.length>s.enemies.length)clearEnemies(g);
  while(g.enemies.length<s.enemies.length){const e=s.enemies[g.enemies.length];g.enemySerial=e.variant-1;g.spawnEnemy(e.position[0],e.position[2]);}
  s.enemies.forEach((e,i)=>{const p=g.enemies[i];Object.assign(p,{health:e.health,alias:e.alias,special:e.special,driveBy:e.driveBy,claimWave:e.claimWave,alleyGuard:e.alleyGuard});p.netPosition=new THREE.Vector3(...e.position);p.group.rotation.set(...e.rotation);if(e.health<=0)p.group.position.copy(p.netPosition);});
  s.characters.forEach((p,i)=>{const actor=g.characters[i];if(i===this.character&&p.health<actor.health)g.damageTime=.3;for(const key of ['health','maxHealth','kills','specialKills','xp','slot','loadout','draw','reloading','crouched','peek','slide','onFireUntil','rapBoostReady','aiState'])actor[key]=p[key];actor.netPosition=new THREE.Vector3(...p.position);actor.group.rotation.set(...p.rotation);actor.body.position.fromArray(p.body);actor.body.rotation.set(...p.bodyRotation);actor.arms.rotation.set(...p.arms);actor.arms.position.fromArray(p.armPosition);actor.guns=actor.weaponRigs[actor.slot];actor.weaponRigs.forEach((rig,slot)=>rig.forEach(gun=>gun.group.visible=!s.rap&&slot===actor.slot));actor.guns.forEach((gun,n)=>gun.group.quaternion.fromArray(p.guns[n]));actor.legs.forEach(l=>{l.visible=!s.driving||s.level===3&&i===0;if(s.driving){l.rotation.x=0;l.userData.shin.rotation.x=0;}});});
  g.car.netPosition=new THREE.Vector3(...s.car.position);for(const key of ['yaw','speed','gate','integrity','lockState'])g.car[key]=s.car[key];g.car.group.rotation.y=s.car.yaw;
  if(s.claim)g.claim={...s.claim,alley:s.claim.alley?{...s.claim.alley,guards:s.claim.alley.guards.map(i=>g.enemies[i])}:null};
  if(s.pursuit){const cops=g.pursuit.cops;s.pursuit.cops.forEach((c,i)=>{const p=cops[i];p.netPosition=new THREE.Vector3(...c.position);p.group.rotation.y=c.yaw;p.disabled=c.disabled;c.parts.forEach((h,j)=>p.parts[j].userData.police.health=h);});g.pursuit={...s.pursuit,cops};}
  if(g.claim?.alley?.step===2&&!g.alleyClient?.group.parent){g.alleyClient=createContact(g,30,-47,3,'MOSS / NIGHT COURIER');g.claimProps.push(g.alleyClient.group);}
  g.car.door.rotation.y=s.car.door||0;
  if(s.street&&g.street)Object.assign(g.street,{...s.street,active:s.street.active?{...s.street.active,destination:s.street.active.destination?new THREE.Vector3(s.street.active.destination.x,s.street.active.destination.y,s.street.active.destination.z):null,enemies:s.street.active.enemies.map(i=>g.enemies[i]).filter(Boolean),watchers:(s.street.active.watchers||[]).map(i=>g.enemies[i]).filter(Boolean)}:null,heat:s.street.heat?{...s.street.heat,exit:new THREE.Vector3(s.street.heat.exit.x,0,s.street.heat.exit.z)}:g.street.heat});
  $('#menu').classList.toggle('hidden',s.started);$('#hud').classList.toggle('hidden',!s.started);$('#rap-panel').classList.toggle('hidden',!s.rap);$('#car-work-panel').classList.toggle('hidden',!s.carWork);$('#drive-panel').classList.toggle('hidden',!s.driving);
  $('#result').classList.toggle('hidden',!s.finished);if(s.finished){$('#restart').disabled=true;$('#restart').textContent='HOST RESTARTS THE RUN';}if(s.finished){$('#result-title').textContent=s.result.title;$('#result-detail').textContent=s.result.detail;$('#result-tag').textContent=s.result.tag;}
  if(s.toast){$('#toast-text').textContent=s.toast.text;g.toastTime=s.toast.time;}
  if(s.voice?.id&&this.voiceKey!==`${s.voice.id}:${s.voice.until}`){this.voiceKey=`${s.voice.id}:${s.voice.until}`;g.voices.say(s.voice.id,s.voice.text,s.voice.speaker,{force:true,duration:Math.max(.1,s.voice.until-s.elapsed)});}
  if(s.pursuit?.phase==='studio'&&this.musicEpoch!==s.pursuit.studioStart&&g.audio){this.musicEpoch=s.pursuit.studioStart;const music=g.music,grid=60/148/4,t=Math.max(0,s.elapsed-s.pursuit.studioStart+(Date.now()-s.sentAt)/1000-.04);for(const node of music.nodes){try{node.stop();}catch{}}music.nodes.clear();music.step=Math.ceil(t/grid);music.nextTime=g.audio.currentTime+music.step*grid-t;music.schedule();}
  for(const e of s.events||[]){g.tracer(new THREE.Vector3(...e.from),new THREE.Vector3(...e.to),e.color);const index=ROSTER.findIndex(p=>p.color===e.color);if(index>=0){const p=g.characters[index];p.flashTime=.08;p.guns[0].flash.visible=true;if(index===this.character){g.sound(p.loadout[p.slot].id);g.input.rumble();}}}
 }
 simulate(dt){if(!this.host)return;const g=this.game;
  for(const [peer,input]of this.peers){let slot=this.assignments[peer]??peer;
   if(!g.carWork&&!g.rap){for(const code of input.commands.filter(c=>/^Digit[123]$/.test(c))){const requested=Number(code.slice(-1))-1;const occupied=this.slots.some(id=>id!==peer&&(id===0?g.active:(this.assignments[id]??id))===requested);if(!occupied&&requested!==0){this.assignments[peer]=requested;slot=requested;}}input.commands=input.commands.filter(c=>!/^Digit[123]$/.test(c));}
   if(performance.now()-input.received>500)continue;if(g.level===3&&g.pursuit.phase==='studio'){
    if(g.active===slot){this.remoteInput=true;const actual=g.rap.time;g.rap.time=Math.max(actual-.4,Math.min(actual,Number(input.rapTime)||actual));for(const code of input.commands.splice(0))window.dispatchEvent(new KeyboardEvent('keydown',{code}));g.rap.time=actual;this.remoteInput=false;}continue;}
   const saved={active:g.active,keys:g.keys,yaw:g.yaw,pitch:g.pitch,shooting:g.shooting,aiming:g.aiming,aimSession:g.aimSession,padMove:g.padMove,remoteMove:g.remoteMove};
   g.active=slot;g.keys=new Set((Array.isArray(input.keys)?input.keys:[]).filter(k=>KEYS.has(k)));g.yaw=finite(input.yaw,-10000,10000);g.pitch=finite(input.pitch,-.85,.65);g.shooting=!!input.shooting;g.aiming=!!input.aiming;g.aimSession=input.aimSession||null;g.padMove=null;g.remoteMove=input.move&&Number.isFinite(input.move.x)&&Number.isFinite(input.move.z)?{x:finite(input.move.x,-1,1),z:finite(input.move.z,-1,1)}:null;
   this.remoteTarget=Array.isArray(input.target)&&input.target.length===3&&input.target.every(Number.isFinite)?new THREE.Vector3(...input.target):null;
   if(this.remoteTarget&&this.remoteTarget.distanceTo(g.player.group.position)>150)this.remoteTarget=null;
   const actualRapTime=g.rap?.time;if(g.rap)g.rap.time=Math.max(g.rap.time-.4,Math.min(g.rap.time,Number(input.rapTime)||g.rap.time));
   this.remoteInput=true;for(const code of input.commands.splice(0)){if(g.carWork&&slot!==2)continue;if(g.rap&&slot!==(g.rap.owner??1))continue;if(code.startsWith('Puzzle:')){const [,action,a,b]=code.split(':');puzzleAction(g,action,Number(a),Number(b));continue;}window.dispatchEvent(new KeyboardEvent('keydown',{code}));}this.remoteInput=false;if(actualRapTime!==undefined&&g.rap)g.rap.time=actualRapTime;
   if(g.carWork&&slot===2)g.updateCarWork(dt);
   if(g.rap&&g.rap.purpose!=='studio')g.rap.owner??=slot;
   if(!g.rap&&!g.carWork&&g.running){
    if(!g.driving)g.updatePlayer(dt);
    else if(g.level!==3||slot===0){const p=g.player;p.group.rotation.y=g.yaw;p.arms.rotation.x=g.pitch;if(g.shooting&&p.draw<=0&&p.cooldown<=0&&p.reloading<=0)g.shoot(p);}
   }
   // Restore the host view. Mission state and authoritative interactions remain shared.
   input.aimSession=g.aimSession;this.remoteTarget=null;Object.assign(g,saved);
  }
 }
 poll(dt){this.clock+=dt;if(this.clock<.05)return;this.clock=0;const g=this.game;
  if(this.host)this.send({type:'snapshot',state:this.pack()});
  if(this.guest)this.send({type:'input',input:{keys:[...g.keys],yaw:g.yaw,pitch:g.pitch,shooting:g.shooting,aiming:g.aiming,rapTime:g.rap?.time,move:g.input.device==='controller'?g.padMove:null,target:aimPoint(g).toArray(),commands:this.commands.splice(0,12)}});
 }
 renderPrompts(){
  // Text prompts and markers come from updateNavigation (shared with the host);
  // guests only keep world rings and markers in sync with the snapshot.
  const g=this.game;
  g.routeMarkers.forEach((m,i)=>{m.ring.visible=g.level===1&&g.stage===2&&g.driving&&i===g.car.gate;m.label.visible=false;});
  g.terminals.forEach((m,i)=>{m.marker.visible=false;m.ring.visible=g.level===1&&!g.driving&&i===g.stage&&g.stage>0;});
  if(g.level===2)g.claimMarkers.forEach((m,i)=>{m.ring.visible=i===g.claim.point;m.label.visible=false;});
  if(g.street)g.street.props.forEach(m=>{if(m.userData.activity!==undefined)m.visible=!g.street.active&&!(g.street.cooldowns[m.userData.activity]>g.elapsed);});
  if(g.rap?.purpose==='studio'&&g.pursuit.turn%3!==this.character)$('#rap-feedback').textContent=`${ROSTER[g.pursuit.turn%3].name} ON THE MIC · WAIT FOR YOUR TURN`;
 }
 render(dt){const g=this.game;for(const p of g.characters){p.flashTime=Math.max(0,p.flashTime-dt);p.guns.forEach(gun=>gun.flash.visible=p.flashTime>0);}g.voices.tick();for(const p of g.street?.contacts||[])updateContact(g,p,dt);g.crowd?.update(dt);if(g.street)renderHeatMeter(g);updateZone(g);if(g.alleyClient?.group.parent)updateContact(g,g.alleyClient,dt);if(g.rap&&g.running)g.rap.time+=dt;for(const p of [...g.characters,...g.enemies])if(p.netPosition){const moving=p.group.position.distanceTo(p.netPosition)>.025;p.group.position.lerp(p.netPosition,1-Math.exp(-dt*18));if(!g.driving&&(!g.rap||g.rap.purpose==='studio'))p.legs.forEach((leg,i)=>{leg.rotation.x=p.slide>0?1.35:p.crouched?-.95:moving&&p.health>0?Math.sin((g.elapsed+this.clock)*9+i*Math.PI)*.45:0;if(leg.userData.shin)leg.userData.shin.rotation.x=p.crouched?1.55:0;});}g.damageTime=Math.max(0,g.damageTime-dt);if(g.car.netPosition)g.car.group.position.lerp(g.car.netPosition,1-Math.exp(-dt*18));for(const c of g.pursuit?.cops||[])if(c.netPosition)c.group.position.lerp(c.netPosition,1-Math.exp(-dt*18));g.music.setDucked(!!g.rap&&g.rap.purpose!=='studio',.12);if(g.audio){if(g.running&&!g.music.active)g.music.start(g.audio);else if(!g.running&&g.music.active)g.music.stop();}if(g.running&&g.aiming)assistAim(g,g.player,dt);g.updateCamera(dt);g.updateHUD();rapPresentation(g,dt);if(g.carWork?.phase==='wire')renderCircuit(g);this.renderPrompts();}
}
