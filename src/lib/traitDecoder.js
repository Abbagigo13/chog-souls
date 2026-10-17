// src/lib/traitDecoder.js
/**
 * Maps real Chog Genesis NFT traits to Soul stats.
 *
 * Real trait values (e.g. "Green laser", "Wizard Hat", "Rainbow Puke") don't
 * match a hand-written lookup table, so every trait is scored in 3 layers:
 *   1. CURATED  - exact trait/value overrides (the original table, kept as-is)
 *   2. KEYWORDS - meaning-based rules ("laser" -> intelligence, "fire" -> courage)
 *   3. HASH     - a stable fallback so every unknown value still contributes
 *                 the same amount every time (same Chog = same stats, always)
 */

const STATS = ["courage", "loyalty", "intelligence", "greed"];

const CURATED = {
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
};

// Named tiers used by the real collection (Common, Rare, ...)
const TIER_BONUS = {
  common: 0,
  uncommon: 2,
  rare: 4,
  epic: 6,
  legendary: 8,
  mythic: 10,
};

// Values that mean "nothing special" - they add no stats
const NEUTRAL_VALUES = new Set([
  "none", "no", "normal", "default", "origin", "right", "left", "",
]);

// Meaning-based rules: if the trait value contains one of these words,
// the matching stat gets a boost.
const KEYWORD_RULES = [
  {
    stat: "courage",
    pattern:
      /fire|flame|blaze|ember|horn|crown|warrior|knight|armor|sword|fang|rage|angry|demon|devil|samurai|viking|boxer|punk|spike|thunder|lightning|electric|tough|hero/,
  },
  {
    stat: "intelligence",
    pattern:
      /laser|wizard|mage|sage|oracle|glasses|nerd|brain|genius|prism|void|galaxy|cosmic|crystal|monocle|scientist|professor|hacker|book|moon|star/,
  },
  {
    stat: "loyalty",
    pattern:
      /angel|halo|heart|love|happy|smile|robe|holy|saint|farmer|friend|hug|cute|clean|tuxedo|suit|loyal/,
  },
  {
    stat: "greed",
    pattern:
      /money|cash|dollar|gold|rich|diamond|chain|mafia|shadow|toxic|jeet|puke|bite|lick|tongue|greed|bling|rainbow|wallet|coin|gem|lip/,
  },
];

// Tune these three numbers to make stats higher or lower overall
const BASE_STATS = { courage: 40, loyalty: 40, intelligence: 40, greed: 25 };
const KEYWORD_PRIMARY = 7;
const HASH_PRIMARY = 4;
const SECONDARY = 2;
const STAT_CAP = 100;

// Same input always gives the same number (djb2 hash)
function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

function emptyGains() {
  return { courage: 0, loyalty: 0, intelligence: 0, greed: 0 };
}

function addAll(gains, modifiers) {
  for (const [stat, delta] of Object.entries(modifiers)) {
    if (gains[stat] !== undefined) gains[stat] += delta;
  }
}

/**
 * Work out how much one trait adds to each stat.
 */
function scoreAttribute(traitType, rawValue) {
  const value = String(rawValue).trim();
  const lower = value.toLowerCase();
  const gains = emptyGains();

  // Named tiers (Common, Rare, ...) lift every stat equally
  if (traitType === "Tier") {
    const curatedTier = CURATED.Tier[value];
    if (curatedTier) {
      addAll(gains, curatedTier);
    } else if (TIER_BONUS[lower] !== undefined) {
      const bonus = TIER_BONUS[lower];
      for (const stat of STATS) gains[stat] += bonus;
    }
    return gains;
  }

  // 1. Curated exact match
  const curated = CURATED[traitType] && CURATED[traitType][value];
  if (curated) {
    addAll(gains, curated);
    return gains;
  }

  // Naked: Yes is bold and a little greedy
  if (traitType === "Naked") {
    if (lower === "yes") addAll(gains, { courage: 4, greed: 4 });
    return gains;
  }

  // Plain / default values add nothing
  if (NEUTRAL_VALUES.has(lower)) return gains;

  const hash = hashString(`${traitType}:${lower}`);
  const secondary = STATS[(hash >>> 3) % 4];

  // 2. Keyword match
  let matched = false;
  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(lower)) {
      gains[rule.stat] += KEYWORD_PRIMARY;
      matched = true;
    }
  }
  if (matched) {
    gains[secondary] += SECONDARY;
    return gains;
  }

  // 3. Stable hash fallback for values we have never seen
  const primary = STATS[hash % 4];
  gains[primary] += HASH_PRIMARY;
  gains[secondary] += SECONDARY;
  return gains;
}

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

    const gains = scoreAttribute(trait_type, value);
    for (const stat of STATS) {
      stats[stat] = Math.min(STAT_CAP, stats[stat] + gains[stat]);
    }
  }

  for (const stat of STATS) {
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