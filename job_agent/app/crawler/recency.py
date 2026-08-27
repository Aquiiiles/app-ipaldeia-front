"""Classificacao de recencia. A data NUNCA e inventada.

Se a fonte nao informa data de publicacao, `posted_at` fica None e a vaga
e classificada como UNKNOWN (tratada conforme a config do perfil).
"""
from __future__ import annotations

from datetime import datetime, timezone

from app.models.enums import Recency
from app.models.profile import RecencyConfig

#: Buckets que devem entrar no ranking normal.
PRIORITY_BUCKETS = {Recency.EXCELLENT, Recency.GOOD, Recency.ACCEPTABLE}


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def age_in_days(posted_at: datetime | None, now: datetime | None = None) -> int | None:
    """Idade em dias da vaga, ou None se a data for desconhecida."""
    if posted_at is None:
        return None
    now = _as_utc(now or utcnow())
    delta = now - _as_utc(posted_at)
    return max(0, delta.days)


def classify(
    posted_at: datetime | None,
    config: RecencyConfig,
    updated_at: datetime | None = None,
    now: datetime | None = None,
) -> tuple[Recency, int | None]:
    """Retorna (bucket, idade_em_dias).

    Se `updated_at` for mais recente que `posted_at`, ele e usado: e a
    "evidencia clara de que a vaga foi atualizada recentemente" que permite
    resgatar uma vaga antiga do descarte.
    """
    reference = posted_at
    if updated_at is not None and (posted_at is None or _as_utc(updated_at) > _as_utc(posted_at)):
        reference = updated_at

    days = age_in_days(reference, now=now)
    if days is None:
        return config.bucket_for_unknown(), None

    if days <= config.excellent_max_days:
        return Recency.EXCELLENT, days
    if days <= config.good_max_days:
        return Recency.GOOD, days
    if days <= config.acceptable_max_days:
        return Recency.ACCEPTABLE, days
    if days <= config.ignore_after_days:
        return Recency.LOW, days
    return Recency.IGNORE, days


def should_discard(bucket: Recency) -> bool:
    """Vagas acima do limite de `ignore_after_days` sao descartadas."""
    return bucket is Recency.IGNORE
