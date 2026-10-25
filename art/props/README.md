# Street prop source

`street_props.blend` holds the props that `public/models/props/*.glb` were exported from. Each one is
in its own collection (`prop_hydrant` … `prop_train_car`), and its object has the same name as its
file, written with `_` instead of `-`. Every object sits at the origin with no rotation or scale.

- `textures/` holds the procedurally generated paint, metal, plastic, wood and glass maps. The
  `.blend` links them by relative path. The concrete loads from `public/textures/building/concrete-trim/`.
- To re-export a prop:
  - Select its object (for `street_light`, also its `lamp` child empty).
  - Export glTF (GLB) with **Selected Objects** on, **+Y Up** on and animations off.
  - Compress it with:

```bash
npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt --texture-compress webp --texture-size 1024 --flatten false --join false --prune false --simplify false --instance false --palette false
```

Keep `--prune false`: pruning deletes the empty `lamp` node from `street-light.glb`.
