// src/lib/memory.js
// Helpers for the History page: what kind of memory is this, and how to show it.

const KINDS = {
  battle_win: { id: "battle_win", label: "VICTORY", icon: "⚔️", group: "battles", tone: "win" },
  battle_loss: { id: "battle_loss", label: "DEFEAT", icon: "💀", group: "battles", tone: "loss" },
  level: { id: "level", label: "LEVEL UP", icon: "⬆️", group: "milestones", tone: "milestone" },
  evolution: { id: "evolution", label: "EVOLUTION", icon: "✨", group: "milestones", tone: "milestone" },
  achievement: { id: "achievement", label: "ACHIEVEMENT", icon: "🏆", group: "milestones", tone: "milestone" },
  streak: { id: "streak", label: "STREAK", icon: "🔥", group: "milestones", tone: "milestone" },
  awakened: { id: "awakened", label: "AWAKENING", icon: "🌅", group: "milestones", tone: "milestone" },
  moment: { id: "moment", label: "MOMENT", icon: "💭", group: "moments", tone: "moment" },
};

export const FILTERS = [
  { id: "all", label: "ALL" },
  { id: "battles", label: "BATTLES" },
  { id: "milestones", label: "MILESTONES" },
  { id: "moments", label: "MOMENTS" },
];

export function memoryKind(memory) {
  const id = String(memory.id || "");
  const title = String(memory.title || "");

  if (/^Victory vs/i.test(title)) return KINDS.battle_win;
  if (/^Defeat vs/i.test(title)) return KINDS.battle_loss;
  if (/^Reached Level/i.test(title)) return KINDS.level;
  if (/^Transformed/i.test(title)) return KINDS.evolution;
  if (id.startsWith("achv-") || title.startsWith("🏆")) return KINDS.achievement;
  if (id.startsWith("streak-") || /^Day \d+ Streak/i.test(title)) return KINDS.streak;
  if (id.startsWith("awaken-") || /^Soul awakened/i.test(title)) return KINDS.awakened;
  return KINDS.moment;
}

// The trophy is already shown as the icon, so drop it from the title
export function memoryTitle(memory) {
  return String(memory.title || "Untitled memory").replace(/^🏆\s*/u, "");
}

export function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// TODAY / YESTERDAY / MON, OCT 12
export function dayLabel(date, now = new Date()) {
  if (!date) return "EARLIER";
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (days === 0) return "TODAY";
  if (days === 1) return "YESTERDAY";
  const sameYear = date.getFullYear() === now.getFullYear();
  return date
    .toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      ...(sameYear ? {} : { year: "numeric" }),
    })
    .toUpperCase();
}

export function relativeTime(date, now = new Date()) {
  if (!date) return "";
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} h ago`;
  if (seconds < 7 * 86400) return `${Math.round(seconds / 86400)} d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function exactTime(date) {
  return date ? date.toLocaleString() : "";
}

// high / "" / low, for the colour of the importance bar
export function importanceTone(value) {
  if (value >= 85) return "high";
  if (value < 40) return "low";
  return "";
}

// How many days this Soul has been awake (the oldest memory is day 1)
export function awakeDays(dates, now = new Date()) {
  const real = dates.filter(Boolean);
  if (real.length === 0) return 1;
  const oldest = new Date(Math.min(...real.map((d) => d.getTime())));
  return Math.max(1, Math.round((startOfDay(now) - startOfDay(oldest)) / 86400000) + 1);
}