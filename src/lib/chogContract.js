// src/lib/chogContract.js
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

/**
 * Validate an Ethereum address.
 */
export function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Fetch Chog stats by wallet address.
 * The backend does all the on-chain reading and IPFS fetching.
 * Returns { tokenId, totalOwned, metadata } or null.
 */
export async function getChogStats(ownerAddress) {
  try {
    const response = await fetch(`${API_URL}/chog/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: ownerAddress }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("Chog import failed:", err);
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error("Chog import network error:", err);
    return null;
  }
}