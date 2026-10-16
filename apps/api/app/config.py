from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../../.env"), extra="ignore")

    database_url: str = "postgresql+asyncpg://codex:codex@localhost:5432/codex"
    jwt_secret: str = "dev-only-secret-change-me-in-production-please"
    access_token_minutes: int = 15
    refresh_token_hours: int = 24

    web_origin: str = "http://localhost:3000"
    internal_api_key: str = ""  # shared secret the Next.js BFF sends on server-to-server calls

    # S3-compatible storage (RustFS locally, S3/R2 in production)
    s3_endpoint: str = "http://localhost:9000"
    s3_public_endpoint: str = "http://localhost:9000"
    s3_bucket: str = "codex-media"
    s3_access_key: str = "codex"
    s3_secret_key: str = "codex-secret"
    s3_region: str = "us-east-1"

    anthropic_api_key: str = ""
    claude_model: str = "claude-opus-5"
    embedding_model: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    embedding_dim: int = 384

    loops_api_key: str = ""

    content_dir: Path = Path(__file__).resolve().parents[3] / "content"


@lru_cache
def get_settings() -> Settings:
    return Settings()
