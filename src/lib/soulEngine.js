const clamp = (n) => Math.max(0, Math.min(100, n));

const fallbackReplies = [
  "I remember that. Give me a choice and I'll show you what I think.",
  "My chaos says yes. My loyalty says slow down.",
  "I don't want to be a static picture. I want a history.",
  "That decision would change how I see you.",
  "You keep teaching me who I am."
];

export function createSoulReply(soul, message) {
  const next = structuredClone(soul);
  const lower = message.toLowerCase();
  let reply = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];

  if (lower.includes("trust")) {
    reply = "Trust is expensive. I forgive mistakes, but I remember patterns.";
    next.stats.loyalty = clamp(next.stats.loyalty + 2);
  } else if (lower.includes("battle") || lower.includes("fight")) {
    reply = "Good. Let's see whether my courage is real or just a number.";
    next.stats.courage = clamp(next.stats.courage + 3);
  } else if (lower.includes("bob")) {
    reply = "Bob? I don't trust him yet. Something about him feels unfinished.";
  } else if (lower.includes("steal") || lower.includes("rob")) {
    reply = "You want chaos? Fine. But don't pretend there won't be consequences.";
    next.stats.chaos = clamp(next.stats.chaos + 4);
    next.stats.morality = clamp(next.stats.morality - 3);
  }

  next.messages = [
    ...next.messages,
    { from: "user", text: message },
    { from: "soul", text: reply }
  ].slice(-24);

  next.memories = [
    {
      id: Date.now(),
      type: "conversation",
      title: "A conversation",
      text: `You said: "${message.slice(0, 100)}"`,
      importance: 62,
      time: "Just now"
    },
    ...next.memories
  ].slice(0, 14);

  next.events = [
    { title: "Memory created", detail: "Giga stored a new conversation memory.", time: "Just now" },
    ...next.events
  ].slice(0, 10);

  return { soul: next, reply };
}

export function applyChoice(soul, action) {
  const next = structuredClone(soul);

  const choices = {
    help: {
      delta: { morality: 8, loyalty: 3, social: 2 },
      label: "Help Bob",
      result: "Giga became more compassionate."
    },
    steal: {
      delta: { greed: 10, chaos: 4, morality: -8 },
      label: "Steal it",
      result: "Giga embraced chaos. Morality fell."
    },
    leave: {
      delta: { courage: -6, intelligence: 3 },
      label: "Walk away",
      result: "Giga chose survival over glory."
    },
    confront: {
      delta: { courage: 7, intelligence: 2, morality: 2 },
      label: "Confront Bob",
      result: "Giga demanded the truth."
    }
  };

  const selected = choices[action] || choices.help;

  for (const [stat, delta] of Object.entries(selected.delta)) {
    next.stats[stat] = clamp(next.stats[stat] + delta);
  }

  next.xp += 20;
  if (next.xp >= 100) {
    next.level += 1;
    next.xp -= 100;
  }

  next.quest.completed = true;

  next.memories = [
    {
      id: Date.now(),
      type: "choice",
      title: selected.label,
      text: selected.result,
      importance: 84,
      time: "Just now"
    },
    ...next.memories
  ].slice(0, 14);

  next.events = [
    { title: selected.label, detail: selected.result, time: "Just now" },
    ...next.events
  ].slice(0, 10);

  return { soul: next, toast: selected.result };
}

export function runBattle(soul) {
  const soulPower = Math.round(
    soul.stats.courage * 0.24 +
    soul.stats.intelligence * 0.24 +
    soul.stats.loyalty * 0.18 +
    soul.stats.chaos * 0.12 +
    soul.level * 5
  );

  const opponentPower = 65 + Math.floor(Math.random() * 22);
  const win = soulPower >= opponentPower;

  return {
    win,
    soulPower,
    opponentPower,
    narrative: win
      ? "Giga baited Nova into a mistake, read the opening, and finished with a chaotic counter."
      : "Nova controlled the tempo. Giga survived the opening but lost the final exchange."
  };
}
