from app.services.rag import chunk_text, content_sources


async def test_health(client):
    res = await client.get("/health")
    assert res.json() == {"status": "ok"}


async def test_login_rejects_bad_password(client, admin_headers):
    res = await client.post("/auth/login", json={"email": "test@codexai.com", "password": "incorrecta-1"})
    assert res.status_code == 401


async def test_me_and_refresh(client, admin_headers):
    me = await client.get("/auth/me", headers=admin_headers)
    assert me.json()["role"] == "admin"
    login = await client.post("/auth/login", json={"email": "test@codexai.com", "password": "secreto-123"})
    refreshed = await client.post("/auth/refresh", json={"refresh_token": login.json()["refresh_token"]})
    assert refreshed.status_code == 200
    # an access token must not be accepted as a refresh token
    wrong = await client.post("/auth/refresh", json={"refresh_token": login.json()["access_token"]})
    assert wrong.status_code == 401


async def test_admin_requires_auth(client):
    assert (await client.get("/admin/courses")).status_code == 401


async def test_course_lifecycle(client, admin_headers):
    created = await client.post("/admin/courses", headers=admin_headers, json={
        "slug": "agentes-ia-101", "title": "Agentes de IA 101", "price_mxn": 1990,
    })
    assert created.status_code == 201
    course_id = created.json()["id"]

    # drafts are hidden from the public catalog
    assert all(c["slug"] != "agentes-ia-101" for c in (await client.get("/courses")).json())
    dup = await client.post("/admin/courses", headers=admin_headers, json={"slug": "agentes-ia-101", "title": "x"})
    assert dup.status_code == 409

    module = await client.post(f"/admin/courses/{course_id}/modules", headers=admin_headers, json={"title": "Fundamentos"})
    module_id = module.json()["id"]
    await client.post(f"/admin/courses/modules/{module_id}/lessons", headers=admin_headers, json={
        "title": "Bienvenida", "slug": "bienvenida", "kind": "text", "body": "Hola", "is_free": True, "duration_min": 5,
    })
    await client.post(f"/admin/courses/modules/{module_id}/lessons", headers=admin_headers, json={
        "title": "Herramientas", "slug": "herramientas", "kind": "text", "body": "Secreto", "duration_min": 20,
    })
    await client.patch(f"/admin/courses/{course_id}", headers=admin_headers, json={"status": "published"})

    catalog = (await client.get("/courses")).json()
    card = next(c for c in catalog if c["slug"] == "agentes-ia-101")
    assert card["lessons"] == 2 and card["minutes"] == 25

    detail = (await client.get("/courses/agentes-ia-101")).json()
    free, paid = detail["modules"][0]["lessons"]
    assert free["body"] == "Hola" and not free["locked"]
    assert paid["body"] == "" and paid["locked"]  # paid content never leaks publicly


async def test_lead_is_stored(client, admin_headers):
    res = await client.post("/leads", json={"name": "Ana López", "email": "Ana@Example.com", "service": "ecommerce"})
    assert res.status_code == 201
    leads = (await client.get("/admin/leads", headers=admin_headers)).json()
    assert leads[0]["email"] == "ana@example.com"


async def test_presign_validates_type(client, admin_headers):
    bad = await client.post("/admin/uploads/presign", headers=admin_headers,
                            json={"filename": "x.exe", "content_type": "application/x-msdownload", "folder": "videos"})
    assert bad.status_code == 400


async def test_chat_demo_mode_streams_sources(client, admin_headers):
    await client.post("/admin/rag/reindex", headers=admin_headers)
    res = await client.post("/chat", json={"messages": [{"role": "user", "content": "¿Hacen tiendas en línea?"}]})
    body = res.text
    assert "event: sources" in body and "/servicios/ecommerce" in body
    assert "modo demostración" in body


def test_chunking_overlaps_long_text():
    text = ("Frase de prueba. " * 400).strip()
    parts = chunk_text(text)
    assert len(parts) > 1 and all(len(p) <= 1400 for p in parts)


def test_content_sources_cover_everything():
    refs = {s.ref for s in content_sources()}
    assert "service:simulacion-energetica" in refs and "project:pos-multisucursal" in refs
