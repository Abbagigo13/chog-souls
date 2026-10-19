// src/pages/Import.jsx
import { useState } from "react";
import Avatar from "../components/Avatar";
import { isValidAddress } from "../lib/chogContract";

// Public Chog holders (from MonadScan), so anyone can try the game
const EXAMPLE_HOLDERS = [
  "0x8D5cCD5275141De22650D9570f4f56DB87807425",
  "0x84113421A8a564b594ee9Ae78c875310332d7023",
  "0xE0aBd864b96a6c72d80717A750245A9f60289C93",
];

const shortAddress = (a) => `${a.slice(0, 6)}...${a.slice(-4)}`;

export default function Import({ onImportAddress, onBack, hasSoul }) {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
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
    setStatus("Querying Monad Mainnet... the first lookup can take a few seconds.");

    try {
      const result = await onImportAddress(address.trim());
      if (!result) {
        setError("No Chog found at that address, or it could not be read. Try another wallet.");
        setLoading(false);
        setStatus("");
      }
    } catch (err) {
      setError(err.message || "Import failed.");
      setLoading(false);
      setStatus("");
    }
  };

  return (
    <div className="page">
      {onBack && (
        <button className="back-button-inline" onClick={onBack}>
          ← BACK
        </button>
      )}

      <div className="page-title">
        <div>
          <p className="eyebrow">READ-ONLY MODE</p>
          <h1>Import a Chog.</h1>
          <p>
            Your Chog is your Soul. Paste a wallet address that holds a Chog Genesis NFT.
          </p>
        </div>
        <Avatar size="medium" />
      </div>

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
            <code>0xc96d...3763</code>. No wallet connection or signature required.
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

        <p className="eyebrow" style={{ marginTop: "22px" }}>
          NO CHOG? TRY A PUBLIC HOLDER
        </p>
        <div className="mh-filters">
          {EXAMPLE_HOLDERS.map((holder) => (
            <button
              key={holder}
              className="mh-chip"
              disabled={loading}
              onClick={() => {
                setAddress(holder);
                setError("");
              }}
            >
              {shortAddress(holder)}
            </button>
          ))}
        </div>

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
          {hasSoul ? " Importing a Chog you played before restores its progress." : ""}
        </p>
      </section>
    </div>
  );
}