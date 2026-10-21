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
| Esc | Pause; choose Resume or Return to Main Menu |

Movement, jumping, and sliding permit firing after the weapon is drawn. Bullets are hitscan rays from the actual muzzle, with weapon-specific spread, recoil, draw time, and cover occlusion. The reticle follows the barrel's aim and can lag behind a fast camera turn. Jumping and sliding increase spread. Inactive crew members stay in place and defend themselves using their own ammunition. All three must survive.

## Mission

1. **King Draco — Settle the score:** score at least three takedowns of armed fictional opponents and finish ahead of both other crew members. The HUD tracks individual scores. If the other characters clear every target before Draco leads, reinforcements prevent a progression dead end.
2. **Lil doom — Own the mic:** switch to doom, find the teal sidewalk mic outside the corner store, and press E. Press J / K / L when the matching notes cross the bright line. Hit at least six of eight notes to finish the original verse. Wrong keys consume the note; off-beat mashing earns nothing. A failed verse can be retried at the mic. The task includes a synthesized beat and original on-screen lyrics, not recorded vocals.
3. **Z78 — Drive the getaway:** switch to Z78 and press E by the purple-marked sedan. Use W/S to drive and reverse, A/D to steer, and Space to brake. Drive through all three purple route rings in order. Collisions reduce vehicle integrity; wrecking the car fails the run. E exits the vehicle, and you can re-enter to continue the route.

The crew escapes after the final driving marker. Brick flats, stoops, corner businesses, utility poles, parked cars, alley dumpsters, and an elevated train crossing replace the harbor. This is a fictional block, not a recreation of an actual gang location. Draco has loose shoulder-length locs; Z78 has a tied crown with longer, purple-tipped locs. Doom retains his original hair. Opponent AI is still a simple stationary prototype.

**Quit a mission:** press Esc, then **Return to Main Menu**. This ends the current run and resets crew health, ammunition, scores, rap state, the car, and the route. Resume preserves progress. Both the rap and driving tasks support pause/quit. The result screen also offers Return to Main Menu or Run It Back. No page reload is needed.

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

Browser tests use `/usr/bin/chromium` by default; set `CHROMIUM_PATH` to another Chromium executable if needed. They exercise keyboard/mouse movement, airborne and sliding fire, draw/reload timing, real muzzle hits and cover blocking, independent akimbo ammunition/flashes, role restrictions, failed/successful rap timing, driving through every route gate, collisions, vehicle exit/re-entry, and pause/quit/reset across activities. Combat and mission unit tests check finite ammunition, individual kill targets, rap scoring and vehicle dynamics. Tests position actors and suppress enemy AI for deterministic checks; the complete-story test scores actual muzzle hits, sends timed rap inputs, and drives using normal input state without teleporting through route gates. This is not a full difficulty assessment.

The `?test=1` query exposes a diagnostic game object for browser tests. Normal gameplay does not expose it. Browser screenshots are generated in ignored `test-results/`.

## Current scope

Original geometric placeholder models, one mission, desktop keyboard/mouse only, synthesized firing/beat sounds, and no multiplayer, persistent saves, or mobile controls. Realistic character art, full weapon animation, squad navigation, recorded rap vocals, a larger driving map, campaign writing, and final balancing remain future work.
