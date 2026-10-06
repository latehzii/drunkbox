# Drunkbox — Story Mode & Multiplayer

## Play

Install Node.js, run `npm install` once, then `npm start` (or open start.cmd). Open http://localhost:5173. The server listens on PORT, default 5173, and HOST, default 0.0.0.0.

**Story Mode** has three fights with animated introductions and chapter progression. **Free Sparring** opens the stadium. **Multiplayer** lets one player create a private six-character party code; the friend enters it on the same website. Both press Ready to Fight. Each controls their own boxer. Knockouts include a replay and a rematch lobby.

On phones, use the left joystick to move and the two right punch buttons. Select Straight, Hook or Uppercut; hold Guard or Slip. Controls support multiple fingers and automatically clear on interruption. Landscape gives more room; portrait also frames both fighters.

Desktop: WASD movement, mouse left/right or arrow left/right for punches, F + punch for hooks, G + punch for uppercuts, Q/E slip, Space guard. A moves right and D left as requested. Every press performs one complete punch.

## Friends over the internet

Deploy this Node server on a public host that supports WebSocket connections. It serves both the website and party API on one port. render.yaml is a deployment template; no permanent hosting account has been connected or deployed. Static-only hosting cannot run the party service.

A temporary public test tunnel can be started with the official Cloudflare executable in .tools:

`.tools/cloudflared.exe tunnel --url http://127.0.0.1:5173 --protocol http2 --no-autoupdate`

Use the HTTPS address it prints. Both this server and the tunnel must stay running; the temporary address changes on restart. Keep the host player's game tab active during the fight: their browser runs the shared physics simulation. Party state is in memory and clears when the server restarts. Party codes support exactly two players.

## Verification

Run `node tests/touch-controls.test.mjs`, `node tests/websocket-party.test.mjs`, `node tests/party-server.test.mjs` and `node tests/multiplayer-physics.test.mjs` for mobile input, party transport and actual shared fight behavior. Existing physics and visual tests remain in tests/.
