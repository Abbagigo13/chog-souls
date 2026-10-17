// src/components/Onboarding.jsx
import { useState } from "react";

const STORAGE_KEY = "chog_onboarding_seen";

export function shouldShowOnboarding() {
  return !localStorage.getItem(STORAGE_KEY);
}

export default function Onboarding({ onDismiss }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: "🐱",
      eyebrow: "STEP 1",
      title: "Meet your Soul",
      text: "Every Chog is a living companion with personality, stats, and a memory of everything you do together.",
    },
    {
      icon: "💬",
      eyebrow: "STEP 2",
      title: "Talk and choose",
      text: "Chat with your Soul, make moral decisions, and win battles. Every action shifts its character.",
    },
    {
      icon: "✨",
      eyebrow: "STEP 3",
      title: "Evolve and share",
      text: "Level up, evolve your archetype, climb the leaderboard, and share your Soul with the world.",
    },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem(STORAGE_KEY, "true");
      onDismiss();
    }
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    onDismiss();
  };

  const current = steps[step];

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <button className="onboarding-skip" onClick={handleSkip}>
          SKIP
        </button>

        <div className="onboarding-icon">{current.icon}</div>
        <p className="eyebrow">{current.eyebrow}</p>
        <h2>{current.title}</h2>
        <p className="onboarding-text">{current.text}</p>

        <div className="onboarding-dots">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`onboarding-dot ${i === step ? "active" : ""}`}
            />
          ))}
        </div>

        <button className="primary-button full" onClick={handleNext}>
          {step < steps.length - 1 ? "NEXT →" : "BEGIN →"}
        </button>
      </div>
    </div>
  );
}