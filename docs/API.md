# CHOG SOULS API Reference

Base URL: `http://127.0.0.1:8000/api`

All request and response bodies are JSON. The backend holds Soul state in memory per session — no database is required.

---

## Health

### `GET /health`

Returns service status.

**Response**

```json
{
  "ok": true,
  "service": "chog-souls-api"
}
```

---

## Soul

### `GET /soul/demo`

Returns a fresh demo Soul (Chog #1777, "Giga"). Use this to start a session without a wallet.

---

### `POST /soul/chat`

Send a message to the active Soul. The AI responds in character based on the Soul's personality, stats, and memory history. A memory may be created if the exchange is significant.

**Request**

```json
{
  "message": "Do you trust Bob?"
}
```

**Response**

```json
{
  "reply": "Trust is expensive. I forgive mistakes, but I remember patterns.",
  "soul": { ... },
  "memory_created": true
}
```

---

### `POST /soul/choice`

Submit a quest choice. The Soul's stats shift based on the decision, XP is awarded, and a memory is created.

**Request**

```json
{
  "action": "confront"
}
```

**Available actions**

| Action | Alignment |
| --- | --- |
| `help` | Loyal |
| `steal` | Greedy |
| `leave` | Neutral |
| `confront` | Courageous |

**Response**

```json
{
  "soul": { ... },
  "narrative": "You stepped forward without hesitation...",
  "stat_changes": { "courage": 3, "loyalty": -1 },
  "memory_created": true,
  "xp_awarded": 12,
  "level_up": { "leveled_up": false }
}
```

---

### `POST /soul/daily-check`

Record a daily visit for streak tracking. Call once per session.

**Request**

```json
{
  "soul_id": "demo"
}
```

**Response**

```json
{
  "soul": { ... },
  "streak_day": 3,
  "streak_reward": "XP +15",
  "new_achievements": []
}
```

---

### `POST /soul/import`

Import a Chog NFT by token ID. Fetches on-chain metadata from Monad Mainnet, decodes traits, and creates a Soul.

**Request**

```json
{
  "token_id": 420,
  "wallet_address": "0xYourAddress"
}
```

**Response**

```json
{
  "soul": { ... },
  "is_new": true
}
```

---

## Arena

### `POST /arena/battle`

Run a battle between the active Soul and a chosen rival. Combat is stat-weighted with an AI-generated narrative.

**Request**

```json
{
  "rival_id": "nova"
}
```

**Response**

```json
{
  "winner": "player",
  "player_power": 74,
  "rival_power": 61,
  "narrative": "NOVA launched first but Giga absorbed the blow...",
  "rival_reaction": "You got lucky. Next time I won't hold back.",
  "soul": { ... },
  "xp_awarded": 20,
  "level_up": { "leveled_up": true, "new_level": 3 }
}
```

---

## Leaderboard

### `GET /leaderboard`

Returns the 9 rival Souls plus a placeholder slot for the player, ordered by power score.

**Response**

```json
{
  "rivals": [
    {
      "id": "nova",
      "name": "NOVA",
      "archetype": "The Ruthless Strategist",
      "level": 7,
      "power": 81,
      "imageUrl": "..."
    }
  ]
}
```

---

## Chog NFT

### `GET /chog/{token_id}`

Fetch raw on-chain metadata and decoded traits for a given Chog token ID.

**Response**

```json
{
  "token_id": 420,
  "name": "Chog #420",
  "image_url": "https://...",
  "traits": [
    { "trait_type": "Background", "value": "Neon Purple" }
  ],
  "rarity_tier": "RARE"
}
```

---

## Image Proxy

### `GET /image/{token_id}`

Returns the Chog image, fetching from IPFS and caching locally. Use this instead of hitting IPFS directly from the frontend to avoid gateway rate limits.

---

## Verification

### `POST /verify`

Verify wallet ownership of a Chog via a signed message proof.

**Request**

```json
{
  "wallet_address": "0xYourAddress",
  "token_id": 420,
  "signature": "0x...",
  "message": "Verify Chog #420 ownership"
}
```

**Response**

```json
{
  "verified": true
}
```
