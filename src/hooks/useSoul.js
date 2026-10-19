// src/hooks/useSoul.js
import { useState, useEffect } from "react";

// The Soul in play. src/lib/api.js reads this same key to send it to the server.
const STORAGE_KEY = "chog_soul_data";
// Every Soul that was played, by id, so progress survives switching Chogs.
const ARCHIVE_KEY = "chog_soul_archive";

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// A Soul saved earlier (so importing the same Chog again keeps its progress)
export function getSavedSoul(id) {
  const archive = readJson(ARCHIVE_KEY, {});
  return archive[id] || null;
}

function saveSoul(soul) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(soul));
    const archive = readJson(ARCHIVE_KEY, {});
    archive[soul.id] = soul;
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
  } catch (err) {
    console.warn("Could not save the Soul:", err);
  }
}

export function useSoul() {
  const [soul, setSoul] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load the Soul in play. There is no demo Soul: no Chog, no Soul.
  useEffect(() => {
    const saved = readJson(STORAGE_KEY, null);
    if (saved && saved.id && !saved.is_demo && saved.id !== "demo") {
      setSoul(saved);
    } else if (saved) {
      // A leftover demo Soul from before demo mode was removed
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
    setLoading(false);
  }, []);

  // Called after a Chat, Quest or Battle, and when a Chog is imported
  const updateSoul = (newSoulData) => {
    setSoul(newSoulData);
    saveSoul(newSoulData);
  };

  return { soul, updateSoul, loading };
}