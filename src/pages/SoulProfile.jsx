// src/pages/SoulProfile.jsx
import Avatar from "../components/Avatar";
import StatBar from "../components/StatBar";
import { computeRarity } from "../lib/rarity";
import { RELATIONSHIP_LABELS } from "../data/demoSouls";

// Fake battle history per rival (used for the demo)
function getMockHistory(rival) {
  const seed = rival.id.charCodeAt(rival.id.length - 1);
  const wins = (seed % 5) + 2;
  const losses = (seed % 3) + 1;
  return { wins, losses, total: wins + losses };
}

export default function SoulProfile({ soul, rival, navigate }) {
  const rarity = computeRarity(rival);
  const relationship = RELATIONSHIP_LABELS[rival.relationship] || RELATIONSHIP_LABELS.acquaintance;
  const history = getMockHistory(rival);

  return (
    <div className="page soul-profile-page">
      {/* Header */}
      <button className="back-button-inline" onClick={() => navigate("leaderboard")}>
        ← BACK TO RANKS
      </button>

      {/* Hero */}
      <section className="soul-profile-hero">
        <div className="soul-profile-avatar-wrap">
          <Avatar size="large" imageUrl={rival.imageUrl} level={rival.level} />
        </div>

        <div className="soul-profile-info">
          <p className="eyebrow">RIVAL SOUL</p>
          <h1>{rival.name}</h1>

          <div className="soul-profile-badges">
            <span className="archetype-chip">{rival.archetype}</span>
            <span
              className="rarity-badge"
              style={{ color: rarity.color, borderColor: rarity.color }}
            >
              ◆ {rarity.tier}
            </span>
            <span
              className="relationship-chip"
              style={{ color: relationship.color, borderColor: relationship.color }}
            >
              {relationship.icon} {relationship.label}
            </span>
          </div>

          <p className="soul-profile-bio">{rival.bio}</p>
        </div>
      </section>

      {/* Traits */}
      <div className="section-heading">
        <div>
          <p className="eyebrow">TRAITS</p>
          <h2>Genetic blueprint</h2>
        </div>
      </div>

      <div className="traits traits-profile">
        {rival.traits.map((trait) => (
          <span key={trait.name}>
            <b>{trait.name}</b> · {trait.value}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div className="section-heading">
        <div>
          <p className="eyebrow">STATS</p>
          <h2>Raw attributes</h2>
        </div>
      </div>

      <section className="stats-grid">
        {Object.entries(rival.stats).map(([name, value]) => (
          <StatBar key={name} label={name.toUpperCase()} value={value} />
        ))}
      </section>

      {/* Battle history */}
      <div className="section-heading">
        <div>
          <p className="eyebrow">BATTLE HISTORY</p>
          <h2>Record in the Arena</h2>
        </div>
      </div>

      <section className="battle-history">
        <div className="battle-history-stat">
          <b>{history.wins}</b>
          <span>WINS</span>
        </div>
        <div className="battle-history-stat">
          <b>{history.losses}</b>
          <span>LOSSES</span>
        </div>
        <div className="battle-history-stat">
          <b>{history.total}</b>
          <span>TOTAL</span>
        </div>
        <div className="battle-history-stat highlight">
          <b>{Math.round((history.wins / history.total) * 100)}%</b>
          <span>WIN RATE</span>
        </div>
      </section>

      {/* Memory glimpse */}
      <div className="section-heading">
        <div>
          <p className="eyebrow">MEMORY BANK</p>
          <h2>What they remember</h2>
        </div>
      </div>

      <div className="profile-memory-list">
        <div className="profile-memory">
          <span className="memory-dot" />
          <div>
            <b>First encounter with the Trickster line</b>
            <p>Crossed paths with a Soul of similar temperament.</p>
          </div>
        </div>
        <div className="profile-memory">
          <span className="memory-dot" />
          <div>
            <b>Latest Arena appearance</b>
            <p>Won {history.wins} bouts, lost {history.losses}.</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <button
        className="primary-button full"
        style={{ marginTop: "30px" }}
        onClick={() => navigate("arena")}
      >
        ⚔️ CHALLENGE IN ARENA
      </button>
    </div>
  );
}