# backend/app/services/rarity_engine.py
from ..schemas.soul import Soul


TIER_WEIGHTS = {
    "1": {"tier": "Legendary", "color": "#ffd966", "score": 100},
    "2": {"tier": "Epic", "color": "#b57aff", "score": 80},
    "3": {"tier": "Rare", "color": "#5fa8ff", "score": 60},
    "4": {"tier": "Uncommon", "color": "#8ce8b4", "score": 40},
    "5": {"tier": "Common", "color": "#9c94aa", "score": 20},
}


class RarityEngine:

    @staticmethod
    def compute(soul: Soul) -> dict:
        # Find Tier trait
        tier_value = "5"
        for t in soul.traits:
            if t.name == "Tier":
                tier_value = str(t.value)
                break

        tier_info = TIER_WEIGHTS.get(tier_value, TIER_WEIGHTS["5"])

        # Stat bonus from top 2 stats
        stat_values = sorted(
            [soul.stats.courage, soul.stats.loyalty, soul.stats.intelligence, soul.stats.greed],
            reverse=True,
        )
        stat_bonus = (stat_values[0] + stat_values[1]) // 10

        # Level bonus
        level_bonus = soul.level * 2

        total = min(100, tier_info["score"] + stat_bonus + level_bonus)

        # Final tier
        if total >= 95:
            final_tier, final_color = "Mythic", "#ff6b9d"
        elif total >= 85:
            final_tier, final_color = "Legendary", "#ffd966"
        elif total >= 70:
            final_tier, final_color = "Epic", "#b57aff"
        elif total >= 50:
            final_tier, final_color = "Rare", "#5fa8ff"
        elif total >= 30:
            final_tier, final_color = "Uncommon", "#8ce8b4"
        else:
            final_tier, final_color = "Common", "#9c94aa"

        return {"tier": final_tier, "color": final_color, "score": total}