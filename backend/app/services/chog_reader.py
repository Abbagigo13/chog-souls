# backend/app/services/chog_reader.py
import asyncio
import base64
import json
from typing import Optional, Dict, Any, List
from urllib.parse import unquote

import httpx

# --- Monad Mainnet ---
MONAD_RPC_URLS = [
    "https://rpc.monad.xyz",
    "https://rpc1.monad.xyz",
    "https://monad-mainnet-rpc.publicnode.com",
    "https://monad.drpc.org",
]

CHOG_CONTRACT = "0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763"

# --- IPFS Gateways (all tried at the same time) ---
IPFS_GATEWAYS = [
    "https://ipfs.io/ipfs/",
    "https://dweb.link/ipfs/",
    "https://gateway.pinata.cloud/ipfs/",
    "https://nftstorage.link/ipfs/",
]

# Used only if the contract has no totalSupply()
MAX_TOKEN_ID_FALLBACK = 10000
# Hard ceiling for the slow scan
MAX_TOKEN_ID_CEILING = 20000
# How many ownerOf calls run at the same time during the slow scan
SCAN_CONCURRENCY = 20
# If one token's metadata can't be loaded, try this many of the holder's tokens
MAX_METADATA_TOKEN_TRIES = 5

# Remember results so repeated imports are instant
_STATS_CACHE: Dict[str, Dict[str, Any]] = {}
_METADATA_CACHE: Dict[str, Dict[str, Any]] = {}


class ChogReader:
    """
    Server-side reader for the Chog Genesis NFT contract on Monad Mainnet.
    Uses raw JSON-RPC calls to avoid CORS issues.
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
    async def _rpc_call(
        method: str,
        params: List,
        client: Optional[httpx.AsyncClient] = None,
    ) -> Optional[str]:
        """
        Call a JSON-RPC method, trying each RPC endpoint in order.
        Returns the hex result, or None on failure / contract revert.
        A revert (e.g. token does not exist) is a real answer from the
        contract, so we do NOT retry it on the other RPCs.
        """
        if client is None:
            async with httpx.AsyncClient(timeout=20.0) as own_client:
                return await ChogReader._rpc_call(method, params, own_client)

        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params,
        }

        for rpc_url in MONAD_RPC_URLS:
            try:
                response = await client.post(rpc_url, json=payload)
                if response.status_code != 200:
                    continue  # rate limit or outage: try next RPC
                data = response.json()
                if "result" in data:
                    return data["result"]

                err = data.get("error") or {}
                msg = str(err.get("message", "")).lower()
                if "revert" in msg or "execution" in msg or err.get("code") == 3:
                    return None  # contract said no: don't retry elsewhere
                # any other error: try the next RPC
            except Exception as e:
                print(f"[chog] RPC {rpc_url} failed: {e}")
                continue

        return None

    @staticmethod
    async def get_balance(
        address: str, client: Optional[httpx.AsyncClient] = None
    ) -> int:
        """Get Chog balance of an address."""
        encoded = ChogReader._encode_address(address)
        data = ChogReader.SELECTORS["balanceOf"] + encoded

        result = await ChogReader._rpc_call(
            "eth_call",
            [{"to": CHOG_CONTRACT, "data": data}, "latest"],
            client,
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
        encoded = ChogReader._encode_uint256(token_id)
        data = ChogReader.SELECTORS["ownerOf"] + encoded

        result = await ChogReader._rpc_call(
            "eth_call",
            [{"to": CHOG_CONTRACT, "data": data}, "latest"],
            client,
        )

        if not result or result == "0x" or len(result) < 42:
            return None

        # Result is a 32-byte padded address; take the last 40 hex chars
        return "0x" + result[-40:]

    @staticmethod
    async def get_token_uri(
        token_id: int, client: Optional[httpx.AsyncClient] = None
    ) -> Optional[str]:
        """Get the tokenURI for a specific Chog token."""
        encoded = ChogReader._encode_uint256(token_id)
        data = ChogReader.SELECTORS["tokenURI"] + encoded

        result = await ChogReader._rpc_call(
            "eth_call",
            [{"to": CHOG_CONTRACT, "data": data}, "latest"],
            client,
        )

        if not result or result == "0x":
            return None

        # Result is ABI-encoded string: offset + length + data
        try:
            hex_str = result[2:]  # strip 0x

            if len(hex_str) < 128:
                return None

            length = int(hex_str[64:128], 16)
            string_hex = hex_str[128:128 + (length * 2)]
            return bytes.fromhex(string_hex).decode("utf-8")
        except Exception as e:
            print(f"[chog] TokenURI decode error: {e}")
            return None

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
            # If it's a gateway link, also try the other gateways
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

    @staticmethod
    async def get_owned_token_ids(address: str, max_scan: Optional[int] = None) -> List[int]:
        """Find all Chog token IDs owned by an address."""
        target = address.lower()

        async with httpx.AsyncClient(timeout=20.0) as client:
            balance = await ChogReader.get_balance(address, client)
            print(f"[chog] balanceOf({address}) = {balance}")
            if balance == 0:
                return []

            # --- Fast path: ERC721Enumerable ---
            owned: List[int] = []
            for index in range(min(balance, 20)):
                data = (
                    ChogReader.SELECTORS["tokenOfOwnerByIndex"]
                    + ChogReader._encode_address(address)
                    + ChogReader._encode_uint256(index)
                )
                result = await ChogReader._rpc_call(
                    "eth_call",
                    [{"to": CHOG_CONTRACT, "data": data}, "latest"],
                    client,
                )
                if not result or result == "0x":
                    owned = []  # not enumerable: use the scan below
                    break
                owned.append(int(result, 16))

            if owned:
                print(f"[chog] enumerable path found tokens: {owned}")
                return owned

            # --- Slow path: scan token IDs in parallel ---
            if max_scan is not None:
                upper = max_scan
            else:
                supply = await ChogReader.get_total_supply(client)
                upper = (supply + 200) if supply else MAX_TOKEN_ID_FALLBACK
                upper = min(upper, MAX_TOKEN_ID_CEILING)
            print(f"[chog] not enumerable, scanning token IDs 0..{upper}")

            semaphore = asyncio.Semaphore(SCAN_CONCURRENCY)

            async def check(token_id: int) -> Optional[int]:
                async with semaphore:
                    owner = await ChogReader.get_owner(token_id, client)
                return token_id if owner and owner.lower() == target else None

            owned = []
            for start in range(0, upper + 1, 100):
                ids = range(start, min(start + 100, upper + 1))
                results = await asyncio.gather(*(check(t) for t in ids))
                owned.extend(t for t in results if t is not None)
                if len(owned) >= balance:
                    break

            print(f"[chog] scan found tokens: {owned}")
            return owned

    @staticmethod
    async def get_chog_stats(address: str) -> Optional[Dict[str, Any]]:
        """
        Full pipeline: address -> Chog metadata + tokenId.
        Tries up to a few of the holder's tokens until one has loadable metadata.
        Returns None if no Chog found or no metadata could be fetched.
        """
        key = address.lower()
        if key in _STATS_CACHE:
            print(f"[chog] cache hit for {address}")
            return _STATS_CACHE[key]

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
            _STATS_CACHE[key] = stats
            return stats

        print("[chog] could not load metadata for any token")
        return None