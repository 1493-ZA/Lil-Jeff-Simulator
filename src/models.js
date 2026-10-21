import * as THREE from 'three';

export function buildHair(game, person, style) {
  const hair = new THREE.Group();
  hair.name = style === 0 ? 'shoulder-length loose locs' : 'tied crown locs with violet tips';
  person.body.add(hair);
  const dark = '#171518';
  game.box(.46, .16, .44, dark, 0, 2.12, 0, { parent: hair });
  const count = style === 0 ? 15 : 10;
  for (let i = 0; i < count; i++) {
    const angle = .35 + i / (count - 1) * (Math.PI * 2 - .7);
    const length = style === 0 ? .5 + (i % 3) * .055 : .65 + (i % 4) * .045;
    const pivot = new THREE.Group();
    pivot.position.set(Math.sin(angle) * .24, style === 0 ? 2.12 : 2.22, Math.cos(angle) * .23);
    pivot.rotation.z = Math.sin(angle) * (style === 0 ? .1 : .3);
    hair.add(pivot);
    for (let j = 0; j < 4; j++) {
      const strand = game.cylinder(style === 0 ? .045 : .055, length / 4 + .02, style === 1 && j === 3 ? '#71518c' : dark, Math.sin(j * .9 + i) * .025, -j * length / 4, 0, pivot);
      strand.rotation.z = Math.sin(i + j) * .12;
    }
  }
  if (style === 1) {
    game.cylinder(.18, .23, dark, 0, 2.33, .02, hair);
    game.cylinder(.19, .05, '#bca1ff', 0, 2.27, .02, hair);
  }
  return hair;
}

export function buildWeapon(game, id, parent, x) {
  const group = new THREE.Group();
  group.name = `weapon-${id}`;
  group.position.set(x, -.02, -.57);
  parent.add(group);
  const add = (w, h, d, color, px, py, pz) => game.box(w, h, d, color, px, py, pz, { parent: group, metalness: .55 });
  const steel = '#242b30', black = '#12191d';
  const pistol = id === 'switch' || id === 'akimbo';
  let length;
  if (id === 'draco') {
    add(.19, .2, .48, steel, 0, 0, -.12);
    add(.24, .18, .25, '#925b32', 0, -.035, -.45); // Distinct short wood fore-end.
    add(.1, .1, .22, black, 0, .02, -.63);
    add(.07, .055, .3, steel, 0, .135, -.43);
    add(.035, .1, .035, black, 0, .18, -.65);
    add(.09, .25, .14, '#795338', 0, -.19, .02).rotation.x = -.22;
    length = .77;
  } else if (id === 'arp') {
    add(.18, .2, .42, steel, 0, 0, -.12);
    add(.19, .19, .45, '#35434a', 0, .02, -.53);
    add(.07, .07, .25, black, 0, .03, -.85);
    add(.08, .04, .72, black, 0, .14, -.4);
    add(.12, .12, .2, '#333e45', 0, .19, -.16); // Optic silhouette.
    add(.065, .065, .025, '#9bdfc6', 0, .2, -.27);
    add(.09, .12, .25, '#202b31', 0, .02, .2); // Bare rear tube, no stock.
    add(.09, .24, .13, black, 0, -.19, .01).rotation.x = -.17;
    for (let z = -.7; z < -.35; z += .09) add(.195, .035, .035, black, 0, .045, z);
    length = 1.02;
  } else {
    add(.13, .13, .4, id === 'akimbo' ? '#6a7072' : '#3c4449', 0, .025, -.09);
    add(.13, .08, .3, black, 0, -.07, -.05);
    add(.105, .24, .13, black, 0, -.2, .04).rotation.x = -.16;
    add(.03, .025, .03, '#d4ddc5', 0, .11, -.26);
    if (id === 'switch') add(.09, .21, .11, '#343b40', 0, -.4, .07);
    length = .32;
  }
  if (id !== 'switch') {
    const drum = game.cylinder(pistol ? .18 : .24, .24, '#1d282d', 0, -.32, -.19, group);
    drum.rotation.x = Math.PI / 2;
    game.box(pistol ? .1 : .13, .2, .1, '#26333a', 0, -.19, -.19, { parent: group });
  }
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, .025, -length);
  group.add(muzzle);
  const flash = new THREE.Mesh(new THREE.ConeGeometry(id === 'draco' ? .24 : .13, id === 'draco' ? .66 : .38, 6), new THREE.MeshBasicMaterial({ color: '#ffcf7e' }));
  flash.rotation.x = -Math.PI / 2;
  flash.position.set(0, .025, -length - .16);
  flash.visible = false;
  group.add(flash);
  return { group, muzzle, flash, recoil: 0, flashTime: 0 };
}

export function buildCar(game, position = [4, 0, -38]) {
  const group = new THREE.Group();
  group.position.set(...position);
  group.name = 'Z78 getaway sedan';
  game.scene.add(group);
  const box = (w,h,d,color,x,y,z) => game.box(w,h,d,color,x,y,z,{parent:group});
  box(2.5,.65,4.8,'#343340',0,.9,0);
  box(2.2,.8,2.4,'#242735',0,1.57,.1);
  box(2.05,.6,.03,'#587782',0,1.64,-1.12);
  box(2.05,.6,.03,'#49636c',0,1.64,1.32);
  const windowMeshes=[];
  for (const x of [-1.12,1.12]) windowMeshes.push(box(.025,.55,1.9,'#4e626c',x,1.65,.05));
  box(2.3,.1,.12,'#b2b6b3',0,.65,-2.4);
  for (const x of [-.85,.85]) {
    box(.5,.18,.07,'#ffe0ae',x,1,-2.43);
    box(.5,.15,.07,'#d25f59',x,1,2.43);
  }
  const wheels = [];
  for (const x of [-1.23,1.23]) for (const z of [-1.5,1.5]) {
    const wheel = game.cylinder(.44,.22,'#151d25',x,.5,z,group);
    wheel.rotation.z = Math.PI / 2;
    wheels.push(wheel);
    const hub = game.cylinder(.22,.24,'#8b8e92',x,.5,z,group);
    hub.rotation.z = Math.PI / 2;
  }
  return { group, wheels, windowMeshes, lockState:'locked', speed: 0, yaw: 0, gate: 0, integrity: 100, collisionCooldown: 0 };
}
