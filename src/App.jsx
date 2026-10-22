// src/App.jsx
import { useEffect, useState, useRef } from "react";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Talk from "./pages/Talk";
import Quest from "./pages/Quest";
import Arena from "./pages/Arena";
import Timeline from "./pages/Timeline";
import Import from "./pages/Import";
import Leaderboard from "./pages/Leaderboard";
import CHOG from "./pages/CHOG";
import Achievements from "./pages/Achievements";
import SoulProfile from "./pages/SoulProfile";
import Onboarding, { shouldShowOnboarding } from "./components/Onboarding";
import TopBar from "./components/TopBar";
import BottomNav from "./components/BottomNav";
import { useSoul, getSavedSoul } from "./hooks/useSoul";
import { connectWallet } from "./lib/wallet";
import { verifyOwnership } from "./lib/verify";
import { getChogStats } from "./lib/chogContract";
import { decodeChogTraits } from "./lib/traitDecoder";
import { apiChat, apiChoice, apiDailyCheck } from "./lib/api";
import { playSound, toggleMute, isMuted } from "./lib/sound";

// Extracts the image URL from Chog metadata (handles IPFS + HTTP).
// Avatar.jsx tries other IPFS gateways if this one fails to load.
function extractImageUrl(metadata) {
  if (!metadata || !metadata.image) return null;
  const img = metadata.image;
  if (img.startsWith("ipfs://")) {
    return img.replace("ipfs://", "https://ipfs.io/ipfs/");
  }
  return img;
}

export default function App() {
  // ============================================================
  // ALL HOOKS MUST BE DECLARED FIRST — BEFORE ANY RETURNS.
  // ============================================================
  const [page, setPage] = useState("landing");
  const { soul, updateSoul, loading } = useSoul();
  const [wallet, setWallet] = useState(null);
  const [toast, setToast] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [levelUpEvent, setLevelUpEvent] = useState(null);
  const [evolutionEvent, setEvolutionEvent] = useState(null);
  const [muted, setMutedState] = useState(isMuted());
  const [selectedRival, setSelectedRival] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // --- Toast auto-clear ---
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // --- Level up sound + auto-clear ---
  useEffect(() => {
    if (!levelUpEvent) return;
    playSound("levelUp");
    const t = setTimeout(() => setLevelUpEvent(null), 4000);
    return () => clearTimeout(t);
  }, [levelUpEvent]);

  // --- Evolution sound + auto-clear ---
  useEffect(() => {
    if (!evolutionEvent) return;
    playSound("evolution");
    const t = setTimeout(() => setEvolutionEvent(null), 4500);
    return () => clearTimeout(t);
  }, [evolutionEvent]);

  // --- Daily visit check: once per Soul per session ---
  const dailyCheckedFor = useRef(null);
  const activeSoulId = soul ? soul.id : null;
  useEffect(() => {
    if (!activeSoulId) return;
    if (dailyCheckedFor.current === activeSoulId) return;

    dailyCheckedFor.current = activeSoulId;
    const checkedId = activeSoulId;
    let cancelled = false;

    async function checkDaily() {
      try {
        const data = await apiDailyCheck();
        if (cancelled) return;

        // Only apply the result if it belongs to the Soul we checked
        if (data.soul && data.soul.id === checkedId) updateSoul(data.soul);

        if (data.visit?.rewarded) {
          setToast(`🔥 Day ${data.visit.streak} streak · +${data.visit.xp} XP`);
        }

        if (data.achievements_unlocked?.length > 0) {
          setTimeout(() => {
            setToast(`🏆 Achievement unlocked!`);
          }, 3000);
        }
      } catch (err) {
        console.debug("Daily check skipped:", err.message);
      }
    }

    checkDaily();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSoulId]);

  // --- Onboarding trigger (first visit with a Soul) ---
  useEffect(() => {
    if (!activeSoulId) return;
    if (shouldShowOnboarding()) {
      setShowOnboarding(true);
    }
  }, [activeSoulId]);

  // ============================================================
  // HANDLERS (functions, not hooks — safe after useEffect blocks)
  // ============================================================

  const navigate = (target) => setPage(target);

  const handleToggleMute = () => {
    const newMuted = toggleMute();
    setMutedState(newMuted);
    setToast(newMuted ? "Sound off" : "Sound on");
  };

  // Turn a wallet address into a Soul: the Chog it holds becomes the Soul
  async function handleImportAddress(address, network = "mainnet") {
    try {
      setToast("Reading Chog from Monad Mainnet...");
      const result = await getChogStats(address, network);

      if (!result) {
        setToast("No Chog found at that address.");
        return null;
      }

      const decoded = decodeChogTraits(result.metadata);
      const imageUrl = extractImageUrl(result.metadata);
      const id = `chog-${result.tokenId}`;
      const saved = getSavedSoul(id);

      let nextSoul;
      if (saved) {
        // A Chog we already know: keep its progress, refresh its look
        nextSoul = {
          ...saved,
          name: decoded.name,
          traits: decoded.traits,
          imageUrl: imageUrl,
          image_url: imageUrl || "",
          tokenId: result.tokenId,
          token_id: result.tokenId,
          is_demo: false,
        };
      } else {
        nextSoul = {
          id,
          name: decoded.name,
          archetype: "The Awakened",
          mood: "Curious",
          traits: decoded.traits,
          stats: decoded.stats,
          level: 1,
          xp: 0,
          xp_to_next_level: 100,
          imageUrl: imageUrl,
          image_url: imageUrl || "",
          tokenId: result.tokenId,
          token_id: result.tokenId,
          is_demo: false,
          // A visitor until the wallet proves it owns this Chog
          verified: false,
          owner_address: "",
          owner_proof: "",
          memories: [
            {
              id: `awaken-${Date.now()}`,
              title: "Soul awakened",
              text: `${decoded.name} was imported from a real Chog NFT (token ${result.tokenId}).`,
              importance: 88,
              timestamp: new Date().toISOString(),
            },
          ],
        };
      }

      updateSoul(nextSoul);
      setToast(saved ? `Welcome back, ${decoded.name}` : `${decoded.name} imported`);
      setPage("dashboard");
      return nextSoul;
    } catch (error) {
      console.error("Import error:", error);
      setToast(error.message || "Failed to import from that address.");
      return null;
    }
  }

  // Prove the connected wallet owns this Soul's Chog (a free signature)
  async function runVerification(targetSoul, knownAddress) {
    try {
      const address = knownAddress || (await connectWallet());
      setWallet(address);
      setToast("Check your wallet to sign. It's free and sends no transaction.");
      const result = await verifyOwnership(address, targetSoul.tokenId);
      updateSoul({
        ...targetSoul,
        verified: true,
        owner_address: result.address,
        owner_proof: result.proof,
      });
      setToast("✓ Ownership verified. You are the owner.");
      return true;
    } catch (error) {
      setToast(error.message || "Verification failed.");
      return false;
    }
  }

  const handleVerify = () => runVerification(soul);

  // Connect a wallet = load the Chog that wallet holds, then prove ownership
  async function handleConnect() {
    try {
      const address = await connectWallet();
      setWallet(address);
      const found = await handleImportAddress(address);
      if (!found) {
        if (!soul) setPage("import");
        return;
      }
      await runVerification(found, address);
    } catch (error) {
      setToast(error.message || "Wallet connection failed");
    }
  }

  async function handleChat(message) {
    if (!soul) return null;
    setIsAiThinking(true);
    try {
      const data = await apiChat(message);
      if (data.soul) updateSoul(data.soul);
      if (data.level_info?.leveled_up) {
        setLevelUpEvent({
          from: data.level_info.old_level,
          to: data.level_info.new_level,
        });
      }
      if (data.evolution_info?.evolved) {
        setEvolutionEvent({
          from: data.evolution_info.old_archetype,
          to: data.evolution_info.new_archetype,
        });
      }
      if (data.achievements_unlocked?.length > 0) {
        setTimeout(() => {
          setToast(`🏆 Achievement unlocked!`);
        }, 500);
      }
      return data.reply;
    } catch (error) {
      console.error("Chat error:", error);
      setToast(`${soul.name} could not respond.`);
      return "I'm having trouble connecting...";
    } finally {
      setIsAiThinking(false);
    }
  }

  async function handleChoice(action) {
    if (!soul) return null;
    try {
      const data = await apiChoice(action);
      if (data.soul) updateSoul(data.soul);
      if (data.level_info?.leveled_up) {
        setLevelUpEvent({
          from: data.level_info.old_level,
          to: data.level_info.new_level,
        });
      }
      if (data.evolution_info?.evolved) {
        setEvolutionEvent({
          from: data.evolution_info.old_archetype,
          to: data.evolution_info.new_archetype,
        });
      }
      if (data.achievements_unlocked?.length > 0) {
        setTimeout(() => {
          setToast(`🏆 Achievement: ${data.achievements_unlocked.length} unlocked!`);
        }, 500);
      }
      return data;
    } catch (error) {
      console.error("Choice error:", error);
      setToast("The choice could not be made.");
      return null;
    }
  }

  const handleViewProfile = (rival) => {
    setSelectedRival(rival);
    setPage("profile");
  };

  // ============================================================
  // EARLY RETURNS — must be AFTER all hooks
  // ============================================================

  if (loading) {
    return (
      <div style={{ color: "white", padding: "4rem", textAlign: "center" }}>
        <h2>Waking up your Soul...</h2>
      </div>
    );
  }

  const toastView = toast ? <div className="toast">{toast}</div> : null;

  // The landing page (with a Continue button if a Soul already exists)
  if (page === "landing") {
    return (
      <>
        <Landing
          soul={soul}
          onImport={() => setPage("import")}
          onConnect={handleConnect}
          onContinue={() => setPage("dashboard")}
        />
        {toastView}
      </>
    );
  }

  // No Chog yet, so no Soul: the only place to go is Import
  if (!soul) {
    return (
      <div className="app-shell">
        <main className="main-content">
          <Import
            onImportAddress={handleImportAddress}
            onBack={() => setPage("landing")}
            hasSoul={false}
          />
        </main>
        {toastView}
      </div>
    );
  }

  const shared = { soul, navigate };

  const renderPage = () => {
    if (page === "talk")
      return <Talk {...shared} onChat={handleChat} isThinking={isAiThinking} />;
    if (page === "quest") return <Quest {...shared} onChoice={handleChoice} />;
    if (page === "arena")
      return (
        <Arena
          {...shared}
          onBattleComplete={(data) => {
            if (data.soul) updateSoul(data.soul);
            if (data.leveled_up) {
              setLevelUpEvent({
                from: soul.level,
                to: data.new_level,
              });
            }
            if (data.evolution_info?.evolved) {
              setEvolutionEvent({
                from: data.evolution_info.old_archetype,
                to: data.evolution_info.new_archetype,
              });
            }
            if (data.achievements_unlocked?.length > 0) {
              setTimeout(() => {
                setToast(`🏆 Achievement unlocked!`);
              }, 500);
            }
          }}
        />
      );
    if (page === "timeline") return <Timeline {...shared} />;
    if (page === "leaderboard")
      return <Leaderboard {...shared} onViewProfile={handleViewProfile} />;
    if (page === "chog") return <CHOG {...shared} wallet={wallet} />;
    if (page === "achievements") return <Achievements {...shared} />;
    if (page === "profile" && selectedRival)
      return <SoulProfile {...shared} rival={selectedRival} />;
    if (page === "import")
      return (
        <Import
          onImportAddress={handleImportAddress}
          onBack={() => setPage("dashboard")}
          hasSoul
        />
      );
    return <Dashboard {...shared} onVerify={handleVerify} />;
  };

  return (
    <div className="app-shell">
      <TopBar
        soul={soul}
        wallet={wallet}
        navigate={navigate}
        onConnect={handleConnect}
        muted={muted}
        onToggleMute={handleToggleMute}
      />
      <main className="main-content">{renderPage()}</main>
      <BottomNav page={page} navigate={navigate} />
      {toastView}

      {showOnboarding && (
        <Onboarding onDismiss={() => setShowOnboarding(false)} />
      )}

      {levelUpEvent && (
        <div className="level-up-banner">
          <div className="sparkles">
            {[...Array(24)].map((_, i) => (
              <span
                key={i}
                className="sparkle"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.8}s`,
                  animationDuration: `${1.5 + Math.random() * 1}s`,
                }}
              />
            ))}
          </div>
          <div className="level-up-inner">
            <p className="eyebrow">SOUL EVOLVED</p>
            <h1>LEVEL {levelUpEvent.to}</h1>
            <p>{soul.name} has grown stronger.</p>
          </div>
        </div>
      )}

      {evolutionEvent && (
        <div className="evolution-banner">
          <div className="shimmer-overlay" />
          <div className="evolution-inner">
            <p className="eyebrow">SOUL TRANSFORMED</p>
            <h1>{evolutionEvent.to}</h1>
            <p className="evolution-from">evolved from {evolutionEvent.from}</p>
          </div>
        </div>
      )}
    </div>
  );
}