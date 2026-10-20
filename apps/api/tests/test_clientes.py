"""Client portal: invitation-only identity, password recovery, sessions, RLS isolation and the Master Control sync."""

import json
import time
import uuid
from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qs, urlparse

import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import DBAPIError

from app.clientes.db import ClientesSession, scope_to_client
from app.clientes.models import ClientUser, Service, SyncInbox
from app.services.outbox import process_batch
from app.sync.signature import sign

SECRET = "secreto-sync-pruebas"
GOOD_PASSWORD = "Kiosko-Norte-2026!"


# ---------- helpers ----------
def _signed(body: dict, *, secret: str = SECRET, ts: int | None = None) -> tuple[bytes, dict]:
    raw = json.dumps(body).encode()
    ts = ts or int(time.time())
    return raw, {"x-codex-timestamp": str(ts), "x-codex-signature": sign(secret, ts, raw), "content-type": "application/json"}


async def sync(client, *events: dict, **kw):
    raw, headers = _signed({"events": [{"event_id": e.get("event_id", uuid.uuid4().hex), **e} for e in events]}, **kw)
    return await client.post("/v1/sync/events", content=raw, headers=headers)


async def new_client_with_user(client, *, email: str, services: int = 1) -> dict:
    mc_client = f"cli-{uuid.uuid4().hex[:8]}"
    svc_ids = [f"svc-{uuid.uuid4().hex[:8]}" for _ in range(services)]
    res = await sync(
        client,
        {"tipo": "client.upserted", "version": 1, "datos": {"mc_client_id": mc_client, "nombre": f"Empresa {mc_client}"}},
        *[
            {"tipo": "service.upserted", "version": 1, "datos": {
                "mc_service_id": s, "mc_client_id": mc_client, "nombre": f"Plataforma {s}", "etapa": "desarrollo", "avance": 40}}
            for s in svc_ids
        ],
        {"tipo": "client_user.invited", "datos": {"mc_client_id": mc_client, "email": email, "nombre": "Ana"}},
    )
    results = res.json()["resultados"]
    link = results[-1]["enlace"]
    token = parse_qs(urlparse(link).query)["token"][0]
    return {"mc_client": mc_client, "services": svc_ids, "token": token, "results": results}


async def activate(client, token: str, password: str = GOOD_PASSWORD) -> dict:
    res = await client.post("/v1/clientes/auth/activar", json={"token": token, "password": password, "captcha": "ok"})
    assert res.status_code == 200, res.text
    return res.json()


def session_headers(session: str) -> dict:
    return {"X-Client-Session": session}


# ---------- sync API ----------
async def test_sync_rejects_bad_signature_and_old_timestamps(client):
    raw, headers = _signed({"events": []}, secret="otro-secreto")
    res = await client.post("/v1/sync/events", content=raw, headers=headers)
    assert res.status_code == 401 and res.json()["error"]["codigo"] == "FIRMA_INVALIDA"

    raw, headers = _signed({"events": [{"event_id": "x" * 10, "tipo": "client.upserted", "datos": {}}]}, ts=int(time.time()) - 3600)
    res = await client.post("/v1/sync/events", content=raw, headers=headers)
    assert res.json()["error"]["codigo"] == "FIRMA_EXPIRADA"


async def test_sync_replayed_event_is_applied_once(client):
    event = {"event_id": f"evt-{uuid.uuid4().hex}", "tipo": "client.upserted", "version": 3,
             "datos": {"mc_client_id": f"cli-{uuid.uuid4().hex[:8]}", "nombre": "Replay SA"}}
    first = (await sync(client, event)).json()["resultados"][0]
    second = (await sync(client, event)).json()["resultados"][0]
    assert first["resultado"] == "aplicado" and second["resultado"] == "duplicado"


async def test_sync_ignores_stale_versions(client):
    data = await new_client_with_user(client, email=f"v-{uuid.uuid4().hex[:6]}@example.com")
    svc = data["services"][0]
    base = {"mc_service_id": svc, "mc_client_id": data["mc_client"], "nombre": "X"}
    await sync(client, {"tipo": "service.upserted", "version": 5, "datos": base | {"avance": 80}})
    stale = (await sync(client, {"tipo": "service.upserted", "version": 4, "datos": base | {"avance": 10}})).json()
    assert stale["resultados"][0]["resultado"] == "version_antigua"
    async with ClientesSession() as db:
        await db.execute(text("SELECT set_config('app.contexto', 'sync', true)"))
        assert (await db.scalar(select(Service.avance).where(Service.mc_service_id == svc))) == 80


async def test_sync_event_for_unknown_client_is_not_recorded(client):
    """A rejected event is not marked in the inbox, so Master Control's retry applies it once the client exists."""
    event_id = f"evt-{uuid.uuid4().hex}"
    res = await sync(client, {"event_id": event_id, "tipo": "service.upserted",
                              "datos": {"mc_service_id": "svc-x", "mc_client_id": "no-existe", "nombre": "X"}})
    assert res.json()["resultados"][0]["codigo"] == "CLIENTE_DESCONOCIDO"
    async with ClientesSession() as db:
        assert await db.get(SyncInbox, event_id) is None


async def test_partial_snapshot_never_retires_services(client):
    data = await new_client_with_user(client, email=f"s-{uuid.uuid4().hex[:6]}@example.com", services=3)
    raw, headers = _signed({"version": 10, "clients": [], "services": []})
    res = (await client.post("/v1/sync/snapshot", content=raw, headers=headers)).json()
    assert res["omitio_bajas"] is True and res["retirados"] == 0
    async with ClientesSession() as db:
        await db.execute(text("SELECT set_config('app.contexto', 'sync', true)"))
        alive = await db.scalars(select(Service).where(Service.mc_service_id.in_(data["services"]), Service.eliminado_en.is_(None)))
        assert len(list(alive)) == 3


# ---------- identity ----------
async def test_invitation_activates_account_and_opens_session(client):
    email = f"ana-{uuid.uuid4().hex[:6]}@example.com"
    data = await new_client_with_user(client, email=email)
    session = await activate(client, data["token"])
    me = await client.get("/v1/clientes/me", headers=session_headers(session["sesion"]))
    assert me.status_code == 200 and me.json()["email"] == email


async def test_invitation_link_works_only_once(client):
    data = await new_client_with_user(client, email=f"once-{uuid.uuid4().hex[:6]}@example.com")
    await activate(client, data["token"])
    again = await client.post("/v1/clientes/auth/activar", json={"token": data["token"], "password": GOOD_PASSWORD, "captcha": "ok"})
    assert again.status_code == 400 and again.json()["error"]["codigo"] == "ENLACE_INVALIDO"


async def test_weak_passwords_are_rejected(client):
    email = f"weak-{uuid.uuid4().hex[:6]}@example.com"
    data = await new_client_with_user(client, email=email)
    for bad in ["corta", "password12345", email.split("@")[0] + "-12345678"]:
        res = await client.post("/v1/clientes/auth/activar", json={"token": data["token"], "password": bad, "captcha": "ok"})
        assert res.json()["error"]["codigo"] == "CONTRASENA_DEBIL", bad


async def test_captcha_is_required(client):
    res = await client.post("/v1/clientes/auth/login", json={"email": "x@example.com", "password": "y", "captcha": "malo"})
    assert res.status_code == 400 and res.json()["error"]["codigo"] == "CAPTCHA_INVALIDO"


async def test_login_locks_after_five_failures(client):
    email = f"lock-{uuid.uuid4().hex[:6]}@example.com"
    await activate(client, (await new_client_with_user(client, email=email))["token"])
    for _ in range(5):
        res = await client.post("/v1/clientes/auth/login", json={"email": email, "password": "incorrecta-123", "captcha": "ok"})
        assert res.json()["error"]["codigo"] == "CREDENCIALES_INVALIDAS"
    locked = await client.post("/v1/clientes/auth/login", json={"email": email, "password": GOOD_PASSWORD, "captcha": "ok"})
    assert locked.status_code == 423 and locked.json()["error"]["codigo"] == "CUENTA_BLOQUEADA"


async def test_unknown_and_wrong_password_look_the_same(client):
    email = f"same-{uuid.uuid4().hex[:6]}@example.com"
    await activate(client, (await new_client_with_user(client, email=email))["token"])
    a = await client.post("/v1/clientes/auth/login", json={"email": email, "password": "otra-cosa-123", "captcha": "ok"})
    b = await client.post("/v1/clientes/auth/login", json={"email": "nadie@example.com", "password": "otra-cosa-123", "captcha": "ok"})
    assert a.status_code == b.status_code == 401
    assert a.json()["error"]["mensaje"] == b.json()["error"]["mensaje"]


async def test_forgot_password_does_not_reveal_accounts(client):
    email = f"forgot-{uuid.uuid4().hex[:6]}@example.com"
    await activate(client, (await new_client_with_user(client, email=email))["token"])
    known = await client.post("/v1/clientes/auth/olvide", json={"email": email, "captcha": "ok"})
    unknown = await client.post("/v1/clientes/auth/olvide", json={"email": "nadie@example.com", "captcha": "ok"})
    assert known.status_code == unknown.status_code == 202 and known.json() == unknown.json()


async def _latest_link(email: str, tipo: str) -> str:
    """Read the reset link the way the email would deliver it: from the portal outbox payload."""
    async with ClientesSession() as db:
        row = (await db.execute(text(
            "SELECT datos FROM outbox_events WHERE tipo = :t AND datos->>'email' = :e ORDER BY id DESC LIMIT 1"
        ), {"t": tipo, "e": email})).scalar_one()
    return parse_qs(urlparse(row["variables"]["enlace"]).query)["token"][0]


async def test_reset_revokes_sessions_and_link_expires(client):
    email = f"reset-{uuid.uuid4().hex[:6]}@example.com"
    old = await activate(client, (await new_client_with_user(client, email=email))["token"])
    await client.post("/v1/clientes/auth/olvide", json={"email": email, "captcha": "ok"})
    token = await _latest_link(email, "cliente_restablecer")

    res = await client.post("/v1/clientes/auth/restablecer", json={"token": token, "password": "Nueva-Clave-Segura-9", "captcha": "ok"})
    assert res.status_code == 200
    assert (await client.get("/v1/clientes/me", headers=session_headers(old["sesion"]))).status_code == 401
    assert (await client.get("/v1/clientes/me", headers=session_headers(res.json()["sesion"]))).status_code == 200

    # an expired link is refused even if never used
    await client.post("/v1/clientes/auth/olvide", json={"email": email, "captcha": "ok"})
    token2 = await _latest_link(email, "cliente_restablecer")
    async with ClientesSession() as db, db.begin():
        user = await db.scalar(select(ClientUser).where(ClientUser.email == email))
        await db.execute(text("UPDATE auth_tokens SET expira_en = now() - interval '1 minute' WHERE user_id = :u AND usado_en IS NULL"),
                         {"u": user.id})
    expired = await client.post("/v1/clientes/auth/restablecer", json={"token": token2, "password": "Otra-Clave-Segura-9", "captcha": "ok"})
    assert expired.json()["error"]["codigo"] == "ENLACE_INVALIDO"


async def test_secret_links_are_scrubbed_from_the_outbox_after_delivery():
    from app.clientes import emails

    await process_batch(ClientesSession, emails.HANDLERS, limit=500, scrub=emails.SECRET_TYPES)
    async with ClientesSession() as db:
        leaked = await db.scalar(text(
            "SELECT count(*) FROM outbox_events WHERE tipo IN ('cliente_invitacion', 'cliente_restablecer') "
            "AND procesado_en IS NOT NULL AND datos ? 'variables'"
        ))
    assert leaked == 0


async def test_logout_revokes_the_session(client):
    session = await activate(client, (await new_client_with_user(client, email=f"out-{uuid.uuid4().hex[:6]}@example.com"))["token"])
    h = session_headers(session["sesion"])
    assert (await client.post("/v1/clientes/auth/logout", headers=h)).status_code == 204
    assert (await client.get("/v1/clientes/me", headers=h)).status_code == 401


# ---------- portal data + RLS ----------
async def test_client_sees_only_its_own_services(client):
    a = await new_client_with_user(client, email=f"a-{uuid.uuid4().hex[:6]}@example.com")
    b = await new_client_with_user(client, email=f"b-{uuid.uuid4().hex[:6]}@example.com")
    sa = await activate(client, a["token"])
    await sync(client, {"tipo": "update.published", "datos": {
        "mc_update_id": f"upd-{uuid.uuid4().hex[:6]}", "mc_service_id": b["services"][0], "titulo": "Avance de B",
        "publicado_en": datetime.now(UTC).isoformat()}})

    listing = (await client.get("/v1/clientes/servicios", headers=session_headers(sa["sesion"]))).json()
    assert [s["nombre"] for s in listing] == [f"Plataforma {a['services'][0]}"]

    async with ClientesSession() as db:
        await db.execute(text("SELECT set_config('app.contexto', 'sync', true)"))
        b_service_id = await db.scalar(select(Service.id).where(Service.mc_service_id == b["services"][0]))
    peek = await client.get(f"/v1/clientes/servicios/{b_service_id}", headers=session_headers(sa["sesion"]))
    assert peek.status_code == 404


async def test_rls_blocks_cross_client_reads_at_the_database():
    async with ClientesSession() as db:
        await db.execute(text("SELECT set_config('app.contexto', 'sync', true)"))
        total = await db.scalar(text("SELECT count(*) FROM services"))
    assert total > 0
    async with ClientesSession() as db:
        assert await db.scalar(text("SELECT count(*) FROM services")) == 0  # no client context: nothing visible
        await scope_to_client(db, uuid.uuid4())
        assert await db.scalar(text("SELECT count(*) FROM services")) == 0
        with pytest.raises(DBAPIError):
            await db.execute(text(
                "INSERT INTO services (id, client_id, mc_service_id, nombre) VALUES (gen_random_uuid(), gen_random_uuid(), 'x', 'x')"
            ))


async def test_service_detail_with_updates_and_deliverable_download(client):
    data = await new_client_with_user(client, email=f"d-{uuid.uuid4().hex[:6]}@example.com")
    svc = data["services"][0]
    raw, headers = _signed({"mc_client_id": data["mc_client"], "filename": "Manual de operación.pdf", "content_type": "application/pdf"})
    presign = (await client.post("/v1/sync/deliverables/presign", content=raw, headers=headers)).json()
    assert presign["storage_key"].startswith(f"entregables/{data['mc_client']}/")
    now = datetime.now(UTC)
    await sync(
        client,
        {"tipo": "update.published", "datos": {"mc_update_id": f"u-{uuid.uuid4().hex[:6]}", "mc_service_id": svc,
                                                "titulo": "Módulo de pedidos entregado", "publicado_en": now.isoformat()}},
        {"tipo": "deliverable.published", "datos": {"mc_deliverable_id": f"d-{uuid.uuid4().hex[:6]}", "mc_service_id": svc,
                                                     "titulo": "Manual de operación.pdf", "storage_key": presign["storage_key"],
                                                     "tipo_contenido": "application/pdf", "publicado_en": now.isoformat()}},
    )
    s = await activate(client, data["token"])
    h = session_headers(s["sesion"])
    service_id = (await client.get("/v1/clientes/servicios", headers=h)).json()[0]["id"]
    detail = (await client.get(f"/v1/clientes/servicios/{service_id}", headers=h)).json()
    assert detail["avances"][0]["titulo"] == "Módulo de pedidos entregado"
    assert detail["entregables"][0]["titulo"] == "Manual de operación.pdf"
    dl = (await client.get(f"/v1/clientes/entregables/{detail['entregables'][0]['id']}/descarga", headers=h)).json()
    assert "X-Amz-Signature" in dl["url"] and dl["expira_en_s"] == 300


async def test_deliverable_outside_the_client_folder_is_refused(client):
    data = await new_client_with_user(client, email=f"k-{uuid.uuid4().hex[:6]}@example.com")
    res = await sync(client, {"tipo": "deliverable.published", "datos": {
        "mc_deliverable_id": "d-otro", "mc_service_id": data["services"][0], "titulo": "x",
        "storage_key": "entregables/otro-cliente/x.pdf", "publicado_en": datetime.now(UTC).isoformat()}})
    assert res.json()["resultados"][0]["codigo"] == "LLAVE_INVALIDA"


async def test_auth_audit_is_immutable():
    async with ClientesSession() as db:
        with pytest.raises(DBAPIError, match="inmutable"):
            await db.execute(text("DELETE FROM auth_audit"))


def test_session_expiry_rules():
    from app.clientes.security import session_expired

    now = datetime.now(UTC)
    assert not session_expired(now - timedelta(hours=1), now - timedelta(minutes=5), now)
    assert session_expired(now - timedelta(days=8), now - timedelta(minutes=5), now)  # absolute
    assert session_expired(now - timedelta(days=1), now - timedelta(hours=13), now)  # idle
