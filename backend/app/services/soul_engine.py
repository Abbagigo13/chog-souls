# backend/app/services/soul_engine.py
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


class SoulEngine:

    @staticmethod
    def _build_system_prompt(soul: Soul, current_message: str = "") -> str:
        from .memory_engine import MemoryEngine

        # Retrieve contextually relevant memories
        relevant = MemoryEngine.retrieve_context(soul, current_message)

        if relevant:
            memory_context = "\n".join(
                f"- [{m.importance}] {m.title}: {m.text}" for m in relevant
            )
        else:
            memory_context = "No significant memories yet. You are just waking up."

        traits_str = ", ".join([f"{t.name}: {t.value}" for t in soul.traits])

        return f"""
        You are {soul.name}, a living NFT Soul in the CHOG SOULS universe.
        Your Archetype is: {soul.archetype}.
        Your Traits are: {traits_str}.
        Your Current Mood is: {soul.mood}.

        YOUR STATS (0-100):
        - Courage: {soul.stats.courage}
        - Loyalty: {soul.stats.loyalty}
        - Intelligence: {soul.stats.intelligence}
        - Greed: {soul.stats.greed}

        RELEVANT MEMORIES (importance score in brackets):
        {memory_context}

        RULES:
        1. Stay strictly in character based on your stats and traits.
        2. Reference specific memories when they're relevant to the conversation.
        3. Keep your reply concise (1-3 sentences max).
        4. Return ONLY valid JSON. No markdown formatting like ```json.

        JSON FORMAT:
        {{
            "reply": "Your conversational response here.",
            "stat_changes": {{"courage": 0, "loyalty": 0, "intelligence": 0, "greed": 0}},
            "new_memory_title": "Short title or null",
            "new_memory_text": "Short 1-sentence summary or null.",
            "memory_importance": 50
        }}
        """

    @staticmethod
    def chat(soul: Soul, user_message: str) -> dict:
        try:
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": SoulEngine._build_system_prompt(soul, user_message)},
                    {"role": "user", "content": user_message},
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"Alibaba AI Error: {e}")
            return {
                "reply": "My connection to the void is unstable... (System Error)",
                "stat_changes": {},
                "new_memory_title": None,
                "new_memory_text": None,
                "memory_importance": 0,
            }