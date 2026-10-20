"""Tests run against a throwaway `codex_test` database on any reachable Postgres (docker compose locally, a service container in CI)."""

import asyncio
import os
import subprocess
import sys
from pathlib import Path

import asyncpg
import pytest

TEST_DB = "codex_test"
# Maintenance connection used only to drop/create the test database.
ADMIN_DSN = os.environ.get("TEST_ADMIN_DSN", "postgresql://codex:codex@localhost:5432/codex")
os.environ["DATABASE_URL"] = ADMIN_DSN.replace("postgresql://", "postgresql+asyncpg://").rsplit("/", 1)[0] + f"/{TEST_DB}"
os.environ["ANTHROPIC_API_KEY"] = ""
os.environ["LOOPS_API_KEY"] = ""
os.environ["INTERNAL_API_KEY"] = ""

API_DIR = Path(__file__).resolve().parents[1]


async def _admin_sql(*statements: str) -> None:
    conn = await asyncpg.connect(ADMIN_DSN)
    try:
        for sql in statements:
            await conn.execute(sql)
    finally:
        await conn.close()


@pytest.fixture(scope="session", autouse=True)
def database():
    asyncio.run(_admin_sql(f"DROP DATABASE IF EXISTS {TEST_DB} WITH (FORCE)", f"CREATE DATABASE {TEST_DB}"))
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=API_DIR, check=True, env=os.environ)
    yield


@pytest.fixture(scope="session")
async def client(database):
    from httpx import ASGITransport, AsyncClient

    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest.fixture(scope="session")
async def admin_headers(client):
    from app.db import SessionLocal
    from app.models import User
    from app.security import hash_password

    async with SessionLocal() as s:
        s.add(User(email="test@codexai.com", name="Test", role="admin", password_hash=hash_password("secreto-123")))
        await s.commit()
    res = await client.post("/auth/login", json={"email": "test@codexai.com", "password": "secreto-123"})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}
