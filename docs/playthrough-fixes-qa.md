# Playthrough fixes — 2026-10-23

Follow-up to the 2026-10-22 playthrough. Graphics, character looks, rival colours, the studio, minimap and the populated streets were kept; this pass removes prototype behaviour.

## Root causes and fixes

| Issue | Cause | Fix |
| --- | --- | --- |
| Rivals sinking into the road | `animateLocomotion` added the raw gait bob to `body.position.y` every frame with a −0.006 bias. The crew's posture code reset it each frame; rivals never did, so walking rivals sank about 7 cm per second. | Only the frame-to-frame change in bob is applied. All actors sample one ground-height function (`src/ground.js`, which covers sidewalks and the passage) at spawn and while moving. |
| Bodies clipping | Death pose was a fixed 90° roll at y=0.35, so arms and shoulders sat under the road. | `src/ragdoll.js`: bodies fall away from the shooter into back, front or side poses with varied limbs. Each frame the lowest visible vertex is placed on the surface; the body stops updating once settled. Bodies stay on the street. `src/blood.js` adds a few short-lived droplets and a small soft stain (capped and non-graphic). |
| Z78 not driving after a switch | Autopilot only steered toward the next gate at walking pace, braked forever after gate 3, and could stall against a kerb or a parked car (only the collision bounce happened, so it was never detected as stuck). | `src/driver.js`: a persistent route loop (gates, then laps of both lanes clear of parked cars), heading-aware collision extents, obstacle-avoiding steering, K-turn reversing and progress-based stuck recovery. It runs whenever Z78 is not the selected character. |
| Door opening inward | Positive Y rotation about the front hinge swung the door's rear edge toward +X (into the cabin). | `DOOR_OPEN` is negative (outward) on every car, and Z78 now stands behind the door's swing. |
| Hotwire games | Pulse memory and timing presses were reaction tests. | Circuit match, 4×4 wiring grid, 3×3 rotate circuit and fuse routing, each with a one-sentence instruction. The cursor is released so puzzles can be solved with the mouse; keyboard and controller also work. |
| Co-op asked for a "relay address" | Only a self-hosted WebSocket relay (`server/relay.js`) existed. | HOST GAME / JOIN CODE over WebRTC (`src/peer-link.js`). The host's browser plays the relay's role. The relay remains under "Advanced", with a plain-language WHAT IS A RELAY ADDRESS? panel that matches the real `ws://host:8787` / `wss://` format. |
| Civilians looking like the crew | Contacts were built with crew identities 0–2, so they got crew hair and skin. | `src/npc.js`: a modular catalog (16 hairstyles, 16 outfits, hats, skin, pants, shoes, build, height, face details). Crew hair styles and clothing colours are reserved. |
| Railway through buildings | The deck crossed lot 4 on both sides. | Those two buildings were removed. The deck sits on piers outside the traffic lanes, and the west lot has station stairs, a platform and a stopped train (solid, walkable). |

## Other changes

- HUD: one small marker style for everything. Interaction prompts sit on the object and only show in range. `SWITCH TO` tags float above the needed character. `RIVALS REMAINING` points at the approximate centre of the group. Named rival tags only show in line of sight. 3D label boards are replaced by HUD markers and ground rings.
- Movement: speed-scaled stride, acceleration and braking lean, roll into turns, hips that face travel while the torso aims, a hard plant when reversing at speed, a feet shuffle when turning on the spot, a low-ready gun carry, a sprint tuck, and a glide into cover.
- Free roam: OUR BLOCK / COMMERCE ROW / OPP BLOCK with `NOW ENTERING` notices. Opp Block HEAT has four levels and a `GET OUT THE OPP BLOCK` escape. Red and blue territory accents. Courier runs go supplier → package pickup → client already waiting. Handoffs roll quiet, suspicious, ambush or chase. Explicit ammo stashes show which reserves were restocked.
- Audio: Kokoro-generated original character voices (Apache-2.0 model) replace Flite. Street cyphers are now a full performance: approach, beat, four bars on the note grid, crowd and crew reaction.
- Cars: extruded rounded body with wheel arches, bumpers, grille, headlights and taillights, mirrors, seams, interior and five-spoke wheels. Parked cars share the model; lower graphics settings use fewer segments and no interior.

## Validation

Results are recorded below after the release checks.
