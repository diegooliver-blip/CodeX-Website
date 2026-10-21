"""Nightly logical backups: `pg_dump -Fc` of the site and client-portal databases into a private bucket.

The bucket can live on another provider (BACKUP_S3_ENDPOINT / keys, e.g. Cloudflare R2) so a storage or hosting
incident doesn't take the backups with it; by default it reuses the media storage credentials.
`restore_test` proves a backup is usable: it restores the newest dump into a scratch database and compares row counts.
"""

import asyncio
import os
import tempfile
from datetime import UTC, datetime, timedelta
from functools import lru_cache

import asyncpg
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from sqlalchemy.engine import make_url

from app.config import get_settings

RETENTION_DAYS = 14
# Tables compared after a test restore (they exist in every environment and carry the business data).
CHECK_TABLES = {"site": ["users", "courses", "lessons", "leads", "orders", "payments_ledger", "enrollments"]}


def _plain(url: str) -> str:
    return url.replace("postgresql+asyncpg://", "postgresql://")


def databases() -> dict[str, str]:
    s = get_settings()
    return {"site": _plain(s.database_url), "clientes": _plain(s.clientes_database_url)}


@lru_cache
def _s3():
    s = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=s.backup_s3_endpoint or s.s3_endpoint,
        aws_access_key_id=s.backup_s3_access_key or s.s3_access_key,
        aws_secret_access_key=s.backup_s3_secret_key or s.s3_secret_key,
        region_name=s.s3_region,
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}, connect_timeout=5, read_timeout=120),
    )


def _bucket() -> str:
    bucket = get_settings().backup_bucket
    try:
        _s3().head_bucket(Bucket=bucket)
    except ClientError:
        _s3().create_bucket(Bucket=bucket)
    return bucket


async def _run(*args: str) -> None:
    proc = await asyncio.create_subprocess_exec(*args, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    _, err = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"{args[0]} salió con {proc.returncode}: {err.decode(errors='replace')[:500]}")


async def backup_all(now: datetime | None = None) -> str:
    """Dump every database, upload, prune old dumps. Returns a short summary for the worker heartbeat."""
    stamp = (now or datetime.now(UTC)).strftime("%Y-%m-%dT%H%MZ")
    bucket = await asyncio.to_thread(_bucket)
    sizes = []
    for name, dsn in databases().items():
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, f"{name}.dump")
            await _run("pg_dump", "--format=custom", "--no-owner", "--no-privileges", f"--file={path}", f"--dbname={dsn}")
            await asyncio.to_thread(_s3().upload_file, path, bucket, f"{name}/{stamp}.dump")
            sizes.append(f"{name}={os.path.getsize(path) // 1024} KB")
    pruned = await asyncio.to_thread(_prune, bucket, now or datetime.now(UTC))
    return ", ".join(sizes) + f", borrados={pruned}"


def _prune(bucket: str, now: datetime) -> int:
    cutoff = now - timedelta(days=RETENTION_DAYS)
    old = [
        {"Key": o["Key"]}
        for page in _s3().get_paginator("list_objects_v2").paginate(Bucket=bucket)
        for o in page.get("Contents", [])
        if o["LastModified"] < cutoff
    ]
    if old:
        _s3().delete_objects(Bucket=bucket, Delete={"Objects": old})
    return len(old)


def latest_key(name: str) -> str | None:
    objs = [o for page in _s3().get_paginator("list_objects_v2").paginate(Bucket=get_settings().backup_bucket, Prefix=f"{name}/")
            for o in page.get("Contents", [])]
    return max(objs, key=lambda o: o["Key"])["Key"] if objs else None


async def restore_test(name: str = "site") -> dict:
    """Restore the newest `name` dump into a throwaway database and compare row counts with the live one."""
    key = await asyncio.to_thread(latest_key, name)
    if key is None:
        raise RuntimeError(f"No hay respaldos de {name}")
    live = databases()[name]
    scratch = f"codex_restore_test_{name}"
    admin = await asyncpg.connect(_plain(get_settings().database_url))
    try:
        await admin.execute(f"DROP DATABASE IF EXISTS {scratch} WITH (FORCE)")
        await admin.execute(f"CREATE DATABASE {scratch}")
    finally:
        await admin.close()
    target = make_url(_plain(get_settings().database_url)).set(database=scratch).render_as_string(hide_password=False)
    try:
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "restore.dump")
            await asyncio.to_thread(_s3().download_file, get_settings().backup_bucket, key, path)
            # Extensions (pgvector, citext) come back from the dump; owners/privileges were left out on purpose.
            await _run("pg_restore", "--no-owner", "--no-privileges", "--exit-on-error", f"--dbname={target}", path)
        counts = {}
        for table in CHECK_TABLES.get(name, []):
            counts[table] = [await _count(live, table), await _count(target, table)]
        return {"respaldo": key, "tablas": counts}
    finally:
        admin = await asyncpg.connect(_plain(get_settings().database_url))
        try:
            await admin.execute(f"DROP DATABASE IF EXISTS {scratch} WITH (FORCE)")
        finally:
            await admin.close()


async def _count(dsn: str, table: str) -> int:
    conn = await asyncpg.connect(dsn)
    try:
        return await conn.fetchval(f"SELECT count(*) FROM {table}")  # table names come from CHECK_TABLES, not input
    finally:
        await conn.close()
