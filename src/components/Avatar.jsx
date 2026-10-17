// src/components/Avatar.jsx
import { useEffect, useState } from "react";

export default function Avatar({ size = "large", level, imageUrl, pulse }) {
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    if (!pulse) return;
    setPulsing(true);
    const timer = setTimeout(() => setPulsing(false), 600);
    return () => clearTimeout(timer);
  }, [pulse]);

  const src = imageUrl || "/chogs/demo.svg";

  return (
    <div className={`avatar avatar-${size} ${pulsing ? "avatar-pulse" : ""}`}>
      <img
        src={src}
        alt="Chog Soul"
        onError={(e) => {
          e.target.src = "/chog-soul.svg";
        }}
      />
      {level ? <span className="avatar-level">LVL {level}</span> : null}
    </div>
  );
}