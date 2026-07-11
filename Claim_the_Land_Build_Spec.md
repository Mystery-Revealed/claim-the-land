# "Claim the Land" — Build Specification
### Unit 2 Game · 7th Grade Texas History · Age of Contact & Spanish Colonial

**Purpose of this document:** A complete, build-ready spec you can paste into Claude (Fable, Opus, Sonnet) to build the game, host it on GitHub, and embed it in Wix. It covers the game design, the historical content, the two-player and solo modes, matchmaking, a data schema, the multiplayer sync design, ready-to-use Higgsfield prompts, a model-by-model workflow, the Teacher Command Center (reused from Survive the Season), and a phased build plan.

> **Reading-level rule (everything the student sees):** Present 7th grade content at a **5th grade reading level**. Short sentences, common words, define hard terms the first time. This rule does **not** apply to this spec.

> **Data method — use the Chronos Protocol / Survive the Season stack (Socket.IO), not Firebase.** Build on the **server-authoritative Node + Express + Socket.IO** backend you already use: a `GameManager` state machine (transport-agnostic), a `lobby/SessionRegistry` with 6-digit join codes and a nickname/profanity filter, a `sockets/` transport layer, and a thin **React + Vite** client (`socket.io-client` singleton in `services/socket.js`, Higgsfield seam in `services/assetService.js`, PDF via **jsPDF + html2canvas**). Deploy as **one Render web service** (build the client, start the server). The **Teacher Command Center**, **join-code system**, **accuracy math**, and **end-session behavior** mirror those games; this spec adds **matchmaking** and **per-nation** tracking. Where behavior is identical, this doc says "same as Chronos/Survive the Season."

---

## 1. Game at a Glance

| Field | Value |
|---|---|
| **Title** | Claim the Land |
| **Unit** | 2 — Age of Contact & Spanish Colonial (1519–1821) |
| **TEKS** | 7.2B (European exploration; the search for gold; conflicting France–Spain claims), 7.2C (Spanish colonization: missions, presidios, Massanet, Margil, Hidalgo). Skills: 7.20B (cause and effect), 7.21 (maps) |
| **Type** | Turn-based strategy game — **hybrid: a clickable Texas map + historical decision events** |
| **Modes** | **Head-to-head** (2 students, one plays Spain, one plays France) · **Solo** (1 student vs the computer, student picks the nation) |
| **Matchmaking** | Teacher pairs students automatically; nations randomized; the odd student out plays solo vs the computer |
| **Playtime** | 8–12 minutes per match |
| **Platform** | **Server-authoritative Node + Express + Socket.IO backend** (deployed on Render) with a **React + Vite** thin client, embedded in Wix — the same stack as Chronos Protocol / Survive the Season |
| **Class tracking** | Teacher Command Center — class code, live in-progress vs completed, **accuracy per nation**, PDF download; **session-only data** deleted at end (see Section 13) |
| **Art style** | Semi-realistic / cinematic (see Section 11) |

**One-sentence pitch:** Spain and France both want Texas — play one nation, place your missions, presidios, and forts on the map, and out-strategize your rival across 150 years to claim the land, learning why Spain won the race and France lost it.

**The core teaching idea:** Spain and France used *different methods* to claim Texas. Spain built **missions** (to convert and befriend Native peoples) and **presidios** (forts to protect them). France relied on a few forts and **trade alliances**, but sent too few people and ran short on supplies. By playing a nation's real strategy, students learn *why the two powers clashed* and *why Spain ended up holding Texas* (TEKS 7.2B, 7.2C).

**Winning vs. accuracy — read this twice.** A match has a **winner** (who claimed more of Texas). But the number the **teacher grades is accuracy** — how *historically sound* each choice was. This matters because France, played *well and accurately*, still tends to lose Texas in the end (that's the real history). A student can lose the match yet score high accuracy for playing France's true strategy. Keep these two scores separate.

---

## 2. Historical Content Bank

All facts below come from your Age of Contact / Spanish Colonial outline and the TEKS. Build the game from this bank.

### 2.1 The race for Texas
- **Spain claimed Texas early but mostly ignored it.** Alonso Álvarez de **Pineda** mapped the Gulf coast (1519). **Cabeza de Vaca** was shipwrecked and wandered Texas. Spain searched for gold and found little, so it left Texas mostly alone — until France showed up.
- **The French challenge.** **René-Robert Cavelier, Sieur de La Salle** meant to sail to the mouth of the Mississippi River but landed in Texas **by mistake**. He built **Fort St. Louis** on **Matagorda Bay** (1685). The colony failed — bad supplies, sickness, and conflict — but it **alarmed Spain** and pushed Spain to finally settle Texas.
- **Spain responds with missions and presidios.** To hold the land, Spain built **missions** (religious settlements to convert Native peoples to Catholicism and teach Spanish ways) and **presidios** (military forts to protect the missions). **Fray Damián Massanet** helped found the first East Texas mission, **San Francisco de los Tejas** (1690). **Antonio Margil de Jesús** founded missions in East Texas and at **San Antonio** (founded 1718). **Francisco Hidalgo** even cooperated with the French to get missions built in East Texas.
- **The "Chicken War" (1719).** A small French force from Louisiana briefly seized a Spanish mission in East Texas. It was a tiny fight, but it made Spain take Texas seriously and reinforce the region.
- **Native nations mattered.** The **Caddo** of East Texas were farmers and traders whose friendship both powers wanted. The **Apache** and **Comanche** resisted outsiders pushing onto their lands. Alliances with Native peoples could make or break a claim.

### 2.2 The two nations' real strategies (this drives every "right" choice)
| | **Spain** | **France** |
|---|---|---|
| **Goal** | Hold Texas as a buffer to protect its lands in Mexico | Trade (especially furs) and reach the Mississippi/Louisiana |
| **Method** | **Missions + presidios**; convert and befriend Native peoples; build permanent settlements (San Antonio) | A **few forts** and **trade alliances**; rely on Native trading partners; keep moving |
| **People** | Sent missionaries, soldiers, and settlers over time | Sent **very few colonists** — a big weakness |
| **Supplies** | Slow but supported from Mexico | Often **short on supplies**; Fort St. Louis starved |
| **Outcome** | **Secured Texas** by settling and building | **Lost the Texas race**; pulled back to Louisiana |

**The contrast engine:** A *right* choice matches your nation's real strategy. Playing Spain, you build missions and presidios and befriend the Caddo. Playing France, you build trade alliances and reach for the Mississippi — but you'll always fight the supply and settler problem. Wrong choices copy the *other* nation's method or ignore history.

### 2.3 Key vocabulary (define on first use in-game)
- **Mission** — a religious settlement Spanish priests built to convert Native peoples and teach Spanish ways.
- **Presidio** — a military fort built to protect missions and settlers.
- **Empresario/colonists** — the people a nation sends to live on and hold the land.
- **Alliance** — a friendly agreement, here between a nation and a Native people.
- **Claim** — saying a land is yours; holding it takes people and forts, not just a flag.

---

## 3. Core Mechanics

### 3.1 The map
A simple map of early Texas with **5 regions** a player can act on:
1. **Gulf Coast / Matagorda Bay** — where La Salle landed; contested.
2. **East Texas / Piney Woods** — Caddo country; first missions; the Chicken War.
3. **San Antonio / Central Texas** — key Spanish hub (founded 1718).
4. **Rio Grande / South** — Spain's supply road from Mexico.
5. **West / El Paso** — far, dry, edge of the claim.

On the map a player can place three kinds of markers:
- **Mission** ⛪ — spreads faith and wins Native support (raises **Support**).
- **Presidio** 🏰 — a fort that holds a region by force (raises **Strength**).
- **Trading post / fort** ⚜️ (France's specialty) — quick claim + trade income (raises **Territory** fast but is weakly held).

Placing in a region raises your **claim** there. The rival can contest it. Whoever holds more regions at the end wins the match.

### 3.2 Meters (each 0–100, start at 40)
- **Territory** 🗺️ — how much of Texas you claim.
- **Strength** 🏰 — military hold (presidios, soldiers).
- **Support** 🤝 — missions + Native alliances (legitimacy and help).

Rules:
- If **Strength hits 0**, your colony collapses (like Fort St. Louis) — you can lose the match outright.
- **Final Claim Score** = Territory + (Strength ÷ 2) + (Support ÷ 2). Higher score wins the match.
- Meters cap at 100.

### 3.3 Turn structure — 6 chapters (the era 1519–1722)
Each **chapter** is a moment in history. In a chapter:
1. **Event card** — a short cinematic image + 2–4 sentences (Fable-written) describing what's happening (e.g., "La Salle lands by mistake").
2. **Your move on the map** — click a region and place a marker (mission / presidio / trading post). This is a graded choice (where + what).
3. **A decision** — 3 options responding to the event. One is historically right for your nation, one partial, one wrong.
4. **Feedback** — meter changes + one or two plain sentences explaining why (the learning moment).
5. In head-to-head, the **rival takes their turn**; then the chapter advances.

Six chapters × (1 map move + 1 decision) = **12 graded actions**, used for accuracy.

### 3.4 Accuracy (same math as Survive the Season)
Per graded action: **right = 1, partial = 0.5, wrong = 0.** Student accuracy = (points earned ÷ 12) × 100, rounded. Tracked **per student and per nation**. Accuracy is independent of who wins the match.

### 3.5 Endings
- **Secured the Land** — high Claim Score and a healthy colony. (Spain's historical outcome when played well.)
- **Held On** — a middling claim.
- **Lost the Race** — low Claim Score or a collapsed colony. (France's common outcome — the debrief explains this is real history, not a failure of the player if their accuracy was high.)
- Every ending shows a **debrief**: "What really happened," tying the result to the real history, plus the student's **accuracy score** and a **replay/try-the-other-nation** nudge.

---

## 4. Game Modes & Matchmaking

### 4.1 Head-to-head (2 students)
- Two students are paired. One plays **Spain**, one plays **France** (assignment **randomized**).
- Turns **alternate**: Spain acts, then France, chapter by chapter, on a **shared map** that both players see update in real time (the server pushes state to both clients — Section 9).
- At the end, the game compares Claim Scores and shows each player their result **and** their own accuracy.

### 4.2 Solo (1 student vs the computer)
- A student plays alone and **chooses their nation**. The computer plays the other nation using its **real historical strategy** (Section 5).
- Same six chapters, same map, same accuracy tracking. Easier to schedule and a good fallback.

### 4.3 Matchmaking (how students get paired)
- Students join the session (code + name, teacher-approved — same as Survive the Season).
- The teacher clicks **"Pair & Start."** The system:
  1. **Randomly pairs** joined, approved students into duos.
  2. **Randomly assigns** Spain/France within each duo.
  3. If the count is **odd**, everyone possible is paired and the **leftover student plays solo vs the computer** (nation auto-assigned or student-chosen).
- A student may also pick **"Play Solo"** on the join screen if they'd rather not be paired (then they choose their nation).
- The teacher roster shows each **pair** (Ana = Spain vs Leo = France), plus any **solo** players, with live status and accuracy.

### 4.4 Handling drop-outs (important for a real classroom)
- If a paired student closes their tab or loses connection mid-match, the other student sees **"Waiting for your partner…"**
- After a short wait, offer the waiting student a button: **"Finish vs the computer"** — the game converts the match to solo and the computer takes over the missing nation. Their accuracy still counts.
- The teacher can also **re-pair or convert** any match from the command center.

---

## 5. Reference Content — the Six Chapters

Below is the full chapter flow. **Spain's path is written out as the reference implementation.** France's parallel choices are given as a per-chapter table. The **computer opponent** in solo mode always plays the listed *right* choice for its nation. Player-facing text is already at a 5th grade level — match this voice.

### Chapter 1 — Explorers & First Claims (1519)
*Event:* Spain's ships map the Texas coast. There is little gold here, so Spain must decide how much to care about this land. Far away, France is exploring the great rivers.

**Spain — Map move:** Best = place a small **claim/expedition marker** on the **Rio Grande / South** (your road up from Mexico). *"Good. Your strength flows from Mexico. Starting near the Rio Grande keeps you supplied."*
**Spain — Decision:** *How much effort do you put into Texas now?*
- **A) Claim it but watch for rivals.** ✅ Territory +10, Support +5. *"This matches what Spain really did — it claimed Texas but waited, keeping an eye out for other powers."*
- **B) Pour everyone into Texas right away.** ⚠️ Strength +5, Support −5. *"Spain didn't have people to spare yet. Rushing in early wastes strength you'll need later."*
- **C) Ignore Texas completely.** ❌ Territory −10. *"Ignoring the land is how you lose it. Soon a rival will test that."*

### Chapter 2 — The French Land by Mistake (1685)
*Event:* La Salle meant to reach the Mississippi but lands in Texas by mistake and builds **Fort St. Louis** on Matagorda Bay. Spain is alarmed.

**Spain — Map move:** Best = place a **presidio or scouting party** near the **Gulf Coast / Matagorda Bay** to find and watch the French. *"Yes. Spain sent expeditions to hunt for the French fort. Watching the coast is the right response."*
**Spain — Decision:** *How do you answer the French threat?*
- **A) Send missionaries and soldiers to settle East Texas and hold the land.** ✅ Support +10, Strength +5. *"Exactly Spain's real plan — answer France by building missions and presidios."*
- **B) Attack Fort St. Louis with a huge army.** ⚠️ Strength +5, Support −5. *"Spain looked for the fort, but it was sickness and the Karankawa that destroyed it. A giant army wasn't needed and costs you support."*
- **C) Do nothing and hope France leaves.** ❌ Territory −10. *"Hoping is not a plan. The French presence is why Spain must finally act."*

### Chapter 3 — Spain Builds Missions (1690)
*Event:* Spain sends **Fray Damián Massanet** to found **San Francisco de los Tejas**, the first mission in East Texas, among the Caddo.

**Spain — Map move:** Best = place a **Mission** in **East Texas / Piney Woods** (Caddo country). *"Right. The first East Texas mission went up here to befriend the Caddo and hold the land against France."*
**Spain — Decision:** *How do you treat the Caddo?*
- **A) Befriend and trade with the Caddo through the mission.** ✅ Support +15. *"Missions worked best as bridges to Native peoples. Caddo friendship strengthens your claim."*
- **B) Demand the Caddo obey and give tribute.** ❌ Support −10. *"Harsh demands pushed Native peoples toward your rivals. This weakens you."*
- **C) Build only a fort, no mission.** ⚠️ Strength +5, Support −5. *"A fort alone holds ground but wins few friends. Spain's strength came from missions plus presidios."*

### Chapter 4 — Building the Web (1700s–1718)
*Event:* Spain links its missions with presidios and roads. **Antonio Margil de Jesús** helps found missions, and Spain establishes **San Antonio (1718)** as a key stop between the Rio Grande and East Texas.

**Spain — Map move:** Best = place a **Mission + Presidio** at **San Antonio / Central Texas**. *"San Antonio became the heart of Spanish Texas — a mission and presidio halfway along the road."*
**Spain — Decision:** *How do you connect your settlements?*
- **A) Build San Antonio as a supply stop linking your missions.** ✅ Territory +10, Strength +5. *"This is why San Antonio mattered — it tied the whole claim together."*
- **B) Spread thin with tiny outposts everywhere.** ⚠️ Territory +5, Strength −5. *"Too many weak outposts are hard to defend and supply."*
- **C) Pull back to the Rio Grande and give up the center.** ❌ Territory −10. *"Retreating hands the middle of Texas to your rivals."*

### Chapter 5 — The Chicken War (1719)
*Event:* A small French force from Louisiana surprises a Spanish mission in East Texas and takes it briefly. It's a tiny fight, but a loud warning.

**Spain — Map move:** Best = place a **Presidio** in **East Texas** to reinforce the missions (historically, Spain strengthened the area, e.g., Los Adaes). *"Yes. After the scare, Spain reinforced East Texas to guard the border with French Louisiana."*
**Spain — Decision:** *How do you respond to the raid?*
- **A) Reinforce the East Texas missions with presidios and settlers.** ✅ Strength +10, Territory +5. *"Spain answered the Chicken War by digging in and holding the border."*
- **B) Abandon East Texas as too risky.** ❌ Territory −15. *"Leaving hands the borderland to France. Spain chose to stay."*
- **C) Launch a full war on French Louisiana.** ⚠️ Strength −5. *"A big war was beyond Spain's strength here. Holding firm was smarter than overreaching."*

### Chapter 6 — Securing Texas (1720s)
*Event:* France, short on settlers and supplies, pulls back toward Louisiana. Spain's web of missions and presidios holds. The era ends.

**Spain — Map move:** Best = place a final **Mission or Presidio** to **fill a gap** in your weakest region. *"Filling your weak spot locks in the claim."*
**Spain — Decision:** *How do you finish the era?*
- **A) Strengthen and connect what you have.** ✅ Territory +10, Support +5. *"Spain won Texas not by conquest but by settling and building. This seals it."*
- **B) Grab new far-off land you can't defend.** ⚠️ Territory +5, Strength −10. *"Overreaching late in the game risks losing what you built."*
- **C) Stop building and coast.** ❌ Territory −5. *"The race isn't over until it's over. Coasting lets rivals creep back."*

### France — parallel choices (per chapter)
Build France with the same event beats but its **own strategy**. Right = France's real method; France always fights the settler/supply problem.

| Chapter | France — right (✅) | France — partial (⚠️) | France — wrong (❌) |
|---|---|---|---|
| 1 (1519/explore) | Explore the rivers and coast for a route to the Mississippi; note Native trading partners | Plant one small claim and wait | Try to out-settle Spain with colonists France doesn't have |
| 2 (1685 landing) | Build **Fort St. Louis** on the coast and seek the Mississippi; trade for food | Fortify heavily but ignore supplies | Sit still with no food plan (the real fort starved) |
| 3 (1690 Caddo) | Win **Caddo trade alliances** (France's great strength) | Trade a little, fortify a little | Demand obedience like an empire — France's edge was friendship, not force |
| 4 (1700s) | Grow **Natchitoches/Louisiana trade posts** feeding into Texas | Scatter tiny posts | Try to build Spanish-style missions France couldn't staff |
| 5 (1719 Chicken War) | Raid the Spanish mission from Louisiana, then trade for local support | Raid but fail to follow up | Start a full war France can't supply |
| 6 (1720s) | Consolidate in Louisiana; keep Texas trade ties alive | Hold a lone Texas fort | Overextend and collapse from lack of settlers |

**France debrief truth:** Played accurately, France still tends to **lose the Texas race** — too few colonists and constant supply trouble. That *is* the history (7.2B). Reward the student's accuracy, and let the debrief explain why Spain's mission-and-presidio method won.

---

## 6. The Map (interactive layer)

- Show a stylized map of early Texas with the **5 regions** (Section 3.1) as clickable zones.
- Each region shows small **markers** for missions ⛪, presidios 🏰, and trading posts ⚜️, colored by nation (Spain = red/gold, France = blue/white).
- On a player's turn, eligible regions **highlight**; clicking one opens a small "place marker" choice; placing updates the map for both players (head-to-head) or just the player (solo).
- A region's **claim** tilts toward whoever has more/stronger markers there. Show a simple claim indicator (a small flag or shaded tint) per region.
- Keep it readable on a phone: large tap zones, clear labels, colorblind-safe cues (icons + patterns, not color alone).

---

## 7. Screen Flow / State Machine

```
[Title] → [How to Play]
        → [Join: enter class code + choose name]
        → [Waiting for teacher approval]      (if approval on)
        → [Lobby: "Waiting to be paired…" / choose Play Solo]
                │
     ┌──────────┴───────────┐
     ▼                      ▼
[Head-to-Head match]     [Solo match]
  alternating turns        vs computer
  on a shared map          on your own map
     │                      │
     ▼                      ▼
[Chapter loop ×6: Event → Map move → Decision → Feedback → (rival turn)]
     │
     ▼
[Match Result + Debrief + your Accuracy] → [Play Again / Try Other Nation]
```

**States:** `title`, `howToPlay`, `join`, `waitingApproval`, `lobby`, `matchSetup`, `chapterEvent`, `mapMove`, `decision`, `feedback`, `awaitRival`, `result`. Track: `mode` (versus/solo), `nation`, `matchId`, `chapterIndex`, `whoseTurn`, `meters`, `mapState`, `decisions[]`.

---

## 8. Server-Authoritative State & Socket Protocol

**Same model as Chronos Protocol: the server owns the truth.** All session, match, and score state lives **in server memory** inside a transport-agnostic `GameManager`, keyed by a 6-digit join code in the `SessionRegistry`. There is **no database** — nothing is written to disk. Clients are thin: they submit tiny payloads and render the state the server pushes back. Correct answers and feedback never reach a client before the resolution beat.

### 8.1 In-memory state (held in `GameManager`)
```
Session {
  joinCode: "742019"
  teacherSocketId
  mode: "versus" | "solo" | "mixed"
  requireApproval: true
  open: true
  students: Map<studentId, {
    displayName: "Ana R.",
    approved: true,
    role: "student",
    mode: "versus" | "solo",
    nation: "spain" | "france" | null,   // set at pairing
    matchId: string | null,
    status: "not_started" | "in_progress" | "completed",
    actions: [ { chapter, kind:"map"|"decision", verdict:"right"|"partial"|"wrong", points } ],
    pointsEarned, totalActions: 12, accuracy   // accuracy set on completion
  }>
  matches: Map<matchId, {
    spainStudentId,
    franceStudentId | "AI",                // "AI" in solo mode
    whoseTurn: "spain" | "france",
    chapterIndex: 0..5,
    mapState: { regions: { gulf:{owner,markers}, eastTx:{...}, sanAntonio:{...}, rioGrande:{...}, west:{...} } },
    metersSpain: { territory, strength, support },
    metersFrance: { territory, strength, support },
    status: "active" | "completed" | "abandoned",
    winner: "spain" | "france" | "tie" | null
  }>
}
```
Because this is memory-only, **ending a session (or the server going idle/restarting) erases the data** — the "session-only, nothing kept long-term" guarantee is built in (see Section 13.4). The **PDF** the teacher downloads is the only lasting record.

### 8.2 Socket protocol (mirror the Chronos naming style)
Keep `GameManager` transport-agnostic; put Socket.IO wiring in `sockets/socketHandlers.js`.

| Direction | Event | Payload → result |
|---|---|---|
| teacher → | `teacher:create_session` | `{course, unit, mode}` → ack `{joinCode}` |
| teacher → | `teacher:approve_name` / `rename` / `kick` | moderate the roster |
| teacher → | `teacher:pair_and_start` | auto-pair students, randomize Spain/France, odd student → solo (Section 4.3) |
| teacher → | `teacher:convert_to_solo` / `end_session` | control ops |
| student → | `student:join` | `{code, nickname, role, mode}` → ack `{student, sync}` (nickname runs the profanity filter) |
| student → | `student:rejoin` | `{code, student_id}` — reconnect and land on the live chapter/turn with remaining state |
| student → | `student:submit_move` | `{student_id, matchId, chapter, kind:"map"\|"decision", choice, timestamp}` — the **only** thing a client sends per action |
| ← server | `lobby:update` | roster + pairings for the command center |
| ← server | `match:begin` | nation assignment, starting map + meters |
| ← server | `chapter:event` | the event card for the current chapter |
| ← server | `turn:begin` | whose turn it is (the other client renders a read-only "rival is deciding…" view) |
| ← server | `turn:resolution` | verdict + feedback + updated map/meters (revealed only at the resolution beat) |
| ← server | `match:end` | result + each player's accuracy; debrief "what really happened" |
| ← server (teacher) | `solo:progress` / `solo:student_end` / `session:report` | live per-player progress, per-player end cards, and the aggregate per-nation report |

### 8.3 Scoring (pure functions in `scoring.js`, server-side)
Accuracy math lives in a pure `scoring.js` module (like Chronos): **right = 1, partial = 0.5, wrong = 0**, over **12 graded actions**, `accuracy = round(pointsEarned / 12 × 100)`. No speed bonuses, streaks, or multipliers. The server computes it — never the client — so scores can't be tampered with.

---

## 9. Multiplayer Sync Design (the hard part — give this to Opus)

**Model: turn-based, server-authoritative, one Socket.IO room per session (and per match).**
- The active player's client emits `student:submit_move` with a tiny payload. **All game logic runs on the server:** `GameManager` validates it's that player's turn, applies the map move + decision, scores it via `scoring.js`, updates `mapState`/meters, and advances `whoseTurn` (or `chapterIndex` when both nations have gone).
- The server then **pushes** `turn:resolution` and the next `turn:begin` to **both** clients in the match room. Clients just render — no client holds the answer key.
- **Turn lock is enforced on the server:** a `submit_move` that isn't from the current `whoseTurn` player is rejected. There is no client-side trust to exploit.

**Reconnection (built in, like Chronos):** if a student's socket drops, they reload and emit `student:rejoin {code, student_id}`; the server returns the live match state and drops them back on the current turn with the remaining time. This replaces any need for heartbeats or client-side timers.

**Drop-outs (Section 4.4):** the server sees the socket `disconnect`. The partner gets a **"Waiting for your partner…"** push; after a short server-side timeout the partner is offered **"Finish vs the computer,"** which sets the missing side to `"AI"` and the server plays that nation's real strategy from then on. The teacher can also `teacher:convert_to_solo` or end the match.

**Solo mode** uses the same match object with one side = `"AI"`. After the student's `submit_move`, the **server** computes the computer's move (always the listed *right* choice for its nation) and pushes the combined resolution — so solo and head-to-head share one code path.

---

## 10. Technical Requirements

- **Server + thin client (the Chronos stack):** a Node + Express + **Socket.IO** server (ESM) holds all state; a **React 18 + Vite** client renders it. One Render web service builds the client and starts the server (Section 14). Embedded in Wix by iframe.
- **Server-authoritative:** clients emit tiny payloads (`student:submit_move`) and render state pushes; the server runs all logic and scoring. No answer key or score math on the client.
- **No `localStorage`/`sessionStorage`** for game state (breaks in a Wix iframe, and the server is the source of truth anyway). Reconnection uses `student:rejoin`, not browser storage.
- **Iframe-friendly & responsive:** max-width ~1000 px, scales to 360 px phone width. Big tap targets for map regions and choices.
- **Accessibility:** color is never the only signal (icons + labels + patterns for nation/claim); keyboard-navigable; readable 16px+ text; alt text on every image.
- **Performance:** compress images (< ~400 KB each); the map can be one optimized image with clickable overlays.
- **Reading-level guardrail:** short sentences; define hard words; flag any sentence over ~20 words.
- **Footer:** "Made for 7th Grade Texas History · TEKS 7.2B, 7.2C."

---

## 11. Visual & Audio Assets (Higgsfield MCP)

**Art direction (top of every prompt):**
> Semi-realistic cinematic historical illustration. Warm natural light, painterly detail, dignified and respectful. Historically accurate clothing, ships, forts, missions, and landscapes for early Texas, 1500s–1700s. No text, no logos. Wide 16:9 framing.

**Accuracy rules:**
- **Spanish missions** = stone/adobe church compounds; **presidios** = walled military forts; **French Fort St. Louis** = a rough wooden stockade on a marshy bay.
- Depict **Native peoples (Caddo, Karankawa, Apache) with dignity and specificity** — daily life and trade, not clichés or battle tropes.
- Match landscapes to regions: marshy **Gulf coast** for Matagorda Bay; green **Piney Woods** for East Texas; dry brush and river for **San Antonio**; big-sky **Rio Grande**.
- Ships/soldiers should look **period-correct** (1600s–1700s), not modern or generic "conquistador" cartoons.

**Priority asset list (build solo Spain first, then France, then multiplayer polish):**

| # | Asset | Type | Prompt (append art direction + accuracy rules) |
|---|---|---|---|
| 1 | Title / hero | Image | "A cinematic map-like view of early Texas — coastline, piney woods, and river country — with a Spanish mission on one side and a French fort on the other, hinting at a contest for the land." |
| 2 | Game map (base) | Image | "A stylized illustrated map of early Texas showing five regions: Gulf coast and Matagorda Bay, East Texas piney woods, central San Antonio river country, the Rio Grande south, and the dry western edge. Clean, readable, warm parchment tones." |
| 3 | Spain banner/card | Image | "A dignified Spanish colonial scene in Texas — a stone mission with a bell tower and a walled presidio nearby, red-and-gold tones." |
| 4 | France banner/card | Image | "A dignified French colonial scene on the Texas Gulf coast — a rough wooden fort (Fort St. Louis) by a marshy bay, a small trading canoe, blue-and-white tones." |
| 5 | Event — Explorers (1519) | Image | "A Spanish sailing ship mapping the flat Texas Gulf coastline at dawn, 1500s, calm and vast." |
| 6 | Event — La Salle lands (1685) | Image | "French colonists building a rough wooden stockade on a marshy Texas bay, a damaged ship offshore, a sense of a mistake and hardship." |
| 7 | Event — First mission (1690) | Image | "A Spanish friar and Caddo people meeting peacefully to build a simple wooden-and-adobe mission among tall pine trees in East Texas." |
| 8 | Event — San Antonio (1718) | Image | "An early San Antonio mission and presidio beside a clear river in central Texas, fields nearby, a hopeful growing settlement." |
| 9 | Event — Chicken War (1719) | Image | "A small, almost comic skirmish at a remote East Texas mission at dawn — a handful of French soldiers, startled Spanish friars, chickens scattering — low stakes but tense." |
| 10 | Marker icons (mission, presidio, trading post) | Flat icons | Best as clean flat vector: a bell-tower church, a walled fort, a trading-post flag. Small and crisp for the map. |
| 11 | *(Optional)* Title loop | Video (`generate_video`) | "Slow drifting clouds over an early-Texas coastline at golden hour, a tall ship far offshore, calm cinematic loop." |
| 12 | *(Optional)* Ambient audio | Audio (`generate_audio`) | "Gentle coastal wind, distant gulls, soft ambient loop." Default muted, with a toggle. |

Save images to `assets/images/` with the filenames used in code; compress to < ~400 KB.

---

## 12. When to Use Each Claude Model (and Higgsfield)

| Model | Best for here | Use it to… |
|---|---|---|
| **Claude Fable** *(long-form creative writing)* | Immersive, reading-level-controlled narrative | Write all **event cards, decision text, feedback, and debriefs** for **both nations** across the six chapters (Sections 5), plus the France strategy voice. Output into the game's content object. |
| **Claude Opus** *(deepest reasoning)* | Architecture + the hard multiplayer parts | Build the **server-authoritative `GameManager`** state machine, the **map/claim logic and `scoring.js`** math, the **Socket.IO transport + turn-lock** (Section 9), the **matchmaking/pairing** (Section 4), the **solo AI opponent**, the **`SessionRegistry` + join codes**, and the **Teacher Command Center** logic. This is the model for everything tricky. |
| **Claude Sonnet** *(fast, capable, cost-effective)* | High-volume iteration | Build/polish the **map UI and clickable regions**, wire in Higgsfield art, style the screens, build the **dashboard tables**, tune responsiveness and accessibility, and run test passes. |
| **Claude Haiku** *(quick, light)* | Optional small tasks | Rename files, reformat data, quick copy tweaks. |
| **Higgsfield MCP** | Media | `generate_image` for map, banners, event scenes, icons; `generate_video`/`generate_audio` for optional title loop and ambience. |

**Recommended build order (see the phased plan in Section 18):**
1. **Fable** — write both nations' six-chapter content into the content object.
2. **Opus** — build the single-player **solo vs AI** game first: map, meters, chapters, scoring, accuracy (placeholder art).
3. **Higgsfield** — generate map + Spain/France + event art; save to `assets/`.
4. **Sonnet** — wire art in; polish the map UI; make it responsive; test.
5. **Opus** — add the **Teacher Command Center** (reuse Chronos/Survive the Season) + **matchmaking** + **per-nation accuracy** in the server + PDF export.
6. **Opus** — add **head-to-head real-time sync** and drop-out handling (Section 9).
7. **Sonnet** — polish the lobby/pairing UI and dashboard; full two-window testing.
8. **Sonnet + Higgsfield** — optional video/audio and extra polish.

---

## 13. Teacher Command Center

Same foundation as *Chronos Protocol / Survive the Season* (join code, PIN gate, name approval + profanity filter, live status, PDF, and **delete-on-end with the "This will delete session data. Do you want to proceed?" box**). Because state is **in server memory with no database**, "nothing kept long-term" is automatic (Section 13.4). Additions for this game:

### 13.1 New abilities
- **Pair & Start** button (Section 4.3): auto-pair students, randomize nations, send the odd student to solo.
- **Roster shows pairings:** each match as *Ana R. (Spain) vs Leo P. (France)*, plus solo players, each with **status** (Not started / In progress / Completed) and **accuracy %**.
- **Match controls:** convert a match to solo, re-pair, or end a stuck match.
- **Class accuracy per nation:** *"Spain — 11 players — 82% average"* and *"France — 10 players — 74% average."* (This is the per-side version of "accuracy for the tribe they pick.")

### 13.2 Accuracy & progress
- **In progress vs completed:** live, from each student's `status`, updated as they play (flips to Completed at the match result screen).
- **Accuracy per student** from the 12 graded actions; **class averages grouped by nation**.

### 13.3 PDF download (client-side: jsPDF + html2canvas)
Built in the browser in `CommandCenter.jsx` from the report the server sends (`session:report`) — same libraries as Chronos.
- **Header:** join code, date, optional teacher name, # students, # matches.
- **Table 1 — Students:** Name · Nation · Mode (versus/solo) · Partner · Status · Accuracy %.
- **Table 2 — Class accuracy by nation:** Nation · # completed · Average accuracy.
- **Footer:** "7th Grade Texas History · Claim the Land · TEKS 7.2B, 7.2C."
- Filename: `claim-the-land_742019_2026-05-12.pdf`.

### 13.4 Data lifecycle — session-only by design (nothing stored long-term)
Because all state lives **in server memory** (Section 8) with **no database**, the "nothing kept long-term" goal is built in:
- **End Session** → the client shows the confirmation box **"This will delete session data. Do you want to proceed?"** → on Proceed, the client emits `teacher:end_session` and the **server drops the session (students + matches) from memory**. Gone immediately.
- A standing note on the report reminds you to **download the PDF first** — it's the only lasting record.
- **Backstops (no persistence anywhere):** the server sweeps **idle sessions** from memory after a set inactivity window, and on Render's free plan the service **spins down when idle**, which clears all memory too. Either way, an abandoned session evaporates on its own — the equivalent of the old 24-hour rule, but now automatic because nothing is written to disk in the first place.

### 13.5 Security & privacy
- **Display name only** — no emails or last names. Nicknames run the `lobby/profanity.js` filter and your approval gate.
- **Server-authoritative** = students can't see the answer key, other students' data, or the roster; they only receive their own state pushes. A `submit_move` out of turn is rejected server-side.
- **Protect the teacher view** with the teacher PIN and a **password-protected Wix page** for the Command Center route. Teacher control ops are only accepted from the teacher's socket/role.
- **No database, no PII at rest.** Check campus/district rules before going live; this design is intentionally low-risk.

---

## 14. GitHub Repo & Render Deploy (mirror Chronos Protocol)

Repo structure — server + client siblings (same as Chronos; not GitHub Pages, since we run a live server):
```
claim-the-land/
├── server/                      Node + Express + Socket.IO (ESM)
│   └── src/
│       ├── index.js             HTTP + Socket.IO bootstrap; serves the built client
│       ├── config.js            ports, turn timers, limits
│       ├── scoring.js           accuracy math (pure functions)
│       ├── GameManager.js       server-authoritative match state machine (transport-agnostic)
│       ├── lobby/               join codes, SessionRegistry, profanity filter
│       └── sockets/             socketHandlers.js (Socket.IO transport)
├── client/                      React 18 + Vite thin client
│   └── src/
│       ├── components/teacher/CommandCenter.jsx
│       ├── components/student/Datapad.jsx      (the game board + map)
│       ├── components/shared/...
│       └── services/
│           ├── socket.js        socket.io-client singleton
│           └── assetService.js  ★ Higgsfield MCP integration seam (art manifest)
├── assets/images/               map, banners, event art, icons (or under client/public)
├── render.yaml                  Render web service config
├── package.json                 root: postinstall cascades to server/ + client/
└── README.md
```
`render.yaml` (as in Chronos):
```yaml
services:
  - type: web
    name: claim-the-land
    runtime: node
    plan: free
    buildCommand: npm install && npm run build   # builds the client
    startCommand: node server/src/index.js        # server serves client + sockets
    envVars:
      - key: NODE_VERSION
        value: 20.18.0
```
1. Push the repo to GitHub (same account as your other games).
2. On **Render**, create a **Web Service** from the repo; it reads `render.yaml`.
3. Render gives you one live URL, e.g. `https://claim-the-land.onrender.com`.
   - **Students** open the base URL (Datapad view).
   - **Teacher** opens the Command Center route (e.g. `…/#teacher` or a `?role=teacher` param — match how Chronos routes the two views).
4. *Note on the free plan:* the service **spins down when idle** and takes a few seconds to wake on the first request — fine for class use, and it doubles as the "no data left behind" backstop (Section 13.4).

## 15. Embed in Wix
- **Student page:** Wix **Add → Embed Code → Embed a Site**, paste the Render **student URL**, size to fit (~1000 × 760; adjust), publish, test on phone.
- **Teacher page:** new Wix page → embed the Render **Command Center URL** → **Page Settings → Permissions → Password/Members-only** so only you can open it. The in-app PIN is a second layer.
- Use the `https://` Render URLs (HTTPS is automatic); no Velo needed. Redeploy by pushing to GitHub (Render auto-builds); hard-refresh to clear cache.
- **Head-to-head test:** open the student URL in two browsers/devices, join the same code, have the teacher **Pair & Start**, and confirm turns sync in real time.

## 16. Build Checklist

**Game (solo first)**
- [ ] Fable content for both nations, six chapters (event + map move + decision + feedback + debrief)
- [ ] Map with 5 regions; place mission/presidio/trading post; claim indicator per region
- [ ] Meters start at 40, cap at 100; Strength 0 = colony collapse
- [ ] Claim Score = Territory + Strength/2 + Support/2; correct win/lose endings
- [ ] Accuracy = 12 graded actions (right=1/partial=.5/wrong=0), tracked per nation
- [ ] Solo mode: computer plays the other nation's real strategy
- [ ] Reading level checked; images compressed with alt text; responsive to 360 px; no browser storage for game state

**Multiplayer (Socket.IO, server-authoritative)**
- [ ] `GameManager` holds match state; server validates and scores every move
- [ ] Socket.IO rooms per session/match; `turn:begin`/`turn:resolution` push to both clients
- [ ] Turn-lock enforced **on the server** (out-of-turn `submit_move` rejected)
- [ ] Reconnect via `student:rejoin` lands back on the live turn
- [ ] Drop-out handling: server detects `disconnect` → partner offered "Finish vs the computer"

**Teacher Command Center**
- [ ] Server + Socket.IO running on Render; client connects via `services/socket.js`
- [ ] `teacher:create_session` returns a join code; teacher PIN gate; name approval + profanity filter
- [ ] **Pair & Start**: auto-pair, randomize nations, odd student → solo
- [ ] Roster shows pairings, status (Not started/In progress/Completed), accuracy %
- [ ] Class accuracy per nation with counts (`session:report`)
- [ ] PDF download via jsPDF + html2canvas (student table + per-nation table)
- [ ] End Session → confirmation box → server drops session from memory; "download PDF first" reminder
- [ ] Idle-session sweep + free-plan spin-down confirmed (no data persists)

**Ship**
- [ ] Render URL live; student route embedded in Wix; Command Center route on a password-protected Wix page
- [ ] Tested solo and head-to-head across two devices; tested on phone

## 17. Test Plan (quick)
1. **Solo win/lose/mixed** paths give the right endings and accuracy.
2. **Accuracy math** matches a known choice pattern (e.g., all-right = 100%).
3. **Head-to-head sync:** two windows, paired by teacher, turns alternate and the map updates for both in real time.
4. **Turn lock:** the server rejects a `submit_move` from the non-active player.
5. **Odd number:** pair 3 students → one pair + one solo; 5 → two pairs + one solo.
6. **Nation randomization:** repeat pairing; Spain/France assignment varies.
7. **Drop-out & reconnect:** close one paired window; the partner can "Finish vs the computer" and still gets accuracy; reopening and `student:rejoin` lands back on the live turn.
8. **Command center:** live status + per-nation averages update; PDF has both tables and correct filename.
9. **Security:** a student can't reach the Command Center route or receive another student's state; out-of-turn moves are rejected.
10. **End & clear:** confirmation box appears; Proceed drops the session from server memory; an idle session evaporates on its own.

## 18. Suggested Phased Build (do it in this order)

Multiplayer is the expensive part, so build value first and add networking last.

- **Phase 1 — Solo game (MVP).** Fable content + Opus solo-vs-AI game (map, chapters, scoring, accuracy) + Higgsfield art. Fully playable single-player. *This alone is a complete, useful classroom game.*
- **Phase 2 — Teacher Command Center.** Reuse Survive the Season's backend; add per-nation accuracy and the PDF. Now you can run it with a class in solo mode and see results.
- **Phase 3 — Head-to-head + matchmaking.** Add the real-time match sync, pairing, nation randomization, odd-student solo, and drop-out handling. This is the biggest lift — Opus-led, tested across two devices.
- **Phase 4 — Polish.** Optional title video/audio, animations, and extra art for replay.

Ship Phase 1 to your students early; layer 2–4 as you go. Each phase is usable on its own.

## 19. Teacher / Accuracy / Historical Notes
- **Winning ≠ accuracy.** Grade the **accuracy** score. France played *accurately* often still loses Texas — that's the real history (few settlers, poor supplies), and it's the whole lesson of 7.2B. Make sure debriefs say this out loud so a "losing" France player who played well feels the win of understanding.
- **Missions vs. forts (7.2C).** The game's core contrast is Spain's **mission + presidio** method vs France's **fort + trade** method. Every feedback line should reinforce which method fits which nation.
- **Respectful representation.** Native nations (Caddo, Karankawa, Apache) are players in the story, not scenery. Keep art and text dignified and specific.
- **Dates are simplified** for a 5th grade reading level; the teacher notes here hold the fuller context if students ask.

---

*Companion to your Chronos Protocol, Texas Geography, Native American Interactive Map, and Survive the Season builds. Same GitHub → Wix workflow; same Teacher Command Center, now with matchmaking.*
