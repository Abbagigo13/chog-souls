# backend/app/services/chog_reader.py
import asyncio
import base64
import json
import os
import time
from pathlib import Path
from typing import Optional, Dict, Any, List, Set, Tuple
from urllib.parse import unquote, urlparse

import httpx
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()

# --- Monad Mainnet RPCs: (url, max calls allowed in one batch request) ---
# If MONAD_RPC_URL is set in .env (a free key from Alchemy, QuickNode, Ankr, dRPC...),
# it is tried first. The public endpoints below are the fallback.
DEFAULT_RPCS: List[Tuple[str, int]] = [
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

# How many calls we put into ONE batch request
BATCH_CHUNK = 50
# Small pause between batch requests so we stay under the RPC rate limit
BATCH_PAUSE_SECONDS = 0.1
# After an RPC fails or rate-limits us, leave it alone for this long
RPC_COOLDOWN_SECONDS = 15
# How many token IDs one scan step looks at
SCAN_CHUNK = 100
# Stop a lookup after this long (progress is saved, so a retry continues)
FIND_TIMEOUT_SECONDS = 75
# A finished import is "fresh" for this long (a stale one is still used if the RPC is down)
STATS_TTL_SECONDS = 24 * 3600
# If the contract has no totalSupply(), scan up to this token ID
MAX_TOKEN_ID_FALLBACK = 2500
MAX_TOKEN_ID_CEILING = 5000
# If one token's metadata can't be loaded, try this many of the holder's tokens
MAX_METADATA_TOKEN_TRIES = 5

BUSY_MESSAGE = "The Monad network is busy right now. Please try again in a minute."
IPFS_BUSY_MESSAGE = (
    "Found your Chog, but its data is slow to load from IPFS right now. "
    "Please try again in a minute."
)

# --- Caches -------------------------------------------------------------
_BACKEND_DIR = Path(__file__).resolve().parents[2]
_CACHE_FILE = _BACKEND_DIR / "chog_cache.json"      # finished imports, by wallet
_TABLE_FILE = _BACKEND_DIR / "owner_table.json"     # who owned which token, as far as we looked


def _load_json(path: Path) -> Dict[str, Any]:
    try:
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"[chog] could not read {path.name}: {e}")
    return {}


def _save_json(path: Path, data: Any) -> None:
    try:
        path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"[chog] could not write {path.name}: {e}")


# wallet (lowercase) -> {"ts": unix time, "stats": {...}}
_STATS_CACHE: Dict[str, Any] = _load_json(_CACHE_FILE)
_METADATA_CACHE: Dict[str, Dict[str, Any]] = {}

_table = _load_json(_TABLE_FILE)
_OWNERS: Dict[int, str] = {int(k): v for k, v in _table.get("owners", {}).items()}
_NONEXISTENT: Set[int] = set(int(x) for x in _table.get("nonexistent", []))
_UPPER: Optional[int] = None


def _save_table() -> None:
    _save_json(
        _TABLE_FILE,
        {
            "owners": {str(k): v for k, v in _OWNERS.items()},
            "nonexistent": sorted(_NONEXISTENT),
        },
    )


_RPC_COOLDOWN_UNTIL: Dict[str, float] = {}


def _rpcs() -> List[Tuple[str, int]]:
    custom = os.getenv("MONAD_RPC_URL", "").strip()
    return ([(custom, 100)] if custom else []) + DEFAULT_RPCS


def _label(url: str) -> str:
    """The host only, so an API key inside the URL never reaches the logs."""
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}"


def _serve_saved(key: str, cached: Dict[str, Any]) -> Dict[str, Any]:
    """
    The network is busy: reuse the last good answer for this wallet, and treat it
    as fresh for 10 more minutes so the very next request does not wait again.
    """
    cached["ts"] = time.time() - STATS_TTL_SECONDS + 600
    _STATS_CACHE[key] = cached
    return cached["stats"]


def _busy() -> HTTPException:
    # Raised here (instead of in routes.py) so the frontend gets a clear 503
    return HTTPException(status_code=503, detail=BUSY_MESSAGE)


class ChogReader:
    """
    Server-side reader for the Chog Genesis NFT contract on Monad Mainnet.
    Uses raw JSON-RPC calls (sent in batches) to avoid CORS issues and to
    stay under the public RPC rate limits.
    """

    SELECTORS = {
        "balanceOf": "0x70a08231",   # balanceOf(address)
        "ownerOf": "0x6352211e",     # ownerOf(uint256)
        "tokenURI": "0xc87b56dd",    # tokenURI(uint256)
        "totalSupply": "0x18160ddd", # totalSupply()
    }

    @staticmethod
    def _encode_address(address: str) -> str:
        addr = address.lower().replace("0x", "")
        return addr.rjust(64, "0")

    @staticmethod
    def _encode_uint256(value: int) -> str:
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
        One entry per request, in order:
          {"result": ...}  worked
          {"error": ...}   the contract reverted (a real answer, e.g. no such token)
          None             no RPC could answer
        An RPC that fails or rate-limits us is skipped for a short cooldown, and
        its unfinished calls move on to the next RPC.
        """
        results: List[Optional[Dict[str, Any]]] = [None] * len(requests)
        pending = list(range(len(requests)))
        now = time.monotonic()

        all_rpcs = _rpcs()
        rpcs = [r for r in all_rpcs if now >= _RPC_COOLDOWN_UNTIL.get(r[0], 0.0)] or list(all_rpcs)

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
                    {"jsonrpc": "2.0", "id": i, "method": requests[i][0], "params": requests[i][1]}
                    for i in chunk
                ]

                try:
                    response = await client.post(url, json=body)
                    if response.status_code != 200:
                        raise RuntimeError(f"HTTP {response.status_code}")

                    data = response.json()
                    if not isinstance(data, list):
                        raise RuntimeError("batch not supported / error reply")

                    by_id = {item.get("id"): item for item in data if isinstance(item, dict)}

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
                    print(f"[chog] RPC {_label(url)} failed: {type(e).__name__} {e}")
                    _RPC_COOLDOWN_UNTIL[url] = time.monotonic() + RPC_COOLDOWN_SECONDS
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

        response = (await ChogReader._rpc_batch([(method, params)], client))[0]
        if response and "result" in response:
            return response["result"]
        return None

    # ------------------------------------------------------------------
    # Simple contract reads
    # ------------------------------------------------------------------
    @staticmethod
    async def get_balance(
        address: str, client: Optional[httpx.AsyncClient] = None
    ) -> Optional[int]:
        """Chog balance of an address, or None if it could not be read (NOT zero)."""
        data = ChogReader.SELECTORS["balanceOf"] + ChogReader._encode_address(address)
        result = await ChogReader._rpc_call(
            "eth_call", [{"to": CHOG_CONTRACT, "data": data}, "latest"], client
        )
        if result is None:
            return None
        if result == "0x":
            return 0
        return int(result, 16)

    @staticmethod
    async def get_total_supply(
        client: Optional[httpx.AsyncClient] = None,
    ) -> Optional[int]:
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
    async def get_token_uri(
        token_id: int, client: Optional[httpx.AsyncClient] = None
    ) -> Optional[str]:
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
    # Finding a Chog a wallet owns (no full-collection scan needed)
    # ------------------------------------------------------------------
    @staticmethod
    async def _owner_lookup(
        ids: List[int], client: httpx.AsyncClient
    ) -> Tuple[Dict[int, str], Set[int], int]:
        """
        Ask the contract who owns each token ID (batched).
        Returns (owners found, IDs that do not exist, how many got no answer).
        """
        selector = ChogReader.SELECTORS["ownerOf"]
        requests = [
            (
                "eth_call",
                [{"to": CHOG_CONTRACT, "data": selector + ChogReader._encode_uint256(t)}, "latest"],
            )
            for t in ids
        ]
        responses = await ChogReader._rpc_batch(requests, client)

        owners: Dict[int, str] = {}
        missing: Set[int] = set()
        unanswered = 0
        for token_id, response in zip(ids, responses):
            if response is None:
                unanswered += 1
            elif "result" in response:
                value = response["result"]
                if value and len(value) >= 42:
                    owners[token_id] = ("0x" + value[-40:]).lower()
            else:
                missing.add(token_id)  # reverted: no such token
        return owners, missing, unanswered

    @staticmethod
    async def get_owned_token_ids(address: str) -> Tuple[List[int], int]:
        """
        Returns (some of the Chog token IDs the wallet owns, its total balance).
        Stops as soon as it finds one, and remembers everything it learned on
        the way (owner_table.json), so retries and other wallets get faster.
        """
        global _UPPER
        target = address.lower()

        async with httpx.AsyncClient(timeout=10.0) as client:
            balance = await ChogReader.get_balance(address, client)
            if balance is None:
                print(f"[chog] could not read balanceOf for {address}")
                raise _busy()
            print(f"[chog] balanceOf({address}) = {balance}")
            if balance == 0:
                return [], 0

            # 1) Tokens we already know belong to this wallet: just double-check them
            known = sorted(t for t, o in _OWNERS.items() if o == target)[:10]
            if known:
                owners, missing, _ = await ChogReader._owner_lookup(known, client)
                changed = False
                for token_id in known:
                    if token_id in owners and owners[token_id] != _OWNERS.get(token_id):
                        _OWNERS[token_id] = owners[token_id]
                        changed = True
                if changed:
                    _save_table()
                still_owned = sorted(t for t in known if owners.get(t) == target)
                if still_owned:
                    print(f"[chog] confirmed from saved table: {still_owned}")
                    return still_owned, balance

            # 2) Look up token IDs we have not seen yet, until one belongs to this wallet
            if _UPPER is None:
                supply = await ChogReader.get_total_supply(client)
                _UPPER = min((supply + 100) if supply else MAX_TOKEN_ID_FALLBACK, MAX_TOKEN_ID_CEILING)
            upper = _UPPER

            for round_number in range(2):
                pending = [
                    i for i in range(0, upper + 1)
                    if i not in _OWNERS and i not in _NONEXISTENT
                ]
                print(f"[chog] {len(pending)} token IDs still to look up (of {upper + 1})")

                unanswered_total = 0
                failed_in_a_row = 0
                for start in range(0, len(pending), SCAN_CHUNK):
                    chunk = pending[start:start + SCAN_CHUNK]
                    owners, missing, unanswered = await ChogReader._owner_lookup(chunk, client)

                    _OWNERS.update(owners)
                    _NONEXISTENT.update(missing)
                    _save_table()
                    unanswered_total += unanswered

                    found = sorted(t for t in chunk if owners.get(t) == target)
                    if found:
                        print(f"[chog] found tokens: {found}")
                        return found, balance

                    # The RPC is not answering at all: stop, progress is saved
                    if unanswered == len(chunk):
                        failed_in_a_row += 1
                        if failed_in_a_row >= 2:
                            print("[chog] RPC is not answering; stopping (progress saved)")
                            raise _busy()
                    else:
                        failed_in_a_row = 0

                if unanswered_total > 0:
                    # Some IDs could not be checked, so "not found" would be a guess
                    raise _busy()

                if round_number == 0:
                    # Everything was looked up and the wallet still has none:
                    # the saved table is out of date. Start it again once.
                    print("[chog] saved owner table looks out of date; rebuilding it")
                    _OWNERS.clear()
                    _NONEXISTENT.clear()

            return [], balance

    # ------------------------------------------------------------------
    # Full pipeline
    # ------------------------------------------------------------------
    @staticmethod
    async def _resolve(address: str) -> Optional[Dict[str, Any]]:
        token_ids, balance = await ChogReader.get_owned_token_ids(address)
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

            return {"tokenId": token_id, "totalOwned": balance, "metadata": metadata}

        raise HTTPException(status_code=503, detail=IPFS_BUSY_MESSAGE)

    @staticmethod
    async def get_chog_stats(address: str) -> Optional[Dict[str, Any]]:
        """
        Wallet -> its Chog (token ID + metadata).
        None means the wallet holds no Chog. If the network is busy this raises a
        503 with a clear message, or serves the last good answer for that wallet.
        """
        key = address.lower()
        cached = _STATS_CACHE.get(key)

        if cached and (time.time() - cached.get("ts", 0)) < STATS_TTL_SECONDS:
            print(f"[chog] cache hit for {address}")
            return cached["stats"]

        try:
            stats = await asyncio.wait_for(
                ChogReader._resolve(address), timeout=FIND_TIMEOUT_SECONDS
            )
        except asyncio.TimeoutError:
            print("[chog] lookup is taking too long; stopping (progress saved)")
            if cached:
                print(f"[chog] serving the saved answer for {address}")
                return _serve_saved(key, cached)
            raise _busy()
        except HTTPException:
            if cached:
                print(f"[chog] network busy; serving the saved answer for {address}")
                return _serve_saved(key, cached)
            raise

        if stats is not None:
            _STATS_CACHE[key] = {"ts": time.time(), "stats": stats}
            _save_json(_CACHE_FILE, _STATS_CACHE)
        return stats