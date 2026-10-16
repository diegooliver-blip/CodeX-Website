"""Loops.so integration: upsert the contact, then send an event that triggers a Loop.

Failures are logged and swallowed — a Loops outage must never break a lead form.
"""

import logging

import httpx

from app.config import get_settings

log = logging.getLogger(__name__)
BASE = "https://app.loops.so/api/v1"


async def _call(method: str, path: str, body: dict) -> bool:
    key = get_settings().loops_api_key
    if not key:
        log.info("LOOPS_API_KEY not set; skipping %s %s", method, path)
        return False
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            res = await client.request(
                method, f"{BASE}{path}", json=body, headers={"Authorization": f"Bearer {key}"}
            )
        if res.status_code >= 400:
            log.warning("Loops %s %s -> %s %s", method, path, res.status_code, res.text[:300])
            return False
        return True
    except httpx.HTTPError as exc:
        log.warning("Loops %s %s failed: %s", method, path, exc)
        return False


async def track(email: str, event: str, *, first_name: str = "", source: str = "web", properties: dict | None = None) -> None:
    contact = {"email": email, "source": source}
    if first_name:
        contact["firstName"] = first_name
    if await _call("PUT", "/contacts/update", contact):
        await _call("POST", "/events/send", {"email": email, "eventName": event, "eventProperties": properties or {}})
