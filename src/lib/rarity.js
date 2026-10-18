// src/lib/rarity.js

// Real Chog tier names (from the NFT's own metadata) plus the old numeric tiers.
const COMMON = { tier: "Common", color: "#9c94aa", score: 20 };
const UNCOMMON = { tier: "Uncommon", color: "#8ce8b4", score: 40 };
const RARE = { tier: "Rare", color: "#5fa8ff", score: 60 };
const EPIC = { tier: "Epic", color: "#b57aff", score: 80 };
const LEGENDARY = { tier: "Legendary", color: "#ffd966", score: 100 };
const MYTHIC = { tier: "Mythic", color: "#ff6b9d", score: 100 };

const TIERS = {
  common: COMMON,
  uncommon: UNCOMMON,
  rare: RARE,
  epic: EPIC,
  legendary: LEGENDARY,
  mythic: MYTHIC,
  // older numeric tiers
  "1": LEGENDARY,
  "2": EPIC,
  "3": RARE,
  "4": UNCOMMON,
  "5": COMMON,
};

/**
 * Rarity of a Soul. The label and colour are the NFT's real Tier trait
 * (Common, Uncommon, Epic...). The score also counts stats and level,
 * and is only used for ranking.
 * Returns { tier, color, score }
 */
export function computeRarity(soul) {
  const tierTrait = soul.traits?.find((t) => t.name === "Tier");
  const key = String(tierTrait?.value ?? "common").trim().toLowerCase();
  const info = TIERS[key] || COMMON;

  const stats = soul.stats || { courage: 0, loyalty: 0, intelligence: 0, greed: 0 };
  const statValues = Object.values(stats).sort((a, b) => b - a);
  const statBonus = Math.floor(((statValues[0] || 0) + (statValues[1] || 0)) / 10);

  const levelBonus = (soul.level || 1) * 2;

  const score = Math.min(100, info.score + statBonus + levelBonus);

  return { tier: info.tier, color: info.color, score };
}

/**
 * Compute an overall power score for leaderboard ranking.
 */
export function computePowerScore(soul) {
  const rarity = computeRarity(soul);
  const level = soul.level || 1;
  const xp = soul.xp || 0;
  return rarity.score * 100 + level * 10 + Math.floor(xp / 10);
}