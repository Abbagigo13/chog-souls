// src/lib/sound.js
// Small sound utility — loads and plays MP3s from /public/sounds/

const SOUNDS = {
  levelUp: "/sounds/level-up.mp3",
  evolution: "/sounds/evolution.mp3",
  arenaWin: "/sounds/arena-win.mp3",
  arenaLose: "/sounds/arena-lose.mp3",
  chatReply: "/sounds/chat-reply.mp3",
};

// Cache audio elements so they don't reload on every play
const audioCache = {};

// Global mute toggle (persisted in localStorage)
let muted = localStorage.getItem("chog_muted") === "true";

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  muted = value;
  localStorage.setItem("chog_muted", String(value));
}

export function toggleMute() {
  setMuted(!muted);
  return muted;
}

export function playSound(name) {
  if (muted) return;

  const url = SOUNDS[name];
  if (!url) return;

  try {
    if (!audioCache[name]) {
      audioCache[name] = new Audio(url);
      audioCache[name].volume = 0.5;
    }

    // Rewind and play (allows rapid replay)
    const audio = audioCache[name];
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Browser may block autoplay; fail silently
    });
  } catch (err) {
    // Sound is optional — never crash on it
    console.debug("Sound error:", err);
  }
}