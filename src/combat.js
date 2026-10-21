export const WEAPONS = Object.freeze({
  switch: { name: 'GLOCK WITH SWITCH', capacity: 30, spares: 5, damage: 13, rpm: 900, spread: 0.011, kick: 0.016, draw: 0.32, reload: 1.65, barrels: 1, range: 15 },
  draco: { name: 'MICRODRAC', capacity: 100, spares: 4, damage: 24, rpm: 780, spread: 0.022, kick: 0.036, draw: 0.6, reload: 2.8, barrels: 1, range: 25 },
  arp: { name: 'AR-P', capacity: 50, spares: 6, damage: 18, rpm: 780, spread: 0.006, kick: 0.01, draw: 0.5, reload: 2.2, barrels: 1, range: 42 },
  akimbo: { name: 'AKIMBO GLOCKS', capacity: 50, spares: 6, damage: 13, rpm: 1200, spread: 0.037, kick: 0.026, draw: 0.5, reload: 2.6, barrels: 2, range: 10 },
});

export const ROSTER = [
  { name: 'King Draco', tag: 'KD', color: '#ffac65', primary: 'draco', role: 'ENFORCER', description: 'Handle the opps. Cover the getaway.' },
  { name: 'Lil doom', tag: 'LD', color: '#76ddd0', primary: 'arp', role: 'LYRICIST', description: 'Take the mic. Stay on beat.' },
  { name: 'Z78', tag: 'Z7', color: '#bca1ff', primary: 'akimbo', role: 'DRIVER', description: 'Take the wheel. Bring us home.' },
];

export function createLoadout(primary) {
  return [primary, 'switch'].map(id => ({ id, rounds: Array(WEAPONS[id].barrels).fill(WEAPONS[id].capacity), spares: WEAPONS[id].spares, nextBarrel: 0 }));
}

export function fireRound(state, preferredBarrel = null) {
  if (preferredBarrel !== null) {
    if (state.rounds[preferredBarrel] > 0) { state.rounds[preferredBarrel]--; return preferredBarrel; }
    return -1;
  }
  const count = state.rounds.length;
  for (let offset = 0; offset < count; offset++) {
    const barrel = (state.nextBarrel + offset) % count;
    if (state.rounds[barrel] > 0) {
      state.rounds[barrel]--;
      state.nextBarrel = (barrel + 1) % count;
      return barrel;
    }
  }
  return -1;
}

export function reload(state) {
  const weapon = WEAPONS[state.id];
  for (let i = 0; i < state.rounds.length && state.spares > 0; i++) {
    if (state.rounds[i] < weapon.capacity) {
      state.rounds[i] = weapon.capacity;
      state.spares--;
    }
  }
}

export function needsReload(state) {
  return state.spares > 0 && state.rounds.some(rounds => rounds < WEAPONS[state.id].capacity);
}

export const ENEMY_HEALTH=Object.freeze({street:50,static:90,ambush:40,claimBase:45,claimStep:5,switchback:80,vex:100});
export const HIT_MULTIPLIERS=Object.freeze({head:2.5,chest:1.35,abdomen:1,pelvis:.85,leg:.65,foot:.5});
export function hitLocation(height){
  return height>=1.68?'head':height>=1.12?'chest':height>=.82?'abdomen':height>=.62?'pelvis':height>=.2?'leg':'foot';
}
export function woundDamage(baseDamage,location,distanceFactor=1,support=false){
  return baseDamage*(HIT_MULTIPLIERS[location]||1)*distanceFactor*(support?.18:1);
}
