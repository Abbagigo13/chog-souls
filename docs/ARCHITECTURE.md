# CHOG SOULS Architecture

## Overview

CHOG SOULS is a two-tier application. The React frontend runs entirely in the browser and handles all UI, local Soul state, and localStorage persistence. The FastAPI backend handles AI calls, arena combat, memory scoring, and on-chain Chog metadata reads. The two communicate over a single REST API.

```
Browser (React + Vite)
        │
        │  REST (JSON)
        ▼
FastAPI Backend (Python)
        │
        ├── Alibaba Qwen API  (AI narratives, chat, quest evaluation)
        └── Monad Mainnet RPC  (read-only NFT metadata)
```

---

## Frontend

Built with React 19 and Vite 7. No external state library — Soul state lives in a `useSoul` hook backed by `localStorage`.

```
src/
├── pages/          One file per screen (Landing, Dashboard, Talk, Quest, Arena, ...)
├── components/     Shared UI (Avatar, TopBar, BottomNav, StatBar, MemoryCard, ...)
├── hooks/          useSoul — loads, saves, and updates Soul state
└── lib/
    ├── api.js          All fetch calls to the backend
    ├── soulEngine.js   Client-side stat math and archetype resolution
    ├── chogContract.js Read Chog NFT metadata from Monad
    ├── traitDecoder.js Map raw trait strings to Soul stat weights
    ├── memory.js       Local memory helpers
    ├── rarity.js       Rarity tier from trait count
    ├── wallet.js       MetaMask / EIP-1193 wallet connection
    ├── verify.js       Ownership proof generation
    ├── sound.js        Audio playback
    ├── storage.js      localStorage wrappers
    └── shareImage.js   html2canvas share card generation
```

The frontend degrades gracefully: if the backend is unreachable it falls back to demo data and client-side Soul logic, so the full UI is explorable without a running backend.

---

## Backend

Built with FastAPI and Uvicorn. All Soul state is held in memory per session — no database is required for the current version.

```
backend/app/
├── main.py             FastAPI app entry point, CORS config
├── api/
│   ├── routes.py       All API endpoints
│   └── verify_routes.py  Ownership verification endpoint
├── schemas/
│   └── soul.py         Pydantic models (Soul, Memory, SoulStats, Trait)
├── services/
│   ├── soul_engine.py      Archetype resolution, stat math
│   ├── arena_engine.py     Battle power calculation
│   ├── battle_engine.py    Combat resolution logic
│   ├── evolution_engine.py Archetype shift detection
│   ├── quest_engine.py     Daily quest selection and evaluation
│   ├── rival_engine.py     Rival Soul management
│   ├── memory_engine.py    Importance scoring and summarization
│   ├── retention_engine.py Streak tracking, achievement logic
│   ├── chog_reader.py      Monad RPC: fetch NFT metadata
│   ├── chog_token_reader.py $CHOG token balance and XP bonus
│   ├── rarity_engine.py    Rarity tier from trait count
│   ├── image_proxy.py      IPFS image fetch and local cache
│   └── verification.py     EIP-712 signature validation
└── data/
    ├── demo_chogs.py   Pre-built demo Chog definitions
    ├── quests.py       Weekly quest scenarios
    └── rivals.py       9 rival Soul definitions
```

---

## Data Flow: Chat

```
User types message
      │
      ▼
api.js  →  POST /api/soul/chat  (message + soul state)
                    │
                    ▼
            memory_engine: retrieve relevant past memories
                    │
                    ▼
            Alibaba Qwen: generate in-character reply
                    │
                    ▼
            memory_engine: score and store new memory
                    │
                    ▼
            Return { reply, soul, memory_created }
                    │
                    ▼
        useSoul: save updated soul to localStorage
```

---

## Data Flow: Arena Battle

```
User clicks START BATTLE
        │
        ▼
api.js  →  POST /api/arena/battle  (soul + rival_id)
                    │
                    ▼
            arena_engine: calculate player power from stats
                    │
                    ▼
            rival_engine: load rival and calculate rival power
                    │
                    ▼
            battle_engine: resolve winner (weighted random)
                    │
                    ▼
            Alibaba Qwen: generate battle narrative + rival reaction
                    │
                    ▼
            evolution_engine: check for archetype shift
                    │
                    ▼
            Return { winner, narrative, rival_reaction, soul, xp, level_up }
```

---

## On-Chain Layer

Blockchain is used only where it adds verifiable value:

| Used on-chain | Kept off-chain |
| --- | --- |
| Chog NFT ownership verification | Conversation history |
| NFT metadata and traits | Memory summaries |
| $CHOG token balance (XP bonus) | Game state and stats |
| Selected achievement anchors (roadmap) | Battle logs |

This keeps transaction costs near zero for the current version while leaving a clear upgrade path to on-chain persistence.

---

## Persistence Model

The current version is intentionally stateless on the server:

- **Frontend:** Soul state, memories, and streak data live in `localStorage` under `chog_soul_data`.
- **Backend:** Soul state passed in each request, not stored between calls.
- **Future:** A Postgres or Redis layer can be added behind the existing API contract without frontend changes. See `database/README.md`.
