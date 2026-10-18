// src/pages/Arena.jsx
import { useEffect, useState } from "react";
import Avatar from "../components/Avatar";
import { apiRandomRival, apiFightStart, apiFightRound } from "../lib/api";
import { playSound } from "../lib/sound";

// Strike > Outwit > Gamble > Guard > Strike
const MOVES = [
  { id: "strike", icon: "⚔️", name: "Strike", stat: "courage", beats: "Outwit", loses: "Guard" },
  { id: "outwit", icon: "🧠", name: "Outwit", stat: "intelligence", beats: "Gamble", loses: "Strike" },
  { id: "guard", icon: "🛡️", name: "Guard", stat: "loyalty", beats: "Strike", loses: "Gamble" },
  { id: "gamble", icon: "🎲", name: "Gamble", stat: "greed", beats: "Guard", loses: "Outwit" },
];
const MOVE_NAMES = { strike: "Strike", outwit: "Outwit", guard: "Guard", gamble: "Gamble" };

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function HpBar({ hp, max }) {
  const pct = Math.max(0, Math.min(100, (hp / max) * 100));
  const tone = pct > 50 ? "" : pct > 25 ? "mid" : "low";
  return (
    <div className="bt-hp">
      <div className="bt-hp-top">
        <span>HP</span>
        <b>{hp}/{max}</b>
      </div>
      <div className="bt-hp-track">
        <div className={`bt-hp-fill ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function statusLine(fighter) {
  const parts = [];
  if (fighter.burn > 0) parts.push("🔥 BURNING");
  if (fighter.shield > 0) parts.push(`🛡️ BARRIER ${fighter.shield}`);
  if (fighter.dazed) parts.push("💫 DAZED");
  return parts.join(" · ");
}

export default function Arena({ soul, onBattleComplete }) {
  const [rival, setRival] = useState(null);
  const [taunt, setTaunt] = useState("");
  const [loadingRival, setLoadingRival] = useState(true);
  const [battle, setBattle] = useState(null);
  const [lastRound, setLastRound] = useState(null);
  const [busy, setBusy] = useState(false);
  const [clashing, setClashing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Load a rival near our level
  const loadRival = async () => {
    setLoadingRival(true);
    setResult(null);
    setBattle(null);
    setLastRound(null);
    setRival(null);
    setTaunt("");
    setError("");
    try {
      const data = await apiRandomRival();
      setRival(data.rival);
      setTaunt(data.taunt);
    } catch (err) {
      console.error("Rival load error:", err);
      setError("Could not find an opponent. Is the backend running?");
    } finally {
      setLoadingRival(false);
    }
  };

  useEffect(() => {
    loadRival();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = async () => {
    if (!rival || busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await apiFightStart(rival.id);
      setBattle(data.battle);
      setLastRound(null);
      playSound("chatReply");
    } catch (err) {
      console.error("Battle start error:", err);
      setError("Could not start the battle. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleMove = async (move) => {
    if (busy || !battle || battle.finished) return;
    setBusy(true);
    setClashing(true);
    setError("");
    try {
      const [data] = await Promise.all([apiFightRound(battle, move), wait(450)]);
      setClashing(false);
      setBattle(data.battle);
      setLastRound(data.round);
      playSound("chatReply");

      if (data.finished && data.final) {
        setResult(data.final);
        playSound(data.final.won ? "arenaWin" : "arenaLose");
        if (onBattleComplete) onBattleComplete(data.final);
      }
    } catch (err) {
      console.error("Round error:", err);
      setClashing(false);
      setError(err.message || "That round failed. Try again.");
    } finally {
      setBusy(false);
    }
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

  if (!rival) {
    return (
      <div className="page">
        <div className="page-title">
          <div>
            <p className="eyebrow">CHOG ARENA</p>
            <h1>Test the Soul.</h1>
            <p>No opponent could be found.</p>
          </div>
          <Avatar size="medium" imageUrl={soul.imageUrl} />
        </div>
        {error && <div className="bt-error">{error}</div>}
        <button className="primary-button full" onClick={loadRival}>
          TRY AGAIN →
        </button>
      </div>
    );
  }

  const me = battle ? battle.player : null;
  const foe = battle ? battle.rival : null;
  const fighting = battle && !result;

  const moveLabel = (who, entry) => {
    if (who === "p") {
      return entry.p_move === "special" ? me.special.name : MOVE_NAMES[entry.p_move];
    }
    return entry.r_move === "special" ? foe.special.name : MOVE_NAMES[entry.r_move];
  };

  const intent = () => {
    if (!battle || !battle.hint) return "";
    if (battle.hint === "special") {
      return `${foe.name} is charging ${foe.special.name}!`;
    }
    return `${foe.name} looks ready to ${MOVE_NAMES[battle.hint]}.`;
  };

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <p className="eyebrow">CHOG ARENA</p>
          <h1>Test the Soul.</h1>
          <p>Read your rival, pick your move, use your Chog's signature.</p>
        </div>
        <Avatar size="medium" imageUrl={soul.imageUrl} />
      </div>

      {/* Fight stage */}
      <section className={`arena-card ${clashing ? "arena-clash" : ""}`}>
        <div className={`fighter fighter-left ${busy && fighting ? "fighter-attack" : ""}`}>
          <Avatar size="medium" level={soul.level} imageUrl={soul.imageUrl} />
          <h3>{soul.name}</h3>
          <span>YOUR SOUL</span>
          {me && <HpBar hp={me.hp} max={me.max_hp} />}
          {me && <div className="bt-status">{statusLine(me)}</div>}
          {lastRound && fighting && !busy && (
            <>
              {lastRound.r_dealt > 0 && (
                <span key={`pd${lastRound.round}`} className="bt-float bt-float-hit">
                  -{lastRound.r_dealt}
                </span>
              )}
              {lastRound.p_healed > 0 && (
                <span key={`ph${lastRound.round}`} className="bt-float bt-float-heal">
                  +{lastRound.p_healed}
                </span>
              )}
            </>
          )}
        </div>

        <div className="versus">{clashing ? "💥" : "VS"}</div>

        <div className={`fighter fighter-right ${busy && fighting ? "fighter-defend" : ""}`}>
          <Avatar size="medium" imageUrl={rival.imageUrl} />
          <h3>{rival.name}</h3>
          <span>{rival.archetype.toUpperCase()}</span>
          {foe && <HpBar hp={foe.hp} max={foe.max_hp} />}
          {foe && <div className="bt-status">{statusLine(foe)}</div>}
          {lastRound && fighting && !busy && (
            <>
              {lastRound.p_dealt > 0 && (
                <span key={`rd${lastRound.round}`} className="bt-float bt-float-hit">
                  -{lastRound.p_dealt}
                </span>
              )}
              {lastRound.r_healed > 0 && (
                <span key={`rh${lastRound.round}`} className="bt-float bt-float-heal">
                  +{lastRound.r_healed}
                </span>
              )}
            </>
          )}
        </div>
      </section>

      {error && <div className="bt-error">{error}</div>}

      {/* Before the fight: taunt + how it works */}
      {!battle && (
        <>
          <section className="rival-taunt">
            <div className="rival-taunt-avatar">
              <Avatar size="tiny" imageUrl={rival.imageUrl} />
            </div>
            <div className="rival-taunt-bubble">
              <p className="rival-taunt-name">{rival.name.toUpperCase()}</p>
              <p className="rival-taunt-text">"{taunt}"</p>
            </div>
          </section>

          <p className="bt-sig-info">
            Each round, pick a move. Strike beats Outwit, Outwit beats Gamble, Gamble beats
            Guard, Guard beats Strike. Your signature move comes from your Chog's real traits.
          </p>

          <button className="primary-button full" onClick={handleStart} disabled={busy}>
            {busy ? "ENTERING THE ARENA..." : "START BATTLE →"}
          </button>
        </>
      )}

      {/* During the fight */}
      {fighting && (
        <>
          <div className="bt-banner">
            <span className="bt-round">
              ROUND {battle.round} OF {battle.max_rounds}
            </span>
            <div className="bt-intel">
              {intent()}
              <small>
                {foe.name} favours {MOVE_NAMES[battle.leans]}. Intel is not always right.
              </small>
            </div>
          </div>
          <p className="bt-sig-info">
            Their signature: {foe.special.name} ({foe.special.source})
          </p>

          <div className="bt-moves">
            {MOVES.map((m) => (
              <button
                key={m.id}
                className="bt-move"
                disabled={busy}
                onClick={() => handleMove(m.id)}
              >
                <div className="bt-move-title">
                  <span>{m.icon}</span>
                  {m.name}
                </div>
                <div className="bt-move-stat">
                  {m.stat.toUpperCase()} {me.stats[m.stat]}
                </div>
                <div className="bt-move-rel">
                  Beats <b>{m.beats}</b> · loses to <i>{m.loses}</i>
                </div>
              </button>
            ))}

            <button
              className="bt-move bt-move-special"
              disabled={busy || me.special_used}
              onClick={() => handleMove("special")}
            >
              <div className="bt-move-title">
                <span>✨</span>
                {me.special.name}
              </div>
              <div className="bt-move-stat">FROM {me.special.source.toUpperCase()}</div>
              <div className="bt-move-rel">
                {me.special_used ? "Already used this battle" : me.special.desc}
              </div>
            </button>
          </div>
        </>
      )}

      {/* Round log */}
      {battle && battle.history.length > 0 && (
        <section className="bt-log">
          {[...battle.history].reverse().map((h) => {
            const tone =
              h.p_dealt > h.r_dealt ? "bt-log-win" : h.p_dealt < h.r_dealt ? "bt-log-lose" : "";
            const extras = [];
            if (h.p_healed) extras.push(`you healed ${h.p_healed}`);
            if (h.r_healed) extras.push(`${foe.name} healed ${h.r_healed}`);
            if (h.p_burn) extras.push(`burn hit you for ${h.p_burn}`);
            if (h.r_burn) extras.push(`burn hit ${foe.name} for ${h.r_burn}`);
            (h.notes || []).forEach((n) => extras.push(n));
            return (
              <div key={h.round} className={`bt-log-row ${tone}`}>
                <span className="bt-log-round">R{h.round}</span>
                <div className="bt-log-body">
                  <b>{h.headline}</b>
                  <small>
                    You: {moveLabel("p", h)} · {foe.name}: {moveLabel("r", h)}. You dealt{" "}
                    {h.p_dealt}, took {h.r_dealt}
                    {extras.length ? ` (${extras.join("; ")})` : ""}
                  </small>
                </div>
              </div>
            );
          })}
        </section>
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
            <span>HP LEFT</span>
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

          {result.xp_breakdown && (
            <div className="bt-xp-list">
              {result.xp_breakdown.map((row) => (
                <div key={row.label}>
                  <span>{row.label}</span>
                  <b>+{row.xp} XP</b>
                </div>
              ))}
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
            <button className="primary-button" onClick={loadRival}>
              FIGHT ANOTHER →
            </button>
          </div>
        </section>
      )}
    </div>
  );
}