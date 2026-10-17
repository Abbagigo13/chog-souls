export default function MemoryCard({ memory }) {
  return (
    <article className="memory-card">
      <div className="memory-top">
        <span className="eyebrow">{memory.type}</span>
        <span className="muted">{memory.time}</span>
      </div>
      <h3>{memory.title}</h3>
      <p>{memory.text}</p>
      <div className="importance">IMPORTANCE <b>{memory.importance}</b></div>
    </article>
  );
}
