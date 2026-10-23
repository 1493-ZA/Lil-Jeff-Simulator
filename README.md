# Lil Jeff Simulator

A third-person browser prototype with King Draco, Lil doom, and Z78. Three connected missions take place across a fictional Chicago-inspired neighborhood, ending in repeatable free-roam activities. Play the hosted build at https://1493-ZA.github.io/Lil-Jeff-Simulator/ after the GitHub Pages deployment finishes.

## Run locally

Requires Node.js 22.12+ or 24+ and npm:

```sh
npm ci --cache /tmp/lil-jeff-npm
npm run dev
```

Open the address Vite prints and click **Enter CHIRAQ**. Use a desktop browser with WebGL and keyboard/mouse or an Xbox-style controller. Choose Low, Medium, or High graphics in the menu, or use `?quality=low|medium|high`. Low keeps native CSS resolution (up to 1× device pixel ratio), disables shadows, reduces render distance, and caps effects; Medium/High increase shadows and detail budgets. All fonts, surfaces, voices, and music are local; no account or API key is needed.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrows | Move relative to the camera |
| Mouse | Look |
| Left mouse | Automatic fire from the actual muzzle |
| Right mouse | Aim; track a visible opponent’s upper abdomen for the first second |
| Space | Jump in the movement direction |
| Shift | Sprint |
| C | Crouch / take cover (steps up to the nearest barricade face), or leave cover |
| Shift + C | Seated slide |
| Backward while in cover | Leave cover |
| Right mouse in cover | Automatically peek over or around the face you aim toward |
| 1 / 2 / 3 | Draco / doom / Z78 (sunroof chase fixes control to Draco) |
| Q / R | Swap weapon / reload |
| E | Interact (the prompt appears on the object when you are close enough); hold to break into a car, then solve a short logic puzzle |
| J / K / L | Perform the displayed rap notes |
| WASD in Mission 1’s car | Drive / steer while Z78 is selected |
| Space / E in Mission 1’s car | Brake / exit |
| N | Advance narration |
| F | Street cred status |
| M | Toggle music; the header slider sets music volume |
| Esc | Pause, read dialogue history, resume, or return to menu |

Mission 2 starts with the crew upright at exactly their Mission 1 height, behind taller 1.65-unit barricades. Crouching uses a shallow 0.32-unit hip bend and articulated knees. Character and limb scales remain unchanged between missions and postures. Aim exposes the gun and upper body above cover, or moves the shoulder around an edge based on camera aim. Cover still blocks real muzzle rays and incoming shots; aiming does not permit shooting through a barricade. Z/X remain optional manual lean overrides. Each aim press acquires a visible target within a limited cone and follows that same moving target for one second, even if it leaves the initial cone. After one second, aiming is manual until release/re-aim. Losing line of sight or the target dying ends the lock. Aim assist adjusts the weapon and camera; bullets still originate from the barrel with spread and recoil. In the police chase, assist also considers tires and the driver.

Inactive crew follow, commit to corner waypoints to avoid getting stuck, seek assigned cover at each Mission 2 checkpoint, and offer weak support fire (18% player damage) with finite ammunition and reloads. Their health has a 20 HP floor. Selecting them restores normal vulnerability. Navigation uses local steering rather than a full navigation mesh.

## Campaign

### Mission 1 — ENTER CHIRAQ

Draco needs three takedowns or the named **Static / Special Opp**. Doom then performs a 6-of-8-note sidewalk verse. Z78 holds E for 1.6 seconds to break into the marked sedan; the driver door swings outward from its front hinge while he stands clear of it, then he slides into the seat. A short logic puzzle starts automatically, with a one-line instruction above it. Escape cancels without starting the engine. Puzzle types rotate without immediate repeats:

- **Circuit match:** match each colour on the left to the same colour on the right (1/2/3 then J/K/L, or click).
- **Wiring grid:** on a 4×4 grid, connect each pair of coloured dots without crossing wires (drag with the mouse, or arrows + Space). Every layout is generated from real non-overlapping paths, so it is always solvable.
- **Rotate circuit:** rotate 3×3 pipe tiles until power flows from ⚡ to ◉ (click a tile, or arrows + Space).
- **Fuse routing:** put each fuse in the slot with the same shape and number; one fuse is a decoy (click fuse then slot, or 1–4 then J/K/L).

Controller: D-pad moves, A acts, X selects. The cursor is released while a puzzle is open so it can be solved with the mouse. These are fictional game puzzles, not real vehicle procedures.

Drive through the route to trigger the ambush. **Z78 drives autonomously whenever he is not the selected character**: switch to Draco or doom and he keeps following the checkpoint route, then keeps lapping the block in both lanes (clear of parked cars) until the mission ends. He steers around obstacles, reverses out of K-turns and recovers if the player crashed into a kerb before handing over. Draco and doom provide weak autonomous fire when inactive. The driver can shoot one pistol while steering. Vehicle impacts also count as takedowns.

**Every opponent must be down**, including street opponents left behind, before Mission 2 begins. The route’s last ring does not end the mission. OPPS LEFT and remaining-opponent markers help find survivors. Mission 2 starts only after combat and rap tasks, successful hotwiring, all three route checkpoints, and every opponent being defeated. Finishing kills early cannot bypass the route.

All three receive **125 max health, full healing, and fully refilled primary and sidearm ammunition**. The health reward does not stack on retries. Body counts carry through the campaign.

### Mission 2 — CLAIM THE BLOCK

The crew starts standing behind taller barricades, with the same character dimensions and posture as Mission 1. Inactive members automatically return to their assigned cover while opponents remain, briefly peeking to offer weak support, and then follow when the area is clear. Clear each wave, complete its character task, then bring all three into the capture zone.

| Checkpoint | Required takedowns | Task |
| --- | --- | --- |
| TAKE THE CORNER | 6 | Gather the crew |
| CORNER CYPHER | 8 | Doom performs another 6-of-8 verse |
| SPIN THE SIDE LANE | 10, including **Switchback** | Z78 collects a sealed case, clears two ambushers and meets Moss behind the flats through the east-side passage |
| CLAIM THE BLOCK | 12, including **Vex / Block Captain** | Gather the crew |

Each checkpoint grants all three 15 street cred. The last capture automatically starts Mission 3. Run It Back retries the current mission without stacking health rewards.

### Mission 3 — BLUE LIGHTS / RED RECORD

Z78 breaks into and hotwires a **second car**, which has an open sunroof. Once it starts, control automatically switches to Draco standing through the roof. Z78 drives the cleared road loop independently of Draco’s camera and firing. Reload and weapon swapping still work; character switching and exiting are disabled during this sequence.

Disable **six police cars in three pairs** by shooting a tire or the driver. These are separate mesh hit targets with separate health; shooting the street does not advance the pursuit. Tire damage requires 30 damage; driver damage requires 50. Disabled cars stop pursuing. There are no unlimited reinforcements. Sirens and flashing lights accompany the pursuit, and slow incoming vehicle damage creates pressure.

When the final car is disabled, Z78 takes the crew to After Hours Studio. All three perform original lines over **one continuous 148 BPM beat**, taking turns: Draco’s straight pocket, doom’s syncopation, Z78’s triplet switch. The beat has programmed drops. Defeated fictional special-opponent names are recorded during combat and referenced in the studio lyrics. No real artist lyrics or recordings are used.

Press J/K/L when the notes meet the line. Each performer needs at least **6/8** in a verse, and the session needs **180 earned street cred**. Previously saved cred cannot bypass the studio. Unfinished performers repeat in rotation. Once both conditions are met, Mission 3 ends and the crew returns to the block in **free roam**. The minimap and neutral category markers show repeatable activities. Doom’s cypher and Z78’s courier jobs have character-colored accents; general combat activities can use anyone. Completed activities disappear immediately, reopen after 45 seconds, and reward saved money, Street Cred, health and reserve ammo. Mission 4 requires 5,000 total crew Street Cred and deliberate interaction at the southern marker; its story is not implemented yet and never starts automatically.

### Free-roam neighborhood

The map has three readable areas: **OUR BLOCK** (west; red accents as a placeholder crew colour), **COMMERCE ROW** (the neutral connecting strip at z=-31) and the **OPP BLOCK** (east; blue cars, lights, banners, shutters and locals in blue). Crossing a boundary shows a small `NOW ENTERING` notice and the minimap tints each area.

**Opp Block heat.** Time spent in the Opp Block, gunfire, hits and kills raise `OPP HEAT` (meter under the minimap). Level 1: patrols watch you but hold fire. Level 2: small hostile groups arrive. Level 3: rivals converge on you. **Max heat:** the objective becomes `GET OUT THE OPP BLOCK` with an arrow, ring and minimap marker to Commerce Row. Once out, `AREA CLEAR` shows, heat cools and the rivals who came looking leave.

Activities: Doom's cypher, Relay's courier jobs (Z78), rival encounters, Priority Cinder, and two ammo stashes. Courier runs are: talk to Relay → pick up the sealed package → the client is already waiting and becomes the objective → hand off. Each run rolls an encounter: **quiet**, **suspicious** (rivals watch the drop and turn hostile if crowded or shot), **ambush** (rivals hit the pickup) or **chase** (rivals arrive after the handoff; take them down or get 45 m away). Amber Case is always an ambush and Cyan Envelope always quiet. **Ammo stashes:** walk to the stash, press E, secure the area if it is guarded (the Opp Block stash is), press E again, and the banner lists exactly which reserves were restocked.

The street is populated by walking civilians and the job contacts. Civilians are built from a modular catalog (16 hairstyles, 10 hats/none, 16 outfit types, skin tones, pants, shoes, build, height, beard/glasses/earring/chain), and the loc styles, black taper fade and the crew's exact clothing colours are reserved, so no civilian can match King Draco, Lil doom or Z78. Pedestrians update every frame nearby, every 4th frame at mid range and are hidden (still walking) far away; only nearby ones cast shadows. They step around obstacles and run from gunfire.

The **elevated railway** crosses the street at z=-53 over open lots only (the two buildings it used to pass through were removed). The west lot has After Hours Station: two stair flights up to a platform beside a stopped train, and the deck is walkable. Mission 4 is not started; this only makes the area usable later. Mission 4 still requires 5,000 crew Street Cred and deliberate interaction at the southern marker.

The minimap is north-up with building footprints, territory tint, the railway, activity icons, stashes and the current destination (clamped to the edge when outside the radius).

### HUD markers

All indicators share one small style: icon + short label + distance, placed on the world position and clamped to the screen edge with an arrow when off screen. `SWITCH TO <name>` floats above the crew member who is needed. The interaction prompt (for example `E HAND OFF`) only appears on the object when you are close enough to use it. Combat objectives show `RIVALS REMAINING: n` at the approximate centre of the group without revealing every rival through walls; named rivals get a small tag only while actually in view. Destinations that need a ring (mic, handoffs, escape points, stashes) get a pulsing ground ring.

## Combat balance and hit locations

Normal street opponents have 50 HP, Static has 90, and ambushers have 40. Mission 2 waves have 45 / 50 / 55 / 60 HP per regular opponent, with 80 for Switchback and 100 for Vex. Body-count requirements remain unchanged.

Actual muzzle-ray impact height in the opponent’s local coordinates selects damage: head **2.5×**, chest/shoulder **1.35×**, abdomen **1×**, pelvis **0.85×**, legs **0.65×**, feet **0.5×**. Enemy weapons and invisible muzzle flashes do not count as body hits. Weapon damage, distance falloff, and the weaker companion modifier apply as well. At close range, MICRODRAC headshots deal 60 damage, enough for any regular Mission 2 opponent; chest hits deal 32.4 and need two shots. Names and numbers are fictional game balance, not real weapon or injury specifications.

## Street cred, streaks, and dialogue

Street cred replaces the old XP display across every mission and accumulates beyond 100. Existing saved charge values migrate automatically through the same browser storage. Kills, character tasks, checkpoints, police-car takedowns, and rap notes earn cred. Returning to the menu preserves it; mission health, ammunition, checkpoints and body counts reset. Saves are local to this browser and do not preserve campaign position across reloads. Special abilities are not assigned yet.

Three kills within 12 seconds set a character **ON FIRE** for 20 seconds and reserve a rap bonus. Good studio performances also ignite the character. Normal successful studio notes earn 10 cred; boosted notes earn 15. A completed verse consumes the reserved combat bonus. All three must still complete their verses.

Nearby opponents deliver short tactical threats. Each crew member has brief, conversational kill and crew callouts, with a short cooldown and a pending reaction to prevent constant overlap. Main narration uses bottom subtitles and a queue, and remains available in Esc → Read Dialogue History. Combat speech appears in its own compact line above narration.

## Audio and graphics

The instrumental is an original, locally synthesized Chicago drill-inspired arrangement: locally generated kick, snare, clap, rim and hat samples, syncopated drum patterns, half-time backbeats, saturated 808s, rapid hat rolls, dark piano partials, and bar drops. These are original synthesized sounds, not samples from released songs. A compressor controls peaks. The louder default is 72%; music preferences are saved separately from older quieter settings. The header slider adjusts music; M mutes music while gunshots and voices remain available.

Voices are **original fictional characters** generated with the open Kokoro-82M speech model (Apache-2.0) — no recordings, impressions or voice clones of real musicians. Each crew member is an original blend of stock voice styles with a fixed pitch offset (Draco low and steady, doom brighter and bouncier, Z78 smooth in between). Raps are performed faster, double-tracked, compressed and fitted to the beat; dialogue gets light room tone. Street cyphers are a full performance: the performer walks to the mic during the count-in, a 92 BPM half-time groove (built from the game's own drum samples) starts under a ducked instrumental, four sung bars land on the note pairs while you play the notes, then the crowd and a crew member react. Regeneration instructions are in `public/audio/README.md` and `scripts/generate-voices.py`. Studio-quality human performances remain future production work.

Visual improvements include environment reflections, warmer directional lighting, softer shadows, textured fabric and masonry, asphalt grain and cracks, wet patches, rounded car panels, transparent windows, cabin interiors, sunroof framing, more adult head/neck proportions, finer loc strands, neutral textured clothing, higher-resolution body meshes, and articulated legs. Draco retains shoulder-length locs, Z78 retains his distinct tied locs, and doom has a black tapered fade. Art remains procedural prototype geometry.

## Loadouts

| Character | Primary | Loaded rounds | Spare magazines / drums |
| --- | --- | --- | --- |
| King Draco | MICRODRAC | 100 | 4 |
| Lil doom | AR-P | 50 | 6 |
| Z78 | AKIMBO GLOCKS | 50 per hand | 6 total |
| Everyone | GLOCK WITH SWITCH | 30 | 5 |

Akimbo consumes one drum per hand, so six spare drums provide three complete paired reloads. Partial reloads discard remaining rounds. MICRODRAC has higher damage and more recoil; AR-P is more accurate with lower damage; akimbo has wider spread. Fictional balance values live in `src/combat.js`.

## Validate and deploy

```sh
npm test
npm run test:browser
npm run build -- --base=/Lil-Jeff-Simulator/
```

Browser tests use `/usr/bin/chromium`; override with `CHROMIUM_PATH` if necessary. They cover real muzzle hits, cover and aim, movement and slides, character tasks, finite ammunition, companions, pause/quit, saved cred, campaign transitions, police tire/driver hits, studio rotation and free-roam requirements, and decoded local voice/audio output. Isolated scenarios control actor placement and timing; this is not a full manual difficulty assessment. `?test=1` exposes a diagnostic game object; normal gameplay does not.

Pushes to `main` trigger `.github/workflows/deploy-pages.yml`. Enable Settings → Pages → Source → GitHub Actions if needed, and wait for the deployment to finish. Mobile controls, campaign save points and final special abilities are not included; co-op remains experimental and requires its own relay.

## Next-update systems

The center crosshair chooses a world target from the camera ray; each equipped muzzle visibly converges toward it, including in the sunroof. Damage and cover checks still begin at the physical muzzle. A red crosshair warns when the muzzle is blocked. Spread settles after 0.35 seconds of aiming; sustained fire raises heat gradually, and heat/recoil recover when firing stops. Weapon differences remain.

Heads now use a shaped skull/jaw profile, cheek and chin volumes, fitted hairlines and smaller articulated hands. Draco keeps individual loose shoulder-length locs, Z78 has a distinct tied crown with violet tips, and doom has a black fade. Ten enemy variants share bright cobalt/royal-blue clothing with different skin, hair, layers, masks, accessories and weapon silhouettes. Meshes remain procedural and stylized; no photorealistic or captured character assets are included.

Distance-driven gait cycles, acceleration/deceleration, blended knees and hips, movement-relative turning and reload hand gestures replace abrupt walk poses. Aiming remains independent of travel direction. This is a procedural animation pass, not motion capture or a full skeletal animation/foot-IK system.

Street cyphers play character-specific bundled synthetic vocal clips after the countdown, lower the instrumental beneath the vocals, and include crew reactions. Studio staging remains one mic and one performer at a time.

Rap notes retain green hit/red miss feedback and a visible ready countdown. Performers gesture at the mic. The studio has one central microphone with performers approaching in turn. Captioned closing bars include real run stats; prerecorded lines remain synthetic placeholders, and dynamic stat bars currently have no recorded vocals.

### Xbox-style controls

Standard-mapped Gamepad API controllers connect without setup. Left stick moves with analog speed, right stick looks, LT aims, RT fires, A jumps/brakes, B crouches (LB+B slides), LB sprints, X interacts, Y swaps and RB reloads. D-pad left/up/right selects Draco/doom/Z78; down shows Street Cred. Menu/Start pauses or resumes. D-pad navigates menu buttons and graphic options; A activates. Rap uses X/Y/B. Prompts switch immediately on controller or keyboard/mouse input. Optional vibration is used when the browser/controller supports it. Physical device feel still needs a hardware playtest.

### Online co-op (up to three players)

Open **ONLINE CO-OP** on the main menu:

- **Host:** press `HOST GAME`. You get a `ROOM CODE` such as `7K4P92`; share it. You play King Draco and press ENTER CHIRAQ when everyone has joined.
- **Join:** type the code into `JOIN CODE` and press `JOIN GAME`. You take the first free character (doom, then Z78) and wait for the host.

This uses peer-to-peer WebRTC connections. The host's browser runs the game simulation (host authority: damage, AI, vehicles, missions and minigames) and acts as the room server; the public PeerJS broker only introduces players by room code. Guests send input at 20 Hz, the host sends state at 20 Hz. Very strict networks that block peer-to-peer traffic may not connect; in that case use a relay (below). Host departure ends the room; host migration is not implemented.

**Advanced: your own relay.** `npm run relay` starts `server/relay.js` (port 8787 by default, `PORT` to change). Everyone enters the same relay address — `ws://<computer address>:8787` on a home network, or `wss://<server>` for an internet server behind HTTPS (the hosted HTTPS site only allows `wss://`). The host leaves Room code blank to create a room; others enter it. The menu's `WHAT IS A RELAY ADDRESS?` panel explains this in plain language. For self-hosted matchmaking, run a PeerJS server and add `?peer=host:port` to the game URL (or build with `VITE_PEER_SERVER`).

The relay accepts up to three players per room, stamps input sender identity, ignores guest snapshots, limits payloads/message rates and checks heartbeats; the peer-to-peer host applies the same rules. Room codes are invitations, not account authentication. This is cooperative host authority, not a hardened competitive game server.

### Profiling and validation

Static hair/body/weapon pieces are batched by material while articulated limbs and muzzle flashes remain separate. Existing instanced neighborhood geometry remains intact. Distant enemy processing is reduced and tracer/effect counts are bounded by graphics quality. Tracer geometry is pooled, and distant cosmetic hair is culled by the selected quality preset. Measurements and this update’s release checks are recorded in `docs/playthrough-polish-qa.md` (earlier baseline: `docs/update-qa.md`); software-rendered timings are diagnostic and do not predict a physical GPU's frame rate.

Run `npm test` for combat, progression, circuit and delayed-relay checks. `npm run test:browser` exercises the campaign, UI, controller simulation, new activities and two-browser co-op with 80 ms delay in each relay direction. `npm run build -- --base=/Lil-Jeff-Simulator/` produces the Pages build. Online availability requires deploying a relay separately.
