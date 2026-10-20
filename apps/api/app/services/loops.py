"""Loops.so integration: upsert the contact, then send an event that triggers a Loop.

Called only from the outbox worker. Transient failures raise so the event is retried; a missing API key
raises `Skip`, which marks the event processed without sending (nothing is ever faked as sent).
"""

import httpx

from app.config import get_settings
from app.services.outbox import Skip

BASE = "https://app.loops.so/api/v1"
TIMEOUT = httpx.Timeout(8.0, connect=4.0)


class LoopsError(Exception):
    pass


async def _call(client: httpx.AsyncClient, method: str, path: str, body: dict, headers: dict) -> None:
    res = await client.request(method, f"{BASE}{path}", json=body, headers=headers)
    if res.status_code >= 400:
        # 4xx other than rate limiting won't fix itself, but retrying a few times then DLQ keeps it visible.
        raise LoopsError(f"{method} {path} -> {res.status_code} {res.text[:200]}")


async def track(
    email: str,
    event: str,
    *,
    first_name: str = "",
    source: str = "web",
    properties: dict | None = None,
    idempotency_key: str = "",
) -> None:
    key = get_settings().loops_api_key
    if not key:
        raise Skip("LOOPS_API_KEY no configurada")
    auth = {"Authorization": f"Bearer {key}"}
    contact = {"email": email, "source": source} | ({"firstName": first_name} if first_name else {})
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        await _call(client, "PUT", "/contacts/update", contact, auth)
        # Loops de-duplicates events sent with the same Idempotency-Key [VERIFICAR ventana en docs de Loops].
        headers = auth | ({"Idempotency-Key": idempotency_key} if idempotency_key else {})
        await _call(
            client,
            "POST",
            "/events/send",
            {"email": email, "eventName": event, "eventProperties": properties or {}},
            headers,
        )


async def deliver(event) -> None:
    """Outbox handler for `lead_created` and `course_interest`."""
    d = event.datos
    await track(
        d["email"],
        event.tipo,
        first_name=d.get("first_name", ""),
        source=d.get("source", "web"),
        properties=d.get("properties") or {},
        idempotency_key=f"codex-outbox-{event.id}",
    )
