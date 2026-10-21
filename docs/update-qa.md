# Major update QA

## Profiling

Chromium with SwiftShader, Mission 2 opening, 1280×720, pixel ratio 0.65,
shadows off, camera far 220, frozen simulation, 20 render submissions.
The baseline was measured after enemy variety was introduced and before batching.

| Measurement | Before static batching | After static batching |
| --- | ---: | ---: |
| Draw calls | 673 | 352 |
| Triangles | 81,166 | 81,166 |
| Live geometries | 696 | 369 |
| Median render submission | 14.1 ms | 8.8 ms |

This measures CPU/driver submission time on a software renderer, not GPU frame time
or expected performance on a real PC. Low graphics now uses up to 1× device pixel
ratio rather than the old 0.65 blur. The profiling script pins 0.65 only to compare
identical image sizes. Run a Vite server, then `node scripts/profile-game.mjs`.

## Validation scope

- Node tests cover ordered wound damage, ammunition/reload rules, all mandatory
  Mission 1 prerequisites including route completion, Mission 2 capture gates,
  pursuit/studio gates, circuit failures/duplicates, spread recovery, missed notes,
  controller deadzone, and the Mission 4 threshold.
- Relay integration uses 60 ms artificial outbound delay, verifies host-only
  snapshots, stamped input identity, late-join state, member departure and room end.
- Browser tests cover actual hit meshes, cover occlusion from the muzzle,
  camera/muzzle convergence across 24 foot/sunroof angle combinations, normal
  controls, crew cover/catch-up, the three story missions, both car puzzles,
  studio sequencing, free roam, virtual controller input and separate co-op clients.
- Co-op browser test uses 80 ms each relay direction (160 ms round trip), independent
  contexts, smaller render buffers to isolate network behavior from software GPU
  contention, shared kills/checkpoints, character reservation/switching, remote
  circuit completion and departure back to AI.
- New free-roam and controller tests use deterministic setup to isolate those
  systems. Campaign tests separately exercise route driving, rap timing and real
  muzzle damage; setup shortcuts are not evidence of manual gameplay feel.

## Practical limits

No physical Xbox controller or representative low-end GPU is available here.
Controller feel, rumble and hardware frame rates still need hands-on feedback.
Online co-op is experimental and needs a separately deployed TLS WebSocket relay;
GitHub Pages cannot host that process. Host migration/reconnect recovery is absent.
Dynamic run-stat bars are captioned; recorded vocals remain synthetic placeholders.
Mission 4 has a gated location/briefing only, as requested; its mission is not built.

## Final result (2026-10-21)

25 Node/rules/relay checks passed. All 29 distinct browser checks passed across the
final campaign run and targeted reruns. The campaign run had 28 passes and one
legacy raw-barrel test that assumed a zero local weapon yaw; resetting its full
local rotation fixed that setup. Its rerun passed, alongside the final delayed
co-op and controller checks. The independent live-camera pursuit test cleared all
six moving police cars under its recoil, hit-rate and ammo limits.

The final co-op check also validates interpolated movement animation, normal
vulnerability for a human guest (the NPC health floor does not apply), remote
circuit cancellation, mission transitions into Claim / pursuit / studio / free
roam, one central mic, takeover by AI after departure, and rejoining without replaying queued inputs. Studio timing uses
24-beat turns with a six-beat lead-in, so every turn stays on the 148 BPM grid.

Full-body low/medium/high rendering remains procedural placeholder art, not
photorealism. Physical-controller feel and public relay operation were not tested.

The final production smoke used `/Lil-Jeff-Simulator/` with the built asset paths,
loaded all six drum buffers, checked six enemy variants / three enemy loadouts,
reviewed the cleaned front hairline and central-mic staging, verified five street
activity/gate markers with Mission 4 still locked, and returned cleanly to the menu.
No JavaScript errors or failed resource requests occurred.
