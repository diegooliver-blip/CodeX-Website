"""Cloudflare Turnstile server-side verification. Fails closed: no secret or no answer means no access."""

import httpx

from app.config import get_settings
from app.errors import ApiError
from app.observability import log

VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


async def require_human(token: str | None, ip: str = "") -> None:
    secret = get_settings().turnstile_secret
    if not secret:
        raise ApiError(503, "CAPTCHA_NO_CONFIGURADO", "La verificación de seguridad no está disponible. Intenta más tarde.")
    if not token:
        raise ApiError(400, "CAPTCHA_REQUERIDO", "Completa la verificación de seguridad.")
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(6.0, connect=3.0)) as client:
            res = await client.post(VERIFY_URL, data={"secret": secret, "response": token, "remoteip": ip})
        body = res.json()
    except (httpx.HTTPError, ValueError) as exc:
        log.warning("turnstile_no_disponible", error=type(exc).__name__)
        raise ApiError(503, "CAPTCHA_NO_DISPONIBLE", "No pudimos validar la verificación de seguridad. Intenta de nuevo.") from exc
    if not body.get("success"):
        log.info("turnstile_rechazado", codigos=body.get("error-codes", []))
        raise ApiError(400, "CAPTCHA_INVALIDO", "La verificación de seguridad expiró o no es válida. Inténtalo otra vez.")
