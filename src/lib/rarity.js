// src/lib/rarity.js

// Trait rarity weights — higher = rarer
const TIER_WEIGHTS = {
  "1": { tier: "Legendary", color: "#ffd966", score: 100 },
  "2": { tier: "Epic", color: "#b57aff", score: 80 },
  "3": { tier: "Rare", color: "#5fa8ff", score: 60 },
  "4": { tier: "Uncommon", color: "#8ce8b4", score: 40 },
  "5": { tier: "Common", color: "#9c94aa", score: 20 },
};

/**
 * Compute rarity from a Soul's traits.
 * Returns { tier, color, score, label }
 */
export function computeRarity(soul) {
  // Find Tier trait
  const tierTrait = soul.traits?.find((t) => t.name === "Tier");
  const tierValue = tierTrait?.value || "5";
  const tierInfo = TIER_WEIGHTS[tierValue] || TIER_WEIGHTS["5"];

  // Bonus from stats: average of top 2 stats / 5
  const stats = soul.stats || { courage: 0, loyalty: 0, intelligence: 0, greed: 0 };
  const statValues = Object.values(stats).sort((a, b) => b - a);
  const statBonus = Math.floor((statValues[0] + statValues[1]) / 10);

  // Bonus from level
  const levelBonus = (soul.level || 1) * 2;

  const totalScore = Math.min(100, tierInfo.score + statBonus + levelBonus);

  // Re-tier based on final score
  let finalTier = tierInfo.tier;
  let finalColor = tierInfo.color;
  if (totalScore >= 95) { finalTier = "Mythic"; finalColor = "#ff6b9d"; }
  else if (totalScore >= 85) { finalTier = "Legendary"; finalColor = "#ffd966"; }
  else if (totalScore >= 70) { finalTier = "Epic"; finalColor = "#b57aff"; }
  else if (totalScore >= 50) { finalTier = "Rare"; finalColor = "#5fa8ff"; }
  else if (totalScore >= 30) { finalTier = "Uncommon"; finalColor = "#8ce8b4"; }
  else { finalTier = "Common"; finalColor = "#9c94aa"; }

  return {
    tier: finalTier,
    color: finalColor,
    score: totalScore,
  };
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