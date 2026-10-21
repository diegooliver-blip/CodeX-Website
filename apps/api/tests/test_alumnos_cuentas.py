"""Student password reset and email verification: one-time links, emailed through the outbox."""

from urllib.parse import parse_qs, urlparse

from sqlalchemy import select

from app.db import SessionLocal
from app.models import OutboxEvent

PASSWORD = "clave-alumno-123"


async def _last_link(email: str, tipo: str) -> str:
    async with SessionLocal() as s:
        event = await s.scalar(
            select(OutboxEvent).where(OutboxEvent.tipo == tipo, OutboxEvent.datos["email"].astext == email).order_by(OutboxEvent.id.desc())
        )
    link = event.datos["variables"]["enlace"]
    return parse_qs(urlparse(link).query)["token"][0]


async def test_signup_sends_verification_and_link_verifies_once(client):
    res = await client.post("/alumnos/registro", json={"email": "verifica@example.com", "nombre": "Vera Alumna", "password": PASSWORD})
    headers = {"Authorization": f"Bearer {res.json()['access_token']}"}
    assert (await client.get("/alumnos/me", headers=headers)).json()["verificado"] is False

    token = await _last_link("verifica@example.com", "alumno_verificar")
    assert (await client.post("/alumnos/verificar", json={"token": token})).status_code == 204
    assert (await client.get("/alumnos/me", headers=headers)).json()["verificado"] is True
    again = await client.post("/alumnos/verificar", json={"token": token})
    assert again.status_code == 400 and again.json()["error"]["codigo"] == "ENLACE_INVALIDO"


async def test_password_reset_flow(client):
    await client.post("/alumnos/registro", json={"email": "olvido@example.com", "nombre": "Olga", "password": PASSWORD})
    unknown = await client.post("/alumnos/olvide", json={"email": "nadie@example.com"})
    known = await client.post("/alumnos/olvide", json={"email": "olvido@example.com"})
    assert unknown.status_code == known.status_code == 202 and unknown.json() == known.json()

    first = await _last_link("olvido@example.com", "alumno_restablecer")
    await client.post("/alumnos/olvide", json={"email": "olvido@example.com"})
    second = await _last_link("olvido@example.com", "alumno_restablecer")
    stale = await client.post("/alumnos/restablecer", json={"token": first, "password": "nueva-clave-2026"})
    assert stale.json()["error"]["codigo"] == "ENLACE_INVALIDO"  # a newer link replaces the older one

    ok = await client.post("/alumnos/restablecer", json={"token": second, "password": "nueva-clave-2026"})
    assert ok.status_code == 200 and ok.json()["access_token"]
    assert (await client.post("/alumnos/login", json={"email": "olvido@example.com", "password": PASSWORD})).status_code == 401
    assert (await client.post("/alumnos/login", json={"email": "olvido@example.com", "password": "nueva-clave-2026"})).status_code == 200
    reuse = await client.post("/alumnos/restablecer", json={"token": second, "password": "otra-clave-2026"})
    assert reuse.status_code == 400


async def test_staff_accounts_get_no_reset_link(client, admin_headers):
    await client.post("/alumnos/olvide", json={"email": "test@codexai.com"})
    async with SessionLocal() as s:
        sent = await s.scalar(select(OutboxEvent).where(OutboxEvent.datos["email"].astext == "test@codexai.com", OutboxEvent.tipo == "alumno_restablecer"))
    assert sent is None


async def test_link_payload_is_scrubbed_after_delivery():
    from app import worker
    from app.services import outbox

    async with SessionLocal() as s, s.begin():
        outbox.enqueue(s, "alumno_restablecer", "alumno", "x", {"email": "scrub@example.com", "variables": {"enlace": "https://x/?token=secreto"}})
    await worker.process_events()  # no Loops key in tests: skipped, and the link is erased anyway
    async with SessionLocal() as s:
        event = await s.scalar(select(OutboxEvent).where(OutboxEvent.entidad_id == "x"))
    assert event.procesado_en is not None and event.datos == {"borrado": True}
