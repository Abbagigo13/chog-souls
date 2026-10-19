// src/pages/CHOG.jsx
import { useEffect, useState } from "react";
import Avatar from "../components/Avatar";
import ProgressBar from "../components/ProgressBar";
import {
  isAddress,
  linkWallet,
  unlinkWallet,
  resolvePerkWallet,
  fetchHolderInfo,
  fetchTiers,
} from "../lib/perks";

const SOURCE_LABEL = {
  linked: "Linked address (read-only)",
  connected: "Connected wallet",
  none: "",
};

const formatTokens = (n) =>
  Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
const shortAddress = (a) => `${a.slice(0, 6)}...${a.slice(-4)}`;

export default function CHOG({ soul, wallet }) {
  const [tiers, setTiers] = useState(null);
  const [target, setTarget] = useState({ address: "", source: "none" });
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [linkError, setLinkError] = useState("");
  const [reload, setReload] = useState(0);

  // The tier list (no wallet needed)
  useEffect(() => {
    let cancelled = false;
    fetchTiers()
      .then((data) => {
        if (!cancelled) setTiers(data);
      })
      .catch((err) => console.debug("$CHOG tiers error:", err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  // Balance of the perk wallet
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError("");
      const resolved = await resolvePerkWallet(wallet);
      if (cancelled) return;
      setTarget(resolved);

      if (!resolved.address) {
        setInfo(null);
        return;
      }

      setLoading(true);
      try {
        const data = await fetchHolderInfo(resolved.address, reload > 0);
        if (cancelled) return;
        if (data.ok) {
          setInfo(data);
        } else {
          setInfo(null);
          setError("Could not read the balance right now. Try again in a moment.");
        }
      } catch {
        if (!cancelled) {
          setInfo(null);
          setError("Could not reach the server. Is the backend running?");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [wallet, reload]);

  const handleLink = () => {
    const value = input.trim();
    if (!isAddress(value)) {
      setLinkError("Enter a valid wallet address: 0x followed by 40 characters.");
      return;
    }
    setLinkError("");
    linkWallet(value);
    setInput("");
    setReload((n) => n + 1);
  };

  const handleUnlink = () => {
    unlinkWallet();
    setReload((n) => n + 1);
  };

  const tier = info ? info.tier : null;
  const contract = tiers ? tiers.contract : "0x350035555e10d9afaf1566aaebfced5ba6c27777";

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <p className="eyebrow">CHOG SOULS ECONOMY</p>
          <h1>The $CHOG Layer.</h1>
          <p>Hold $CHOG for a small edge in the Arena. The Chog NFT stays the core.</p>
        </div>
        <Avatar size="medium" imageUrl={soul.imageUrl} />
      </div>

      {/* Balance card */}
      <section className="chog-balance-card">
        <div className="chog-balance-left">
          <p className="eyebrow">YOUR $CHOG</p>
          <h2>
            {target.address ? (loading ? "…" : info ? formatTokens(info.balance) : "—") : "—"}
          </h2>
          <p className="chog-balance-sub">
            {target.address
              ? `${SOURCE_LABEL[target.source]} · ${shortAddress(target.address)}`
              : "Link a wallet below to see your balance"}
          </p>
        </div>

        <div className="chog-balance-right">
          <div className="chog-token-badge">
            <span className="chog-token-icon">$</span>
            <div>
              <b>{tier && tier.tier > 0 ? tier.name.toUpperCase() : "CHOG"}</b>
              <span>{tier ? `Tier ${tier.tier}` : "Utility Token"}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tier progress */}
      {info && tier && (
        <section className="tk-tier-card">
          <div className="tk-tier-top">
            <span className="tk-tier-name">
              {tier.tier > 0 ? `Tier ${tier.tier} · ${tier.name}` : "No holder tier yet"}
            </span>
            <span className="eyebrow">
              {tier.tier > 0
                ? `Signature +${tier.signature_bonus_pct}% · XP +${tier.xp_bonus_pct}%`
                : "Hold $CHOG to unlock perks"}
            </span>
          </div>
          <ProgressBar value={tier.progress} max={100} />
          <p className="tk-tier-sub">
            {tier.next_min
              ? `${formatTokens(info.balance)} / ${formatTokens(tier.next_min)} $CHOG to reach ${tier.next_name}`
              : "Top tier reached."}
          </p>
        </section>
      )}

      {/* Link a wallet */}
      <section className="tk-tier-card">
        <p className="eyebrow">$CHOG WALLET</p>
        <p className="tk-note">
          Link any wallet to check its $CHOG. This is read-only: nothing is signed or
          spent, and a pasted address is not proof of ownership.
        </p>
        <div className="tk-link">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="0x..."
            spellCheck={false}
          />
          <button className="primary-button" onClick={handleLink}>
            LINK WALLET
          </button>
          {target.source === "linked" && (
            <button className="secondary-button" onClick={handleUnlink}>
              UNLINK
            </button>
          )}
        </div>
        {linkError && <div className="tk-error">{linkError}</div>}
        {error && <div className="tk-error">{error}</div>}
      </section>

      {/* Perks */}
      <div className="section-heading">
        <div>
          <p className="eyebrow">HOLDER PERKS</p>
          <h2>What $CHOG does here</h2>
        </div>
      </div>

      <section className="chog-roadmap">
        {tiers &&
          tiers.tiers
            .filter((t) => t.tier > 0)
            .map((t) => {
              const active = tier && tier.tier >= t.tier;
              return (
                <div key={t.tier} className={`chog-roadmap-item ${active ? "active" : ""}`}>
                  <span className="chog-roadmap-dot" />
                  <div>
                    <b>
                      Tier {t.tier} · {t.name} ({formatTokens(t.min)}+ $CHOG)
                    </b>
                    <p>
                      Your Chog's signature move hits {t.signature_bonus_pct}% harder in the
                      Arena, and battles give +{t.xp_bonus_pct}% XP.
                    </p>
                  </div>
                  <span className="chog-badge">{active ? "ACTIVE" : "LOCKED"}</span>
                </div>
              );
            })}

        <div className="chog-roadmap-item">
          <span className="chog-roadmap-dot" />
          <div>
            <b>Premium quests for holders</b>
            <p>Rare scenarios and moral dilemmas reserved for $CHOG holders.</p>
          </div>
          <span className="chog-badge">PLANNED</span>
        </div>
      </section>

      <div className="chog-footer-note">
        <p>
          $CHOG is optional. Everything in CHOG SOULS works without it, and your Chog's
          real traits decide how you fight. Perks apply automatically in the Arena once
          your balance is read.{" "}
          <a
            href={`https://monadscan.com/token/${contract}`}
            target="_blank"
            rel="noreferrer"
          >
            View $CHOG on MonadScan
          </a>
        </p>
      </div>
    </div>
  );
}