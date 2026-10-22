// src/pages/Leaderboard.jsx
import Avatar from "../components/Avatar";
import { computeRarity, computePowerScore } from "../lib/rarity";
import { RIVAL_SOULS } from "../data/demoSouls";

export default function Leaderboard({ soul, navigate, onViewProfile }) {
  // Combine the sample Souls with the player's Soul
  const allSouls = [...RIVAL_SOULS, soul].map((s) => ({
    ...s,
    _rarity: computeRarity(s),
    _power: computePowerScore(s),
    _isMine: s.id === soul.id,
  }));

  // Sort by power score descending
  const ranked = allSouls.sort((a, b) => b._power - a._power);

  // Only a verified owner gets a rank; a visitor is listed but unranked
  const isVisitor = !soul.verified;
  const myRank = ranked.findIndex((s) => s._isMine) + 1;

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <p className="eyebrow">GLOBAL RANKINGS</p>
          <h1>Who burns brightest.</h1>
          <p>Souls are ranked by level, rarity, and victories.</p>
        </div>
      </div>

      <section className="your-rank-card">
        <div className="rank-info">
          <p className="eyebrow">YOUR RANK</p>
          {isVisitor ? (
            <>
              <h2 className="unranked">UNRANKED</h2>
              <p className="rank-of">Verify you own this Chog to rank</p>
            </>
          ) : (
            <>
              <h2>#{myRank}</h2>
              <p className="rank-of">of {ranked.length} Souls</p>
            </>
          )}
        </div>
        <div className="rank-soul">
          <Avatar size="medium" imageUrl={soul.imageUrl} level={soul.level} />
          <div>
            <b>{soul.name}</b>
            <span style={{ color: computeRarity(soul).color }}>
              {computeRarity(soul).tier}
            </span>
          </div>
        </div>
      </section>

      <div className="section-heading">
        <div>
          <p className="eyebrow">TOP SOULS</p>
          <h2>Leaderboard</h2>
        </div>
      </div>

      <div className="leaderboard-list">
        {ranked.map((entry, index) => (
          <div
            key={entry.id}
            className={`leaderboard-row ${entry._isMine ? "mine" : ""} ${!entry._isMine ? "clickable" : ""}`}
            onClick={() => {
              if (entry._isMine) {
                navigate("dashboard");
              } else if (onViewProfile) {
                onViewProfile(entry);
              }
            }}
          >
            <div className={`rank-number rank-${index + 1} ${entry._isMine && isVisitor ? "unranked" : ""}`}>
              {entry._isMine && isVisitor ? "—" : index + 1}
            </div>
            <Avatar size="tiny" imageUrl={entry.imageUrl} />
            <div className="leaderboard-info">
              <b>{entry.name}</b>
              <span>
                {entry.archetype}
                {entry._isMine ? (isVisitor ? " · Visitor" : " · Owner") : ""}
              </span>
            </div>
            <div className="leaderboard-stats">
              <span className="rarity-tag" style={{ color: entry._rarity.color }}>
                {entry._rarity.tier}
              </span>
              <b>LVL {entry.level}</b>
              <span className="power-score">{entry._power}</span>
            </div>
            {!entry._isMine && (
              <span className="leaderboard-arrow">→</span>
            )}
          </div>
        ))}

        <p className="leaderboard-note">
          Sample Souls use real Chog artwork and traits; their levels and stats
          are simulated for this demo. Only verified owners are ranked.
        </p>
      </div>
    </div>
  );
}