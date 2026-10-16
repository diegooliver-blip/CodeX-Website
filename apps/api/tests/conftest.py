"""Tests run against a throwaway `codex_test` database on the docker-compose Postgres."""

import os
import subprocess
import sys
from pathlib import Path

import pytest

TEST_DB = "codex_test"
os.environ["DATABASE_URL"] = f"postgresql+asyncpg://codex:codex@localhost:5432/{TEST_DB}"
os.environ["ANTHROPIC_API_KEY"] = ""
os.environ["LOOPS_API_KEY"] = ""
os.environ["INTERNAL_API_KEY"] = ""

API_DIR = Path(__file__).resolve().parents[1]


def _psql(sql: str) -> None:
    subprocess.run(
        ["docker", "compose", "exec", "-T", "db", "psql", "-U", "codex", "-d", "codex", "-c", sql],
        cwd=API_DIR.parents[1], check=True, capture_output=True,
    )


@pytest.fixture(scope="session", autouse=True)
def database():
    _psql(f"DROP DATABASE IF EXISTS {TEST_DB} WITH (FORCE)")
    _psql(f"CREATE DATABASE {TEST_DB}")
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
