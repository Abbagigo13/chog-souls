# backend/app/services/chog_token_reader.py
import httpx
from typing import Optional


# --- Monad Mainnet RPCs (fallback list) ---
MONAD_RPC_URLS = [
    "https://rpc.monad.xyz",
    "https://rpc1.monad.xyz",
    "https://monad-mainnet-rpc.publicnode.com",
    "https://monad.drpc.org",
]

# --- $CHOG ERC-20 contract address on Monad Mainnet ---
# ⚠️ UPDATE THIS with the real $CHOG contract when available.
# For now it's a placeholder address that returns 0 balance.
CHOG_TOKEN_CONTRACT = "0x0000000000000000000000000000000000000000"

# --- ERC-20 function selectors ---
# balanceOf(address) = 0x70a08231
# decimals()         = 0x313ce567
# symbol()           = 0x95d89b41
SELECTOR_BALANCE = "0x70a08231"
SELECTOR_DECIMALS = "0x313ce567"


class ChogTokenReader:

    @staticmethod
    def _encode_address(address: str) -> str:
        addr = address.lower().replace("0x", "")
        return addr.rjust(64, "0")

    @staticmethod
    async def _rpc_call(method: str, params: list) -> Optional[str]:
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params,
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            for rpc_url in MONAD_RPC_URLS:
                try:
                    response = await client.post(rpc_url, json=payload)
                    if response.status_code == 200:
                        data = response.json()
                        if "result" in data:
                            return data["result"]
                except Exception as e:
                    print(f"[$CHOG] RPC {rpc_url} failed: {e}")
                    continue
        return None

    @staticmethod
    async def get_balance(address: str) -> dict:
        """
        Fetch $CHOG balance for a wallet address on Monad.
        Returns { balance_raw, balance, decimals, contract }.
        """
        encoded = ChogTokenReader._encode_address(address)

        # 1. Read decimals
        decimals_result = await ChogTokenReader._rpc_call(
            "eth_call",
            [{"to": CHOG_TOKEN_CONTRACT, "data": SELECTOR_DECIMALS}, "latest"],
        )
        try:
            decimals = int(decimals_result, 16) if decimals_result and decimals_result != "0x" else 18
        except Exception:
            decimals = 18

        # 2. Read balance
        balance_result = await ChogTokenReader._rpc_call(
            "eth_call",
            [
                {"to": CHOG_TOKEN_CONTRACT, "data": SELECTOR_BALANCE + encoded},
                "latest",
            ],
        )

        if not balance_result or balance_result == "0x":
            return {
                "address": address,
                "balance_raw": "0",
                "balance": 0.0,
                "decimals": decimals,
                "contract": CHOG_TOKEN_CONTRACT,
                "configured": CHOG_TOKEN_CONTRACT != "0x0000000000000000000000000000000000000000",
            }

        try:
            raw = int(balance_result, 16)
        except Exception:
            raw = 0

        return {
            "address": address,
            "balance_raw": str(raw),
            "balance": raw / (10 ** decimals),
            "decimals": decimals,
            "contract": CHOG_TOKEN_CONTRACT,
            "configured": CHOG_TOKEN_CONTRACT != "0x0000000000000000000000000000000000000000",
        }