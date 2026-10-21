"""Staff two-factor sign-in (TOTP): setup, login with code, replay refusal, disable."""

import pytest

from app.db import SessionLocal
from app.models import User
from app.security import hash_password
from app.services import totp


def test_totp_matches_rfc6238_vector():
    # RFC 6238 appendix B, SHA1 secret "12345678901234567890" at T=59 s -> 94287082 (8 digits); 6 digits = 287082.
    import base64

    secret = base64.b32encode(b"12345678901234567890").decode()
    assert totp.code_at(secret, now=59) == "287082"


@pytest.fixture
async def staff(client):
    async with SessionLocal() as s:
        s.add(User(email="mfa@codexai.com", name="MFA", role="editor", password_hash=hash_password("secreto-mfa-1")))
        await s.commit()
    res = await client.post("/auth/login", json={"email": "mfa@codexai.com", "password": "secreto-mfa-1"})
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


async def test_mfa_setup_login_and_disable(client, staff, monkeypatch):
    clock = {"t": 1_800_000_000.0}
    monkeypatch.setattr(totp.time, "time", lambda: clock["t"])

    setup = (await client.post("/auth/mfa/iniciar", headers=staff)).json()
    assert setup["uri"].startswith("otpauth://totp/") and setup["secreto"] in setup["uri"]
    bad = await client.post("/auth/mfa/activar", json={"codigo": "000000"}, headers=staff)
    assert bad.json()["error"]["codigo"] == "CODIGO_INVALIDO"
    assert (await client.post("/auth/mfa/activar", json={"codigo": totp.code_at(setup["secreto"])}, headers=staff)).status_code == 204
    assert (await client.get("/auth/me", headers=staff)).json()["mfa"] is True

    creds = {"email": "mfa@codexai.com", "password": "secreto-mfa-1"}
    needs = await client.post("/auth/login", json=creds)
    assert needs.status_code == 401 and needs.json()["error"]["codigo"] == "MFA_REQUERIDO"
    clock["t"] += 30
    code = totp.code_at(setup["secreto"])
    assert (await client.post("/auth/login", json=creds | {"codigo": code})).status_code == 200
    replay = await client.post("/auth/login", json=creds | {"codigo": code})
    assert replay.json()["error"]["codigo"] == "CODIGO_INVALIDO"

    clock["t"] += 30
    off = await client.post("/auth/mfa/desactivar", json={"codigo": totp.code_at(setup["secreto"])}, headers=staff)
    assert off.status_code == 204
    assert (await client.post("/auth/login", json=creds)).status_code == 200
