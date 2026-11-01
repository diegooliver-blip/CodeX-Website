"""Owner notification for web leads: message content, and skipped (not faked) without Gmail credentials."""

from types import SimpleNamespace

import pytest

from app.config import get_settings
from app.services import lead_mail
from app.services.outbox import Skip


def test_message_reaches_owner_and_replies_go_to_the_lead():
    d = {"name": "Ana López", "email": "ana@example.com", "phone": "833 000 0000", "message": "Quiero un agente", "source": "contacto", "company": ""}
    msg = lead_mail.build_message(d, sender="codex@example.com", to="dueno@example.com", event_id=7)
    assert msg["To"] == "dueno@example.com"
    assert msg["Reply-To"] == "ana@example.com"
    assert "Ana López" in msg["Subject"] and "Formulario de contacto" in msg["Subject"]
    body = msg.get_content()
    assert "Quiero un agente" in body and "833 000 0000" in body
    assert "Empresa" not in body  # empty fields are left out


async def test_without_app_password_the_event_is_skipped(monkeypatch):
    monkeypatch.setattr(get_settings(), "smtp_password", "")
    with pytest.raises(Skip):
        await lead_mail.deliver(SimpleNamespace(id=1, datos={"name": "A", "email": "a@example.com"}))


async def test_lead_queues_the_owner_email(client):
    from sqlalchemy import select

    from app.db import SessionLocal
    from app.models import OutboxEvent

    res = await client.post("/leads", json={"name": "Correo Dueño", "email": "dueno-aviso@example.com", "message": "hola"})
    async with SessionLocal() as s:
        ev = await s.scalar(select(OutboxEvent).where(OutboxEvent.tipo == lead_mail.EVENT, OutboxEvent.entidad_id == res.json()["id"]))
    assert ev is not None and ev.datos["email"] == "dueno-aviso@example.com" and ev.datos["message"] == "hola"
