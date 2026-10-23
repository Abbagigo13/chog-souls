# CHOG SOULS

**Living NFTs that remember you.**

Your Chog is not a static image. It is a Soul — a companion with personality, memory, and the ability to evolve through every interaction you have with it.

Built for the CHOGATHON hackathon on Monad.

---

## What It Does

| Feature | Description |
| --- | --- |
| **AI Chat** | Talk to your Soul. Powered by Alibaba Qwen. It remembers every conversation. |
| **Daily Quests** | A new moral dilemma every day of the week. The AI evaluates your choice against your Soul's personality and shifts its stats accordingly. |
| **Arena Battles** | Weighted combat math combined with AI-generated battle narratives and rival taunts. |
| **Archetype Evolution** | Your Soul's identity shifts based on accumulated stats — from Loyal Trickster to something entirely its own. |
| **Memory System** | Importance-scored memories, contextual retrieval, and automatic summarization so the Soul never forgets what matters. |
| **Leaderboard** | 9 rival Souls plus your own. Click any rival to view their full profile. |
| **Share Card** | One-click PNG export of your Soul's card for sharing on Twitter or anywhere else. |
| **Daily Streaks** | Rewards for return visits that escalate through day 7. |
| **Achievements** | 8 milestones with live progress tracking. |
| **$CHOG Layer** | Optional token integration with a roadmap for advanced players. |

---

## How to Play

1. Open the app and click **AWAKEN A SOUL** to start with the demo.
2. **Talk** to your Soul. Watch it respond in character.
3. **Make a choice** in the Daily Quest and see your stats shift.
4. **Battle** a rival in the Arena. Hear them taunt you.
5. **Level up**, evolve your archetype, and climb the leaderboard.
6. **Import a real Chog** from your wallet to unlock full progression tied to your NFT.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | React 19 + Vite 7 |
| **Backend** | Python 3 + FastAPI + Uvicorn |
| **AI** | Alibaba Qwen via Model Studio (Singapore endpoint) |
| **Blockchain** | Monad Mainnet, read-only NFT metadata |
| **Persistence** | Browser localStorage (frontend) + in-memory state (backend) |

---

## Running Locally

### Prerequisites

- Node.js 18+ and npm (or bun)
- Python 3.10+
- An Alibaba Qwen API key from [Model Studio](https://www.alibabacloud.com/en/product/modelstudio)

### Backend

```bash
cd backend

# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate        # macOS / Linux
# .venv\Scripts\Activate.ps1    # Windows PowerShell

pip install -r requirements.txt

uvicorn app.main:app --reload
```

The backend runs at `http://127.0.0.1:8000`.

Create `backend/.env` before starting:

```env
AI_API_KEY=your_alibaba_model_studio_key
AI_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
AI_MODEL=qwen-max
```

### Frontend

```bash
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

Set `VITE_API_URL` in a root `.env` file if your backend is not at the default address:

```env
VITE_API_URL=http://127.0.0.1:8000/api
```

---

## Environment Variables

| Variable | Location | Purpose |
| --- | --- | --- |
| `AI_API_KEY` | `backend/.env` | Alibaba Qwen API key for AI chat and quest/arena narratives |
| `AI_BASE_URL` | `backend/.env` | Qwen endpoint URL (default: Singapore) |
| `AI_MODEL` | `backend/.env` | Model name (default: `qwen-max`) |
| `VITE_API_URL` | `.env` (root) | Backend base URL seen by the frontend (default: `http://127.0.0.1:8000/api`) |

The frontend runs in **demo mode** automatically if the backend is unreachable — no AI key is needed to explore the UI.

---

## Roadmap

- [x] Phase 1 — MVP: demo Soul, chat, quests, arena, timeline
- [x] Phase 2 — Real Chog NFT integration (backend + frontend)
- [x] Phase 3 — AI memory system with importance scoring
- [x] Phase 4 — Social features: leaderboard, profiles, rival dialogues
- [x] Phase 5 — Polish: sounds, animations, achievements, streaks
- [ ] Phase 6 — Full public deployment and community quests

---

## Privacy and Security

- No private keys are stored anywhere.
- No wallet signatures are required.
- Blockchain access is read-only (NFT metadata only).
- No user data is sent to external services except Alibaba Qwen for AI responses.

---

## License

MIT
