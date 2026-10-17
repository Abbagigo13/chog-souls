# backend/app/services/arena_engine.py
import random
from ..schemas.soul import Soul

class ArenaEngine:
    
    # Weighted stats for combat power
    WEIGHTS = {
        "courage": 1.0,
        "intelligence": 1.2,  # Intelligence matters most
        "loyalty": 0.6,       # Loyalty is more defensive
        "greed": 0.4          # Greed is a wildcard
    }
    
    @staticmethod
    def calculate_power(stats: dict) -> float:
        """Calculate total combat power from stats."""
        power = 0
        for stat, weight in ArenaEngine.WEIGHTS.items():
            power += stats.get(stat, 0) * weight
        return round(power, 2)
    
    @staticmethod
    def simulate_battle(soul: Soul, nova: dict) -> dict:
        """Determines battle outcome with slight randomness."""
        soul_stats = soul.stats.model_dump()
        nova_stats = nova["stats"]
        
        soul_power = ArenaEngine.calculate_power(soul_stats)
        nova_power = ArenaEngine.calculate_power(nova_stats)
        
        # Add ±10% random variance to simulate luck
        soul_roll = soul_power * random.uniform(0.9, 1.1)
        nova_roll = nova_power * random.uniform(0.9, 1.1)
        
        won = soul_roll > nova_roll
        
        # Generate a narrative prompt for Qwen
        prompt = f"""
        A battle just happened in the CHOG ARENA.
        
        FIGHTER 1 - {soul.name} (The {soul.archetype}):
        - Courage: {soul_stats['courage']}, Loyalty: {soul_stats['loyalty']}, 
          Intelligence: {soul_stats['intelligence']}, Greed: {soul_stats['greed']}
        - Traits: {', '.join([f"{t.name}: {t.value}" for t in soul.traits])}
        - Outcome: {'WON' if won else 'LOST'}
        
        FIGHTER 2 - {nova['name']} ({nova['archetype']}):
        - Courage: {nova_stats['courage']}, Loyalty: {nova_stats['loyalty']}, 
          Intelligence: {nova_stats['intelligence']}, Greed: {nova_stats['greed']}
        - Traits: {', '.join([f"{t['name']}: {t['value']}" for t in nova['traits']])}
        - Outcome: {'LOST' if won else 'WON'}
        
        Write a dramatic 2-3 sentence battle narrative in the style of a fighting game announcer.
        Reference the Souls' traits and personalities. No markdown, just plain prose.
        """
        
        return {
            "won": won,
            "soul_power": soul_power,
            "nova_power": nova_power,
            "prompt": prompt
        }