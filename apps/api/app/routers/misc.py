"""Uploads, leads, chat and knowledge-base endpoints."""

import uuid

from fastapi import (
    APIRouter,
    BackgroundTasks,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from fastapi.responses import StreamingResponse
from sqlalchemy import select, text

from app.limiter import limiter
from app.models import Document, Lead
from app.schemas import ChatIn, DocumentOut, LeadIn, LeadOut, PresignIn, PresignOut
from app.security import DB, AdminUser, CurrentUser
from app.services import assistant, loops, rag, storage

router = APIRouter()

ALLOWED_UPLOADS = {
    "videos": ("video/",),
    "pdfs": ("application/pdf",),
    "covers": ("image/",),
}
KNOWLEDGE_MAX_BYTES = 15 * 1024 * 1024


@router.get("/health", tags=["meta"])
async def health(session: DB) -> dict:
    await session.execute(text("SELECT 1"))
    return {"status": "ok"}


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
async def create_lead(request: Request, body: LeadIn, session: DB, tasks: BackgroundTasks) -> dict:
    lead = Lead(**body.model_dump() | {"email": body.email.lower()})
    session.add(lead)
    await session.commit()
    event = "course_interest" if body.source == "academia" else "lead_created"
    tasks.add_task(
        loops.track, lead.email, event, first_name=body.name.split(" ")[0], source=f"web:{body.source}",
        properties={"service": body.service, "courseSlug": body.course_slug, "company": body.company},
    )
    return {"ok": True}


@router.get("/admin/leads", response_model=list[LeadOut], tags=["admin"])
async def list_leads(session: DB, _: CurrentUser) -> list[Lead]:
    return list(await session.scalars(select(Lead).order_by(Lead.created_at.desc()).limit(500)))


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
async def reindex(session: DB, _: AdminUser) -> dict:
    return await rag.reindex(session)


@router.post("/admin/rag/documents", response_model=DocumentOut, status_code=201, tags=["admin"])
async def upload_document(file: UploadFile, session: DB, _: AdminUser) -> Document:
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
    await session.commit()
    return await session.scalar(select(Document).where(Document.ref == ref))


@router.delete("/admin/rag/documents/{document_id}", status_code=204, tags=["admin"])
async def delete_document(document_id: uuid.UUID, session: DB, _: AdminUser) -> None:
    doc = await session.get(Document, document_id)
    if doc:
        await session.delete(doc)
        await session.commit()
