# backend/app/data/demo_chogs.py
"""
Pre-built demo Chogs for the "Try a Demo Chog" button.
Each one mirrors a realistic Chog Genesis NFT with its traits and stats.
"""

DEMO_CHOGS = [
    {
        "tokenId": 42,
        "name": "Chog #42",
        "imageUrl": "/chogs/rival-1.svg",
        "traits": [
            {"name": "Tier", "value": "1"},
            {"name": "Eyes", "value": "Laser"},
            {"name": "Aura", "value": "Shadow"},
            {"name": "Fur", "value": "Obsidian"},
            {"name": "Spirit", "value": "Ruthless"},
        ],
        "stats": {"courage": 88, "loyalty": 42, "intelligence": 91, "greed": 84},
    },
    {
        "tokenId": 112,
        "name": "Chog #112",
        "imageUrl": "/chogs/rival-4.svg",
        "traits": [
            {"name": "Tier", "value": "3"},
            {"name": "Eyes", "value": "Blaze"},
            {"name": "Aura", "value": "Radiant"},
            {"name": "Fur", "value": "Solar"},
            {"name": "Spirit", "value": "Loyal"},
        ],
        "stats": {"courage": 90, "loyalty": 94, "intelligence": 68, "greed": 22},
    },
    {
        "tokenId": 556,
        "name": "Chog #556",
        "imageUrl": "/chogs/rival-6.svg",
        "traits": [
            {"name": "Tier", "value": "2"},
            {"name": "Eyes", "value": "Void"},
            {"name": "Aura", "value": "Toxic"},
            {"name": "Fur", "value": "Rust"},
            {"name": "Spirit", "value": "Ruthless"},
        ],
        "stats": {"courage": 60, "loyalty": 32, "intelligence": 82, "greed": 88},
    },
    {
        "tokenId": 1033,
        "name": "Chog #1033",
        "imageUrl": "/chogs/rival-3.svg",
        "traits": [
            {"name": "Tier", "value": "2"},
            {"name": "Eyes", "value": "Blaze"},
            {"name": "Aura", "value": "Electric"},
            {"name": "Fur", "value": "Midnight"},
            {"name": "Spirit", "value": "Loyal"},
        ],
        "stats": {"courage": 78, "loyalty": 82, "intelligence": 74, "greed": 48},
    },
    {
        "tokenId": 1777,
        "name": "Chog #1777",
        "imageUrl": "/chogs/rival-7.svg",
        "traits": [
            {"name": "Tier", "value": "1"},
            {"name": "Eyes", "value": "Prism"},
            {"name": "Aura", "value": "Radiant"},
            {"name": "Fur", "value": "Solar"},
            {"name": "Spirit", "value": "Serene"},
        ],
        "stats": {"courage": 72, "loyalty": 88, "intelligence": 96, "greed": 18},
    },
    {
        "tokenId": 3100,
        "name": "Chog #3100",
        "imageUrl": "/chogs/rival-8.svg",
        "traits": [
            {"name": "Tier", "value": "3"},
            {"name": "Eyes", "value": "Laser"},
            {"name": "Aura", "value": "Fire"},
            {"name": "Fur", "value": "Rust"},
            {"name": "Spirit", "value": "Fierce"},
        ],
        "stats": {"courage": 96, "loyalty": 52, "intelligence": 48, "greed": 60},
    },
]