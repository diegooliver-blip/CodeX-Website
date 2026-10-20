"""Second engine for the dedicated client-portal database (codex_clientes)."""

import uuid
from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

engine = create_async_engine(get_settings().clientes_database_url, pool_pre_ping=True, pool_size=5)
ClientesSession = async_sessionmaker(engine, expire_on_commit=False)


class ClientesBase(DeclarativeBase):
    pass


async def get_clientes_session() -> AsyncIterator[AsyncSession]:
    async with ClientesSession() as session:
        yield session


ClientesDB = Annotated[AsyncSession, Depends(get_clientes_session)]


async def scope_to_client(session: AsyncSession, client_id: uuid.UUID) -> None:
    """Row-level security: every portal-data query in this transaction only sees this client's rows."""
    await session.execute(text("SELECT set_config('app.client_id', :c, true)"), {"c": str(client_id)})


async def scope_to_sync(session: AsyncSession) -> None:
    """The Master Control sync writes across clients; only server-side sync handlers may call this."""
    await session.execute(text("SELECT set_config('app.contexto', 'sync', true)"))
