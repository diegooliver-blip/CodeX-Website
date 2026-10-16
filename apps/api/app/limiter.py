from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def client_ip(request: Request) -> str:
    # Requests arrive through the Next.js BFF, which forwards the visitor IP.
    forwarded = request.headers.get("x-forwarded-for")
    return forwarded.split(",")[0].strip() if forwarded else get_remote_address(request)


limiter = Limiter(key_func=client_ip)
