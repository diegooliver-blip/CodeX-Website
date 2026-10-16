import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.limiter import limiter
from app.routers import auth, courses, misc
from app.services import storage

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("codex")


@asynccontextmanager
async def lifespan(_: FastAPI):
    if get_settings().jwt_secret.startswith("dev-only"):
        log.warning("JWT_SECRET is the development default; set a long random value in production")
    try:
        storage.ensure_bucket()
    except Exception as exc:  # storage may come up after the API; uploads will retry on use
        log.warning("Storage not ready: %s", exc)
    yield


app = FastAPI(title="CODEX Platform API", version="3.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[get_settings().web_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def internal_key(request: Request, call_next):
    """When INTERNAL_API_KEY is set, only the Next.js BFF (which sends it) may call the API."""
    key = get_settings().internal_api_key
    if key and request.url.path != "/health" and request.headers.get("x-internal-key") != key:
        return JSONResponse({"detail": "Forbidden"}, status_code=403)
    return await call_next(request)


app.include_router(auth.router)
app.include_router(courses.public)
app.include_router(courses.admin)
app.include_router(misc.router)
