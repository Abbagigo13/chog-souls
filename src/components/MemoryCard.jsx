// src/components/MemoryCard.jsx
import { memoryKind, memoryTitle, importanceTone } from "../lib/memory";

// A "core memory": one of the Soul's most important moments
export default function MemoryCard({ memory, rank }) {
  const kind = memoryKind(memory);
  const importance = Math.max(0, Math.min(100, Number(memory.importance) || 0));

  return (
    <article className="mh-core">
      <div className="mh-core-top">
        <span className="mh-core-rank">{rank ? `#${rank}` : "★"}</span>
        <span className="mh-kind">
          {kind.icon} {kind.label}
        </span>
      </div>
      <h3>{memoryTitle(memory)}</h3>
      <p>{memory.text}</p>
      <div className="mh-importance">
        <div className={`mh-bar ${importanceTone(importance)}`}>
          <div style={{ width: `${importance}%` }} />
        </div>
        <span>
          IMPORTANCE <b>{importance}</b>
        </span>
      </div>
    </article>
  );
}