import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.errors import ApiError
from app.models import Course, Lesson, Module, Order
from app.schemas import (
    CourseIn,
    CourseOut,
    CoursePatch,
    LessonIn,
    LessonOut,
    ModuleIn,
    ModuleOut,
    PublicCourse,
    PublicCourseCard,
    PublicLesson,
    PublicModule,
)
from app.security import DB, CurrentUser
from app.services import audit, payments, storage

public = APIRouter(prefix="/courses", tags=["courses"])
admin = APIRouter(prefix="/admin/courses", tags=["admin"])

_full = selectinload(Course.modules).selectinload(Module.lessons)


def _card(c: Course) -> dict:
    lessons = [lesson for m in c.modules for lesson in m.lessons]
    return {
        "slug": c.slug, "title": c.title, "subtitle": c.subtitle, "category": c.category, "level": c.level,
        "cover_url": storage.presign_get(c.cover_key, 86400) if c.cover_key else None,
        "price_mxn": c.price_mxn, "lessons": len(lessons), "minutes": sum(x.duration_min for x in lessons),
        "venta_activa": bool(c.price_mxn) and payments.active_provider() is not None,
    }


def _public_lesson(lesson: Lesson, unlocked: bool = False) -> PublicLesson:
    """Free lessons are open to everyone; the rest only for an enrolled student (`unlocked`)."""
    open_ = lesson.is_free or unlocked
    return PublicLesson(
        title=lesson.title, slug=lesson.slug, kind=lesson.kind, duration_min=lesson.duration_min,
        is_free=lesson.is_free, locked=not open_,
        body=lesson.body if open_ else "",
        asset_url=storage.presign_get(lesson.asset_key) if open_ and lesson.asset_key else None,
    )


# ---------- public ----------
@public.get("", response_model=list[PublicCourseCard])
async def list_courses(session: DB) -> list[dict]:
    rows = await session.scalars(
        select(Course).where(Course.status == "published").options(_full).order_by(Course.updated_at.desc())
    )
    return [_card(c) for c in rows]


@public.get("/{slug}", response_model=PublicCourse)
async def get_course(slug: str, session: DB) -> PublicCourse:
    c = await session.scalar(select(Course).where(Course.slug == slug, Course.status == "published").options(_full))
    if c is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Curso no encontrado")
    return PublicCourse(
        **_card(c), description=c.description,
        modules=[PublicModule(title=m.title, lessons=[_public_lesson(x) for x in m.lessons]) for m in c.modules],
    )


# ---------- admin ----------
async def _course(session: DB, course_id: uuid.UUID) -> Course:
    c = await session.scalar(select(Course).where(Course.id == course_id).options(_full))
    if c is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Curso no encontrado")
    return c


async def _commit(session: DB) -> None:
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise ApiError(409, "SLUG_DUPLICADO", "Ya existe un registro con ese slug") from exc


@admin.get("", response_model=list[CourseOut])
async def admin_list(session: DB, _: CurrentUser) -> list[Course]:
    return list(await session.scalars(select(Course).options(_full).order_by(Course.updated_at.desc())))


@admin.post("", response_model=CourseOut, status_code=201)
async def admin_create(body: CourseIn, session: DB, user: CurrentUser) -> Course:
    c = Course(**body.model_dump())
    session.add(c)
    try:
        await session.flush()
    except IntegrityError as exc:
        await session.rollback()
        raise ApiError(409, "SLUG_DUPLICADO", "Ya existe un registro con ese slug") from exc
    audit.record(session, user, "crear", "curso", c.id, despues=audit.snapshot(c))
    await _commit(session)
    return await _course(session, c.id)


@admin.get("/{course_id}", response_model=CourseOut)
async def admin_get(course_id: uuid.UUID, session: DB, _: CurrentUser) -> Course:
    return await _course(session, course_id)


@admin.patch("/{course_id}", response_model=CourseOut)
async def admin_update(course_id: uuid.UUID, body: CoursePatch, session: DB, user: CurrentUser) -> Course:
    c = await _course(session, course_id)
    before = audit.snapshot(c)
    changes = body.model_dump(exclude_unset=True)
    for k, v in changes.items():
        setattr(c, k, v)
    audit.record(session, user, "editar", "curso", c.id, antes=before, despues=changes)
    await _commit(session)
    session.expire_all()
    return await _course(session, course_id)


@admin.delete("/{course_id}", status_code=204)
async def admin_delete(course_id: uuid.UUID, session: DB, user: CurrentUser) -> None:
    c = await _course(session, course_id)
    if await session.scalar(select(Order.id).where(Order.course_id == c.id).limit(1)):
        # Orders and the ledger are permanent records; a sold course is unpublished, never deleted.
        raise ApiError(409, "CURSO_CON_VENTAS", "Este curso ya tiene compras: despublícalo en lugar de eliminarlo.")
    audit.record(session, user, "eliminar", "curso", c.id, antes=audit.snapshot(c))
    await session.delete(c)
    await session.commit()


@admin.post("/{course_id}/modules", response_model=ModuleOut, status_code=201)
async def add_module(course_id: uuid.UUID, body: ModuleIn, session: DB, user: CurrentUser) -> Module:
    c = await _course(session, course_id)
    m = Module(course_id=c.id, title=body.title, position=body.position or len(c.modules))
    session.add(m)
    await session.flush()
    audit.record(session, user, "crear", "modulo", m.id, despues=audit.snapshot(m))
    await session.commit()
    return await session.scalar(select(Module).where(Module.id == m.id).options(selectinload(Module.lessons)))


@admin.patch("/modules/{module_id}", response_model=ModuleOut)
async def update_module(module_id: uuid.UUID, body: ModuleIn, session: DB, user: CurrentUser) -> Module:
    m = await session.scalar(select(Module).where(Module.id == module_id).options(selectinload(Module.lessons)))
    if m is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Módulo no encontrado")
    before = audit.snapshot(m)
    m.title, m.position = body.title, body.position
    audit.record(session, user, "editar", "modulo", m.id, antes=before, despues=body.model_dump())
    await session.commit()
    return m


@admin.delete("/modules/{module_id}", status_code=204)
async def delete_module(module_id: uuid.UUID, session: DB, user: CurrentUser) -> None:
    m = await session.get(Module, module_id)
    if m:
        audit.record(session, user, "eliminar", "modulo", m.id, antes=audit.snapshot(m))
        await session.delete(m)
        await session.commit()


@admin.post("/modules/{module_id}/lessons", response_model=LessonOut, status_code=201)
async def add_lesson(module_id: uuid.UUID, body: LessonIn, session: DB, user: CurrentUser) -> Lesson:
    if await session.get(Module, module_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Módulo no encontrado")
    lesson = Lesson(module_id=module_id, **body.model_dump())
    session.add(lesson)
    await session.flush()
    audit.record(session, user, "crear", "leccion", lesson.id, despues=audit.snapshot(lesson))
    await session.commit()
    return lesson


@admin.patch("/lessons/{lesson_id}", response_model=LessonOut)
async def update_lesson(lesson_id: uuid.UUID, body: LessonIn, session: DB, user: CurrentUser) -> Lesson:
    lesson = await session.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lección no encontrada")
    before = audit.snapshot(lesson)
    for k, v in body.model_dump().items():
        setattr(lesson, k, v)
    audit.record(session, user, "editar", "leccion", lesson.id, antes=before, despues=audit.snapshot(lesson))
    await session.commit()
    return lesson


@admin.delete("/lessons/{lesson_id}", status_code=204)
async def delete_lesson(lesson_id: uuid.UUID, session: DB, user: CurrentUser) -> None:
    lesson = await session.get(Lesson, lesson_id)
    if lesson:
        audit.record(session, user, "eliminar", "leccion", lesson.id, antes=audit.snapshot(lesson))
        await session.delete(lesson)
        await session.commit()
