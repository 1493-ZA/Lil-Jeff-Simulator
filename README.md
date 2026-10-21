# Lil Jeff Simulator

A third-person browser prototype with King Draco, Lil doom, and Z78. Three connected missions take place on a fictional Chicago-inspired block, ending in a playable free-roam preview. Play the hosted build at https://evanickert.github.io/Lil-Jeff-Simulator/ after the GitHub Pages deployment finishes.

## Run locally

Requires Node.js 22.12+ or 24+ and npm:

```sh
npm ci --cache /tmp/lil-jeff-npm
npm run dev
```

Open the address Vite prints and click **Enter CHIRAQ**. Use a desktop browser with WebGL, keyboard, and mouse. `?quality=low` reduces render resolution and disables shadows. All fonts, surfaces, voices, and music are local; no account or API key is needed.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrows | Move relative to the camera |
| Mouse | Look |
| Left mouse | Automatic fire from the actual muzzle |
| Right mouse | Aim; track a visible opponent’s upper abdomen for the first second |
| Space | Jump in the movement direction |
| Shift | Sprint |
| C | Crouch / take cover, or leave cover |
| Shift + C | Seated slide |
| Backward while in cover | Leave cover |
| Right mouse in cover | Automatically peek over or around the face you aim toward |
| 1 / 2 / 3 | Draco / doom / Z78 (sunroof chase fixes control to Draco) |
| Q / R | Swap weapon / reload |
| E | Interact; hold separately for car break-in and hotwiring |
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

Draco needs three takedowns or the named **Static / Special Opp**. Doom then performs a 6-of-8-note sidewalk verse. Z78 holds E to break into the marked sedan, releases, then holds E again to hotwire. The phases take 1.6 and 3 seconds; interruptions cannot bypass them. These are fictional timed interactions.

Drive through the route to trigger the ambush. In the car, Z78 drives automatically whenever he is not selected; Draco and doom provide weak autonomous fire when inactive. The driver can shoot one pistol while steering. Vehicle impacts also count as takedowns.

**Every opponent must be down**, including street opponents left behind, before Mission 2 begins. The route’s last ring does not end the mission. OPPS LEFT and remaining-opponent markers help find survivors. After the hotwire and ambush, the final kill automatically launches Mission 2.

All three receive **125 max health, full healing, and fully refilled primary and sidearm ammunition**. The health reward does not stack on retries. Body counts carry through the campaign.

### Mission 2 — CLAIM THE BLOCK

The crew starts standing behind taller barricades, with the same character dimensions and posture as Mission 1. Inactive members automatically return to their assigned cover while opponents remain, briefly peeking to offer weak support, and then follow when the area is clear. Clear each wave, complete its character task, then bring all three into the capture zone.

| Checkpoint | Required takedowns | Task |
| --- | --- | --- |
| TAKE THE CORNER | 6 | Gather the crew |
| CORNER CYPHER | 8 | Doom performs another 6-of-8 verse |
| SPIN THE SIDE LANE | 10, including **Switchback** | Z78 tags the purple flank marker with E |
| CLAIM THE BLOCK | 12, including **Vex / Block Captain** | Gather the crew |

Each checkpoint grants all three 15 street cred. The last capture automatically starts Mission 3. Run It Back retries the current mission without stacking health rewards.

### Mission 3 — BLUE LIGHTS / RED RECORD

Z78 breaks into and hotwires a **second car**, which has an open sunroof. Once it starts, control automatically switches to Draco standing through the roof. Z78 drives the cleared road loop independently of Draco’s camera and firing. Reload and weapon swapping still work; character switching and exiting are disabled during this sequence.

Disable **six police cars in three pairs** by shooting a tire or the driver. These are separate mesh hit targets with separate health; shooting the street does not advance the pursuit. Tire damage requires 30 damage; driver damage requires 50. Disabled cars stop pursuing. There are no unlimited reinforcements. Sirens and flashing lights accompany the pursuit, and slow incoming vehicle damage creates pressure.

When the final car is disabled, Z78 takes the crew to After Hours Studio. All three perform original lines over **one continuous 148 BPM beat**, taking turns: Draco’s straight pocket, doom’s syncopation, Z78’s triplet switch. The beat has programmed drops. Defeated fictional special-opponent names are recorded during combat and referenced in the studio lyrics. No real artist lyrics or recordings are used.

Press J/K/L when the notes meet the line. Each performer needs at least **6/8** in a verse, and the session needs **180 earned street cred**. Previously saved cred cannot bypass the studio. Unfinished performers repeat in rotation. Once both conditions are met, Mission 3 ends and the crew returns to the block in **free roam**. You can walk and switch characters; expanded open-map activities remain future work.

## Combat balance and hit locations

Normal street opponents have 50 HP, Static has 90, and ambushers have 40. Mission 2 waves have 45 / 50 / 55 / 60 HP per regular opponent, with 80 for Switchback and 100 for Vex. Body-count requirements remain unchanged.

Actual muzzle-ray impact height in the opponent’s local coordinates selects damage: head **2.5×**, chest/shoulder **1.35×**, abdomen **1×**, pelvis **0.85×**, legs **0.65×**, feet **0.5×**. Enemy weapons and invisible muzzle flashes do not count as body hits. Weapon damage, distance falloff, and the weaker companion modifier apply as well. At close range, MICRODRAC headshots deal 60 damage, enough for any regular Mission 2 opponent; chest hits deal 32.4 and need two shots. Names and numbers are fictional game balance, not real weapon or injury specifications.

## Street cred, streaks, and dialogue

Street cred replaces the old XP display across every mission and accumulates beyond 100. Existing saved charge values migrate automatically through the same browser storage. Kills, character tasks, checkpoints, police-car takedowns, and rap notes earn cred. Returning to the menu preserves it; mission health, ammunition, checkpoints and body counts reset. Saves are local to this browser and do not preserve campaign position across reloads. Special abilities are not assigned yet.

Three kills within 12 seconds set a character **ON FIRE** for 20 seconds and reserve a rap bonus. Good studio performances also ignite the character. Normal successful studio notes earn 10 cred; boosted notes earn 15. A completed verse consumes the reserved combat bonus. All three must still complete their verses.

Nearby opponents deliver short tactical threats. Each crew member has brief, conversational kill and crew callouts, with a short cooldown and a pending reaction to prevent constant overlap. Main narration uses bottom subtitles and a queue, and remains available in Esc → Read Dialogue History. Combat speech appears in its own compact line above narration.

## Audio and graphics

The instrumental is an original, locally synthesized Chicago drill-inspired arrangement: locally generated kick, snare, clap, rim and hat samples, syncopated drum patterns, half-time backbeats, saturated 808s, rapid hat rolls, dark piano partials, and bar drops. These are original synthesized sounds, not samples from released songs. A compressor controls peaks. The louder default is 72%; music preferences are saved separately from older quieter settings. The header slider adjusts music; M mutes music while gunshots and voices remain available.

All voices are **synthetic placeholders**, not recordings, impressions, or voice clones of the referenced musicians. The bundled Ogg clips work without a browser speech service. Regeneration instructions, original text and Flite notices are in `public/audio/` and `scripts/generate-voices.py`. Professional voice performances and a produced music soundtrack remain future production work.

Visual improvements include environment reflections, warmer directional lighting, softer shadows, textured fabric and masonry, asphalt grain and cracks, wet patches, rounded car panels, transparent windows, cabin interiors, sunroof framing, more adult head/neck proportions, finer loc strands, neutral textured clothing, higher-resolution body meshes, and articulated legs. Draco retains shoulder-length locs, Z78 retains his distinct tied locs, and doom retains his hair. Art remains procedural prototype geometry.

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

Pushes to `main` trigger `.github/workflows/deploy-pages.yml`. Enable Settings → Pages → Source → GitHub Actions if needed, and wait for the deployment to finish. No multiplayer, mobile controls, campaign save points, or final special abilities are included.
