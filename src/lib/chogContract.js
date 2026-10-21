// src/lib/chogContract.js
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

/**
 * Validate an Ethereum address.
 */
export function isValidAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Public IPFS gateways throttle browsers, so Chog pictures are loaded
 * through our own backend (which fetches each one once and keeps it).
 * ipfs://<cid>/<file>  ->  <API_URL>/chog/image/<cid>/<file>
 */
function toProxyImage(image) {
  if (typeof image !== "string") return image;

  let path = null;
  if (image.startsWith("ipfs://")) {
    path = image.slice("ipfs://".length);
  } else {
    const index = image.indexOf("/ipfs/");
    if (index !== -1) path = image.slice(index + "/ipfs/".length);
  }
  if (!path) return image;

  if (path.startsWith("ipfs/")) path = path.slice("ipfs/".length);

  const parts = path.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return image;

  return `${API_URL}/chog/image/${parts[0]}/${parts[1]}`;
}

/**
 * Fetch the Chog a wallet holds.
 * Returns { tokenId, totalOwned, metadata }, or null if the wallet holds no Chog.
 * Throws an Error with a readable message if the network is busy or the server is down.
 */
export async function getChogStats(ownerAddress) {
  let response;
  try {
    response = await fetch(`${API_URL}/chog/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: ownerAddress }),
    });
  } catch (err) {
    console.error("Chog import network error:", err);
    throw new Error("Could not reach the CHOG SOULS server. Is the backend running?");
  }

  // 404 = the wallet really holds no Chog
  if (response.status === 404) return null;

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error("Chog import failed:", err);
    throw new Error(err.detail || "The lookup failed. Please try again in a minute.");
  }

  const data = await response.json();
  if (data && data.metadata && data.metadata.image) {
    data.metadata = {
      ...data.metadata,
      image: toProxyImage(data.metadata.image),
    };
  }
  return data;
}