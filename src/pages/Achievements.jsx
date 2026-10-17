// src/pages/Achievements.jsx
import { useEffect, useState } from "react";
import Avatar from "../components/Avatar";
import { apiAchievements } from "../lib/api";

export default function Achievements({ soul, navigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await apiAchievements();
        if (!cancelled) setData(res);
      } catch (err) {
        console.error("Achievements load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading || !data) {
    return (
      <div className="page">
        <div className="page-title">
          <div>
            <p className="eyebrow">MILESTONES</p>
            <h1>Achievements</h1>
          </div>
          <Avatar size="medium" imageUrl={soul.imageUrl} />
        </div>
        <div className="quest-loading">
          <span className="spinner" />
          <span>Loading achievements...</span>
        </div>
      </div>
    );
  }

  const { achievements, unlocked_count, total_count } = data;
  const overallPercent = Math.round((unlocked_count / total_count) * 100);

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <p className="eyebrow">MILESTONES</p>
          <h1>Achievements</h1>
          <p>Milestones {soul.name} has reached.</p>
        </div>
        <Avatar size="medium" imageUrl={soul.imageUrl} />
      </div>

      {/* Progress summary */}
      <section className="achievements-summary">
        <div className="achievements-summary-left">
          <p className="eyebrow">PROGRESS</p>
          <h2>
            {unlocked_count} <span className="of-total">/ {total_count}</span>
          </h2>
          <p className="achievements-summary-sub">
            {overallPercent}% complete
          </p>
        </div>
        <div className="achievements-summary-bar">
          <div
            className="achievements-summary-fill"
            style={{ width: `${overallPercent}%` }}
          />
        </div>
      </section>

      {/* Gallery */}
      <div className="section-heading">
        <div>
          <p className="eyebrow">GALLERY</p>
          <h2>All milestones</h2>
        </div>
      </div>

      <div className="achievements-gallery">
        {achievements.map((achv) => (
          <div
            key={achv.id}
            className={`achv-card ${achv.unlocked ? "unlocked" : "locked"}`}
          >
            <div className="achv-icon-wrapper">
              <span className="achv-icon">
                {achv.unlocked ? achv.icon : "🔒"}
              </span>
            </div>

            <div className="achv-content">
              <div className="achv-header">
                <h3>{achv.title}</h3>
                {achv.unlocked ? (
                  <span className="achv-badge unlocked-badge">UNLOCKED</span>
                ) : (
                  <span className="achv-badge locked-badge">LOCKED</span>
                )}
              </div>
              <p>{achv.desc}</p>

              {!achv.unlocked && achv.progress_goal > 0 && (
                <div className="achv-progress">
                  <div className="achv-progress-bar">
                    <div
                      className="achv-progress-fill"
                      style={{ width: `${achv.progress_percent}%` }}
                    />
                  </div>
                  <span className="achv-progress-text">
                    {achv.progress_current} / {achv.progress_goal}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        className="primary-button full"
        style={{ marginTop: "30px" }}
        onClick={() => navigate("dashboard")}
      >
        ← BACK TO SOUL
      </button>
    </div>
  );
}