from fastapi import APIRouter, Request
from sqlalchemy import select

from app.errors import ApiError
from app.limiter import limiter
from app.models import User
from app.schemas import LoginIn, RefreshIn, TokenPair, UserOut
from app.security import DB, STUDENT, CurrentUser, decode, issue_tokens, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenPair)
@limiter.limit("10/minute")
async def login(request: Request, body: LoginIn, session: DB) -> dict:
    user = await session.scalar(select(User).where(User.email == body.email.lower()))
    # Staff only: students sign in through /alumnos/login.
    if user is None or user.role == STUDENT or not verify_password(body.password, user.password_hash):
        raise ApiError(401, "CREDENCIALES_INVALIDAS", "Correo o contraseña incorrectos")
    return issue_tokens(user.id)


@router.post("/refresh", response_model=TokenPair)
async def refresh(body: RefreshIn, session: DB) -> dict:
    user = await session.get(User, decode(body.refresh_token, "refresh"))
    if user is None or user.role == STUDENT:
        raise ApiError(401, "TOKEN_INVALIDO", "Usuario no encontrado")
    return issue_tokens(user.id)


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser) -> User:
    return user
