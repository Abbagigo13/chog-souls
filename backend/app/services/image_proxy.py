# backend/app/services/image_proxy.py
import asyncio
import re
from pathlib import Path
from typing import Dict, Optional, Tuple

import httpx

# Downloaded pictures are saved here so each one is only fetched once
IMAGE_CACHE_DIR = Path(__file__).resolve().parents[2] / "image_cache"

# The gateway that answers most reliably goes first; all are tried at once
IPFS_GATEWAYS = [
    "https://gateway.pinata.cloud/ipfs/",
    "https://ipfs.io/ipfs/",
    "https://dweb.link/ipfs/",
    "https://w3s.link/ipfs/",
    "https://nftstorage.link/ipfs/",
]

# Only plain picture files are served (no SVG, so nothing can run as a script)
CONTENT_TYPES = {
    ".webp": "image/webp",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
}

# CIDv0 ("Qm...") or CIDv1 base32 ("bafy...")
CID_PATTERN = re.compile(r"^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{50,100})$")
FILENAME_PATTERN = re.compile(r"^[A-Za-z0-9._-]{1,100}$")
MAX_IMAGE_BYTES = 5 * 1024 * 1024

# One download per picture at a time, even if many requests ask for it
_INFLIGHT: Dict[str, "asyncio.Task[Optional[bytes]]"] = {}


async def _fetch_one(client: httpx.AsyncClient, url: str) -> Optional[bytes]:
    try:
        response = await client.get(url)
        if response.status_code == 200 and 0 < len(response.content) <= MAX_IMAGE_BYTES:
            return response.content
        print(f"[chog-image] {url} returned HTTP {response.status_code}")
    except Exception as e:
        print(f"[chog-image] {url} failed: {type(e).__name__} {e}")
    return None


def _save(cache_path: Path, data: bytes) -> None:
    try:
        IMAGE_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cache_path.write_bytes(data)
    except OSError as e:
        print(f"[chog-image] could not save {cache_path.name}: {e}")


async def _download(cid: str, filename: str, cache_path: Path) -> Optional[bytes]:
    path = f"{cid}/{filename}"

    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        for attempt in range(2):
            tasks = [
                asyncio.create_task(_fetch_one(client, gateway + path))
                for gateway in IPFS_GATEWAYS
            ]
            try:
                for finished in asyncio.as_completed(tasks):
                    data = await finished
                    if data is not None:
                        _save(cache_path, data)
                        return data
            finally:
                for task in tasks:
                    if not task.done():
                        task.cancel()
                await asyncio.gather(*tasks, return_exceptions=True)

            print(f"[chog-image] every gateway failed for {path} (attempt {attempt + 1} of 2)")
            await asyncio.sleep(1.5)

    return None


async def fetch_ipfs_image(cid: str, filename: str) -> Optional[Tuple[bytes, str]]:
    """
    Return (image bytes, content type) for ipfs://<cid>/<filename>,
    or None if the request is invalid or no gateway has it.
    """
    if not CID_PATTERN.match(cid):
        return None
    if not FILENAME_PATTERN.match(filename) or filename.startswith("."):
        return None

    content_type = CONTENT_TYPES.get(Path(filename).suffix.lower())
    if content_type is None:
        return None

    cache_path = IMAGE_CACHE_DIR / f"{cid}_{filename}"
    if cache_path.exists():
        try:
            return cache_path.read_bytes(), content_type
        except OSError:
            pass

    key = f"{cid}/{filename}"
    task = _INFLIGHT.get(key)
    if task is None:
        task = asyncio.create_task(_download(cid, filename, cache_path))
        _INFLIGHT[key] = task
        task.add_done_callback(lambda _t, k=key: _INFLIGHT.pop(k, None))

    data = await asyncio.shield(task)
    return (data, content_type) if data else None