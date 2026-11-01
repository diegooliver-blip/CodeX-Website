"""Emails every new web lead to the owner's inbox through Gmail SMTP (app password).

Runs only from the outbox worker (`lead_notificar`), so a Gmail hiccup is retried instead of losing the lead.
Without `SMTP_PASSWORD` the event is closed as skipped: nothing is ever reported as sent when it wasn't.
"""

import asyncio
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, make_msgid

from app.config import get_settings
from app.services.outbox import Skip

EVENT = "lead_notificar"

SOURCES = {"contacto": "Formulario de contacto", "academia": "Academia", "chat": "Asistente"}
FIELDS = [
    ("name", "Nombre"),
    ("email", "Correo"),
    ("phone", "Teléfono"),
    ("company", "Empresa"),
    ("service", "Servicio de interés"),
    ("course_slug", "Curso"),
    ("message", "Mensaje"),
]


def build_message(d: dict, *, sender: str, to: str, event_id: int) -> EmailMessage:
    origin = SOURCES.get(d.get("source", ""), d.get("source", "web"))
    msg = EmailMessage()
    msg["Subject"] = f"Nuevo contacto en la web: {d.get('name', '')} ({origin})"
    msg["From"] = formataddr(("CODEX web", sender))
    msg["To"] = to
    msg["Reply-To"] = d["email"]  # answering the notification writes straight to the lead
    # Stable id per outbox event: if a retry delivers twice, Gmail threads it as the same message.
    msg["Message-ID"] = make_msgid(idstring=f"lead-{event_id}", domain="codexaiconsulting.com")
    lines = [f"{label}: {d[key]}" for key, label in FIELDS if d.get(key)]
    msg.set_content(f"Llegó un formulario desde {origin}.\n\n" + "\n".join(lines) + "\n\nResponde este correo para escribirle.")
    return msg


def _send(msg: EmailMessage) -> None:
    s = get_settings()
    with smtplib.SMTP_SSL(s.smtp_host, s.smtp_port, context=ssl.create_default_context(), timeout=15) as smtp:
        smtp.login(s.smtp_user, s.smtp_password)
        smtp.send_message(msg)


async def deliver(event) -> None:
    s = get_settings()
    if not (s.smtp_user and s.smtp_password and s.lead_notify_to):
        raise Skip("SMTP_PASSWORD no configurada")
    msg = build_message(event.datos, sender=s.smtp_user, to=s.lead_notify_to, event_id=event.id)
    await asyncio.to_thread(_send, msg)
