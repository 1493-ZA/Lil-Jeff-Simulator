# Lil Jeff Simulator

A playable third-person browser prototype built with Three.js and Vite. **The Harbor Run** is a short single-player mission that requires King Draco, Lil doom, and Z78 to complete three sequential checkpoints.

## Run

Requires Node.js 22.12+ or 24+ and npm. From this checkout:

```sh
npm ci --cache /tmp/lil-jeff-npm
npm run dev
```

Open the address reported by Vite in a WebGL-capable desktop browser. Click **Enter the Harbor** to capture the mouse. For integrated graphics or software rendering, add `?quality=low` to the address; this lowers resolution and disables shadows. Assets and fonts are bundled locally; no API keys, accounts, or backend services are needed.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move relative to camera heading |
| Mouse | Look and aim |
| Space | Jump; combine with any movement direction |
| Shift | Sprint |
| C | Slide in the movement direction, or forward while stationary |
| Left mouse / right mouse | Automatic fire / tighter aiming |
| 1 / 2 / 3 | King Draco / Lil doom / Z78 |
| Q | Swap primary and sidearm |
| R | Reload |
| Hold E | Complete the nearby character-specific checkpoint |
| Esc | Pause and release the mouse |

Movement, jumping, and sliding permit firing after the weapon is drawn. Bullets are hitscan rays from the actual muzzle, with weapon-specific spread, recoil, draw time, and cover occlusion. The reticle follows the barrel's aim and can lag behind a fast camera turn. Jumping and sliding increase spread. Inactive crew members stay in place and defend themselves using their own ammunition. All three must survive.

## Mission

1. King Draco: reach the orange **BREACH** panel and hold E.
2. Switch to Lil doom: reach the teal **SIGNAL** radio and hold E.
3. Switch to Z78: reach the purple **EXTRACT** van and hold E.

The crew escapes together when Z78 starts the van. Checkpoints enforce the correct character, but the first prototype uses interactions rather than unique character abilities or animated doors. Guards are simple stationary placeholder AI. The story currently consists of this mission briefing and checkpoint dialogue; there are no additional levels or cinematics yet.

## Loadouts

| Character | Primary | Loaded ammunition | Spare magazines/drums |
| --- | --- | --- | --- |
| King Draco | MICRODRAC | 100 | 4 |
| Lil doom | AR-P | 50 | 6 |
| Z78 | AKIMBO GLOCKS | 50 per hand | 6 total |
| Everyone | GLOCK WITH SWITCH | 30 | 5 |

Six spare akimbo drums means three full reloads of both hands. Each gun consumes a drum independently. Partial reloads discard remaining rounds. MICRODRAC deals more damage with stronger recoil; AR-P is the most accurate primary; the shared sidearm is more controllable than akimbo. The prototype gives AR-P the same cyclic rate as MICRODRAC as an initial tuning value, with no fixed slower-fire-rate requirement. All balance values live in `src/combat.js`.

## Validate

```sh
npm test
npm run build
npm run test:browser
```

Browser tests use `/usr/bin/chromium` by default; set `CHROMIUM_PATH` to another Chromium executable if needed. They exercise keyboard and mouse controls, airborne and sliding fire, draw and reload timing, muzzle-based hits, cover blocking, role restrictions, and the complete three-checkpoint sequence. Combat math tests check loadouts and finite ammunition. Integration tests disable guards for deterministic control/mission checks and position actors directly for the muzzle/cover test; they are not a full difficulty or manual playability assessment.

The `?test=1` query exposes a diagnostic game object for browser tests. Normal gameplay does not expose it. Browser screenshots are generated in ignored `test-results/`.

## Current scope

Original geometric placeholder models, one mission, desktop keyboard/mouse only, synthesized firing sounds, and no multiplayer, save system, or mobile controls. Realistic character art, full weapon animation, squad navigation, unique mission mechanics, campaign writing, and final balancing come after playtesting this foundation.
