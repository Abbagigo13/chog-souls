// src/pages/Dashboard.jsx
import { useRef, useState } from "react";
import Avatar from "../components/Avatar";
import ProgressBar from "../components/ProgressBar";
import StatBar from "../components/StatBar";
import ShareCard from "../components/ShareCard";
import { computeRarity } from "../lib/rarity";
import { resolveImage } from "../lib/chogImage";
import { renderToPng, downloadPng, shareToX, imageToPngDataUrl } from "../lib/shareImage";
import { playSound } from "../lib/sound";

export default function Dashboard({ soul, navigate }) {
  const rarity = computeRarity(soul);

  const cardRef = useRef(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareImage, setShareImage] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [imageOverride, setImageOverride] = useState(null);

  const handleShare = async () => {
    if (!cardRef.current) return;
    setGenerating(true);
    try {
      // Step 1: turn the Chog picture into a PNG so html2canvas can render it
      let pngOverride = null;
      const imagePath = resolveImage(soul.imageUrl);
      if (imagePath) {
        try {
          pngOverride = await imageToPngDataUrl(imagePath, 400);
        } catch (imageErr) {
          console.warn("Could not prepare the Chog picture, continuing without it:", imageErr);
        }
      }

      // Step 2: set the PNG and wait for React to re-render
      setImageOverride(pngOverride);
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Step 3: capture the card
      const dataUrl = await renderToPng(cardRef.current);
      setShareImage(dataUrl);
      setShareModalOpen(true);
    } catch (err) {
      console.error("Share card render failed:", err);
      alert("Could not generate share card. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!shareImage) return;
    downloadPng(shareImage, `${soul.name.replace(/[^a-z0-9]/gi, "_")}_soul.png`);
    playSound("chatReply");
  };

  const handleShareToX = () => {
    shareToX(soul);
  };

  return (
    <div className="page">
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">
            YOUR CHOG SOUL
            {soul.tokenId ? <span className="token-id">· #{soul.tokenId}</span> : null}
          </p>
          <h1>{soul.name}</h1>
          <div className="archetype-row">
            <p className="archetype">{soul.archetype}</p>
            <span className="verified-badge">✓ ON-CHAIN</span>
            <span
              className="rarity-badge"
              style={{ color: rarity.color, borderColor: rarity.color }}
            >
              ◆ {rarity.tier}
            </span>
          </div>
          <div className="traits">
            {soul.traits.map((trait) => (
              <span key={trait.name}>
                {trait.name}: {trait.value}
              </span>
            ))}
          </div>
        </div>
        <div className="verified-avatar">
          <Avatar size="large" level={soul.level} imageUrl={soul.imageUrl} />
        </div>
      </section>

      <section className="xp-card">
        <div className="xp-row">
          <span>SOUL LEVEL {soul.level}</span>
          <span>{soul.xp}/{soul.xp_to_next_level} XP</span>
        </div>
        <ProgressBar value={soul.xp} max={soul.xp_to_next_level} />
      </section>

      <div className="section-heading">
        <div>
          <p className="eyebrow">CURRENT STATE</p>
          <h2>{soul.mood}</h2>
        </div>
        <div className="state-badges">
          {soul.streak > 0 && (
            <span className="streak-badge">
              🔥 DAY {soul.streak}
            </span>
          )}
          <span className="alive">● ALIVE</span>
        </div>
      </div>

      <section className="stats-grid">
        {Object.entries(soul.stats).map(([name, value]) => (
          <StatBar key={name} label={name.toUpperCase()} value={value} />
        ))}
      </section>

      <section className="action-grid">
        <button onClick={() => navigate("talk")}><b>TALK</b><span>Build a memory</span></button>
        <button onClick={() => navigate("quest")}><b>QUEST</b><span>Make a choice</span></button>
        <button onClick={() => navigate("arena")}><b>ARENA</b><span>Test your Soul</span></button>
        <button onClick={() => navigate("timeline")}><b>HISTORY</b><span>See what changed</span></button>
      </section>

      <section className="share-section">
        <div>
          <p className="eyebrow">SHARE YOUR SOUL</p>
          <h3>Made it this far? Show it off.</h3>
          <p>Generate a card with your Soul's stats, rarity, and level.</p>
        </div>
        <button
          className="primary-button share-button"
          onClick={handleShare}
          disabled={generating}
        >
          {generating ? "GENERATING..." : "SHARE SOUL →"}
        </button>
      </section>

      <section className="import-prompt">
        <div>
          <p className="eyebrow">SWITCH CHOG</p>
          <h3>Playing with a different Chog?</h3>
          <p>
            Import another Chog. Each Chog keeps its own progress, so you can come back to this one.
          </p>
        </div>
        <button className="secondary-button" onClick={() => navigate("import")}>
          IMPORT ANOTHER CHOG →
        </button>
      </section>

      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">ACHIEVEMENTS</p>
            <h2>{soul.achievements?.length || 0} unlocked</h2>
          </div>
          <button
            className="text-button"
            onClick={() => navigate("achievements")}
          >
            VIEW GALLERY →
          </button>
        </div>

        {soul.achievements && soul.achievements.length > 0 ? (
          <div className="achievements-grid">
            {soul.achievements.slice(-4).map((id) => (
              <div key={id} className="achievement-badge">
                <span className="achievement-icon">🏆</span>
                <span className="achievement-id">
                  {id.replace(/_/g, " ").toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state-text">
            No achievements yet. Play quests, win battles, and build a streak to
            unlock them.
          </p>
        )}
      </section>
      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">MEMORY</p>
            <h2>What {soul.name} remembers</h2>
          </div>
          <button className="text-button" onClick={() => navigate("timeline")}>
            VIEW ALL →
          </button>
        </div>

        <div className="memory-list">
          {soul.memories.slice(-3).reverse().map((memory) => (
            <div className="memory-line" key={memory.id}>
              <span className="memory-dot" />
              <div>
                <b>{memory.title}</b>
                <p>{memory.text}</p>
              </div>
              <span>{memory.importance}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Hidden ShareCard element (off-screen) */}
      <div
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          pointerEvents: "none",
        }}
      >
        <ShareCard ref={cardRef} soul={soul} imageOverride={imageOverride} />
      </div>

      {/* Share Modal */}
      {shareModalOpen && shareImage && (
        <div className="share-modal-overlay" onClick={() => setShareModalOpen(false)}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <div className="share-modal-header">
              <p className="eyebrow">YOUR SOUL CARD</p>
              <button
                className="share-modal-close"
                onClick={() => setShareModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <img src={shareImage} alt="Soul Card" className="share-preview" />

            <div className="share-actions">
              <button className="primary-button" onClick={handleDownload}>
                ⬇ DOWNLOAD PNG
              </button>
              <button className="secondary-button" onClick={handleShareToX}>
                Share to X →
              </button>
            </div>

            <p className="share-hint">
              Tip: Download the PNG, then attach it when posting to X for maximum reach.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}