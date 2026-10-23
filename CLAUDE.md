# Lil Jeff Simulator — notes for Claude

Browser third-person game (Three.js + Vite). Owner: Luke. The README covers
gameplay and controls; `docs/playthrough-fixes-qa.md` records the latest update
and what is still unverified.

## Run and test
- `npm ci`, then `npm run dev` (open the printed URL; `?test=1` exposes `window.__game`).
- `npm test` runs the Node checks (must pass). `npm run test:browser` runs the Playwright suite;
  set `CHROMIUM_PATH` if Chromium isn't at `/usr/bin/chromium`.
- Pushes to `main` deploy GitHub Pages: https://1493-ZA.github.io/Lil-Jeff-Simulator/
  Work on a branch and open a pull request; Luke merges.

## Code map
- `src/game.js`: the `Game` class (loop, player, shooting, driving, HUD).
- `src/driver.js`: Z78's Mission 1 autopilot. `src/ground.js`: shared ground height.
- `src/ragdoll.js`, `src/blood.js`: body poses and restrained impact effects.
- `src/navigation.js` + `src/markers.js`: HUD markers, contextual prompts, minimap.
- `src/hotwire.js`: four logic puzzles. `src/street.js`: free roam. `src/territory.js`: zones, heat, accents.
- `src/npc.js`: civilian catalog and crowd. `src/models.js`: code-built cars, weapons and hair.
- `src/network.js` + `src/peer-link.js`: co-op (code-based WebRTC; optional relay in `server/`).
- `src/assets.js`: optional GLB loader with code-built fallbacks.

## Style and rules
- Match the dense existing code style; keep comments short and explanatory.
- Keep content PG-13 and fictional: no real artists' likeness or voices, no real gang symbols.
- Voices come from `scripts/generate-voices.py` (Kokoro); see `public/audio/README.md`.

## Model pipeline (current work)
Luke makes assets with Firefly (concept art) → Meshy (image to 3D) → Blender via Blender MCP
(cleanup and export) → Mixamo (rig + animations). Finished files go in `public/models/`
(rules in `public/models/README.md`).
- First slot: `public/models/props/hydrant.glb` already swaps in via `swapProps` in `src/neighborhood.js`.
- Next: crew characters as skinned GLBs with Mixamo actions named Idle, Walk, Run, Sprint,
  StrafeLeft, StrafeRight, WalkBack, AimWalk, Crouch, CrouchWalk, Reload, TurnLeft, TurnRight,
  Death1, Death2, Rap. Replace the procedural limbs with an AnimationMixer and keep the
  procedural body as the fallback.
- Then a `cars/sedan.glb` with separate `wheel_FL/FR/RL/RR` and `door_driver` (front-hinge
  pivot). Wire it into `buildCar`, keeping `DOOR_OPEN` outward.
- Later: buildings, stairs and background props.
- Also planned (code only): post-processing (AO, bloom, SMAA), HDRI lighting, PBR textures.
