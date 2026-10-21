# Build from the repo root so the site content (RAG source) ships inside the image:
#   docker build -f apps/api/Dockerfile .
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 \
    CONTENT_DIR=/content FASTEMBED_CACHE_PATH=/opt/fastembed
WORKDIR /app

# pg_dump / pg_restore for the nightly backups (client >= server major version 16).
RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client && rm -rf /var/lib/apt/lists/*

COPY apps/api/requirements.txt .
RUN pip install -r requirements.txt

# Bake the embedding model into the image so cold starts don't download ~200 MB.
RUN python -c "from fastembed import TextEmbedding; TextEmbedding('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')"

COPY apps/api/ .
COPY content /content

RUN useradd --create-home --uid 10001 codex && chown -R codex /app /opt/fastembed
USER codex

EXPOSE 8000
# APP_ROLE=api (default): migrate, refresh the RAG index, serve. APP_ROLE=worker: outbox/heartbeat jobs.
CMD ["sh", "start.sh"]
