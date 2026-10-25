# Asset credits

Every third-party asset in `public/models/` and `public/textures/` is listed here.
Only CC0 and CC BY assets are used. Sketchfab's "CC Attribution" licence is
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); Poly Haven assets are
[CC0](https://creativecommons.org/publicdomain/zero/1.0/).

All CC BY models were modified for the game (scaled to real-world size, reoriented,
decimated, split into parts, and re-exported as GLB). Real brand badges, logos and
lettering were removed or never present; the vehicles and weapons are generic
lookalikes and are not affiliated with or endorsed by any manufacturer.

## Weapons (`public/models/weapons/`)

| File | Source title | Author | URL | Licence | Changes |
| --- | --- | --- | --- | --- | --- |
| `draco.glb` | low-poly Mini Draco AK | DU1701 | https://sketchfab.com/models/215ef4fbbabd4b5a93de20ed34591dda | CC BY 4.0 | Removed spare magazine, loose rounds and internal spring; replaced stick magazine with a drum; added `muzzle` empty. |
| `arp.glb` | Low-Poly AAC Honey Badger | TastyTony | https://sketchfab.com/models/cb2f959d048944c7bc5bde2f2be8bae4 | CC BY 4.0 | Removed stock, brace and suppressor; added buffer tube, short barrel and flash hider, drum magazine, red-dot sight and side laser; added `muzzle` empty. |
| `switch.glb` | glock 17 | Friendly1 | https://sketchfab.com/models/ccf58223a7804de8b15d1d35b7d0b587 | CC BY 4.0 | Added rear slide plate with selector nub; added `muzzle` empty. |

## Cars (`public/models/cars/`)

| File | Source title | Author | URL | Licence | Changes |
| --- | --- | --- | --- | --- | --- |
| `sedan-1.glb` | Generic passenger car pack (yellow sedan) | comrade1280 | https://sketchfab.com/models/20f9af9b8a404d5cb022ac6fe87f21f5 | CC BY 4.0 | Extracted one sedan; split out `wheel_FL/FR/RL/RR` and `door_driver`. |
| `sedan-2.glb` | Medium sized sedan | MaG80 | https://sketchfab.com/models/cb8fdecbc30d4618a6109d1de0e30a9e | CC BY 4.0 | Removed baked shadow plane; split out wheels and `door_driver`. |
| `muscle-1.glb` | dodge challenger demon (FREE MODEL) | javadbayat | https://sketchfab.com/models/c91bea8c7d114555a0d5ca400dc17db6 | CC BY 4.0 | Decimated; split shared wheel meshes into four wheels; split out `door_driver`. |
| `muscle-2.glb` | ( FREE ) Dodge Challenger SRT | Lambo_SC04 | https://sketchfab.com/models/38a1fd572beb433fa2d26d8c1070c8fa | CC BY 4.0 | Painted out tyre-brand sidewall lettering; removed lug bolts and brake pads; decimated; split out wheels and `door_driver`. |

## Crew characters (`public/models/characters/`)

`crew/draco.glb`, `crew/doom.glb` and `crew/z78.glb` are original fictional characters
built in Blender with MPFB 2 (MakeHuman). The base bodies, skins, eyes, brows, lashes
and the `male_casualsuit05/06`, `shoes03/06` clothing are from the
MakeHuman system asset pack, all CC0. Clothing was recoloured and brand-style marks on
the tee and sneaker textures were painted out. King Draco's dyed locs, the fade, braids, beard shading,
drawstrings and all jewellery (`chain`, `chain_2`, `pendant`, `watch`, `earring_L/R`) were
modelled for this project. The skeleton is MPFB's built-in Mixamo-compatible rig.

| Files | Source | URL | Licence |
| --- | --- | --- | --- |
| `crew/*.glb` (bodies, skins, clothing) | MakeHuman system assets (MakeHuman Community) | https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html | CC0 |
| `crew/*.glb` (rig) | MPFB 2 built-in "mixamo" rig | https://extensions.blender.org/add-ons/mpfb/ | CC0 (MPFB assets) |
| `animations.glb` | Mixamo animations (Idle, Walking, Running, Fast Run, Crouching Idle, Crouched Walking, Rifle Aiming Idle, Pistol Idle, Jump, Death From The Front, Driving, Talking, Hip Hop Dancing), retargeted onto the crew rig | https://www.mixamo.com | Adobe Mixamo terms: royalty-free for use in games; not for redistribution as standalone animation files |

## NPC characters (`public/models/characters/npc/`)

`npc-01.glb` … `npc-12.glb` (civilians) and `rival-01.glb` … `rival-04.glb` (rivals) are original
fictional characters built in Blender with MPFB 2 (MakeHuman). Bodies (the `male1591` /
`female1605` proxy meshes), skins, eyes, brows, lashes, the `afro01`, `bob02`, `long01`,
`ponytail01`, `short02/03/04` hair, the `male_casualsuit03/05`, `male_worksuit01`,
`female_casualsuit01`, `female_elegantsuit01`, `female_sportsuit01` clothing and the
`shoes03/04/06` footwear are from the MakeHuman system asset pack (CC0). Clothing was recoloured;
denim, fleece and leather garments use the Poly Haven fabric textures listed below (CC0). Printed
logos and brand-style marks were painted out. Puffer quilting, track-suit stripes, hoods,
drawstrings, caps, beanies, locs, braids, buzz cuts, stubble and all jewellery (`chain`, `watch`,
`earring_L/R`) were made for this project. The skeleton is MPFB's built-in Mixamo-compatible rig,
the same one the crew uses, so the NPCs share `animations.glb`.

| Files | Source | URL | Licence |
| --- | --- | --- | --- |
| `npc/*.glb` (bodies, skins, clothing, MakeHuman hair) | MakeHuman system assets (MakeHuman Community) | https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html | CC0 |
| `npc/*.glb` (rig) | MPFB 2 built-in "mixamo" rig | https://extensions.blender.org/add-ons/mpfb/ | CC0 (MPFB assets) |
| `npc/*.glb` (denim, fleece, leather weave) | Poly Haven fabric textures (see Textures) | https://polyhaven.com | CC0 |

## Textures (`public/textures/`)

| Files | Source title | Author | URL | Licence |
| --- | --- | --- | --- | --- |
| `fabric/denim/*` | Denim Fabric 06 | Greg Zaal, Rico Cilliers | https://polyhaven.com/a/denim_fabric_06 | CC0 |
| `fabric/fleece/*` | Cotton Jersey | Rico Cilliers, colormass | https://polyhaven.com/a/cotton_jersey | CC0 |
| `fabric/leather/*` | Brown Leather | Rob Tuytel | https://polyhaven.com/a/brown_leather | CC0 |
| `hdri/dusk-city-1k.hdr`, `hdri/dusk-city-2k.hdr` | Modern Evening Street | Grzegorz Wronkowski | https://polyhaven.com/a/modern_evening_street | CC0 |
| `building/brick-red/*` | Brick Wall 02 | Dimitrios Savva | https://polyhaven.com/a/brick_wall_02 | CC0 |
| `building/brick-dark/*` | Brick Wall 10 | Dimitrios Savva | https://polyhaven.com/a/brick_wall_10 | CC0 |
| `building/shutter-rust/*` | Rusted Shutter | Dimitrios Savva | https://polyhaven.com/a/rusted_shutter | CC0 |
| `building/window-frame/*` | Black Painted Planks | Dimitrios Savva | https://polyhaven.com/a/black_painted_planks | CC0 |
| `building/concrete-trim/*` | Concrete Wall 007 | Charlotte Baglioni, Dario Barresi, Rico Cilliers | https://polyhaven.com/a/concrete_wall_007 | CC0 |
| `street/asphalt/*` | Asphalt 02 | Rob Tuytel | https://polyhaven.com/a/asphalt_02 | CC0 |
| `street/sidewalk/*` | Concrete Pavement 02 | Charlotte Baglioni | https://polyhaven.com/a/concrete_pavement_02 | CC0 |
| `street/curb/*` | Gravel Concrete 04 | Dimitrios Savva | https://polyhaven.com/a/gravel_concrete_04 | CC0 |
