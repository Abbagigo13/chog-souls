// src/pages/CHOG.jsx
import { useEffect, useState } from "react";
import Avatar from "../components/Avatar";
import { apiChogBalance } from "../lib/api";

export default function CHOG({ soul, wallet, navigate }) {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!wallet) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiChogBalance(wallet);
        if (!cancelled) setBalance(data);
      } catch (err) {
        console.debug("$CHOG balance error:", err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [wallet]);

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <p className="eyebrow">CHOG SOULS ECONOMY</p>
          <h1>The $CHOG Layer.</h1>
          <p>An optional token layer for advanced Souls.</p>
        </div>
        <Avatar size="medium" imageUrl={soul.imageUrl} />
      </div>

      {/* Balance card */}
      <section className="chog-balance-card">
        <div className="chog-balance-left">
          <p className="eyebrow">YOUR $CHOG</p>
          <h2>
            {wallet
              ? loading
                ? "…"
                : balance?.balance !== undefined
                ? balance.balance.toLocaleString()
                : "0"
              : "—"}
          </h2>
          <p className="chog-balance-sub">
            {wallet
              ? "ERC-20 balance on Monad"
              : "Connect your wallet to see your balance"}
          </p>
        </div>

        <div className="chog-balance-right">
          <div className="chog-token-badge">
            <span className="chog-token-icon">$</span>
            <div>
              <b>CHOG</b>
              <span>Utility Token</span>
            </div>
          </div>
        </div>
      </section>

      {wallet && balance && !balance.configured && (
        <p className="chog-notice">
          ⚙️ The $CHOG token contract is not yet configured in this build.
          Balance will show zero until the contract is registered.
        </p>
      )}

      {/* Roadmap */}
      <div className="section-heading">
        <div>
          <p className="eyebrow">TOKEN INTEGRATION</p>
          <h2>What's coming</h2>
        </div>
      </div>

      <section className="chog-roadmap">
        <div className="chog-roadmap-item active">
          <span className="chog-roadmap-dot" />
          <div>
            <b>Hold $CHOG to unlock premium Quests</b>
            <p>Rare scenarios and moral dilemmas reserved for $CHOG holders.</p>
          </div>
          <span className="chog-badge">SOON</span>
        </div>

        <div className="chog-roadmap-item">
          <span className="chog-roadmap-dot" />
          <div>
            <b>Earn $CHOG through Soul progression</b>
            <p>Level up, evolve, and win Arena battles to earn real tokens.</p>
          </div>
          <span className="chog-badge">PLANNED</span>
        </div>

        <div className="chog-roadmap-item">
          <span className="chog-roadmap-dot" />
          <div>
            <b>Stake $CHOG to boost your Soul's stats</b>
            <p>Temporary stat multipliers and unique aura effects.</p>
          </div>
          <span className="chog-badge">PLANNED</span>
        </div>

        <div className="chog-roadmap-item">
          <span className="chog-roadmap-dot" />
          <div>
            <b>Governance: shape the Soul universe</b>
            <p>Vote on new archetypes, quests, and rival generations.</p>
          </div>
          <span className="chog-badge">VISION</span>
        </div>
      </section>

      <div className="chog-footer-note">
        <p>
          $CHOG is optional. Every feature in CHOG SOULS works without holding the
          token — this is a vision layer for advanced players.
        </p>
      </div>
    </div>
  );
}