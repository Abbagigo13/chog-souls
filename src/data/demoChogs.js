// src/data/demoChogs.js
import { chogImageUrl } from "../lib/chogImage";

const traitsOf = (attributes) =>
  Object.entries(attributes).map(([name, value]) => ({ name, value }));

// Real Chogs from the collection (real artwork and traits)
export const DEMO_CHOGS = [
  {
    tokenId: 1468,
    name: "CHOG #1468",
    imageUrl: chogImageUrl(1468),
    traits: traitsOf({
      Background: "Rosie",
      Base: "Origin",
      Skin: "Pink",
      Side: "Right",
      Body: "Red Tuxedo",
      Mouth: "Rainbow Puke",
      Eyes: "Teary",
      Head: "Wizard Hat",
      Form: "Chog",
      Tier: "Common",
      Naked: "No",
    }),
  },
  {
    tokenId: 1816,
    name: "CHOG #1816",
    imageUrl: chogImageUrl(1816),
    traits: traitsOf({
      Background: "Aqua",
      Aura: "Clean",
      Base: "Origin",
      Skin: "Origin",
      Side: "Right",
      Body: "Pink Tuxedo",
      Mouth: "Worried",
      Eyes: "Happy",
      Head: "Balls Cap",
      Form: "Chog",
      Tier: "Common",
      Naked: "No",
    }),
  },
];