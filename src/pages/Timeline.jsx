// src/pages/Timeline.jsx
import MemoryCard from "../components/MemoryCard";

export default function Timeline({ soul }) {
  return (
    <div className="page">
      <div className="page-title">
        <div>
          <p className="eyebrow">SOUL HISTORY</p>
          <h1>The memories stay.</h1>
          <p>A biography created by your choices.</p>
        </div>
      </div>

            <section className="timeline">
        {soul.memories.slice().reverse().map((memory, index) => (
          <div
            className={`timeline-item ${memory.faded ? "faded" : ""}`}
            key={memory.id}
          >
            <div className="timeline-marker">
              {String(soul.memories.length - index).padStart(2, "0")}
            </div>
            <div>
              <span>{new Date(memory.timestamp).toLocaleString()}</span>
              <h3>{memory.title}</h3>
              <p>{memory.text}</p>
              <div className="timeline-importance">
                IMPORTANCE <b>{memory.importance}</b>
                {memory.faded && <span className="faded-tag">FADED</span>}
              </div>
            </div>
          </div>
        ))}
      </section>

      <div className="section-heading">
        <div>
          <p className="eyebrow">MEMORY BANK</p>
          <h2>Important memories</h2>
        </div>
      </div>

      <section className="memory-cards">
        {soul.memories.slice(0, 3).map((memory) => (
          <MemoryCard key={memory.id} memory={memory} />
        ))}
      </section>
    </div>
  );
}