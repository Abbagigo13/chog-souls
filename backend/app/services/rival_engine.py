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

# How each archetype talks, so every rival sounds like itself
PERSONAS = {
    "The Cold Strategist": "cold, calculating, cunning; a chessmaster who speaks in odds and plans",
    "The Shadow Tyrant": "menacing and domineering; treats everyone as a subject to be crushed",
    "The Cold Oracle": "cryptic and serene; speaks like a prophet who has already seen the ending",
    "The Loyal Trickster": "playful, mischievous and warm; teases, but never betrays a friend",
    "The Guardian": "stoic, honourable and protective; speaks plainly and firmly",
    "The Wanderer": "restless, weary and detached; has seen too many arenas to care much",
    "The Opportunist": "cunning and mercantile; everything is a deal, a price or a trade",
    "The Sage": "calm, wise and patient; speaks like a teacher who expects to be proven right",
    "The Berserker": "furious and blunt; short, violent sentences",
    "The Awakened": "young, eager and a little uncertain; trying hard to sound tough",
}
DEFAULT_PERSONA = "confident and competitive"


def _persona(rival: dict) -> str:
    return PERSONAS.get(rival.get("archetype", ""), DEFAULT_PERSONA)


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
        1. Stay fully in character as {rival['name']} ({rival['archetype']}): {_persona(rival)}.
        2. Reference specific details from {soul.name}'s stats, traits, archetype, or history.
        3. If you're winning the rivalry, be smug in your own style. If you're losing, be defiant in your own style.
        4. Keep it sharp and in character, not cartoonish.
        5. Max 20 words.
        6. Do NOT include quotes in the output.

        Respond with ONLY the taunt text (no JSON, no explanation, no quotes).
        """

    @staticmethod
    def _build_post_battle_prompt(soul: Soul, rival: dict, won: bool) -> str:
        outcome = "won" if won else "lost"

        return f"""
        The battle just ended. {soul.name} {outcome} against {rival['name']}.

        {rival['name']} is "{rival['archetype']}": {_persona(rival)}.
        Your level: {rival['level']}.
        Your traits: {', '.join([f"{t['name']}: {t['value']}" for t in rival['traits']])}

        {soul.name} is a Level {soul.level} {soul.archetype}.

        YOUR JOB:
        Write ONE single-sentence reaction from {rival['name']} after the battle.

        RULES:
        1. If you LOST: grudging respect in your own style, never warm.
        2. If you WON: gloat in your own style, but hint that {soul.name} is learning.
        3. Stay in character. No cartoonish gloating.
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
                    {"role": "system", "content": f"You are {rival['name']}, {_persona(rival)}, in the CHOG SOULS universe."},
                    {"role": "user", "content": RivalEngine._build_taunt_prompt(soul, rival)},
                ],
                temperature=0.85,
                max_tokens=60,
            )
            return response.choices[0].message.content.strip().strip('"').strip("'")
        except Exception as e:
            print(f"Rival taunt error: {e}")
            return f"You enter the arena, {soul.name}. I know how this ends."

    @staticmethod
    async def generate_post_battle_line(soul: Soul, rival: dict, won: bool) -> str:
        """Generate a post-battle reaction from the rival."""
        try:
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": f"You are {rival['name']}, {_persona(rival)}, in the CHOG SOULS universe."},
                    {"role": "user", "content": RivalEngine._build_post_battle_prompt(soul, rival, won)},
                ],
                temperature=0.85,
                max_tokens=60,
            )
            return response.choices[0].message.content.strip().strip('"').strip("'")
        except Exception as e:
            print(f"Rival post-battle error: {e}")
            if won:
                return "Victory was not in the plan. I will remember this."
            return "As expected. Come back when you are ready."