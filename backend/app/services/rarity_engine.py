# backend/app/services/rarity_engine.py
from ..schemas.soul import Soul


# The NFT's own Tier trait (as written in the collection metadata), plus the
# older numeric tiers. Keep in step with src/lib/rarity.js on the frontend.
COMMON = {"tier": "Common", "color": "#9c94aa", "score": 20}
UNCOMMON = {"tier": "Uncommon", "color": "#8ce8b4", "score": 40}
RARE = {"tier": "Rare", "color": "#5fa8ff", "score": 60}
EPIC = {"tier": "Epic", "color": "#b57aff", "score": 80}
LEGENDARY = {"tier": "Legendary", "color": "#ffd966", "score": 100}
MYTHIC = {"tier": "Mythic", "color": "#ff6b9d", "score": 100}

TIER_WEIGHTS = {
    "common": COMMON,
    "uncommon": UNCOMMON,
    "rare": RARE,
    "epic": EPIC,
    "legendary": LEGENDARY,
    "mythic": MYTHIC,
    # older numeric tiers
    "1": LEGENDARY,
    "2": EPIC,
    "3": RARE,
    "4": UNCOMMON,
    "5": COMMON,
}


class RarityEngine:

    @staticmethod
    def compute(soul: Soul) -> dict:
        """
        The tier and colour are the NFT's real Tier trait. The score also counts
        stats and level; it is only used for ranking.
        """
        tier_value = "common"
        for t in soul.traits:
            if t.name == "Tier":
                tier_value = str(t.value).strip().lower()
                break

        tier_info = TIER_WEIGHTS.get(tier_value, COMMON)

        # Stat bonus from top 2 stats
        stat_values = sorted(
            [soul.stats.courage, soul.stats.loyalty, soul.stats.intelligence, soul.stats.greed],
            reverse=True,
        )
        stat_bonus = (stat_values[0] + stat_values[1]) // 10

        # Level bonus
        level_bonus = soul.level * 2

        total = min(100, tier_info["score"] + stat_bonus + level_bonus)

        return {"tier": tier_info["tier"], "color": tier_info["color"], "score": total}