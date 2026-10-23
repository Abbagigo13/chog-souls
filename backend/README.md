# CHOG SOULS Backend

FastAPI backend for CHOG SOULS. Handles AI chat, quest evaluation, arena battles, memory scoring, on-chain Chog metadata reads, and wallet ownership verification.

All Soul state is held in memory per session — no database is required to run the current version.

---

## Requirements

- Python 3.10+
- An Alibaba Qwen API key from [Model Studio](https://www.alibabacloud.com/en/product/modelstudio)

---

## Setup

```bash
cd backend

# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate        # macOS / Linux
# .venv\Scripts\Activate.ps1    # Windows PowerShell

pip install -r requirements.txt
```

Create `backend/.env` from the example:

```bash
cp .env.example .env
```

Edit `.env` and add your key:

```env
AI_API_KEY=your_alibaba_model_studio_key
AI_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
AI_MODEL=qwen-max
```

---

## Running

```bash
uvicorn app.main:app --reload
```

The API runs at `http://127.0.0.1:8000`.

Interactive docs are available at `http://127.0.0.1:8000/docs`.

---

## Environment Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `AI_API_KEY` | — | Alibaba Qwen API key (required for AI features) |
| `AI_BASE_URL` | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | Qwen endpoint URL |
| `AI_MODEL` | `qwen-max` | Model name |

---

## Project Layout

```
app/
├── main.py             FastAPI app entry point and CORS config
├── api/
│   ├── routes.py           All REST endpoints
│   └── verify_routes.py    Wallet ownership verification
├── data/
│   ├── demo_chogs.py       Pre-built demo Chog definitions
│   ├── quests.py           7 weekly quest scenarios
│   └── rivals.py           9 rival Soul definitions
├── schemas/
│   └── soul.py             Pydantic models: Soul, Memory, SoulStats, Trait
└── services/
    ├── soul_engine.py          Archetype resolution and stat math
    ├── arena_engine.py         Battle power calculation
    ├── battle_engine.py        Combat resolution
    ├── evolution_engine.py     Archetype shift detection
    ├── quest_engine.py         Daily quest selection and evaluation
    ├── rival_engine.py         Rival Soul management
    ├── memory_engine.py        Importance scoring and summarization
    ├── retention_engine.py     Streaks and achievements
    ├── chog_reader.py          Monad RPC: fetch NFT metadata
    ├── chog_token_reader.py    $CHOG token balance and XP bonus
    ├── rarity_engine.py        Rarity tier from trait count
    ├── image_proxy.py          IPFS image fetch and local file cache
    └── verification.py         EIP-712 signature validation
```

---

## Tests

```bash
pytest tests/
```

---

## Adding a Database

The backend is intentionally stateless for the hackathon version. See `../database/README.md` for notes on adding Postgres or Redis persistence behind the existing API contract.
