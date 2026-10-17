// src/components/ShareCard.jsx
import { forwardRef } from "react";
import { computeRarity } from "../lib/rarity";

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

const ShareCard = forwardRef(function ShareCard({ soul, imageOverride }, ref) {
  const rarity = computeRarity(soul);
  const imageSrc = imageOverride || soul.imageUrl || "/chogs/demo.svg";

  return (
    <div
      ref={ref}
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        padding: "60px 70px",
        boxSizing: "border-box",
        background:
          "radial-gradient(circle at 20% 20%, rgba(131,110,249,0.35), transparent 55%), " +
          "radial-gradient(circle at 85% 80%, rgba(255,217,102,0.15), transparent 55%), " +
          "#0b0814",
        color: "#fff",
        fontFamily: "'Inter', system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.08,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), " +
            "linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
          pointerEvents: "none",
        }}
      />

      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 50 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: "linear-gradient(145deg, #836ef9, #452574)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            fontSize: 22,
            border: "1px solid rgba(199,183,255,0.45)",
          }}
        >
          C
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: "0.2em" }}>CHOG</div>
          <div style={{ fontSize: 10, color: "#9c94aa", letterSpacing: "0.3em", marginTop: 2 }}>
            SOULS
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ display: "flex", gap: 50, alignItems: "center" }}>
        {/* Chog image */}
        <div style={{ width: 320, height: 320, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img
            src={imageSrc}
            alt="Chog"
            style={{ width: "100%", height: "100%", display: "block" }}
          />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.25em", color: "#a996ff", marginBottom: 12 }}>
            LIVING NFT SOUL
          </div>
          <div style={{ fontSize: 72, fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 12 }}>
            {soul.name}
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 20, color: "#c9c0d6" }}>{soul.archetype}</div>
            <div
              style={{
                padding: "5px 14px",
                border: `1px solid ${rarity.color}`,
                color: rarity.color,
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.15em",
              }}
            >
              ◆ {rarity.tier.toUpperCase()}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px 40px" }}>
            {Object.entries(soul.stats || {}).map(([name, value]) => (
              <div key={name}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    color: "#9c94aa",
                    letterSpacing: "0.15em",
                    marginBottom: 6,
                  }}
                >
                  <span>{name.toUpperCase()}</span>
                  <span style={{ color: "#fff", fontWeight: 900 }}>{value}</span>
                </div>
                <div style={{ height: 5, borderRadius: 999, background: "#2a2137", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${value}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #836ef9, #b486ff)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 70,
          right: 70,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 12,
          color: "#9c94aa",
          letterSpacing: "0.15em",
        }}
      >
        <span>LEVEL {soul.level} · {soul.xp}/{soul.xp_to_next_level} XP</span>
        <span>chogsouls.xyz</span>
      </div>
    </div>
  );
});

export default ShareCard;