# Claim the Land

**Unit 2 game · 7th Grade Texas History · Age of Contact & Spanish Colonial (1519–1821)**
TEKS 7.2B, 7.2C · skills 7.20B, 7.21

Spain and France both want Texas. Students play one nation across six chapters of
real history (1519–1722) — placing missions ⛪, presidios 🏰, and trading posts ⚜️
on a clickable Texas map and making the decisions their nation really faced.

- **Head-to-head:** the teacher pairs two students; one plays Spain, one plays France, turns alternate on a shared live map.
- **Solo:** a student picks a nation; the computer plays the other using its real historical strategy.
- **Winning ≠ the grade:** the match winner is whoever claims more of Texas, but the
  teacher grades **accuracy** — how well the 12 choices match real history. France
  played accurately still tends to lose the race; that *is* the lesson of 7.2B.

## Stack

Same architecture as Chronos Protocol / Survive the Season:

- `server/` — Node + Express + **Socket.IO**, fully **server-authoritative**: the
  answer key, scoring, turn lock, matchmaking, and AI opponent all live in
  `GameManager.js` + `games/claimTheLand.js`. **No database** — sessions are
  memory-only and vanish on End Session, idle sweep, or restart. The teacher's
  PDF is the only lasting record.
- `client/` — React 18 + Vite thin client. Students submit tiny moves
  (`student:submit_move`) and render what the server pushes back. No game state
  in browser storage (Wix-iframe safe).

## Run locally

```bash
npm install          # installs server/ and client/ via postinstall
npm test             # server: scoring, content, GameManager (turn lock, drop-outs, ...)
npm run dev:server   # Socket.IO server on :4000
npm run dev:client   # Vite dev server on :5173 (proxies /socket.io to :4000)
```

Or production-style: `npm run build && npm start`, then open `http://localhost:4000`.

- Students: `http://localhost:4000`
- Teacher Command Center: `http://localhost:4000/#teacher`

**Head-to-head test:** open two student windows plus the teacher view, join both
students with the class code, click **Pair & Start**, and play — turns and the map
sync in real time. Close one student mid-match to see the partner get
"Finish vs the computer" after ~25 s.

## Deploy on Render

1. Push this repo to GitHub.
2. On [Render](https://render.com): **New → Web Service**, pick the repo — it reads
   `render.yaml` (free plan; builds the client, starts `server/src/index.js`).
3. You get one URL, e.g. `https://claim-the-land.onrender.com`.

*Free-plan note:* the service spins down when idle and takes a few seconds to wake
on first request — fine for class, and it doubles as the "no data left behind"
backstop, since memory clears on spin-down.

## Embed in Wix

- **Student page:** Add → Embed Code → **Embed a Site**, paste the Render URL,
  size ≈ 1000 × 760, publish, test on a phone.
- **Teacher page:** new Wix page → embed `https://…onrender.com/#teacher` →
  **Page Settings → Permissions → Password-protected.** The in-app 4-digit PIN is
  a second layer.
- Redeploy by pushing to GitHub (Render auto-builds); hard-refresh to clear cache.

## Teacher flow

1. Open the Command Center → choose a 4-digit PIN → **Create session** → share the 6-digit class code.
2. Approve student names as they join (or turn approval off).
3. Solo joiners start on their own. Click **⚔️ Pair & Start** to pair the rest —
   nations are randomized; an odd student out plays solo vs the computer.
4. Watch live status, pairings, and per-nation class accuracy.
5. **⬇ Download PDF report** (students + per-nation tables).
6. **End Session** → confirm → everything is deleted from server memory.

If a student drops mid-match, their partner can finish vs the computer (offered
automatically after a short grace period), or you can convert the match from the
roster. A student whose page reloads can simply rejoin with the class code.

## Content & accuracy model

- 6 chapters × (1 map move + 1 decision) = **12 graded actions** per student.
- right = 1 · partial = 0.5 · wrong = 0 → accuracy = points ÷ 12 × 100.
- Meters (0–100, start 40): Territory 🗺️, Strength 🏰, Support 🤝.
  **Strength 0 = colony collapse** (like Fort St. Louis).
- Final Claim Score = Territory + Strength/2 + Support/2 → decides the match winner.
- Decision options are shuffled per match server-side, so answers can't be memorized by position.

All student-facing text is written at a 5th-grade reading level. The full content
bank (both nations, all feedback, endings, debriefs) lives in
`server/src/games/claimTheLand.js` — it never reaches the client before the
resolution beat.

---

*Companion to Chronos Protocol, Survive the Season, and the other Texas History
builds. Made for 7th Grade Texas History · TEKS 7.2B, 7.2C.*
