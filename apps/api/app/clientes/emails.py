"""Client-portal emails, sent by the worker from the portal database's outbox via Loops transactional API.

Payloads carry one-time links, so these event types are scrubbed after delivery (see outbox.process_batch).
"""

import httpx

from app.config import get_settings
from app.services.outbox import Skip

TRANSACTIONAL_URL = "https://app.loops.so/api/v1/transactional"

INVITACION = "cliente_invitacion"
RESTABLECER = "cliente_restablecer"
CONTRASENA_CAMBIADA = "cliente_contrasena_cambiada"
SECRET_TYPES = frozenset({INVITACION, RESTABLECER})


def _template_id(tipo: str) -> str:
    s = get_settings()
    return {
        INVITACION: s.loops_tx_invitacion,
        RESTABLECER: s.loops_tx_restablecer,
        CONTRASENA_CAMBIADA: s.loops_tx_contrasena_cambiada,
    }[tipo]


async def deliver(event) -> None:
    s = get_settings()
    template = _template_id(event.tipo)
    if not s.loops_api_key or not template:
        raise Skip(f"Loops transaccional sin configurar para {event.tipo}")
    d = event.datos
    async with httpx.AsyncClient(timeout=httpx.Timeout(8.0, connect=4.0)) as client:
        res = await client.post(
            TRANSACTIONAL_URL,
            json={"transactionalId": template, "email": d["email"], "dataVariables": d.get("variables", {})},
            headers={"Authorization": f"Bearer {s.loops_api_key}", "Idempotency-Key": f"codex-clientes-{event.id}"},
        )
    if res.status_code >= 400:
        raise RuntimeError(f"Loops transaccional -> {res.status_code} {res.text[:200]}")


HANDLERS = {INVITACION: deliver, RESTABLECER: deliver, CONTRASENA_CAMBIADA: deliver}
