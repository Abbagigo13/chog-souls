// src/components/Avatar.jsx
import { useEffect, useState } from "react";
import {
  resolveImage,
  chogImageUrl,
  EMPTY_AVATAR,
  FEATURED_CHOG,
} from "../lib/chogImage";

// For direct IPFS links: if one gateway fails, try the next.
const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
  "https://w3s.link/ipfs/",
  "https://nftstorage.link/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
];

function buildCandidates(original) {
  const marker = "/ipfs/";
  const index = original.indexOf(marker);
  if (index === -1) return [original];

  const path = original.slice(index + marker.length);
  const others = IPFS_GATEWAYS.map((gw) => gw + path).filter(
    (url) => url !== original
  );
  return [original, ...others];
}

export default function Avatar({ size = "large", level, imageUrl, pulse }) {
  const [pulsing, setPulsing] = useState(false);
  const [failed, setFailed] = useState(0);

  useEffect(() => {
    if (!pulse) return;
    setPulsing(true);
    const timer = setTimeout(() => setPulsing(false), 600);
    return () => clearTimeout(timer);
  }, [pulse]);

  // No picture given: show a real Chog (never a fake face)
  const original = resolveImage(imageUrl) || chogImageUrl(FEATURED_CHOG);

  // New picture requested: start again from the first source
  useEffect(() => {
    setFailed(0);
  }, [original]);

  const candidates = buildCandidates(original);
  const src = failed < candidates.length ? candidates[failed] : EMPTY_AVATAR;

  return (
    <div className={`avatar avatar-${size} ${pulsing ? "avatar-pulse" : ""}`}>
      <img
        src={src}
        alt="Chog"
        onError={() => {
          if (failed <= candidates.length) setFailed((n) => n + 1);
        }}
      />
      {level ? <span className="avatar-level">LVL {level}</span> : null}
    </div>
  );
}