// src/components/StatBar.jsx
import { useEffect, useRef, useState } from "react";

export default function StatBar({ label, value }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [flash, setFlash] = useState(null); // "up" | "down" | null
  const prevRef = useRef(value);

  // Animate the number toward the target
  useEffect(() => {
    const prev = prevRef.current;

    if (value === prev) return;

    // Detect direction
    setFlash(value > prev ? "up" : "down");

    // Smoothly increment/decrement
    const step = value > prev ? 1 : -1;
    const duration = 500;
    const frames = 20;
    const interval = duration / frames;
    let current = prev;
    let frame = 0;

    const timer = setInterval(() => {
      frame++;
      current += (value - prev) / frames;
      setDisplayValue(Math.round(current));

      if (frame >= frames) {
        clearInterval(timer);
        setDisplayValue(value);
      }
    }, interval);

    // Clear the flash effect after 1.5s
    const flashTimer = setTimeout(() => setFlash(null), 1500);

    prevRef.current = value;

    return () => {
      clearInterval(timer);
      clearTimeout(flashTimer);
    };
  }, [value]);

  return (
    <div className={`stat-row ${flash ? `stat-${flash}` : ""}`}>
      <div className="stat-label">
        <span>{label}</span>
        <strong>
          {displayValue}
          {flash === "up" && <span className="stat-delta">+{value - prevRef.current + (value - displayValue)}</span>}
        </strong>
      </div>
      <div className="bar">
        <div
          className="bar-fill"
          style={{
            width: `${displayValue}%`,
            transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>
    </div>
  );
}