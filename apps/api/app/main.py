import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import VERSION
from app.config import get_settings
from app.errors import error_body, install_error_handlers
from app.limiter import limiter
from app.observability import TraceMiddleware, configure_logging, log
from app.routers import auth, courses, misc
from app.services import storage

configure_logging()


@asynccontextmanager
async def lifespan(_: FastAPI):
    if get_settings().jwt_secret.startswith("dev-only"):
        log.warning("jwt_secret_por_defecto", detalle="set a long random JWT_SECRET in production")
    try:  # storage may come up after the API; never block startup on it
        await asyncio.wait_for(asyncio.to_thread(storage.ensure_bucket), timeout=10)
    except Exception as exc:
        log.warning("storage_no_listo", error=str(exc) or type(exc).__name__)
    yield


app = FastAPI(title="CODEX Platform API", version=VERSION, lifespan=lifespan)
app.state.limiter = limiter
install_error_handlers(app)
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
        return JSONResponse(error_body("PROHIBIDO", "Acceso no autorizado."), status_code=403)
    return await call_next(request)


# Added last so it is the outermost middleware: every response, including errors, gets the trace id.
app.add_middleware(TraceMiddleware)


app.include_router(auth.router)
app.include_router(courses.public)
app.include_router(courses.admin)
app.include_router(misc.router)
