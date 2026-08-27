"""Rotas de metricas, relatorio e status do sistema."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_profile
from app.models.profile import Profile
from app.database import repository as repo
from app.reports import metrics
from app.services.profile_service import profile_status, reload_profile
from app.settings import get_settings

router = APIRouter(prefix="/api", tags=["reports"])


@router.get("/metrics")
def get_metrics(db: Session = Depends(get_db)) -> dict:
    return {
        "overview": metrics.overview(db),
        "by_stage": metrics.by_stage(db),
        "top_technologies": metrics.top_technologies(db),
        "top_companies": metrics.top_companies(db),
        "by_source": metrics.by_source(db),
        "applications_per_week": metrics.applications_per_week(db),
        "recency_distribution": metrics.recency_distribution(db),
    }


@router.get("/report/weekly")
def get_weekly_report(
    days: int = Query(default=7, ge=1, le=90),
    db: Session = Depends(get_db),
    profile: Profile = Depends(get_profile),
) -> dict:
    report = metrics.weekly_report(db, days=days, profile=profile)
    report["text"] = metrics.format_weekly_report(report)
    return report


@router.get("/status")
def get_status(db: Session = Depends(get_db)) -> dict:
    """Estado do sistema: modo de operacao, perfil, ultimas buscas."""
    settings = get_settings()
    can_submit, submit_reason = settings.can_submit()
    from app.llm.client import is_available as llm_available

    return {
        "dry_run": settings.dry_run,
        "require_manual_approval": settings.require_manual_approval,
        "submission_allowed_by_config": can_submit,
        "submission_note": submit_reason,
        "llm_provider": settings.llm_provider,
        "llm_available": llm_available(),
        "respect_robots_txt": settings.respect_robots_txt,
        "min_seconds_between_requests": settings.min_seconds_between_requests,
        "max_requests_per_run": settings.max_requests_per_run,
        "profile": profile_status(),
        "recent_runs": [
            {"source": r.source, "status": r.status, "fetched": r.fetched,
             "kept": r.kept, "duplicates": r.duplicates, "discarded": r.discarded,
             "started_at": r.started_at.strftime("%Y-%m-%d %H:%M") if r.started_at else None,
             "error": r.error}
            for r in repo.list_source_runs(db, limit=15)
        ],
    }


@router.post("/profile/reload")
def reload() -> dict:
    """Recarrega profile.yaml e o CV depois de voce editar."""
    reload_profile()
    return {"reloaded": True, "profile": profile_status()}
