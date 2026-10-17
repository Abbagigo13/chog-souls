# CHOG SOULS Architecture

## MVP

```text
React/Vite App
├─ Demo Chog identity
├─ Local Soul Engine
├─ localStorage persistence
├─ Wallet connector
├─ Chat
├─ Quest
├─ Arena
└─ Timeline
```

## Production evolution

```text
Wallet
  ↓
Ownership verification
  ↓
Real Chog NFT metadata
  ↓
Trait decoder
  ↓
Soul state
  ↓
Memory engine
  ↓
AI provider adapter
  ↓
Quest / Relationship / Arena
  ↓
Soul timeline
```

## Keep costs near zero

Use blockchain only where blockchain matters:

- NFT ownership
- NFT identity
- verified traits
- selected achievements

Keep the following off-chain:

- conversation history
- memory summaries
- temporary game state
- relationship state
- battle logs

This prevents unnecessary transaction costs.

## Future backend

A small FastAPI or serverless backend can later handle:

- wallet signature verification
- Chog ownership verification
- AI calls
- memory retrieval
- abuse/rate limiting
