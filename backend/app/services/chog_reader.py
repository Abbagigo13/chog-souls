# backend/app/services/chog_reader.py
import httpx
from typing import Optional, Dict, Any, List

# --- Monad Mainnet ---
MONAD_RPC_URLS = [
    "https://rpc.monad.xyz",
    "https://rpc1.monad.xyz",
    "https://monad-mainnet-rpc.publicnode.com",
    "https://monad.drpc.org",
]

CHOG_CONTRACT = "0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763"

# --- IPFS Gateways (fallbacks) ---
IPFS_GATEWAYS = [
    "https://ipfs.io/ipfs/",
    "https://cloudflare-ipfs.com/ipfs/",
    "https://gateway.pinata.cloud/ipfs/",
]


class ChogReader:
    """
    Server-side reader for the Chog Genesis NFT contract on Monad Mainnet.
    Uses raw JSON-RPC calls to avoid CORS issues.
    """

    # --- ABI method selectors (keccak-256 first 4 bytes) ---
    # Precomputed for the functions we need
    SELECTORS = {
        "balanceOf": "0x70a08231",  # balanceOf(address)
        "ownerOf": "0x6352211e",    # ownerOf(uint256)
        "tokenURI": "0xc87b56dd",   # tokenURI(uint256)
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
    async def _rpc_call(method: str, params: List) -> Optional[str]:
        """
        Call a JSON-RPC method, trying each RPC endpoint in order.
        Returns the hex result or None on failure.
        """
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params,
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            for rpc_url in MONAD_RPC_URLS:
                try:
                    response = await client.post(rpc_url, json=payload)
                    if response.status_code == 200:
                        data = response.json()
                        if "result" in data:
                            return data["result"]
                except Exception as e:
                    print(f"RPC {rpc_url} failed: {e}")
                    continue

        return None

    @staticmethod
    async def get_balance(address: str) -> int:
        """Get Chog balance of an address."""
        encoded = ChogReader._encode_address(address)
        data = ChogReader.SELECTORS["balanceOf"] + encoded

        result = await ChogReader._rpc_call(
            "eth_call",
            [{"to": CHOG_CONTRACT, "data": data}, "latest"],
        )

        if not result or result == "0x":
            return 0

        return int(result, 16)

    @staticmethod
    async def get_owner(token_id: int) -> Optional[str]:
        """Get the owner of a specific Chog token."""
        encoded = ChogReader._encode_uint256(token_id)
        data = ChogReader.SELECTORS["ownerOf"] + encoded

        result = await ChogReader._rpc_call(
            "eth_call",
            [{"to": CHOG_CONTRACT, "data": data}, "latest"],
        )

        if not result or result == "0x" or len(result) < 42:
            return None

        # Result is a 32-byte padded address; take the last 40 hex chars
        return "0x" + result[-40:]

    @staticmethod
    async def get_token_uri(token_id: int) -> Optional[str]:
        """Get the tokenURI for a specific Chog token."""
        encoded = ChogReader._encode_uint256(token_id)
        data = ChogReader.SELECTORS["tokenURI"] + encoded

        result = await ChogReader._rpc_call(
            "eth_call",
            [{"to": CHOG_CONTRACT, "data": data}, "latest"],
        )

        if not result or result == "0x":
            return None

        # Result is ABI-encoded string: offset + length + data
        try:
            hex_str = result[2:]  # strip 0x

            # Skip offset (first 64 chars)
            if len(hex_str) < 128:
                return None

            # Read length (next 64 chars)
            length_hex = hex_str[64:128]
            length = int(length_hex, 16)

            # Read the actual string data
            string_hex = hex_str[128:128 + (length * 2)]

            # Decode as UTF-8
            return bytes.fromhex(string_hex).decode("utf-8")
        except Exception as e:
            print(f"TokenURI decode error: {e}")
            return None

    @staticmethod
    async def _fetch_metadata(uri: str) -> Optional[Dict[str, Any]]:
        """Fetch metadata JSON from a tokenURI (handles ipfs:// and http)."""
        # Normalize the URI
        if uri.startswith("ipfs://"):
            ipfs_hash = uri.replace("ipfs://", "").split("/")[-1]
            urls_to_try = [gw + ipfs_hash for gw in IPFS_GATEWAYS]
        elif uri.startswith("http"):
            urls_to_try = [uri]
        else:
            return None

        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            for url in urls_to_try:
                try:
                    response = await client.get(url)
                    if response.status_code == 200:
                        return response.json()
                except Exception as e:
                    print(f"IPFS gateway {url} failed: {e}")
                    continue

        return None

    @staticmethod
    async def get_owned_token_ids(address: str, max_scan: int = 500) -> List[int]:
        """Find all Chog token IDs owned by an address."""
        balance = await ChogReader.get_balance(address)
        if balance == 0:
            return []

        owned = []

        # Scan tokens in batches
        for token_id in range(1, max_scan + 1):
            if len(owned) >= balance:
                break

            owner = await ChogReader.get_owner(token_id)
            if owner and owner.lower() == address.lower():
                owned.append(token_id)

        return owned

    @staticmethod
    async def get_chog_stats(address: str) -> Optional[Dict[str, Any]]:
        """
        Full pipeline: address → Chog metadata + tokenId.
        Returns None if no Chog found or metadata fetch fails.
        """
        token_ids = await ChogReader.get_owned_token_ids(address)
        if not token_ids:
            return None

        token_id = token_ids[0]
        token_uri = await ChogReader.get_token_uri(token_id)
        if not token_uri:
            return None

        metadata = await ChogReader._fetch_metadata(token_uri)
        if not metadata:
            return None

        return {
            "tokenId": token_id,
            "totalOwned": len(token_ids),
            "metadata": metadata,
        }