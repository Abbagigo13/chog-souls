// src/pages/Arena.jsx
import { useEffect, useState } from "react";
import Avatar from "../components/Avatar";
import { apiRandomRival, apiBattle } from "../lib/api";
import { playSound } from "../lib/sound";

export default function Arena({ soul, onBattleComplete }) {
  const [rival, setRival] = useState(null);
  const [taunt, setTaunt] = useState("");
  const [loadingRival, setLoadingRival] = useState(true);
  const [fighting, setFighting] = useState(false);
  const [clashing, setClashing] = useState(false);
  const [result, setResult] = useState(null);

  // Load a random rival on mount
  const loadRival = async () => {
    setLoadingRival(true);
    setResult(null);
    setRival(null);
    setTaunt("");
    try {
      const data = await apiRandomRival();
      setRival(data.rival);
      setTaunt(data.taunt);
    } catch (err) {
      console.error("Rival load error:", err);
      setTaunt("Your opponent approaches.");
    } finally {
      setLoadingRival(false);
    }
  };

  useEffect(() => {
    loadRival();
  }, []);

  // The fight animation sequence
  const handleStart = async () => {
    if (!rival) return;
    setFighting(true);
    setResult(null);
    setClashing(false);

    // 1. Lunging animation begins (CSS class adds this)
    await new Promise((r) => setTimeout(r, 400));

    // 2. Clash effect
    setClashing(true);
    playSound("arenaWin"); // impact sound (or a new "clash" sound)
    await new Promise((r) => setTimeout(r, 500));

    // 3. Fetch result from backend (this is where the AI runs)
    try {
      const data = await apiBattle(rival.id);
      setResult(data);
      setClashing(false);
      setFighting(false);

      // 4. Play outcome sound
      if (data?.won) playSound("arenaWin");
      else playSound("arenaLose");

      // 5. Bubble up to App if needed (for updating soul)
      if (onBattleComplete) onBattleComplete(data);
    } catch (err) {
      console.error("Battle error:", err);
      setClashing(false);
      setFighting(false);
    }
  };

  // Reset for another fight
  const handleReset = async () => {
    setResult(null);
    setFighting(false);
    setClashing(false);
    await loadRival();
  };

  // --- Loading state ---
  if (loadingRival) {
    return (
      <div className="page">
        <div className="page-title">
          <div>
            <p className="eyebrow">CHOG ARENA</p>
            <h1>Test the Soul.</h1>
            <p>Finding your next opponent...</p>
          </div>
          <Avatar size="medium" imageUrl={soul.imageUrl} />
        </div>
        <div className="quest-loading">
          <span className="spinner" />
          <span>Summoning a rival...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <p className="eyebrow">CHOG ARENA</p>
          <h1>Test the Soul.</h1>
          <p>Stats, personality and level influence the battle.</p>
        </div>
        <Avatar size="medium" imageUrl={soul.imageUrl} />
      </div>

      {/* Fight stage */}
      <section className={`arena-card ${clashing ? "arena-clash" : ""}`}>
        <div className={`fighter fighter-left ${fighting ? "fighter-attack" : ""}`}>
          <Avatar size="medium" level={soul.level} imageUrl={soul.imageUrl} />
          <h3>{soul.name}</h3>
          <span>YOUR SOUL</span>
        </div>

        <div className="versus">
          {clashing ? "💥" : "VS"}
        </div>

        <div className={`fighter fighter-right ${fighting ? "fighter-defend" : ""}`}>
          <Avatar size="medium" imageUrl={rival.imageUrl} />
          <h3>{rival.name}</h3>
          <span>{rival.archetype.toUpperCase()}</span>
        </div>
      </section>

      {/* Pre-battle taunt */}
      {!result && !fighting && (
        <section className="rival-taunt">
          <div className="rival-taunt-avatar">
            <Avatar size="tiny" imageUrl={rival.imageUrl} />
          </div>
          <div className="rival-taunt-bubble">
            <p className="rival-taunt-name">{rival.name.toUpperCase()}</p>
            <p className="rival-taunt-text">"{taunt}"</p>
          </div>
        </section>
      )}

      {/* Battle button */}
      {!result && (
        <button
          className="primary-button full"
          onClick={handleStart}
          disabled={fighting}
        >
          {fighting ? "BATTLING..." : "START BATTLE →"}
        </button>
      )}

      {/* Result */}
      {result && (
        <section
          className={`battle-result ${result.won ? "result-win" : "result-lose"}`}
        >
          <span className={result.won ? "win" : "loss"}>
            {result.won ? "⚔️ VICTORY" : "💀 DEFEAT"}
          </span>

          <div className="battle-score">
            <b>{result.soul_power}</b>
            <span>—</span>
            <b>{result.rival_power}</b>
          </div>

          <p style={{ marginTop: "16px", fontStyle: "italic" }}>
            "{result.narrative}"
          </p>

          {result.post_battle_line && (
            <div className="rival-taunt post-battle">
              <div className="rival-taunt-avatar">
                <Avatar size="tiny" imageUrl={rival.imageUrl} />
              </div>
              <div className="rival-taunt-bubble">
                <p className="rival-taunt-name">{rival.name.toUpperCase()}</p>
                <p className="rival-taunt-text">"{result.post_battle_line}"</p>
              </div>
            </div>
          )}

          <div className="battle-rewards">
            <span>+{result.xp_gained} XP</span>
            {result.is_demo_penalty && (
              <span className="demo-penalty">DEMO × 0.5</span>
            )}
            {result.leveled_up && <span className="level-up">⬆ LEVEL UP!</span>}
          </div>

          <div className="battle-actions">
            <button className="primary-button" onClick={handleReset}>
              FIGHT ANOTHER →
            </button>
          </div>
        </section>
      )}
    </div>
  );
}