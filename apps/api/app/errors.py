"""Stable error contract: every error response is

    {"error": {"codigo": "NO_ENCONTRADO", "mensaje": "...", "detalles": {...} | null, "traceId": "..."}}

`codigo` is the machine-readable part clients branch on; `mensaje` is safe to show to a person.
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.observability import trace_id_var

# Default code per status for plain HTTPExceptions raised across the routers.
_BY_STATUS = {
    400: "SOLICITUD_INVALIDA",
    401: "NO_AUTENTICADO",
    403: "PROHIBIDO",
    404: "NO_ENCONTRADO",
    409: "CONFLICTO",
    413: "DEMASIADO_GRANDE",
    422: "VALIDACION",
    429: "DEMASIADAS_SOLICITUDES",
    503: "NO_DISPONIBLE",
}


class ApiError(HTTPException):
    """HTTPException with an explicit, stable error code."""

    def __init__(self, status_code: int, codigo: str, mensaje: str, detalles: dict | list | None = None) -> None:
        super().__init__(status_code, mensaje)
        self.codigo = codigo
        self.detalles = detalles


def error_body(codigo: str, mensaje: str, detalles: dict | list | None = None) -> dict:
    return {"error": {"codigo": codigo, "mensaje": mensaje, "detalles": detalles, "traceId": trace_id_var.get()}}


def _response(status: int, codigo: str, mensaje: str, detalles=None, headers=None) -> JSONResponse:
    return JSONResponse(error_body(codigo, mensaje, detalles), status_code=status, headers=headers)


async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    codigo = getattr(exc, "codigo", None) or _BY_STATUS.get(exc.status_code, "ERROR")
    mensaje = exc.detail if isinstance(exc.detail, str) else "La solicitud no se pudo procesar."
    return _response(exc.status_code, codigo, mensaje, getattr(exc, "detalles", None), getattr(exc, "headers", None))


async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    campos = [
        {"campo": ".".join(str(p) for p in e["loc"] if p not in ("body", "query", "path")), "mensaje": e["msg"]}
        for e in exc.errors()
    ]
    return _response(422, "VALIDACION", "Revisa los campos marcados.", {"campos": campos})


async def _rate_limited(_: Request, exc: RateLimitExceeded) -> JSONResponse:
    return _response(429, "DEMASIADAS_SOLICITUDES", "Demasiadas solicitudes. Espera un momento e intenta de nuevo.")


def install_error_handlers(app: FastAPI) -> None:
    # Unexpected exceptions are answered by observability.TraceMiddleware (it owns the trace id).
    app.add_exception_handler(StarletteHTTPException, _http_error)
    app.add_exception_handler(RequestValidationError, _validation_error)
    app.add_exception_handler(RateLimitExceeded, _rate_limited)
