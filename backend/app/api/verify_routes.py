# backend/app/api/verify_routes.py
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services import verification
from ..services.chog_reader import ChogReader, BUSY_MESSAGE

router = APIRouter()


class ChallengeRequest(BaseModel):
    address: str
    token_id: int


class CheckRequest(BaseModel):
    address: str
    token_id: int
    message: str
    challenge_token: str
    signature: str


def _check_address(address: str) -> str:
    address = address.strip()
    if not verification.ADDRESS_PATTERN.match(address):
        raise HTTPException(status_code=400, detail="Invalid wallet address")
    return address


@router.post("/verify/challenge")
async def verify_challenge(request: ChallengeRequest):
    address = _check_address(request.address)
    if request.token_id < 0:
        raise HTTPException(status_code=400, detail="Invalid Chog token")
    return verification.build_challenge(address, request.token_id)


@router.post("/verify/check")
async def verify_check(request: CheckRequest):
    address = _check_address(request.address)

    # 1) We wrote this challenge, it is for this wallet and Chog, and it is fresh
    if not verification.challenge_is_valid(
        request.message, request.challenge_token, address, request.token_id
    ):
        raise HTTPException(
            status_code=400,
            detail="That verification request expired. Please try again.",
        )

    # 2) The signature really comes from this wallet
    signer = verification.recover_signer(request.message, request.signature)
    if signer != address.lower():
        raise HTTPException(
            status_code=401,
            detail="The signature does not match this wallet.",
        )

    # 3) This wallet really owns this Chog on Monad right now
    async with httpx.AsyncClient(timeout=10.0) as client:
        owners, _missing, unanswered = await ChogReader._owner_lookup([request.token_id], client)

    if unanswered:
        raise HTTPException(status_code=503, detail=BUSY_MESSAGE)

    if owners.get(request.token_id) != address.lower():
        raise HTTPException(
            status_code=403,
            detail=f"This wallet does not own Chog token #{request.token_id}.",
        )

    issued = verification.issue_proof(address, request.token_id)
    return {
        "verified": True,
        "address": address.lower(),
        "token_id": request.token_id,
        "proof": issued["proof"],
        "expires": issued["expires"],
    }