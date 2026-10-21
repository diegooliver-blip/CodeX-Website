from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_content_dir() -> Path:
    """Repo checkout: <root>/content. Container: mounted at /content."""
    here = Path(__file__).resolve()
    return here.parents[3] / "content" if len(here.parents) > 3 else Path("/content")


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
    # Loops transactional template ids for the client portal (invite, reset, password changed).
    loops_tx_invitacion: str = ""
    loops_tx_restablecer: str = ""
    loops_tx_contrasena_cambiada: str = ""

    # ---- client portal ----
    # Dedicated identity database and role; created on first boot by app.clientes.bootstrap.
    clientes_database_url: str = "postgresql+asyncpg://clientes_app:clientes-dev@localhost:5432/codex_clientes"
    portal_url: str = "http://localhost:3000"  # base for links in invitation/reset emails
    turnstile_secret: str = ""  # Cloudflare Turnstile; empty = captcha checks fail closed
    sync_shared_secret: str = ""  # HMAC secret shared with VS Master Control; empty = sync API disabled

    # ---- course payments (docs/integracion-pagos.md) ----
    # "" = sales off (checkout answers PAGOS_NO_DISPONIBLES) | mock | stripe | mercadopago.
    # Never set "mock" in production: it grants access without charging.
    payment_provider: str = ""
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    mercadopago_access_token: str = ""
    mercadopago_webhook_secret: str = ""
    api_public_url: str = ""  # public base URL of this API, for gateway webhooks (e.g. https://api.example.com)

    content_dir: Path = _default_content_dir()


@lru_cache
def get_settings() -> Settings:
    return Settings()
