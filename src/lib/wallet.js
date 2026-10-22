// src/lib/wallet.js

export async function connectWallet() {
  if (typeof window.ethereum === "undefined") {
    throw new Error("No wallet detected. Please install MetaMask.");
  }

  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });

  if (!accounts || accounts.length === 0) {
    throw new Error("No wallet accounts returned.");
  }

  return accounts[0];
}

/**
 * Ask the wallet to sign a message (free: no transaction, no gas).
 * Returns the signature.
 */
export async function signMessage(address, message) {
  if (typeof window.ethereum === "undefined") {
    throw new Error("No wallet detected. Please install MetaMask.");
  }

  // Wallets expect the message as hex
  const hex =
    "0x" +
    Array.from(new TextEncoder().encode(message))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

  try {
    return await window.ethereum.request({
      method: "personal_sign",
      params: [hex, address],
    });
  } catch (err) {
    if (err && err.code === 4001) {
      throw new Error("Signature cancelled. You can verify later from your Soul page.");
    }
    throw new Error((err && err.message) || "Could not sign the message.");
  }
}