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