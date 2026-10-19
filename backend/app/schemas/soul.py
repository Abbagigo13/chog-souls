# backend/app/schemas/soul.py
from pydantic import BaseModel
from typing import List

class Memory(BaseModel):
    id: str
    title: str
    text: str
    importance: int
    timestamp: str
    faded: bool = False

class SoulStats(BaseModel):
    courage: int = 50
    loyalty: int = 50
    intelligence: int = 50
    greed: int = 50

class Trait(BaseModel):
    name: str
    value: str

class Soul(BaseModel):
    id: str
    name: str
    archetype: str
    mood: str
    traits: List[Trait]
    stats: SoulStats
    level: int = 1
    xp: int = 0
    xp_to_next_level: int = 100
    memories: List[Memory] = []

    # --- Retention ---
    streak: int = 0
    last_visit_date: str = ""
    total_visits: int = 0

    # --- Daily Quest ---
    last_quest_date: str = ""
    last_quest_id: str = ""

    # --- Achievements ---
    achievements: List[str] = []

    # --- Stats for milestone tracking ---
    battles_won: int = 0
    battles_lost: int = 0
    quests_completed: int = 0
    evolutions_count: int = 0

    # --- Arena win tracking ---
    win_streak: int = 0
    last_win_date: str = ""

    # --- Real Chog binding ---
    is_demo: bool = False
    token_id: int = 0
    image_url: str = ""