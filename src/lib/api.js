// src/lib/api.js
import { decodeChogTraits } from "./traitDecoder";
import { resolveImage } from "./chogImage";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

// Same key that useSoul.js saves the Soul under
const SOUL_STORAGE_KEY = "chog_soul_data";

// The Soul the browser is currently playing with
function readCurrentSoul() {
  try {
    const raw = localStorage.getItem(SOUL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// The backend only knows snake_case fields. Put back the camelCase ones
// the frontend pages use (imageUrl, tokenId) so they are never lost.
function normalizeSoul(returned, previous) {
  if (!returned) return returned;
  const prev = previous || {};
  const imageUrl = resolveImage(returned.image_url) || prev.imageUrl || undefined;
  const tokenId = prev.tokenId ?? (returned.token_id || undefined);
  return {
    ...returned,
    imageUrl,
    image_url: imageUrl || "",
    tokenId,
  };
}

function normalizeRival(rival) {
  if (!rival) return rival;
  return { ...rival, imageUrl: resolveImage(rival.imageUrl) };
}

function withNormalizedSoul(data, previous) {
  if (data && data.soul) data.soul = normalizeSoul(data.soul, previous);
  return data;
}

async function postJson(path, body) {
  return fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function apiHealth() {
  const response = await fetch(`${API_URL}/health`);

  if (!response.ok) {
    throw new Error("Backend unavailable");
  }

  return response.json();
}

export async function getDemoSoul() {
  const response = await fetch(`${API_URL}/soul/demo`);

  if (!response.ok) {
    throw new Error("Unable to load Soul");
  }

  const soul = await response.json();
  return normalizeSoul(soul, null);
}

export async function apiChat(message) {
  const previous = readCurrentSoul();
  const response = await postJson("/soul/chat", { message, soul: previous });

  if (!response.ok) {
    throw new Error("Chat API failed");
  }

  return withNormalizedSoul(await response.json(), previous);
}

export async function apiChoice(action) {
  const previous = readCurrentSoul();
  const response = await postJson("/soul/choice", { action, soul: previous });

  if (!response.ok) {
    throw new Error("Choice API failed");
  }

  return withNormalizedSoul(await response.json(), previous);
}

export async function apiRandomRival() {
  const previous = readCurrentSoul();
  const response = await postJson("/arena/rival/random", { soul: previous });
  if (!response.ok) {
    throw new Error("Could not load random rival");
  }
  const data = await response.json();
  if (data && data.rival) data.rival = normalizeRival(data.rival);
  return data;
}

export async function apiBattle(rivalId) {
  const previous = readCurrentSoul();
  const response = await postJson(`/arena/battle/${rivalId}`, { soul: previous });
  if (!response.ok) {
    throw new Error("Battle API failed");
  }
  const data = withNormalizedSoul(await response.json(), previous);
  if (data && data.rival) data.rival = normalizeRival(data.rival);
  return data;
}

export async function apiDailyCheck() {
  const previous = readCurrentSoul();
  const response = await postJson("/soul/daily", { soul: previous });

  if (!response.ok) {
    throw new Error("Daily check failed");
  }

  return withNormalizedSoul(await response.json(), previous);
}

export async function apiGetTodayQuest() {
  const previous = readCurrentSoul();
  const response = await postJson("/soul/quest/today", { soul: previous });
  if (!response.ok) {
    throw new Error("Could not load today's quest");
  }
  return response.json();
}

export async function apiChogBalance(address) {
  const response = await postJson("/chog/token-balance", { address });
  if (!response.ok) {
    throw new Error("Could not read $CHOG balance");
  }
  return response.json();
}

// A random REAL Chog from the collection (real traits + real artwork).
// Its stats are worked out from the traits, same as an imported Chog.
export async function apiRandomDemoChog() {
  const response = await fetch(`${API_URL}/chog/demo-random`);
  if (!response.ok) {
    throw new Error("Could not load a demo Chog");
  }
  const chog = await response.json();

  const decoded = decodeChogTraits({
    name: chog.name,
    attributes: (chog.traits || []).map((t) => ({
      trait_type: t.name,
      value: t.value,
    })),
  });

  return {
    ...chog,
    traits: decoded.traits,
    stats: decoded.stats,
    imageUrl: resolveImage(chog.imageUrl),
  };
}

export async function apiAchievements() {
  const previous = readCurrentSoul();
  const response = await postJson("/soul/achievements", { soul: previous });
  if (!response.ok) {
    throw new Error("Could not load achievements");
  }
  return response.json();
}

export async function apiRivalTaunt() {
  const response = await fetch(`${API_URL}/arena/rival/taunt`);
  if (!response.ok) {
    throw new Error("Could not load rival taunt");
  }
  return response.json();
}