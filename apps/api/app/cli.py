"""Management commands.

    python -m app.cli create-admin admin@codexai.com "Nombre"   (prompts for the password)
    python -m app.cli reindex
    python -m app.cli reset-mfa admin@codexai.com               (lost phone: turns two-factor off)
    python -m app.cli backup                                     (dump both databases to the backup bucket now)
    python -m app.cli restore-test [site|clientes]               (restore the newest dump into a scratch DB)
"""

import asyncio
import getpass
import json
import os
import sys

from sqlalchemy import select

from app.db import SessionLocal
from app.models import User
from app.security import hash_password
from app.services import audit, backups, rag


async def create_admin(email: str, name: str) -> None:
    password = os.environ.get("ADMIN_PASSWORD") or getpass.getpass("Contraseña (mín. 8): ")
    if len(password) < 8:
        sys.exit("La contraseña debe tener al menos 8 caracteres")
    async with SessionLocal() as session:
        user = await session.scalar(select(User).where(User.email == email.lower()))
        if user is None:
            user = User(email=email.lower())
            session.add(user)
        user.name, user.role, user.password_hash = name, "admin", hash_password(password)
        await session.commit()
    print(f"Administrador listo: {email}")


async def reset_mfa(email: str) -> None:
    async with SessionLocal() as session:
        user = await session.scalar(select(User).where(User.email == email.lower()))
        if user is None:
            sys.exit(f"No existe {email}")
        user.totp_secret = user.totp_activado_en = user.totp_ultimo_paso = None
        audit.record(session, user, "desactivar_mfa_cli", "usuario", user.id)
        await session.commit()
    print(f"Verificación en dos pasos desactivada para {email}")


async def reindex() -> None:
    async with SessionLocal() as session:
        print(await rag.reindex(session))


def main() -> None:
    match sys.argv[1:]:
        case ["create-admin", email, *rest]:
            asyncio.run(create_admin(email, " ".join(rest) or "Administrador"))
        case ["reset-mfa", email]:
            asyncio.run(reset_mfa(email))
        case ["backup"]:
            print(asyncio.run(backups.backup_all()))
        case ["restore-test", *name]:
            print(json.dumps(asyncio.run(backups.restore_test(name[0] if name else "site")), indent=2))
        case ["reindex"]:
            asyncio.run(reindex())
        case _:
            sys.exit(__doc__)


if __name__ == "__main__":
    main()
