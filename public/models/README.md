# Imported models

Drop finished `.glb` files here. The game loads them automatically and falls
back to the built-in code shapes if a file is missing or fails to load.

| Folder | Files the game looks for | Real size |
| --- | --- | --- |
| `props/` | `hydrant.glb` (more slots added as models arrive) | hydrant 0.8 m tall |
| `characters/` | `crew/{draco,doom,z78}.glb`, `npc/npc-01…12.glb`, `npc/rival-01…04.glb` (Mixamo skeleton, no clips) and `animations.glb` (shared clips); jewellery objects `chain`, `pendant`, `watch`, empty `grip_R` — see `docs/art-pass-prompts.md` | 1.8 m tall |
| `cars/` | `sedan-1.glb`, `sedan-2.glb` (getaway car), `muscle-1.glb`, `muscle-2.glb` — nodes `body`, `wheel_FL/FR/RL/RR`, `door_driver` hinged at the front, facing +Z | 4.8–5 m long |
| `weapons/` | `draco.glb`, `arp.glb`, `switch.glb` (also used for akimbo) — barrel along +Z, grip at the origin, empty named `muzzle` at the tip | real size |

Export rules:
- GLB with textures embedded, +Y up, transforms applied.
- Lowercase file names, no spaces.
- Leave Draco compression off; the build compresses models itself.
- Budgets: props under 3k triangles, characters under 20k, cars under 30k, textures 1024–2048 px.
- Everything must be original and fictional. Credit CC BY sources in `CREDITS.md`.

Where they are used: the Mission 1 getaway car is `sedan-2`; parked cars use `muscle-1`, `muscle-2` and `sedan-1` (the red and blue ones are tinted for the territories). The Mission 3 sunroof coupe and the police cars stay code-built for now (police cars are removed once free roam starts), because they need an open sunroof and separate hit targets. Weapon models are skipped on Low graphics. Fabric textures (`../textures/fabric`) and the dusk HDRI (`../textures/hdri`) are loaded by `src/fabrics.js` and `src/assets.js`. Building and street textures (`../textures/building`, `../textures/street`) are loaded by `src/facades.js`, which also builds the windows and shutters.
