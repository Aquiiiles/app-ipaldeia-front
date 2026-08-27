"""Pipeline de descoberta.

PESQUISAR -> FILTRAR -> VERIFICAR RECENCIA -> DEDUPLICAR -> ANALISAR FIT
-> RANKEAR -> ARMAZENAR

Nenhuma etapa aqui envia candidatura. O pipeline para em "armazenado para
sua revisao"; tudo depois disso exige acao humana.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from sqlalchemy.orm import Session

from app.crawler import dedupe as dedupe_mod
from app.crawler.fetcher import (
    BlockedByRobots, HumanInterventionRequired, PoliteFetcher, RequestBudgetExceeded,
)
from app.crawler.normalize import matches_language_preference, normalize
from app.database import repository as repo
from app.logging_setup import get_logger
from app.models.job import NormalizedJob, RawJob
from app.models.profile import Profile
from app.ranking.fit import analyze
from app.ranking.filters import apply_filters
from app.sources import build_sources, load_source_configs
from app.sources.base import JobSource

log = get_logger("pipeline")


@dataclass
class SourceOutcome:
    source: str
    fetched: int = 0
    kept: int = 0
    duplicates: int = 0
    discarded: int = 0
    status: str = "ok"
    error: str = ""
    needs_human: bool = False


@dataclass
class RunSummary:
    started_at: datetime | None = None
    finished_at: datetime | None = None
    per_source: list[SourceOutcome] = field(default_factory=list)
    new_jobs: int = 0
    updated_jobs: int = 0
    duplicates: int = 0
    discarded: int = 0
    total_fetched: int = 0
    requests_made: int = 0
    human_intervention: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "total_fetched": self.total_fetched,
            "new_jobs": self.new_jobs,
            "updated_jobs": self.updated_jobs,
            "duplicates": self.duplicates,
            "discarded": self.discarded,
            "requests_made": self.requests_made,
            "human_intervention": self.human_intervention,
            "per_source": [
                {
                    "source": o.source, "fetched": o.fetched, "kept": o.kept,
                    "duplicates": o.duplicates, "discarded": o.discarded,
                    "status": o.status, "error": o.error, "needs_human": o.needs_human,
                }
                for o in self.per_source
            ],
        }


# --------------------------------------------------------------------------
def process_raw_jobs(
    raw_jobs: list[RawJob], profile: Profile, now: datetime | None = None
) -> tuple[list[NormalizedJob], list[tuple[NormalizedJob, str]]]:
    """Normaliza, aplica recencia/filtros e separa o que foi descartado.

    Retorna (mantidas, [(descartada, motivo), ...]). Nada e descartado em
    silencio: o motivo sempre acompanha.
    """
    kept: list[NormalizedJob] = []
    discarded: list[tuple[NormalizedJob, str]] = []

    for raw in raw_jobs:
        if not (raw.title or "").strip() or not (raw.url or "").strip():
            continue
        job = normalize(raw, profile, now=now)

        filters = apply_filters(job, profile)
        if filters.hard_rejected:
            reason = "; ".join(
                filters.reasons.get(f, f) for f in filters.flags if f in
                {"RECENCIA_EXPIRADA", "VAGA_ENCERRADA", "NAO_ACEITA_BRASIL"}
            )
            discarded.append((job, reason))
            continue
        if not matches_language_preference(job, profile):
            discarded.append((job, "Idioma do anuncio fora das suas preferencias."))
            continue
        kept.append(job)

    return kept, discarded


def store_jobs(
    session: Session, jobs: list[NormalizedJob], profile: Profile
) -> tuple[int, int, int]:
    """Deduplica e persiste. Retorna (novas, atualizadas, duplicatas)."""
    groups = dedupe_mod.group_duplicates(jobs)
    new_count = updated_count = duplicate_count = 0

    for canonical, duplicates in groups:
        analysis = analyze(canonical, profile)
        # Se esta posicao ja existe no banco (de outra fonte), a nova entrada
        # e registrada como duplicata em vez de virar candidata independente.
        pre_existing = repo.find_existing_similar(session, canonical)
        row, created = repo.upsert_job(session, canonical, analysis)
        if created:
            new_count += 1
        else:
            updated_count += 1

        if pre_existing is not None and pre_existing.id != row.id:
            repo.mark_duplicate(session, pre_existing, row,
                                reason="mesma posicao ja registrada de outra fonte")
            duplicate_count += 1

        for dup in duplicates:
            dup_analysis = analyze(dup, profile)
            dup_row, _ = repo.upsert_job(session, dup, dup_analysis)
            repo.mark_duplicate(session, row, dup_row,
                                reason="titulo/empresa/URL equivalentes na mesma execucao")
            duplicate_count += 1

    return new_count, updated_count, duplicate_count


# --------------------------------------------------------------------------
async def fetch_from_source(
    source: JobSource, fetcher: PoliteFetcher, profile: Profile
) -> tuple[list[RawJob], SourceOutcome]:
    """Busca em uma fonte, tratando cada falha de forma explicita."""
    outcome = SourceOutcome(source=source.id)
    try:
        raw = await source.fetch(fetcher, profile)
        outcome.fetched = len(raw)
        return raw, outcome
    except HumanInterventionRequired as exc:
        # NAO tentamos contornar. Paramos nesta fonte e avisamos.
        outcome.status = "needs_human"
        outcome.needs_human = True
        outcome.error = str(exc)
        log.warning("[%s] INTERVENCAO HUMANA NECESSARIA: %s", source.id, exc)
    except BlockedByRobots as exc:
        outcome.status = "blocked_by_robots"
        outcome.error = str(exc)
        log.warning("[%s] Bloqueado por robots.txt: %s", source.id, exc)
    except RequestBudgetExceeded as exc:
        outcome.status = "budget_exceeded"
        outcome.error = str(exc)
        log.warning("[%s] %s", source.id, exc)
    except Exception as exc:
        outcome.status = "error"
        outcome.error = f"{type(exc).__name__}: {exc}"
        log.warning("[%s] Falhou: %s", source.id, outcome.error)
    return [], outcome


async def run_search(
    profile: Profile,
    sources_path: str,
    only_sources: list[str] | None = None,
    session_factory=None,
    now: datetime | None = None,
) -> RunSummary:
    """Execucao completa da busca. Persiste tudo e devolve o resumo."""
    from app.crawler.recency import utcnow
    from app.database.db import session_scope

    summary = RunSummary(started_at=now or utcnow())
    configs = load_source_configs(sources_path)
    sources = build_sources(configs, only=only_sources)
    if not sources:
        log.warning("Nenhuma fonte habilitada em %s.", sources_path)
        summary.finished_at = utcnow()
        return summary

    scope = session_factory or session_scope

    async with PoliteFetcher() as fetcher:
        for source in sources:
            with scope() as session:
                run_row = repo.start_source_run(session, source.id)
                run_id = run_row.id

            raw_jobs, outcome = await fetch_from_source(source, fetcher, profile)
            kept, discarded = process_raw_jobs(raw_jobs, profile, now=now)
            outcome.discarded = len(discarded)

            for job, reason in discarded:
                log.debug("[%s] Descartada '%s' @ %s: %s",
                          source.id, job.title, job.company, reason)

            with scope() as session:
                new_c, upd_c, dup_c = store_jobs(session, kept, profile)
                outcome.kept = new_c + upd_c
                outcome.duplicates = dup_c
                run_row = session.get(type(run_row), run_id)
                if run_row is not None:
                    repo.finish_source_run(
                        session, run_row, fetched=outcome.fetched, kept=outcome.kept,
                        duplicates=outcome.duplicates, discarded=outcome.discarded,
                        status=outcome.status, error=outcome.error,
                    )

            summary.per_source.append(outcome)
            summary.total_fetched += outcome.fetched
            summary.new_jobs += new_c
            summary.updated_jobs += upd_c
            summary.duplicates += dup_c
            summary.discarded += outcome.discarded
            if outcome.needs_human:
                summary.human_intervention.append(f"[{source.id}] {outcome.error}")

            log.info("[%s] buscadas=%d mantidas=%d duplicatas=%d descartadas=%d (%s)",
                     source.id, outcome.fetched, outcome.kept, outcome.duplicates,
                     outcome.discarded, outcome.status)

        summary.requests_made = fetcher.requests_made

    summary.finished_at = utcnow()
    log.info("Busca concluida: %d novas, %d atualizadas, %d duplicatas, %d descartadas "
             "em %d requisicoes.", summary.new_jobs, summary.updated_jobs,
             summary.duplicates, summary.discarded, summary.requests_made)
    return summary
