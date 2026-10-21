"""Background worker: `python -m app.worker`.

Each job runs on its own interval, never overlaps itself, and takes a Postgres advisory lock so two worker
replicas can't run the same job at once. Every run records a heartbeat that `/health` reports.
SIGTERM stops scheduling, lets running jobs finish, then closes the pool.
"""

import asyncio
import signal
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import httpx
from sqlalchemy import delete, select, text
from sqlalchemy.dialects.postgresql import insert

from app.clientes import emails as client_emails
from app.clientes.db import ClientesSession, scope_to_sync
from app.clientes.models import Service, UptimeCheck
from app.db import SessionLocal, engine
from app.models import IdempotencyKey, OutboxEvent, WorkerHeartbeat
from app.observability import configure_logging, log
from app.services import loops, outbox, student_links

OUTBOX_HANDLERS: dict[str, outbox.Handler] = {
    "lead_created": loops.deliver,
    "course_interest": loops.deliver,
    "order_paid": loops.deliver,
    student_links.EMAIL_RESTABLECER: student_links.deliver,
    student_links.EMAIL_VERIFICAR: student_links.deliver,
}


@dataclass
class Job:
    name: str
    every_s: float
    run: Callable[[], Awaitable[str]]  # returns a short human summary for the heartbeat


async def heartbeat() -> str:
    return "vivo"


async def process_events() -> str:
    stats = await outbox.process_batch(SessionLocal, OUTBOX_HANDLERS, limit=50, scrub=student_links.SECRET_TYPES)
    return ", ".join(f"{k}={v}" for k, v in stats.items() if v) or "sin eventos"


async def process_client_emails() -> str:
    stats = await outbox.process_batch(
        ClientesSession, client_emails.HANDLERS, limit=50, scrub=client_emails.SECRET_TYPES
    )
    return ", ".join(f"{k}={v}" for k, v in stats.items() if v) or "sin correos"


UPTIME_TIMEOUT = httpx.Timeout(10.0, connect=5.0)


async def check_uptime() -> str:
    """Ping every monitored client service; a 2xx/3xx answer within 10 s counts as up."""
    async with ClientesSession() as db:
        await scope_to_sync(db)
        targets = list(
            (await db.execute(
                select(Service.id, Service.client_id, Service.monitor_url).where(
                    Service.monitor_url != "", Service.eliminado_en.is_(None)
                )
            )).all()
        )
    if not targets:
        return "sin servicios monitoreados"
    results = []
    async with httpx.AsyncClient(timeout=UPTIME_TIMEOUT, follow_redirects=True, headers={"User-Agent": "CODEX-Uptime/1.0"}) as client:
        for service_id, client_id, url in targets:
            started = time.perf_counter()
            try:
                res = await client.get(url)
                ok, code = res.status_code < 400, res.status_code
            except httpx.HTTPError:
                ok, code = False, None
            results.append(UptimeCheck(service_id=service_id, client_id=client_id, ok=ok, status_code=code,
                                       latencia_ms=int((time.perf_counter() - started) * 1000)))
    async with ClientesSession() as db, db.begin():
        await scope_to_sync(db)
        db.add_all(results)
        await db.execute(delete(UptimeCheck).where(UptimeCheck.revisado_en < datetime.now(UTC) - timedelta(days=35)))
    down = sum(1 for r in results if not r.ok)
    return f"revisados={len(results)}, caidos={down}"


async def cleanup() -> str:
    now = datetime.now(UTC)
    async with SessionLocal() as session, session.begin():
        keys = await session.execute(delete(IdempotencyKey).where(IdempotencyKey.creado_en < now - timedelta(hours=48)))
        events = await session.execute(
            delete(OutboxEvent).where(OutboxEvent.procesado_en < now - timedelta(days=30))
        )
    return f"llaves={keys.rowcount}, eventos={events.rowcount}"


JOBS = [
    Job("latido", 30, heartbeat),
    Job("procesar-eventos", 15, process_events),
    Job("correos-clientes", 15, process_client_emails),
    Job("uptime", 300, check_uptime),
    Job("limpieza", 24 * 3600, cleanup),
]


async def _record(job: str, resultado: str, duracion_ms: int, detalle: str) -> None:
    values = {
        "trabajo": job,
        "ultima_ejecucion": datetime.now(UTC),
        "resultado": resultado,
        "duracion_ms": duracion_ms,
        "detalle": detalle[:500],
    }
    async with SessionLocal() as session, session.begin():
        await session.execute(
            insert(WorkerHeartbeat).values(values).on_conflict_do_update(index_elements=["trabajo"], set_=values)
        )


async def run_job(job: Job) -> None:
    started = time.perf_counter()
    async with engine.connect() as lock_conn:
        got = await lock_conn.scalar(text("SELECT pg_try_advisory_lock(hashtext(:k))"), {"k": f"codex-worker:{job.name}"})
        if not got:
            log.info("trabajo_omitido", trabajo=job.name, motivo="otra instancia lo está ejecutando")
            return
        try:
            detalle = await job.run()
            resultado = "ok"
        except Exception as exc:
            detalle, resultado = f"{type(exc).__name__}: {exc}", "error"
            log.exception("trabajo_fallido", trabajo=job.name)
        finally:
            await lock_conn.execute(text("SELECT pg_advisory_unlock(hashtext(:k))"), {"k": f"codex-worker:{job.name}"})
    ms = int((time.perf_counter() - started) * 1000)
    log.info("trabajo", trabajo=job.name, resultado=resultado, duracion_ms=ms, detalle=detalle)
    try:
        await _record(job.name, resultado, ms, detalle)
    except Exception:
        log.exception("latido_no_registrado", trabajo=job.name)


async def _loop(job: Job, stop: asyncio.Event) -> None:
    while not stop.is_set():
        await run_job(job)
        try:
            await asyncio.wait_for(stop.wait(), timeout=job.every_s)
        except TimeoutError:
            pass


async def main() -> None:
    configure_logging()
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            loop.add_signal_handler(sig, stop.set)
        except NotImplementedError:  # Windows dev shells: Ctrl+C still raises KeyboardInterrupt
            pass
    log.info("worker_inicio", trabajos=[j.name for j in JOBS])
    await asyncio.gather(*(_loop(j, stop) for j in JOBS))
    await engine.dispose()
    log.info("worker_detenido")


if __name__ == "__main__":
    asyncio.run(main())
