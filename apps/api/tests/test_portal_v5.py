"""Client portal v5: charges and payments, CODEX+ membership, metrics, settings, catalog interest and the monthly PDF."""

import uuid
from datetime import date, timedelta

import pytest

from app.clientes.billing import hoy
from app.config import get_settings
from tests.test_clientes import activate, new_client_with_user, session_headers, sync


@pytest.fixture
def mock_gateway(monkeypatch):
    monkeypatch.setattr(get_settings(), "payment_provider", "mock")


async def _portal(client, *, services: int = 1) -> dict:
    data = await new_client_with_user(client, email=f"v5-{uuid.uuid4().hex[:8]}@example.com", services=services)
    session = (await activate(client, data["token"]))["sesion"]
    return data | {"h": session_headers(session)}


async def _charge(client, mc_client: str, *, monto: int = 1_250_000, vence: date | None = None, **extra) -> str:
    mc_charge = f"chg-{uuid.uuid4().hex[:8]}"
    res = await sync(client, {"tipo": "charge.published", "version": 1, "datos": {
        "mc_charge_id": mc_charge, "mc_client_id": mc_client, "concepto": "Mensualidad plataforma",
        "monto_centavos": monto, "emitido_en": hoy().isoformat(),
        "vence_en": (vence or hoy() + timedelta(days=10)).isoformat(), **extra,
    }})
    assert res.json()["resultados"][0]["resultado"] == "aplicado", res.text
    return mc_charge


async def test_overview_shows_balance_overdue_and_membership(client):
    p = await _portal(client, services=2)
    await _charge(client, p["mc_client"], monto=500_000)
    await _charge(client, p["mc_client"], monto=300_000, vence=hoy() - timedelta(days=3))

    res = await client.get("/v1/clientes/resumen", headers=p["h"])
    assert res.status_code == 200, res.text
    body = res.json()
    assert len(body["servicios"]) == 2
    assert body["pendiente_centavos"] == 800_000 and body["vencido_centavos"] == 300_000
    assert body["membresia"]["estado"] == "ninguna" and body["membresia"]["monto_centavos"] == 49_900
    assert body["reportes"][0] == hoy().strftime("%Y-%m")


async def test_charges_are_isolated_between_clients(client):
    a, b = await _portal(client), await _portal(client)
    await _charge(client, a["mc_client"])
    assert len((await client.get("/v1/clientes/pagos", headers=a["h"])).json()["cargos"]) == 1
    assert (await client.get("/v1/clientes/pagos", headers=b["h"])).json()["cargos"] == []
    charge_id = (await client.get("/v1/clientes/pagos", headers=a["h"])).json()["cargos"][0]["id"]
    res = await client.post(f"/v1/clientes/pagos/{charge_id}/checkout", headers=b["h"])
    assert res.status_code == 404


async def test_payment_off_without_gateway(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "payment_provider", "")
    p = await _portal(client)
    await _charge(client, p["mc_client"])
    pagos = (await client.get("/v1/clientes/pagos", headers=p["h"])).json()
    assert pagos["pago_en_linea"] is False
    res = await client.post(f"/v1/clientes/pagos/{pagos['cargos'][0]['id']}/checkout", headers=p["h"])
    assert res.status_code == 503 and res.json()["error"]["codigo"] == "PAGOS_NO_DISPONIBLES"


async def test_mock_checkout_pays_the_charge_once(client, mock_gateway):
    p = await _portal(client)
    await _charge(client, p["mc_client"], monto=990_000)
    charge_id = (await client.get("/v1/clientes/pagos", headers=p["h"])).json()["cargos"][0]["id"]

    res = await client.post(f"/v1/clientes/pagos/{charge_id}/checkout", headers=p["h"])
    assert res.status_code == 201 and res.json()["simulado"] is True
    pago_id = res.json()["url"].split("pago=")[1]
    assert res.json()["url"].startswith("https://portal.test/clientes/panel/pagos")

    for _ in range(2):  # a replay changes nothing
        ok = await client.post(f"/v1/clientes/pagos/simular/{pago_id}", json={"estado": "pagado"}, headers=p["h"])
        assert ok.json()["estado"] == "pagado"
    pagos = (await client.get("/v1/clientes/pagos", headers=p["h"])).json()
    assert pagos["pendiente_centavos"] == 0 and pagos["cargos"][0]["estado"] == "pagado"
    assert pagos["historial"][-1]["pagado_centavos"] == 990_000

    again = await client.post(f"/v1/clientes/pagos/{charge_id}/checkout", headers=p["h"])
    assert again.status_code == 409 and again.json()["error"]["codigo"] == "CARGO_NO_PAGABLE"


async def test_voided_and_externally_paid_charges(client):
    p = await _portal(client)
    void_id = await _charge(client, p["mc_client"])
    await _charge(client, p["mc_client"], pagado=True)
    await sync(client, {"tipo": "charge.voided", "version": 2, "datos": {"mc_charge_id": void_id}})
    pagos = (await client.get("/v1/clientes/pagos", headers=p["h"])).json()
    assert [c["estado"] for c in pagos["cargos"]] == ["pagado"]
    assert pagos["pendiente_centavos"] == 0


async def test_charge_for_unknown_client_is_rejected(client):
    res = await sync(client, {"tipo": "charge.published", "version": 1, "datos": {
        "mc_charge_id": "chg-x", "mc_client_id": "no-existe", "concepto": "x", "monto_centavos": 100,
        "emitido_en": hoy().isoformat()}})
    assert res.json()["resultados"][0]["codigo"] == "CLIENTE_DESCONOCIDO"


async def test_membership_subscribe_activate_cancel(client, mock_gateway):
    p = await _portal(client)
    res = await client.post("/v1/clientes/membresia/suscribir", headers=p["h"])
    assert res.status_code == 201 and res.json()["simulado"] is True
    assert (await client.get("/v1/clientes/membresia", headers=p["h"])).json()["estado"] == "pendiente"

    active = (await client.post("/v1/clientes/membresia/simular", headers=p["h"])).json()
    assert active["estado"] == "activa" and active["proximo_cobro"]
    dup = await client.post("/v1/clientes/membresia/suscribir", headers=p["h"])
    assert dup.status_code == 409 and dup.json()["error"]["codigo"] == "YA_ACTIVA"

    cancelled = (await client.post("/v1/clientes/membresia/cancelar", headers=p["h"])).json()
    assert cancelled["estado"] == "cancelada" and cancelled["proximo_cobro"] is None


async def test_metrics_series_fill_missing_days(client):
    p = await _portal(client)
    today = hoy()
    res = await sync(client, {"tipo": "metric.recorded", "datos": {
        "mc_service_id": p["services"][0], "clave": "conversaciones", "etiqueta": "Conversaciones",
        "puntos": [{"dia": (today - timedelta(days=2)).isoformat(), "valor": 12}, {"dia": today.isoformat(), "valor": 30}],
    }})
    assert res.json()["resultados"][0]["resultado"] == "aplicado"
    # same day again overwrites instead of duplicating
    await sync(client, {"tipo": "metric.recorded", "datos": {
        "mc_service_id": p["services"][0], "clave": "conversaciones", "puntos": [{"dia": today.isoformat(), "valor": 31}]}})

    svc_id = (await client.get("/v1/clientes/servicios", headers=p["h"])).json()[0]["id"]
    series = (await client.get(f"/v1/clientes/servicios/{svc_id}/metricas?dias=7", headers=p["h"])).json()
    assert len(series) == 1 and len(series[0]["puntos"]) == 7
    assert series[0]["total"] == 43 and series[0]["puntos"][-1][1] == 31


async def test_service_settings_roundtrip_and_isolation(client):
    a, b = await _portal(client), await _portal(client)
    svc_id = (await client.get("/v1/clientes/servicios", headers=a["h"])).json()[0]["id"]
    assert (await client.get(f"/v1/clientes/servicios/{svc_id}/ajustes", headers=a["h"])).json()["avisos_caida"] is True
    body = {"avisos_avance": False, "avisos_caida": True, "contacto_tecnico": "ti@example.com", "ventana_mantenimiento": "sabado_noche"}
    assert (await client.put(f"/v1/clientes/servicios/{svc_id}/ajustes", json=body, headers=a["h"])).status_code == 200
    assert (await client.get(f"/v1/clientes/servicios/{svc_id}/ajustes", headers=a["h"])).json() == body
    assert (await client.put(f"/v1/clientes/servicios/{svc_id}/ajustes", json=body, headers=b["h"])).status_code == 404


async def test_interest_validates_catalog_and_queues_once(client):
    p = await _portal(client)
    assert (await client.post("/v1/clientes/interes", json={"tipo": "combo", "slug": "no-existe"}, headers=p["h"])).status_code == 404
    for _ in range(2):
        res = await client.post("/v1/clientes/interes", json={"tipo": "skill", "slug": "reportes-con-ia"}, headers=p["h"])
        assert res.status_code == 202
    from sqlalchemy import func, select

    from app.clientes.db import ClientesSession, scope_to_sync
    from app.models import OutboxEvent

    async with ClientesSession() as db:
        await scope_to_sync(db)
        n = await db.scalar(select(func.count()).select_from(OutboxEvent).where(
            OutboxEvent.tipo == "cliente_interes", OutboxEvent.entidad_id.like("%:reportes-con-ia")))
    assert n >= 1


async def test_monthly_report_is_a_pdf(client, mock_gateway):
    p = await _portal(client)
    await sync(client, {"tipo": "metric.recorded", "datos": {
        "mc_service_id": p["services"][0], "clave": "visitas", "etiqueta": "Visitas",
        "puntos": [{"dia": hoy().isoformat(), "valor": 120}]}})
    mes = hoy().strftime("%Y-%m")
    res = await client.get(f"/v1/clientes/reportes/{mes}.pdf", headers=p["h"])
    assert res.status_code == 200 and res.headers["content-type"] == "application/pdf"
    assert res.content.startswith(b"%PDF") and len(res.content) > 2000
    assert (await client.get("/v1/clientes/reportes/2099-01.pdf", headers=p["h"])).status_code == 404
    assert (await client.get(f"/v1/clientes/reportes/{mes}.pdf")).status_code == 401
