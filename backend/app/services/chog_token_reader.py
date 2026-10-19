# backend/app/services/chog_token_reader.py
import time
from typing import Any, Dict, Optional, Tuple

from .chog_reader import ChogReader

# --- $CHOG ERC-20 token on Monad Mainnet (confirmed by the project owner) ---
CHOG_TOKEN_CONTRACT = "0x350035555e10d9afaf1566aaebfced5ba6c27777"
DEFAULT_DECIMALS = 18

# --- ERC-20 function selectors ---
SELECTOR_BALANCE = "0x70a08231"   # balanceOf(address)
SELECTOR_DECIMALS = "0x313ce567"  # decimals()

# How long a balance is remembered (seconds), so we do not hammer the RPC
CACHE_SECONDS = 60

# --- Holder tiers (balance in whole $CHOG). Change the numbers to re-tune. ---
TIERS = [
    {"tier": 0, "name": "No $CHOG", "min": 0},
    {"tier": 1, "name": "Holder", "min": 1_000},
    {"tier": 2, "name": "Believer", "min": 25_000},
    {"tier": 3, "name": "Whale", "min": 250_000},
]

# Perks per tier. Capped on purpose: the Chog NFT's traits stay the core of the
# game and $CHOG only adds a small edge.
# SIGNATURE_BONUS_PER_TIER_PCT must match HOLDER_BONUS_PER_TIER in battle_engine.py
SIGNATURE_BONUS_PER_TIER_PCT = 10
XP_BONUS_PER_TIER_PCT = 5

_DECIMALS: Optional[int] = None
_CACHE: Dict[str, Tuple[float, Dict[str, Any]]] = {}


def _perks(tier: int) -> Dict[str, int]:
    return {
        "signature_bonus_pct": SIGNATURE_BONUS_PER_TIER_PCT * tier,
        "xp_bonus_pct": XP_BONUS_PER_TIER_PCT * tier,
    }


def tier_info(balance: float) -> Dict[str, Any]:
    """Which tier a balance is in, and how far it is from the next one."""
    current = TIERS[0]
    for entry in TIERS:
        if balance >= entry["min"]:
            current = entry

    nxt = next((t for t in TIERS if t["tier"] == current["tier"] + 1), None)
    if nxt:
        span = nxt["min"] - current["min"]
        progress = int(max(0, min(100, ((balance - current["min"]) / span) * 100)))
    else:
        progress = 100

    return {
        "tier": current["tier"],
        "name": current["name"],
        "min": current["min"],
        "next_tier": nxt["tier"] if nxt else None,
        "next_name": nxt["name"] if nxt else None,
        "next_min": nxt["min"] if nxt else None,
        "progress": progress,
        **_perks(current["tier"]),
    }


class ChogTokenReader:

    @staticmethod
    def public_tiers() -> Dict[str, Any]:
        """Every tier and its perks (shown on the $CHOG page, no wallet needed)."""
        return {
            "contract": CHOG_TOKEN_CONTRACT,
            "tiers": [
                {"tier": t["tier"], "name": t["name"], "min": t["min"], **_perks(t["tier"])}
                for t in TIERS
            ],
        }

    @staticmethod
    def _encode_address(address: str) -> str:
        addr = address.lower().replace("0x", "")
        return addr.rjust(64, "0")

    @staticmethod
    async def _get_decimals() -> int:
        global _DECIMALS
        if _DECIMALS is not None:
            return _DECIMALS
        result = await ChogReader._rpc_call(
            "eth_call",
            [{"to": CHOG_TOKEN_CONTRACT, "data": SELECTOR_DECIMALS}, "latest"],
        )
        try:
            if result and result != "0x":
                _DECIMALS = int(result, 16)
                return _DECIMALS
        except Exception:
            pass
        return DEFAULT_DECIMALS  # not cached, so a later call can try again

    @staticmethod
    async def get_balance(address: str) -> Dict[str, Any]:
        """
        $CHOG balance of a wallet on Monad, plus its holder tier and perks.
        ok=False means the balance could not be read (not that it is zero).
        """
        key = address.lower()
        cached = _CACHE.get(key)
        if cached and (time.time() - cached[0]) < CACHE_SECONDS:
            return cached[1]

        base = {
            "address": address,
            "contract": CHOG_TOKEN_CONTRACT,
            "configured": True,
        }

        decimals = await ChogTokenReader._get_decimals()
        result = await ChogReader._rpc_call(
            "eth_call",
            [
                {
                    "to": CHOG_TOKEN_CONTRACT,
                    "data": SELECTOR_BALANCE + ChogTokenReader._encode_address(address),
                },
                "latest",
            ],
        )

        if result is None or result == "0x":
            print(f"[$CHOG] could not read balance for {address}")
            return {
                **base,
                "ok": False,
                "balance_raw": "0",
                "balance": 0.0,
                "decimals": decimals,
                "tier": tier_info(0),
            }

        try:
            raw = int(result, 16)
        except ValueError:
            raw = 0

        balance = raw / (10 ** decimals)
        data = {
            **base,
            "ok": True,
            "balance_raw": str(raw),
            "balance": balance,
            "decimals": decimals,
            "tier": tier_info(balance),
        }
        _CACHE[key] = (time.time(), data)
        print(f"[$CHOG] {address} holds {balance:,.2f} -> tier {data['tier']['tier']}")
        return data