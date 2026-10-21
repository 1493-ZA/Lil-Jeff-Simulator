export const XP_CAP = 100;
export const XP_REWARDS = Object.freeze({ kill: 20, special: 40, combat: 40, rap: 60, route: 15, escape: 40, driveBy: 30 });
export const XP_KEY = 'lil-jeff-special-charge-v1';

export function readCharges(storage) {
  try {
    const saved=JSON.parse(storage.getItem(XP_KEY));
    return [0,1,2].map(i => Number.isFinite(saved?.[i]) ? Math.max(0,Math.min(XP_CAP,Math.floor(saved[i]))) : 0);
  } catch { return [0,0,0]; }
}

export function awardCharge(character, amount) {
  const before=character.xp;
  character.xp=Math.min(XP_CAP,Math.max(0,before+amount));
  return before<XP_CAP && character.xp===XP_CAP;
}

export function narrationDuration(message) {
  return Math.max(6, Math.min(16, 2 + message.trim().split(/\s+/).length * .38));
}
