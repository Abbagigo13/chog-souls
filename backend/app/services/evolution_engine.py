# backend/app/services/evolution_engine.py
from ..schemas.soul import Soul


class EvolutionEngine:
    """
    Determines if a Soul should change its archetype based on stats.
    Archetypes are checked in order of priority — first match wins.
    """

    # Each rule: (new_archetype, condition_function)
    # Conditions use stats on a 0-100 scale.
    RULES = [
        # --- Extreme states (highest priority) ---
        ("The Shadow Tyrant", lambda s: s.greed >= 80 and s.loyalty < 40),
        ("The Relentless Zealot", lambda s: s.courage >= 85 and s.intelligence < 50),
        ("The Cold Oracle", lambda s: s.intelligence >= 85 and s.loyalty < 45),
        
        # --- Extreme positive states ---
        ("The Guardian", lambda s: s.loyalty >= 85 and s.courage >= 70),
        ("The Sage", lambda s: s.intelligence >= 80 and s.greed < 40),
        ("The Berserker", lambda s: s.courage >= 85 and s.greed >= 50),
        
        # --- Balanced high states ---
        ("The Sovereign", lambda s: all(v >= 70 for v in [s.courage, s.loyalty, s.intelligence])),
        ("The Opportunist", lambda s: s.greed >= 65 and s.loyalty < 55),
        ("The Protector", lambda s: s.loyalty >= 75 and s.greed < 50),
        
        # --- Mid states ---
        ("The Cunning Trickster", lambda s: s.intelligence >= 65 and s.greed >= 50),
        ("The Loyal Trickster", lambda s: s.loyalty >= 65 and s.intelligence >= 65),
        ("The Wanderer", lambda s: s.courage >= 60 and s.loyalty < 50),
        
        # --- Default / Fallback ---
        ("The Awakened", lambda s: True),
    ]

    @staticmethod
    def get_archetype(stats) -> str:
        """Return the archetype that matches the given stats."""
        for archetype, condition in EvolutionEngine.RULES:
            try:
                if condition(stats):
                    return archetype
            except Exception:
                continue
        return "The Awakened"

    @staticmethod
    def check_evolution(soul: Soul) -> dict:
        """
        Compare the Soul's current archetype against what it should be.
        Returns info about whether evolution occurred.
        """
        old_archetype = soul.archetype
        new_archetype = EvolutionEngine.get_archetype(soul.stats)

        evolved = old_archetype != new_archetype

        if evolved:
            soul.archetype = new_archetype

        return {
            "evolved": evolved,
            "old_archetype": old_archetype,
            "new_archetype": new_archetype,
        }