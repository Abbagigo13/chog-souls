// src/pages/Landing.jsx
import Avatar from "../components/Avatar";

export default function Landing({ onDemo, onConnect }) {
  return (
    <main className="landing">
      <div className="grid-overlay" />

      <section className="landing-inner">
        <p className="landing-kicker">BUILT FOR CHOGATHON</p>

        <div className="landing-avatar-glow">
          <Avatar size="hero" />
        </div>

        <p className="hero-label">YOUR NFT IS ALIVE.</p>

        <h1 className="hero-title">
          CHOG<br /><span>SOULS</span>
        </h1>

        <p className="hero-sub">
          Living NFTs that remember you.
          <br />
          Talk. Choose. Evolve. Return.
        </p>

        <div className="landing-actions">
          <button className="primary-button" onClick={onDemo}>
            AWAKEN A SOUL →
          </button>
          <button className="secondary-button" onClick={onConnect}>
            CONNECT WALLET
          </button>
        </div>

        <p className="zero-cost">
          <span /> ZERO-COST DEMO MODE · NO WALLET REQUIRED
        </p>

        {/* Feature highlights */}
        <section className="landing-features">
          <div className="landing-feature">
            <span className="landing-feature-icon">🧠</span>
            <h3>AI-Powered Personality</h3>
            <p>Every Soul thinks, remembers, and evolves through conversation.</p>
          </div>
          <div className="landing-feature">
            <span className="landing-feature-icon">⚔️</span>
            <h3>Live Arena Battles</h3>
            <p>Stats, traits, and history determine every fight.</p>
          </div>
          <div className="landing-feature">
            <span className="landing-feature-icon">🎭</span>
            <h3>Archetype Evolution</h3>
            <p>Your choices reshape your Soul's identity over time.</p>
          </div>
          <div className="landing-feature">
            <span className="landing-feature-icon">🏆</span>
            <h3>Global Rankings</h3>
            <p>Compete against nine rival Souls for the top spot.</p>
          </div>
        </section>

        <footer className="landing-footer">
          <p>Powered by Alibaba Qwen · Built on Monad</p>
        </footer>
      </section>
    </main>
  );
}