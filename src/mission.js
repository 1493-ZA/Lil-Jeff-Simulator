export const OBJECTIVES = [
  { title: 'Settle the score', description: 'King Draco · Drop 3 armed opps OR the marked Special Opp.', character: 0, position: [0, 0, -7], color: '#ffac65' },
  { title: 'Own the mic', description: 'Lil doom · Reach the sidewalk mic. Press E, then hit J / K / L on the beat.', character: 1, position: [-11, 0, -25], color: '#76ddd0' },
  { title: 'Ride out', description: 'Z78 drives. After the first marker, press 1: Draco fires from the back seat at the armed ambush.', character: 2, position: [4, 0, -38], color: '#bca1ff' },
];

export const RAP_PATTERN = ['KeyJ', 'KeyK', 'KeyL', 'KeyJ', 'KeyL', 'KeyK', 'KeyJ', 'KeyL'];
export const RAP_LINES = ['Streetlights on, we make our own way', 'Keep the crew close, hear what I say', 'One on the mic, two holding it down', 'Three different lanes, one side of town'];
export const BEAT_SECONDS = .65;
export const RAP_WINDOW = .23;
export const RAP_PASS = 6;
export const DRIVE_ROUTE = [[4, -49], [-3, -61], [2, -74]];

export function combatTarget() { return 3; }
export function combatComplete(character) { return character.kills >= 3 || character.specialKills > 0; }
export function beatTime(index) { return 1.5 + index * BEAT_SECONDS; }
export function createRap() { return { time: 0, hits: 0, judged: Array(RAP_PATTERN.length).fill(false), feedback: 'Find the pocket. J / K / L on the line.' }; }
export function judgeRap(rap, code) {
  const index = RAP_PATTERN.findIndex((key, i) => !rap.judged[i] && Math.abs(rap.time - beatTime(i)) <= RAP_WINDOW);
  if (index < 0) { rap.feedback = 'Off beat · wait for the line'; return false; }
  rap.judged[index] = true;
  const success = RAP_PATTERN[index] === code;
  if (success) rap.hits++;
  rap.feedback = success ? 'IN THE POCKET' : 'Wrong key · catch the next beat';
  return success;
}

export function advanceCar(state, input, dt) {
  const throttle = Number(Boolean(input.forward)) - Number(Boolean(input.backward));
  const drag = input.brake ? 4 : throttle ? .5 : 1.8;
  state.speed += throttle * 13 * dt;
  state.speed *= Math.exp(-drag * dt);
  state.speed = Math.max(-7, Math.min(18, state.speed));
  state.yaw += (Number(Boolean(input.left)) - Number(Boolean(input.right))) * Math.min(Math.abs(state.speed) / 5, 1) * Math.sign(state.speed) * 1.1 * dt;
  return { x: -Math.sin(state.yaw) * state.speed * dt, z: -Math.cos(state.yaw) * state.speed * dt };
}
