"""Student accounts, course purchase (checkout + provider webhooks) and enrolled-course access."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Header, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.config import get_settings
from app.errors import ApiError
from app.limiter import limiter
from app.models import Course, Enrollment, Order, User
from app.routers.courses import _card, _full, _public_lesson
from app.schemas import (
    CheckoutIn,
    CheckoutOut,
    LoginIn,
    OrderOut,
    PublicCourseCard,
    PublicModule,
    RefreshIn,
    SimulatedPaymentIn,
    StudentCourse,
    StudentOut,
    StudentSignupIn,
    TokenPair,
)
from app.security import (
    DB,
    STUDENT,
    CurrentStudent,
    decode,
    hash_password,
    issue_tokens,
    scope_to_student,
    scope_to_system,
    verify_password,
)
from app.services import payments
from app.services.idempotency import run_once

router = APIRouter(prefix="/alumnos", tags=["alumnos"])
webhooks = APIRouter(prefix="/pagos", tags=["pagos"])


# ---------- account ----------
@router.post("/registro", response_model=TokenPair, status_code=201)
@limiter.limit("5/minute")
async def signup(request: Request, body: StudentSignupIn, session: DB) -> dict:
    user = User(email=body.email.lower(), name=body.nombre.strip(), role=STUDENT, password_hash=hash_password(body.password))
    session.add(user)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise ApiError(409, "CORREO_REGISTRADO", "Ese correo ya tiene cuenta. Entra con tu contraseña.") from exc
    return issue_tokens(user.id)


@router.post("/login", response_model=TokenPair)
@limiter.limit("10/minute")
async def login(request: Request, body: LoginIn, session: DB) -> dict:
    user = await session.scalar(select(User).where(User.email == body.email.lower()))
    if user is None or user.role != STUDENT or not verify_password(body.password, user.password_hash):
        raise ApiError(401, "CREDENCIALES_INVALIDAS", "Correo o contraseña incorrectos")
    return issue_tokens(user.id)


@router.post("/refresh", response_model=TokenPair)
async def refresh(body: RefreshIn, session: DB) -> dict:
    user = await session.get(User, decode(body.refresh_token, "refresh"))
    if user is None or user.role != STUDENT:
        raise ApiError(401, "TOKEN_INVALIDO", "Usuario no encontrado")
    return issue_tokens(user.id)


@router.get("/me", response_model=StudentOut)
async def me(user: CurrentStudent) -> dict:
    return {"id": user.id, "email": user.email, "nombre": user.name}


# ---------- enrolled courses (read under row-level security) ----------
@router.get("/cursos", response_model=list[PublicCourseCard])
async def my_courses(user: CurrentStudent, session: DB) -> list[dict]:
    await scope_to_student(session, user.id)
    rows = await session.scalars(
        select(Course).join(Enrollment, Enrollment.course_id == Course.id).options(_full).order_by(Enrollment.otorgado_en.desc())
    )
    return [_card(c) for c in rows]


@router.get("/cursos/{slug}", response_model=StudentCourse)
async def course_for_student(slug: str, user: CurrentStudent, session: DB) -> StudentCourse:
    await scope_to_student(session, user.id)
    c = await session.scalar(select(Course).where(Course.slug == slug, Course.status == "published").options(_full))
    if c is None:
        raise ApiError(404, "NO_ENCONTRADO", "Curso no encontrado")
    enrolled = await session.scalar(select(Enrollment.id).where(Enrollment.course_id == c.id)) is not None
    return StudentCourse(
        **_card(c), description=c.description, inscrito=enrolled,
        modules=[PublicModule(title=m.title, lessons=[_public_lesson(x, enrolled) for x in m.lessons]) for m in c.modules],
    )


@router.get("/ordenes", response_model=list[OrderOut])
async def my_orders(user: CurrentStudent, session: DB) -> list[dict]:
    await scope_to_student(session, user.id)
    rows = await session.execute(
        select(Order, Course.slug).join(Course, Course.id == Order.course_id).order_by(Order.creado_en.desc()).limit(100)
    )
    return [_order_out(o, slug) for o, slug in rows]


def _order_out(o: Order, slug: str) -> dict:
    return {
        "id": o.id, "estado": o.estado, "monto_centavos": o.monto_centavos, "moneda": o.moneda,
        "proveedor": o.proveedor, "curso": slug, "creado_en": o.creado_en,
    }


# ---------- checkout ----------
@router.post("/checkout", response_model=CheckoutOut, status_code=201)
@limiter.limit("10/minute")
async def checkout(
    request: Request,
    body: CheckoutIn,
    user: CurrentStudent,
    session: DB,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> JSONResponse:
    """Creates a pending order and the provider's checkout session; a repeated key replays the first answer."""
    provider = payments.active_provider()
    if provider is None:
        raise ApiError(503, "PAGOS_NO_DISPONIBLES", "Las inscripciones en línea aún no están abiertas.")

    async def effect() -> tuple[int, dict]:
        await scope_to_system(session)
        course = await session.scalar(select(Course).where(Course.slug == body.curso, Course.status == "published"))
        if course is None or not course.price_mxn:
            raise ApiError(409, "CURSO_NO_DISPONIBLE", "Este curso no está a la venta.")
        if await session.scalar(
            select(Enrollment.id).where(Enrollment.user_id == user.id, Enrollment.course_id == course.id)
        ):
            raise ApiError(409, "YA_INSCRITO", "Ya tienes acceso a este curso.")
        order = Order(
            id=uuid.uuid4(), user_id=user.id, course_id=course.id,
            monto_centavos=course.price_mxn * 100, moneda="MXN", proveedor=provider.id,
        )
        order.titulo = course.title  # transient: shown on the gateway's checkout page
        session.add(order)
        await session.flush()
        sesion = await provider.crear_checkout(order, f"{get_settings().portal_url}/academia/pago")
        order.referencia_externa = sesion.referencia_externa
        await session.flush()
        return 201, {"orden_id": str(order.id), "url": sesion.url}

    code, payload = await run_once(
        session, scope=f"checkout:{user.id}", key=idempotency_key, payload=body.model_dump(), effect=effect
    )
    return JSONResponse(payload, status_code=code)


@router.get("/ordenes/{order_id}", response_model=OrderOut)
async def get_order(order_id: uuid.UUID, user: CurrentStudent, session: DB) -> dict:
    await scope_to_student(session, user.id)
    row = (await session.execute(
        select(Order, Course.slug).join(Course, Course.id == Order.course_id).where(Order.id == order_id)
    )).first()
    if row is None:  # another student's order is invisible under RLS: same answer as a missing one
        raise ApiError(404, "NO_ENCONTRADO", "Orden no encontrada")
    return _order_out(*row)


@router.post("/ordenes/{order_id}/simular", response_model=OrderOut)
async def simulate_payment(order_id: uuid.UUID, body: SimulatedPaymentIn, user: CurrentStudent, session: DB) -> dict:
    """Mock provider only: the simulated payment page confirms through the same signed-webhook path."""
    provider = payments.active_provider()
    if not isinstance(provider, payments.MockProvider):
        raise ApiError(404, "NO_ENCONTRADO", "No disponible")
    await scope_to_system(session)
    order = await session.scalar(select(Order).where(Order.id == order_id, Order.user_id == user.id))
    if order is None or order.proveedor != provider.id:
        raise ApiError(404, "NO_ENCONTRADO", "Orden no encontrada")
    cuerpo, cabeceras = provider.evento_simulado(order, body.estado)
    order = await payments.apply_event(session, provider.id, await provider.verificar_webhook(cuerpo, cabeceras))
    slug = await session.scalar(select(Course.slug).where(Course.id == order.course_id))
    await session.commit()
    return _order_out(order, slug)


# ---------- provider webhooks (called by the gateway, authenticated by its signature) ----------
@webhooks.post("/webhook/{proveedor}")
async def webhook(proveedor: str, request: Request, session: DB) -> dict:
    provider = payments.provider_by_id(proveedor)
    try:
        evento = await provider.verificar_webhook(await request.body(), request.headers)
    except payments.EventoIgnorado as exc:
        return {"ok": True, "ignorado": str(exc)}
    await scope_to_system(session)
    order = await payments.apply_event(session, provider.id, evento)
    await session.commit()
    return {"ok": True, "estado": order.estado}
