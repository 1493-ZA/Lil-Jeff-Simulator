# Playthrough polish — 2026-10-21

## Scope

Incremental changes to the existing Three.js campaign. Combat balance, cover, camera-to-muzzle aiming, three-character roster, one-mic studio turn structure, saved Street Cred, and the optional relay remain in place.

- Distance-driven procedural gait, accelerated movement, blended knees/hips/postures, separate travel/aim direction and reload support-hand gestures.
- Shaped skull/jaw meshes, cheek/chin forms, black doom fade, retained Draco/Z78 loc styles, clothing seams/pockets, smaller hands and weapon detail. Ten cobalt-blue rival variants.
- Mission 1 driving remains in the vehicle/mission update, with a dedicated passenger-switch regression covering all three route gates.
- Required-character head/edge indicators, category-colored destination navigation, distance, and a north-up free-roam minimap with building footprints and activity icons.
- Larger active-character lower-left health card, heart, numeric HP, low-health warning and unobtrusive damage edges.
- Explicit multi-stage notifications, target-to-escape navigation, immediate completed-marker removal, cooldowns and visible rewards.
- Deep Mission 2 handoff behind the flats with Moss; supplier/client NPCs and three abstract free-roam package jobs (single guarded drop, three-stop run, short quiet drop).
- Door interaction and cabin entry before randomly rotated circuit/sequence/timing puzzles. These puzzles are abstract game mechanisms.
- PG-13 fictional dialogue and regenerated local synthetic voice clips. Street cyphers have character-specific vocal lines over a lowered original instrumental. Studio architecture and turn order remain unchanged.
- Second street, Commerce Row connection, back-building passages, detailed alley props and useful activity destinations. No Mission 4 story was added.
- Static batching, instancing, pooled tracer geometry, quality-dependent cosmetic hair distance and existing scalable render/shadow/effect budgets.

## Validation approach

Node tests exercise rules, damage, mission gates, finite ammunition, delayed relay authority, acceleration, puzzle failures and route/navigation data. Browser tests cover actual WebGL meshes and muzzle rays, keyboard/controller actions, campaign gates, all three puzzles, autonomous driving, NPC exchanges, rewards, minimap/navigation, local audio decoding, one-mic studio staging and delayed two-browser synchronization.

Automated campaign scenarios control placement and timing to isolate behavior; they do not replace a human difficulty/animation-feel review. Graphics are procedural and stylized, not motion capture or photorealistic scanned assets. Voices are Flite placeholders, not professional rap performances or artist imitations. Physical controller and physical-GPU frame-rate assessment remain outstanding. Online relay hosting remains separate from static GitHub Pages.

## Measurements

Comparable diagnostic opening scene: Mission 2, 1280×720 CSS viewport, pixel ratio .65, shadows off, camera far 220, twenty frozen render submissions in Chromium/SwiftShader. Initial expanded-build sample: 462 draw calls, 125,366 triangles, 492 geometries, 9.9 ms median CPU render submission. Previous smaller-scene release measured 352 calls / 81,166 triangles / 369 geometries / 8.8 ms. Added models and the expanded neighborhood have a measurable cost. These submission timings are not end-to-end frame times or hardware-GPU FPS.

Final results and any corrected regressions are recorded below after the release checks.

## Release results

- **29/29 Node checks passed.**
- Full browser run: **35 passed, 2 failed**. The precision wound test needed a neutral target gait/hip pose between isolated shots; it now resets that pose and the full gun rotation. The Mission 2 test still assumed the old near-street client position; it now physically walks back through the building gap from the deep handoff before capturing the next checkpoint.
- Corrected/affected browser run: **10/10 passed**, including both failures, all three puzzle types, all courier routes, independent driving, movement/model checks, HUD navigation, actual handoff NPCs and decoded street vocals. All **37 unique browser scenarios** passed across these runs. The earlier full run also covered Mission 1's last-opponent gate and reward, Mission 3 police waves, the three-performer studio gate, live moving-target shooting, simulated controller input and two-browser co-op with 160 ms round-trip relay delay.
- Production build with `/Lil-Jeff-Simulator/` base passed. Existing minified chunk-size advisory remains nonfatal.
- Production-path browser smoke at native 1440×900 Low resolution passed with **no JavaScript or failed-resource errors**. Confirmed three illustrated HUD portraits, three shaped skulls, doom's black fade, unchanged unit character scales, preserved studio staging, eight friendly/job NPCs, two East Yard patrols, four activity starts and visible minimap.
- Visual review found and fixed the free-roam spawn intersecting the parked chase car. Production smoke now confirms every crew member spawns more than three units clear of it. Starting Mission 3 also hides leftover Mission 1 terminals/routes.
- Final comparable profile after shared-texture batching and knee/weapon detail: **463 draw calls / 134,802 triangles / 493 geometries / 8.9 ms median CPU render submission**. Differences from earlier samples reflect added geometry/material work and timing noise; this is not a claim of hardware FPS.
- Final visual captures: ignored local `test-results/release-studio.png` and `test-results/release-free-roam.png`. Reproduce with the script below; screenshots are not shipped as game assets.

```sh
npm run build -- --base=/Lil-Jeff-Simulator/
npm run preview -- --port 4187 --strictPort --base=/Lil-Jeff-Simulator/
# In another terminal:
node scripts/release-smoke.mjs
```

`GAME_URL` can point the smoke script at another served production build with `?test=1&quality=low`. The script deliberately stages phases and checks rendering/state; the browser regression suite separately exercises progression. Physical-GPU/controller testing and a human playthrough for animation feel remain future validation.
