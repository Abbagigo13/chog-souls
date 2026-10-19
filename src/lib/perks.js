// src/lib/perks.js
// $CHOG holder perks. Read-only: nothing is signed or spent.
const API_URL =
  (import.meta.env && import.meta.env.VITE_API_URL) || "http://127.0.0.1:8000/api";

const LINK_KEY = "chog_perk_wallet";
const CACHE_MS = 60 * 1000;

export function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || "").trim());
}

export function getLinkedWallet() {
  try {
    return localStorage.getItem(LINK_KEY) || "";
  } catch {
    return "";
  }
}

export function linkWallet(address) {
  try {
    localStorage.setItem(LINK_KEY, address.trim());
  } catch {
    /* storage unavailable: the link just will not persist */
  }
}

export function unlinkWallet() {
  try {
    localStorage.removeItem(LINK_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * The wallet whose $CHOG balance gives perks:
 * 1. an address the player linked on purpose,
 * 2. else the wallet connected in the app,
 * 3. else a wallet the browser already shares with this site.
 */
export async function resolvePerkWallet(connected) {
  const linked = getLinkedWallet();
  if (linked) return { address: linked, source: "linked" };
  if (connected) return { address: connected, source: "connected" };
  try {
    if (typeof window !== "undefined" && window.ethereum) {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts && accounts[0]) return { address: accounts[0], source: "connected" };
    }
  } catch {
    /* no wallet shared: fine */
  }
  return { address: "", source: "none" };
}

const balanceCache = new Map();

// Balance + tier for a wallet, read from Monad by our backend
export async function fetchHolderInfo(address, force = false) {
  const key = address.toLowerCase();
  const hit = balanceCache.get(key);
  if (!force && hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const response = await fetch(`${API_URL}/chog/token-balance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  if (!response.ok) throw new Error("Could not read $CHOG balance");

  const data = await response.json();
  if (data && data.ok) balanceCache.set(key, { at: Date.now(), data });
  return data;
}

// Every tier and its perks (no wallet needed)
export async function fetchTiers() {
  const response = await fetch(`${API_URL}/chog/token-tiers`);
  if (!response.ok) throw new Error("Could not load $CHOG tiers");
  return response.json();
}

// 0 when there is no wallet, no balance, or the balance cannot be read
export async function getHolderTier(connected) {
  const wallet = await resolvePerkWallet(connected);
  if (!wallet.address) return 0;
  try {
    const info = await fetchHolderInfo(wallet.address);
    return info && info.ok ? info.tier.tier : 0;
  } catch {
    return 0;
  }
}