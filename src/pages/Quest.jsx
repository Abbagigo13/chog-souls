// src/pages/Quest.jsx
import { useEffect, useState } from "react";
import Avatar from "../components/Avatar";
import { apiGetTodayQuest } from "../lib/api";

export default function Quest({ soul, onChoice, navigate }) {
  const [questData, setQuestData] = useState(null);
  const [loadingQuest, setLoadingQuest] = useState(true);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Load today's quest on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await apiGetTodayQuest();
        if (!cancelled) setQuestData(data);
      } catch (err) {
        console.error("Quest load error:", err);
      } finally {
        if (!cancelled) setLoadingQuest(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChoice = async (action) => {
    setSubmitting(true);
    try {
      const data = await onChoice(action);
      setResult(data);
      // Mark completed in local state
      if (questData) {
        setQuestData({ ...questData, completed: true });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Result view ----------
  if (result) {
    const changes = result.stat_changes || {};
    const hasChanges = Object.keys(changes).length > 0;

    return (
      <div className="page">
        <div className="page-title">
          <div>
            <p className="eyebrow">DECISION MADE</p>
            <h1>{result.new_memory.title}</h1>
            <p>{result.new_memory.text}</p>
          </div>
          <Avatar size="medium" imageUrl={soul.imageUrl} />
        </div>

        <section className="quest-result-card">
          {result.narrative && (
            <p className="quest-narrative">"{result.narrative}"</p>
          )}

          {hasChanges && (
            <div className="stat-changes">
              <p className="eyebrow">STAT CHANGES</p>
              <div className="stat-changes-grid">
                {Object.entries(changes).map(([stat, value]) => (
                  <div
                    key={stat}
                    className={`stat-change ${value > 0 ? "positive" : "negative"}`}
                  >
                    <span>{stat.toUpperCase()}</span>
                    <b>{value > 0 ? `+${value}` : value}</b>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="reward-row">
            <span>REWARD</span>
            <b>+20 XP</b>
            <span>NEW MEMORY</span>
          </div>

          <p className="quest-daily-note">
            🌅 A new scenario arrives tomorrow. Come back then.
          </p>

          <button
            className="primary-button full"
            style={{ marginTop: "20px" }}
            onClick={() => navigate("dashboard")}
          >
            RETURN TO SOUL →
          </button>
        </section>
      </div>
    );
  }

  // ---------- Loading view ----------
  if (loadingQuest) {
    return (
      <div className="page">
        <div className="page-title">
          <div>
            <p className="eyebrow">DAILY QUEST</p>
            <h1>Loading...</h1>
          </div>
          <Avatar size="medium" imageUrl={soul.imageUrl} />
        </div>
        <div className="quest-loading">
          <span className="spinner" />
          <span>Fetching today's scenario...</span>
        </div>
      </div>
    );
  }

  // ---------- Already completed view ----------
  if (questData?.completed) {
    return (
      <div className="page">
        <div className="page-title">
          <div>
            <p className="eyebrow">{questData.weekday} QUEST</p>
            <h1>{questData.quest.title}</h1>
            <p>Completed today. Return tomorrow for a new dilemma.</p>
          </div>
          <Avatar size="medium" imageUrl={soul.imageUrl} />
        </div>

        <section className="quest-card quest-completed">
          <span className="quest-number">✓</span>
          <p className="eyebrow">QUEST COMPLETE</p>
          <h2>Giga has made today's choice.</h2>
          <p>
            The next scenario unlocks at midnight. In the meantime, chat
            with your Soul or test it in the Arena.
          </p>

          <div className="quest-completed-actions">
            <button
              className="primary-button"
              onClick={() => navigate("talk")}
            >
              TALK TO GIGA
            </button>
            <button
              className="secondary-button"
              onClick={() => navigate("arena")}
            >
              ENTER ARENA →
            </button>
          </div>
        </section>
      </div>
    );
  }

  // ---------- Normal choice view ----------
  const quest = questData?.quest;

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <p className="eyebrow">{questData?.weekday} QUEST</p>
          <h1>{quest?.title}</h1>
          <p>A decision changes who your Soul becomes.</p>
        </div>
        <Avatar size="medium" imageUrl={soul.imageUrl} />
      </div>

      <section className="quest-card">
        <span className="quest-number">
          {String((questData?.weekday?.charAt(0) || "M")).toUpperCase()}
        </span>
        <p className="eyebrow">SCENARIO</p>
        <h2>{quest?.scenario}</h2>
        <p>{quest?.description}</p>

        <div className="choice-grid">
          {quest?.choices.map((choice) => (
            <button
              key={choice.value}
              onClick={() => handleChoice(choice.value)}
              disabled={submitting}
            >
              <b>{choice.label}</b>
              <span>{choice.hint}</span>
            </button>
          ))}
        </div>

        {submitting && (
          <div className="quest-loading">
            <span className="pulse" />
            <span>{soul.name} is deciding...</span>
          </div>
        )}
      </section>

      <div className="reward-row">
        <span>REWARD</span>
        <b>+20 XP</b>
        <span>NEW MEMORY</span>
      </div>
    </div>
  );
}