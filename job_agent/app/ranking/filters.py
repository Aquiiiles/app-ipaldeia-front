"""Filtros. Filosofia: SINALIZAR em vez de apagar.

Cada filtro devolve uma flag textual. Poucas flags sao "hard" (descarte
real); as demais apenas reduzem prioridade, para que vagas stretch ainda
apareçam e a decisao final continue sendo humana.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.crawler.extract import (
    is_backend_relevant, is_support_or_infra_only, normalize_text,
)
from app.models.enums import Modality, Recency, Seniority
from app.models.job import NormalizedJob
from app.models.profile import Profile

#: Flags que causam descarte real (a vaga nao entra no banco como candidata).
HARD_FLAGS = {"RECENCIA_EXPIRADA", "VAGA_ENCERRADA", "NAO_ACEITA_BRASIL"}


@dataclass
class FilterResult:
    flags: list[str]
    hard_rejected: bool
    reasons: dict[str, str]

    def has(self, flag: str) -> bool:
        return flag in self.flags


_CLOSED_TERMS = [
    "no longer accepting", "position has been filled", "this job is closed",
    "vaga encerrada", "vaga preenchida", "candidaturas encerradas",
    "we are no longer accepting applications", "job expired", "posicao fechada",
]


def looks_closed(job: NormalizedJob) -> bool:
    blob = normalize_text(f"{job.title} {job.description}")[:4000]
    return any(normalize_text(t) in blob for t in _CLOSED_TERMS)


def _level_from_name(name: str) -> Seniority | None:
    key = normalize_text(name).replace(" ", "")
    aliases = {
        "techlead": Seniority.LEAD, "lead": Seniority.LEAD,
        "engineeringmanager": Seniority.MANAGER, "manager": Seniority.MANAGER,
        "director": Seniority.MANAGER,
    }
    if key in aliases:
        return aliases[key]
    try:
        return Seniority(key)
    except ValueError:
        return None


def avoided_seniorities(profile: Profile) -> set[Seniority]:
    return {lvl for lvl in (_level_from_name(n) for n in profile.preferences.avoid_levels) if lvl}


def target_seniorities(profile: Profile) -> set[Seniority]:
    return {lvl for lvl in (_level_from_name(n) for n in profile.preferences.target_levels) if lvl}


def apply_filters(job: NormalizedJob, profile: Profile) -> FilterResult:
    """Avalia todos os filtros e devolve as flags encontradas."""
    flags: list[str] = []
    reasons: dict[str, str] = {}
    prefs = profile.preferences

    def flag(name: str, why: str) -> None:
        flags.append(name)
        reasons[name] = why

    # --- recencia (hard) ---
    if job.recency is Recency.IGNORE:
        flag("RECENCIA_EXPIRADA",
             f"Publicada ha {job.recency_days} dias, acima do limite de "
             f"{profile.recency.ignore_after_days} dias, sem evidencia de atualizacao.")
    elif job.recency is Recency.LOW:
        flag("RECENCIA_BAIXA",
             f"Publicada ha {job.recency_days} dias (acima de "
             f"{profile.recency.deprioritize_after_days}); prioridade reduzida.")
    elif job.recency is Recency.UNKNOWN or job.posted_at is None:
        flag("DATA_DESCONHECIDA",
             "A fonte nao informou data de publicacao. Confirme se a vaga esta aberta.")

    # --- vaga encerrada (hard) ---
    if looks_closed(job):
        flag("VAGA_ENCERRADA", "O anuncio indica que nao esta mais recebendo candidaturas.")

    # --- senioridade acima do alvo (suave) ---
    avoid = avoided_seniorities(profile)
    if job.seniority in avoid:
        flag("SENIORIDADE_ACIMA",
             f"Nivel detectado '{job.seniority.value}' esta na sua lista de niveis a evitar.")

    # --- anos de experiencia exigidos (suave) ---
    if job.years_required is not None:
        gap = job.years_required - profile.experience.total_years
        if gap > profile.scoring.stretch_years_tolerance:
            flag("EXPERIENCIA_MUITO_ACIMA",
                 f"Exige ~{job.years_required:.0f} anos; voce tem "
                 f"{profile.experience.total_years:.1f}. Diferenca de {gap:.1f} anos.")
        elif gap > 0:
            flag("STRETCH_EXPERIENCIA",
                 f"Exige ~{job.years_required:.0f} anos vs seus "
                 f"{profile.experience.total_years:.1f}. Vale avaliar como stretch.")

    # --- modalidade (suave) ---
    accepted = {m.lower() for m in prefs.accepted_modalities}
    if prefs.remote_only and job.modality is Modality.ONSITE:
        flag("PRESENCIAL", "Vaga presencial e sua preferencia e remoto.")
    elif job.modality is Modality.HYBRID and "hybrid" not in accepted:
        flag("HIBRIDA", "Vaga hibrida e sua preferencia e remoto.")
    elif job.modality is Modality.UNKNOWN:
        flag("MODALIDADE_DESCONHECIDA", "Nao foi possivel confirmar se e remoto.")

    # --- contratacao no Brasil (hard so quando explicitamente excluido) ---
    if job.accepts_brazil is False:
        flag("NAO_ACEITA_BRASIL", "O anuncio restringe a regiao e exclui o Brasil.")
    elif job.accepts_brazil is None:
        flag("REGIAO_DESCONHECIDA", "Nao ficou claro se aceitam contratacao no Brasil.")

    # --- escopo tecnico (suave) ---
    if not is_backend_relevant(job.title, job.description, job.technologies):
        flag("SEM_BACKEND_RELEVANTE",
             "Nao encontramos desenvolvimento backend significativo no anuncio.")
    if is_support_or_infra_only(job.title, job.description, job.technologies):
        flag("SUPORTE_INFRA_SEM_DEV",
             "Parece vaga de suporte/infra sem desenvolvimento de software relevante.")

    return FilterResult(
        flags=flags,
        hard_rejected=any(f in HARD_FLAGS for f in flags),
        reasons=reasons,
    )
