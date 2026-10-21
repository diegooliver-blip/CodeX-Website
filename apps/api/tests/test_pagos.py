"""F4: student accounts, mock checkout, signed webhooks, immutable ledger, enrollments and RLS on money tables."""

import uuid

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.exc import DBAPIError

from app.config import get_settings
from app.db import SessionLocal
from app.models import Enrollment, Order, OutboxEvent, PaymentLedgerEntry
from app.services.payments import MockProvider

PASSWORD = "clave-alumno-123"


async def _student(client, email: str) -> dict:
    res = await client.post("/alumnos/registro", json={"email": email, "nombre": "Ana Alumna", "password": PASSWORD})
    assert res.status_code == 201, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


@pytest.fixture(scope="module")
async def course(client, admin_headers) -> str:
    slug = f"curso-pago-{uuid.uuid4().hex[:6]}"
    res = await client.post("/admin/courses", headers=admin_headers, json={
        "slug": slug, "title": "Agentes en producción", "price_mxn": 1200, "status": "published",
    })
    course_id = res.json()["id"]
    module = (await client.post(f"/admin/courses/{course_id}/modules", headers=admin_headers, json={"title": "Base", "position": 0})).json()
    for i, free in enumerate([True, False]):
        await client.post(f"/admin/courses/modules/{module['id']}/lessons", headers=admin_headers, json={
            "slug": f"leccion-{i}", "title": f"Lección {i}", "kind": "text", "body": f"contenido {i}",
            "is_free": free, "position": i,
        })
    return slug


@pytest.fixture(autouse=True)
def mock_payments(monkeypatch):
    monkeypatch.setattr(get_settings(), "payment_provider", "mock")


async def _lessons(client, headers, slug):
    res = await client.get(f"/alumnos/cursos/{slug}", headers=headers)
    assert res.status_code == 200, res.text
    body = res.json()
    return body["inscrito"], {lesson["slug"]: lesson for m in body["modules"] for lesson in m["lessons"]}


# ---------- accounts ----------
async def test_student_signup_login_and_duplicate(client):
    await _student(client, "registro@example.com")
    dup = await client.post("/alumnos/registro", json={"email": "Registro@example.com", "nombre": "Otra", "password": PASSWORD})
    assert dup.status_code == 409 and dup.json()["error"]["codigo"] == "CORREO_REGISTRADO"
    login = await client.post("/alumnos/login", json={"email": "registro@example.com", "password": PASSWORD})
    assert login.status_code == 200
    me = await client.get("/alumnos/me", headers={"Authorization": f"Bearer {login.json()['access_token']}"})
    assert me.json()["email"] == "registro@example.com"


async def test_students_and_staff_are_separated(client, admin_headers):
    student = await _student(client, "separado@example.com")
    assert (await client.get("/admin/courses", headers=student)).status_code == 403
    assert (await client.get("/auth/me", headers=student)).status_code == 403
    staff_login = await client.post("/auth/login", json={"email": "separado@example.com", "password": PASSWORD})
    assert staff_login.json()["error"]["codigo"] == "CREDENCIALES_INVALIDAS"
    assert (await client.get("/alumnos/me", headers=admin_headers)).json()["error"]["codigo"] == "SOLO_ALUMNOS"
    admin_as_student = await client.post("/alumnos/login", json={"email": "test@codexai.com", "password": "secreto-123"})
    assert admin_as_student.status_code == 401


# ---------- purchase flow ----------
async def test_buy_course_unlocks_lessons_once(client, course):
    student = await _student(client, "compra@example.com")
    enrolled, lessons = await _lessons(client, student, course)
    assert not enrolled and lessons["leccion-1"]["locked"] and lessons["leccion-1"]["body"] == ""
    assert not lessons["leccion-0"]["locked"]

    key = str(uuid.uuid4())
    first = await client.post("/alumnos/checkout", json={"curso": course}, headers=student | {"Idempotency-Key": key})
    again = await client.post("/alumnos/checkout", json={"curso": course}, headers=student | {"Idempotency-Key": key})
    assert first.status_code == again.status_code == 201
    assert first.json() == again.json()
    order_id = first.json()["orden_id"]
    assert first.json()["url"].endswith(f"/academia/pago?orden={order_id}")

    paid = await client.post(f"/alumnos/ordenes/{order_id}/simular", json={"estado": "pagado"}, headers=student)
    assert paid.status_code == 200 and paid.json()["estado"] == "pagada" and paid.json()["curso"] == course
    replay = await client.post(f"/alumnos/ordenes/{order_id}/simular", json={"estado": "pagado"}, headers=student)
    assert replay.json()["estado"] == "pagada"

    async with SessionLocal() as s:
        oid = uuid.UUID(order_id)
        buyer = await s.scalar(select(Order.user_id).where(Order.id == oid))
        assert await s.scalar(select(func.count()).select_from(Order).where(Order.user_id == buyer)) == 1
        ledger = list(await s.scalars(select(PaymentLedgerEntry).where(PaymentLedgerEntry.orden_id == oid)))
        assert [(e.tipo, e.monto_centavos, e.clave) for e in ledger] == [("cargo", 120000, f"pago:{oid}")]
        events = list(await s.scalars(select(OutboxEvent).where(OutboxEvent.tipo == "order_paid", OutboxEvent.entidad_id == order_id)))
        assert len(events) == 1 and events[0].datos["email"] == "compra@example.com"

    enrolled, lessons = await _lessons(client, student, course)
    assert enrolled and not lessons["leccion-1"]["locked"] and lessons["leccion-1"]["body"] == "contenido 1"
    mine = await client.get("/alumnos/cursos", headers=student)
    assert [c["slug"] for c in mine.json()] == [course]

    blocked = await client.post("/alumnos/checkout", json={"curso": course}, headers=student)
    assert blocked.status_code == 409 and blocked.json()["error"]["codigo"] == "YA_INSCRITO"


async def test_signed_webhook_refund_reverses_in_ledger(client, course):
    student = await _student(client, "reembolso@example.com")
    order_id = (await client.post("/alumnos/checkout", json={"curso": course}, headers=student)).json()["orden_id"]
    await client.post(f"/alumnos/ordenes/{order_id}/simular", json={"estado": "pagado"}, headers=student)
    async with SessionLocal() as s:
        order = await s.get(Order, uuid.UUID(order_id))

    cuerpo, cabeceras = MockProvider().evento_simulado(order, "reembolsado")
    forged = await client.post("/pagos/webhook/mock", content=cuerpo, headers={"x-mock-firma": "0" * 64})
    assert forged.status_code == 400 and forged.json()["error"]["codigo"] == "WEBHOOK_INVALIDO"

    ok = await client.post("/pagos/webhook/mock", content=cuerpo, headers=cabeceras)
    assert ok.status_code == 200 and ok.json()["estado"] == "reembolsada"
    async with SessionLocal() as s:
        amounts = list(await s.scalars(
            select(PaymentLedgerEntry.monto_centavos).where(PaymentLedgerEntry.orden_id == order.id).order_by(PaymentLedgerEntry.id)
        ))
        assert amounts == [120000, -120000]
        assert await s.scalar(select(func.count()).select_from(Enrollment).where(Enrollment.orden_id == order.id)) == 0
    enrolled, _ = await _lessons(client, student, course)
    assert not enrolled


async def test_webhook_amount_must_match_order(client, course):
    student = await _student(client, "monto@example.com")
    order_id = (await client.post("/alumnos/checkout", json={"curso": course}, headers=student)).json()["orden_id"]
    async with SessionLocal() as s:
        order = await s.get(Order, uuid.UUID(order_id))
    order.monto_centavos = 100  # tampered amount, correctly signed
    cuerpo, cabeceras = MockProvider().evento_simulado(order, "pagado")
    res = await client.post("/pagos/webhook/mock", content=cuerpo, headers=cabeceras)
    assert res.status_code == 400 and res.json()["error"]["detalles"] == {"motivo": "monto"}


async def test_other_students_order_is_invisible(client, course):
    owner = await _student(client, "duena@example.com")
    other = await _student(client, "ajena@example.com")
    order_id = (await client.post("/alumnos/checkout", json={"curso": course}, headers=owner)).json()["orden_id"]
    assert (await client.get(f"/alumnos/ordenes/{order_id}", headers=owner)).status_code == 200
    assert (await client.get(f"/alumnos/ordenes/{order_id}", headers=other)).status_code == 404
    assert (await client.post(f"/alumnos/ordenes/{order_id}/simular", json={}, headers=other)).status_code == 404


async def test_sold_course_cannot_be_deleted(client, admin_headers, course):
    courses = (await client.get("/admin/courses", headers=admin_headers)).json()
    course_id = next(c["id"] for c in courses if c["slug"] == course)
    res = await client.delete(f"/admin/courses/{course_id}", headers=admin_headers)
    assert res.status_code == 409 and res.json()["error"]["codigo"] == "CURSO_CON_VENTAS"


# ---------- providers ----------
async def test_sales_off_without_provider(client, course, monkeypatch):
    monkeypatch.setattr(get_settings(), "payment_provider", "")
    student = await _student(client, "cerrado@example.com")
    res = await client.post("/alumnos/checkout", json={"curso": course}, headers=student)
    assert res.status_code == 503 and res.json()["error"]["codigo"] == "PAGOS_NO_DISPONIBLES"
    assert (await client.get(f"/courses/{course}")).json()["venta_activa"] is False


@pytest.mark.parametrize("provider", ["stripe", "mercadopago"])
async def test_real_providers_refuse_without_keys(client, course, monkeypatch, provider):
    monkeypatch.setattr(get_settings(), "payment_provider", provider)
    student = await _student(client, f"sin-llaves-{provider}@example.com")
    res = await client.post("/alumnos/checkout", json={"curso": course}, headers=student)
    assert res.status_code == 503 and res.json()["error"]["codigo"] == "PROVEEDOR_NO_CONFIGURADO"
    hook = await client.post(f"/pagos/webhook/{provider}", content=b"{}")
    assert hook.json()["error"]["codigo"] == "PROVEEDOR_NO_CONFIGURADO"
    async with SessionLocal() as s:  # the failed checkout left no order behind
        assert await s.scalar(select(func.count()).select_from(Order).where(Order.proveedor == provider)) == 0


# ---------- database guarantees ----------
@pytest.mark.parametrize("sql", ["UPDATE payments_ledger SET monto_centavos = 0", "DELETE FROM payments_ledger", "TRUNCATE payments_ledger CASCADE"])
async def test_ledger_is_immutable(sql):
    async with SessionLocal() as s:
        with pytest.raises(DBAPIError, match="inmutable"):
            await s.execute(text(sql))
        await s.rollback()


async def test_rls_student_a_cannot_see_student_b_orders(client, course):
    a = await _student(client, "rls-a@example.com")
    b = await _student(client, "rls-b@example.com")
    order_a = (await client.post("/alumnos/checkout", json={"curso": course}, headers=a)).json()["orden_id"]
    order_b = (await client.post("/alumnos/checkout", json={"curso": course}, headers=b)).json()["orden_id"]
    async with SessionLocal() as s:
        user_a = await s.scalar(select(Order.user_id).where(Order.id == uuid.UUID(order_a)))
        await s.execute(text("SET LOCAL ROLE codex_alumno"))
        await s.execute(text("SELECT set_config('app.user_id', :u, true)"), {"u": str(user_a)})
        visible = {str(r) for r in await s.scalars(text("SELECT id FROM orders"))}
        assert order_a in visible and order_b not in visible
        assert all(r == user_a for r in await s.scalars(text("SELECT user_id FROM payments_ledger UNION ALL SELECT user_id FROM enrollments")))
        await s.rollback()
    async with SessionLocal() as s:  # no identity set: nothing at all
        await s.execute(text("SET LOCAL ROLE codex_alumno"))
        assert await s.scalar(text("SELECT count(*) FROM orders")) == 0
        with pytest.raises(DBAPIError):  # the student role can read, never write
            await s.execute(text("INSERT INTO enrollments (id, user_id, course_id) SELECT gen_random_uuid(), user_id, course_id FROM orders LIMIT 1"))
        await s.rollback()
