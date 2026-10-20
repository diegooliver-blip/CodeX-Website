"""JSON logging with a per-request trace id.

Every log line carries `traceId` (also returned as the `x-trace-id` header and inside error bodies),
so one support ticket maps to every log line of that request. Never log personal data here.
"""

import json
import logging
import time
import uuid
from contextvars import ContextVar

import structlog
from starlette.types import ASGIApp, Message, Receive, Scope, Send

trace_id_var: ContextVar[str] = ContextVar("trace_id", default="")


def _add_trace_id(_, __, event: dict) -> dict:
    if (tid := trace_id_var.get()) and "traceId" not in event:
        event["traceId"] = tid
    return event


def configure_logging(level: int = logging.INFO) -> None:
    shared = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        _add_trace_id,
    ]
    structlog.configure(
        processors=[*shared, structlog.processors.format_exc_info, structlog.processors.JSONRenderer()],
        wrapper_class=structlog.make_filtering_bound_logger(level),
        cache_logger_on_first_use=True,
    )
    # Route stdlib loggers (uvicorn, sqlalchemy, our older modules) through the same JSON renderer.
    handler = logging.StreamHandler()
    handler.setFormatter(
        structlog.stdlib.ProcessorFormatter(
            foreign_pre_chain=[structlog.stdlib.add_logger_name, *shared],
            processors=[structlog.stdlib.ProcessorFormatter.remove_processors_meta, structlog.processors.JSONRenderer()],
        )
    )
    root = logging.getLogger()
    root.handlers[:] = [handler]
    root.setLevel(level)
    logging.getLogger("uvicorn.access").disabled = True  # replaced by our access line below


log = structlog.get_logger("codex")


class TraceMiddleware:
    """Pure ASGI (so SSE streams are not buffered): assigns the trace id and writes one access line per request."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        incoming = dict(scope["headers"]).get(b"x-trace-id", b"").decode()[:64]
        tid = incoming if incoming.replace("-", "").isalnum() and incoming else uuid.uuid4().hex
        token = trace_id_var.set(tid)
        started = time.perf_counter()
        status = 500

        async def send_wrapper(message: Message) -> None:
            nonlocal status
            if message["type"] == "http.response.start":
                status = message["status"]
                message.setdefault("headers", []).append((b"x-trace-id", tid.encode()))
            await send(message)

        started_response = False

        async def tracked_send(message: Message) -> None:
            nonlocal started_response
            started_response = started_response or message["type"] == "http.response.start"
            await send_wrapper(message)

        try:
            await self.app(scope, receive, tracked_send)
        except Exception as exc:
            # Unhandled errors are answered here (not by Starlette's outer handler) so the body and
            # header still carry this request's trace id.
            log.exception("error_no_controlado", tipo=type(exc).__name__)
            if started_response:
                raise
            body = json.dumps(
                {"error": {"codigo": "ERROR_INTERNO", "mensaje": "Ocurrió un error inesperado. Ya quedó registrado.",
                           "detalles": None, "traceId": tid}}
            ).encode()
            await send_wrapper({"type": "http.response.start", "status": 500,
                                "headers": [(b"content-type", b"application/json")]})
            await send_wrapper({"type": "http.response.body", "body": body})
        finally:
            log.info(
                "http",
                metodo=scope["method"],
                ruta=scope["path"],
                status=status,
                duracion_ms=round((time.perf_counter() - started) * 1000, 1),
            )
            trace_id_var.reset(token)
