#!/bin/sh
# Container entrypoint shared by the api and worker services (see Dockerfile).
#   APP_ROLE=api     migrate, refresh the RAG index, serve HTTP
#   APP_ROLE=worker  outbox/heartbeat jobs only
#   APP_ROLE=all     both in one container (hosting plans with a service limit); the worker is restarted if it exits
set -e

if [ "${APP_ROLE:-api}" = "worker" ]; then
  exec python -m app.worker
fi

alembic upgrade head
# Re-embed content that changed since the last deploy (unchanged documents are skipped by checksum).
python -m app.cli reindex || echo '{"event": "reindex_fallido", "level": "warning"}'

if [ "${APP_ROLE}" = "all" ]; then
  (while true; do python -m app.worker; echo '{"event": "worker_reiniciado", "level": "warning"}'; sleep 5; done) &
fi

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --no-proxy-headers --no-access-log
