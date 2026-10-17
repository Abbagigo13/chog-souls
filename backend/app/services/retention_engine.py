# backend/app/services/retention_engine.py
from datetime import datetime, date
from ..schemas.soul import Soul, Memory


# --- Streak rewards by day ---
STREAK_REWARDS = {
    1: 25,
    2: 35,
    3: 50,
    4: 60,
    5: 75,
    6: 90,
    7: 150,   # weekly bonus
}
DEFAULT_STREAK_XP = 100


# --- Achievements with progress tracking ---
ACHIEVEMENTS = {
    "first_blood": {
        "title": "First Blood",
        "desc": "Won your first Arena battle.",
        "icon": "⚔️",
        "importance": 70,
        "progress_key": "battles_won",
        "progress_goal": 1,
    },
    "sage": {
        "title": "The Sage",
        "desc": "Reached Level 10.",
        "icon": "🧙",
        "importance": 90,
        "progress_key": "level",
        "progress_goal": 10,
    },
    "chameleon": {
        "title": "Chameleon",
        "desc": "Evolved your archetype 3 times.",
        "icon": "🎭",
        "importance": 85,
        "progress_key": "evolutions_count",
        "progress_goal": 3,
    },
    "veteran": {
        "title": "Veteran",
        "desc": "Won 10 Arena battles.",
        "icon": "🛡️",
        "importance": 80,
        "progress_key": "battles_won",
        "progress_goal": 10,
    },
    "streak_7": {
        "title": "Week Warrior",
        "desc": "Maintained a 7-day streak.",
        "icon": "🔥",
        "importance": 95,
        "progress_key": "streak",
        "progress_goal": 7,
    },
    "first_quest": {
        "title": "A Choice Made",
        "desc": "Completed your first Quest.",
        "icon": "🎯",
        "importance": 60,
        "progress_key": "quests_completed",
        "progress_goal": 1,
    },
    "collector": {
        "title": "Collector",
        "desc": "Amassed 25 memories.",
        "icon": "📜",
        "importance": 75,
        "progress_key": "memories_count",
        "progress_goal": 25,
    },
    "mythic": {
        "title": "Mythic Blood",
        "desc": "Reached Mythic rarity.",
        "icon": "💎",
        "importance": 100,
        "progress_key": "rarity_score",
        "progress_goal": 95,
    },
}


class RetentionEngine:

    @staticmethod
    def check_daily_visit(soul: Soul) -> dict:
        today = date.today().isoformat()
        last_visit = soul.last_visit_date or ""

        if last_visit == today:
            return {"rewarded": False, "xp": 0, "streak": soul.streak}

        try:
            last_date = date.fromisoformat(last_visit) if last_visit else None
        except ValueError:
            last_date = None

        yesterday = date.today().toordinal() - 1
        last_ordinal = last_date.toordinal() if last_date else 0

        if last_ordinal == yesterday:
            soul.streak += 1
        elif last_date is None:
            soul.streak = 1
        else:
            soul.streak = 1

        soul.last_visit_date = today
        soul.total_visits += 1

        xp_reward = STREAK_REWARDS.get(soul.streak, DEFAULT_STREAK_XP)
        soul.xp += xp_reward

        streak_memory = Memory(
            id=f"streak-{today}",
            title=f"Day {soul.streak} Streak",
            text=f"Visited on day {soul.streak} of the streak. +{xp_reward} XP.",
            importance=40 if soul.streak < 3 else 60,
            timestamp=datetime.now().isoformat(),
            faded=False,
        )
        soul.memories.append(streak_memory)

        return {"rewarded": True, "xp": xp_reward, "streak": soul.streak}

    @staticmethod
    def check_achievements(soul: Soul) -> list:
        newly_unlocked = []

        def unlock(achievement_id: str):
            if achievement_id not in soul.achievements:
                soul.achievements.append(achievement_id)
                newly_unlocked.append(achievement_id)

                meta = ACHIEVEMENTS.get(achievement_id, {})
                achievement_memory = Memory(
                    id=f"achv-{achievement_id}-{datetime.now().timestamp()}",
                    title=f"🏆 {meta.get('title', achievement_id)}",
                    text=meta.get("desc", "Achievement unlocked."),
                    importance=meta.get("importance", 80),
                    timestamp=datetime.now().isoformat(),
                    faded=False,
                )
                soul.memories.append(achievement_memory)

        if soul.battles_won >= 1:
            unlock("first_blood")
        if soul.level >= 10:
            unlock("sage")
        if soul.evolutions_count >= 3:
            unlock("chameleon")
        if soul.battles_won >= 10:
            unlock("veteran")
        if soul.streak >= 7:
            unlock("streak_7")
        if soul.quests_completed >= 1:
            unlock("first_quest")
        if len(soul.memories) >= 25:
            unlock("collector")

        from .rarity_engine import RarityEngine
        rarity = RarityEngine.compute(soul)
        if rarity["tier"] in ("Mythic", "Legendary"):
            unlock("mythic")

        return newly_unlocked

    @staticmethod
    def get_all_achievements_status(soul: Soul) -> list:
        """
        Return all 8 achievements with unlocked state and progress.
        Used by the Achievements Gallery page.
        """
        from .rarity_engine import RarityEngine
        rarity = RarityEngine.compute(soul)

        statuses = []
        for aid, meta in ACHIEVEMENTS.items():
            unlocked = aid in soul.achievements

            # Progress calculation
            progress_key = meta.get("progress_key")
            progress_goal = meta.get("progress_goal", 1)
            progress_current = 0

            if progress_key == "battles_won":
                progress_current = soul.battles_won
            elif progress_key == "level":
                progress_current = soul.level
            elif progress_key == "evolutions_count":
                progress_current = soul.evolutions_count
            elif progress_key == "streak":
                progress_current = soul.streak
            elif progress_key == "quests_completed":
                progress_current = soul.quests_completed
            elif progress_key == "memories_count":
                progress_current = len(soul.memories)
            elif progress_key == "rarity_score":
                progress_current = rarity["score"]

            progress_current = min(progress_current, progress_goal)

            statuses.append({
                "id": aid,
                "title": meta["title"],
                "desc": meta["desc"],
                "icon": meta["icon"],
                "unlocked": unlocked,
                "progress_current": progress_current,
                "progress_goal": progress_goal,
                "progress_percent": int(
                    (progress_current / progress_goal) * 100
                ) if progress_goal > 0 else 0,
            })

        return statuses

    @staticmethod
    def get_achievement_meta(achievement_id: str) -> dict:
        return ACHIEVEMENTS.get(achievement_id, {})