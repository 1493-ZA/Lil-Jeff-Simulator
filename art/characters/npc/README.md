# NPC source

`npc_characters.blend` holds the finished NPCs that `public/models/characters/npc/*.glb` were exported from.
Each one is in its own collection (`final_npc-01` … `final_rival-04`): the rig, the skinned body, and any jewellery and `grip_R` parented to bones.

- `textures/` holds the recoloured skins, clothing, hair and shoes, and the cap, beanie, loc and braid patterns. The `.blend` links them by relative path.
- The eyebrows, eyelashes and some clothing normal maps load straight from the MPFB 2 system asset pack (CC0). Blender finds them when MPFB 2 and its system assets are installed. If the install path differs, use File → External Data → Find Missing Files.
- To re-export a character:
  - Link that character's rig, body and jewellery into an empty scene.
  - Export glTF (GLB) with skins on and animations off.
  - Compress it with:

```bash
npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt --texture-compress webp --texture-size 1024 --flatten false --join false --prune false --simplify false --instance false --palette false
```
