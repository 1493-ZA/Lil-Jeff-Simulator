# Imported models

Drop finished `.glb` files here. The game loads them automatically and falls
back to the built-in code shapes if a file is missing or fails to load.

| Folder | Files the game looks for | Real size |
| --- | --- | --- |
| `props/` | `hydrant.glb` (more slots added as models arrive) | hydrant 0.8 m tall |
| `characters/` | `draco.glb`, `doom.glb`, `z78.glb`, `rival-1.glb` … (with Mixamo actions) | 1.8 m tall |
| `cars/` | `sedan.glb` (wheels `wheel_FL/FR/RL/RR`, `door_driver` hinged at the front) | 4.8 m long |

Export rules:
- GLB with textures embedded, +Y up, transforms applied.
- Lowercase file names, no spaces.
- Leave Draco compression off; the build compresses models itself.
- Budgets: props under 3k triangles, characters under 20k, cars under 30k, textures 1024–2048 px.
- Everything must be original and fictional. Credit CC BY sources in `CREDITS.md`.
