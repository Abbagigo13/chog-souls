# CHOG SOULS Project Structure

```
chog-souls/
│
├── backend/                    FastAPI backend (Python)
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes.py           All REST endpoints
│   │   │   └── verify_routes.py    Wallet ownership verification
│   │   ├── data/
│   │   │   ├── demo_chogs.py       Pre-built demo Chog definitions
│   │   │   ├── quests.py           7 weekly quest scenarios
│   │   │   └── rivals.py           9 rival Soul definitions
│   │   ├── schemas/
│   │   │   └── soul.py             Pydantic models: Soul, Memory, SoulStats, Trait
│   │   ├── services/
│   │   │   ├── soul_engine.py          Archetype resolution and stat math
│   │   │   ├── arena_engine.py         Battle power calculation
│   │   │   ├── battle_engine.py        Combat resolution
│   │   │   ├── evolution_engine.py     Archetype shift detection
│   │   │   ├── quest_engine.py         Daily quest selection and evaluation
│   │   │   ├── rival_engine.py         Rival Soul management
│   │   │   ├── memory_engine.py        Importance scoring and summarization
│   │   │   ├── retention_engine.py     Streaks and achievements
│   │   │   ├── chog_reader.py          Monad RPC — fetch NFT metadata
│   │   │   ├── chog_token_reader.py    $CHOG token balance and XP bonus
│   │   │   ├── rarity_engine.py        Rarity tier from trait count
│   │   │   ├── image_proxy.py          IPFS image fetch and local file cache
│   │   │   └── verification.py         EIP-712 signature validation
│   │   └── main.py                 FastAPI app entry point and CORS config
│   ├── image_cache/                Cached Chog images (served by image proxy)
│   ├── tests/
│   │   └── test_api.py             Backend API tests
│   ├── .env.example                Backend environment variable template
│   ├── requirements.txt            Python dependencies
│   └── README.md                   Backend setup guide
│
├── contracts/
│   └── README.md                   Notes on Chog NFT contracts and future on-chain work
│
├── database/
│   └── README.md                   Notes on adding a persistence layer
│
├── docs/
│   ├── API.md                      Full API reference
│   ├── ARCHITECTURE.md             System design and data flows
│   ├── DEMO-SCRIPT.md              Timed 3-minute judge demo script
│   ├── PROJECT-STRUCTURE.md        This file
│   └── ROADMAP.md                  Phase-by-phase feature plan
│
├── public/
│   ├── favicon.webp
│   └── sounds/                     Sound effects (arena win/lose, chat, evolution, level-up)
│
├── src/                            React frontend
│   ├── components/
│   │   ├── Avatar.jsx              Chog image with IPFS gateway fallback
│   │   ├── BottomNav.jsx           Mobile navigation bar
│   │   ├── ChatPanel.jsx           Chat message list and input
│   │   ├── MemoryCard.jsx          Single memory display
│   │   ├── Onboarding.jsx          First-visit walkthrough
│   │   ├── ProgressBar.jsx         XP / stat progress bar
│   │   ├── ShareCard.jsx           Soul share card (html2canvas export)
│   │   ├── StatBar.jsx             Individual stat bar
│   │   └── TopBar.jsx              App header with mute and wallet controls
│   ├── data/
│   │   ├── demoChogs.js            Demo Chog definitions (frontend copy)
│   │   ├── demoSoul.js             Single demo Soul definition
│   │   └── demoSouls.js            Multiple demo Souls for the leaderboard
│   ├── hooks/
│   │   └── useSoul.js              Soul state hook (load, save, update via localStorage)
│   ├── lib/
│   │   ├── api.js                  All backend fetch calls
│   │   ├── chogContract.js         Read Chog NFT metadata from Monad
│   │   ├── chogImage.js            Resolve Chog image URLs (IPFS + HTTP)
│   │   ├── memory.js               Client-side memory helpers
│   │   ├── perks.js                Streak and achievement perk definitions
│   │   ├── rarity.js               Rarity tier from trait count
│   │   ├── shareImage.js           html2canvas share card generation
│   │   ├── soulEngine.js           Client-side archetype and stat logic
│   │   ├── sound.js                Audio playback with mute support
│   │   ├── storage.js              localStorage wrappers
│   │   ├── traitDecoder.js         Map raw NFT trait strings to Soul stat weights
│   │   ├── verify.js               Wallet signature / ownership proof
│   │   └── wallet.js               MetaMask / EIP-1193 connection
│   ├── pages/
│   │   ├── Achievements.jsx        Milestone tracker
│   │   ├── Arena.jsx               Battle screen
│   │   ├── CHOG.jsx                Raw Chog traits and token info
│   │   ├── Dashboard.jsx           Soul overview (stats, archetype, streak)
│   │   ├── Import.jsx              Import a real Chog or load a demo
│   │   ├── Landing.jsx             Entry screen
│   │   ├── Leaderboard.jsx         9 rivals + player rank
│   │   ├── Quest.jsx               Daily moral dilemma
│   │   ├── SoulProfile.jsx         Rival Soul detail view
│   │   ├── Talk.jsx                AI chat interface
│   │   └── Timeline.jsx            Memory history
│   ├── App.jsx                     Root component and page router
│   ├── main.jsx                    React entry point
│   └── styles.css                  Global styles (Monad dark theme)
│
├── .env.example                    Frontend environment variable template
├── .gitignore
├── DEMO.md                         Quick-start demo guide
├── index.html                      Vite HTML entry point
├── package.json
├── vite.config.js
└── README.md
```
