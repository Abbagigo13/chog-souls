// src/components/TopBar.jsx
import Avatar from "./Avatar";

export default function TopBar({
  soul,
  wallet,
  navigate,
  onConnect,
  onReset,
  muted,
  onToggleMute,
}) {
  return (
    <header className="topbar">
      <button className="brand" onClick={() => navigate("dashboard")}>
        <span className="brand-mark">C</span>
        <div className="brand-copy">
          <strong>CHOG</strong>
          <small>SOULS</small>
        </div>
      </button>

      <div className="topbar-actions">
        <button className="mini-soul" onClick={() => navigate("dashboard")}>
          <Avatar size="tiny" imageUrl={soul.imageUrl} />
          <span>{soul.name}</span>
        </button>

        <button
          className="mute-button"
          onClick={onToggleMute}
          title={muted ? "Enable sound" : "Mute sound"}
        >
          {muted ? "🔇" : "🔊"}
        </button>

        {wallet ? (
          <button
            className="wallet-pill"
            onClick={onReset}
            title="Click to reset Soul"
          >
            {wallet.slice(0, 6)}...{wallet.slice(-4)}
          </button>
        ) : (
          <button className="wallet-pill" onClick={onConnect}>
            CONNECT
          </button>
        )}
      </div>
    </header>
  );
}

