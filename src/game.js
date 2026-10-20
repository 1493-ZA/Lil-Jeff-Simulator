import * as THREE from 'three';
import { ROSTER, WEAPONS, createLoadout, fireRound, reload, needsReload } from './combat.js';

const $ = selector => document.querySelector(selector);
const UP = new THREE.Vector3(0, 1, 0);
const clamp = THREE.MathUtils.clamp;
const damp = THREE.MathUtils.damp;
const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const OBJECTIVES = [
  { title: 'Open the route', description: 'King Draco · Hold E at the orange access panel.', character: 0, position: [0, 0, -9], color: '#ffac65', duration: 1.6 },
  { title: 'Restore the signal', description: 'Lil doom · Hold E at the teal radio terminal.', character: 1, position: [-13, 0, -27], color: '#76ddd0', duration: 2.2 },
  { title: 'Start the extraction', description: 'Z78 · Hold E beside the purple getaway van.', character: 2, position: [10, 0, -43], color: '#bca1ff', duration: 2 },
];

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

  buildWorld() {
    this.scene.add(new THREE.HemisphereLight('#c5e1e0', '#34352b', 2.5));
    const sun = new THREE.DirectionalLight('#ffe0ad', 3.4);
    sun.position.set(-25, 40, -15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, far: 120 });
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
    this.box(53, 0.5, 83, '#46565a', 0, -0.25, -19);
    this.box(53, 0.12, 83, '#66716a', 0, -0.18, -19);
    this.box(400, 0.1, 400, '#3c777f', 0, -1.5, -30, { metalness: 0.65, roughness: 0.3 });
    this.box(0.6, 2.3, 83, '#34484b', -26, 1, -19, { solid: true });
    this.box(0.6, 2.3, 83, '#34484b', 26, 1, -19, { solid: true });
    this.box(53, 2.3, 0.6, '#34484b', 0, 1, 22, { solid: true });
    this.box(53, 2.3, 0.6, '#34484b', 0, 1, -60, { solid: true });
    for (let z = 18; z > -57; z -= 5) {
      this.box(0.17, 0.018, 2.3, '#cbbf8a', 0, 0.02, z);
      this.box(0.12, 0.018, 3, '#a6ada0', -21, 0.02, z);
      this.box(0.12, 0.018, 3, '#a6ada0', 21, 0.02, z);
    }
    const containers = [
      [-15, 5, '#b36541'], [-15, -9, '#537e7a'], [14, -4, '#bb824b'],
      [15, -20, '#427781'], [-16, -41, '#a05d47'], [16, -53, '#537e7a'],
    ];
    containers.forEach(([x, z, color], index) => {
      this.box(7, 4.8, 11, color, x, 2.4, z, { solid: true });
      for (let dz = -5; dz <= 5; dz += 0.65) this.box(7.06, 4.65, 0.07, color, x, 2.4, z + dz);
      this.box(7.15, 0.16, 11.1, '#a6aaa0', x, 4.82, z);
      this.label(`LJ / ${String(index + 7).padStart(3, '0')}`, '#ebe4ca', 3.8, x, 2.9, z + 5.56, 45);
      if (index === 1 || index === 5) this.box(7, 4.8, 11, '#44646c', x, 7.3, z);
    });
    [[-5, 1], [7, -13], [-6, -19], [4, -32], [-9, -50]].forEach(([x, z]) => {
      this.box(3.6, 1.1, 1.5, '#747e74', x, 0.55, z, { solid: true });
      for (let dx = -1.3; dx <= 1.3; dx += .9) {
        const stripe = this.box(.3, .95, .018, '#dfba63', x + dx, .55, z + .76);
        stripe.rotation.z = -.4;
      }
    });
    [[9, 8], [-8, -14], [20, -32], [-20, -24], [4, -52]].forEach(([x, z]) => {
      this.box(1.6, 1.6, 1.6, '#92724f', x, .8, z, { solid: true });
      this.box(1.65, .12, 1.65, '#373c32', x, .3, z);
      this.box(1.65, .12, 1.65, '#373c32', x, 1.3, z);
    });
    for (let z = 12; z > -60; z -= 18) {
      [-23, 23].forEach(x => {
        this.cylinder(.13, 9, '#344b4f', x, 4.5, z);
        this.box(2.5, .18, .6, '#b8c0af', x + (x < 0 ? 1 : -1), 9, z);
        const lamp = new THREE.PointLight('#ffe5ab', 14, 15, 2);
        lamp.position.set(x, 8.6, z);
        this.scene.add(lamp);
      });
    }
    // Distant port silhouettes and gantry cranes.
    for (let i = 0; i < 14; i++) this.box(7, 5 + (i % 4) * 3, 10, '#45606a', -70 + i * 11, 1, -95 - (i % 3) * 10);
    [-42, 39].forEach(x => {
      this.box(1.5, 34, 1.5, '#a67854', x, 15, -45);
      this.box(1.5, 34, 1.5, '#a67854', x + 11, 15, -45);
      this.box(28, 1.5, 2, '#bd8759', x + 5, 32, -45);
      this.box(.1, 18, .1, '#3b5159', x + 14, 23, -45);
      this.box(4, 2, 3, '#486772', x, 30, -45);
    });
    this.label('NORTH DOCKS', '#dce1c5', 11, 0, 8, -59);
    this.label('07  /  AUTHORIZED CREW ONLY', '#dce1c5', 9, 0, 5.5, -59, 25);
    this.terminals = OBJECTIVES.map((objective, i) => {
      const [x, , z] = objective.position;
      if (i < 2) {
        this.box(1.5, 1.4, .7, '#22383d', x, .7, z, { solid: true });
        this.box(1.15, .65, .04, objective.color, x, 1, z + .38, { emissive: objective.color, emissiveIntensity: .5 });
        if (i === 1) {
          this.cylinder(.05, 5, '#9fae9f', x + .4, 2.5, z);
          this.box(2, .07, .07, '#9fae9f', x + .4, 4.6, z);
        }
      } else {
        this.box(3.2, 2.2, 5.8, '#758a7a', x, 1.5, z, { solid: true });
        this.box(3.25, .8, 1.7, '#1e3e48', x, 2.1, z + 1.8);
        for (const dx of [-1.6, 1.6]) for (const dz of [-1.9, 1.9]) {
          const wheel = this.cylinder(.55, .3, '#172b30', x + dx, .55, z + dz);
          wheel.rotation.z = Math.PI / 2;
        }
        this.box(2.7, .15, .08, '#bca1ff', x, 1, z + 2.95, { emissive: '#bca1ff', emissiveIntensity: 1 });
      }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(i === 2 ? 4.4 : 2.2, .035, 5, 60), new THREE.MeshBasicMaterial({ color: objective.color, transparent: true, opacity: .7 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, .08, z);
      this.scene.add(ring);
      const marker = this.label(`0${i + 1}  /  ${ROSTER[i].role}`, objective.color, 3.5, x, i === 2 ? 4.3 : 3.2, z);
      return { ring, marker };
    });
  }

  buildPerson(color, enemy = false) {
    const group = new THREE.Group();
    const body = new THREE.Group();
    group.add(body);
    const torso = this.box(.68, .8, .38, enemy ? '#30464c' : color, 0, 1.23, 0, { parent: body });
    this.box(.53, .48, .08, '#25383a', 0, 1.23, -.23, { parent: body });
    this.box(.42, .43, .4, enemy ? '#567076' : '#9b765b', 0, 1.9, 0, { parent: body });
    this.box(.46, .18, .45, enemy ? '#1c333b' : '#253b3a', 0, 2.12, 0, { parent: body });
    this.box(.32, .075, .03, enemy ? '#ff8262' : '#c6dfbf', 0, 1.94, -.22, { parent: body, emissive: enemy ? '#ff6847' : '#8ba390', emissiveIntensity: .6 });
    const legs = [-.19, .19].map(x => {
      const pivot = new THREE.Group();
      pivot.position.set(x, .85, 0);
      body.add(pivot);
      this.box(.25, .72, .29, '#283d40', 0, -.36, 0, { parent: pivot });
      this.box(.28, .17, .42, '#172b2d', 0, -.77, -.06, { parent: pivot });
      return pivot;
    });
    const arms = new THREE.Group();
    arms.position.set(0, 1.5, 0);
    body.add(arms);
    this.box(.21, .23, .66, color, .42, -.08, -.28, { parent: arms });
    this.box(.21, .23, .55, color, -.36, -.08, -.25, { parent: arms });
    const guns = [];
    for (const x of [.4, -.36]) {
      const gun = new THREE.Group();
      gun.position.set(x, -.02, -.65);
      this.box(.14, .17, .48, '#172b30', 0, 0, 0, { parent: gun, metalness: .7 });
      this.box(.09, .22, .13, '#273c3e', 0, -.15, .12, { parent: gun });
      const muzzle = new THREE.Object3D();
      muzzle.position.z = -.28;
      gun.add(muzzle);
      const flash = new THREE.Mesh(new THREE.ConeGeometry(.16, .5, 5), new THREE.MeshBasicMaterial({ color: '#ffe0a1' }));
      flash.rotation.x = -Math.PI / 2;
      flash.position.z = -.48;
      flash.visible = false;
      gun.add(flash);
      const drum = this.cylinder(.22, .25, '#263b3c', 0, -.2, .02, gun);
      drum.rotation.x = Math.PI / 2;
      arms.add(gun);
      guns.push({ group: gun, muzzle, flash, drum });
    }
    group.userData.torso = torso;
    this.scene.add(group);
    return { group, body, legs, arms, guns };
  }

  buildCrew() {
    this.characters = ROSTER.map((person, i) => ({
      ...this.buildPerson(person.color), index: i, health: 100, loadout: createLoadout(person.primary), slot: 0,
      velocityY: 0, grounded: true, slide: 0, slideDirection: new THREE.Vector3(), draw: WEAPONS[person.primary].draw,
      reloading: 0, cooldown: 0, recoil: 0, flashTime: 0, aiCooldown: 0,
    }));
    this.characters.forEach((character, i) => character.group.position.set((i - 1) * 3, 0, 12 + i * .5));
  }

  buildEnemies() {
    [[-5, -5], [7, -19], [-7, -31], [5, -40], [-4, -47], [18, -34]].forEach(([x, z], i) => {
      const enemy = { ...this.buildPerson('#52636a', true), health: 85, cooldown: 1 + i * .2, flashTime: 0, home: new THREE.Vector3(x, 0, z) };
      enemy.group.position.copy(enemy.home);
      enemy.group.traverse(object => { if (object.isMesh) object.userData.enemy = enemy; });
      this.enemies.push(enemy);
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
      if (event.button === 0) this.shooting = true;
      if (event.button === 2) this.aiming = true;
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
    this.started = true;
    this.running = true;
    this.keys.clear();
    $('#menu').classList.add('hidden');
    $('#hud').classList.remove('hidden');
    this.captureMouse();
    try { this.audio ??= new AudioContext(); this.audio.resume(); } catch { /* Audio is optional. */ }
    this.toast('King Draco: First the access panel. Then we get the crew out.');
  }

  pause() {
    if (!this.started || this.finished) return;
    this.running = false;
    this.shooting = this.aiming = false;
    this.keys.clear();
    if (document.pointerLockElement) document.exitPointerLock();
    $('#menu').classList.remove('hidden');
    $('#start').innerHTML = 'RESUME MISSION <span>↗</span>';
  }

  reset() {
    location.reload();
  }

  get player() { return this.characters[this.active]; }
  get weaponState() { return this.player.loadout[this.player.slot]; }
  get weapon() { return WEAPONS[this.weaponState.id]; }

  switchCharacter(index) {
    if (!this.running || index === this.active) return;
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
      pos.z = clamp(pos.z, -59.1, 21.1);
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
    p.body.position.y = damp(p.body.position.y, sliding ? -.65 : 0, 15, dt);
    p.body.rotation.x = damp(p.body.rotation.x, sliding ? -.55 : 0, 12, dt);
    p.arms.rotation.x = damp(p.arms.rotation.x, this.pitch + p.recoil + (p.draw > 0 || p.reloading > 0 ? -.85 : 0), 12, dt);
    p.legs.forEach((leg, i) => { leg.rotation.x = sliding ? -.9 : direction.lengthSq() > 0 && p.grounded ? Math.sin(this.elapsed * speed * 2.2 + i * Math.PI) * .55 : p.grounded ? 0 : (i ? -.5 : .6); });
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
    const spread = weapon.spread * (character.grounded ? 1 : 2.6) * (character.slide > 0 ? 1.8 : moving ? 1.4 : 1) * (character === this.player && this.aiming ? .65 : 1) + character.recoil * .08;
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
    character.flashTime = .045;
    character.recoil = Math.min(character.recoil + weapon.kick, .24);
    if (character === this.player) { this.shots++; this.sound(weapon.id); }
    if (victim) {
      victim.health = Math.max(0, victim.health - weapon.damage);
      if (character === this.player) { this.hits++; this.hitTime = .14; }
      if (victim.health <= 0) {
        victim.group.rotation.z = Math.PI / 2;
        victim.group.position.y = .35;
        victim.group.traverse(mesh => { if (mesh.isMesh) mesh.material.color.multiplyScalar(.45); });
        this.kills++;
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
      if (distance > 26) continue;
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
          target.health = Math.max(0, target.health - 5);
          if (target === this.player) this.damageTime = .3;
          if (target.health <= 0) { this.finish(false); return; }
        }
      }
      enemy.flashTime = Math.max(0, enemy.flashTime - dt);
      enemy.guns[0].flash.visible = enemy.flashTime > 0;
    }
    for (const character of this.characters) {
      if (character === this.player || character.health <= 0) continue;
      const target = this.enemies.filter(e => e.health > 0 && e.group.position.distanceTo(character.group.position) < 22).sort((a,b) => a.group.position.distanceToSquared(character.group.position) - b.group.position.distanceToSquared(character.group.position))[0];
      if (!target) continue;
      const from = character.group.position.clone().add(new THREE.Vector3(0, 1.5, 0));
      const to = target.group.position.clone().add(new THREE.Vector3(0, 1.3, 0));
      if (!this.hasLineOfSight(from, to)) continue;
      const direction = to.clone().sub(from);
      character.group.rotation.y += angleDelta(character.group.rotation.y, Math.atan2(-direction.x, -direction.z)) * Math.min(1, dt * 7);
      character.arms.rotation.x = Math.atan2(direction.y, Math.hypot(direction.x, direction.z)) + character.recoil;
      character.recoil = damp(character.recoil, 0, 7, dt);
      if (character.cooldown <= 0 && character.draw <= 0 && character.reloading <= 0) {
        if (!character.loadout[character.slot].rounds.some(n => n > 0)) {
          if (needsReload(character.loadout[character.slot])) character.reloading = WEAPONS[character.loadout[character.slot].id].reload;
        } else this.shoot(character);
      }
    }
  }

  updateObjectives(dt) {
    if (this.stage >= OBJECTIVES.length) return;
    const objective = OBJECTIVES[this.stage];
    const pos = new THREE.Vector3(...objective.position);
    const distance = this.player.group.position.distanceTo(pos);
    const radius = this.stage === 2 ? 6 : 3;
    const prompt = $('#interaction');
    this.terminals.forEach((terminal, i) => {
      terminal.ring.material.opacity = i === this.stage ? .5 + Math.sin(this.elapsed * 3) * .2 : .15;
      terminal.marker.visible = i >= this.stage;
      terminal.marker.lookAt(this.camera.position);
    });
    if (distance < radius) {
      prompt.classList.remove('hidden');
      const correct = this.active === objective.character;
      prompt.innerHTML = correct ? `<kbd>E</kbd> HOLD TO ${ROSTER[this.stage].role}<small>${Math.round(this.progress / objective.duration * 100)}% COMPLETE</small>` : `SWITCH TO ${ROSTER[objective.character].name.toUpperCase()}<small>Press ${objective.character + 1} · This checkpoint needs their skills.</small>`;
      if (correct && this.keys.has('KeyE')) this.progress += dt;
      else this.progress = Math.max(0, this.progress - dt * 2);
      if (this.progress >= objective.duration) {
        this.stage++;
        this.progress = 0;
        prompt.classList.add('hidden');
        if (this.stage === 3) this.finish(true);
        else this.toast(this.stage === 1 ? 'Route open. Switch to Lil doom and reach the radio.' : 'Signal restored. Z78, get that van running.');
      }
    } else {
      prompt.classList.add('hidden');
      this.progress = 0;
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
    $('#result-tag').textContent = success ? 'OPERATION COMPLETE / CHAPTER 01' : 'CREW MEMBER DOWN';
    $('#result-title').innerHTML = success ? 'CREW<br>EXTRACTED.' : 'NO ONE<br>LEFT BEHIND.';
    const minutes = Math.floor(this.elapsed / 60);
    const seconds = String(Math.floor(this.elapsed % 60)).padStart(2, '0');
    $('#result-detail').textContent = success ? `All three checkpoints complete. ${minutes}:${seconds} elapsed · ${this.kills} guards disabled · ${this.shots ? Math.round(this.hits / this.shots * 100) : 0}% shot accuracy. The crew rides out together.` : 'The escape needs all three characters alive. Use cover, keep moving, and switch before a crew member gets overwhelmed.';
  }

  toast(message) {
    $('#toast').textContent = message;
    this.toastTime = 4;
  }

  updateCamera(dt) {
    const p = this.player.group.position;
    const direction = new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const focus = p.clone().add(new THREE.Vector3(0, this.player.slide > 0 ? 1.15 : 1.7, 0));
    const distance = this.aiming ? 3.1 : 5.6;
    const offset = direction.clone().multiplyScalar(-distance).addScaledVector(right, this.aiming ? .65 : 1.05);
    const cameraRay = new THREE.Ray(focus, offset.clone().normalize());
    let allowed = offset.length();
    for (const box of this.colliders) {
      const hit = cameraRay.intersectBox(box, new THREE.Vector3());
      if (hit) allowed = Math.min(allowed, Math.max(.5, focus.distanceTo(hit) - .25));
    }
    const desired = focus.clone().add(offset.normalize().multiplyScalar(allowed));
    desired.y = Math.max(.35, desired.y);
    this.camera.position.lerp(desired, 1 - Math.exp(-dt * 12));
    this.camera.lookAt(this.camera.position.clone().addScaledVector(direction, 35));
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
      card.querySelector('.active-label').textContent = i === this.active ? 'ACTIVE' : 'COVERING';
      $(`#health-${i}`).style.width = `${this.characters[i].health}%`;
    });
    const objective = OBJECTIVES[Math.min(this.stage, 2)];
    $('#objective-title').textContent = objective.title;
    $('#objective-description').textContent = objective.description;
    $('#mission-step').textContent = `0${Math.min(this.stage + 1, 3)} / 03`;
    $('#objective-progress').style.width = `${this.progress / objective.duration * 100}%`;
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
          character.guns.forEach((gun, i) => {
            gun.flash.visible = character.flashTime > 0 && (character.loadout[character.slot].rounds.length > 1 || i === 0);
            gun.group.visible = i === 0 || character.loadout[character.slot].id === 'akimbo';
            const id = character.loadout[character.slot].id;
            gun.drum.visible = id !== 'switch';
            gun.group.scale.z = id === 'arp' ? 1.8 : id === 'draco' ? 1.35 : 1;
          });
          if (character.reloading > 0) {
            character.reloading = Math.max(0, character.reloading - step);
            if (character.reloading === 0) reload(character.loadout[character.slot]);
          }
        }
        this.updatePlayer(step);
        this.updateAI(step);
        if (this.running) this.updateObjectives(step);
      }
      this.toastTime = Math.max(0, this.toastTime - dt);
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
