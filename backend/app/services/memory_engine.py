# backend/app/services/memory_engine.py
import re
from typing import List
from ..schemas.soul import Soul, Memory


class MemoryEngine:
    """
    Manages memory scoring, retrieval, summarization, and decay.
    """

    # Emotional keywords that boost importance
    EMOTIONAL_KEYWORDS = {
        "betray": 30, "betrayal": 30, "trust": 25, "love": 25, "hate": 25,
        "promise": 20, "swore": 20, "vow": 20, "guilt": 20, "shame": 20,
        "friend": 15, "enemy": 25, "family": 25, "brother": 25, "sister": 25,
        "died": 40, "death": 40, "kill": 35, "saved": 30, "sacrifice": 35,
        "afraid": 20, "fear": 20, "hope": 15, "dream": 15, "nightmare": 25,
        "secret": 20, "lie": 20, "truth": 25, "confess": 25,
        "power": 15, "money": 10, "rich": 10, "poor": 10,
        "always": 15, "never": 20, "forever": 20, "last": 15,
    }

    # Stat thresholds
    HIGH_STAT_DELTA = 8
    MEDIUM_STAT_DELTA = 4

    # Decay per day for unused memories
    DECAY_PER_DAY = 1

    # Retrieval caps
    MAX_CONTEXT_MEMORIES = 8
    RECENT_COUNT = 3
    SALIENT_COUNT = 5

    # Summarization threshold
    SUMMARIZE_AT_COUNT = 30
    SUMMARIZE_OLDEST = 10

    @staticmethod
    def score_importance(
        memory_text: str,
        memory_title: str,
        stat_changes: dict = None,
        base_importance: int = 50,
        is_event: bool = False,
    ) -> int:
        """
        Compute the true importance score (0-100) for a memory.
        Combines: base + stat deltas + emotional keywords + event flag.
        """
        score = base_importance

        # Stat changes contribute
        if stat_changes:
            total_delta = sum(abs(v) for v in stat_changes.values())
            if total_delta >= MemoryEngine.HIGH_STAT_DELTA:
                score += 20
            elif total_delta >= MemoryEngine.MEDIUM_STAT_DELTA:
                score += 10

        # Emotional keywords
        text = (memory_text + " " + memory_title).lower()
        for keyword, boost in MemoryEngine.EMOTIONAL_KEYWORDS.items():
            if re.search(rf"\b{keyword}\b", text):
                score += boost
                # One keyword boost max per memory, then break
                break

        # Event flag (level up, evolution, battle) = high importance
        if is_event:
            score = max(score, 85)

        return max(0, min(100, score))

    @staticmethod
    def retrieve_context(soul: Soul, current_message: str = "") -> List[Memory]:
        """
        Fetch the most relevant memories for the current context.
        Combines recency + salience + keyword relevance.
        """
        memories = soul.memories or []
        if not memories:
            return []

        # Filter out faded memories
        active = [m for m in memories if m.importance >= 10]
        if len(active) <= MemoryEngine.MAX_CONTEXT_MEMORIES:
            return active

        # --- Recency: last N memories ---
        recent = memories[-MemoryEngine.RECENT_COUNT:]

        # --- Salience: highest importance ---
        salient = sorted(active, key=lambda m: m.importance, reverse=True)[
            :MemoryEngine.SALIENT_COUNT
        ]

        # --- Relevance: keyword match with current message ---
        relevant = []
        if current_message:
            message_words = set(re.findall(r"\b\w{4,}\b", current_message.lower()))
            for mem in active:
                mem_words = set(
                    re.findall(r"\b\w{4,}\b", (mem.title + " " + mem.text).lower())
                )
                if message_words & mem_words:
                    relevant.append(mem)
            relevant = relevant[:3]

        # --- Deduplicate and cap ---
        seen_ids = set()
        result = []
        for mem in recent + relevant + salient:
            if mem.id not in seen_ids:
                seen_ids.add(mem.id)
                result.append(mem)

        return result[:MemoryEngine.MAX_CONTEXT_MEMORIES]

    @staticmethod
    def apply_decay(soul: Soul, days_since_last_use: int = 1) -> None:
        """
        Reduce importance of old memories that haven't been retrieved.
        Runs on each Soul load. Modifies in place.
        """
        if days_since_last_use <= 0:
            return

        decay = MemoryEngine.DECAY_PER_DAY * days_since_last_use

        for memory in soul.memories:
            # Don't decay events, level ups, or evolutions
            if memory.importance >= 80:
                continue
            # Don't decay very recent memories (first 3)
            memory.importance = max(0, memory.importance - decay)

    @staticmethod
    async def summarize_old_memories(soul: Soul) -> bool:
        """
        If memory count exceeds threshold, compress the oldest N into one summary.
        Returns True if summarization happened.
        """
        if len(soul.memories) < MemoryEngine.SUMMARIZE_AT_COUNT:
            return False

        # Take the oldest N
        to_summarize = soul.memories[: MemoryEngine.SUMMARIZE_OLDEST]

        # Build a summary (simple approach — no AI call to avoid latency)
        summary_lines = [f"• {m.title}: {m.text}" for m in to_summarize]
        summary_text = (
            f"A summary of {len(to_summarize)} early memories:\n"
            + "\n".join(summary_lines)
        )

        # Cap summary length
        if len(summary_text) > 800:
            summary_text = summary_text[:800] + "..."

        # Compute importance as average of underlying, capped at 60
        avg_importance = sum(m.importance for m in to_summarize) // len(to_summarize)
        summary_importance = min(60, max(40, avg_importance))

        # Build the summary Memory
        from datetime import datetime
        import uuid

        summary_memory = Memory(
            id=str(uuid.uuid4()),
            title=f"Early days (summary of {len(to_summarize)})",
            text=summary_text,
            importance=summary_importance,
            timestamp=datetime.now().isoformat(),
        )

        # Replace the old memories with the summary
        soul.memories = [summary_memory] + soul.memories[MemoryEngine.SUMMARIZE_OLDEST:]
        return True