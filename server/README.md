# Co-op relay

The website remains a static Vite build. Online rooms additionally need this Node
process on a host reachable by every player; GitHub Pages cannot run it.

```sh
npm ci --omit=dev
PORT=8787 npm run relay
```

Use `ws://localhost:8787` only for local development. For public play, place the
process behind TLS and enter its `wss://` URL in the game's Online co-op panel.
The service binds `0.0.0.0`, reads `PORT`, and returns HTTP 200 on `/` for health
checks. `render.yaml` is an optional deployment blueprint; no service is created
by committing it. The service has in-memory rooms and requires one instance;
restarting it ends rooms. Configure a proxy that supports WebSocket upgrades.

A blank room code creates a room; joining the same code adds up to two guests.
The host owns the simulation and starts/pauses the shared game. Draco is reserved
for the host; guests initially receive doom and Z78 and can swap to an unoccupied
guest character. If a guest leaves, their character resumes AI behavior. If the
host leaves, the room ends. There is no account system, persistence on the relay,
host migration or competitive anti-cheat.

`npm test` includes relay tests with artificial delay. To reproduce delay manually,
start with `TEST_LATENCY_MS=80 npm run relay` (80 ms on each outgoing hop).
Do not set this variable for a normal public deployment.
