"""Contrato das fontes de vagas + registro."""
from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime, timezone

from app.crawler.fetcher import PoliteFetcher
from app.models.job import RawJob
from app.models.profile import Profile


class JobSource(ABC):
    """Uma fonte de vagas.

    Regras para qualquer implementacao:
      * usar SOMENTE API publica/oficial ou feed autorizado;
      * jamais preencher `posted_at` com uma data inventada;
      * jamais tentar contornar autenticacao, CAPTCHA ou anti-bot.
    """

    #: Identificador usado em config/sources.yaml e no campo Job.source.
    id: str = ""
    #: Descricao curta mostrada no dashboard.
    label: str = ""
    #: Nota de compliance: por que esta fonte e permitida.
    compliance_note: str = ""

    def __init__(self, config: dict | None = None) -> None:
        self.config = config or {}

    @abstractmethod
    async def fetch(self, fetcher: PoliteFetcher, profile: Profile) -> list[RawJob]:
        """Busca vagas e devolve na forma bruta."""

    # -- utilidades --------------------------------------------------------
    def queries(self, profile: Profile) -> list[str]:
        """Termos de busca: do sources.yaml ou derivados do perfil."""
        configured = [q for q in self.config.get("queries", []) if q]
        if configured:
            return configured
        return profile.preferences.desired_titles[:4] or ["backend"]

    @staticmethod
    def parse_iso(value: str | None) -> datetime | None:
        """Parse tolerante de datas ISO. Retorna None se nao der — nunca chuta."""
        if not value or not isinstance(value, str):
            return None
        text = value.strip().replace("Z", "+00:00")
        for candidate in (text, text.split(".")[0], text[:19], text[:10]):
            try:
                parsed = datetime.fromisoformat(candidate)
            except ValueError:
                continue
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        return None

    @staticmethod
    def parse_epoch(value) -> datetime | None:
        try:
            seconds = float(value)
        except (TypeError, ValueError):
            return None
        if seconds <= 0:
            return None
        if seconds > 1e11:      # milissegundos
            seconds /= 1000.0
        try:
            return datetime.fromtimestamp(seconds, tz=timezone.utc)
        except (OverflowError, OSError, ValueError):
            return None


#: Registro id -> classe, populado por app/sources/__init__.py.
REGISTRY: dict[str, type[JobSource]] = {}


def register(cls: type[JobSource]) -> type[JobSource]:
    REGISTRY[cls.id] = cls
    return cls
