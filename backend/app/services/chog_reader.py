# backend/app/services/chog_reader.py
import asyncio
import base64
import json
import time
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
from urllib.parse import unquote

import httpx

# --- Monad Mainnet public RPCs: (url, max calls allowed in one batch request) ---
MONAD_RPCS: List[Tuple[str, int]] = [
    ("https://rpc.monad.xyz", 100),
    ("https://rpc1.monad.xyz", 100),
    ("https://rpc2.monad.xyz", 10),
    ("https://rpc3.monad.xyz", 10),
]

CHOG_CONTRACT = "0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763"

# --- IPFS Gateways (all tried at the same time) ---
IPFS_GATEWAYS = [
    "https://ipfs.io/ipfs/",
    "https://dweb.link/ipfs/",
    "https://gateway.pinata.cloud/ipfs/",
    "https://nftstorage.link/ipfs/",
]

# How many calls we put into ONE batch request (public RPCs allow up to 100)
BATCH_CHUNK = 50
# Small pause between batch requests so we stay under the RPC rate limit
BATCH_PAUSE_SECONDS = 0.1
# After an RPC fails or rate-limits us, leave it alone for this long
RPC_COOLDOWN_SECONDS = 15
# How long the "who owns which token" table stays fresh
OWNER_MAP_TTL_SECONDS = 300
# How long a finished import stays cached on disk
STATS_TTL_SECONDS = 24 * 3600
# If the contract has no totalSupply(), scan up to this token ID
MAX_TOKEN_ID_FALLBACK = 2500
MAX_TOKEN_ID_CEILING = 5000
# If one token's metadata can't be loaded, try this many of the holder's tokens
MAX_METADATA_TOKEN_TRIES = 5

# --- Caches -------------------------------------------------------------
_CACHE_FILE = Path(__file__).resolve().parents[2] / "chog_cache.json"


def _load_disk_cache() -> Dict[str, Any]:
    try:
        if _CACHE_FILE.exists():
            return json.loads(_CACHE_FILE.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"[chog] could not read cache file: {e}")
    return {}


def _save_disk_cache() -> None:
    try:
        _CACHE_FILE.write_text(
            json.dumps(_STATS_CACHE, indent=2), encoding="utf-8"
        )
    except Exception as e:
        print(f"[chog] could not write cache file: {e}")


# address (lowercase) -> {"ts": unix time, "stats": {...}}
_STATS_CACHE: Dict[str, Any] = _load_disk_cache()
_METADATA_CACHE: Dict[str, Dict[str, Any]] = {}

_RPC_COOLDOWN_UNTIL: Dict[str, float] = {}

_OWNER_MAP: Dict[int, str] = {}
_OWNER_MAP_BUILT_AT: float = 0.0
_OWNER_MAP_LOCK: Optional[asyncio.Lock] = None


class ChogReader:
    """
    Server-side reader for the Chog Genesis NFT contract on Monad Mainnet.
    Uses raw JSON-RPC calls (sent in batches) to avoid CORS issues and to
    stay under the public RPC rate limits.
    """

    # --- ABI method selectors (keccak-256 first 4 bytes) ---
    SELECTORS = {
        "balanceOf": "0x70a08231",           # balanceOf(address)
        "ownerOf": "0x6352211e",             # ownerOf(uint256)
        "tokenURI": "0xc87b56dd",            # tokenURI(uint256)
        "totalSupply": "0x18160ddd",         # totalSupply()
        "tokenOfOwnerByIndex": "0x2f745c59", # tokenOfOwnerByIndex(address,uint256)
    }

    @staticmethod
    def _encode_address(address: str) -> str:
        """Pad an address to 32 bytes for ABI encoding."""
        addr = address.lower().replace("0x", "")
        return addr.rjust(64, "0")

    @staticmethod
    def _encode_uint256(value: int) -> str:
        """Pad a uint256 to 32 bytes."""
        return hex(value)[2:].rjust(64, "0")

    @staticmethod
    def _is_revert(error: Any) -> bool:
        """True if a JSON-RPC error means 'the contract said no' (not an outage)."""
        if not isinstance(error, dict):
            return False
        message = str(error.get("message", "")).lower()
        return (
            error.get("code") == 3
            or "revert" in message
            or "execution" in message
        )

    # ------------------------------------------------------------------
    # Low-level: send many calls as JSON-RPC batches
    # ------------------------------------------------------------------
    @staticmethod
    async def _rpc_batch(
        requests: List[Tuple[str, List]],
        client: httpx.AsyncClient,
    ) -> List[Optional[Dict[str, Any]]]:
        """
        Send many JSON-RPC calls in as few HTTP requests as possible.

        Returns one entry per request, in the same order:
          - {"result": ...}  the call worked
          - {"error": ...}   the contract reverted (a real answer, e.g. token
                             does not exist)
          - None             we could not get an answer from any RPC
        An RPC that fails or rate-limits us is skipped for a short cooldown,
        and its unfinished calls move on to the next RPC.
        """
        results: List[Optional[Dict[str, Any]]] = [None] * len(requests)
        pending = list(range(len(requests)))
        now = time.monotonic()

        rpcs = [
            rpc for rpc in MONAD_RPCS
            if now >= _RPC_COOLDOWN_UNTIL.get(rpc[0], 0.0)
        ] or list(MONAD_RPCS)  # everything cooling down: try anyway

        for url, batch_limit in rpcs:
            if not pending:
                break

            chunk_size = max(1, min(BATCH_CHUNK, batch_limit))
            still_pending: List[int] = []
            broken = False

            for start in range(0, len(pending), chunk_size):
                chunk = pending[start:start + chunk_size]

                if broken:
                    still_pending.extend(chunk)
                    continue

                body = [
                    {
                        "jsonrpc": "2.0",
                        "id": i,
                        "method": requests[i][0],
                        "params": requests[i][1],
                    }
                    for i in chunk
                ]

                try:
                    response = await client.post(url, json=body)
                    if response.status_code != 200:
                        raise RuntimeError(f"HTTP {response.status_code}")

                    data = response.json()
                    if not isinstance(data, list):
                        raise RuntimeError("batch not supported / error reply")

                    by_id = {
                        item.get("id"): item
                        for item in data
                        if isinstance(item, dict)
                    }

                    for i in chunk:
                        item = by_id.get(i)
                        if item is None:
                            still_pending.append(i)
                        elif "result" in item:
                            results[i] = {"result": item["result"]}
                        elif ChogReader._is_revert(item.get("error")):
                            results[i] = {"error": item["error"]}
                        else:
                            still_pending.append(i)  # e.g. item rate-limited

                    await asyncio.sleep(BATCH_PAUSE_SECONDS)

                except Exception as e:
                    print(f"[chog] RPC {url} failed: {type(e).__name__} {e}")
                    _RPC_COOLDOWN_UNTIL[url] = (
                        time.monotonic() + RPC_COOLDOWN_SECONDS
                    )
                    broken = True
                    still_pending.extend(chunk)

            pending = still_pending

        return results

    @staticmethod
    async def _rpc_call(
        method: str,
        params: List,
        client: Optional[httpx.AsyncClient] = None,
    ) -> Optional[str]:
        """One call. Returns the hex result, or None on failure / revert."""
        if client is None:
            async with httpx.AsyncClient(timeout=10.0) as own_client:
                return await ChogReader._rpc_call(method, params, own_client)

        responses = await ChogReader._rpc_batch([(method, params)], client)
        response = responses[0]
        if response and "result" in response:
            return response["result"]
        return None

    # ------------------------------------------------------------------
    # Simple contract reads
    # ------------------------------------------------------------------
    @staticmethod
    async def get_balance(
        address: str, client: Optional[httpx.AsyncClient] = None
    ) -> int:
        """Get Chog balance of an address."""
        data = ChogReader.SELECTORS["balanceOf"] + ChogReader._encode_address(address)
        result = await ChogReader._rpc_call(
            "eth_call", [{"to": CHOG_CONTRACT, "data": data}, "latest"], client
        )
        if not result or result == "0x":
            return 0
        return int(result, 16)

    @staticmethod
    async def get_total_supply(
        client: Optional[httpx.AsyncClient] = None,
    ) -> Optional[int]:
        """Get totalSupply() if the contract has it, else None."""
        result = await ChogReader._rpc_call(
            "eth_call",
            [{"to": CHOG_CONTRACT, "data": ChogReader.SELECTORS["totalSupply"]}, "latest"],
            client,
        )
        if not result or result == "0x":
            return None
        try:
            return int(result, 16)
        except ValueError:
            return None

    @staticmethod
    async def get_owner(
        token_id: int, client: Optional[httpx.AsyncClient] = None
    ) -> Optional[str]:
        """Get the owner of a specific Chog token."""
        data = ChogReader.SELECTORS["ownerOf"] + ChogReader._encode_uint256(token_id)
        result = await ChogReader._rpc_call(
            "eth_call", [{"to": CHOG_CONTRACT, "data": data}, "latest"], client
        )
        if not result or result == "0x" or len(result) < 42:
            return None
        return "0x" + result[-40:]

    @staticmethod
    async def get_token_uri(
        token_id: int, client: Optional[httpx.AsyncClient] = None
    ) -> Optional[str]:
        """Get the tokenURI for a specific Chog token."""
        data = ChogReader.SELECTORS["tokenURI"] + ChogReader._encode_uint256(token_id)
        result = await ChogReader._rpc_call(
            "eth_call", [{"to": CHOG_CONTRACT, "data": data}, "latest"], client
        )
        if not result or result == "0x":
            return None

        # Result is ABI-encoded string: offset + length + data
        try:
            hex_str = result[2:]
            if len(hex_str) < 128:
                return None
            length = int(hex_str[64:128], 16)
            string_hex = hex_str[128:128 + (length * 2)]
            return bytes.fromhex(string_hex).decode("utf-8")
        except Exception as e:
            print(f"[chog] TokenURI decode error: {e}")
            return None

    # ------------------------------------------------------------------
    # Metadata (IPFS)
    # ------------------------------------------------------------------
    @staticmethod
    def _candidate_urls(uri: str) -> List[str]:
        """Turn a tokenURI into a list of URLs to try (keeps the full IPFS path)."""
        uri = uri.strip()

        if uri.startswith("ipfs://"):
            path = uri[len("ipfs://"):]
            if path.startswith("ipfs/"):
                path = path[len("ipfs/"):]
            return [gw + path for gw in IPFS_GATEWAYS]

        if uri.startswith("http"):
            urls = [uri]
            if "/ipfs/" in uri:
                path = uri.split("/ipfs/", 1)[1]
                urls += [gw + path for gw in IPFS_GATEWAYS if not uri.startswith(gw)]
            return urls

        return []

    @staticmethod
    async def _fetch_one(client: httpx.AsyncClient, url: str) -> Optional[Dict[str, Any]]:
        """Fetch one URL. Returns the JSON, or None (and logs why)."""
        try:
            response = await client.get(url)
            if response.status_code == 200:
                return response.json()
            print(f"[chog] metadata URL {url} returned HTTP {response.status_code}")
        except Exception as e:
            print(f"[chog] metadata URL {url} failed: {type(e).__name__} {e}")
        return None

    @staticmethod
    async def _fetch_metadata(uri: str) -> Optional[Dict[str, Any]]:
        """Fetch metadata JSON from a tokenURI (ipfs://, http, or data:)."""
        uri = uri.strip()

        if uri in _METADATA_CACHE:
            return _METADATA_CACHE[uri]

        # Metadata embedded directly in the URI
        if uri.startswith("data:"):
            try:
                header, _, body = uri.partition(",")
                if ";base64" in header:
                    raw = base64.b64decode(body).decode("utf-8")
                else:
                    raw = unquote(body)
                return json.loads(raw)
            except Exception as e:
                print(f"[chog] data: URI decode error: {e}")
                return None

        urls_to_try = ChogReader._candidate_urls(uri)
        if not urls_to_try:
            return None

        async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:
            for attempt in range(2):
                # Ask every gateway at the same time, use the first good answer
                tasks = [
                    asyncio.create_task(ChogReader._fetch_one(client, url))
                    for url in urls_to_try
                ]
                try:
                    for finished in asyncio.as_completed(tasks):
                        result = await finished
                        if result is not None:
                            _METADATA_CACHE[uri] = result
                            return result
                finally:
                    for task in tasks:
                        if not task.done():
                            task.cancel()
                    await asyncio.gather(*tasks, return_exceptions=True)

                print(f"[chog] all gateways failed (attempt {attempt + 1} of 2)")

        return None

    # ------------------------------------------------------------------
    # Finding which tokens a wallet owns
    # ------------------------------------------------------------------
    @staticmethod
    async def _get_owner_map(
        client: httpx.AsyncClient,
    ) -> Tuple[Dict[int, str], bool]:
        """
        Build (or reuse) a table of token ID -> owner for the whole collection.
        Built with batched calls: ~40 requests instead of ~2,000.
        Reused for 5 minutes, so every wallet imported after the first is instant.
        Returns (table, complete). 'complete' is False if some lookups failed.
        """
        global _OWNER_MAP, _OWNER_MAP_BUILT_AT, _OWNER_MAP_LOCK

        if _OWNER_MAP_LOCK is None:
            _OWNER_MAP_LOCK = asyncio.Lock()

        async with _OWNER_MAP_LOCK:
            age = time.monotonic() - _OWNER_MAP_BUILT_AT
            if _OWNER_MAP and age < OWNER_MAP_TTL_SECONDS:
                print(f"[chog] reusing owner table ({len(_OWNER_MAP)} tokens, {int(age)}s old)")
                return _OWNER_MAP, True

            supply = await ChogReader.get_total_supply(client)
            upper = (supply + 100) if supply else MAX_TOKEN_ID_FALLBACK
            upper = min(upper, MAX_TOKEN_ID_CEILING)
            print(f"[chog] building owner table for token IDs 0..{upper}")

            started = time.monotonic()
            owners: Dict[int, str] = {}
            unresolved = list(range(0, upper + 1))
            owner_selector = ChogReader.SELECTORS["ownerOf"]

            for attempt in range(3):
                requests = [
                    (
                        "eth_call",
                        [
                            {
                                "to": CHOG_CONTRACT,
                                "data": owner_selector + ChogReader._encode_uint256(t),
                            },
                            "latest",
                        ],
                    )
                    for t in unresolved
                ]
                responses = await ChogReader._rpc_batch(requests, client)

                next_unresolved: List[int] = []
                for token_id, response in zip(unresolved, responses):
                    if response is None:
                        next_unresolved.append(token_id)
                    elif "result" in response:
                        value = response["result"]
                        if value and len(value) >= 42:
                            owners[token_id] = ("0x" + value[-40:]).lower()
                    # a revert means the token does not exist: skip it

                unresolved = next_unresolved
                if not unresolved:
                    break
                print(
                    f"[chog] {len(unresolved)} lookups unanswered, "
                    f"retrying (round {attempt + 1} of 3)"
                )
                await asyncio.sleep(2.0)

            took = time.monotonic() - started
            print(
                f"[chog] owner table: {len(owners)} tokens, "
                f"{len(unresolved)} unanswered, {took:.1f}s"
            )

            if not unresolved:
                _OWNER_MAP = owners
                _OWNER_MAP_BUILT_AT = time.monotonic()
                return owners, True

            return owners, False

    @staticmethod
    async def get_owned_token_ids(address: str) -> List[int]:
        """Find all Chog token IDs owned by an address."""
        target = address.lower()

        async with httpx.AsyncClient(timeout=10.0) as client:
            balance = await ChogReader.get_balance(address, client)
            print(f"[chog] balanceOf({address}) = {balance}")
            if balance == 0:
                return []

            # --- Fast path: ERC721Enumerable (one batched request) ---
            count = min(balance, 100)
            enumerable_requests = [
                (
                    "eth_call",
                    [
                        {
                            "to": CHOG_CONTRACT,
                            "data": (
                                ChogReader.SELECTORS["tokenOfOwnerByIndex"]
                                + ChogReader._encode_address(address)
                                + ChogReader._encode_uint256(index)
                            ),
                        },
                        "latest",
                    ],
                )
                for index in range(count)
            ]
            responses = await ChogReader._rpc_batch(enumerable_requests, client)

            enumerable_ids: List[int] = []
            for response in responses:
                if (
                    not response
                    or "result" not in response
                    or response["result"] in (None, "0x")
                ):
                    enumerable_ids = []
                    break
                enumerable_ids.append(int(response["result"], 16))

            if enumerable_ids:
                print(f"[chog] enumerable path found tokens: {enumerable_ids}")
                return enumerable_ids

            # --- Slow path: look the wallet up in the owner table ---
            owners, complete = await ChogReader._get_owner_map(client)
            owned = sorted(t for t, owner in owners.items() if owner == target)

            if len(owned) < balance:
                print(
                    f"[chog] WARNING found {len(owned)} of {balance} tokens "
                    f"(table complete: {complete})"
                )
            print(f"[chog] found tokens: {owned}")
            return owned

    # ------------------------------------------------------------------
    # Full pipeline
    # ------------------------------------------------------------------
    @staticmethod
    async def get_chog_stats(address: str) -> Optional[Dict[str, Any]]:
        """
        Full pipeline: address -> Chog metadata + tokenId.
        Tries up to a few of the holder's tokens until one has loadable metadata.
        Returns None if no Chog found or no metadata could be fetched.
        """
        key = address.lower()

        cached = _STATS_CACHE.get(key)
        if cached and (time.time() - cached.get("ts", 0)) < STATS_TTL_SECONDS:
            print(f"[chog] cache hit for {address}")
            return cached["stats"]

        token_ids = await ChogReader.get_owned_token_ids(address)
        if not token_ids:
            print("[chog] no tokens found for this address")
            return None

        for token_id in token_ids[:MAX_METADATA_TOKEN_TRIES]:
            token_uri = await ChogReader.get_token_uri(token_id)
            print(f"[chog] tokenURI for #{token_id}: {token_uri}")
            if not token_uri:
                continue

            metadata = await ChogReader._fetch_metadata(token_uri)
            if not metadata:
                print(f"[chog] metadata fetch failed for token #{token_id}, trying next")
                continue

            stats = {
                "tokenId": token_id,
                "totalOwned": len(token_ids),
                "metadata": metadata,
            }
            _STATS_CACHE[key] = {"ts": time.time(), "stats": stats}
            _save_disk_cache()
            return stats

        print("[chog] could not load metadata for any token")
        return None