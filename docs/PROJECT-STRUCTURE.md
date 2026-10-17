# CHOG SOULS Project Structure

```text
chog-souls/
│
├── backend/
│   │
│   ├── app/
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── routes.py
│   │   │
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   └── soul.py
│   │   │
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   └── soul_engine.py
│   │   │
│   │   ├── __init__.py
│   │   └── main.py
│   │
│   ├── tests/
│   │   └── test_api.py
│   │
│   ├── requirements.txt
│   └── README.md
│
├── contracts/
│   └── README.md
│
├── database/
│   └── README.md
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DEMO-SCRIPT.md
│   ├── PROJECT-STRUCTURE.md
│   └── ROADMAP.md
│
├── public/
│
├── src/
│   │
│   ├── components/
│   ├── lib/
│   │   ├── api.js
│   │   ├── soulEngine.js
│   │   ├── storage.js
│   │   └── wallet.js
│   │
│   ├── pages/
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
│
├── .env
├── .gitignore
├── index.html
├── package.json
└── vite.config.js

                    USER
                      │
                      ▼
              ┌───────────────┐
              │ React / Vite  │
              │   Frontend    │
              └───────┬───────┘
                      │
          ┌───────────┼───────────┐
          │           │           │
          ▼           ▼           ▼
       Wallet       Soul        Arena
       Connect      Chat        UI
          │           │           │
          └───────────┼───────────┘
                      │
                      ▼
              ┌───────────────┐
              │    FastAPI    │
              │    Backend    │
              └───────┬───────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
   Soul Engine     Memory       Arena Engine
        │             │             │
        └─────────────┼─────────────┘
                      │
                      ▼
               Future Database
                      │
                      ▼
                Monad / Chog

                
