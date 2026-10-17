# backend/app/services/rival_engine.py
import os
import json
from dotenv import load_dotenv
from openai import OpenAI
from ..schemas.soul import Soul

load_dotenv()

client = OpenAI(
    api_key=os.getenv("AI_API_KEY"),
    base_url=os.getenv("AI_BASE_URL", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"),
)

MODEL_NAME = os.getenv("AI_MODEL", "qwen-max")


class RivalEngine:

    @staticmethod
    def _build_taunt_prompt(soul: Soul, rival: dict) -> str:
        traits_str = ", ".join([f"{t.name}: {t.value}" for t in soul.traits])

        # Build context about the rivalry
        wins = soul.battles_won
        losses = soul.battles_lost
        total = wins + losses

        if total == 0:
            history = "This is their first battle. No history between them."
        elif wins > losses:
            history = f"{soul.name} has won {wins} of {total} battles. {rival['name']} is losing."
        elif losses > wins:
            history = f"{soul.name} has lost {losses} of {total} battles. {rival['name']} is winning."
        else:
            history = f"Perfectly tied at {wins}-{losses}."

        return f"""
        A battle is about to begin in the CHOG ARENA.

        FIGHTER 1 (challenger):
        - Name: {soul.name}
        - Archetype: {soul.archetype}
        - Traits: {traits_str}
        - Level: {soul.level}
        - Stats — Courage: {soul.stats.courage}, Loyalty: {soul.stats.loyalty}, Intelligence: {soul.stats.intelligence}, Greed: {soul.stats.greed}

        FIGHTER 2 (rival — YOU are speaking as this character):
        - Name: {rival['name']}
        - Archetype: {rival['archetype']}
        - Traits: {', '.join([f"{t['name']}: {t['value']}" for t in rival['traits']])}
        - Level: {rival['level']}
        - Stats — Courage: {rival['stats']['courage']}, Loyalty: {rival['stats']['loyalty']}, Intelligence: {rival['stats']['intelligence']}, Greed: {rival['stats']['greed']}

        RIVALRY HISTORY:
        {history}

        YOUR JOB:
        Write ONE single-sentence taunt that {rival['name']} says to {soul.name} just before the battle begins.

        RULES:
        1. Stay fully in character as {rival['name']} — cold, calculating, cunning (Cold Strategist archetype).
        2. Reference specific details from {soul.name}'s stats, traits, archetype, or history.
        3. If you're winning the rivalry, be condescending. If you're losing, be cold but defiant.
        4. Be cryptic and menacing — NOT cartoonish. Think "calculating chessmaster", not "wrestling villain".
        5. Max 20 words.
        6. Do NOT include quotes in the output.

        Respond with ONLY the taunt text (no JSON, no explanation, no quotes).
        """

    @staticmethod
    def _build_post_battle_prompt(soul: Soul, rival: dict, won: bool) -> str:
        outcome = "won" if won else "lost"

        return f"""
        The battle just ended. {soul.name} {outcome} against {rival['name']}.

        {rival['name']} is "The Cold Strategist" — cunning, calculating, never emotional.
        Your level: {rival['level']}.
        Your traits: {', '.join([f"{t['name']}: {t['value']}" for t in rival['traits']])}

        {soul.name} is a Level {soul.level} {soul.archetype}.

        YOUR JOB:
        Write ONE single-sentence reaction from {rival['name']} after the battle.

        RULES:
        1. If you LOST: cold respect, but never warm. Acknowledge skill without complimenting.
        2. If you WON: subtle condescension, but hint that {soul.name} is learning.
        3. Stay cryptic. No cartoonish gloating.
        4. Max 20 words.
        5. No quotes.

        Respond with ONLY the reaction text (no JSON, no explanation, no quotes).
        """

    @staticmethod
    async def generate_taunt(soul: Soul, rival: dict) -> str:
        """Generate a pre-battle taunt from the rival."""
        try:
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": "You are a cold, calculating strategist in the CHOG SOULS universe."},
                    {"role": "user", "content": RivalEngine._build_taunt_prompt(soul, rival)},
                ],
                temperature=0.85,
                max_tokens=60,
            )
            return response.choices[0].message.content.strip().strip('"').strip("'")
        except Exception as e:
            print(f"Rival taunt error: {e}")
            return f"You enter the arena, {soul.name}. I calculated your odds. They are not favorable."

    @staticmethod
    async def generate_post_battle_line(soul: Soul, rival: dict, won: bool) -> str:
        """Generate a post-battle reaction from the rival."""
        try:
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": "You are a cold, calculating strategist in the CHOG SOULS universe."},
                    {"role": "user", "content": RivalEngine._build_post_battle_prompt(soul, rival, won)},
                ],
                temperature=0.85,
                max_tokens=60,
            )
            return response.choices[0].message.content.strip().strip('"').strip("'")
        except Exception as e:
            print(f"Rival post-battle error: {e}")
            if won:
                return "Victory was not in my calculations. Adjustments will be made."
            return "As predicted. Your failure teaches me nothing new."