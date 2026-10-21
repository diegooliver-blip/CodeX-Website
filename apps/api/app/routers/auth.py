from datetime import UTC, datetime

from fastapi import APIRouter, Request
from sqlalchemy import select

from app.errors import ApiError
from app.limiter import limiter
from app.models import User
from app.schemas import LoginIn, MfaCodeIn, MfaSetupOut, RefreshIn, TokenPair, UserOut
from app.security import DB, STUDENT, CurrentUser, decode, issue_tokens, verify_password
from app.services import audit, totp

router = APIRouter(prefix="/auth", tags=["auth"])


def _check_code(user: User, codigo: str | None) -> None:
    """Accept a TOTP code once (the step is remembered, so a captured code can't be replayed)."""
    step = totp.matching_step(user.totp_secret or "", codigo or "", after=user.totp_ultimo_paso)
    if step is None:
        raise ApiError(401, "CODIGO_INVALIDO", "El código de verificación no es válido o ya se usó.")
    user.totp_ultimo_paso = step


@router.post("/login", response_model=TokenPair)
@limiter.limit("10/minute")
async def login(request: Request, body: LoginIn, session: DB) -> dict:
    user = await session.scalar(select(User).where(User.email == body.email.lower()))
    # Staff only: students sign in through /alumnos/login.
    if user is None or user.role == STUDENT or not verify_password(body.password, user.password_hash):
        raise ApiError(401, "CREDENCIALES_INVALIDAS", "Correo o contraseña incorrectos")
    if user.totp_activado_en is not None:
        if not body.codigo:
            raise ApiError(401, "MFA_REQUERIDO", "Escribe el código de tu app de autenticación.")
        _check_code(user, body.codigo)
        await session.commit()
    return issue_tokens(user.id)


@router.post("/refresh", response_model=TokenPair)
async def refresh(body: RefreshIn, session: DB) -> dict:
    user = await session.get(User, decode(body.refresh_token, "refresh"))
    if user is None or user.role == STUDENT:
        raise ApiError(401, "TOKEN_INVALIDO", "Usuario no encontrado")
    return issue_tokens(user.id)


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser) -> dict:
    return {"id": user.id, "email": user.email, "name": user.name, "role": user.role, "mfa": user.totp_activado_en is not None}


# ---------- two-factor (TOTP) ----------
@router.post("/mfa/iniciar", response_model=MfaSetupOut)
async def mfa_start(user: CurrentUser, session: DB) -> dict:
    """New secret to scan in an authenticator app. It only takes effect once a code from it is confirmed."""
    if user.totp_activado_en is not None:
        raise ApiError(409, "MFA_YA_ACTIVO", "La verificación en dos pasos ya está activa.")
    user.totp_secret, user.totp_ultimo_paso = totp.new_secret(), None
    await session.commit()
    return {"secreto": user.totp_secret, "uri": totp.provisioning_uri(user.totp_secret, user.email)}


@router.post("/mfa/activar", status_code=204)
@limiter.limit("10/minute")
async def mfa_enable(request: Request, body: MfaCodeIn, user: CurrentUser, session: DB) -> None:
    if user.totp_activado_en is not None:
        raise ApiError(409, "MFA_YA_ACTIVO", "La verificación en dos pasos ya está activa.")
    if not user.totp_secret:
        raise ApiError(409, "MFA_SIN_INICIAR", "Primero genera el código QR.")
    _check_code(user, body.codigo)
    user.totp_activado_en = datetime.now(UTC)
    audit.record(session, user, "activar_mfa", "usuario", user.id)
    await session.commit()


@router.post("/mfa/desactivar", status_code=204)
@limiter.limit("10/minute")
async def mfa_disable(request: Request, body: MfaCodeIn, user: CurrentUser, session: DB) -> None:
    if user.totp_activado_en is None:
        return
    _check_code(user, body.codigo)
    user.totp_secret = user.totp_activado_en = user.totp_ultimo_paso = None
    audit.record(session, user, "desactivar_mfa", "usuario", user.id)
    await session.commit()
