# backend/app/services/verification.py
"""
Proof of ownership for a Chog.

1. The server hands out a challenge message (stamped so it can recognise it later).
2. The player signs it with their wallet. Signing is free and sends no transaction.
3. The server recovers the signer from the signature and checks on-chain that this
   wallet owns the Chog. If so it returns a signed "proof" that only this server
   can create and check.

Nothing is stored on the server: the challenge and the proof are both stamped with
an HMAC, so they cannot be forged or edited.
"""
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import time
from datetime import datetime, timezone
from typing import Optional

from eth_account import Account
from eth_account.messages import encode_defunct

CHALLENGE_TTL_SECONDS = 10 * 60          # sign within 10 minutes
PROOF_TTL_SECONDS = 30 * 24 * 3600       # a proof lasts 30 days

_ENV_SECRET = os.getenv("VERIFY_SECRET", "").strip()
if not _ENV_SECRET:
    print(
        "[verify] VERIFY_SECRET is not set: using a temporary secret. "
        "Verified owners will need to verify again whenever the server restarts. "
        "Set VERIFY_SECRET in your environment to keep proofs valid."
    )
_SECRET = (_ENV_SECRET or secrets.token_hex(32)).encode("utf-8")

ADDRESS_PATTERN = re.compile(r"^0x[a-fA-F0-9]{40}$")


def _stamp(text: str) -> str:
    return hmac.new(_SECRET, text.encode("utf-8"), hashlib.sha256).hexdigest()


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


# ---------------------------------------------------------------------------
# Challenge
# ---------------------------------------------------------------------------
def build_challenge(address: str, token_id: int) -> dict:
    """The message the player signs, plus the stamp that proves we wrote it."""
    issued = int(time.time())
    nonce = secrets.token_hex(16)
    issued_text = datetime.fromtimestamp(issued, timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    message = (
        "CHOG SOULS: prove you own this Chog\n\n"
        f"Wallet: {address}\n"
        f"Chog token: #{token_id}\n"
        f"Nonce: {nonce}\n"
        f"Issued at (unix): {issued}\n"
        f"Issued at: {issued_text}\n\n"
        "Signing is free. It sends no transaction and costs no gas."
    )
    return {"message": message, "challenge_token": _stamp(message)}


def challenge_is_valid(message: str, challenge_token: str, address: str, token_id: int) -> bool:
    """We wrote this message, it names this wallet and Chog, and it is still fresh."""
    if not hmac.compare_digest(_stamp(message), str(challenge_token)):
        return False

    wallet = re.search(r"^Wallet: (0x[a-fA-F0-9]{40})$", message, re.MULTILINE)
    token = re.search(r"^Chog token: #(\d+)$", message, re.MULTILINE)
    issued = re.search(r"^Issued at \(unix\): (\d+)$", message, re.MULTILINE)
    if not (wallet and token and issued):
        return False

    if wallet.group(1).lower() != address.lower():
        return False
    if int(token.group(1)) != int(token_id):
        return False

    age = time.time() - int(issued.group(1))
    return -30 <= age <= CHALLENGE_TTL_SECONDS


def recover_signer(message: str, signature: str) -> Optional[str]:
    """The wallet address that signed the message (lowercase), or None if invalid."""
    try:
        signer = Account.recover_message(encode_defunct(text=message), signature=signature)
        return signer.lower()
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Proof
# ---------------------------------------------------------------------------
def issue_proof(address: str, token_id: int) -> dict:
    expires = int(time.time()) + PROOF_TTL_SECONDS
    payload = _b64(
        json.dumps({"a": address.lower(), "t": int(token_id), "exp": expires}, separators=(",", ":")).encode("utf-8")
    )
    return {"proof": f"{payload}.{_stamp(payload)}", "expires": expires}


def validate_proof(proof: str, token_id: int) -> Optional[str]:
    """The verified wallet address if the proof is genuine, unexpired and for this Chog."""
    if not proof or "." not in proof:
        return None
    try:
        payload, stamp = proof.rsplit(".", 1)
        if not hmac.compare_digest(_stamp(payload), stamp):
            return None
        data = json.loads(_unb64(payload))
        if int(data["exp"]) < time.time():
            return None
        if int(data["t"]) != int(token_id):
            return None
        return str(data["a"]).lower()
    except Exception:
        return None