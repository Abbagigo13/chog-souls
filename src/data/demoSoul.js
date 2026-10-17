export const demoSoul = {
  id: "demo-chog-001",
  mode: "demo",
  name: "Giga",
  tokenId: "DEMO #001",
  level: 4,
  xp: 68,
  mood: "Curious",
  archetype: "The Loyal Trickster",
  traits: [
    { name: "Fur", value: "Midnight" },
    { name: "Eyes", value: "Laser" },
    { name: "Spirit", value: "Loyal" },
    { name: "Aura", value: "Electric" }
  ],
  stats: {
    courage: 72,
    loyalty: 86,
    intelligence: 78,
    greed: 42,
    morality: 71,
    chaos: 63,
    social: 69
  },
  memories: [
    {
      id: 1,
      type: "awakening",
      title: "Soul awakened",
      text: "Giga woke up with a strong loyalty signature.",
      importance: 88,
      time: "Today"
    },
    {
      id: 2,
      type: "discovery",
      title: "First question",
      text: "You asked what makes a Soul real. Giga answered: memory.",
      importance: 74,
      time: "Today"
    }
  ],
  relationships: [
    { name: "Bob", type: "Suspicious", score: 34 },
    { name: "Nova", type: "Ally", score: 78 }
  ],
  events: [
    { title: "Giga awakened", detail: "The Chog identity became a Soul.", time: "Just now" },
    { title: "Trait signature decoded", detail: "A loyal + chaotic personality was generated.", time: "2 min ago" }
  ],
  messages: [
    { from: "soul", text: "You're finally here. I was wondering what kind of human would wake me up." }
  ],
  quest: {
    title: "The Trust Test",
    description: "Make one difficult decision today.",
    completed: false
  }
};
