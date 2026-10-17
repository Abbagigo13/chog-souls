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
import { useSoul } from "./hooks/useSoul";
import { connectWallet } from "./lib/wallet";
import { getChogStats } from "./lib/chogContract";
import { decodeChogTraits } from "./lib/traitDecoder";
import { apiChat, apiChoice, apiBattle, apiDailyCheck } from "./lib/api";
import { playSound, toggleMute, isMuted } from "./lib/sound";

// Extracts the image URL from Chog metadata (handles IPFS + HTTP)
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
  const { soul, updateSoul, resetSoul, loading } = useSoul();
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

  // --- Daily visit check (runs once per session for demo Soul) ---
  const dailyCheckRan = useRef(false);
  useEffect(() => {
    if (!soul) return;
    if (soul.id !== "demo") return;
    if (dailyCheckRan.current) return;

    dailyCheckRan.current = true;
    let cancelled = false;

    async function checkDaily() {
      try {
        const data = await apiDailyCheck();
        if (cancelled) return;

        if (data.soul) updateSoul(data.soul);

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
  }, [soul]);

  // --- Onboarding trigger ---
  useEffect(() => {
    if (!soul) return;
    if (soul.id !== "demo") return;
    if (shouldShowOnboarding()) {
      setShowOnboarding(true);
    }
  }, [soul]);

  // ============================================================
  // HANDLERS (functions, not hooks — safe after useEffect blocks)
  // ============================================================

  const navigate = (target) => setPage(target);

  const handleToggleMute = () => {
    const newMuted = toggleMute();
    setMutedState(newMuted);
    setToast(newMuted ? "Sound off" : "Sound on");
  };

  async function handleConnect() {
    try {
      const address = await connectWallet();
      setWallet(address);
      setToast("Wallet connected");
      setPage("dashboard");
    } catch (error) {
      setToast(error.message || "Wallet connection failed");
    }
  }

  function handleDemo() {
    setToast("Demo Soul awakened");
    setPage("dashboard");
  }

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

      const newSoul = {
        id: `chog-${result.tokenId}`,
        name: decoded.name,
        archetype: "The Awakened",
        mood: "Curious",
        traits: decoded.traits,
        stats: decoded.stats,
        level: 1,
        xp: 0,
        xp_to_next_level: 100,
        imageUrl: imageUrl,
        image_url: imageUrl,
        tokenId: result.tokenId,
        is_demo: false,
        memories: [
          {
            id: `awaken-${Date.now()}`,
            title: "Soul awakened",
            text: `${decoded.name} was imported from Chog NFT #${result.tokenId}.`,
            importance: 88,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      updateSoul(newSoul);
      setToast(`Chog #${result.tokenId} imported`);
      setPage("dashboard");
      return newSoul;
    } catch (error) {
      console.error("Import error:", error);
      setToast(error.message || "Failed to import from that address.");
      return null;
    }
  }

  async function handleDemoChog(chog) {
    try {
      const newSoul = {
        id: `demo-chog-${chog.tokenId}`,
        name: chog.name,
        archetype: "The Awakened",
        mood: "Curious",
        traits: chog.traits,
        stats: chog.stats,
        level: 1,
        xp: 0,
        xp_to_next_level: 100,
        imageUrl: chog.imageUrl,
        image_url: chog.imageUrl,
        tokenId: chog.tokenId,
        is_demo: false,
        memories: [
          {
            id: `awaken-${Date.now()}`,
            title: "Soul awakened",
            text: `${chog.name} was bound from the Demo Pool.`,
            importance: 88,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      updateSoul(newSoul);
      setToast(`${chog.name} bound to your Soul`);
      setPage("dashboard");
      return newSoul;
    } catch (error) {
      console.error("Demo Chog error:", error);
      setToast("Could not bind demo Chog.");
      return null;
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
      setToast("Giga could not respond.");
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

  async function handleBattle() {
    if (!soul) return null;
    try {
      const data = await apiBattle();
      if (data.soul) updateSoul(data.soul);
      if (data.leveled_up) {
        setLevelUpEvent({ from: soul.level, to: data.new_level });
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
      console.error("Battle error:", error);
      setToast("Arena failed to load.");
      return null;
    }
  }

  const handleViewProfile = (rival) => {
    setSelectedRival(rival);
    setPage("profile");
  };

  // ============================================================
  // EARLY RETURN — must be AFTER all hooks
  // ============================================================

  if (loading || !soul) {
    return (
      <div style={{ color: "white", padding: "4rem", textAlign: "center" }}>
        <h2>Waking up your Soul...</h2>
      </div>
    );
  }

  const shared = { soul, navigate };

  const renderPage = () => {
    if (page === "dashboard")
      return (
        <Dashboard
          {...shared}
          wallet={wallet}
          onImportAddress={handleImportAddress}
        />
      );
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
          onDemoChog={handleDemoChog}
          navigate={navigate}
        />
      );
    return <Landing onDemo={handleDemo} onConnect={handleConnect} />;
  };

  if (page === "landing") return renderPage();

  return (
    <div className="app-shell">
      <TopBar
        soul={soul}
        wallet={wallet}
        navigate={navigate}
        onConnect={handleConnect}
        onReset={resetSoul}
        muted={muted}
        onToggleMute={handleToggleMute}
      />
      <main className="main-content">{renderPage()}</main>
      <BottomNav page={page} navigate={navigate} />
      {toast && <div className="toast">{toast}</div>}

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
            <p>Giga has grown stronger.</p>
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