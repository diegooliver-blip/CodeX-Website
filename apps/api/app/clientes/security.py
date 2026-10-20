"""Password hashing, one-time tokens, opaque sessions and keyed hashes for the client portal (pure helpers)."""

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta
from functools import lru_cache
from pathlib import Path

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

from app.config import get_settings
from app.errors import ApiError

SESSION_IDLE = timedelta(hours=12)
SESSION_ABSOLUTE = timedelta(days=7)
INVITE_TTL = timedelta(hours=72)
RESET_TTL = timedelta(hours=1)
MAX_FAILED_LOGINS = 5
LOCKOUT = timedelta(minutes=15)
MIN_PASSWORD, MAX_PASSWORD = 12, 128

# argon2id with OWASP-recommended parameters (19 MiB, 2 passes).
_hasher = PasswordHasher(time_cost=2, memory_cost=19456, parallelism=1)
# Verified against when the email doesn't exist, so response time doesn't reveal which accounts exist.
_DUMMY_HASH = _hasher.hash("codex-portal-dummy-password")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, stored: str | None) -> bool:
    try:
        return _hasher.verify(stored or _DUMMY_HASH, password) and stored is not None
    except (VerifyMismatchError, InvalidHashError):
        return False


def needs_rehash(stored: str) -> bool:
    return _hasher.check_needs_rehash(stored)


@lru_cache
def _common_passwords() -> frozenset[str]:
    path = Path(__file__).with_name("common_passwords.txt")
    return frozenset(line.strip().lower() for line in path.read_text(encoding="utf8").splitlines() if line.strip())


def check_password_policy(password: str, email: str) -> None:
    problems = []
    if len(password) < MIN_PASSWORD:
        problems.append(f"al menos {MIN_PASSWORD} caracteres")
    if len(password) > MAX_PASSWORD:
        problems.append(f"máximo {MAX_PASSWORD} caracteres")
    lowered = password.lower()
    local = email.split("@")[0].lower()
    if lowered in _common_passwords() or (len(local) >= 4 and local in lowered) or len(set(password)) < 5:
        problems.append("que no sea una contraseña común ni contenga tu correo")
    if problems:
        raise ApiError(422, "CONTRASENA_DEBIL", "La contraseña necesita " + " y ".join(problems) + ".")


def new_token() -> tuple[str, str]:
    """(raw token for the user, sha256 to store)."""
    raw = secrets.token_urlsafe(32)
    return raw, token_digest(raw)


def token_digest(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def keyed_hash(value: str) -> str:
    """HMAC of an email or IP for the audit log: correlatable, not reversible without the server secret."""
    if not value:
        return ""
    return hmac.new(get_settings().jwt_secret.encode(), value.strip().lower().encode(), hashlib.sha256).hexdigest()


def session_expired(created: datetime, last_used: datetime, now: datetime) -> bool:
    return now - created > SESSION_ABSOLUTE or now - last_used > SESSION_IDLE
