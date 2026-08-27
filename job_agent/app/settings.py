"""Configuracao global carregada de variaveis de ambiente (.env).

Regra de ouro: segredos vivem SOMENTE aqui, vindos do ambiente. Nunca
sao escritos em disco, nunca aparecem em log (ver app/logging_setup.py).
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- seguranca / modo ---
    dry_run: bool = True
    require_manual_approval: bool = True

    # --- LLM (opcional) ---
    llm_provider: str = "none"          # none | anthropic | openai
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    llm_model: str = ""

    # --- identificacao / rede ---
    contact_email: str = ""
    user_agent: str = "job-agent/0.1"
    min_seconds_between_requests: float = 2.0
    http_timeout_seconds: float = 30.0
    max_requests_per_run: int = 300
    respect_robots_txt: bool = True

    # --- servidor ---
    host: str = "127.0.0.1"
    port: int = 8765

    # --- caminhos ---
    database_url: str = "sqlite:///./data/job_agent.db"
    profile_path: str = "./config/profile.yaml"
    sources_path: str = "./config/sources.yaml"
    resume_dir: str = "./resumes"
    log_dir: str = "./logs"
    log_level: str = "INFO"

    generated_dir: str = Field(default="./data/generated")

    # ------------------------------------------------------------------
    def _abs(self, value: str) -> Path:
        p = Path(value)
        return p if p.is_absolute() else (BASE_DIR / p).resolve()

    @property
    def profile_file(self) -> Path:
        return self._abs(self.profile_path)

    @property
    def sources_file(self) -> Path:
        return self._abs(self.sources_path)

    @property
    def resumes_dir(self) -> Path:
        return self._abs(self.resume_dir)

    @property
    def logs_dir(self) -> Path:
        return self._abs(self.log_dir)

    @property
    def generated_path(self) -> Path:
        return self._abs(self.generated_dir)

    @property
    def sqlalchemy_url(self) -> str:
        """Resolve caminhos SQLite relativos contra a raiz do projeto."""
        url = self.database_url
        prefix = "sqlite:///"
        if url.startswith(prefix):
            raw = url[len(prefix):]
            if raw.startswith("./") or not raw.startswith("/"):
                return prefix + str(self._abs(raw))
        return url

    @property
    def secret_values(self) -> list[str]:
        """Valores que jamais podem aparecer em log."""
        return [v for v in (self.anthropic_api_key, self.openai_api_key) if v]

    def can_submit(self) -> tuple[bool, str]:
        """Envio de candidatura e permitido? Retorna (permitido, motivo)."""
        if self.dry_run:
            return False, "DRY_RUN=true: envio bloqueado. Nada foi enviado."
        return True, "DRY_RUN=false: envio permitido apos aprovacao manual explicita."


@lru_cache
def get_settings() -> Settings:
    return Settings()
