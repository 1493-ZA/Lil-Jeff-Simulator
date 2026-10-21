# Lil Jeff Simulator

A playable third-person browser prototype built with Three.js and Vite. **Enter CHIRAQ** and **CLAIM THE BLOCK** form a two-mission single-player campaign on a fictional South Side Chicago-inspired block. King Draco leads the combat, Lil doom performs a timed verse, and Z78 drives the getaway.

## Run

Requires Node.js 22.12+ or 24+ and npm. From this checkout:

```sh
npm ci --cache /tmp/lil-jeff-npm
npm run dev
```

To play locally, run the commands above and open the browser address printed in the terminal. Click **Enter CHIRAQ** to begin. Your mouse controls the camera; **Esc** releases it and pauses. For slower computers, add `?quality=low` to the address for lower resolution and no shadows. Assets and fonts are bundled locally; no API keys, accounts, or backend services are needed.

## Play through a hosted link

The repository includes a GitHub Pages deployment workflow. The repository owner must first enable it on GitHub:

1. Open this repository's **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Open **Actions → Deploy game to GitHub Pages → Run workflow**, select `main`, and run it. If an earlier run failed before Pages was enabled, rerun it.
4. Wait for the build and deployment to finish successfully. The deployment shows the live game address; **Settings → Pages** also provides a **Visit site** button.

GitHub Pages availability for private repositories depends on the account's plan. Enabling a public game website does not require making the source repository public. If GitHub asks you to upgrade, another static host can be used instead.

The expected address after a successful deployment is `https://evanickert.github.io/Lil-Jeff-Simulator/`. This is not a claim that the site has already been published. Later pushes to `main` automatically update the game. You do not need Node.js or Vite installed on your computer to play the hosted version.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move relative to camera heading |
| Mouse | Look and aim |
| Space | Jump; combine with any movement direction |
| Shift | Sprint |
| C | Slide in the movement direction, or forward while stationary |
| Left mouse / right mouse | Automatic fire / tighter aiming |
| 1 / 2 / 3 | King Draco / Lil doom / Z78 |
| Q | Swap primary and sidearm |
| R | Reload |
| E | Start doom's rap task / hold to break into and hotwire Z78's car / enter or exit / tag the side lane |
| V | Toggle ducking on foot |
| Right mouse while ducking | Peek over cover |
| Right mouse + Z / X while ducking | Lean around the left / right side of cover |
| J / K / L | Match the scrolling rap notes at the timing line |
| WASD while driving | Accelerate, reverse, and steer |
| Space while driving | Brake |
| 1 / 2 / 3 in the car | Draco in back / doom in the passenger seat / Z78 driving |
| Mouse + fire while driving | Aim and fire one pistol while WASD steers |
| N | Next narration line |
| M | Mute / unmute mission music |
| F | Check the selected character's special charge (abilities not assigned yet) |
| Esc | Pause; choose Resume or Return to Main Menu |

Movement, jumping, and sliding permit firing after the weapon is drawn. The slide is seated with hips low, feet forward and the torso leaning back. Bullets are hitscan rays from the actual muzzle, with weapon-specific spread, recoil, draw time, and cover occlusion. The reticle follows the barrel's aim and can lag behind a fast camera turn. Jumping and sliding increase spread.

Inactive teammates follow in formation, choose nearby cover, retreat when hurt, and offer occasional support shots. Their damage is 18% of player damage, their spread is wider, and their shots are spaced 1.1 seconds apart. They conserve finite ammunition and reload or fall back to the sidearm. Inactive health has a 20 HP floor and can recover to 65 HP after time without incoming fire, so background AI cannot lose the mission for you. Selecting that character restores normal player vulnerability. Collision checks keep teammates out of buildings and parked cars; they route around nearby solid corners but do not have full navigation meshes or parkour.

## Mission 1 — Enter CHIRAQ

1. **King Draco — Settle the score:** score three takedowns of armed fictional opponents **or** defeat the marked **Special Opp**. Teammate scores never increase the requirement. The Special Opp has more health and a distinct jacket/marker. Reinforcements prevent running out of targets before Draco completes his fixed goal.
2. **Lil doom — Own the mic:** switch to doom, find the teal sidewalk mic outside the corner store, and press E. Press J / K / L when the matching notes cross the bright line. Hit at least six of eight notes to finish the original verse. Wrong keys consume the note; off-beat mashing earns nothing. A failed verse can be retried at the mic. The task includes a synthesized beat and original on-screen lyrics, not recorded vocals.
3. **Crew — Ride out:** switch to Z78 by the purple-marked sedan. Hold E for 1.6 seconds to break in, release, then hold E for 3 seconds to hotwire and board. Releasing E, switching characters or moving away interrupts the current action. A completed break-in stays complete; subsequent entry is immediate once the car is ready. These are fictional timed interactions. Use W/S to drive/reverse, A/D to steer, and Space to brake. **The checkpoint never forces a character switch.** Draco provides autonomous fire from the back seat while you drive; doom also covers the passenger side. Press **1** to control Draco or **2** to control doom: Z78 automatically drives the route while you aim/fire/reload/swap. Press **3** to drive Z78 again. Mouse aiming and firing work while driving, with only one pistol firing so his other hand can steer. The second pistol's ammunition stays untouched until used on foot. Inactive crew use weaker fire, finite ammunition, and their own reloads.

After the first purple ring an armed ambush appears. **Every living opponent must be cleared**, including opponents left behind earlier in the mission. The route rings guide driving; reaching the last ring does not end the mission. The HUD shows OPPS LEFT and the nearest remaining opponent, and overhead markers help locate stragglers. Once the car is hotwired and the ambush has started, the final opponent's death automatically starts Mission 2. Player shots, autonomous crew shots, and vehicle impacts all count; vehicle takedowns credit Z78. AI driving uses the same impact rules and may run over opponents. The car waits at the route end if the ambush is unfinished. Collisions and incoming ambush fire damage the vehicle. E exits from any occupied seat; you can re-enter as Z78 to continue.

Brick flats, stoops, corner businesses, utility poles, parked cars, alley dumpsters, and an elevated train crossing replace the harbor. Generated asphalt grain, cracks, surface bump mapping, a dusk sky, less matte glass, and rounded character bodies/facial details improve the original block models. These remain procedural prototype graphics. This is a fictional block, not a recreation of an actual gang location. Draco has loose shoulder-length locs; Z78 has a tied crown with longer, purple-tipped locs. Doom retains his original hair. Normal opponents patrol and strafe; the Special Opp moves faster and can advance toward the player. Movement avoids solid obstacles, uses leg animation, and keeps overhead markers attached. This is local steering rather than a full navigation mesh.

**Narration:** compact, unfilled text appears at the bottom of the screen with a contrasting text shadow. Most lines last 6–16 seconds based on length. The short rap intro lasts 3.5 seconds and the completion line lasts 4 seconds. New lines queue instead of overwriting an unread line. N advances early. Press Esc and expand **Read Dialogue History** to read received lines at your own pace. Pausing freezes mission and narration timers.

**Quit a mission:** press Esc, then **Return to Main Menu**. This ends the current run and resets crew health, ammunition, scores, rap state, the car, and the route. Resume preserves progress. Both the rap and driving tasks support pause/quit. The result screen also offers Return to Main Menu or Run It Back. No page reload is needed.

## Mission 2 — CLAIM THE BLOCK

All three characters receive **+25 max health**, heal to 125/125, and refill ammunition on the transition. Body counts carry over and appear beside each crew member. The bonus applies once per campaign run; retrying Mission 2 restores 125 max health without stacking it. Returning to the main menu resets health to 100.

The crew starts ducking behind three solid barricades. V toggles ducking, right mouse peeks over cover, and right mouse plus Z/X leans around its sides. Cover blocks actual muzzle rays and incoming fire: shooting while fully hidden hits the barricade. Peeking exposes you. Teammates initially hold their cover, then follow when you move up, retaining their weaker support damage and safety floor.

Walk the entire block through four capture zones:

| Checkpoint | Required takedowns | Additional requirement |
| --- | --- | --- |
| TAKE THE CORNER | 6 | Bring the whole crew into the zone |
| CORNER CYPHER | 8 | Doom performs another 6-of-8-note verse with E, J/K/L; gather the crew |
| SPIN THE SIDE LANE | 10 | Z78 reaches the purple side-lane marker and presses E; gather the crew |
| CLAIM THE BLOCK | 12, including a tougher Block Captain | Bring the whole crew into the final zone |

Each checkpoint spawns a finite wave. Only that checkpoint's takedowns count toward its requirement, and the next wave waits for all three living crew members to reach the capture zone and finish its role task. The last checkpoint ends with BLOCK CLAIMED. Run It Back retries Mission 2 from its beginning and restores the body counts earned in Mission 1. Campaign progress is not saved across page reloads.

## Mission music

An original, locally synthesized drill-inspired instrumental plays during the mission: a 140 BPM pattern with sliding sub-bass, half-time percussion, hi-hat rolls and a minor-key melody. It contains no streamed songs or sampled recordings. Music begins after entering the mission, pauses with gameplay, and stops at the main menu or results. It fades out during doom's rap challenge so the existing timing beat stays clear. Press **M** to mute; the header also has a toggle and volume slider. Volume/mute preferences are saved in this browser. Audio is optional if the browser cannot initialize it.

## XP and special charge

Each character has a separate 100 XP special meter. Normal kills grant 20 XP, the Special Opp grants 40, Draco's combat task grants 40, doom's successful verse grants 60, each driving marker grants Z78 15, the escape grants Z78 40, and clearing the ambush grants another 30 to the character who finishes it. Z78 earns 10 XP for the break-in and 20 for hotwiring. Each Mission 2 checkpoint grants everyone 15 XP; doom earns verse XP and Z78 earns 15 for tagging the side lane. Charge caps at 100 and displays **SPECIAL READY**. F reports the status; no ability effect or charge consumption is implemented because the character abilities will be designed later.

Special charge persists between runs and reloads using this browser's local storage. Mission health/ammunition/checkpoints still reset. Progress does not sync across devices; clearing site data clears charge, and disabled storage can prevent it persisting across reloads.

## Loadouts

| Character | Primary | Loaded ammunition | Spare magazines/drums |
| --- | --- | --- | --- |
| King Draco | MICRODRAC | 100 | 4 |
| Lil doom | AR-P | 50 | 6 |
| Z78 | AKIMBO GLOCKS | 50 per hand | 6 total |
| Everyone | GLOCK WITH SWITCH | 30 | 5 |

Six spare akimbo drums means three full reloads of both hands. Each gun consumes a drum independently. Partial reloads discard remaining rounds. MICRODRAC has a compact steel/wood silhouette, large flash, higher damage, and stronger muzzle rise. AR-P has a longer rail, rear tube and optic silhouette, tighter spread, and better range, but lower damage. Akimbo pistols alternate hands with separate muzzles, recoil and flashes; they have the widest spread and shortest useful range. The shared two-handed sidearm is more controllable than akimbo. Damage falls off at distance. These are fictional game balance values inspired by the supplied visual references, not real weapon specifications or biographical claims. AR-P's fire rate is open for tuning, with no slower-fire-rate requirement. Balance values live in `src/combat.js`.

## Validate

```sh
npm test
npm run build
npm run test:browser
```

Browser tests use `/usr/bin/chromium` by default; set `CHROMIUM_PATH` to another Chromium executable if needed. They exercise movement/slide pose/firing, finite ammunition, real muzzle hits and cover, rap timing, both combat-goal branches, safe weaker companions, narration history/queueing, saved XP, and pause/quit/reset across activities. Additional tests verify moving opponents/attached markers, autonomous crew fire, one-handed driver ammunition, shooting while driving, AI vehicle impacts, bottom subtitle placement, audible music output, mute/volume persistence and rap ducking. The Mission 1 story test scores actual muzzle hits, sends timed rap inputs, breaks into and hotwires the car, drives to the ambush and fires from the back seat while Z78 drives. It leaves one street opponent alive to prove the mission cannot end early, then checks the last real muzzle kill launches Mission 2. Additional scenarios check interrupted car interactions, crouch/peek/lean cover occlusion, all four checkpoint quotas and crew capture requirements, the second cypher, side-lane task, and non-stacking health rewards. A separate movement scenario walks the crew around the starting barricades into the first capture zone without teleporting. Checkpoint progression tests isolate AI and place the crew deterministically; they do not measure full-block navigation or difficulty. Tests use deterministic actor placement, aim assistance and suppressed enemy AI in isolated scenarios. This is not a full difficulty or manual playability assessment.

The `?test=1` query exposes a diagnostic game object for browser tests. Normal gameplay does not expose it. Browser screenshots are generated in ignored `test-results/`.

## Current scope

Procedural prototype models, two campaign missions, desktop keyboard/mouse only, synthesized firing/beat sounds and an original drill-style music loop, and local special-charge saving. No multiplayer, mission saves, assigned special abilities, or mobile controls. Production character art, full weapon animation, richer squad navigation, recorded rap vocals, a larger driving map, campaign writing, and final balancing remain future work.
