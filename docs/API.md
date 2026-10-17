# CHOG SOULS API

Base URL:

<http://127.0.0.1:8000/api>

---

## Health

GET

/api/health

Example:

```json
{
  "ok": true,
  "service": "chog-souls-api"
}

Demo Soul
GET
/api/soul/demo
Returns the current demo Soul.
Chat
POST
/api/soul/chat
Request:

{
  "message": "Do you trust Bob?"
}

Response:

{
  "reply": "Trust is expensive. I forgive mistakes, but I remember patterns.",
  "memory_created": true
}

Choice
POST
/api/soul/choice
Request:
{
  "action": "confront"
}

Available actions:
- help
- steal
- leave
- confront
The Soul's stats change according to the decision.

POST
/api/arena/battle
The backend generates a battle using Soul stats.
The result contains:
- winner
- Soul power
- opponent power
- battle narrative
- memory creation
