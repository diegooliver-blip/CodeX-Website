"""Create the dedicated client-portal role and database if they don't exist: `python -m app.clientes.bootstrap`.

Runs with the site database's (superuser) connection, so the portal role never needs elevated rights.
The portal role can't connect to the site database, and the site role isn't used for the portal at all.
"""

import asyncio
import re

import asyncpg
from sqlalchemy.engine import make_url

from app.config import get_settings
from app.observability import configure_logging, log

_IDENT = re.compile(r"^[a-z_][a-z0-9_]{0,62}$")


def _plain_dsn(url: str) -> str:
    return url.replace("postgresql+asyncpg://", "postgresql://")


async def bootstrap() -> None:
    s = get_settings()
    target = make_url(s.clientes_database_url)
    role, password, database = target.username, target.password, target.database
    if not (role and password and database and _IDENT.match(role) and _IDENT.match(database)):
        raise SystemExit("CLIENTES_DATABASE_URL must include a simple role, password and database name")

    admin = make_url(s.database_url)
    conn = await asyncpg.connect(_plain_dsn(s.database_url))
    try:
        if not await conn.fetchval("SELECT 1 FROM pg_roles WHERE rolname = $1", role):
            # Identifiers can't be bound as parameters; both were validated against _IDENT above.
            await conn.execute(f"CREATE ROLE {role} LOGIN PASSWORD {_literal(password)}")
            log.info("clientes_rol_creado", rol=role)
        else:
            await conn.execute(f"ALTER ROLE {role} LOGIN PASSWORD {_literal(password)}")
        if not await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", database):
            await conn.execute(f"CREATE DATABASE {database} OWNER {role}")
            log.info("clientes_base_creada", base=database)
        site_db = admin.database
        if site_db and _IDENT.match(site_db) and site_db != database:
            await conn.execute(f"REVOKE CONNECT ON DATABASE {site_db} FROM PUBLIC")
            await conn.execute(f"REVOKE CONNECT ON DATABASE {database} FROM PUBLIC")
    finally:
        await conn.close()

    # Extensions the portal schema needs (citext is trusted, but create it as superuser to be safe).
    conn = await asyncpg.connect(_plain_dsn(admin.set(database=database).render_as_string(hide_password=False)))
    try:
        await conn.execute("CREATE EXTENSION IF NOT EXISTS citext")
    finally:
        await conn.close()


def _literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


if __name__ == "__main__":
    configure_logging()
    asyncio.run(bootstrap())
