import time
from typing import Dict, Tuple
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.security import create_venue_token, decode_venue_token

router = APIRouter()

# In-memory IP rate limiting for venue access gate attempts
# IP -> (failed_attempts_count, first_failure_timestamp)
FAILED_ATTEMPTS: Dict[str, Tuple[int, float]] = {}
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_WINDOW_SECONDS = 60.0


class AccessGateVerifyPayload(BaseModel):
    access_code: str


class AccessGateResponse(BaseModel):
    success: bool
    message: str
    token: str | None = None


class AccessGateStatusResponse(BaseModel):
    has_access: bool


def _get_client_ip(request: Request) -> str:
    # Handle reverse proxies if present
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/access-gate/verify", response_model=AccessGateResponse)
async def verify_access_code(
    payload: AccessGateVerifyPayload,
    request: Request,
    response: Response,
) -> AccessGateResponse:
    client_ip = _get_client_ip(request)
    now = time.time()

    # Rate limiting check
    if client_ip in FAILED_ATTEMPTS:
        count, first_time = FAILED_ATTEMPTS[client_ip]
        if now - first_time < LOCKOUT_WINDOW_SECONDS:
            if count >= MAX_FAILED_ATTEMPTS:
                remaining_lock = int(LOCKOUT_WINDOW_SECONDS - (now - first_time))
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded: Too many invalid attempts. Terminal locked for {remaining_lock} seconds.",
                )
        else:
            # Window expired, reset
            FAILED_ATTEMPTS.pop(client_ip, None)

    settings = get_settings()
    submitted_code = payload.access_code.strip()

    # Compare strictly without logging the password
    if submitted_code != settings.event_access_code:
        # Increment failed attempts
        count, first_time = FAILED_ATTEMPTS.get(client_ip, (0, now))
        FAILED_ATTEMPTS[client_ip] = (count + 1, first_time)
        raise HTTPException(
            status_code=401,
            detail="ACCESS CODE DENIED // Invalid venue passcode. Contact event organizers at the SymbiTech registration desk.",
        )

    # Success: Clear any failure record for this IP
    FAILED_ATTEMPTS.pop(client_ip, None)

    # Issue 8-hour token
    token = create_venue_token()

    # Set secure httpOnly cookie
    response.set_cookie(
        key="event_access_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=settings.environment == "production",
        max_age=8 * 3600,
    )

    return AccessGateResponse(
        success=True,
        message="ACCESS GRANTED // SymbiTech Venue Authorization Verified.",
        token=token,
    )


@router.get("/access-gate/status", response_model=AccessGateStatusResponse)
async def check_access_status(request: Request) -> AccessGateStatusResponse:
    # Check cookie or Authorization Bearer header
    token = request.cookies.get("event_access_token")
    if not token:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()

    if not token:
        return AccessGateStatusResponse(has_access=False)

    payload = decode_venue_token(token)
    return AccessGateStatusResponse(has_access=payload is not None)
