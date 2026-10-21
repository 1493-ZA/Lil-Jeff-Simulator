import * as THREE from 'three';
import { ROSTER, WEAPONS, createLoadout, fireRound, reload, needsReload } from './combat.js';
import { buildNeighborhood } from './neighborhood.js';
import { buildHair, buildWeapon } from './models.js';
import { OBJECTIVES, RAP_PATTERN, RAP_LINES, BEAT_SECONDS, RAP_PASS, DRIVE_ROUTE, combatTarget, combatComplete, beatTime, createRap, judgeRap, advanceCar } from './mission.js';

import { updateCompanions } from './companions.js';
import { XP_CAP, XP_REWARDS, XP_KEY, readCharges, awardCharge, narrationDuration } from './progression.js';

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
    this.renderer.toneMappingExposure = 1.15;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#6f898b');
    this.scene.fog = new THREE.FogExp2('#718888', 0.012);
    this.camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 220);
    this.lastFrame = performance.now();
    this.keys = new Set();
    this.colliders = [];
    this.enemies = [];
    this.effects = [];
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
    this.raycaster = new THREE.Raycaster();
    this.buildWorld();
    this.buildCrew();
    this.buildEnemies();
    this.bindInput();
    this.resize();
    this.updateCamera(1);
    this.updateHUD();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  material(color, extra = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.78, ...extra }); }

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

  buildPerson(color, enemy = false, identity = -1) {
    const group = new THREE.Group(), body = new THREE.Group();
    group.add(body);
    const cloth=enemy?'#3c444c':identity===0?'#75604e':identity===1?'#4c7470':'#67566f';
    const skin=enemy?'#886a58':identity===1?'#9b765b':'#79513d';
    const round=(x,y,z,sx,sy,sz,tint,parent=body)=>{
      const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,12,10),this.material(tint));
      mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;parent.add(mesh);return mesh;
    };
    const torso=new THREE.Mesh(new THREE.CylinderGeometry(.3,.27,.72,12),this.material(cloth));
    torso.scale.z=.72;torso.position.y=1.23;torso.castShadow=true;body.add(torso);
    round(0,.8,.02,.29,.17,.2,'#30363d');
    round(0,1.57,.08,.25,.15,.2,cloth);
    this.box(.016,.56,.025,'#a29887',0,1.22,-.225,{parent:body});
    round(0,1.9,0,.21,.25,.2,skin);
    round(-.215,1.91,0,.045,.07,.035,skin);round(.215,1.91,0,.045,.07,.035,skin);
    if(enemy || identity===1)this.box(.46,.18,.45,enemy?'#273039':'#253b3a',0,2.12,0,{parent:body});
    if(enemy)this.box(.32,.075,.03,'#cc9c88',0,1.94,-.2,{parent:body});
    else {
      for(const x of [-.075,.075]) {
        round(x,1.95,-.178,.043,.021,.017,'#c8c3b1');
        round(x,1.95,-.194,.013,.018,.01,'#242325');
        this.box(.065,.018,.02,'#372d28',x,1.993,-.18,{parent:body});
      }
      round(0,1.89,-.205,.04,.048,.04,skin);
      this.box(.1,.012,.015,'#604337',0,1.81,-.183,{parent:body});
    }
    const legs=[-.17,.17].map(x=>{
      const pivot=new THREE.Group();pivot.position.set(x,.85,0);body.add(pivot);
      const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.12,.48,4,8),this.material('#303a43'));
      leg.position.y=-.34;leg.castShadow=true;pivot.add(leg);
      round(0,-.72,-.07,.135,.10,.23,'#202730',pivot);
      this.box(.23,.035,.35,'#aba99e',0,-.79,-.07,{parent:pivot});
      return pivot;
    });
    const arms=new THREE.Group();arms.position.set(0,1.5,0);body.add(arms);
    for(const x of [-.36,.4]) {
      const sleeve=new THREE.Mesh(new THREE.CapsuleGeometry(.105,.38,4,8),this.material(cloth));
      sleeve.rotation.x=Math.PI/2;sleeve.position.set(x,-.08,-.24);sleeve.castShadow=true;arms.add(sleeve);
      round(x,-.08,-.53,.085,.08,.10,skin,arms);
    }
    const guns=[buildWeapon(this,'switch',arms,.4)];
    group.userData.torso=torso;this.scene.add(group);
    const person={group,body,legs,arms,guns};
    if(identity===0 || identity===2)person.hair=buildHair(this,person,identity===0?0:1);
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
      return { ...model, guns: primary, weaponRigs: [primary, model.guns], index: i, health: 100, loadout: createLoadout(person.primary), slot: 0,
        velocityY: 0, grounded: true, slide: 0, slideDirection: new THREE.Vector3(), draw: WEAPONS[person.primary].draw,
        reloading: 0, cooldown: 0, recoil: 0, flashTime: 0, aiCooldown: 0, kills: 0, specialKills: 0, xp: charges[i], lastHitAt: -Infinity, aiPlanCooldown: 0, aiGoal: null, aiState: 'FOLLOWING' };
    });
    this.characters.forEach((character, i) => character.group.position.set((i - 1) * 3, 0, 12 + i * .5));
  }

  spawnEnemy(x, z) {
    const enemy = { ...this.buildPerson('#52636a', true), health: 85, cooldown: 1.5, flashTime: 0, home: new THREE.Vector3(x, 0, z) };
    enemy.group.position.copy(enemy.home);
    enemy.group.traverse(object => { if (object.isMesh) object.userData.enemy = enemy; });
    this.enemies.push(enemy);
    return enemy;
  }

  buildEnemies() {
    [[-4, -4], [4, -10], [-3, -17], [5, -24], [-4, -34], [2, -45]].forEach(([x,z],i)=>{
      const enemy=this.spawnEnemy(x,z);
      if(i===3) {
        enemy.special=true; enemy.health=150;
        const badge=this.label('SPECIAL OPP','#ffb16f',2.8,x,3,z);enemy.badge=badge;
        enemy.group.userData.torso.material.color.set('#7b3f3c');
      }
    });
  }

  bindInput() {
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', event => {
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
      if (event.code === 'Escape') { this.pause(); return; }
      if (!this.running) return;
      this.keys.add(event.code);
      if (event.repeat) return;
      if(event.code==='KeyN'){this.toastTime=0;this.showNextNarration();return;}
      if (this.rap) {
        if (['KeyJ', 'KeyK', 'KeyL'].includes(event.code)) judgeRap(this.rap, event.code);
        return;
      }
      if (event.code === 'KeyE') this.interact();
      if (event.code==='KeyF') this.requestSpecial();
      if (this.driving) {
        if(event.code==='Digit1')this.enterGunner();
        if(event.code==='Digit3')this.returnToDriver();
        if(this.gunner && event.code==='KeyQ')this.swapWeapon();
        if(this.gunner && event.code==='KeyR')this.beginReload();
        return;
      }
      if (/^Digit[123]$/.test(event.code)) this.switchCharacter(Number(event.code.slice(-1)) - 1);
      if (event.code === 'KeyQ') this.swapWeapon();
      if (event.code === 'KeyR') this.beginReload();
      if (event.code === 'Space' && this.player.grounded) {
        this.player.velocityY = 7.8;
        this.player.grounded = false;
      }
      if (event.code === 'KeyC' && this.player.grounded && this.player.slide <= 0) {
        const direction = this.moveDirection();
        this.player.slideDirection.copy(direction.lengthSq() > 0 ? direction : new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)));
        this.player.slide = .7;
      }
    });
    window.addEventListener('keyup', event => this.keys.delete(event.code));
    window.addEventListener('blur', () => this.pause());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); });
    document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && this.running) this.pause(); });
    document.addEventListener('mousemove', event => {
      if (!this.running || document.pointerLockElement !== this.canvas) return;
      this.yaw -= event.movementX * .0023;
      this.pitch = clamp(this.pitch - event.movementY * .002, -.85, .65);
    });
    this.canvas.addEventListener('mousedown', event => {
      if (!this.running) return;
      this.captureMouse();
      if (event.button === 0 && !this.rap && (!this.driving || this.gunner)) this.shooting = true;
      if (event.button === 2 && !this.rap && (!this.driving || this.gunner)) this.aiming = true;
    });
    window.addEventListener('mouseup', event => {
      if (event.button === 0) this.shooting = false;
      if (event.button === 2) this.aiming = false;
    });
    window.addEventListener('contextmenu', event => event.preventDefault());
  }

  captureMouse() {
    try {
      const result = this.canvas.requestPointerLock();
      result?.catch(() => this.toast('Click the game to enable mouse look.'));
    } catch { this.toast('Click the game to enable mouse look.'); }
  }

  start() {
    const resuming=this.started;
    this.started = true;
    this.running = true;
    this.lastFrame = performance.now();
    this.keys.clear();
    $('#menu').classList.add('hidden');
    $('#pause-menu').classList.add('hidden');
    $('#hud').classList.remove('hidden');
    this.captureMouse();
    try { this.audio ??= new AudioContext(); this.audio.resume(); } catch { /* Audio is optional. */ }
    if(!resuming)this.toast('Draco: Aight, stay close. Three opps or their shot caller. Then doom gets his verse off and Z gets us out.');
  }

  pause() {
    if (!this.started || this.finished) return;
    this.running = false;
    this.shooting = this.aiming = false;
    this.keys.clear();
    if (document.pointerLockElement) document.exitPointerLock();
    $('#pause-menu').classList.remove('hidden');
    const log=$('#narration-log');log.replaceChildren();
    for(const line of this.dialogueLog){const item=document.createElement('p');item.textContent=line;log.append(item);}
  }

  reset() {
    this.resetMission();
    this.start();
  }

  resetMission() {
    this.running = this.started = this.finished = this.shooting = this.aiming = this.driving = false;
    this.keys.clear();
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
    Object.assign(this.car, { speed: 0, yaw: 0, gate: 0, integrity: 100, collisionCooldown: 0 });
    this.car.group.position.set(4,0,-38); this.car.group.rotation.set(0,0,0);
    this.routeMarkers.forEach(marker => { marker.ring.visible = marker.label.visible = false; });
    this.terminals.forEach(terminal => { terminal.marker.visible = true; terminal.ring.material.opacity = .4; });
    ['#result', '#pause-menu', '#rap-panel', '#drive-panel', '#interaction', '#hud'].forEach(selector => $(selector).classList.add('hidden'));
    this.updateCamera(1); this.updateHUD();
  }

  returnToMenu() {
    this.resetMission();
    $('#menu').classList.remove('hidden');
  }

  get player() { return this.characters[this.active]; }
  get weaponState() { return this.player.loadout[this.player.slot]; }
  get weapon() { return WEAPONS[this.weaponState.id]; }

  switchCharacter(index) {
    if(this.driving){if(index===0)this.enterGunner();if(index===2)this.returnToDriver();return;}
    if (!this.running || index === this.active || this.rap) return;
    if (this.characters[index].health <= 0) { this.toast('Crew member down. Restart to bring everyone home.'); return; }
    this.player.slide = 0;
    this.player.body.position.y = 0;
    this.player.body.rotation.x = 0;
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
    return new THREE.Vector3(x, 0, z).normalize().applyAxisAngle(UP, this.yaw);
  }

  moveWithCollision(character, displacement) {
    const pos = character.group.position;
    for (const axis of ['x', 'z']) {
      const old = pos[axis];
      pos[axis] += displacement[axis];
      pos.x = clamp(pos.x, -25.1, 25.1);
      pos.z = clamp(pos.z, -80, 21.1);
      const feet = pos.y;
      if (this.colliders.some(box => feet < box.max.y && feet + 1.8 > box.min.y && pos.x + .38 > box.min.x && pos.x - .38 < box.max.x && pos.z + .38 > box.min.z && pos.z - .38 < box.max.z)) pos[axis] = old;
    }
  }

  updatePlayer(dt) {
    const p = this.player;
    const direction = this.moveDirection();
    const sprinting = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const speed = this.aiming ? 3.3 : sprinting ? 8 : 5.1;
    const sliding = p.slide > 0;
    this.moveWithCollision(p, (sliding ? p.slideDirection : direction).clone().multiplyScalar((sliding ? 11 * (.5 + p.slide) : speed) * dt));
    p.slide = Math.max(0, p.slide - dt);
    this.updateGravity(p, dt);
    p.group.rotation.y += angleDelta(p.group.rotation.y, this.yaw) * Math.min(1, dt * 9);
    p.recoil = damp(p.recoil, 0, 6, dt);
    p.body.position.y = damp(p.body.position.y, sliding ? -.55 : 0, 15, dt);
    p.body.rotation.x = damp(p.body.rotation.x, sliding ? .16 : 0, 12, dt);
    p.arms.rotation.x = damp(p.arms.rotation.x, this.pitch + p.recoil - p.body.rotation.x + (p.draw > 0 || p.reloading > 0 ? -.85 : 0), 12, dt);
    p.legs.forEach((leg, i) => { leg.rotation.x = sliding ? 1.35 : direction.lengthSq() > 0 && p.grounded ? Math.sin(this.elapsed * speed * 2.2 + i * Math.PI) * .55 : p.grounded ? 0 : (i ? -.5 : .6); });
    if (this.shooting && p.draw <= 0 && p.reloading <= 0 && p.cooldown <= 0) this.shoot(p);
  }

  updateGravity(p, dt) {
    const oldY = p.group.position.y;
    if (!p.grounded) {
      p.velocityY -= 21 * dt;
      p.group.position.y += p.velocityY * dt;
      const platform = this.colliders.filter(box => p.group.position.x + .3 > box.min.x && p.group.position.x - .3 < box.max.x && p.group.position.z + .3 > box.min.z && p.group.position.z - .3 < box.max.z && oldY >= box.max.y - .05 && p.group.position.y <= box.max.y && p.velocityY <= 0).sort((a, b) => b.max.y - a.max.y)[0];
      if (platform) { p.group.position.y = platform.max.y; p.velocityY = 0; p.grounded = true; }
      if (p.group.position.y <= 0) { p.group.position.y = 0; p.velocityY = 0; p.grounded = true; }
    } else if (oldY > .01 && !this.colliders.some(box => Math.abs(box.max.y - oldY) < .1 && p.group.position.x > box.min.x - .3 && p.group.position.x < box.max.x + .3 && p.group.position.z > box.min.z - .3 && p.group.position.z < box.max.z + .3)) p.grounded = false;
  }

  shoot(character) {
    const state = character.loadout[character.slot];
    const weapon = WEAPONS[state.id];
    const barrel = fireRound(state);
    character.cooldown = 60 / weapon.rpm;
    if (barrel < 0) {
      if (character === this.player) { this.beginReload(); if (!state.spares) this.toast('Out of ammunition. Q to swap weapons.'); }
      return;
    }
    this.scene.updateMatrixWorld(true);
    const gun = character.guns[barrel];
    const origin = gun.muzzle.getWorldPosition(new THREE.Vector3());
    const quaternion = gun.muzzle.getWorldQuaternion(new THREE.Quaternion());
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);
    const moving = character === this.player && this.moveDirection().lengthSq() > 0;
    const support=character!==this.player;
    const spread = (support ? 3.5 : 1) * weapon.spread * (character.grounded ? 1 : 2.6) * (character.slide > 0 ? 1.8 : moving ? 1.4 : 1) * (character === this.player && this.aiming ? .65 : 1) + character.recoil * .08;
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
    const hits = this.raycaster.intersectObjects(this.enemies.filter(e => e.health > 0).map(e => e.group), true);
    if (hits.length && hits[0].distance < distance) {
      distance = hits[0].distance;
      victim = hits[0].object.userData.enemy;
    }
    const end = origin.clone().addScaledVector(direction, distance);
    this.tracer(origin, end, ROSTER[character.index].color);
    gun.flash.visible = true;
    gun.flashTime = .065;
    character.flashTime = .065;
    gun.recoil = Math.min((gun.recoil || 0) + weapon.kick * 1.5, .2);
    character.recoil = Math.min(character.recoil + weapon.kick, .24);
    if (character === this.player) { this.shots++; this.sound(weapon.id); }
    if (victim) {
      victim.health = Math.max(0, victim.health - weapon.damage * (support ? .18 : 1) * clamp(weapon.range / Math.max(1, distance), .4, 1));
      if (character === this.player) { this.hits++; this.hitTime = .14; }
      if (victim.health <= 0) {
        victim.group.rotation.z = Math.PI / 2;
        victim.group.position.y = .35;
        victim.group.traverse(mesh => { if (mesh.isMesh) mesh.material.color.multiplyScalar(.45); });
        this.kills++;
        character.kills++;
        if(victim.special)character.specialKills++;
        this.awardXP(character.index,victim.special?XP_REWARDS.special:XP_REWARDS.kill);
        if(victim.badge)victim.badge.visible=false;
        if(victim.driveBy && this.gunner && character.index===0) {
          this.driveByKills++;
          if(this.driveByKills===2){this.awardXP(0,XP_REWARDS.driveBy);this.toast('Draco: We good! Z, take us home.');}
        }
      }
    }
  }

  tracer(from, to, color) {
    const mesh = new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to]), new THREE.LineBasicMaterial({ color, transparent: true, opacity: .85 }));
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
    gain.gain.setValueAtTime(.045, this.audio.currentTime);
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
    for (const enemy of this.enemies) {
      if (enemy.health <= 0) continue;
      const candidates = this.characters.filter(p => p.health > 0).sort((a,b) => a.group.position.distanceToSquared(enemy.group.position) - b.group.position.distanceToSquared(enemy.group.position));
      const target = candidates[0];
      if (!target) continue;
      const distance = target.group.position.distanceTo(enemy.group.position);
      if (distance > 26 || this.rap || this.driving) continue;
      const origin = enemy.group.position.clone().add(new THREE.Vector3(0, 1.5, 0));
      const destination = target.group.position.clone().add(new THREE.Vector3(0, 1.2, 0));
      const direction = destination.clone().sub(origin);
      enemy.group.rotation.y += angleDelta(enemy.group.rotation.y, Math.atan2(-direction.x, -direction.z)) * Math.min(1, dt * 4);
      enemy.cooldown -= dt;
      if (enemy.cooldown <= 0 && this.hasLineOfSight(origin, destination)) {
        enemy.cooldown = .7 + Math.random() * .7;
        this.tracer(origin, destination, '#ff8061');
        enemy.guns[0].flash.visible = true;
        enemy.flashTime = .05;
        const chance = target.slide > 0 ? .12 : !target.grounded ? .2 : .4;
        if (Math.random() < chance) {
          const active=target===this.player;
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
    if (this.rap) return;
    if (this.driving) {
      if(this.gunner){this.toast('Draco: I got the back seat. Press 3 to take the wheel again.');return;}
      this.exitCar(); return;
    }
    const objective = OBJECTIVES[this.stage];
    if (!objective || this.active !== objective.character) return;
    const distance = this.player.group.position.distanceTo(this.stage === 2 ? this.car.group.position : new THREE.Vector3(...objective.position));
    if (this.stage === 1 && distance < 3) {
      this.rap = createRap();
      this.shooting = this.aiming = false;
      this.keys.clear();
      $('#rap-panel').classList.remove('hidden');
      this.toast('Doom: Watch me catch this pocket. Eight beats, six clean. Tap J / K / L when the note hits the line.');
    } else if (this.stage === 2 && distance < 4.5) {
      this.driving = true;
      this.shooting = this.aiming = false;
      this.keys.clear();
      this.characters.forEach(p => { p.group.visible = false; });
      $('#drive-panel').classList.remove('hidden');
      this.toast('Z78: Hop in, we out. W / S gas and reverse. A / D steer. Space brakes. After the first ring, press 1 for Draco in the back seat.');
    }
  }

  exitCar() {
    this.driving = false;
    this.gunner = false;
    this.car.speed = 0;
    this.keys.clear();
    this.characters.forEach((p,i) => {
      p.group.visible = true; p.legs.forEach(leg=>leg.visible=true);p.body.position.y=0;p.body.rotation.x=0;
      p.group.position.copy(this.car.group.position).add(new THREE.Vector3((i-1)*2.2,0,3));
      p.group.position.y = 0;
      p.grounded = true; p.velocityY = 0;
    });
    $('#drive-panel').classList.add('hidden');
  }

  startAmbush() {
    this.ambushStarted=true;
    for(const [x,z] of [[-5,-54],[-5.5,-64],[5.5,-71]]) {
      const enemy=this.spawnEnemy(x,z);enemy.driveBy=true;enemy.health=65;
      enemy.badge=this.label('ARMED OPP','#ffb891',2.3,x,3,z);
    }
    this.toast('Z78: They posted up ahead. Draco, back seat! Press 1 and cover us. I got the wheel.');
  }

  enterGunner() {
    if(!this.driving || this.gunner)return;
    if(this.car.gate<1){this.toast('Z78: Let me clear this first turn. Then Draco takes the back seat.');return;}
    this.active=0;this.gunner=true;this.shooting=this.aiming=false;this.keys.clear();
    const p=this.player;p.group.visible=true;p.legs.forEach(leg=>leg.visible=false);
    p.draw=this.weapon.draw;p.grounded=true;p.velocityY=0;p.slide=0;
    this.yaw=this.car.yaw+Math.PI/2;this.pitch=-.02;
    this.toast('Draco: Say less. Mouse to aim, hold fire. Z drives while I cover. R reload, Q swap, 3 back to driving.');
  }

  returnToDriver() {
    if(!this.driving || !this.gunner)return;
    const p=this.player;p.group.visible=false;p.legs.forEach(leg=>leg.visible=true);
    p.body.position.y=0;p.body.rotation.x=0;
    this.active=2;this.gunner=false;this.shooting=this.aiming=false;
    this.yaw=this.car.yaw;this.pitch=-.13;this.keys.clear();
  }

  updateDriving(dt) {
    const car=this.car;
    let input={
      forward:this.keys.has('KeyW')||this.keys.has('ArrowUp'),backward:this.keys.has('KeyS')||this.keys.has('ArrowDown'),
      left:this.keys.has('KeyA')||this.keys.has('ArrowLeft'),right:this.keys.has('KeyD')||this.keys.has('ArrowRight'),brake:this.keys.has('Space'),
    };
    if(this.gunner && car.gate<DRIVE_ROUTE.length) {
      const gate=DRIVE_ROUTE[car.gate];
      const desired=Math.atan2(-(gate[0]-car.group.position.x),-(gate[1]-car.group.position.z));
      const turn=angleDelta(car.yaw,desired);
      input={forward:car.speed<4.5,left:turn>.06,right:turn<-.06,brake:Math.abs(turn)>.6 && car.speed>3};
    }
    if(car.gate===DRIVE_ROUTE.length)input={brake:true};
    const movement=advanceCar(car,input,dt);
    const old=car.group.position.clone();
    car.group.position.x+=movement.x;car.group.position.z+=movement.z;
    const p=car.group.position;
    const collision=Math.abs(p.x)>8.2||p.z< -80||p.z>20||this.colliders.some(box=>box.max.y>.3&&p.x+1.3>box.min.x&&p.x-1.3<box.max.x&&p.z+2.1>box.min.z&&p.z-2.1<box.max.z);
    car.collisionCooldown=Math.max(0,car.collisionCooldown-dt);
    if(collision){
      p.copy(old);
      if(Math.abs(car.speed)>3&&car.collisionCooldown===0){car.integrity=Math.max(0,car.integrity-12);car.collisionCooldown=.8;this.damageTime=.2;}
      car.speed*= -.2;
    }
    car.group.rotation.y=car.yaw;
    car.wheels.forEach(wheel=>{wheel.rotation.x+=car.speed*dt*2;});
    if(this.gunner){
      const crew=this.player;
      crew.group.position.copy(new THREE.Vector3(-1.2,.25,.8).applyAxisAngle(UP,car.yaw).add(p));
      crew.group.rotation.y+=angleDelta(crew.group.rotation.y,this.yaw)*Math.min(1,dt*10);
      crew.body.position.y=-.1;crew.body.rotation.x=0;
      crew.recoil=damp(crew.recoil,0,6,dt);
      crew.arms.rotation.x=damp(crew.arms.rotation.x,this.pitch+crew.recoil+(crew.draw>0||crew.reloading>0?-.85:0),12,dt);
      if(this.shooting&&crew.draw<=0&&crew.reloading<=0&&crew.cooldown<=0)this.shoot(crew);
    }else{this.yaw=car.yaw;this.player.group.position.copy(p);}
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
    if(this.ambushStarted&&this.driveByKills<2&&!this.enemies.some(e=>e.driveBy&&e.health>0))this.startAmbush();
    if(car.integrity<=0)this.finish(false);
    else if(car.gate===DRIVE_ROUTE.length&&this.driveByKills>=2){
      this.awardXP(2,XP_REWARDS.escape);this.stage=3;this.finish(true);
    }
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
      rap.time += dt;
      for(let i=0;i<RAP_PATTERN.length;i++) if(previous<beatTime(i) && rap.time>=beatTime(i)) this.beatSound();
      if (rap.time > beatTime(7)+.5) {
        this.rapScore = rap.hits;
        this.rap = null;
        $('#rap-panel').classList.add('hidden');
        if (this.rapScore >= RAP_PASS) {
          this.stage = 2;
          this.awardXP(1,XP_REWARDS.rap);
          this.toast(`Doom: ${this.rapScore}/8. Verse in the bag. Z, pull that whip around. Press 3.`);
        } else this.toast(`${this.rapScore}/8 beats. Need 6. Press E at the mic to try again.`);
      }
    }
    const objective = OBJECTIVES[this.stage];
    this.terminals.forEach((terminal,i) => {
      terminal.ring.material.opacity = i===this.stage ? .55+Math.sin(this.elapsed*3)*.2 : .12;
      terminal.marker.visible = i>=this.stage && !this.driving;
      terminal.marker.lookAt(this.camera.position);
    });
    this.routeMarkers.forEach((marker,i) => {
      marker.ring.visible = marker.label.visible = this.stage===2 && i===this.car.gate;
      marker.label.lookAt(this.camera.position);
    });
    const prompt = $('#interaction');
    prompt.classList.add('hidden');
    if (!objective || this.stage===0 || this.rap || this.driving) return;
    const position = this.stage===2 ? this.car.group.position : new THREE.Vector3(...objective.position);
    const radius = this.stage===2 ? 4.5 : 3;
    if(this.player.group.position.distanceTo(position)<radius) {
      prompt.classList.remove('hidden');
      prompt.innerHTML = this.active===objective.character ? `<kbd>E</kbd> ${this.stage===1 ? 'TAKE THE MIC' : 'ENTER GETAWAY CAR'}<small>${this.stage===1 ? 'J / K / L · Land 6 of 8 beats' : 'W / S drive · A / D steer · Space brake · E exit'}</small>` : `SWITCH TO ${ROSTER[objective.character].name.toUpperCase()}<small>Press ${objective.character+1} · This is their part of the story.</small>`;
    }
  }

  finish(success) {
    this.running = false;
    this.finished = true;
    this.shooting = false;
    this.keys.clear();
    if (document.pointerLockElement) document.exitPointerLock();
    $('#hud').classList.add('hidden');
    $('#result').classList.remove('hidden');
    $('#pause-menu').classList.add('hidden');
    $('#result-tag').textContent = success ? 'OPERATION COMPLETE / CHAPTER 01' : 'CREW MEMBER DOWN';
    $('#result-title').innerHTML = success ? 'CREW<br>EXTRACTED.' : 'NO ONE<br>LEFT BEHIND.';
    const minutes = Math.floor(this.elapsed / 60);
    const seconds = String(Math.floor(this.elapsed % 60)).padStart(2, '0');
    $('#result-detail').textContent = success ? `Enter CHIRAQ complete. ${minutes}:${seconds} · Draco: ${this.characters[0].kills} takedowns · doom: ${this.rapScore || 0}/8 beats · Z78: 3/3 route markers · Back seat: ${this.driveByKills}/2. The crew rides out together.` : this.car.integrity <= 0 ? 'The getaway car is wrecked. Brake for corners and avoid parked cars.' : 'The escape needs all three characters alive. Use cover, keep moving, and switch before a crew member gets overwhelmed.';
  }

  awardXP(index,amount) {
    const ready=awardCharge(this.characters[index],amount);
    try{localStorage.setItem(XP_KEY,JSON.stringify(this.characters.map(p=>p.xp)));}catch{/* Progress still works in memory when storage is unavailable. */}
    if(ready)this.toast(`${ROSTER[index].name}: Special charged. Holding that for when it counts.`);
  }

  requestSpecial() {
    this.toast(this.player.xp>=XP_CAP?'Special charged and saved. This character’s ability is not assigned yet.':'Keep earning XP from kills and tasks to charge this character’s special.');
  }

  toast(message) {
    if(this.dialogueLog.at(-1)===message||this.narrationQueue.includes(message))return;
    this.dialogueLog.push(message);if(this.dialogueLog.length>50)this.dialogueLog.shift();
    this.narrationQueue.push(message);
    if(this.toastTime<=0)this.showNextNarration();
  }

  showNextNarration() {
    const message=this.narrationQueue.shift();
    if(!message){this.toastTime=0;return;}
    $('#toast-text').textContent=message;
    this.toastTime=narrationDuration(message);
  }

  updateCamera(dt) {
    const p = this.driving && !this.gunner ? this.car.group.position : this.player.group.position;
    const direction = new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const focus = p.clone().add(new THREE.Vector3(0,this.gunner?1.4:this.player.slide>0?.95:1.7,0));
    const distance = this.gunner ? this.aiming?2.6:3.8 : this.driving ? 8.5 : this.aiming ? 3.1 : 5.6;
    const offset = direction.clone().multiplyScalar(-distance).addScaledVector(right, this.aiming ? .65 : 1.05);
    if(this.gunner) {
      // Lift the shoulder camera above the roof and toward the open left window.
      // A normal orbit otherwise puts the opaque car body between camera and gun.
      offset.y+=2;
      offset.add(new THREE.Vector3(-2.5,0,0).applyAxisAngle(UP,this.car.yaw));
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
    const state = this.weaponState;
    const weapon = this.weapon;
    $('#ammo').textContent = state.rounds.join(' + ');
    $('#capacity').textContent = weapon.barrels > 1 ? `${weapon.capacity} EACH` : weapon.capacity;
    $('#spares').textContent = state.spares;
    $('#weapon-name').textContent = weapon.name;
    $('#weapon-status').textContent = this.player.reloading > 0 ? `RELOADING · ${this.player.reloading.toFixed(1)}s` : this.player.draw > 0 ? `DRAWING · ${this.player.draw.toFixed(1)}s` : `${this.player.slot === 0 ? 'PRIMARY' : 'SIDEARM'} / FULL AUTO`;
    document.querySelectorAll('.squad-card').forEach((card, i) => {
      card.classList.toggle('selected', i === this.active);
      card.querySelector('.active-label').textContent = i===this.active?'ACTIVE':this.driving?i===2?'DRIVING':'RIDING':this.characters[i].aiState;
      $(`#xp-${i}`).style.width=`${this.characters[i].xp}%`;
      $(`#xp-label-${i}`).textContent=this.characters[i].xp>=XP_CAP?'SPECIAL READY':`XP ${this.characters[i].xp}/100`;
      $(`#health-${i}`).style.width = `${this.characters[i].health}%`;
    });
    const objective = OBJECTIVES[Math.min(this.stage, 2)];
    $('#objective-title').textContent = objective.title;
    $('#objective-description').textContent = objective.description;
    $('#mission-step').textContent = `0${Math.min(this.stage + 1, 3)} / 03`;
    const target = combatTarget(this.characters.map(p => p.kills));
    const progress = this.stage === 0 ? this.characters[0].kills / target : this.stage === 1 ? (this.rap?.hits || 0) / 8 : this.car.gate / 3;
    $('#objective-progress').style.width = `${Math.min(1,progress)*100}%`;
    $('#objective-count').textContent = this.stage === 0 ? `DRACO ${this.characters[0].kills}/${target} · OR SPECIAL OPP ${this.characters[0].specialKills>0?'DOWN':'MARKED'}` : this.stage === 1 ? `HIT ${RAP_PASS} OF 8 BEATS · J / K / L` : `ROUTE ${this.car.gate}/3 · BACK-SEAT TAKEDOWNS ${this.driveByKills}/2`;
    $('#crosshair').classList.toggle('hidden',this.driving&&!this.gunner || Boolean(this.rap));
    $('.weapon-panel').classList.toggle('hidden',this.driving&&!this.gunner || Boolean(this.rap));
    $('#drive-mode').textContent=this.gunner?'DRACO / BACK-SEAT SHOOTER':'Z78 / THE GETAWAY';
    $('#drive-help').textContent=this.gunner?'MOUSE AIM · LMB FIRE · R RELOAD · 3 DRIVE':this.car.gate<1?'WASD DRIVE · SPACE BRAKE · E EXIT':'1 BACK-SEAT GUNNER · WASD DRIVE · SPACE BRAKE';
    $('#drive-kills').textContent=`BACK SEAT ${this.driveByKills}/2`;
    $('#special-status').textContent=this.player.xp>=XP_CAP?'SPECIAL READY · ABILITY COMING LATER':`SPECIAL CHARGE ${this.player.xp}/100`;
    $('#drive-speed').textContent = Math.round(Math.abs(this.car.speed)*3.6);
    $('#car-integrity').textContent = `${Math.round(this.car.integrity)}%`;
    $('#drive-route').textContent = `${this.car.gate}/3`;
    if(this.rap) {
      $('#rap-score').textContent = `${this.rap.hits}/8`;
      $('#rap-feedback').textContent = this.rap.feedback;
      $('#rap-lyric').textContent = RAP_LINES[Math.min(3,Math.max(0,Math.floor((this.rap.time-1.5)/(BEAT_SECONDS*2))))];
      const notes=$('#rap-notes');
      notes.innerHTML = RAP_PATTERN.map((code,i)=>`<span class="rap-note ${this.rap.judged[i]?'judged':''}" style="left:${20+(beatTime(i)-this.rap.time)*24}%">${code.slice(-1)}</span>`).join('');
    }
    $('#crosshair').classList.toggle('aiming', this.aiming);
    $('#crosshair').style.opacity = this.player.draw > 0 || this.player.reloading > 0 ? '.3' : '1';
    $('#toast').style.opacity = this.toastTime > 0 ? '1' : '0';
    $('#hit-marker').style.opacity = this.hitTime > 0 ? '1' : '0';
    $('#damage-flash').style.opacity = String(this.damageTime * 2);
    const heading = ((this.yaw * -180 / Math.PI) % 360 + 360) % 360;
    $('#heading').textContent = `${String(Math.round(heading)).padStart(3, '0')}°`;
    // Project the barrel's real aim into the view; it can lag behind mouse look.
    this.scene.updateMatrixWorld(true);
    const muzzle = this.player.guns[0].muzzle;
    const origin = muzzle.getWorldPosition(new THREE.Vector3());
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(muzzle.getWorldQuaternion(new THREE.Quaternion()));
    const ray = new THREE.Ray(origin, direction);
    let distance = 60;
    for (const box of this.colliders) {
      const hit = ray.intersectBox(box, new THREE.Vector3());
      if (hit) distance = Math.min(distance, origin.distanceTo(hit));
    }
    const projected = origin.addScaledVector(direction, distance).project(this.camera);
    $('#crosshair').style.left = `${clamp((projected.x + 1) * 50, 2, 98)}%`;
    $('#crosshair').style.top = `${clamp((1 - projected.y) * 50, 4, 96)}%`;
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
    if (this.running) {
      // Fixed-size physics steps keep movement and fire rate consistent at low FPS.
      let remaining = dt;
      while (remaining > 0 && this.running) {
        const step = Math.min(remaining, 1 / 60);
        remaining -= step;
        this.elapsed += step;
        for (const character of this.characters) {
          if (character !== this.player) this.updateGravity(character, step);
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
            gun.group.rotation.x = gun.recoil;
          });
          if (character.reloading > 0) {
            character.reloading = Math.max(0, character.reloading - step);
            if (character.reloading === 0) reload(character.loadout[character.slot]);
          }
        }
        if (this.driving) this.updateDriving(step);
        else if (!this.rap) this.updatePlayer(step);
        this.updateAI(step);
        if (this.running) this.updateObjectives(step);
      }
      this.toastTime = Math.max(0, this.toastTime - dt);
      if(this.toastTime===0&&this.narrationQueue.length)this.showNextNarration();
      this.enemies.forEach(enemy=>{if(enemy.badge&&enemy.health>0)enemy.badge.lookAt(this.camera.position);});
      this.hitTime = Math.max(0, this.hitTime - dt);
      this.damageTime = Math.max(0, this.damageTime - dt);
      this.updateCamera(dt);
      this.updateHUD();
    }
    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].life -= dt;
      if (this.effects[i].life <= 0) {
        this.scene.remove(this.effects[i].mesh);
        this.effects[i].mesh.geometry.dispose();
        this.effects[i].mesh.material.dispose();
        this.effects.splice(i, 1);
      }
    }
    this.renderer.render(this.scene, this.camera);
  }
}
