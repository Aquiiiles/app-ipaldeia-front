"""Rotas de vagas: listar, detalhar, analisar, aprovar, ignorar, notas."""
from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_profile
from app.api.schemas import ManualJobRequest, NoteRequest, SearchRequest
from app.applications import service as app_service
from app.crawler.normalize import normalize
from app.crawler.pipeline import run_search, store_jobs
from app.database import repository as repo
from app.database.repository import TransitionError
from app.database.schema import Job
from app.models.enums import JobStatus
from app.models.job import RawJob
from app.models.profile import Profile
from app.ranking.fit import analyze
from app.settings import get_settings
from app.sources import available_sources, load_source_configs
from app.sources.manual import ManualSearchLinksSource, raw_job_from_manual_input

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


def job_to_dict(job: Job, detailed: bool = False) -> dict:
    data = {
        "id": job.id,
        "title": job.title,
        "company": job.company,
        "url": job.url,
        "source": job.source,
        "location": job.location,
        "remote": job.remote,
        "accepts_brazil": job.accepts_brazil,
        "salary": job.salary,
        "salary_min_brl_month": job.salary_min_brl_month,
        "salary_max_brl_month": job.salary_max_brl_month,
        "seniority": job.seniority,
        "years_required": job.years_required,
        "technologies": job.technologies_list(),
        "posted_at": job.posted_at.strftime("%Y-%m-%d") if job.posted_at else "desconhecida",
        "updated_at": job.updated_at.strftime("%Y-%m-%d") if job.updated_at else None,
        "discovered_at": job.discovered_at.strftime("%Y-%m-%d %H:%M") if job.discovered_at else None,
        "recency": job.recency,
        "recency_days": job.recency_days,
        "fit_score": job.fit_score,
        "recommendation": job.recommendation,
        "status": job.status,
        "is_stretch": job.is_stretch,
        "filter_flags": job.flags_list(),
        "duplicate_of_id": job.duplicate_of_id,
    }
    if detailed:
        data["description"] = job.description
        data["requirements"] = json.loads(job.requirements or "[]")
        data["fit_breakdown"] = json.loads(job.fit_breakdown or "{}")
        data["fit_analysis"] = json.loads(job.fit_analysis or "{}")
        data["notes"] = [
            {"id": n.id, "body": n.body,
             "created_at": n.created_at.strftime("%Y-%m-%d %H:%M")}
            for n in job.notes
        ]
        data["applications"] = [
            {"id": a.id, "status": a.status,
             "approved_by_user": a.approved_by_user,
             "applied_at": a.applied_at.strftime("%Y-%m-%d %H:%M") if a.applied_at else None}
            for a in job.applications
        ]
    return data


@router.get("")
def list_jobs(
    status: str | None = None,
    recommendation: str | None = None,
    min_score: float | None = None,
    search: str | None = None,
    include_duplicates: bool = False,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
) -> dict:
    jobs = repo.list_jobs(
        db, status=status, recommendation=recommendation, min_score=min_score,
        search=search, include_duplicates=include_duplicates, limit=limit, offset=offset,
    )
    return {"count": len(jobs), "jobs": [job_to_dict(j) for j in jobs]}


@router.get("/{job_id}")
def get_job(job_id: int, db: Session = Depends(get_db)) -> dict:
    job = repo.get_job(db, job_id)
    if job is None:
        raise HTTPException(404, f"Vaga {job_id} nao encontrada.")
    return job_to_dict(job, detailed=True)


@router.post("/{job_id}/analyze")
def reanalyze(
    job_id: int, db: Session = Depends(get_db), profile: Profile = Depends(get_profile)
) -> dict:
    """Recalcula o fit com o perfil ATUAL (util depois de editar profile.yaml)."""
    job = repo.get_job(db, job_id)
    if job is None:
        raise HTTPException(404, f"Vaga {job_id} nao encontrada.")

    raw = RawJob(
        source=job.source, external_id=job.external_id, title=job.title,
        company=job.company, url=job.url, description=job.description,
        location_raw=job.location, salary_raw=job.salary,
        posted_at=job.posted_at, updated_at=job.updated_at,
    )
    normalized = normalize(raw, profile)
    analysis = analyze(normalized, profile)
    repo.upsert_job(db, normalized, analysis)
    return {
        "job_id": job_id,
        "fit_score": analysis.score,
        "recommendation": analysis.recommendation.value,
        "breakdown": analysis.breakdown.as_dict(),
        "why_it_fits": analysis.why_it_fits,
        "concerns": analysis.concerns,
        "matched_requirements": analysis.matched_requirements,
        "missing_requirements": analysis.missing_requirements,
        "critical_missing": analysis.critical_missing,
        "nice_to_have_missing": analysis.nice_to_have_missing,
        "growth_opportunities": analysis.growth_opportunities,
        "should_apply": analysis.should_apply,
        "should_apply_reason": analysis.should_apply_reason,
        "is_stretch": analysis.is_stretch,
    }


@router.post("/{job_id}/approve")
def approve(job_id: int, db: Session = Depends(get_db)) -> dict:
    """[Aprovar candidatura] — portao 1. Nao envia nada."""
    job = repo.get_job(db, job_id)
    if job is None:
        raise HTTPException(404, f"Vaga {job_id} nao encontrada.")
    try:
        app_service.approve_job(db, job)
    except TransitionError as exc:
        raise HTTPException(409, str(exc)) from exc
    return {"job_id": job_id, "status": job.status,
            "next_step": "Use [Preparar candidatura] para gerar CV, cover letter e respostas."}


@router.post("/{job_id}/ignore")
def ignore(job_id: int, db: Session = Depends(get_db)) -> dict:
    """[Ignorar] — a vaga fica registrada, apenas fora do ranking."""
    job = repo.get_job(db, job_id)
    if job is None:
        raise HTTPException(404, f"Vaga {job_id} nao encontrada.")
    app_service.ignore_job(db, job)
    return {"job_id": job_id, "status": job.status}


@router.post("/{job_id}/review")
def move_to_review(job_id: int, db: Session = Depends(get_db)) -> dict:
    job = repo.get_job(db, job_id)
    if job is None:
        raise HTTPException(404, f"Vaga {job_id} nao encontrada.")
    try:
        repo.set_job_status(db, job, JobStatus.REVIEW)
    except TransitionError as exc:
        raise HTTPException(409, str(exc)) from exc
    return {"job_id": job_id, "status": job.status}


@router.post("/{job_id}/notes")
def add_note(job_id: int, payload: NoteRequest, db: Session = Depends(get_db)) -> dict:
    """[Adicionar nota]"""
    job = repo.get_job(db, job_id)
    if job is None:
        raise HTTPException(404, f"Vaga {job_id} nao encontrada.")
    if not payload.body.strip():
        raise HTTPException(400, "A nota nao pode ser vazia.")
    note = repo.add_note(db, job, payload.body.strip())
    return {"note_id": note.id, "job_id": job_id, "body": note.body}


# --------------------------------------------------------------------------
search_router = APIRouter(prefix="/api/search", tags=["search"])


@search_router.post("/run")
async def run(
    payload: SearchRequest, profile: Profile = Depends(get_profile)
) -> dict:
    """Executa a busca. Nunca envia candidatura, em nenhum modo."""
    settings = get_settings()
    summary = await run_search(
        profile, str(settings.sources_file), only_sources=payload.sources
    )
    return summary.as_dict()


@search_router.get("/sources")
def sources(profile: Profile = Depends(get_profile)) -> dict:
    """Catalogo de fontes + links de busca manual (sites que nao raspamos)."""
    settings = get_settings()
    configs = load_source_configs(str(settings.sources_file))
    enabled = {c["id"] for c in configs if c.get("enabled", True)}

    manual_config = next((c for c in configs if c.get("id") == "manual_search_links"), {})
    manual_links = ManualSearchLinksSource(manual_config).build_links(profile)

    return {
        "available": available_sources(),
        "enabled": sorted(enabled),
        "manual_search_links": manual_links,
        "note": ("LinkedIn, Indeed, Glassdoor e Gupy proibem scraping nos Termos de Uso. "
                 "O agente nao faz requisicoes a esses sites: apenas monta os links "
                 "acima para voce abrir manualmente."),
    }


@search_router.post("/manual-import")
def manual_import(
    payload: ManualJobRequest,
    db: Session = Depends(get_db),
    profile: Profile = Depends(get_profile),
) -> dict:
    """Importa uma vaga que voce colou. Passa pelo MESMO pipeline."""
    if not payload.title.strip():
        raise HTTPException(400, "O titulo e obrigatorio.")
    raw = raw_job_from_manual_input(
        title=payload.title, company=payload.company, url=payload.url,
        description=payload.description, location=payload.location,
        salary=payload.salary, posted_at=payload.posted_at,
    )
    normalized = normalize(raw, profile)
    store_jobs(db, [normalized], profile)
    analysis = analyze(normalized, profile)
    return {
        "imported": True,
        "title": normalized.title,
        "company": normalized.company,
        "posted_at": normalized.posted_at_display,
        "fit_score": analysis.score,
        "recommendation": analysis.recommendation.value,
        "note": ("Data de publicacao desconhecida — nao foi inventada."
                 if normalized.posted_at is None else ""),
    }
