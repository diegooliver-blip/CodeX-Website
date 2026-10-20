import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import get_session
from app.errors import ApiError
from app.models import User

_bearer = HTTPBearer(auto_error=False)
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def _token(user_id: uuid.UUID, kind: str, ttl: timedelta) -> str:
    now = datetime.now(UTC)
    payload = {"sub": str(user_id), "typ": kind, "iat": now, "exp": now + ttl}
    return jwt.encode(payload, get_settings().jwt_secret, algorithm=ALGORITHM)


def issue_tokens(user_id: uuid.UUID) -> dict:
    s = get_settings()
    return {
        "access_token": _token(user_id, "access", timedelta(minutes=s.access_token_minutes)),
        "refresh_token": _token(user_id, "refresh", timedelta(hours=s.refresh_token_hours)),
        "expires_in": s.access_token_minutes * 60,
    }


def decode(token: str, kind: str) -> uuid.UUID:
    try:
        payload = jwt.decode(token, get_settings().jwt_secret, algorithms=[ALGORITHM])
    except jwt.PyJWTError as exc:
        raise ApiError(401, "TOKEN_INVALIDO", "Token inválido o expirado") from exc
    if payload.get("typ") != kind:
        raise ApiError(401, "TOKEN_INVALIDO", "Tipo de token incorrecto")
    return uuid.UUID(payload["sub"])


async def current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> User:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No autenticado")
    user = await session.get(User, decode(creds.credentials, "access"))
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario no encontrado")
    return user


async def require_admin(user: Annotated[User, Depends(current_user)]) -> User:
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Se requiere rol de administrador")
    return user


CurrentUser = Annotated[User, Depends(current_user)]
AdminUser = Annotated[User, Depends(require_admin)]
DB = Annotated[AsyncSession, Depends(get_session)]
