// src/lib/verify.js
// Proof of Chog ownership: the wallet signs a free message, our server checks it.
import { signMessage } from "./wallet";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

async function post(path, body) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Could not reach the CHOG SOULS server. Is the backend running?");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || "Verification failed. Please try again.");
  }
  return data;
}

/**
 * Prove that `address` owns Chog token `tokenId`.
 * Returns { address, proof, expires }. Throws a readable Error on failure.
 */
export async function verifyOwnership(address, tokenId) {
  const challenge = await post("/verify/challenge", {
    address,
    token_id: tokenId,
  });

  const signature = await signMessage(address, challenge.message);

  const result = await post("/verify/check", {
    address,
    token_id: tokenId,
    message: challenge.message,
    challenge_token: challenge.challenge_token,
    signature,
  });

  return { address: result.address, proof: result.proof, expires: result.expires };
}