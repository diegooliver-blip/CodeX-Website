"""Retrieval-augmented knowledge base: ingestion (content, courses, uploads) and hybrid search."""

import hashlib
import io
import json
import logging
import re
from dataclasses import dataclass

from pypdf import PdfReader
from sqlalchemy import delete, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.models import Chunk, Course, Document, Module
from app.services.embeddings import embed, embed_one

log = logging.getLogger(__name__)

CHUNK_CHARS = 1400
OVERLAP = 200


@dataclass
class Source:
    source: str
    ref: str
    title: str
    url: str
    body: str


@dataclass
class Hit:
    title: str
    url: str
    content: str
    score: float


def chunk_text(body: str) -> list[str]:
    body = re.sub(r"\n{3,}", "\n\n", body).strip()
    if len(body) <= CHUNK_CHARS:
        return [body] if body else []
    parts, start = [], 0
    while start < len(body):
        end = min(start + CHUNK_CHARS, len(body))
        # prefer to cut at a paragraph or sentence boundary
        cut = max(body.rfind("\n\n", start, end), body.rfind(". ", start, end))
        if end < len(body) and cut > start + CHUNK_CHARS // 2:
            end = cut + 1
        parts.append(body[start:end].strip())
        if end >= len(body):
            break
        start = end - OVERLAP
    return [p for p in parts if p]


def _lines(*items: object) -> str:
    out = []
    for item in items:
        if isinstance(item, list):
            out.extend(f"- {i}" for i in item)
        elif item:
            out.append(str(item))
    return "\n".join(out)


def content_sources() -> list[Source]:
    root = get_settings().content_dir
    load = lambda name: json.loads((root / f"{name}.json").read_text(encoding="utf-8"))  # noqa: E731
    site, services, projects, cases = load("site"), load("services"), load("projects"), load("cases")

    sources = [
        Source(
            "content", "site", f"{site['name']}", "/",
            _lines(
                site["description"], site["tagline"],
                f"Contacto: teléfono {site['contact']['phone']}, correo {site['contact']['email']}, "
                f"WhatsApp {site['contact']['whatsapp']}, agenda una consultoría gratuita de 30 minutos en {site['contact']['calendly']}.",
                "Método de trabajo:", [f"{m['step']} {m['title']}: {m['text']}" for m in site["method"]],
                "Principios:", [f"{p['title']}: {p['text']}" for p in site["principles"]],
                "Tecnologías: " + ", ".join(site["stack"]),
            ),
        )
    ]
    for s in services:
        sources.append(Source(
            "content", f"service:{s['slug']}", f"Servicio — {s['title']}", f"/servicios/{s['slug']}",
            _lines(f"{s['title']}. {s['short']}", s["description"], "Capacidades:", s["capabilities"],
                   "Entregables:", s["deliverables"], "Tecnologías: " + ", ".join(s["stack"])),
        ))
    for p in projects:
        sources.append(Source(
            "content", f"project:{p['slug']}", f"Proyecto — {p['title']}", f"/proyectos/{p['slug']}",
            _lines(f"{p['title']} ({p['category']}, {p['sector']}). Estado: {p['status']}.", p["summary"],
                   f"Reto: {p['challenge']}", f"Solución: {p['solution']}", "Funciones:", p["features"],
                   "Datos: " + "; ".join(f"{f['value']} {f['label']}" for f in p["facts"]),
                   "Tecnologías: " + ", ".join(p["stack"])),
        ))
    for c in cases:
        sources.append(Source(
            "content", f"case:{c['slug']}", f"Caso — {c['title']}", "/experiencia",
            _lines(f"{c['title']} ({c['sector']}).", c["text"], "Etiquetas: " + ", ".join(c["tags"])),
        ))
    return sources


async def course_sources(session: AsyncSession) -> list[Source]:
    rows = await session.scalars(
        select(Course).where(Course.status == "published")
        .options(selectinload(Course.modules).selectinload(Module.lessons))
    )
    sources = []
    for c in rows:
        outline = [f"{m.title}: " + ", ".join(lesson.title for lesson in m.lessons) for m in c.modules]
        free_bodies = [f"{lesson.title}\n{lesson.body}" for m in c.modules for lesson in m.lessons
                       if lesson.is_free and lesson.body]
        price = f"Precio: ${c.price_mxn:,} MXN." if c.price_mxn else "Precio: por anunciar."
        sources.append(Source(
            "course", f"course:{c.slug}", f"Curso — {c.title}", f"/academia/{c.slug}",
            _lines(f"{c.title}. {c.subtitle}", c.description, f"Nivel: {c.level}. Categoría: {c.category}. {price}",
                   "Temario:", outline, *free_bodies),
        ))
    return sources


def extract_text(filename: str, data: bytes) -> str:
    if filename.lower().endswith(".pdf"):
        reader = PdfReader(io.BytesIO(data))
        return "\n\n".join(page.extract_text() or "" for page in reader.pages)
    return data.decode("utf-8", errors="ignore")


async def upsert(session: AsyncSession, src: Source) -> bool:
    """Index a source; skips re-embedding when the body is unchanged. Returns True if (re)indexed."""
    checksum = hashlib.sha256(src.body.encode()).hexdigest()
    doc = await session.scalar(select(Document).where(Document.ref == src.ref))
    if doc and doc.checksum == checksum:
        return False
    if doc is None:
        doc = Document(source=src.source, ref=src.ref)
        session.add(doc)
    else:
        await session.execute(delete(Chunk).where(Chunk.document_id == doc.id))
    doc.title, doc.url, doc.checksum = src.title, src.url, checksum
    await session.flush()

    pieces = chunk_text(src.body)
    # e5/MiniLM style models work better when the title travels with each chunk
    vectors = await embed([f"{src.title}\n{p}" for p in pieces]) if pieces else []
    session.add_all(
        Chunk(document_id=doc.id, position=i, content=p, embedding=v)
        for i, (p, v) in enumerate(zip(pieces, vectors, strict=True))
    )
    return True


async def reindex(session: AsyncSession) -> dict:
    sources = content_sources() + await course_sources(session)
    refs = {s.ref for s in sources}
    changed = 0
    for src in sources:
        changed += await upsert(session, src)
    # drop content/course docs that no longer exist (uploads are managed explicitly)
    stale = await session.scalars(
        select(Document).where(Document.source.in_(["content", "course"]), Document.ref.not_in(refs))
    )
    removed = 0
    for doc in stale:
        await session.delete(doc)
        removed += 1
    await session.commit()
    return {"sources": len(sources), "reindexed": changed, "removed": removed}


async def search(session: AsyncSession, query: str, k: int = 6) -> list[Hit]:
    """Hybrid retrieval: pgvector cosine + Spanish full-text, fused with reciprocal rank fusion."""
    qvec = await embed_one(query)
    dense = (await session.execute(
        select(Chunk.id).order_by(Chunk.embedding.cosine_distance(qvec)).limit(k * 3)
    )).scalars().all()
    tsq = func.websearch_to_tsquery("spanish", query)
    sparse = (await session.execute(
        select(Chunk.id).where(Chunk.tsv.op("@@")(tsq))
        .order_by(func.ts_rank(Chunk.tsv, tsq).desc()).limit(k * 3)
    )).scalars().all()

    scores: dict = {}
    for ranking in (dense, sparse):
        for rank, cid in enumerate(ranking):
            scores[cid] = scores.get(cid, 0.0) + 1.0 / (60 + rank)
    top = sorted(scores, key=scores.get, reverse=True)[:k]
    if not top:
        return []
    rows = (await session.execute(
        select(Chunk.id, Chunk.content, Document.title, Document.url)
        .join(Document, Document.id == Chunk.document_id).where(Chunk.id.in_(top))
    )).all()
    by_id = {r.id: r for r in rows}
    return [Hit(by_id[c].title, by_id[c].url, by_id[c].content, scores[c]) for c in top if c in by_id]


async def ensure_extension(session: AsyncSession) -> None:
    await session.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
