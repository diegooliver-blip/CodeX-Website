"""Health, uploads, leads, chat and knowledge-base endpoints."""

import asyncio
import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Header, HTTPException, Request, UploadFile, status
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy import select, text

from app import VERSION
from app.config import get_settings
from app.limiter import limiter
from app.models import Document, Lead, WorkerHeartbeat
from app.schemas import ChatIn, DocumentOut, LeadIn, LeadOut, PresignIn, PresignOut
from app.security import DB, AdminUser, CurrentUser
from app.services import assistant, audit, outbox, rag, storage
from app.services.idempotency import run_once

router = APIRouter()

ALLOWED_UPLOADS = {
    "videos": ("video/",),
    "pdfs": ("application/pdf",),
    "covers": ("image/",),
}
KNOWLEDGE_MAX_BYTES = 15 * 1024 * 1024


HEARTBEAT_STALE_S = 120


async def _storage_ok() -> bool:
    try:
        await asyncio.wait_for(
            asyncio.to_thread(storage.internal().head_bucket, Bucket=get_settings().s3_bucket), timeout=2
        )
        return True
    except Exception:
        return False


@router.get("/health", tags=["meta"])
async def health(session: DB) -> JSONResponse:
    """Liveness for uptime monitors: 503 only when the database is down; otherwise `ok` or `degradado`."""
    try:
        await session.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse({"status": "caido", "db": False, "version": VERSION}, status_code=503)
    beat = await session.get(WorkerHeartbeat, "latido")
    age = (datetime.now(UTC) - beat.ultima_ejecucion).total_seconds() if beat else None
    worker_ok = age is not None and age < HEARTBEAT_STALE_S
    queue = await outbox.queue_stats(session)
    store = await _storage_ok()
    healthy = worker_ok and store and queue["dlq"] == 0
    return JSONResponse(
        {
            "status": "ok" if healthy else "degradado",
            "db": True,
            "storage": store,
            "worker": {"latido_hace_s": round(age) if age is not None else None, "ok": worker_ok},
            "outbox": queue,
            "version": VERSION,
        }
    )


# ---------- uploads ----------
@router.post("/admin/uploads/presign", response_model=PresignOut, tags=["admin"])
async def presign(body: PresignIn, _: CurrentUser) -> dict:
    if not body.content_type.startswith(ALLOWED_UPLOADS[body.folder]):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Tipo de archivo no permitido para {body.folder}")
    key = storage.new_key(body.folder, body.filename)
    return {"key": key, "upload_url": storage.presign_put(key, body.content_type)}


# ---------- leads ----------
@router.post("/leads", status_code=201, tags=["leads"])
@limiter.limit("5/minute")
async def create_lead(
    request: Request,
    body: LeadIn,
    session: DB,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> JSONResponse:
    """Stores the lead and queues the Loops event in one transaction; a repeated key replays the first answer."""

    async def effect() -> tuple[int, dict]:
        lead = Lead(**body.model_dump() | {"email": body.email.lower()})
        session.add(lead)
        await session.flush()
        outbox.enqueue(
            session,
            "course_interest" if body.source == "academia" else "lead_created",
            "lead",
            str(lead.id),
            {
                "email": lead.email,
                "first_name": body.name.split(" ")[0],
                "source": f"web:{body.source}",
                "properties": {"service": body.service, "courseSlug": body.course_slug, "company": body.company},
            },
        )
        return 201, {"ok": True, "id": str(lead.id)}

    code, payload = await run_once(
        session, scope="leads", key=idempotency_key, payload=body.model_dump(mode="json"), effect=effect
    )
    return JSONResponse(payload, status_code=code)


@router.get("/admin/leads", response_model=list[LeadOut], tags=["admin"])
async def list_leads(session: DB, _: CurrentUser) -> list[Lead]:
    return list(await session.scalars(select(Lead).order_by(Lead.created_at.desc()).limit(500)))


@router.delete("/admin/leads/{lead_id}", status_code=204, tags=["admin"])
async def delete_lead(lead_id: uuid.UUID, session: DB, user: AdminUser) -> None:
    lead = await session.get(Lead, lead_id)
    if lead:
        audit.record(session, user, "eliminar", "lead", lead.id, antes=audit.snapshot(lead))
        await session.delete(lead)
        await session.commit()


# ---------- chat ----------
@router.post("/chat", tags=["chat"])
@limiter.limit("20/minute")
async def chat(request: Request, body: ChatIn, session: DB) -> StreamingResponse:
    if body.messages[-1].role != "user":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El último mensaje debe ser del usuario")
    hits = await rag.search(session, body.messages[-1].content)
    return StreamingResponse(
        assistant.stream_answer(body.messages, hits),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ---------- knowledge base ----------
@router.get("/admin/rag/documents", response_model=list[DocumentOut], tags=["admin"])
async def list_documents(session: DB, _: CurrentUser) -> list[Document]:
    return list(await session.scalars(select(Document).order_by(Document.source, Document.title)))


@router.post("/admin/rag/reindex", tags=["admin"])
async def reindex(session: DB, user: AdminUser) -> dict:
    result = await rag.reindex(session)
    audit.record(session, user, "reindexar", "conocimiento", despues=result)
    await session.commit()
    return result


@router.post("/admin/rag/documents", response_model=DocumentOut, status_code=201, tags=["admin"])
async def upload_document(file: UploadFile, session: DB, user: AdminUser) -> Document:
    name = file.filename or "documento"
    if not name.lower().endswith((".pdf", ".md", ".txt")):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Formatos permitidos: PDF, Markdown o texto")
    data = await file.read(KNOWLEDGE_MAX_BYTES + 1)
    if len(data) > KNOWLEDGE_MAX_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Máximo 15 MB")
    body = rag.extract_text(name, data).strip()
    if not body:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No se pudo extraer texto del archivo")
    ref = f"upload:{uuid.uuid4().hex[:10]}:{name}"
    await rag.upsert(session, rag.Source("upload", ref, name, "", body))
    audit.record(session, user, "subir", "documento", ref, despues={"titulo": name, "caracteres": len(body)})
    await session.commit()
    return await session.scalar(select(Document).where(Document.ref == ref))


@router.delete("/admin/rag/documents/{document_id}", status_code=204, tags=["admin"])
async def delete_document(document_id: uuid.UUID, session: DB, user: AdminUser) -> None:
    doc = await session.get(Document, document_id)
    if doc:
        audit.record(session, user, "eliminar", "documento", doc.id, antes=audit.snapshot(doc))
        await session.delete(doc)
        await session.commit()
