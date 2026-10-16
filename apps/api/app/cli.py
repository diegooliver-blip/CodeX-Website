"""Management commands.

    python -m app.cli create-admin admin@codexai.com "Nombre"   (prompts for the password)
    python -m app.cli reindex
"""

import asyncio
import getpass
import os
import sys

from sqlalchemy import select

from app.db import SessionLocal
from app.models import User
from app.security import hash_password
from app.services import rag


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


async def reindex() -> None:
    async with SessionLocal() as session:
        print(await rag.reindex(session))


def main() -> None:
    match sys.argv[1:]:
        case ["create-admin", email, *rest]:
            asyncio.run(create_admin(email, " ".join(rest) or "Administrador"))
        case ["reindex"]:
            asyncio.run(reindex())
        case _:
            sys.exit(__doc__)


if __name__ == "__main__":
    main()
