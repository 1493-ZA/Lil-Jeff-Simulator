# Art pass: prompts for local Claude

Local Claude (Claude Desktop with Blender MCP, on Luke's PC) makes the files.
The cloud session wires them into the game. Each step ends with a pull request.
Content rules for every step:
- Everything must be original and fictional.
- No real person's likeness.
- No brand logos, real watch designs or real gang symbols.
- PG-13.

## Step 1: Street and building textures (do this first; it is quick)

```text
Work in my Lil-Jeff-Simulator repo. Make a branch called art/street-textures.

Download free CC0 PBR textures from Poly Haven or ambientCG at 1K resolution.
For each texture, save these three files:
- color.jpg (sRGB)
- normal.jpg (OpenGL normal)
- roughness.jpg
If a texture comes with an ARM/ORM map instead of a roughness map, take the
green channel as the roughness map. Resize every file to 1024x1024, save it as
JPG at quality 85, and make sure it tiles seamlessly.

Save them under public/textures/ like this:
  building/brick-red/      weathered red brick wall, darker mortar, a bit dirty
  building/brick-dark/     a second, darker brown-red brick (for variety)
  building/shutter-rust/   corrugated roll-down metal shutter, rusty, chipped paint
  building/window-frame/   painted metal or wood window frame, slightly worn
  building/concrete-trim/  stained concrete for window sills, ledges and rooflines
  street/asphalt/          cracked city asphalt, worn
  street/sidewalk/         square concrete sidewalk slabs with seams
  street/curb/             rough concrete curb

Add each texture to CREDITS.md (name, source URL, CC0). Commit, push and open a
pull request into main titled "Street and building textures".
```

## Step 2: Crew character models (King Draco, Lil doom, Z78)

Tools, all free with Luke's accounts:
- Meshy (text or image to 3D).
- Blender with MPFB2 (the free MakeHuman add-on) as a fallback base body.
- Mixamo (log in with the Adobe account) for the rig and animations.

### 2a. Generate the base bodies

Send this to local Claude:

```text
We're making realistic, non-blocky character models for my game's three crew
members. They're original fictional characters (not based on any real person).
Each one should be a realistic young adult man with natural proportions, about
1.8 m tall, in an A-pose with arms about 45 degrees down. Realistic stylized
game look, like a modern open-world game. Rounded smooth body (not low-poly
blocks), real fingers, detailed face, clothing with folds.

Write me one Meshy text-to-3D prompt per character, then help me run them.
Drip and colour for each:

1) King Draco (the enforcer), signature colour orange #ffac65.
   - Black cropped puffer jacket over a charcoal hoodie.
   - Black cargo pants, wheat-coloured work boots.
   - Short twists, trimmed beard, medium-dark skin.
2) Lil doom (the rapper), signature colour teal #76ddd0.
   - Oversized teal-and-black varsity-style jacket (no letters or logos).
   - White tee, light-wash ripped denim, high-top sneakers.
   - Black fade haircut, medium-brown skin.
3) Z78 (the driver), signature colour lavender #bca1ff.
   - Lavender zip hoodie under a black leather jacket.
   - Black slim jeans, black-and-white sneakers.
   - Braids tied back, light goatee, dark skin.

Every outfit must be plain or abstract with no brand logos or text. Don't model
jewellery in Meshy; we add it in Blender.

If Meshy credits run out or a result looks bad, build that character in
Blender with MPFB2 instead (realistic body, matching hair and clothes from
MakeHuman CC0 assets) and texture it with the fabric textures in
public/textures/fabric.
```

### 2b. Add the jewellery in Blender

```text
Open each crew character in Blender (via Blender MCP) and add custom jewellery
as separate objects:

- Cuban-link chain around the neck: a gold chain of real interlocking links
  (use an array along a curve). Gold material: metallic 1.0, roughness 0.18,
  colour #e6b85c.
- Iced-out pendant on the chain, covered in small diamond stones. Diamond
  material: white, roughness 0.02, IOR 2.4, transmission 0.6. Pendants:
    - Draco: a crown.
    - doom: a microphone.
    - Z78: a steering wheel.
- Iced-out watch on the left wrist: a round face with a diamond bezel and a
  gold band. Generic design, no brand look and no logo.
- Small diamond stud earrings.
- doom only: a second, thinner tennis chain.

Name the objects exactly:
  chain, pendant, watch, earring_L, earring_R (and chain_2 for doom)

Keep each jewellery piece under 2,500 triangles. Bake the link detail into a
normal map if needed.

Save the .blend files in art/characters/ (not public/).
```

### 2c. Rig and animate with Mixamo (Luke does the uploads)

```text
Help me rig the crew for Mixamo, step by step:

1. Export each character from Blender as FBX (body + clothes joined, jewellery
   kept as separate objects), A-pose, facing +Y (Mixamo's front).
2. I'll upload each one to mixamo.com and auto-rig it. Tell me where to put the
   chin, wrist, elbow, knee and groin markers. Then I'll download it as
   "FBX Binary, T-pose, With Skin".
3. Then I'll download these animations from Mixamo once, using the Draco
   character, as "FBX Binary, Without Skin", 30 fps, "In Place" ticked where
   offered:
     Idle, Walking, Running, Fast Run, Crouch Idle, Crouched Walking,
     Rifle Aiming Idle, Pistol Idle, Jump, Death From The Front, Sitting (Driving),
     Talking, Hip Hop Dancing
4. In Blender, import the rigged characters. Parent the jewellery to the
   skeleton:
   - chain, chain_2 and pendant to mixamorig:Spine2
   - watch to mixamorig:LeftHand
   - earrings to mixamorig:Head
   Keep them as rigid children; don't weight-paint them.
5. Add an empty named grip_R at the right palm (child of mixamorig:RightHand),
   with -Z pointing along the fingers. The game puts guns there.
6. Export:
   - public/models/characters/crew/draco.glb, doom.glb, z78.glb. Skin and rig
     only, no animations. Scale applied, 1.8 m tall, facing +Z, feet at the
     origin, textures embedded, at most 2048 px.
   - public/models/characters/animations.glb: one armature with every clip as a
     separate action, named exactly:
       idle, walk, run, sprint, crouch_idle, crouch_walk, rifle_aim, pistol_aim,
       jump, death, sit_drive, talk, dance
   Keep each character under 30k triangles. Use the mixamorig bone names
   unchanged in every file.
7. Update CREDITS.md (Meshy outputs are CC BY 4.0 on the free plan; credit
   Meshy). Commit on a branch called art/crew-characters, push, and open a pull
   request into main.
```

## Step 3: NPC characters (civilians and rivals)

```text
Make a branch called art/npc-characters. Using Blender + MPFB2 (MakeHuman, CC0)
through Blender MCP, generate 12 civilian NPCs and 4 rival NPCs. They should be
realistic, natural proportions, not blocky. Mix:
- Ages 18–60, men and women.
- Builds from slim to heavy.
- A wide range of skin tones.
- Varied hair: afros, braids, locs, buzz cuts, ponytails, bald, caps, beanies.

Everyday street clothes:
- Hoodies, puffers, track suits, work jackets, dresses, jeans, joggers, sneakers.
- Some of them get small jewellery: thin chains, hoops, a watch.

Rivals wear blue as their main colour (#1f5fe0 range): blue hoodies, blue
jackets, blue caps. Rivals also get chains and watches (gold or silver), but
smaller than the crew's.

The crew's looks are reserved, so don't reuse:
- an orange, teal or lavender main colour
- doom's black fade
- Draco's twists
- Z78's braids

No logos or text on clothes. Use the fabric textures in public/textures/fabric
for denim, fleece and leather.

Rig every NPC with the same Mixamo skeleton as the crew. Either do the Mixamo
auto-rig upload for each (walk me through it), or use MPFB2's Mixamo-compatible
rig, as long as the bone names match mixamorig:* exactly. Add the grip_R empty
to the rivals.

Export:
- public/models/characters/npc/npc-01.glb … npc-12.glb
- public/models/characters/npc/rival-01.glb … rival-04.glb

Rules: 1.8 m average height (vary ±8 cm), facing +Z, feet at the origin, under
15k triangles, textures at most 1024 px, no animations (they share
animations.glb).

Credit sources in CREDITS.md. Commit, push and open a pull request into main.
```

## What the cloud session does after each pull request is merged

- **Textures:** brick walls on every building, with real window openings, frames,
  sills and lit or dark glass, and rusty roll-down shutters on the storefronts.
  Asphalt roads, slab sidewalks and concrete curbs.
- **Characters:** swaps the code-built bodies for the GLBs and plays the shared
  animations. The upper body still aims with the mouse. Guns attach at `grip_R`,
  and the jewellery gets a sparkle.
- **NPCs:** the crowd and rivals pick from the npc and rival models with colour
  variation. The code-built fallback stays for Low graphics and for a model that
  fails to load.
