# backend/app/data/quests.py
"""
Weekly quest rotation — one scenario per day.
Days: 0=Monday, 1=Tuesday, ..., 6=Sunday
"""

WEEKLY_QUESTS = [
    # Day 0 — Monday
    {
        "id": "bobs_package",
        "day": "MONDAY",
        "title": "Bob's Package",
        "scenario": "Bob asks Giga to hide a suspicious package.",
        "description": "You don't know what's inside. Bob says he'll owe you one. Giga is waiting for your decision.",
        "choices": [
            {"label": "HELP", "value": "help", "hint": "Protect Bob"},
            {"label": "STEAL IT", "value": "steal it", "hint": "Embrace chaos"},
            {"label": "WALK AWAY", "value": "walk away", "hint": "Choose survival"},
            {"label": "CONFRONT", "value": "confront", "hint": "Demand the truth"},
        ],
    },
    # Day 1 — Tuesday
    {
        "id": "strangers_coin",
        "day": "TUESDAY",
        "title": "The Stranger's Coin",
        "scenario": "A stranger on the street asks Giga for money.",
        "description": "She claims she's lost everything. Her eyes are tired but honest. Giga has 100 tokens — not much, but everything.",
        "choices": [
            {"label": "GIVE ALL", "value": "help", "hint": "Trust her story"},
            {"label": "GIVE SOME", "value": "steal it", "hint": "Split the risk"},
            {"label": "REFUSE", "value": "walk away", "hint": "Protect yourself"},
            {"label": "QUESTION HER", "value": "confront", "hint": "Verify first"},
        ],
    },
    # Day 2 — Wednesday
    {
        "id": "old_friend",
        "day": "WEDNESDAY",
        "title": "The Old Friend",
        "scenario": "A childhood friend returns, asking for a favor with no details.",
        "description": "You haven't spoken in years. He says he needs help — no questions asked. The kind of help that could cost Giga everything.",
        "choices": [
            {"label": "HELP", "value": "help", "hint": "Old loyalties"},
            {"label": "STEAL IT", "value": "steal it", "hint": "Take advantage"},
            {"label": "WALK AWAY", "value": "walk away", "hint": "Let him be"},
            {"label": "CONFRONT", "value": "confront", "hint": "Demand details"},
        ],
    },
    # Day 3 — Thursday
    {
        "id": "rivals_deal",
        "day": "THURSDAY",
        "title": "The Rival's Deal",
        "scenario": "NOVA offers Giga a deal that could end their rivalry.",
        "description": "NOVA is tired of fighting. She proposes a truce. But trusting a rival is a gamble Giga might regret.",
        "choices": [
            {"label": "ACCEPT", "value": "help", "hint": "Make peace"},
            {"label": "STEAL IT", "value": "steal it", "hint": "Take her edge"},
            {"label": "REFUSE", "value": "walk away", "hint": "Stay rivals"},
            {"label": "CONFRONT", "value": "confront", "hint": "Test her honesty"},
        ],
    },
    # Day 4 — Friday
    {
        "id": "lost_wallet",
        "day": "FRIDAY",
        "title": "The Lost Wallet",
        "scenario": "Giga finds a wallet on the street.",
        "description": "Inside is 5,000 tokens and an ID. The owner is nowhere. No cameras. No witnesses. Just a decision.",
        "choices": [
            {"label": "RETURN IT", "value": "help", "hint": "Do what's right"},
            {"label": "KEEP IT", "value": "steal it", "hint": "Finders keepers"},
            {"label": "WALK AWAY", "value": "walk away", "hint": "Not your problem"},
            {"label": "CONFRONT", "value": "confront", "hint": "Find the owner"},
        ],
    },
    # Day 5 — Saturday
    {
        "id": "the_liar",
        "day": "SATURDAY",
        "title": "The Liar's Request",
        "scenario": "Someone asks Giga to lie on their behalf.",
        "description": "They swear it's a small lie. Nothing harmful. But lies have a way of growing.",
        "choices": [
            {"label": "TELL IT", "value": "help", "hint": "Protect them"},
            {"label": "USE IT", "value": "steal it", "hint": "Leverage the truth"},
            {"label": "REFUSE", "value": "walk away", "hint": "Stay honest"},
            {"label": "CONFRONT", "value": "confront", "hint": "Why lie at all?"},
        ],
    },
    # Day 6 — Sunday
    {
        "id": "the_test",
        "day": "SUNDAY",
        "title": "The Final Test",
        "scenario": "A mysterious figure offers Giga power — at a price.",
        "description": "Power beyond measure. But the price is another memory. One that means something. One that Giga would miss.",
        "choices": [
            {"label": "ACCEPT", "value": "steal it", "hint": "Take the power"},
            {"label": "REFUSE", "value": "help", "hint": "Keep the memory"},
            {"label": "WALK AWAY", "value": "walk away", "hint": "Too risky"},
            {"label": "CONFRONT", "value": "confront", "hint": "Question the offer"},
        ],
    },
]