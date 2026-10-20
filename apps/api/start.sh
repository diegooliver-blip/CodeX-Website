#!/bin/sh
# Container entrypoint shared by the api and worker services (see Dockerfile).
set -e

if [ "${APP_ROLE:-api}" = "worker" ]; then
  exec python -m app.worker
fi

alembic upgrade head
# Re-embed content that changed since the last deploy (unchanged documents are skipped by checksum).
python -m app.cli reindex || echo '{"event": "reindex_fallido", "level": "warning"}'
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --no-proxy-headers --no-access-log
