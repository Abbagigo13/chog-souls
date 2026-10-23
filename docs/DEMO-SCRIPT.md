# CHOG SOULS — 3-Minute Judge Demo Script

A timed walkthrough designed for hackathon judging. Hit every feature without rushing.

---

## Before You Start

1. `cd backend && source .venv/bin/activate && uvicorn app.main:app --reload`
2. `npm run dev` in the project root
3. Open `http://localhost:5173` in Chrome
4. Optional: run `localStorage.clear()` in DevTools for a clean first-time experience

---

## 0:00 — Landing (10s)

**Say:** "Most NFTs are static. This one remembers you."

Click **AWAKEN A SOUL**.

---

## 0:10 — Dashboard (20s)

Point at:

- The **Chog avatar** in the center
- The **archetype** label ("The Loyal Trickster")
- The **rarity badge** (UNCOMMON)
- The **four stat bars** (Courage, Loyalty, Intelligence, Greed)
- The **streak badge** (DAY 1)

**Say:** "The Chog's actual on-chain traits become the genetic blueprint of its Soul."

---

## 0:30 — Talk (35s)

Click **TALK**. Send:

> "Do you trust Bob?"

While the AI responds, point out:

- The avatar pulses during the AI call
- A sound effect plays on reply
- The response is written **in character** — references loyalty and memory

**Say:** "The Soul replies using its own personality. And it will remember this conversation."

---

## 1:05 — Quest (35s)

Click **QUEST**. Point out the weekday label and the scenario text.

Click **RETURN IT**.

Show:

- The AI-generated narrative explaining the outcome
- The stat changes ("Loyalty +3")
- The new memory appearing in the timeline

**Say:** "Every choice changes who the Soul is. The AI evaluates it against the Soul's personality, not a fixed alignment chart."

---

## 1:40 — Timeline (15s)

Click **HISTORY**.

Show the two memories just created (chat + quest).

**Say:** "Important moments become memories. Low-importance ones fade. The Soul only holds onto what matters."

---

## 1:55 — Arena (45s)

Click **ARENA**.

Read NOVA's opening taunt aloud.

**Say:** "Rivals have their own personality. NOVA is a Ruthless Strategist — she talks differently than your Soul."

Click **START BATTLE**.

Show:

- The power scores for both sides
- The AI battle narrative
- NOVA's post-battle reaction
- The win/lose sound effect

---

## 2:40 — Leaderboard (20s)

Click **RANKS**.

Point at the 9 rival Souls.

Click any rival to open their full profile.

**Say:** "The world is alive. Every rival has a story. You climb the board by battling and leveling up."

---

## 2:50 — Share Card (10s)

Return to Dashboard. Click **SHARE SOUL**.

Click **DOWNLOAD PNG**.

**Say:** "One click to own your Soul's moment and share it."

---

## 3:00 — Closing

**Say:** "CHOG SOULS turns your Chog from something you own into someone you know."

---

## Fallback Plan

**If the mainnet import fails:** Use **TRY A DEMO CHOG** on the Import page. Six pre-built Chogs load instantly with no RPC call.

**If the AI is slow:** Keep talking, do not wait for the response. Move to the next section and return to show the reply.

**If everything breaks:** Open DevTools, run `localStorage.clear()`, reload. Demo Mode starts automatically.
