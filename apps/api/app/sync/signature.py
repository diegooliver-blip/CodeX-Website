"""HMAC request signing shared with VS Master Control (see docs/integracion-master-control.md).

    X-Codex-Timestamp: <unix seconds>
    X-Codex-Signature: v1=<hex hmac_sha256(secret, "<timestamp>.<raw body>")>

A request older or newer than TOLERANCE is rejected, so a captured request can't be replayed later;
replays inside the window are absorbed by the event-id inbox.
"""

import hashlib
import hmac
import time

from fastapi import Request

from app.config import get_settings
from app.errors import ApiError

TOLERANCE_S = 300


def sign(secret: str, timestamp: int, body: bytes) -> str:
    mac = hmac.new(secret.encode(), f"{timestamp}.".encode() + body, hashlib.sha256).hexdigest()
    return f"v1={mac}"


async def verified_body(request: Request, *, now: float | None = None) -> bytes:
    secret = get_settings().sync_shared_secret
    if not secret:
        raise ApiError(503, "SYNC_NO_CONFIGURADO", "La sincronización no está habilitada en este servidor.")
    raw = await request.body()
    ts_header = request.headers.get("x-codex-timestamp", "")
    signature = request.headers.get("x-codex-signature", "")
    try:
        ts = int(ts_header)
    except ValueError as exc:
        raise ApiError(401, "FIRMA_INVALIDA", "Falta la marca de tiempo de la firma.") from exc
    if abs((now or time.time()) - ts) > TOLERANCE_S:
        raise ApiError(401, "FIRMA_EXPIRADA", "La firma está fuera de la ventana de tiempo permitida.")
    if not hmac.compare_digest(sign(secret, ts, raw), signature):
        raise ApiError(401, "FIRMA_INVALIDA", "La firma de la solicitud no es válida.")
    return raw
