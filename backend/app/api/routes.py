# backend/app/api/routes.py
import os
import random
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
import uuid
from openai import OpenAI

from ..schemas.soul import Soul, Memory, SoulStats, Trait
from ..services.soul_engine import SoulEngine
from ..services.arena_engine import ArenaEngine
from ..services.evolution_engine import EvolutionEngine
from ..services.quest_engine import QuestEngine
from ..services.rival_engine import RivalEngine
from ..services.chog_reader import ChogReader
from ..services.chog_token_reader import ChogTokenReader
from ..services.memory_engine import MemoryEngine
from ..services.retention_engine import RetentionEngine, ACHIEVEMENTS
from ..data.quests import WEEKLY_QUESTS
from ..data.demo_chogs import DEMO_CHOGS
from ..data.rivals import RIVALS

router = APIRouter()

# --- Narrative AI Client ---
client = OpenAI(
    api_key=os.getenv("AI_API_KEY"),
    base_url=os.getenv("AI_BASE_URL", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"),
)
MODEL_NAME = os.getenv("AI_MODEL", "qwen-max")


# --- Helpers ---

def check_level_up(soul: Soul) -> dict:
    leveled_up = False
    old_level = soul.level
    xp_before = soul.xp

    while soul.xp >= soul.xp_to_next_level:
        soul.xp -= soul.xp_to_next_level
        soul.level += 1
        leveled_up = True

        soul.stats.courage = min(100, soul.stats.courage + random.randint(1, 3))
        soul.stats.loyalty = min(100, soul.stats.loyalty + random.randint(1, 3))
        soul.stats.intelligence = min(100, soul.stats.intelligence + random.randint(1, 3))
        soul.stats.greed = min(100, soul.stats.greed + random.randint(1, 3))

        soul.xp_to_next_level = int(soul.xp_to_next_level * 1.1)

    if leveled_up:
        soul.mood = "Ascended"

    return {
        "leveled_up": leveled_up,
        "old_level": old_level,
        "new_level": soul.level,
        "xp_before": xp_before,
        "xp_after": soul.xp,
    }


def apply_xp_reward(soul: Soul, base_xp: int) -> int:
    multiplier = 0.5 if soul.is_demo else 1.0
    actual = max(1, int(base_xp * multiplier))
    soul.xp += actual
    return actual


def mark_faded_memories(soul: Soul) -> None:
    for memory in soul.memories:
        memory.faded = memory.importance < 10


# --- The demo Soul (a fresh copy every time; nothing is stored on the server) ---
DEMO_SOUL_ID = "demo"


def make_demo_soul() -> Soul:
    return Soul(
        id=DEMO_SOUL_ID,
        name="Giga",
        archetype="The Loyal Trickster",
        mood="Curious",
        traits=[
            Trait(name="Fur", value="Midnight"),
            Trait(name="Eyes", value="Laser"),
            Trait(name="Spirit", value="Loyal"),
            Trait(name="Aura", value="Electric"),
        ],
        stats=SoulStats(courage=72, loyalty=86, intelligence=78, greed=42),
        level=4,
        xp=68,
        xp_to_next_level=100,
        memories=[
            Memory(
                id=str(uuid.uuid4()),
                title="Soul awakened",
                text="Giga woke up with a strong loyalty signature.",
                importance=88,
                timestamp=datetime.now().isoformat(),
                faded=False,
            )
        ],
        is_demo=True,
        image_url="/chogs/demo.svg",
    )


def resolve_soul(provided: Optional[Soul]) -> Soul:
    """
    The browser sends the Soul it is playing with. If an old client sends
    nothing, fall back to a fresh demo Soul instead of shared server state.
    """
    return provided if provided is not None else make_demo_soul()


# --- Request Schemas ---
class SoulOnlyRequest(BaseModel):
    soul: Optional[Soul] = None

class ChatRequest(BaseModel):
    message: str
    soul: Optional[Soul] = None

class ChoiceRequest(BaseModel):
    action: str
    soul: Optional[Soul] = None

class ImportChogRequest(BaseModel):
    address: str

class TokenBalanceRequest(BaseModel):
    address: str


# --- Endpoints ---

@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "CHOG SOULS API"}


@router.get("/soul/demo")
async def get_demo_soul():
    soul = make_demo_soul()
    mark_faded_memories(soul)
    return soul


@router.post("/soul/daily")
async def daily_check(request: Optional[SoulOnlyRequest] = None):
    soul = resolve_soul(request.soul if request else None)

    visit_result = RetentionEngine.check_daily_visit(soul)
    level_info = check_level_up(soul)
    newly_unlocked = RetentionEngine.check_achievements(soul)

    mark_faded_memories(soul)

    return {
        "soul": soul,
        "visit": visit_result,
        "level_info": level_info,
        "achievements_unlocked": newly_unlocked,
    }


def build_today_quest(soul: Soul) -> dict:
    today = datetime.now()
    today_str = today.date().isoformat()
    weekday = today.weekday()

    quest = WEEKLY_QUESTS[weekday]
    completed_today = soul.last_quest_date == today_str

    return {
        "quest": quest,
        "completed": completed_today,
        "completed_quest_id": soul.last_quest_id if completed_today else "",
        "weekday": today.strftime("%A").upper(),
    }


@router.get("/soul/quest/today")
async def get_today_quest():
    return build_today_quest(make_demo_soul())


@router.post("/soul/quest/today")
async def post_today_quest(request: Optional[SoulOnlyRequest] = None):
    soul = resolve_soul(request.soul if request else None)
    return build_today_quest(soul)


def build_achievements(soul: Soul) -> dict:
    statuses = RetentionEngine.get_all_achievements_status(soul)

    unlocked_count = sum(1 for s in statuses if s["unlocked"])
    total_count = len(statuses)

    return {
        "achievements": statuses,
        "unlocked_count": unlocked_count,
        "total_count": total_count,
    }


@router.get("/soul/achievements")
async def get_achievements():
    return build_achievements(make_demo_soul())


@router.post("/soul/achievements")
async def post_achievements(request: Optional[SoulOnlyRequest] = None):
    soul = resolve_soul(request.soul if request else None)
    return build_achievements(soul)


@router.post("/soul/chat")
async def chat_with_soul(request: ChatRequest):
    soul = resolve_soul(request.soul)

    ai_response = SoulEngine.chat(soul, request.message)

    if ai_response.get("stat_changes"):
        for stat, change in ai_response["stat_changes"].items():
            if hasattr(soul.stats, stat):
                current = getattr(soul.stats, stat)
                setattr(soul.stats, stat, max(0, min(100, current + change)))

    new_memory = None
    if ai_response.get("new_memory_text"):
        stat_changes = ai_response.get("stat_changes", {})
        importance = MemoryEngine.score_importance(
            memory_text=ai_response["new_memory_text"],
            memory_title=ai_response.get("new_memory_title", "A conversation"),
            stat_changes=stat_changes,
            base_importance=ai_response.get("memory_importance", 50),
            is_event=False,
        )

        new_memory = Memory(
            id=str(uuid.uuid4()),
            title=ai_response.get("new_memory_title", "A conversation"),
            text=ai_response["new_memory_text"],
            importance=importance,
            timestamp=datetime.now().isoformat(),
            faded=False,
        )
        soul.memories.append(new_memory)
        await MemoryEngine.summarize_old_memories(soul)

    apply_xp_reward(soul, 5)
    level_info = check_level_up(soul)

    if level_info["leveled_up"]:
        level_memory = Memory(
            id=str(uuid.uuid4()),
            title=f"Reached Level {level_info['new_level']}",
            text=f"{soul.name} evolved into Level {level_info['new_level']} through conversation.",
            importance=90,
            timestamp=datetime.now().isoformat(),
            faded=False,
        )
        soul.memories.append(level_memory)

    evolution_info = EvolutionEngine.check_evolution(soul)

    if evolution_info["evolved"]:
        evolution_memory = Memory(
            id=str(uuid.uuid4()),
            title=f"Transformed: {evolution_info['new_archetype']}",
            text=f"{soul.name}'s nature shifted from {evolution_info['old_archetype']} to {evolution_info['new_archetype']}.",
            importance=95,
            timestamp=datetime.now().isoformat(),
            faded=False,
        )
        soul.memories.append(evolution_memory)
        soul.evolutions_count += 1

    newly_unlocked = RetentionEngine.check_achievements(soul)

    mark_faded_memories(soul)

    return {
        "reply": ai_response["reply"],
        "soul": soul,
        "new_memory": new_memory,
        "level_info": level_info,
        "evolution_info": evolution_info,
        "achievements_unlocked": newly_unlocked,
    }


@router.post("/soul/choice")
async def make_choice(request: ChoiceRequest):
    soul = resolve_soul(request.soul)
    action = request.action.lower()

    today_str = datetime.now().date().isoformat()
    if soul.last_quest_date == today_str:
        raise HTTPException(
            status_code=429,
            detail="You've already made today's choice. Come back tomorrow.",
        )

    weekday = datetime.now().weekday()
    quest = WEEKLY_QUESTS[weekday]

    quest_result = QuestEngine.process_choice(soul, action, quest)

    stat_changes_applied = {}
    if quest_result.get("stat_changes"):
        for stat, change in quest_result["stat_changes"].items():
            if hasattr(soul.stats, stat) and isinstance(change, (int, float)):
                current = getattr(soul.stats, stat)
                new_value = max(0, min(100, current + int(change)))
                setattr(soul.stats, stat, new_value)
                stat_changes_applied[stat] = int(change)

    if quest_result.get("mood_change"):
        soul.mood = quest_result["mood_change"]

    importance = MemoryEngine.score_importance(
        memory_text=quest_result.get("memory_text", f"{soul.name} chose to {action}."),
        memory_title=quest_result.get("memory_title", "A choice was made"),
        stat_changes=stat_changes_applied,
        base_importance=quest_result.get("memory_importance", 60),
        is_event=False,
    )

    new_memory = Memory(
        id=str(uuid.uuid4()),
        title=quest_result.get("memory_title", "A choice was made"),
        text=quest_result.get("memory_text", f"{soul.name} chose to {action}."),
        importance=importance,
        timestamp=datetime.now().isoformat(),
        faded=False,
    )
    soul.memories.append(new_memory)
    await MemoryEngine.summarize_old_memories(soul)

    apply_xp_reward(soul, 20)
    level_info = check_level_up(soul)

    if level_info["leveled_up"]:
        level_memory = Memory(
            id=str(uuid.uuid4()),
            title=f"Reached Level {level_info['new_level']}",
            text=f"{soul.name} grew stronger through making hard choices.",
            importance=90,
            timestamp=datetime.now().isoformat(),
            faded=False,
        )
        soul.memories.append(level_memory)

    evolution_info = EvolutionEngine.check_evolution(soul)

    if evolution_info["evolved"]:
        evolution_memory = Memory(
            id=str(uuid.uuid4()),
            title=f"Transformed: {evolution_info['new_archetype']}",
            text=f"{soul.name}'s nature shifted from {evolution_info['old_archetype']} to {evolution_info['new_archetype']}.",
            importance=95,
            timestamp=datetime.now().isoformat(),
            faded=False,
        )
        soul.memories.append(evolution_memory)
        soul.evolutions_count += 1

    soul.quests_completed += 1
    soul.last_quest_date = today_str
    soul.last_quest_id = quest["id"]

    newly_unlocked = RetentionEngine.check_achievements(soul)

    mark_faded_memories(soul)

    return {
        "soul": soul,
        "new_memory": new_memory,
        "narrative": quest_result.get("narrative", ""),
        "stat_changes": stat_changes_applied,
        "level_info": level_info,
        "evolution_info": evolution_info,
        "achievements_unlocked": newly_unlocked,
        "quest_id": quest["id"],
        "quest_title": quest["title"],
    }


# --- Arena: Random Rival + Taunt ---

async def build_random_rival(soul: Soul) -> dict:
    rival = random.choice(RIVALS)
    taunt = await RivalEngine.generate_taunt(soul, rival)

    return {
        "rival": {
            "id": rival["id"],
            "name": rival["name"],
            "archetype": rival["archetype"],
            "imageUrl": rival["imageUrl"],
            "level": rival["level"],
            "stats": rival["stats"],
            "relationship": rival.get("relationship", "rival"),
        },
        "taunt": taunt,
    }


@router.get("/arena/rival/random")
async def get_random_rival():
    """Returns a random rival with their pre-battle taunt (demo Soul)."""
    return await build_random_rival(make_demo_soul())


@router.post("/arena/rival/random")
async def post_random_rival(request: Optional[SoulOnlyRequest] = None):
    """Same, but the taunt is written for the Soul the browser sends."""
    soul = resolve_soul(request.soul if request else None)
    return await build_random_rival(soul)


# --- Arena: Battle with the specified rival ---

@router.post("/arena/battle/{rival_id}")
async def arena_battle(rival_id: str, request: Optional[SoulOnlyRequest] = None):
    soul = resolve_soul(request.soul if request else None)

    # Find the rival by id
    rival = next((r for r in RIVALS if r["id"] == rival_id), None)
    if not rival:
        raise HTTPException(status_code=404, detail="Rival not found")

    result = ArenaEngine.simulate_battle(soul, rival)

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {
                    "role": "system",
                    "content": "You are a dramatic fighting game announcer for the CHOG SOULS universe.",
                },
                {"role": "user", "content": result["prompt"]},
            ],
            temperature=0.8,
            max_tokens=150,
        )
        narrative = response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Narrative AI error: {e}")
        narrative = (
            f"{soul.name} "
            f"{'overpowered' if result['won'] else 'was defeated by'} "
            f"{rival['name']} in a fierce duel."
        )

    # Post-battle rival reaction
    post_battle_line = await RivalEngine.generate_post_battle_line(
        soul, rival, result["won"]
    )

    base_xp = 30 if result["won"] else 10
    xp_gained = apply_xp_reward(soul, base_xp)

    if result["won"]:
        soul.battles_won += 1
    else:
        soul.battles_lost += 1

    level_info = check_level_up(soul)

    if level_info["leveled_up"]:
        level_memory = Memory(
            id=str(uuid.uuid4()),
            title=f"Reached Level {level_info['new_level']}",
            text=f"{soul.name} ascended in the Arena through victory and combat.",
            importance=90,
            timestamp=datetime.now().isoformat(),
            faded=False,
        )
        soul.memories.append(level_memory)

    evolution_info = EvolutionEngine.check_evolution(soul)

    if evolution_info["evolved"]:
        evolution_memory = Memory(
            id=str(uuid.uuid4()),
            title=f"Transformed: {evolution_info['new_archetype']}",
            text=f"{soul.name}'s nature shifted from {evolution_info['old_archetype']} to {evolution_info['new_archetype']}.",
            importance=95,
            timestamp=datetime.now().isoformat(),
            faded=False,
        )
        soul.memories.append(evolution_memory)
        soul.evolutions_count += 1

    battle_importance = MemoryEngine.score_importance(
        memory_text=narrative[:200],
        memory_title=f"{'Victory' if result['won'] else 'Defeat'} vs {rival['name']}",
        stat_changes=None,
        base_importance=75 if result["won"] else 60,
        is_event=True,
    )

    new_memory = Memory(
        id=str(uuid.uuid4()),
        title=f"{'Victory' if result['won'] else 'Defeat'} vs {rival['name']}",
        text=narrative[:200],
        importance=battle_importance,
        timestamp=datetime.now().isoformat(),
        faded=False,
    )
    soul.memories.append(new_memory)
    await MemoryEngine.summarize_old_memories(soul)

    newly_unlocked = RetentionEngine.check_achievements(soul)

    mark_faded_memories(soul)

    return {
        "won": result["won"],
        "soul_power": result["soul_power"],
        "rival_power": result["nova_power"],
        "narrative": narrative,
        "post_battle_line": post_battle_line,
        "xp_gained": xp_gained,
        "base_xp": base_xp,
        "is_demo_penalty": soul.is_demo,
        "leveled_up": level_info["leveled_up"],
        "new_level": level_info["new_level"],
        "soul": soul,
        "evolution_info": evolution_info,
        "achievements_unlocked": newly_unlocked,
        "rival": rival,
    }


# --- Chog NFT Import ---

@router.post("/chog/import")
async def import_chog(request: ImportChogRequest):
    address = request.address.strip()

    if not address.startswith("0x") or len(address) != 42:
        raise HTTPException(status_code=400, detail="Invalid Ethereum address")

    result = await ChogReader.get_chog_stats(address)

    if not result:
        raise HTTPException(
            status_code=404,
            detail="No Chog found at that address, or metadata could not be fetched.",
        )

    return result


# --- $CHOG Token Balance ---

@router.post("/chog/token-balance")
async def chog_token_balance(request: TokenBalanceRequest):
    address = request.address.strip()
    if not address.startswith("0x") or len(address) != 42:
        raise HTTPException(status_code=400, detail="Invalid Ethereum address")

    result = await ChogTokenReader.get_balance(address)
    return result


# --- Demo Chog Pool ---

@router.get("/chog/demo-random")
async def get_random_demo_chog():
    chog = random.choice(DEMO_CHOGS)
    return chog