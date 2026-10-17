// src/pages/Import.jsx
import { useState } from "react";
import Avatar from "../components/Avatar";
import { isValidAddress } from "../lib/chogContract";
import { apiRandomDemoChog } from "../lib/api";

export default function Import({ onImportAddress, onDemoChog }) {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const handleImport = async () => {
    setError("");
    setStatus("");

    if (!isValidAddress(address.trim())) {
      setError("Invalid address. Must be 0x followed by 40 hex characters.");
      return;
    }

    setLoading(true);
    setStatus("Querying Monad Mainnet...");

    try {
      const result = await onImportAddress(address.trim());
      if (!result) {
        setError("No Chog found at that address. Try another wallet or the Demo Pool below.");
        setLoading(false);
        setStatus("");
      }
    } catch (err) {
      setError(err.message || "Import failed.");
      setLoading(false);
      setStatus("");
    }
  };

  const handleTryDemo = async () => {
    setLoadingDemo(true);
    setError("");
    setStatus("Loading demo Chog...");
    try {
      const chog = await apiRandomDemoChog();
      onDemoChog(chog);
    } catch (err) {
      setError("Could not load a demo Chog. Try again.");
      setLoadingDemo(false);
      setStatus("");
    }
  };

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <p className="eyebrow">READ-ONLY MODE</p>
          <h1>Import a Chog.</h1>
          <p>Paste any wallet address that holds a Chog — or try a demo Chog.</p>
        </div>
        <Avatar size="medium" />
      </div>

      {/* Real import */}
      <section className="import-card">
        <div className="import-field">
          <label>WALLET ADDRESS</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x..."
            disabled={loading}
            spellCheck={false}
          />
          <p className="field-hint">
            Reads from Chog Genesis on Monad Mainnet — contract{" "}
            <code>0xc96d...3763</code>. No wallet connection required.
          </p>
        </div>

        {error && <div className="import-error">{error}</div>}
        {status && !error && (
          <div className="import-status">
            <span className="spinner" />
            <span>{status}</span>
          </div>
        )}

        <button
          className="primary-button full"
          onClick={handleImport}
          disabled={loading || !address.trim()}
        >
          {loading ? "READING CHOG..." : "IMPORT CHOG →"}
        </button>

        <p className="import-note">
          💡 Find any Chog holder on{" "}
          <a
            href="https://opensea.io/collection/chog-genesis"
            target="_blank"
            rel="noreferrer"
          >
            OpenSea
          </a>{" "}
          or{" "}
          <a
            href="https://monadscan.com/token/0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763"
            target="_blank"
            rel="noreferrer"
          >
            MonadScan
          </a>
          , click on a Chog, copy the owner address.
        </p>
      </section>

      {/* Divider */}
      <div className="import-divider">
        <span>OR</span>
      </div>

      {/* Demo pool */}
      <section className="import-demo-card">
        <div>
          <p className="eyebrow">FAST TRACK</p>
          <h3>Try a Demo Chog.</h3>
          <p>
            Instantly bind a pre-built Chog with unique traits. No wallet required.
            Perfect for exploring the app before you own a real Chog.
          </p>
        </div>
        <button
          className="secondary-button import-demo-button"
          onClick={handleTryDemo}
          disabled={loadingDemo}
        >
          {loadingDemo ? "LOADING..." : "🎲 TRY A DEMO CHOG"}
        </button>
        <p className="import-demo-note">
          ⚠️ Demo Chogs are marked as <b>Unranked</b> on the Leaderboard and earn
          <b> 50% XP</b>. Import a real Chog to unlock full progression.
        </p>
      </section>
    </div>
  );
}