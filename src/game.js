import * as THREE from 'three';
import { ROSTER, WEAPONS, createLoadout, fireRound, reload, needsReload } from './combat.js';
import { buildNeighborhood } from './neighborhood.js';
import { animateLocomotion,acceleratedStep,weaponCarry } from './animation.js';
import { buildHair, buildWeapon, DOOR_OPEN } from './models.js';
import { OBJECTIVES, RAP_PATTERN, RAP_LINES, BEAT_SECONDS, RAP_PASS, DRIVE_ROUTE, combatTarget, combatComplete, beatTime, createRap, judgeRap, advanceCar } from './mission.js';

import { CLAIM_POINTS, livingOpps, missionOneCleared, waveCount, beginClaimBlock, updateClaimBlock, clearClaimProps } from './campaign.js';
import { fabricProps } from './fabrics.js';
import { loadEnvironment } from './assets.js';
import { ENEMY_HEALTH, hitLocation, woundDamage } from './combat.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { toggleCover, updateCover, updateCoverSnap, assistAim } from './cover.js';
import { CrewVoices, killDialogue, combatBarks } from './dialogue.js';
import { beginPursuit, clearPursuit, launchChase, updateChaseDriving, updatePursuit, pursuitHUD, policeRayHit, judgeStudio } from './pursuit.js';
import { DrillMusic } from './music.js';
import { moveEnemy } from './enemies.js';
import { updateVehicleCrew } from './vehicle-crew.js';
import { updateCompanions } from './companions.js';
import { XP_CAP, XP_REWARDS, XP_KEY, readCharges, awardCharge, narrationDuration } from './progression.js';

import { updateRapFeedback,rapPresentation,renderNotes,streetRapDone } from './performance.js';
import {CoopSession} from './network.js';
import {setQuality,batchStatic} from './quality.js';
import {streetInteract,clearStreet} from './street.js';
import {alleyInteract,alleyInstruction} from './alley.js';
import { ActionInput } from './input.js';
import { createBypass,circuitInput,renderCircuit,resetEntryPose,PUZZLE_INFO } from './hotwire.js';
import {updateNavigation} from './navigation.js';
import { aimPoint, alignWeapon, shotSpread, updateHandling } from './handling.js';
import { groundHeight, plantOnGround } from './ground.js';
import { autoDrive, resumeRoute, carExtents } from './driver.js';
import { beginRagdoll, updateRagdolls } from './ragdoll.js';
import { impactDroplets, groundStain, updateBlood, clearBlood } from './blood.js';
import { updateZone, addHeat } from './territory.js';

const $ = selector => document.querySelector(selector);
const UP = new THREE.Vector3(0, 1, 0);
const clamp = THREE.MathUtils.clamp;
const damp = THREE.MathUtils.damp;
const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));


export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    const lowDetail = new URLSearchParams(location.search).get('quality') === 'low';
    this.renderer.setPixelRatio(lowDetail ? .65 : Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = !lowDetail;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = .94;
    const pmrem=new THREE.PMREMGenerator(this.renderer),room=new RoomEnvironment();
    this.environmentMap=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#6f898b');
    this.scene.fog = new THREE.FogExp2('#718888', 0.012);
    this.camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 220);
    this.lastFrame = performance.now();
    this.keys = new Set();
    this.colliders = [];
    this.enemies = [];
    this.effects = [];this.effectPool=[];
    this.characters = [];
    this.active = 0;
    this.yaw = 0;
    this.pitch = -0.13;
    this.running = false;
    this.started = false;
    this.finished = false;
    this.shooting = false;
    this.aiming = false;
    this.stage = 0;
    this.level=1;this.claim=null;this.carWork=null;this.missionOneKills=null;
    this.progress = 0;
    this.elapsed = 0;
    this.shots = 0;
    this.hits = 0;
    this.kills = 0;
    this.rap = null;
    this.rapScore = 0;
    this.driving = false;
    this.reinforcementTimer = 0;
    this.gunner = false;
    this.driveByKills = 0;
    this.ambushStarted = false;
    this.narrationQueue = [];
    this.dialogueLog = [];
    this.toastTime = 0;
    this.hitTime = 0;
    this.damageTime = 0;
    this.audio = null;
    this.music=new DrillMusic();this.voices=new CrewVoices(this);this.defeatedNames=[];
    this.narrationDurations=new Map();
    this.lookHold=0;
    this.raycaster = new THREE.Raycaster();
    // Known before the world is built so models can pick their level of detail.
    {let saved='medium';try{saved=localStorage.getItem('lil-jeff-quality')||'medium';}catch{}const q=new URLSearchParams(location.search).get('quality')||saved;this.quality=['low','medium','high'].includes(q)?q:'medium';}
    this.buildWorld();this.scene.environment=this.environmentMap;this.scene.environmentIntensity=.38;
    this.buildCrew();
    this.buildEnemies();
    this.net=new CoopSession(this);this.input=new ActionInput(this);this.bindInput();
    this.resize();
    let savedQuality='medium';try{savedQuality=localStorage.getItem('lil-jeff-quality')||'medium';}catch{}
    setQuality(this,new URLSearchParams(location.search).get('quality')||savedQuality);
    this.updateCamera(1);
    this.updateHUD();
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.setAnimationLoop(() => this.tick());
    loadEnvironment(this);
  }

  material(color, extra = {}) {
    // Cloth colours get real fabric textures: fleece tops, denim pants, leather on request.
    this.fabric??=new Set(['#3c4043','#354d49','#353342','#3c444c','#1559de','#2349bd','#0867e4','#244b9f','#1b62e6','#173f96','#2156cb','#1248b5','#2869e8','#183b87']);
    this.denim??=new Set(['#303a43']);
    const {fabric:requested,...rest}=extra;
    const kind=requested||(this.denim.has(color)?'denim':this.fabric.has(color)?'fleece':null);
    return new THREE.MeshStandardMaterial({ color, roughness: kind?.94:.72,...(kind?fabricProps(kind):{}), ...rest });
  }

  box(width, height, depth, color, x, y, z, { solid = false, parent = this.scene, ...extra } = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), this.material(color, extra));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    if (solid) this.colliders.push(new THREE.Box3().setFromObject(mesh));
    return mesh;
  }

  cylinder(radius, height, color, x, y, z, parent = this.scene) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 10), this.material(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  label(text, color, width, x, y, z, size = 44) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#10262bea';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = color;
    ctx.font = `bold ${size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    return mesh;
  }

  buildWorld() { buildNeighborhood(this); }

  // `look` (civilians, see npc.js) overrides colours and adds modular hair,
  // clothing layers and accessories; crew identities are never reproduced.
  buildPerson(color, enemy = false, identity = -1, look = null) {
    const group = new THREE.Group(), body = new THREE.Group();
    group.add(body);
    const variant=Math.abs(identity)%10;
    const cloth=look?.top??(enemy?['#1559de','#2349bd','#0867e4','#244b9f','#1b62e6','#173f96','#2156cb','#1248b5','#2869e8','#183b87'][variant]:identity===0?'#3c4043':identity===1?'#354d49':'#353342');
    const skin=look?.skin??(enemy?['#886a58','#634637','#b08a6a','#78513e','#98725c','#553e33'][variant%6]:identity===1?'#9b765b':'#79513d');
    const pants=look?.pants??'#303a43',shoes=look?.shoes??'#202730',sole=look?.sole??'#aba99e';
    const round=(x,y,z,sx,sy,sz,tint,parent=body)=>{
      const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),this.material(tint));
      mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;parent.add(mesh);return mesh;
    };
    const torso=new THREE.Mesh(new THREE.LatheGeometry([[.22,-.35],[.235,-.2],[.275,.1],[.295,.24],[.18,.35]].map(([r,y])=>new THREE.Vector2(r,y)),20),this.material(cloth));
    torso.name='torso';torso.scale.x=look?.build??(enemy?[1,.91,1.08,.96,1.04,.94][variant%6]:1);torso.scale.z=.72;torso.position.y=1.23;torso.castShadow=true;body.add(torso);
    round(0,.8,.02,.25,.13,.18,look?pants:'#30363d');
    round(0,1.50,.065,.22,.095,.17,cloth);
    this.box(.016,.56,.025,'#a29887',0,1.22,-.225,{parent:body});
    for(const side of [-1,1]){
      this.box(.09,.04,.15,'#24282e',side*.10,1.57,-.14,{parent:body}).rotation.z=side*.4;
      this.box(.10,.12,.025,enemy?'#307aff':'#292f33',side*.14,1.10,-.205,{parent:body});
      round(side*.27,1.49,0,.095,.115,.14,cloth);
    }
    if(enemy&&variant>=6){const hood=round(0,1.65,.09,.21,.20,.14,cloth);hood.name='layered hood';}
    if(enemy&&variant%3===1){const brim=this.box(.25,.025,.14,'#267bff',0,2.035,-.16,{parent:body});brim.rotation.x=.08;}
    this.cylinder(.085,.18,skin,0,1.67,0,body);
    // Sculpted skull profile: chin, mandible, cheeks, temples, crown.
    const profile=[[.055,1.73],[.11,1.76],[.145,1.82],[.155,1.91],[.147,2.01],[.105,2.065],[.025,2.085]];
    const head=new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),20),this.material(skin,{roughness:.82}));
    head.scale.z=1.12;head.name='sculpted skull and jaw';head.castShadow=true;body.add(head);
    round(-.102,1.85,-.10,.055,.052,.045,skin);round(.102,1.85,-.10,.055,.052,.045,skin);
    round(0,1.765,-.077,.083,.033,.064,skin);
    round(-.158,1.91,0,.024,.043,.021,skin);round(.158,1.91,0,.024,.043,.021,skin);
    if(!enemy&&identity===1&&!look){
      const fade=round(0,2.015,.012,.15,.065,.163,'#151519');fade.name='doom black fade crown';
      const hairline=round(0,1.977,.016,.151,.047,.164,'#272326');hairline.name='doom tapered fade';
      round(0,2.035,.012,.146,.053,.158,'#0e0f12');
    }
    if(enemy){const hair=round(0,2,.02,.165,.085,.175,['#17191d','#30241f','#111518'][Math.abs(identity)%3]);hair.name='fitted enemy hair';}
    if(enemy){
      this.box(.32,.055,.025,'#53a0ff',0,1.35,-.215,{parent:body});
      if(variant===1||variant===4)this.box(.32,.13,.025,'#28323e',0,1.82,-.17,{parent:body});
      if(variant===2||variant===5){const chain=this.cylinder(.12,.025,'#b9a781',0,1.56,-.16,body);chain.rotation.x=.7;}
    }
    {
      for(const x of [-.075,.075]) {
        round(x,1.95,-.166,.024,.012,.009,'#ada79b');
        round(x,1.95,-.176,.009,.012,.008,'#242325');
        this.box(.065,.018,.02,'#372d28',x,1.993,-.18,{parent:body});
      }
      round(0,1.91,-.175,.022,.046,.025,skin);round(0,1.88,-.203,.027,.020,.026,skin);
      this.box(.1,.012,.015,'#604337',0,1.81,-.183,{parent:body});
    }
    const hips=new THREE.Group();body.add(hips);
    const legs=[-.17,.17].map(x=>{
      const pivot=new THREE.Group();pivot.position.set(x,.85,0);hips.add(pivot);
      const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.11,.19,6,12),this.material(pants));
      leg.position.y=-.18;leg.castShadow=true;pivot.add(leg);
      const shin=new THREE.Group();shin.position.y=-.4;pivot.add(shin);pivot.userData.shin=shin;
      const calf=new THREE.Mesh(new THREE.CapsuleGeometry(.095,.16,6,12),this.material(look?.shorts?skin:pants));calf.position.y=-.16;calf.castShadow=true;shin.add(calf);
      round(0,0,0,.102,.102,.102,look?.shorts?skin:pants,shin);
      round(0,-.32,-.07,.125,.10,.21,shoes,shin);
      this.box(.21,.035,.32,sole,0,-.39,-.07,{parent:shin});
      batchStatic(shin);return pivot;
    });
    const arms=new THREE.Group();arms.position.set(0,1.5,0);body.add(arms);
    let leftArm=null;
    for(const x of [-.36,.4]) {
      const limb=new THREE.Group();limb.position.x=x;arms.add(limb);if(x<0)leftArm=limb;
      const sleeve=new THREE.Mesh(new THREE.CapsuleGeometry(.105,.38,4,8),this.material(look?.sleeves??cloth));
      sleeve.rotation.x=Math.PI/2;sleeve.position.set(0,-.08,-.24);sleeve.castShadow=true;limb.add(sleeve);
      round(0,-.08,-.53,.068,.065,.09,skin,limb);
      round(x<0?.045:-.045,-.105,-.57,.028,.038,.053,skin,limb);
      for(let f=0;f<3;f++)round((f-1)*.027,-.11,-.60,.017,.023,.027,skin,limb);
      batchStatic(limb,true);
    }
    const guns=look?[]:[buildWeapon(this,'switch',arms,.4)];
    look?.decorate?.(this,{body,round,skin,cloth});
    group.userData.torso=torso;this.scene.add(group);
    batchStatic(body);const person={group,body,hips,legs,arms,guns,leftArm};
    if(!enemy&&(identity===0 || identity===2))person.hair=buildHair(this,person,identity===0?0:1);
    if(enemy&&(variant===0||variant===3||variant===7))person.hair=buildHair(this,person,variant===0?0:1);
    return person;
  }

  buildCrew() {
    let charges=[0,1,2].map(i=>this.characters[i]?.xp || 0);
    try { charges=readCharges(localStorage).map((xp,i)=>Math.max(xp,charges[i])); } catch { /* Keep in-memory charge when storage is disabled. */ }
    this.characters = ROSTER.map((person, i) => {
      const model = this.buildPerson(person.color, false, i);
      const primary = [buildWeapon(this, person.primary, model.arms, .4)];
      if (i === 2) primary.push(buildWeapon(this, person.primary, model.arms, -.36));
      model.guns.forEach(gun => { gun.group.visible = false; });
      return { ...model, guns: primary, weaponRigs: [primary, model.guns], index: i, health: 100, maxHealth:100, crouched:false, peek:false, coverAnchor:null, loadout: createLoadout(person.primary), slot: 0,
        velocityY: 0, grounded: true, slide: 0, slideDirection: new THREE.Vector3(), draw: WEAPONS[person.primary].draw,
        reloading: 0, cooldown: 0, recoil: 0, flashTime: 0, aiCooldown: 0, kills: 0, specialKills: 0, xp: charges[i], onFireUntil:0, streak:0, coverBox:null, lastHitAt: -Infinity, aiPlanCooldown: 0, aiGoal: null, aiState: 'FOLLOWING' };
    });
    this.characters.forEach((character, i) => character.group.position.set((i - 1) * 3, 0, 12 + i * .5));
  }

  spawnEnemy(x, z) {
    const variant=(this.enemySerial=(this.enemySerial||0)+1)%10;
    const enemy = { ...this.buildPerson('#52636a', true,variant),variant,weaponId:['switch','arp','switch','draco','arp','switch','akimbo','arp','draco','switch'][variant], health: ENEMY_HEALTH.street, cooldown: 1.5, flashTime: 0, home: new THREE.Vector3(x, 0, z) };
    if(enemy.weaponId!=='switch'){const old=enemy.guns[0];old.group.removeFromParent();old.group.traverse(m=>{if(m.isMesh){m.geometry.dispose();m.material.dispose();}});enemy.guns=[buildWeapon(this,enemy.weaponId,enemy.arms,.4)];}
    enemy.group.position.copy(enemy.home);plantOnGround(enemy);
    enemy.group.traverse(object=>{if(!object.isMesh)return;object.userData.enemy=enemy;let node=object;while(node&&node!==enemy.group){if(node.name.startsWith('weapon-')){object.userData.weaponPart=true;break;}node=node.parent;}});
    this.enemies.push(enemy);
    return enemy;
  }

  buildEnemies() {
    [[-4, -4], [4, -10], [-3, -17], [5, -24], [-4, -34], [2, -45]].forEach(([x,z],i)=>{
      const enemy=this.spawnEnemy(x,z);
      if(i===3) {
        enemy.special=true; enemy.alias='Static';enemy.health=ENEMY_HEALTH.static;
        enemy.group.userData.torso.material.color.set('#1868ed');
      }
    });
  }

  bindInput() {
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', event => {
      if(['INPUT','SELECT','TEXTAREA'].includes(event.target?.tagName))return;
      if(this.net.routeKey(event))return;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
      if(this.carWork?.phase==='wire'&&this.running){circuitInput(this,event.code);return;}
      if (event.code === 'Escape') { this.pause(); return; }
      if (!this.running) return;
      this.keys.add(event.code);
      if (event.repeat) return;
      if(event.code==='KeyM'){this.music.toggle();this.updateMusicUI();return;}
      if(event.code==='KeyN'){this.toastTime=0;this.showNextNarration();return;}
      if (this.rap) {
        if (['KeyJ', 'KeyK', 'KeyL'].includes(event.code)){if(this.rap.purpose==='studio')judgeStudio(this,event.code);else judgeRap(this.rap,event.code);}
        return;
      }
      if (event.code === 'KeyE') this.interact();
      if((event.code==='KeyV'||event.code==='KeyC'&&!this.keys.has('ShiftLeft')&&!this.keys.has('ShiftRight'))&&!this.driving&&!this.carWork)toggleCover(this);
      if (event.code==='KeyF') this.requestSpecial();
      if (this.driving) {
        if(this.level===3){if(event.code==='KeyQ')this.swapWeapon();if(event.code==='KeyR')this.beginReload();return;}
        if(event.code==='Digit1')this.enterGunner(0);
        if(event.code==='Digit2')this.enterGunner(1);
        if(event.code==='Digit3')this.returnToDriver();
        if(event.code==='KeyQ')this.swapWeapon();
        if(event.code==='KeyR')this.beginReload();
        return;
      }
      if (/^Digit[123]$/.test(event.code)) this.switchCharacter(Number(event.code.slice(-1)) - 1);
      if (event.code === 'KeyQ') this.swapWeapon();
      if (event.code === 'KeyR') this.beginReload();
      if (event.code === 'Space' && this.player.grounded) {
        this.player.crouched=false;
        this.player.velocityY = 7.8;
        this.player.grounded = false;
      }
      if (event.code === 'KeyC' && (this.keys.has('ShiftLeft')||this.keys.has('ShiftRight')) && this.player.grounded && this.player.slide <= 0) {
        const direction = this.moveDirection();
        this.player.slideDirection.copy(direction.lengthSq() > 0 ? direction : new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)));
        this.player.crouched=false;
        this.player.slide = .7;
      }
    });
    window.addEventListener('keyup', event => this.keys.delete(event.code));
    window.addEventListener('blur', () => {if(!this.net.host)this.pause();});
    document.addEventListener('visibilitychange', () => { if (document.hidden&&!this.net.host) this.pause(); });
    document.addEventListener('pointerlockchange', () => {
      // A cursor release we asked for (hotwire puzzle) is not the player leaving.
      if(!document.pointerLockElement&&this.cursorReleased){this.cursorReleased=false;return;}
      if (!document.pointerLockElement && this.running&&!this.net.host&&this.carWork?.phase!=='wire') this.pause();
    });
    document.addEventListener('mousemove', event => {
      if (!this.running || document.pointerLockElement !== this.canvas) return;
      this.lookHold=2;
      this.yaw -= event.movementX * .0023;
      this.pitch = clamp(this.pitch - event.movementY * .002, -.85, .65);
    });
    this.canvas.addEventListener('mousedown', event => {
      if (!this.running) return;
      this.activateAudio();this.captureMouse();
      if (event.button === 0 && !this.rap) this.shooting = true;
      if (event.button === 2 && !this.rap) this.aiming = true;
    });
    window.addEventListener('mouseup', event => {
      if (event.button === 0) this.shooting = false;
      if (event.button === 2){this.aiming = false;this.aimSession=null;}
    });
    window.addEventListener('contextmenu', event => event.preventDefault());
  }

  captureMouse() {
    if(this.input.device==='controller')return;
    try {
      const result = this.canvas.requestPointerLock();
      result?.catch(() => this.toast('Click the game to enable mouse look.'));
    } catch { this.toast('Click the game to enable mouse look.'); }
  }

  activateAudio(){
    try { this.audio ??= new AudioContext(); this.audio.resume();this.music.setDucked(Boolean(this.rap)&&this.rap.purpose!=='studio');this.music.start(this.audio);this.updateMusicUI(); } catch { /* Audio is optional. */ }
  }

  start() {
    if(this.net.guest){this.activateAudio();this.net.locallyPaused=false;$('#pause-menu').classList.add('hidden');return;}
    const resuming=this.started;
    this.started = true;
    this.running = true;
    this.lastFrame = performance.now();
    this.keys.clear();
    $('#menu').classList.add('hidden');
    $('#pause-menu').classList.add('hidden');
    $('#hud').classList.remove('hidden');
    this.captureMouse();
    this.activateAudio();
    if(!resuming)this.toast('Draco: Aight, stay close. Three opps or their shot caller. Then doom gets his verse off and Z gets us out.');
  }

  pause() {
    if (!this.started || this.finished) return;
    if(this.net.guest)this.net.locallyPaused=true;
    this.running = false;
    this.music.stop();this.voices.stop();
    this.shooting = this.aiming = false;
    this.keys.clear();
    if (document.pointerLockElement) document.exitPointerLock();
    $('#pause-menu').classList.remove('hidden');
    const log=$('#narration-log');log.replaceChildren();
    for(const line of this.dialogueLog){const item=document.createElement('p');item.textContent=line;log.append(item);}
  }

  reset() {
    if(this.level===3){beginPursuit(this,true);this.start();return;}
    if(this.level===2){beginClaimBlock(this,true);this.start();return;}
    this.resetMission();
    this.start();
  }

  resetMission() {
    clearStreet(this);clearBlood(this);this.voices.stop();clearPursuit(this);this.defeatedNames=[];this.nextTaunt=5;this.tauntIndex=0;this.music.setScene('street');this.music.stop();this.lookHold=0;this.narrationDurations.clear();
    clearClaimProps(this);this.level=1;this.claim=null;this.carWork=null;this.missionOneKills=null;
    this.running = this.started = this.finished = this.shooting = this.aiming = this.driving = false;
    this.keys.clear();this.aimSession=null;
    this.active = this.stage = this.progress = this.elapsed = this.shots = this.hits = this.kills = 0;
    this.yaw = 0; this.pitch = -.13;
    this.rap = null; this.rapScore = 0;
    this.gunner = false; this.driveByKills = 0; this.ambushStarted = false;
    this.narrationQueue = []; this.dialogueLog = [];
    this.toastTime = this.hitTime = this.damageTime = this.reinforcementTimer = 0;
    if (document.pointerLockElement) document.exitPointerLock();
    for (const actor of [...this.characters, ...this.enemies]) {
      this.scene.remove(actor.group);
      if(actor.badge){this.scene.remove(actor.badge);actor.badge.geometry.dispose();actor.badge.material.map?.dispose();actor.badge.material.dispose();}
      actor.group.traverse(mesh => {
        if (mesh.isMesh) { mesh.geometry.dispose(); mesh.material.dispose(); }
      });
    }
    for (const effect of this.effects) {
      this.scene.remove(effect.mesh); effect.mesh.geometry.dispose(); effect.mesh.material.dispose();
    }
    this.effects = []; this.enemies = [];
    this.buildCrew(); this.buildEnemies();
    Object.assign(this.car, { speed: 0, yaw: 0, gate: 0, integrity: 100, collisionCooldown: 0, ai: null, driverMode: null });
    this.car.lockState='locked';this.car.door.rotation.y=0;this.car.group.visible=true;this.car.windowMeshes.forEach(mesh=>mesh.visible=true);
    this.car.group.position.set(4,0,-38); this.car.group.rotation.set(0,0,0);
    this.routeMarkers.forEach(marker => { marker.ring.visible = marker.label.visible = false; });
    this.terminals.forEach(terminal => { terminal.ring.visible=false;terminal.marker.visible = false; terminal.ring.material.opacity = .4; });
    ['#result', '#pause-menu', '#rap-panel', '#drive-panel', '#car-work-panel', '#interaction', '#hud'].forEach(selector => $(selector).classList.add('hidden'));
    this.updateCamera(1); this.updateHUD();
  }

  returnToMenu() {
    this.net.disconnect();
    this.resetMission();
    $('#menu').classList.remove('hidden');
  }

  // Remove rivals (and their bodies) that no longer matter to the scene.
  removeEnemies(predicate){
    const gone=this.enemies.filter(predicate);if(!gone.length)return;
    for(const e of gone){e.group.removeFromParent();e.group.traverse(m=>{if(m.isMesh){m.geometry.dispose();m.material.dispose();}});}
    this.enemies=this.enemies.filter(e=>!gone.includes(e));
  }

  get player() { return this.characters[this.active]; }
  get weaponState() { return this.player.loadout[this.player.slot]; }
  get weapon() { return WEAPONS[this.weaponState.id]; }

  switchCharacter(index) {
    if(this.net.guest){this.net.requestCharacter(index);return;}
    if(this.net.controlled(index)&&!this.net.remoteInput){this.toast('That character is controlled by another player.');return;}
    if(this.level===3&&this.driving)return;
    if(this.driving){if(index===0||index===1)this.enterGunner(index);if(index===2)this.returnToDriver();return;}
    if (!this.running || index === this.active || this.rap) return;
    if (this.characters[index].health <= 0) { this.toast('Crew member down. Restart to bring everyone home.'); return; }
    this.player.slide = 0;
    this.player.arms.position.x=0;this.player.body.position.set(0,0,0);this.player.body.scale.y=1;this.player.crouched=false;this.player.peek=false;
    this.player.body.rotation.x = 0;
    resetEntryPose(this);this.carWork=null;document.querySelector('#car-work-panel').classList.add('hidden');
    this.player.legs.forEach(leg => { leg.rotation.x = 0; });
    this.active = index;
    this.player.draw = WEAPONS[this.weaponState.id].draw;
    this.shooting = false;
    this.progress = 0;
    this.toast(`${ROSTER[index].name} · ${ROSTER[index].role}`);
    this.updateHUD();
  }

  swapWeapon() {
    this.player.slot = 1 - this.player.slot;
    this.player.guns = this.player.weaponRigs[this.player.slot];
    this.player.draw = this.weapon.draw;
    this.player.reloading = 0;
    this.player.recoil = 0;
  }

  beginReload() {
    if (this.player.draw > 0 || this.player.reloading > 0 || !needsReload(this.weaponState)) return;
    this.player.reloading = this.weapon.reload;
  }

  moveDirection() {
    const x = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    const z = Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) - Number(this.keys.has('KeyW') || this.keys.has('ArrowUp'));
    if(this.remoteMove)return new THREE.Vector3(this.remoteMove.x,0,this.remoteMove.z).clampLength(0,1).applyAxisAngle(UP,this.yaw);
    if(this.input?.device==='controller'&&this.padMove)return new THREE.Vector3(this.padMove.x,0,this.padMove.z).clampLength(0,1).applyAxisAngle(UP,this.yaw);
    return new THREE.Vector3(x, 0, z).normalize().applyAxisAngle(UP, this.yaw);
  }

  moveWithCollision(character, displacement) {
    const pos = character.group.position;
    for (const axis of ['x', 'z']) {
      const old = pos[axis];
      pos[axis] += displacement[axis];
      pos.x = clamp(pos.x, -25.1, this.street?77:this.level===2?33:25.1);
      pos.z = clamp(pos.z, -80, 21.1);
      const feet = pos.y;
      const hits=this.colliders.filter(box => feet < box.max.y && feet + 1.8 > box.min.y && pos.x + .38 > box.min.x && pos.x - .38 < box.max.x && pos.z + .38 > box.min.z && pos.z - .38 < box.max.z);
      if(!hits.length)continue;
      // Step up onto stairs and kerb-height ledges (≤ 0.45) when grounded.
      const top=Math.max(...hits.map(box=>box.max.y));
      const clear=character.grounded!==false&&top-feet<=.45&&!this.colliders.some(box => top < box.max.y && top + 1.8 > box.min.y && pos.x + .38 > box.min.x && pos.x - .38 < box.max.x && pos.z + .38 > box.min.z && pos.z - .38 < box.max.z);
      if(clear)pos.y=top;else pos[axis] = old;
    }
  }

  updatePlayer(dt) {
    const p = this.player;
    const direction = this.moveDirection();
    const moving=direction.lengthSq()>.01;
    const sprinting = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) && moving && !this.aiming;
    if(sprinting){p.crouched=false;p.coverBox=null;p.coverSnap=null;}
    const speed = p.crouched?2.1:this.aiming ? 3.3 : sprinting ? 8 : 5.1;
    const sliding = p.slide > 0;
    const snapping=updateCoverSnap(this,p,dt,moving);
    const step=sliding?p.slideDirection.clone().multiplyScalar(11*(.5+p.slide)*dt):acceleratedStep(p,snapping?new THREE.Vector3():direction,speed,dt);
    this.moveWithCollision(p,step);
    p.slide = Math.max(0, p.slide - dt);
    this.updateGravity(p, dt);
    // Facing: travel direction when moving freely, the aim when aiming/firing.
    // Heavier (slower) turns at sprint speed, a hard plant during a pivot.
    const travel=p.moveVelocity.length();
    const bodyYaw=(!this.aiming&&!this.shooting&&moving)?Math.atan2(-direction.x,-direction.z):this.yaw;
    const turnRate=this.aiming||this.shooting?14:p.pivot>0?18:travel>6?6.5:travel>.5?10:8;
    p.group.rotation.y += angleDelta(p.group.rotation.y, bodyYaw) * (1-Math.exp(-dt*turnRate));
    p.recoil = damp(p.recoil, 0, 6, dt);
    const carry=weaponCarry(p,dt,{aiming:this.aiming,shooting:this.shooting,sprinting,moving});
    p.arms.rotation.x = damp(p.arms.rotation.x, this.pitch + p.recoil - p.body.rotation.x + (p.draw > 0 || p.reloading > 0 ? -.85 : carry), 12, dt);
    updateCover(this,p,dt,moving);animateLocomotion(p,dt,{aiming:this.aiming,crouched:p.crouched,sliding,sprinting});assistAim(this,p,dt);
    if (this.shooting && p.draw <= 0 && p.reloading <= 0 && p.cooldown <= 0) this.shoot(p);
  }

  updateGravity(p, dt) {
    const oldY = p.group.position.y;
    if (!p.grounded) {
      p.velocityY -= 21 * dt;
      p.group.position.y += p.velocityY * dt;
      const platform = this.colliders.filter(box => p.group.position.x + .3 > box.min.x && p.group.position.x - .3 < box.max.x && p.group.position.z + .3 > box.min.z && p.group.position.z - .3 < box.max.z && oldY >= box.max.y - .05 && p.group.position.y <= box.max.y && p.velocityY <= 0).sort((a, b) => b.max.y - a.max.y)[0];
      if (platform) { p.group.position.y = platform.max.y; p.velocityY = 0; p.grounded = true; }
      const floor=groundHeight(p.group.position.x,p.group.position.z);
      if (p.group.position.y <= floor) { p.group.position.y = floor; p.velocityY = 0; p.grounded = true; }
    } else {
      const floor=groundHeight(p.group.position.x,p.group.position.z);
      const onBox=this.colliders.some(box => Math.abs(box.max.y - oldY) < .1 && p.group.position.x > box.min.x - .3 && p.group.position.x < box.max.x + .3 && p.group.position.z > box.min.z - .3 && p.group.position.z < box.max.z + .3);
      // Small kerbs step up; higher drops start a fall. Feet never stay below the surface.
      if(!onBox&&oldY>floor+.15)p.grounded=false;else if(!onBox||oldY<floor)p.group.position.y=floor;
    }
  }

  shoot(character) {
    const state = character.loadout[character.slot];
    const weapon = WEAPONS[state.id];
    const barrel = fireRound(state,this.driving&&character.index===2?0:null);
    character.cooldown = 60 / weapon.rpm;
    if (barrel < 0) {
      if (character === this.player) { this.beginReload(); if (!state.spares) this.toast('Out of ammunition. Q to swap weapons.'); }
      return;
    }
    this.scene.updateMatrixWorld(true);
    const gun = character.guns[barrel];
    let origin = gun.muzzle.getWorldPosition(new THREE.Vector3());
    if(character===this.player&&this.running){if(!this.net.remoteTarget)this.updateCamera(1/60);alignWeapon(this,character,aimPoint(this));}
    origin=gun.muzzle.getWorldPosition(new THREE.Vector3());
    const quaternion = gun.muzzle.getWorldQuaternion(new THREE.Quaternion());
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);
    const moving = character === this.player && this.moveDirection().lengthSq() > 0;
    const support=character!==this.player;
    const spread = shotSpread(weapon,character,{support,moving,aiming:this.aiming});
    direction.x += (Math.random() - .5) * spread;
    direction.y += (Math.random() - .5) * spread;
    direction.z += (Math.random() - .5) * spread;
    direction.normalize();
    let distance = 85;
    let victim = null;
    const ray = new THREE.Ray(origin, direction);
    // Cover is tested from the actual muzzle, never from the camera.
    for (const box of this.colliders) {
      const point = ray.intersectBox(box, new THREE.Vector3());
      if (point) distance = Math.min(distance, origin.distanceTo(point));
    }
    this.raycaster.set(origin, direction);
    const policeHit=policeRayHit(this,origin,direction,distance,weapon.damage);
    if(policeHit){distance=policeHit.distance;this.hitTime=.14;this.hits++;}
    const hits = this.raycaster.intersectObjects(this.enemies.filter(e => e.health > 0).map(e => e.group), true).filter(hit=>!hit.object.userData.weaponPart);
    if (hits.length && hits[0].distance < distance) {
      distance = hits[0].distance;
      victim = hits[0].object.userData.enemy;
    }
    const end = origin.clone().addScaledVector(direction, distance);
    this.tracer(origin, end, ROSTER[character.index].color);
    gun.flash.visible = true;gun.flash.scale.setScalar(.8+Math.random()*.4);
    gun.flashTime = .065;
    character.flashTime = .065;
    gun.recoil = Math.min((gun.recoil || 0) + weapon.kick * .35, .025);
    character.heat=Math.min(1,(character.heat||0)+.07);
    character.recoil = Math.min(character.recoil + weapon.kick*.18, .035);
    this.lastShot={origin:origin.toArray(),direction:direction.toArray(),spread,character:character.index};this.lastGunfire={position:origin.clone(),time:this.elapsed};
    if (character === this.player) { if(!this.net.remoteTarget)this.input.rumble();this.shots++; this.sound(state.id); }
    if (victim) {
      const location=hitLocation(victim.group.worldToLocal(hits[0].point.clone()).y);
      const damage=woundDamage(weapon.damage,location,clamp(weapon.range/Math.max(1,distance),.4,1),support);
      for(const sign of [-1,1])this.tracer(end,end.clone().add(new THREE.Vector3(.07*sign,.09,.02)),'#dfc9a5');
      victim.body.rotation.z+=.045*(Math.random()>.5?1:-1);impactDroplets(this,hits[0].point,direction);
      victim.health=Math.max(0,victim.health-damage);victim.provoked=true;
      if(victim.passive)for(const e of this.enemies)if(e.passive&&e.group.position.distanceTo(victim.group.position)<16){e.passive=false;e.provoked=true;}
      if(character===this.player)addHeat(this,4);
      if(character===this.player)this.lastWound={location,damage,enemy:victim};
      if (character === this.player) { this.hits++; this.hitTime = .14; }
      if (victim.health <= 0) this.defeatEnemy(victim,character.index,origin);
    }
  }

  defeatEnemy(victim,index,from=null) {
    if(victim.defeated)return;
    victim.health=0;victim.defeated=true;
    // Bodies stay on the street; the pose settles onto the sampled ground.
    beginRagdoll(this,victim,from||this.characters[index]?.group.position);groundStain(this,victim.group.position);
    victim.guns.forEach(g=>g.flash.visible=false);
    victim.group.traverse(mesh=>{if(mesh.isMesh)mesh.material.color.multiplyScalar(.62);});
    this.kills++;this.characters[index].kills++;killDialogue(this,victim,index);addHeat(this,10);
    if(victim.special)this.characters[index].specialKills++;
    this.awardXP(index,victim.special?XP_REWARDS.special:XP_REWARDS.kill);
    if(victim.badge)victim.badge.visible=false;
    if(victim.driveBy&&this.driving){
      this.driveByKills++;
      if(this.driveByKills===3){this.awardXP(index,XP_REWARDS.driveBy);this.toast('Draco: We good! Z, take us home.');}
    }
  }

  tracer(from, to, color) {
    if(this.net?.host)this.net.events.push({from:from.toArray(),to:to.toArray(),color});
    if(this.effects.length>=(this.qualitySettings?.fx||40))return;
    const mesh=this.effectPool.pop()||new THREE.Line(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3)),new THREE.LineBasicMaterial({transparent:true,opacity:.85}));
    const positions=mesh.geometry.attributes.position;positions.setXYZ(0,from.x,from.y,from.z);positions.setXYZ(1,to.x,to.y,to.z);positions.needsUpdate=true;mesh.geometry.computeBoundingSphere();mesh.material.color.set(color);mesh.material.opacity=.85;
    this.scene.add(mesh);
    this.effects.push({ mesh, life: .07 });
  }

  sound(id) {
    if (!this.audio || this.audio.state !== 'running') return;
    const oscillator = this.audio.createOscillator();
    const gain = this.audio.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(id === 'draco' ? 110 : 170, this.audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(38, this.audio.currentTime + .07);
    gain.gain.setValueAtTime(.12, this.audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, this.audio.currentTime + .08);
    oscillator.connect(gain).connect(this.audio.destination);
    oscillator.start();
    oscillator.stop(this.audio.currentTime + .09);
  }

  hasLineOfSight(from, to) {
    const direction = to.clone().sub(from);
    const distance = direction.length();
    const ray = new THREE.Ray(from, direction.normalize());
    return !this.colliders.some(box => {
      const point = ray.intersectBox(box, new THREE.Vector3());
      return point && from.distanceTo(point) < distance;
    });
  }

  updateAI(dt) {
    if(this.level===3&&this.pursuit?.phase!=='free'){if(this.pursuit?.phase==='entry')updateCompanions(this,dt);return;}
    for (const enemy of this.enemies) {
      if (enemy.health <= 0) continue;
      const aiDistance=enemy.group.position.distanceTo(this.player.group.position);
      if(aiDistance>45){enemy.aiSleep=(enemy.aiSleep||0)+dt;if(enemy.aiSleep<.2)continue;enemy.aiSleep=0;}
      moveEnemy(this,enemy,dt);
      const candidates = this.characters.filter(p => p.health > 0).sort((a,b) => a.group.position.distanceToSquared(enemy.group.position) - b.group.position.distanceToSquared(enemy.group.position));
      const target = candidates[0];
      if (!target) continue;
      const distance = target.group.position.distanceTo(enemy.group.position);
      if (distance > 26 || this.rap || this.driving) continue;
      // Watchful rivals track the crew but hold fire until provoked.
      if(enemy.passive){enemy.group.rotation.y+=angleDelta(enemy.group.rotation.y,Math.atan2(-(target.group.position.x-enemy.group.position.x),-(target.group.position.z-enemy.group.position.z)))*Math.min(1,dt*2);continue;}
      const origin = enemy.group.position.clone().add(new THREE.Vector3(0, 1.5, 0));
      const targetHeight=target.peek?Math.abs(target.body.position.x)<.3?1.95:1.65:target.crouched?1.1:1.35;
      const destination = target.group.position.clone().add(new THREE.Vector3(target.body.position.x,targetHeight,0).applyAxisAngle(UP,target.group.rotation.y));
      const direction = destination.clone().sub(origin);
      enemy.group.rotation.y += angleDelta(enemy.group.rotation.y, Math.atan2(-direction.x, -direction.z)) * Math.min(1, dt * 4);
      enemy.cooldown -= dt;
      if (enemy.cooldown <= 0 && this.hasLineOfSight(origin, destination)) {
        enemy.cooldown = (enemy.weaponId==='draco'?1.2:enemy.weaponId==='arp'?.95:.8) + Math.random() * .6;
        this.tracer(origin, destination, '#ff8061');this.lastGunfire={position:origin.clone(),time:this.elapsed};
        enemy.guns[0].flash.visible = true;
        enemy.flashTime = .05;
        const chance = target.slide > 0 ? .12 : !target.grounded ? .2 : .4;
        if (Math.random() < chance) {
          const active=target===this.player||this.net.controlled(target.index);
          target.health=Math.max(active?0:20,target.health-(active?5:2));
          target.lastHitAt=this.elapsed;
          if (target === this.player) this.damageTime = .3;
          if (target.health <= 0) { this.finish(false); return; }
        }
      }
      enemy.flashTime = Math.max(0, enemy.flashTime - dt);
      enemy.guns[0].flash.visible = enemy.flashTime > 0;
    }
    updateCompanions(this,dt);
  }

  interact() {
    if (this.rap || this.carWork) return;
    if(this.level===3){
      if(this.pursuit.phase==='free'){streetInteract(this);return;}
      if(this.pursuit.phase==='entry'&&this.active===2&&this.player.group.position.distanceTo(this.car.group.position)<4.5){this.carWork=this.car.lockState==='locked'?{phase:'break',progress:0}:createBypass(this);renderCircuit(this);this.shooting=this.aiming=false;$('#car-work-panel').classList.remove('hidden');}
      return;
    }
    if(this.level===2){
      const point=CLAIM_POINTS[this.claim.point];
      if(waveCount(this)<point.quota)return;
      if(point.role===1&&!this.claim.verseDone&&this.active===1&&Math.abs(this.player.group.position.z-point.z)<7){
        this.rap=createRap();this.rap.purpose='claim';this.shooting=this.aiming=false;this.keys.clear();
        $('#rap-panel').classList.remove('hidden');this.toast('Doom: This corner needs a verse.',3.5);
      }
      if(point.role===2&&!this.claim.exitTagged&&this.active===2)alleyInteract(this);
      return;
    }
    if (this.driving) {this.exitCar();return;}
    const objective = OBJECTIVES[this.stage];
    if (!objective || this.active !== objective.character) return;
    const distance = this.player.group.position.distanceTo(this.stage === 2 ? this.car.group.position : new THREE.Vector3(...objective.position));
    if (this.stage === 1 && distance < 3) {
      this.rap = createRap();
      this.shooting = this.aiming = false;
      this.keys.clear();
      $('#rap-panel').classList.remove('hidden');
      this.toast('Doom: Watch me catch this pocket.',3.5);
    } else if (this.stage === 2 && distance < 4.5) {
      if(this.car.lockState==='ready'){this.boardCar();return;}
      this.carWork=this.car.lockState==='locked'?{phase:'break',progress:0}:createBypass(this);renderCircuit(this);
      this.shooting=this.aiming=false;$('#car-work-panel').classList.remove('hidden');
    }
  }

  boardCar(){
    this.car.door.rotation.y=0;resetEntryPose(this);
    if(this.level===3){launchChase(this);$('#drive-panel').classList.remove('hidden');return;}
    this.gunner=this.active!==2;
    this.driving=true;this.car.door.rotation.y=0;resetEntryPose(this);this.shooting=this.aiming=false;this.keys.clear();
    this.characters.forEach(p=>{p.arms.position.set(0,1.5,0);p.crouched=false;p.peek=false;p.body.scale.y=1;p.body.position.x=0;});
    $('#drive-panel').classList.remove('hidden');
    this.toast('Z78: Engine’s live. Hop in. 1 Draco, 2 doom, 3 wheel.');
  }

  updateCarWork(dt){
    if(this.net.host&&this.net.controlled(2)&&this.active!==2)return;
    const task=this.carWork;
    if(!task)return;
    if(task.phase==='wire'){
      task.timer=(task.timer||0)+dt;
      // Free the cursor so the puzzle can be solved with the mouse.
      if(!task.cursorFree){task.cursorFree=true;if(document.pointerLockElement){this.cursorReleased=true;document.exitPointerLock();}}
      this.car.door.rotation.y=damp(this.car.door.rotation.y,DOOR_OPEN*.9,10,dt);
      const seat=new THREE.Vector3(-.55,.1,-.3).applyAxisAngle(UP,this.car.yaw).add(this.car.group.position);
      this.player.group.position.lerp(seat,1-Math.exp(-dt*7));this.player.group.rotation.y=this.car.yaw;this.player.legs.forEach(l=>l.visible=false);this.player.arms.rotation.x=-.65;
      $('#car-work-panel .work-track').classList.add('hidden');$('#car-work-panel>.eyebrow').textContent='Z78 / HOTWIRE';$('#car-work-panel>small').textContent=`${this.input.label('menu')} CANCEL`;$('#car-work-title').textContent=(PUZZLE_INFO[task.type]||PUZZLE_INFO.circuit).title;$('#wire-puzzle').classList.remove('hidden');
      if(this.active!==2||this.player.group.position.distanceTo(this.car.group.position)>4.5){resetEntryPose(this);this.carWork=null;$('#car-work-panel').classList.add('hidden');return;}
      if(task.connected.length>=3){this.carWork=null;$('#car-work-panel').classList.add('hidden');this.car.lockState='ready';this.awardXP(2,20);this.boardCar();}return;
    }
    $('#car-work-panel .work-track').classList.remove('hidden');$('#car-work-panel>.eyebrow').textContent=`Z78 / HOLD ${this.input.label('interact')}`;$('#car-work-panel>small').textContent=`KEEP HOLDING ${this.input.label('interact')} · RELEASE TO CANCEL`;$('#wire-puzzle').classList.add('hidden');
    if(this.active!==2||!this.keys.has('KeyE')||this.player.group.position.distanceTo(this.car.group.position)>4.5){
      resetEntryPose(this);this.carWork=null;$('#car-work-panel').classList.add('hidden');return;
    }
    const duration=task.phase==='break'?1.6:3;
    task.progress+=dt;
    // Stand behind the door's swing (hinge at the front edge) and reach in.
    const reach=new THREE.Vector3(-1.85,0,.55).applyAxisAngle(UP,this.car.yaw).add(this.car.group.position);
    this.player.group.position.lerp(reach,1-Math.exp(-dt*10));this.player.group.rotation.y=this.car.yaw-Math.PI/2;
    this.player.arms.rotation.x=-.15+Math.sin(task.progress*17)*.12;this.player.leftArm.rotation.x=-.3;this.player.body.rotation.x=.12;
    this.car.door.rotation.y=damp(this.car.door.rotation.y,task.progress>.8?DOOR_OPEN:0,8,dt);
    $('#car-work-title').textContent=task.phase==='break'?'BREAK INTO THE CAR':'HOTWIRE THE ENGINE';
    $('#car-work-progress').style.width=`${Math.min(1,task.progress/duration)*100}%`;
    if(task.progress>=duration){
      this.carWork=null;$('#car-work-panel').classList.add('hidden');
      if(task.phase==='break'){
        this.car.lockState='opened';this.car.windowMeshes[0].visible=false;this.awardXP(2,10);
        this.player.body.rotation.x=0;this.carWork=createBypass(this);renderCircuit(this);$('#car-work-panel').classList.remove('hidden');this.toast('Z78: Door’s open. Give me a second under the dash.');
      }else{this.car.lockState='ready';this.awardXP(2,20);this.boardCar();}
    }
  }

  exitCar() {
    this.driving = false;
    this.gunner = false;
    this.car.speed = 0;
    this.keys.clear();
    this.characters.forEach((p,i) => {
      p.group.visible = true; p.legs.forEach(leg=>leg.visible=true);p.body.position.y=0;p.body.rotation.x=0;if(p.leftArm)p.leftArm.rotation.x=0;
      p.group.position.copy(this.car.group.position).add(new THREE.Vector3((i-1)*2.2,0,3));
      p.group.position.y = 0;
      p.grounded = true; p.velocityY = 0;
    });
    $('#drive-panel').classList.add('hidden');
  }

  startAmbush() {
    this.ambushStarted=true;
    for(const [x,z] of [[-5,-54],[-5.5,-64],[5.5,-71]]) {
      const enemy=this.spawnEnemy(x,z);enemy.driveBy=true;enemy.health=ENEMY_HEALTH.ambush;
    }
    this.toast('Z78: They posted up ahead. Cover us—I got the wheel.');
  }

  enterGunner(index=0) {
    if(!this.driving || this.active===index)return;
    this.active=index;this.gunner=true;this.shooting=this.aiming=false;this.keys.clear();
    const p=this.player;p.draw=this.weapon.draw;p.grounded=true;p.velocityY=0;p.slide=0;
    this.yaw=this.car.yaw+(index===1?-Math.PI/2:Math.PI/2);this.pitch=-.02;
    this.toast(index===0?'Draco: I got this side.':'Doom: Passenger side, I’m on it.');
  }

  returnToDriver() {
    if(!this.driving || !this.gunner)return;
    this.active=2;this.gunner=false;this.shooting=this.aiming=false;
    this.yaw=this.car.yaw;this.pitch=-.13;this.lookHold=0;this.keys.clear();
  }

  updateRoofCrew(dt){
    for(const p of this.characters){
      const seat=p.index===0?[0,1.05,.1]:p.index===1?[.6,.05,-.5]:[-.6,.05,-.5];
      p.group.position.copy(new THREE.Vector3(...seat).applyAxisAngle(UP,this.car.yaw).add(this.car.group.position));
      p.body.scale.set(1,1,1);p.body.position.set(0,p.index===0?0:-.2,0);p.body.rotation.set(0,0,0);p.legs.forEach(l=>l.visible=p.index===0);
      if(p.index===0){p.group.rotation.y+=angleDelta(p.group.rotation.y,this.yaw)*Math.min(1,dt*10);p.arms.rotation.x=damp(p.arms.rotation.x,this.pitch+p.recoil,14,dt);assistAim(this,p,dt);if(this.shooting&&p.draw<=0&&p.reloading<=0&&p.cooldown<=0)this.shoot(p);}
      else{p.group.rotation.y=this.car.yaw;p.arms.rotation.x=0;}
    }
  }

  updateDriving(dt) {
    if(this.level===3){updateChaseDriving(this,dt);return;}
    this.gunner=this.active!==2;
    const car=this.car;
    let input={
      forward:this.keys.has('KeyW')||this.keys.has('ArrowUp'),backward:this.keys.has('KeyS')||this.keys.has('ArrowDown'),
      left:this.keys.has('KeyA')||this.keys.has('ArrowLeft'),right:this.keys.has('KeyD')||this.keys.has('ArrowRight'),brake:this.keys.has('Space'),
    };
    const remoteDriver=this.net.host&&[...this.net.peers.entries()].find(([id])=>(this.net.assignments[id]??id)===2)?.[1];
    if(remoteDriver&&performance.now()-remoteDriver.received<500){const keys=new Set(remoteDriver.keys||[]);input={forward:keys.has('KeyW'),backward:keys.has('KeyS'),left:keys.has('KeyA'),right:keys.has('KeyD'),brake:keys.has('Space')};}
    const remoteFresh=remoteDriver&&performance.now()-remoteDriver.received<500;
    const manualDriver=remoteFresh&&(input.forward||input.backward||input.left||input.right);
    // Z78 keeps the wheel whenever he is not the player-controlled character.
    const previousMode=car.driverMode;
    car.driverIndex=2;car.driverMode=this.active===car.driverIndex&&!this.net.controlled(2)||manualDriver?'PLAYER':'AI';
    if(car.driverMode==='AI'){if(previousMode!=='AI'&&car.ai)resumeRoute(this);input=autoDrive(this,dt);}
    const movement=advanceCar(car,input,dt);
    const old=car.group.position.clone();
    car.group.position.x+=movement.x;car.group.position.z+=movement.z;
    const p=car.group.position;
    const extent=carExtents(car.yaw);
    const collision=Math.abs(p.x)>8.2||p.z< -80||p.z>20||this.colliders.some(box=>box.max.y>.3&&box.min.y<1.6&&p.x+extent.x>box.min.x&&p.x-extent.x<box.max.x&&p.z+extent.z>box.min.z&&p.z-extent.z<box.max.z);
    car.collisionCooldown=Math.max(0,car.collisionCooldown-dt);
    if(collision){
      p.copy(old);if(car.ai&&car.driverMode==='AI')car.ai.bumped=true;
      if(Math.abs(car.speed)>3&&car.collisionCooldown===0){car.integrity=Math.max(0,car.integrity-12);car.collisionCooldown=.8;this.damageTime=.2;}
      car.speed*= -.2;
    }
    car.group.rotation.y=car.yaw;
    car.wheels.forEach(wheel=>{wheel.rotation.x+=car.speed*dt*2;});
    this.lookHold=Math.max(0,this.lookHold-dt);
    if(!this.gunner&&!this.aiming&&!this.shooting&&this.lookHold===0)this.yaw+=angleDelta(this.yaw,car.yaw)*Math.min(1,dt*3);
    updateVehicleCrew(this,dt);
    for(const enemy of this.enemies){
      if(enemy.health<=0)continue;
      const local=enemy.group.position.clone().sub(p).applyAxisAngle(UP,-car.yaw);
      if(Math.abs(local.x)<1.6&&Math.abs(local.z)<2.6&&Math.abs(car.speed)>3&&!(enemy.ramCooldown>0)){
        enemy.ramCooldown=.7;enemy.health-=Math.max(65,Math.abs(car.speed)*15);
        if(enemy.health<=0)this.defeatEnemy(enemy,2);
      }
      enemy.ramCooldown=Math.max(0,(enemy.ramCooldown||0)-dt);
    }
    const gate=DRIVE_ROUTE[car.gate];
    if(gate&&Math.hypot(p.x-gate[0],p.z-gate[1])<2.9&&car.speed>1){
      car.gate++;this.awardXP(2,XP_REWARDS.route);
      if(car.gate===1&&!this.ambushStarted)this.startAmbush();
    }
    for(const enemy of this.enemies.filter(e=>e.driveBy&&e.health>0)){
      enemy.cooldown-=dt;
      if(enemy.cooldown<=0&&enemy.group.position.distanceTo(p)<23){
        enemy.cooldown=1.8;
        const from=enemy.group.position.clone().add(new THREE.Vector3(0,1.5,0)),to=p.clone().add(new THREE.Vector3(0,1.2,0));
        if(this.hasLineOfSight(from,to)){this.tracer(from,to,'#e6a58d');car.integrity=Math.max(0,car.integrity-1);}
      }
    }

    if(car.integrity<=0)this.finish(false);

  }

  beatSound() {
    if (!this.audio || this.audio.state !== 'running') return;
    const oscillator = this.audio.createOscillator();
    const gain = this.audio.createGain();
    oscillator.frequency.setValueAtTime(110,this.audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(45,this.audio.currentTime+.1);
    gain.gain.setValueAtTime(.13,this.audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001,this.audio.currentTime+.12);
    oscillator.connect(gain).connect(this.audio.destination);
    oscillator.start(); oscillator.stop(this.audio.currentTime+.13);
  }

  updateObjectives(dt) {
    if(this.level===3){updatePursuit(this,dt);return;}
    if(missionOneCleared(this)){this.awardXP(2,XP_REWARDS.escape);beginClaimBlock(this);return;}
    if(this.level===2){this.updateClaimRap(dt);updateClaimBlock(this);return;}
    if (this.stage >= OBJECTIVES.length) return;
    this.reinforcementTimer = Math.max(0,this.reinforcementTimer-dt);
    if (this.stage === 0) {
      const target = combatTarget(this.characters.map(p => p.kills));
      if (combatComplete(this.characters[0])) {
        this.awardXP(0,XP_REWARDS.combat);
        this.stage = 1;
        this.toast('Draco: That’s handled. Doom, go talk your talk at the mic. Press 2.');
      } else if (!this.enemies.some(e => e.health>0) && this.reinforcementTimer===0) {
        this.spawnEnemy(-4,-9); this.spawnEnemy(4,-16);
        this.reinforcementTimer = 5;
        this.toast('Draco: Couple more up ahead. Three takedowns and we move.');
      }
    }
    if (this.rap) {
      const rap = this.rap;
      const previous = rap.time;
      rap.time += dt;updateRapFeedback(rap,RAP_PATTERN.map((_,i)=>beatTime(i)),dt);
      if (streetRapDone(this,rap)) {
        this.rapScore = rap.hits;
        this.player.body.rotation.z=0;this.player.leftArm.rotation.x=0;this.rap = null;
        $('#rap-panel').classList.add('hidden');
        if (this.rapScore >= RAP_PASS) {
          this.stage = 2;
          this.awardXP(1,XP_REWARDS.rap);
          this.toast(`Doom: ${this.rapScore}/8. Verse in the bag. Z, pull up.`,4);
        } else this.toast(`${this.rapScore}/8 beats. Need 6. Press E at the mic to try again.`);
      }
    }
    const objective = OBJECTIVES[this.stage];
    // Ground rings stay as subtle world markers; the HUD marker carries the text.
    this.terminals.forEach((terminal,i) => {
      terminal.ring.visible = i===this.stage && this.stage>0 && !this.driving;
      terminal.ring.material.opacity = .45+Math.sin(this.elapsed*3)*.18;
      terminal.marker.visible = false;
    });
    this.routeMarkers.forEach((marker,i) => {
      marker.ring.visible = this.stage===2 && this.driving && i===this.car.gate;marker.label.visible=false;
    });
  }

  updateClaimRap(dt){
    if(!this.rap)return;
    const rap=this.rap;rap.time+=dt;updateRapFeedback(rap,RAP_PATTERN.map((_,i)=>beatTime(i)),dt);
    if(streetRapDone(this,rap)){
      this.rapScore=rap.hits;this.player.body.rotation.z=0;this.player.leftArm.rotation.x=0;this.rap=null;$('#rap-panel').classList.add('hidden');
      if(this.rapScore>=RAP_PASS){this.claim.verseDone=true;this.awardXP(1,XP_REWARDS.rap);this.toast('Doom: Verse stamped. This corner’s ours.',4);}
      else this.toast(`${this.rapScore}/8. Run that verse again. E near the capture zone.`);
    }
  }

  finish(success) {
    this.running = false;
    this.finished = true;
    this.music.stop();this.voices.stop();
    this.shooting = false;
    this.keys.clear();
    if (document.pointerLockElement) document.exitPointerLock();
    $('#hud').classList.add('hidden');
    $('#result').classList.remove('hidden');
    $('#pause-menu').classList.add('hidden');
    $('#result-tag').textContent = success ? this.level===2?'MISSION 02 COMPLETE':'OPERATION COMPLETE / CHAPTER 01' : 'CREW MEMBER DOWN';
    $('#result-title').innerHTML = success ? this.level===2?'BLOCK<br>CLAIMED.':'CREW<br>EXTRACTED.' : 'NO ONE<br>LEFT BEHIND.';
    const minutes = Math.floor(this.elapsed / 60);
    const seconds = String(Math.floor(this.elapsed % 60)).padStart(2, '0');
    $('#result-detail').textContent = success&&this.level===2 ? `CLAIM THE BLOCK complete. Four checkpoints cleared. ${this.characters.map((p,i)=>`${ROSTER[i].name}: ${p.kills}`).join(' · ')} total bodies.` : success ? `Enter CHIRAQ complete. ${minutes}:${seconds} · Draco: ${this.characters[0].kills} takedowns · doom: ${this.rapScore || 0}/8 beats · Z78: 3/3 route markers · Ambush: ${this.driveByKills}/3. The crew rides out together.` : this.car.integrity <= 0 ? 'The getaway car is wrecked. Brake for corners and avoid parked cars.' : 'The escape needs all three characters alive. Use cover, keep moving, and switch before a crew member gets overwhelmed.';
  }

  awardXP(index,amount) {
    const ready=awardCharge(this.characters[index],amount);
    try{localStorage.setItem(XP_KEY,JSON.stringify(this.characters.map(p=>p.xp)));}catch{/* Progress still works in memory when storage is unavailable. */}
    if(ready)this.toast(`${ROSTER[index].name}: 100 street cred. Keep that name ringing.`,4);
  }

  requestSpecial() {
    this.toast(`${ROSTER[this.active].name} · ${this.player.xp} STREET CRED${this.player.onFireUntil>this.elapsed?' · ON FIRE · bonus rap cred':''}. Abilities coming later.`);
  }

  toast(message,duration=null) {
    if(this.dialogueLog.at(-1)===message||this.narrationQueue.includes(message))return;
    if(duration!==null)this.narrationDurations.set(message,duration);
    this.dialogueLog.push(message);if(this.dialogueLog.length>50)this.dialogueLog.shift();
    this.narrationQueue.push(message);
    if(this.toastTime<=0)this.showNextNarration();
  }

  showNextNarration() {
    const message=this.narrationQueue.shift();
    if(!message){this.toastTime=0;return;}
    $('#toast-text').textContent=message;
    this.toastTime=this.narrationDurations.get(message)??narrationDuration(message);
    this.narrationDurations.delete(message);
  }

  updateCamera(dt) {
    if(this.level===3&&this.pursuit?.phase==='studio'){this.camera.position.lerp(new THREE.Vector3(45,1.8,-1.8),1-Math.exp(-dt*8));this.camera.lookAt(45,1.3,3);return;}
    const p = this.driving && !this.gunner ? this.car.group.position : this.player.group.position;
    const viewPitch=this.pitch+(this.player.recoil||0);
    const direction = new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(viewPitch), Math.sin(viewPitch), -Math.cos(this.yaw) * Math.cos(viewPitch));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const peeking=!this.driving&&this.player.peek&&this.player.coverBox;
    const eye=peeking?Math.max(2.15,this.player.coverBox.max.y-p.y+.5):this.player.slide>0?.95:this.player.crouched?1.4:1.7;
    const focus = p.clone().add(new THREE.Vector3(0,this.level===3&&this.driving?1.6:this.gunner?1.4:eye,0));
    if(peeking)focus.add(new THREE.Vector3(this.player.body.position.x+this.player.arms.position.x,0,0).applyAxisAngle(UP,this.player.group.rotation.y));
    const distance = this.gunner ? this.aiming?2.6:3.8 : this.driving ? 8.5 : this.aiming ? 3.1 : 5.6;
    const offset = direction.clone().multiplyScalar(-distance).addScaledVector(right, this.aiming ? .65 : 1.05);
    if(this.gunner) {
      // Lift the shoulder camera above the roof and toward the open left window.
      // A normal orbit otherwise puts the opaque car body between camera and gun.
      offset.y+=this.level===3?1:2;
      if(this.level!==3)offset.add(new THREE.Vector3(this.active===1?2.5:-2.5,0,0).applyAxisAngle(UP,this.car.yaw));
    }
    const cameraRay = new THREE.Ray(focus, offset.clone().normalize());
    let allowed = offset.length();
    for (const box of this.colliders) {
      const hit = cameraRay.intersectBox(box, new THREE.Vector3());
      if (hit) allowed = Math.min(allowed, Math.max(.5, focus.distanceTo(hit) - .25));
    }
    const desired = focus.clone().add(offset.normalize().multiplyScalar(allowed));
    desired.y = Math.max(.35, desired.y);
    this.camera.position.lerp(desired, 1 - Math.exp(-dt * 12));
    this.camera.lookAt(this.gunner?focus.clone().addScaledVector(direction,30):this.camera.position.clone().addScaledVector(direction,35));
    this.camera.fov = damp(this.camera.fov, this.aiming ? 45 : 58, 10, dt);
    this.camera.updateProjectionMatrix();
  }

  updateHUD() {
    updateNavigation(this);
    const low=this.player.health/this.player.maxHealth<.3;document.querySelector('#low-health').classList.toggle('hidden',!low);document.querySelector('#damage-flash').classList.toggle('critical',low);
    const state = this.weaponState;
    const weapon = this.weapon;
    $('#ammo').textContent = state.rounds.join(' + ');
    $('#capacity').textContent = weapon.barrels > 1 ? `${weapon.capacity} EACH` : weapon.capacity;
    $('#spares').textContent = state.spares;
    $('#weapon-name').textContent = weapon.name;
    $('#weapon-status').textContent = this.player.reloading > 0 ? `RELOADING · ${this.player.reloading.toFixed(1)}s` : this.player.draw > 0 ? `DRAWING · ${this.player.draw.toFixed(1)}s` : `${this.player.slot === 0 ? 'PRIMARY' : 'SIDEARM'} / FULL AUTO`;
    document.querySelectorAll('.squad-card').forEach((card, i) => {
      card.classList.toggle('selected', i === this.active);card.style.order=i===this.active?-1:i;card.classList.toggle('low-health',this.characters[i].health/this.characters[i].maxHealth<.3);
      card.querySelector('.active-label').textContent = i===this.active?'ACTIVE':this.driving?i===2?'DRIVING':'RIDING':this.characters[i].aiState;
      $(`#body-count-${i}`).textContent=`BODY ${this.characters[i].kills}`;
      $(`#hp-label-${i}`).textContent=`HP ${Math.ceil(this.characters[i].health)}/${this.characters[i].maxHealth}`;
      $(`#xp-${i}`).style.width=`${Math.min(100,this.characters[i].xp%100||this.characters[i].xp&&100)}%`;
      card.classList.toggle('on-fire',this.characters[i].onFireUntil>this.elapsed);
      $(`#xp-label-${i}`).textContent=`${this.characters[i].onFireUntil>this.elapsed?'ON FIRE · ':''}STREET CRED ${this.characters[i].xp}`;
      $(`#health-${i}`).style.width = `${this.characters[i].health/this.characters[i].maxHealth*100}%`;
    });
    const objective = OBJECTIVES[Math.min(this.stage, 2)];
    $('#objective-title').textContent = objective.title;
    $('#objective-description').textContent = objective.description;
    $('#mission-step').textContent = `0${Math.min(this.stage + 1, 3)} / 03`;
    const target = combatTarget(this.characters.map(p => p.kills));
    const progress = this.stage === 0 ? this.characters[0].kills / target : this.stage === 1 ? (this.rap?.hits || 0) / 8 : this.car.gate / 3;
    $('#enemy-remaining').textContent=`OPPS LEFT ${livingOpps(this)}`;
    $('#chapter-label').textContent=this.level===2?'MISSION 02':'MISSION 01';
    $('#level-title').textContent=this.level===2?'CLAIM THE BLOCK':'ENTER CHIRAQ';
    $('#stance-status').textContent=this.driving||this.rap?'':this.player.crouched?'IN COVER · RMB PEEK · BACK / C LEAVE':this.player.coverBox?'BEHIND COVER · C DUCK · RMB PEEK':'C CROUCH · SHIFT + C SLIDE · RMB ASSIST';
    $('#objective-progress').style.width = `${Math.min(1,progress)*100}%`;
    $('#objective-count').textContent = this.stage === 0 ? `DRACO ${this.characters[0].kills}/${target} · OR SPECIAL OPP ${this.characters[0].specialKills>0?'DOWN':'MARKED'}` : this.stage === 1 ? `HIT ${RAP_PASS} OF 8 BEATS · J / K / L` : `ROUTE ${this.car.gate}/3 · AMBUSH ${this.driveByKills}/3`;
    if(this.level===1&&this.stage===2){
      const alive=this.enemies.filter(e=>e.health>0).sort((a,b)=>a.group.position.distanceToSquared(this.player.group.position)-b.group.position.distanceToSquared(this.player.group.position));
      $('#objective-count').textContent=this.car.lockState!=='ready'?`CAR ${this.car.lockState==='locked'?'LOCKED · HOLD E TO BREAK IN':'OPEN · HOLD E TO HOTWIRE'}`:`OPPS LEFT ${alive.length}${alive[0]?` · NEAREST ${Math.round(alive[0].group.position.distanceTo(this.player.group.position))}m`:''}`;
      if(this.car.lockState==='ready')$('#objective-progress').style.width=`${this.enemies.length?(this.enemies.length-alive.length)/this.enemies.length*100:0}%`;
    }
    if(this.level===2){
      const point=CLAIM_POINTS[this.claim.point],count=waveCount(this);
      $('#objective-title').textContent=point.name;
      $('#objective-description').textContent=count<point.quota?'Clear the checkpoint.':point.role===1&&!this.claim.verseDone?'Doom: drop a verse at the corner.':point.role===2&&!this.claim.exitTagged?alleyInstruction(this):'Bring the whole crew into the ring.';
      $('#mission-step').textContent=`0${this.claim.point+1} / 04`;
      $('#objective-count').textContent=count<point.quota?`RIVALS REMAINING: ${livingOpps(this)} · BODIES ${count}/${point.quota}`:`CREW ${this.characters.filter(p=>Math.abs(p.group.position.z-point.z)<=5&&Math.abs(p.group.position.x)<10).length}/3 IN ZONE`;
      $('#objective-progress').style.width=`${Math.min(1,count/point.quota)*100}%`;
    }
    $('#crosshair').classList.toggle('hidden',this.driving&&!this.gunner&&!this.shooting&&!this.aiming || Boolean(this.rap));
    $('.weapon-panel').classList.toggle('hidden',Boolean(this.rap));
    $('#drive-mode').textContent=this.active===0?'DRACO / BACK SEAT · Z78 DRIVING':this.active===1?'DOOM / PASSENGER · Z78 DRIVING':'Z78 / DRIVE & FIRE';
    $('#drive-help').textContent=this.gunner?'MOUSE AIM · LMB FIRE · R RELOAD · 1 / 2 / 3 SWITCH':'WASD DRIVE · MOUSE AIM · LMB FIRE · R RELOAD';
    $('#drive-kills').textContent=`OPPS LEFT ${livingOpps(this)}`;
    $('#special-status').textContent=`${this.player.onFireUntil>this.elapsed?'ON FIRE · ':''}STREET CRED ${this.player.xp}${this.aimTarget?' · AIM ASSIST':''}`;
    $('#drive-speed').textContent = Math.round(Math.abs(this.car.speed)*3.6);
    $('#car-integrity').textContent = `${Math.round(this.car.integrity)}%`;
    $('#drive-route').textContent = `${this.car.gate}/3`;
    if(this.rap&&this.rap.purpose!=='studio') {
      $('#rap-session-name').textContent='LIL DOOM / SIDEWALK SESSION';
      $('#rap-score').textContent = `${this.rap.hits}/8`;
      $('#rap-feedback').textContent = this.rap.feedback;
      $('#rap-lyric').textContent = RAP_LINES[Math.min(3,Math.max(0,Math.floor((this.rap.time-1.5)/(BEAT_SECONDS*2))))];
      const notes=$('#rap-notes');
      notes.innerHTML = renderNotes(RAP_PATTERN,RAP_PATTERN.map((_,i)=>beatTime(i)),this.rap,this.input);
    }
    $('#crosshair').classList.toggle('aiming', this.aiming);$('#crosshair').classList.toggle('assisted',Boolean(this.aimTarget));
    $('#crosshair').style.opacity = this.player.draw > 0 || this.player.reloading > 0 ? '.3' : '1';
    $('#toast').style.opacity = this.toastTime > 0 ? '1' : '0';
    $('#hit-marker').style.opacity = this.hitTime > 0 ? '1' : '0';
    $('#damage-flash').style.opacity = String(this.damageTime * 2);
    const heading = ((this.yaw * -180 / Math.PI) % 360 + 360) % 360;
    $('#heading').textContent = `${String(Math.round(heading)).padStart(3, '0')}°`;
    if(this.level===3)pursuitHUD(this);
    $('#crosshair').style.left='50%';$('#crosshair').style.top='50%';
    $('#crosshair').classList.toggle('blocked',Boolean(this.muzzleBlocked));this.input?.prompts();
  }

  updateMusicUI() {
    $('#music-toggle').textContent=this.music.muted?'MUSIC OFF':'MUSIC ON';
    $('#music-toggle').setAttribute('aria-pressed',String(!this.music.muted));
    $('#music-volume').value=String(Math.round(this.music.volume*100));
  }

  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }

  tick() {
    const now = performance.now();
    const dt = Math.min((now - this.lastFrame) / 1000, .25);
    this.lastFrame = now;
    this.input.poll(dt);this.net.poll(dt);
    if(this.net.guest){this.net.render(dt);this.updateEffects(dt);if(this.sky)this.sky.position.copy(this.camera.position);this.renderer.render(this.scene,this.camera);return;}
    if (this.running) {
      // Fixed-size physics steps keep movement and fire rate consistent at low FPS.
      let remaining = dt;
      while (remaining > 0 && this.running) {
        const step = Math.min(remaining, 1 / 60);
        remaining -= step;
        this.elapsed += step;
        for (const character of this.characters) {
          if (character !== this.player&&!this.net.controlled(character.index)) this.updateGravity(character, step);
          updateHandling(character,character===this.player?this.aiming:this.net.aiming(character.index),step);
          character.draw = Math.max(0, character.draw - step);
          character.cooldown = Math.max(0, character.cooldown - step);
          character.flashTime = Math.max(0, character.flashTime - step);
          for (let slot = 0; slot < character.weaponRigs.length; slot++) {
            character.weaponRigs[slot].forEach(gun => { gun.group.visible = slot === character.slot; });
          }
          character.guns = character.weaponRigs[character.slot];
          character.guns.forEach(gun => {
            gun.flashTime = Math.max(0, gun.flashTime - step);
            gun.flash.visible = gun.flashTime > 0;
            gun.recoil = damp(gun.recoil || 0, 0, 12, step);
            gun.group.rotation.set(character===this.player?0:gun.recoil,0,0);gun.group.position.z=-.57+gun.recoil;
          });
          if (character.reloading > 0) {
            character.reloading = Math.max(0, character.reloading - step);
            if (character.reloading === 0) reload(character.loadout[character.slot]);
          }
        }
        if (this.driving) this.updateDriving(step);
        else if(this.carWork)this.updateCarWork(step);
        else if (!this.rap) this.updatePlayer(step);
        this.net.simulate(step);this.updateAI(step);
        if (this.running) this.updateObjectives(step);
      }
      updateZone(this);
      this.toastTime = Math.max(0, this.toastTime - dt);
      if(this.toastTime===0&&this.narrationQueue.length)this.showNextNarration();
      this.enemies.forEach(enemy=>{
        if(enemy.badge&&enemy.health>0){enemy.badge.position.copy(enemy.group.position).add(new THREE.Vector3(0,3,0));enemy.badge.lookAt(this.camera.position);}
      });
      combatBarks(this);
      this.music.setDucked(Boolean(this.rap)&&this.rap.purpose!=='studio',.12);
      this.hitTime = Math.max(0, this.hitTime - dt);
      this.damageTime = Math.max(0, this.damageTime - dt);
      this.updateCamera(dt);
      if(!this.rap&&!this.carWork&&(this.driving||this.aiming||this.shooting))alignWeapon(this,this.player,aimPoint(this));
      this.updateHUD();rapPresentation(this,dt);if(this.carWork)this.player.weaponRigs.flat().forEach(g=>g.group.visible=false);
    }
    this.updateEffects(dt);updateRagdolls(this,dt);updateBlood(this,dt);
    if(this.sky)this.sky.position.copy(this.camera.position);
    for(const p of [...this.characters,...this.enemies,...(this.street?.contacts||[])])if(p.hair)p.hair.visible=this.camera.position.distanceTo(p.group.position)<(this.quality==='low'?30:this.quality==='medium'?50:90);
    this.renderer.render(this.scene, this.camera);
  }

  updateEffects(dt){
    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].life -= dt;
      if (this.effects[i].life <= 0) {
        this.scene.remove(this.effects[i].mesh);
        if(this.effectPool.length<70)this.effectPool.push(this.effects[i].mesh);else{this.effects[i].mesh.geometry.dispose();this.effects[i].mesh.material.dispose();}
        this.effects.splice(i, 1);
      }
    }

  }
}
