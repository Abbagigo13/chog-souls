// src/pages/Timeline.jsx
import { useMemo, useState } from "react";
import Avatar from "../components/Avatar";
import MemoryCard from "../components/MemoryCard";
import {
  FILTERS,
  memoryKind,
  memoryTitle,
  parseDate,
  dayLabel,
  relativeTime,
  exactTime,
  importanceTone,
  awakeDays,
} from "../lib/memory";

const PAGE_SIZE = 25;

export default function Timeline({ soul }) {
  const [filter, setFilter] = useState("all");
  const [visible, setVisible] = useState(PAGE_SIZE);

  // Every memory with its kind and date, newest first
  const entries = useMemo(() => {
    return (soul.memories || [])
      .map((memory, index) => ({
        memory,
        index,
        date: parseDate(memory.timestamp),
        kind: memoryKind(memory),
      }))
      .sort(
        (a, b) =>
          (b.date ? b.date.getTime() : -Infinity) -
            (a.date ? a.date.getTime() : -Infinity) || b.index - a.index
      );
  }, [soul.memories]);

  const counts = useMemo(() => {
    const result = { all: entries.length, battles: 0, milestones: 0, moments: 0 };
    entries.forEach((e) => {
      result[e.kind.group] += 1;
    });
    return result;
  }, [entries]);

  const filtered = entries.filter((e) => filter === "all" || e.kind.group === filter);
  const shown = filtered.slice(0, visible);

  // Group the shown memories under day headings
  const groups = [];
  shown.forEach((entry) => {
    const key = entry.date ? entry.date.toDateString() : "unknown";
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = { key, label: dayLabel(entry.date), items: [] };
      groups.push(group);
    }
    group.items.push(entry);
  });

  // The three most important memories that have not faded
  const core = entries
    .filter((e) => !e.memory.faded)
    .sort(
      (a, b) =>
        (b.memory.importance || 0) - (a.memory.importance || 0) || b.index - a.index
    )
    .slice(0, 3);

  const chooseFilter = (id) => {
    setFilter(id);
    setVisible(PAGE_SIZE);
  };

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <p className="eyebrow">SOUL HISTORY</p>
          <h1>The memories stay.</h1>
          <p>A biography created by your choices.</p>
        </div>
        <Avatar size="medium" imageUrl={soul.imageUrl} />
      </div>

      {/* At a glance */}
      <section className="mh-stats">
        <div className="mh-stat">
          <b>{counts.all}</b>
          <span>MEMORIES</span>
        </div>
        <div className="mh-stat">
          <b>{counts.milestones}</b>
          <span>MILESTONES</span>
        </div>
        <div className="mh-stat">
          <b>
            {soul.battles_won || 0}-{soul.battles_lost || 0}
          </b>
          <span>BATTLES W-L</span>
        </div>
        <div className="mh-stat">
          <b>{soul.streak || 0}</b>
          <span>DAY STREAK</span>
        </div>
        <div className="mh-stat">
          <b>{awakeDays(entries.map((e) => e.date))}</b>
          <span>DAYS AWAKE</span>
        </div>
      </section>

      {/* Core memories */}
      {core.length > 0 && (
        <>
          <div className="section-heading">
            <div>
              <p className="eyebrow">CORE MEMORIES</p>
              <h2>What {soul.name} will never forget</h2>
            </div>
          </div>
          <section className="mh-core-grid">
            {core.map((entry, i) => (
              <MemoryCard key={entry.memory.id} memory={entry.memory} rank={i + 1} />
            ))}
          </section>
        </>
      )}

      {/* Timeline */}
      <div className="section-heading">
        <div>
          <p className="eyebrow">TIMELINE</p>
          <h2>Everything that happened</h2>
        </div>
      </div>

      <div className="mh-filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`mh-chip ${filter === f.id ? "active" : ""}`}
            onClick={() => chooseFilter(f.id)}
          >
            {f.label}
            <small>{counts[f.id]}</small>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mh-empty">
          {filter === "all"
            ? "No memories yet. Talk, make a choice, or fight in the Arena to create the first one."
            : "Nothing here yet. Keep playing and this will fill up."}
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.key}>
            <h4 className="mh-day">{group.label}</h4>
            <div className="mh-list">
              {group.items.map(({ memory, date, kind }) => {
                const importance = Math.max(0, Math.min(100, Number(memory.importance) || 0));
                return (
                  <article
                    key={memory.id}
                    className={`mh-item mh-tone-${kind.tone} ${memory.faded ? "faded" : ""}`}
                  >
                    <div className="mh-icon">{kind.icon}</div>
                    <div className="mh-body">
                      <div className="mh-meta">
                        <span className="mh-kind">{kind.label}</span>
                        <span className="mh-time" title={exactTime(date)}>
                          {relativeTime(date)}
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
                        {memory.faded && <span className="mh-faded">FADED</span>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}

      {filtered.length > visible && (
        <button
          className="secondary-button mh-more"
          onClick={() => setVisible((n) => n + PAGE_SIZE)}
        >
          SHOW OLDER MEMORIES ({filtered.length - visible})
        </button>
      )}
    </div>
  );
}