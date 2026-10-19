// src/pages/Landing.jsx
import { useMemo } from "react";
import Avatar from "../components/Avatar";
import { chogImageUrl } from "../lib/chogImage";

// Real Chogs that take turns in the hero (a new one each visit)
const HERO_CHOGS = [1777, 420, 1411, 556, 88, 1204, 681, 1033];

export default function Landing({ soul, onImport, onConnect, onContinue }) {
  const heroImage = useMemo(
    () => chogImageUrl(HERO_CHOGS[Math.floor(Math.random() * HERO_CHOGS.length)]),
    []
  );

  return (
    <main className="landing">
      <div className="grid-overlay" />

      <section className="landing-inner">
        <p className="landing-kicker">BUILT FOR CHOGATHON</p>

        <div className="landing-avatar-glow">
          <Avatar size="hero" imageUrl={soul ? soul.imageUrl : heroImage} />
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
          {soul ? (
            <>
              <button className="primary-button" onClick={onContinue}>
                CONTINUE WITH {soul.name} →
              </button>
              <button className="secondary-button" onClick={onImport}>
                IMPORT ANOTHER CHOG
              </button>
            </>
          ) : (
            <>
              <button className="primary-button" onClick={onImport}>
                IMPORT YOUR CHOG →
              </button>
              <button className="secondary-button" onClick={onConnect}>
                CONNECT WALLET
              </button>
            </>
          )}
        </div>

        <p className="zero-cost">
          <span /> READ-ONLY · NOTHING IS SIGNED OR SPENT
        </p>

        <footer className="landing-footer">
          <p>Powered by Alibaba Qwen · Built on Monad</p>
        </footer>
      </section>
    </main>
  );
}