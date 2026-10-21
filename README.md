# Lil Jeff Simulator

A playable third-person browser prototype built with Three.js and Vite. **Enter CHIRAQ** is a short single-player mission on a fictional South Side Chicago-inspired block. King Draco leads the combat, Lil doom performs a timed verse, and Z78 drives the getaway.

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
| E | Start doom's rap task / enter or exit Z78's car |
| J / K / L | Match the scrolling rap notes at the timing line |
| WASD while driving | Accelerate, reverse, and steer |
| Space while driving | Brake |
| 1 after the first route marker | Draco shoots from the back seat while Z78 drives |
| 3 in the back seat | Return to manual driving as Z78 |
| N | Next narration line |
| F | Check the selected character's special charge (abilities not assigned yet) |
| Esc | Pause; choose Resume or Return to Main Menu |

Movement, jumping, and sliding permit firing after the weapon is drawn. The slide is seated with hips low, feet forward and the torso leaning back. Bullets are hitscan rays from the actual muzzle, with weapon-specific spread, recoil, draw time, and cover occlusion. The reticle follows the barrel's aim and can lag behind a fast camera turn. Jumping and sliding increase spread.

Inactive teammates follow in formation, choose nearby cover, retreat when hurt, and offer occasional support shots. Their damage is 18% of player damage, their spread is wider, and their shots are spaced 1.1 seconds apart. They conserve finite ammunition and reload or fall back to the sidearm. Inactive health has a 20 HP floor and can recover to 65 HP after time without incoming fire, so background AI cannot lose the mission for you. Selecting that character restores normal player vulnerability. Collision checks keep teammates out of buildings and parked cars; they do not have full navigation meshes or parkour.

## Mission

1. **King Draco — Settle the score:** score three takedowns of armed fictional opponents **or** defeat the marked **Special Opp**. Teammate scores never increase the requirement. The Special Opp has more health and a distinct jacket/marker. Reinforcements prevent running out of targets before Draco completes his fixed goal.
2. **Lil doom — Own the mic:** switch to doom, find the teal sidewalk mic outside the corner store, and press E. Press J / K / L when the matching notes cross the bright line. Hit at least six of eight notes to finish the original verse. Wrong keys consume the note; off-beat mashing earns nothing. A failed verse can be retried at the mic. The task includes a synthesized beat and original on-screen lyrics, not recorded vocals.
3. **Z78 and Draco — Ride out:** switch to Z78 and press E by the purple-marked sedan. Use W/S to drive and reverse, A/D to steer, and Space to brake. After the first purple ring, an armed ambush appears. Press **1** to control Draco leaning out of the back seat while Z78 automatically follows the remaining route. Aim with the mouse and fire/reload/swap normally; get two back-seat takedowns. Press **3** to drive manually again. The escape requires all three route markers **and** the two back-seat takedowns. The car stops at the end of the route if shooting is unfinished. Collisions and incoming ambush fire damage the vehicle. E exits the vehicle while controlling the driver; you can re-enter to continue.

Brick flats, stoops, corner businesses, utility poles, parked cars, alley dumpsters, and an elevated train crossing replace the harbor. Generated asphalt grain, cracks, surface bump mapping, a dusk sky, less matte glass, and rounded character bodies/facial details improve the original block models. These remain procedural prototype graphics. This is a fictional block, not a recreation of an actual gang location. Draco has loose shoulder-length locs; Z78 has a tied crown with longer, purple-tipped locs. Doom retains his original hair. Opponent AI is still a simple stationary prototype.

**Narration:** lines stay up for at least 12 seconds and scale up to 35 seconds with their length. New lines queue instead of overwriting an unread line. N advances early. Press Esc and expand **Read Dialogue History** to read received lines at your own pace. Pausing freezes mission and narration timers.

**Quit a mission:** press Esc, then **Return to Main Menu**. This ends the current run and resets crew health, ammunition, scores, rap state, the car, and the route. Resume preserves progress. Both the rap and driving tasks support pause/quit. The result screen also offers Return to Main Menu or Run It Back. No page reload is needed.

## XP and special charge

Each character has a separate 100 XP special meter. Normal kills grant 20 XP, the Special Opp grants 40, Draco's combat task grants 40, doom's successful verse grants 60, each driving marker grants Z78 15, the escape grants Z78 40, and Draco's back-seat task grants another 30. Charge caps at 100 and displays **SPECIAL READY**. F reports the status; no ability effect or charge consumption is implemented because the character abilities will be designed later.

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

Browser tests use `/usr/bin/chromium` by default; set `CHROMIUM_PATH` to another Chromium executable if needed. They exercise movement/slide pose/firing, finite ammunition, real muzzle hits and cover, rap timing, both combat-goal branches, safe weaker companions, narration history/queueing, saved XP, and pause/quit/reset across activities. The full-story test scores actual muzzle hits, sends timed rap inputs, drives through every route gate without teleporting the car, then aims and fires from the back seat at the live ambush while Z78 drives. Tests use deterministic actor placement, aim assistance and suppressed enemy AI in isolated scenarios. This is not a full difficulty or manual playability assessment.

The `?test=1` query exposes a diagnostic game object for browser tests. Normal gameplay does not expose it. Browser screenshots are generated in ignored `test-results/`.

## Current scope

Procedural prototype models, one mission, desktop keyboard/mouse only, synthesized firing/beat sounds, and local special-charge saving. No multiplayer, mission saves, assigned special abilities, or mobile controls. Production character art, full weapon animation, richer squad navigation, recorded rap vocals, a larger driving map, campaign writing, and final balancing remain future work.
