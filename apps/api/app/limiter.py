from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def client_ip(request: Request) -> str:
    # Requests arrive through the Next.js BFF, which resolves the visitor IP from the trusted proxy chain and
    # sends it as x-client-ip. In production the API only accepts calls carrying INTERNAL_API_KEY, so a
    # visitor can't set this header directly; raw X-Forwarded-For is never trusted.
    return request.headers.get("x-client-ip", "").strip()[:64] or get_remote_address(request)


limiter = Limiter(key_func=client_ip)
