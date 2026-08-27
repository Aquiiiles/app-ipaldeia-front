"""Acesso a dados. Toda regra de transicao de status passa por aqui."""
from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.enums import ALLOWED_TRANSITIONS, JobStatus
from app.models.job import FitAnalysis, NormalizedJob
from app.database.schema import (
    Application, ApplicationAnswer, Interview, Job, JobDuplicate, Note, SourceRun,
)


class TransitionError(ValueError):
    """Transicao de status nao permitida pelo fluxo."""


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _naive(value: datetime | None) -> datetime | None:
    """SQLite guarda datetimes ingenuos; normalizamos para UTC sem tz."""
    if value is None:
        return None
    return value.astimezone(timezone.utc).replace(tzinfo=None) if value.tzinfo else value


# --------------------------------------------------------------------------
# Jobs
# --------------------------------------------------------------------------
def find_job_by_external(session: Session, source: str, external_id: str) -> Job | None:
    return session.scalar(
        select(Job).where(Job.source == source, Job.external_id == external_id)
    )


def find_existing_similar(session: Session, job: NormalizedJob) -> Job | None:
    """Procura uma vaga ja no banco que seja a MESMA posicao."""
    if job.canonical_url:
        hit = session.scalar(select(Job).where(Job.canonical_url == job.canonical_url))
        if hit:
            return hit
    if job.dedupe_key:
        return session.scalar(select(Job).where(Job.dedupe_key == job.dedupe_key))
    return None


def _apply_normalized(row: Job, job: NormalizedJob) -> None:
    row.title = job.title
    row.company = job.company
    row.url = job.url
    row.canonical_url = job.canonical_url
    row.source = job.source
    row.external_id = job.external_id
    row.location = job.location
    row.remote = job.modality.value
    row.accepts_brazil = job.accepts_brazil
    row.salary = job.salary_raw
    row.salary_min_brl_month = job.salary_min_brl_month
    row.salary_max_brl_month = job.salary_max_brl_month
    row.seniority = job.seniority.value
    row.years_required = job.years_required
    row.technologies = ",".join(job.technologies)
    row.requirements = json.dumps(job.requirements, ensure_ascii=False)
    row.description = job.description
    row.posted_at = _naive(job.posted_at)
    row.updated_at = _naive(job.updated_at)
    row.recency = job.recency.value
    row.recency_days = job.recency_days
    row.dedupe_key = job.dedupe_key
    row.last_seen_at = _utcnow().replace(tzinfo=None)


def _apply_analysis(row: Job, analysis: FitAnalysis) -> None:
    row.fit_score = analysis.score
    row.recommendation = analysis.recommendation.value
    row.fit_breakdown = json.dumps(analysis.breakdown.as_dict(), ensure_ascii=False)
    row.fit_analysis = json.dumps(
        {
            "matched_requirements": analysis.matched_requirements,
            "missing_requirements": analysis.missing_requirements,
            "critical_missing": analysis.critical_missing,
            "nice_to_have_missing": analysis.nice_to_have_missing,
            "growth_opportunities": analysis.growth_opportunities,
            "why_it_fits": analysis.why_it_fits,
            "concerns": analysis.concerns,
            "should_apply": analysis.should_apply,
            "should_apply_reason": analysis.should_apply_reason,
        },
        ensure_ascii=False,
    )
    row.filter_flags = ",".join(analysis.filter_flags)
    row.is_stretch = analysis.is_stretch


def upsert_job(session: Session, job: NormalizedJob, analysis: FitAnalysis) -> tuple[Job, bool]:
    """Insere ou atualiza. Retorna (linha, criada_agora?).

    O status escolhido pelo usuario nunca e sobrescrito por uma nova busca:
    uma vaga ja APPROVED continua APPROVED depois de um re-scan.
    """
    row = find_job_by_external(session, job.source, job.external_id)
    created = False
    if row is None:
        row = Job(discovered_at=_utcnow().replace(tzinfo=None), status=JobStatus.FOUND.value)
        session.add(row)
        created = True

    _apply_normalized(row, job)
    _apply_analysis(row, analysis)
    session.flush()
    return row, created


def mark_duplicate(session: Session, canonical: Job, duplicate: Job, reason: str = "") -> None:
    """Marca `duplicate` como duplicata de `canonical`, sem apagar nada."""
    if canonical.id == duplicate.id:
        return
    duplicate.duplicate_of_id = canonical.id
    # Nao rebaixamos uma vaga que voce ja moveu no fluxo.
    if duplicate.status == JobStatus.FOUND.value:
        duplicate.status = JobStatus.DUPLICATE.value
        duplicate.status_changed_at = _utcnow().replace(tzinfo=None)
    exists = session.scalar(
        select(JobDuplicate).where(
            JobDuplicate.canonical_job_id == canonical.id,
            JobDuplicate.duplicate_job_id == duplicate.id,
        )
    )
    if exists is None:
        session.add(JobDuplicate(
            canonical_job_id=canonical.id, duplicate_job_id=duplicate.id, reason=reason
        ))
    session.flush()


def set_job_status(session: Session, job: Job, new_status: JobStatus, force: bool = False) -> Job:
    """Transiciona respeitando ALLOWED_TRANSITIONS.

    E aqui que o fluxo de aprovacao se torna inviolavel: nao existe caminho
    de FOUND direto para APPLIED.
    """
    current = JobStatus(job.status)
    if current == new_status:
        return job
    if not force and new_status not in ALLOWED_TRANSITIONS.get(current, set()):
        allowed = ", ".join(sorted(s.value for s in ALLOWED_TRANSITIONS.get(current, set()))) or "nenhuma"
        raise TransitionError(
            f"Transicao {current.value} -> {new_status.value} nao permitida. "
            f"Transicoes validas: {allowed}."
        )
    job.status = new_status.value
    job.status_changed_at = _utcnow().replace(tzinfo=None)
    session.flush()
    return job


def list_jobs(
    session: Session,
    status: str | None = None,
    statuses: list[str] | None = None,
    min_score: float | None = None,
    recommendation: str | None = None,
    include_duplicates: bool = False,
    search: str | None = None,
    limit: int = 200,
    offset: int = 0,
) -> list[Job]:
    stmt = select(Job)
    if status:
        stmt = stmt.where(Job.status == status)
    if statuses:
        stmt = stmt.where(Job.status.in_(statuses))
    if min_score is not None:
        stmt = stmt.where(Job.fit_score >= min_score)
    if recommendation:
        stmt = stmt.where(Job.recommendation == recommendation)
    if not include_duplicates:
        stmt = stmt.where(Job.duplicate_of_id.is_(None))
    if search:
        like = f"%{search.lower()}%"
        stmt = stmt.where(
            func.lower(Job.title).like(like) | func.lower(Job.company).like(like)
            | func.lower(Job.technologies).like(like)
        )
    stmt = stmt.order_by(Job.fit_score.desc(), Job.discovered_at.desc()).limit(limit).offset(offset)
    return list(session.scalars(stmt))


def get_job(session: Session, job_id: int) -> Job | None:
    return session.get(Job, job_id)


def add_note(session: Session, job: Job, body: str) -> Note:
    note = Note(job_id=job.id, body=body)
    session.add(note)
    session.flush()
    return note


# --------------------------------------------------------------------------
# Applications
# --------------------------------------------------------------------------
def get_application(session: Session, application_id: int) -> Application | None:
    return session.get(Application, application_id)


def find_application_for_job(session: Session, job_id: int) -> Application | None:
    return session.scalar(
        select(Application).where(Application.job_id == job_id)
        .order_by(Application.created_at.desc())
    )


def has_applied_to_company_position(session: Session, job: Job) -> Application | None:
    """Ja existe candidatura enviada para esta mesma posicao (ou duplicata)?

    Guarda anti-aplicacao-dupla: cobre a vaga canonica e todas as suas
    duplicatas conhecidas.
    """
    ids = {job.id}
    if job.duplicate_of_id:
        ids.add(job.duplicate_of_id)
    for dup in session.scalars(select(JobDuplicate).where(
        (JobDuplicate.canonical_job_id.in_(ids)) | (JobDuplicate.duplicate_job_id.in_(ids))
    )):
        ids.add(dup.canonical_job_id)
        ids.add(dup.duplicate_job_id)

    return session.scalar(
        select(Application).where(
            Application.job_id.in_(ids),
            Application.applied_at.is_not(None),
        )
    )


def list_applications(session: Session, statuses: list[str] | None = None, limit: int = 200) -> list[Application]:
    stmt = select(Application)
    if statuses:
        stmt = stmt.where(Application.status.in_(statuses))
    return list(session.scalars(stmt.order_by(Application.created_at.desc()).limit(limit)))


def add_interview(
    session: Session, application: Application, date: datetime | None,
    type_: str, questions: str = "", notes: str = "", result: str = "",
) -> Interview:
    interview = Interview(
        application_id=application.id, date=_naive(date), type=type_,
        questions=questions, notes=notes, result=result,
    )
    session.add(interview)
    session.flush()
    return interview


def list_interviews(session: Session, limit: int = 200) -> list[Interview]:
    return list(session.scalars(select(Interview).order_by(Interview.date.desc()).limit(limit)))


# --------------------------------------------------------------------------
# Source runs
# --------------------------------------------------------------------------
def start_source_run(session: Session, source: str) -> SourceRun:
    run = SourceRun(source=source)
    session.add(run)
    session.flush()
    return run


def finish_source_run(
    session: Session, run: SourceRun, fetched: int, kept: int,
    duplicates: int, discarded: int, status: str = "ok", error: str = "",
) -> SourceRun:
    run.finished_at = _utcnow().replace(tzinfo=None)
    run.fetched, run.kept = fetched, kept
    run.duplicates, run.discarded = duplicates, discarded
    run.status, run.error = status, error
    session.flush()
    return run


def list_source_runs(session: Session, limit: int = 50) -> list[SourceRun]:
    return list(session.scalars(select(SourceRun).order_by(SourceRun.started_at.desc()).limit(limit)))
