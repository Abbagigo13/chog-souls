// src/lib/traitDecoder.js
/**
 * Maps real Chog Genesis NFT traits to Soul stats.
 * Trait categories from OpenSea: Accessory, Aura, Background, Base, Body,
 * Eyes, Form, Head, Mouth, Naked, Side, Skin, Tier
 */

const TRAIT_MAP = {
  Aura: {
    Electric: { courage: 8, intelligence: 6 },
    Frost: { intelligence: 8, loyalty: 4 },
    Shadow: { greed: 8, intelligence: 5 },
    Radiant: { loyalty: 8, courage: 4 },
    Toxic: { greed: 9, courage: 3 },
    Fire: { courage: 10, greed: 4 },
    Water: { intelligence: 6, loyalty: 5 },
    Earth: { courage: 5, loyalty: 6 },
    Wind: { intelligence: 7, courage: 4 },
  },
  Eyes: {
    Normal: { intelligence: 4, courage: 2 },
    Laser: { intelligence: 10, courage: 5 },
    Void: { intelligence: 9, greed: 6 },
    Blaze: { courage: 9, loyalty: 3 },
    Ember: { courage: 6, intelligence: 3 },
    Prism: { loyalty: 5, intelligence: 5 },
    "Blue Flat": { intelligence: 6, loyalty: 3 },
    "Mixed Retard": { courage: 4, greed: 5 },
  },
  Head: {
    "Void Horn": { courage: 7, greed: 5 },
    "Mafia Hat": { intelligence: 8, greed: 6 },
    "Jeet Cap": { greed: 6, intelligence: 4 },
    Normal: { intelligence: 3, loyalty: 2 },
  },
  Body: {
    "MILF Lover": { loyalty: 8, courage: 4 },
    "Jesus Robe": { loyalty: 10, courage: 3 },
    "Stripe Shirt": { intelligence: 5, loyalty: 4 },
    "Orange Holed Jacket": { courage: 6, greed: 4 },
    "Blue jacket": { intelligence: 4, loyalty: 3 },
    Normal: { courage: 3, loyalty: 3 },
  },
  Skin: {
    Jade: { intelligence: 6, loyalty: 3 },
    Blue: { courage: 5, loyalty: 3 },
    Red: { courage: 7, greed: 4 },
    Normal: { courage: 3, loyalty: 2 },
  },
  Tier: {
    "1": { courage: 10, loyalty: 10, intelligence: 10, greed: 10 },
    "2": { courage: 7, loyalty: 7, intelligence: 7, greed: 7 },
    "3": { courage: 5, loyalty: 5, intelligence: 5, greed: 5 },
    "4": { courage: 3, loyalty: 3, intelligence: 3, greed: 3 },
    "5": { courage: 2, loyalty: 2, intelligence: 2, greed: 2 },
  },
  Background: {
    "Supreme Purple": { intelligence: 6, greed: 5 },
    Magenta: { courage: 5, intelligence: 4 },
    "Royal Blue": { loyalty: 5, courage: 4 },
    Normal: { intelligence: 2, loyalty: 2 },
  },
  Mouth: {
    Smile: { loyalty: 4, courage: 2 },
    Fangs: { courage: 6, greed: 3 },
    Normal: { loyalty: 2, courage: 2 },
  },
  Accessory: {
    Crown: { courage: 8, greed: 6 },
    Chains: { courage: 5, intelligence: 3 },
    Normal: { loyalty: 2, courage: 1 },
  },
  Form: {
    Chog: { loyalty: 4, courage: 4 },
    Demon: { greed: 7, courage: 5 },
    Angel: { loyalty: 8, intelligence: 4 },
  },
  Base: {
    Default: { courage: 3, loyalty: 3, intelligence: 3, greed: 3 },
  },
  Side: {
    Default: { intelligence: 2, loyalty: 2 },
  },
  Naked: {
    Naked: { courage: 4, greed: 4 },
    Clothed: { loyalty: 3, intelligence: 3 },
  },
};

const BASE_STATS = { courage: 25, loyalty: 25, intelligence: 25, greed: 15 };
const STAT_CAP = 100;

/**
 * Decode a Chog NFT's metadata attributes into Soul stats.
 */
export function decodeChogTraits(metadata) {
  if (!metadata || !metadata.attributes) return getFallbackStats();

  const stats = { ...BASE_STATS };
  const soulTraits = [];

  for (const attr of metadata.attributes) {
    const { trait_type, value } = attr;
    soulTraits.push({ name: trait_type, value: String(value) });

    const traitDef = TRAIT_MAP[trait_type];
    if (traitDef && traitDef[value]) {
      const modifiers = traitDef[value];
      for (const [stat, delta] of Object.entries(modifiers)) {
        if (stats[stat] !== undefined) {
          stats[stat] = Math.min(STAT_CAP, stats[stat] + delta);
        }
      }
    }
  }

  for (const stat of Object.keys(stats)) {
    stats[stat] = Math.max(1, stats[stat]);
  }

  return {
    stats,
    traits: soulTraits,
    name: metadata.name || "Unknown Chog",
  };
}

function getFallbackStats() {
  return {
    stats: { courage: 72, loyalty: 86, intelligence: 78, greed: 42 },
    traits: [
      { name: "Fur", value: "Midnight" },
      { name: "Eyes", value: "Laser" },
      { name: "Spirit", value: "Loyal" },
      { name: "Aura", value: "Electric" },
    ],
    name: "Giga",
  };
}