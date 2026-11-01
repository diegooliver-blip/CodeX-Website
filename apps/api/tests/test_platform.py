"""Production guarantees: stable errors, idempotent effects, outbox retries/DLQ, immutable audit, worker heartbeat."""

import random
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.exc import DBAPIError

from app.db import SessionLocal
from app.models import AdminAudit, Lead, OutboxEvent, WorkerHeartbeat
from app.services import outbox


# ---------- error contract ----------
async def test_errors_have_stable_shape(client):
    res = await client.get("/courses/no-existe")
    body = res.json()
    assert res.status_code == 404
    assert body["error"]["codigo"] == "NO_ENCONTRADO"
    assert body["error"]["traceId"] == res.headers["x-trace-id"]


async def test_validation_errors_list_fields(client):
    res = await client.post("/leads", json={"name": "A", "email": "no-es-correo"})
    err = res.json()["error"]
    assert res.status_code == 422 and err["codigo"] == "VALIDACION"
    assert {c["campo"] for c in err["detalles"]["campos"]} >= {"name", "email"}


async def test_bad_credentials_have_specific_code(client, admin_headers):
    res = await client.post("/auth/login", json={"email": "test@codexai.com", "password": "incorrecta-1"})
    assert res.json()["error"]["codigo"] == "CREDENCIALES_INVALIDAS"


async def test_incoming_trace_id_is_propagated(client):
    res = await client.get("/courses/no-existe", headers={"x-trace-id": "soporte-123"})
    assert res.headers["x-trace-id"] == "soporte-123"
    assert res.json()["error"]["traceId"] == "soporte-123"


# ---------- idempotency ----------
async def _count_leads(email: str) -> int:
    async with SessionLocal() as s:
        return await s.scalar(select(func.count()).select_from(Lead).where(Lead.email == email))


async def _count_events(lead_id: str) -> int:
    async with SessionLocal() as s:
        return await s.scalar(select(func.count()).select_from(OutboxEvent).where(OutboxEvent.entidad_id == lead_id))


async def test_double_submit_creates_one_lead_and_one_set_of_events(client):
    key = str(uuid.uuid4())
    body = {"name": "Doble Clic", "email": "doble@example.com", "message": "hola"}
    first = await client.post("/leads", json=body, headers={"Idempotency-Key": key})
    second = await client.post("/leads", json=body, headers={"Idempotency-Key": key})
    assert first.status_code == second.status_code == 201
    assert first.json() == second.json()
    assert await _count_leads("doble@example.com") == 1
    assert await _count_events(first.json()["id"]) == 2  # Loops event + owner email


async def test_reused_key_with_other_body_is_rejected(client):
    key = str(uuid.uuid4())
    await client.post("/leads", json={"name": "Uno Uno", "email": "uno@example.com"}, headers={"Idempotency-Key": key})
    res = await client.post("/leads", json={"name": "Dos Dos", "email": "dos@example.com"}, headers={"Idempotency-Key": key})
    assert res.status_code == 409 and res.json()["error"]["codigo"] == "IDEMPOTENCIA_CONFLICTO"
    assert await _count_leads("dos@example.com") == 0


# ---------- outbox ----------
async def _new_event(tipo: str) -> int:
    async with SessionLocal() as s, s.begin():
        event = outbox.enqueue(s, tipo, "prueba", str(uuid.uuid4()), {"n": 1})
        await s.flush()
        return event.id


async def _get_event(event_id: int) -> OutboxEvent:
    async with SessionLocal() as s:
        return await s.get(OutboxEvent, event_id)


async def test_outbox_delivers_once():
    event_id = await _new_event("prueba_ok")
    calls = []

    async def ok(event):
        calls.append(event.id)

    await outbox.process_batch(SessionLocal, {"prueba_ok": ok}, limit=100)
    await outbox.process_batch(SessionLocal, {"prueba_ok": ok}, limit=100)
    event = await _get_event(event_id)
    assert calls.count(event_id) == 1
    assert event.procesado_en is not None and event.intentos == 1


async def test_outbox_retries_with_backoff_then_dead_letters():
    event_id = await _new_event("prueba_falla")
    clock = [datetime.now(UTC)]

    async def boom(_):
        raise ConnectionError("loops caído")

    for _ in range(outbox.MAX_ATTEMPTS):
        await outbox.process_batch(SessionLocal, {"prueba_falla": boom}, limit=100, now=lambda: clock[0])
        event = await _get_event(event_id)
        if event.dlq_en is None:
            assert event.siguiente_intento_en > clock[0]  # not retried before its backoff
            # nothing happens if we run again before the backoff elapses
            await outbox.process_batch(SessionLocal, {"prueba_falla": boom}, limit=100, now=lambda: clock[0])
            assert (await _get_event(event_id)).intentos == event.intentos
            clock[0] = event.siguiente_intento_en + timedelta(seconds=1)

    event = await _get_event(event_id)
    assert event.dlq_en is not None and event.procesado_en is None
    assert event.intentos == outbox.MAX_ATTEMPTS
    assert "loops caído" in event.ultimo_error


async def test_unconfigured_integration_is_skipped_not_faked():
    """Without LOOPS_API_KEY the lead event is closed as `omitido`, never reported as sent."""
    from app.services import loops

    event_id = await _new_event("lead_created")
    async with SessionLocal() as s, s.begin():
        await s.execute(
            text("UPDATE outbox_events SET datos = CAST(:d AS jsonb) WHERE id = :i"),
            {"d": '{"email": "x@example.com"}', "i": event_id},
        )
    await outbox.process_batch(SessionLocal, {"lead_created": loops.deliver}, limit=100)
    event = await _get_event(event_id)
    assert event.procesado_en is not None
    assert event.ultimo_error.startswith("omitido: LOOPS_API_KEY")


def test_backoff_grows_and_is_capped():
    rng = random.Random(7)
    delays = [outbox.backoff(n, rng).total_seconds() for n in range(1, 12)]
    assert 22 <= delays[0] <= 38
    assert delays[3] > delays[0]
    assert max(delays) <= outbox.MAX_DELAY_S * 1.25


# ---------- audit ----------
async def test_admin_actions_are_audited(client, admin_headers):
    created = await client.post("/admin/courses", headers=admin_headers, json={"slug": "auditoria-1", "title": "Auditado"})
    course_id = created.json()["id"]
    await client.patch(f"/admin/courses/{course_id}", headers=admin_headers, json={"title": "Auditado 2"})
    async with SessionLocal() as s:
        rows = list(await s.scalars(select(AdminAudit).where(AdminAudit.entidad_id == course_id).order_by(AdminAudit.id)))
    assert [r.accion for r in rows] == ["crear", "editar"]
    assert rows[1].antes["title"] == "Auditado" and rows[1].despues == {"title": "Auditado 2"}
    assert rows[1].actor_email == "test@codexai.com" and rows[1].trace_id


@pytest.mark.parametrize("sql", ["UPDATE admin_audit SET accion = 'x'", "DELETE FROM admin_audit", "TRUNCATE admin_audit"])
async def test_audit_trail_is_immutable(sql):
    async with SessionLocal() as s:
        with pytest.raises(DBAPIError, match="inmutable"):
            await s.execute(text(sql))
        await s.rollback()


# ---------- worker ----------
async def test_worker_job_records_heartbeat():
    from app import worker

    await worker.run_job(worker.Job("latido", 30, worker.heartbeat))
    async with SessionLocal() as s:
        beat = await s.get(WorkerHeartbeat, "latido")
    assert beat.resultado == "ok"
    assert datetime.now(UTC) - beat.ultima_ejecucion < timedelta(seconds=30)


async def test_concurrent_double_submit_creates_one_lead(client):
    import asyncio

    key = str(uuid.uuid4())
    body = {"name": "Simultáneo", "email": "simultaneo@example.com"}
    a, b = await asyncio.gather(
        client.post("/leads", json=body, headers={"Idempotency-Key": key}),
        client.post("/leads", json=body, headers={"Idempotency-Key": key}),
    )
    assert a.status_code == b.status_code == 201 and a.json() == b.json()
    assert await _count_leads("simultaneo@example.com") == 1
