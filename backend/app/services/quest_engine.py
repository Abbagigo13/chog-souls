# backend/app/services/quest_engine.py
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


class QuestEngine:

    @staticmethod
    def _build_prompt(soul: Soul, action: str, quest: dict) -> str:
        traits_str = ", ".join([f"{t.name}: {t.value}" for t in soul.traits])

        return f"""
        A decision has been made in the CHOG SOULS universe.

        THE SCENARIO — "{quest['title']}":
        {quest['scenario']}
        {quest['description']}

        The player chose: "{action.upper()}"

        THE SOUL:
        - Name: {soul.name}
        - Archetype: {soul.archetype}
        - Traits: {traits_str}
        - Mood: {soul.mood}

        CURRENT STATS (0-100):
        - Courage: {soul.stats.courage}
        - Loyalty: {soul.stats.loyalty}
        - Intelligence: {soul.stats.intelligence}
        - Greed: {soul.stats.greed}

        YOUR JOB:
        Evaluate how this decision affects {soul.name}, given their personality and the scenario.

        RULES:
        1. If the choice ALIGNS with the Soul's nature, the stat changes should be SMALL (1-3 points).
        2. If the choice CONFLICTS with the Soul's nature, the stat changes should be LARGER (5-10 points).
        3. Stat changes can be negative or positive. Clamp total range to -15 to +15 per stat.
        4. The narrative should be 2-3 sentences, written from the Soul's perspective.
        5. The memory should be a short title + 1 sentence summary.

        Return ONLY valid JSON, no markdown:
        {{
            "narrative": "2-3 sentences describing {soul.name}'s internal reaction.",
            "stat_changes": {{"courage": 0, "loyalty": 0, "intelligence": 0, "greed": 0}},
            "memory_title": "Short title (3-5 words)",
            "memory_text": "One sentence summary of this decision.",
            "memory_importance": 60,
            "mood_change": "New mood word (e.g., 'Conflicted', 'Resolute', 'Ashamed') or null"
        }}
        """

    @staticmethod
    def process_choice(soul: Soul, action: str, quest: dict) -> dict:
        try:
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {
                        "role": "system",
                        "content": "You are the game engine for CHOG SOULS. You decide how player choices affect the Soul's personality.",
                    },
                    {"role": "user", "content": QuestEngine._build_prompt(soul, action, quest)},
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"Quest AI Error: {e}")
            return {
                "narrative": f"{soul.name} made a decision.",
                "stat_changes": {},
                "memory_title": quest.get("title", "A choice was made"),
                "memory_text": f"Giga chose to {action} in '{quest.get('title', 'a scenario')}'.",
                "memory_importance": 60,
                "mood_change": None,
            }