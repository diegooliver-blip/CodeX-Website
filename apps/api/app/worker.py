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

from sqlalchemy import delete, text
from sqlalchemy.dialects.postgresql import insert

from app.db import SessionLocal, engine
from app.models import IdempotencyKey, OutboxEvent, WorkerHeartbeat
from app.observability import configure_logging, log
from app.services import loops, outbox

OUTBOX_HANDLERS: dict[str, outbox.Handler] = {
    "lead_created": loops.deliver,
    "course_interest": loops.deliver,
}


@dataclass
class Job:
    name: str
    every_s: float
    run: Callable[[], Awaitable[str]]  # returns a short human summary for the heartbeat


async def heartbeat() -> str:
    return "vivo"


async def process_events() -> str:
    stats = await outbox.process_batch(SessionLocal, OUTBOX_HANDLERS, limit=50)
    return ", ".join(f"{k}={v}" for k, v in stats.items() if v) or "sin eventos"


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
