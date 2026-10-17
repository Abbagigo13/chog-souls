# CHOG SOULS

**Living NFTs that remember you.**

Every Chog is not a static image. It's a Soul — a companion with personality, memory, and the ability to evolve through every interaction you have with it.

Built for the CHOGATHON hackathon on Monad.

---

## 🌟 What It Does

| Feature | Description |
| --- | --- |
| **AI Chat** | Talk to your Soul. Powered by Alibaba Qwen. It remembers everything. |
| **Daily Quests** | A new moral dilemma every day of the week. AI evaluates your choice against the Soul's personality. |
| **Arena Battles** | Weighted combat math + AI-generated narratives + rival dialogue. |
| **Archetype Evolution** | The Soul's identity shifts based on accumulated stats. |
| **Memory System** | Importance-scored memories, contextual retrieval, and automatic summarization. |
| **Leaderboard** | 9 rival Souls + you. Click any rival to see their full profile. |
| **Share Card** | One-click PNG of your Soul for Twitter. |
| **$CHOG Layer** | Optional token integration with a roadmap for advanced players. |
| **Daily Streaks** | Rewards for return visits, escalating through day 7. |
| **Achievements** | 8 milestones with progress tracking. |

---

## 🎮 How to Play

1. **Open the app** → click **AWAKEN A SOUL** for the demo.
2. **Talk** to Giga. Watch how AI responds in character.
3. **Make a choice** in the Daily Quest. See stats shift.
4. **Battle NOVA** in the Arena. Hear her taunt you.
5. **Level up**, evolve your archetype, climb the leaderboard.
6. **Import a real Chog** or try a demo Chog to unlock full progression.

---

## 🛠 Tech Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | React + Vite |
| **Backend** | FastAPI (Python) |
| **AI** | Alibaba Qwen (Model Studio, Singapore) |
| **Blockchain** | Monad Mainnet (read-only) |
| **Persistence** | Browser localStorage + in-memory backend |

---

## 🚀 Running Locally

### Backend

```bash
cd backend
.\.venv\Scripts\Activate.ps1     # Windows
# source .venv/bin/activate       # macOS/Linux

pip install -r requirements.txt
uvicorn app.main:app --reload

Backend runs at http://127.0.0.1:8000

Frontend
bash
npm install
npm run dev
Frontend runs at http://localhost:5173

Environment Variables
Create backend/.env:

env
AI_API_KEY=your_alibaba_model_studio_key
AI_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
AI_MODEL=qwen-max

📊 Roadmap
☑ Phase 1 — MVP with demo Soul, chat, quests, arena, timeline
☑ Phase 2 — Real Chog integration (backend + frontend)
☑ Phase 3 — AI memory system with importance scoring
☑ Phase 4 — Social features (leaderboard, profiles, rival dialogues)
☑ Phase 5 — Polish (sounds, animations, achievements, streaks)
□ Phase 6 — Full deployment and community quests

🔒 Privacy & Security
1.No private keys stored.

2.No wallet signatures required.

3.Read-only blockchain access for Chog NFT metadata.

4.No user data sent anywhere except Alibaba Qwen for AI responses.

📄 License
MIT
