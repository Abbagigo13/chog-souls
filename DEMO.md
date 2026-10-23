# CHOG SOULS — Quick Demo Guide

Everything you need to run a live demo in under 5 minutes.

---

## Setup

1. **Start the backend:**

   ```bash
   cd backend
   source .venv/bin/activate   # or .venv\Scripts\Activate.ps1 on Windows
   uvicorn app.main:app --reload
   ```

2. **Start the frontend** (in a separate terminal from the project root):

   ```bash
   npm run dev
   ```

3. Open `http://localhost:5173` in Chrome.

4. Optional: open DevTools and run `localStorage.clear()` for a fresh first-time experience.

---

## The Flow (3 minutes)

### 1. Landing (10s)

Say: **"Most NFTs are static. This one remembers you."**

Click **AWAKEN A SOUL**.

---

### 2. Dashboard (20s)

Point at the **avatar**, **archetype**, **rarity badge**, **stat bars**, and **streak badge**.

---

### 3. Talk (35s)

Click **TALK**. Send:

> "Do you trust Bob?"

Show the AI response. Note that the avatar pulses, a sound plays, and the reply is in character.

---

### 4. Quest (35s)

Click **QUEST**. Click any option (e.g. **RETURN IT**).

Show the AI narrative, the stat change, and the new memory.

---

### 5. Timeline (15s)

Click **HISTORY**. Show the memories from the chat and quest.

---

### 6. Arena (45s)

Click **ARENA**. Read NOVA's taunt aloud. Click **START BATTLE**.

Show the power scores, battle narrative, NOVA's reaction, and the sound effect.

---

### 7. Leaderboard (20s)

Click **RANKS**. Click a rival to open their profile.

---

### 8. Share Card (10s)

Return to Dashboard. Click **SHARE SOUL**, then **DOWNLOAD PNG**.

---

## Killer Moments

1. AI responds in character — proves the tech works.
2. NOVA's taunt — the world feels alive.
3. Stat change after a quest choice — cause and effect is visible.
4. Sparkle level-up banner — visual delight.
5. Share card download — viral potential.

---

## Fallback Plan

| Problem | Fix |
| --- | --- |
| Mainnet import fails | Use **TRY A DEMO CHOG** on the Import page |
| AI is slow | Keep talking; show the reply when it arrives |
| Everything breaks | DevTools → `localStorage.clear()` → reload |
