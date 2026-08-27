"""Metricas do dashboard e relatorio semanal."""
from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database.schema import Application, Interview, Job
from app.formatting import format_brl
from app.models.enums import ACTIVE_PIPELINE, JobStatus, Recommendation


def _naive_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def overview(session: Session) -> dict:
    """Numeros do topo do dashboard."""
    base = select(func.count(Job.id)).where(Job.duplicate_of_id.is_(None))

    def count_jobs(*conditions) -> int:
        stmt = base
        for condition in conditions:
            stmt = stmt.where(condition)
        return session.scalar(stmt) or 0

    total = count_jobs()
    applications_sent = session.scalar(
        select(func.count(Application.id)).where(Application.applied_at.is_not(None))
    ) or 0
    interviews = session.scalar(select(func.count(Interview.id))) or 0
    rejections = count_jobs(Job.status == JobStatus.REJECTED.value)
    offers = count_jobs(Job.status == JobStatus.OFFER.value)
    in_pipeline = count_jobs(Job.status.in_([s.value for s in ACTIVE_PIPELINE]))

    return {
        "total_jobs": total,
        "duplicates": session.scalar(
            select(func.count(Job.id)).where(Job.duplicate_of_id.is_not(None))
        ) or 0,
        "new_jobs": count_jobs(Job.status == JobStatus.FOUND.value),
        "excellent_jobs": count_jobs(Job.recommendation == Recommendation.EXCELENTE.value),
        "very_good_jobs": count_jobs(Job.recommendation == Recommendation.MUITO_BOA.value),
        "to_review": count_jobs(Job.status.in_([JobStatus.FOUND.value, JobStatus.REVIEW.value])),
        "approved": count_jobs(Job.status == JobStatus.APPROVED.value),
        "ready_to_apply": count_jobs(Job.status == JobStatus.READY_TO_APPLY.value),
        "applications_sent": applications_sent,
        "interviews": interviews,
        "rejections": rejections,
        "offers": offers,
        "in_pipeline": in_pipeline,
        # Taxa de conversao: das candidaturas enviadas, quantas geraram
        # algum avanco real (entrevista ou oferta).
        "response_rate": _pct(_responded(session), applications_sent),
        "interview_rate": _pct(interviews, applications_sent),
        "apply_rate": _pct(applications_sent, total),
        "avg_salary_brl_month": _avg_salary(session),
    }


def _responded(session: Session) -> int:
    advanced = {JobStatus.SCREENING, JobStatus.INTERVIEW, JobStatus.TECHNICAL_INTERVIEW,
                JobStatus.OFFER, JobStatus.REJECTED}
    return session.scalar(
        select(func.count(Application.id)).where(
            Application.applied_at.is_not(None),
            Application.status.in_([s.value for s in advanced]),
        )
    ) or 0


def _pct(numerator: int, denominator: int) -> float:
    return round(100.0 * numerator / denominator, 1) if denominator else 0.0


def _avg_salary(session: Session) -> float | None:
    value = session.scalar(
        select(func.avg(
            func.coalesce(Job.salary_max_brl_month, Job.salary_min_brl_month)
        )).where(
            Job.duplicate_of_id.is_(None),
            func.coalesce(Job.salary_max_brl_month, Job.salary_min_brl_month).is_not(None),
        )
    )
    return round(float(value), 2) if value is not None else None


def by_stage(session: Session) -> dict[str, int]:
    """Suas candidaturas por estagio."""
    rows = session.execute(
        select(Application.status, func.count(Application.id)).group_by(Application.status)
    ).all()
    counts = {status.value: 0 for status in JobStatus}
    for status, count in rows:
        counts[status] = count
    return {k: v for k, v in counts.items() if v}


def top_technologies(session: Session, limit: int = 20) -> list[tuple[str, int]]:
    """Tecnologias mais exigidas nas vagas encontradas."""
    counter: Counter[str] = Counter()
    for (techs,) in session.execute(
        select(Job.technologies).where(Job.duplicate_of_id.is_(None))
    ).all():
        counter.update(t for t in (techs or "").split(",") if t)
    return counter.most_common(limit)


def top_companies(session: Session, limit: int = 20) -> list[tuple[str, int]]:
    rows = session.execute(
        select(Job.company, func.count(Job.id))
        .where(Job.duplicate_of_id.is_(None), Job.company != "")
        .group_by(Job.company).order_by(func.count(Job.id).desc()).limit(limit)
    ).all()
    return [(company, count) for company, count in rows]


def by_source(session: Session) -> list[tuple[str, int]]:
    rows = session.execute(
        select(Job.source, func.count(Job.id))
        .where(Job.duplicate_of_id.is_(None))
        .group_by(Job.source).order_by(func.count(Job.id).desc())
    ).all()
    return [(source, count) for source, count in rows]


def applications_per_week(session: Session, weeks: int = 8) -> list[dict]:
    """Quantidade de candidaturas enviadas por semana."""
    now = _naive_now()
    buckets: list[dict] = []
    for index in range(weeks - 1, -1, -1):
        end = now - timedelta(days=7 * index)
        start = end - timedelta(days=7)
        count = session.scalar(
            select(func.count(Application.id)).where(
                Application.applied_at.is_not(None),
                Application.applied_at >= start,
                Application.applied_at < end,
            )
        ) or 0
        buckets.append({
            "week_start": start.strftime("%Y-%m-%d"),
            "week_end": end.strftime("%Y-%m-%d"),
            "count": count,
        })
    return buckets


def recency_distribution(session: Session) -> dict[str, int]:
    rows = session.execute(
        select(Job.recency, func.count(Job.id))
        .where(Job.duplicate_of_id.is_(None)).group_by(Job.recency)
    ).all()
    return {recency or "unknown": count for recency, count in rows}


# --------------------------------------------------------------------------
def weekly_report(session: Session, days: int = 7, profile=None) -> dict:
    """Relatorio semanal completo, incluindo recomendacoes de perfil.

    `profile` e injetado explicitamente para que o relatorio seja testavel e
    nao dependa de estado global.
    """
    now = _naive_now()
    since = now - timedelta(days=days)

    found = session.scalars(
        select(Job).where(Job.discovered_at >= since, Job.duplicate_of_id.is_(None))
    ).all()
    relevant = [j for j in found if j.recommendation in {
        Recommendation.EXCELENTE.value, Recommendation.MUITO_BOA.value,
        Recommendation.BOA_AVALIAR.value,
    }]
    sent = session.scalars(
        select(Application).where(
            Application.applied_at.is_not(None), Application.applied_at >= since
        )
    ).all()
    interviews = session.scalars(
        select(Interview).where(Interview.created_at >= since)
    ).all()
    rejected = session.scalars(
        select(Application).where(
            Application.status == JobStatus.REJECTED.value, Application.applied_at >= since
        )
    ).all()

    tech_counter: Counter[str] = Counter()
    company_counter: Counter[str] = Counter()
    salaries: list[float] = []
    for job in found:
        tech_counter.update(job.technologies_list())
        if job.company:
            company_counter[job.company] += 1
        value = job.salary_max_brl_month or job.salary_min_brl_month
        if value:
            salaries.append(value)

    return {
        "period_days": days,
        "generated_at": now.strftime("%Y-%m-%d %H:%M"),
        "jobs_found": len(found),
        "jobs_relevant": len(relevant),
        "applications_sent": len(sent),
        "interviews": len(interviews),
        "rejections": len(rejected),
        "response_rate": _pct(_responded(session), len(sent)) if sent else 0.0,
        "top_technologies": tech_counter.most_common(12),
        "top_companies": company_counter.most_common(10),
        "salary_range": {
            "min": round(min(salaries), 2) if salaries else None,
            "max": round(max(salaries), 2) if salaries else None,
            "avg": round(sum(salaries) / len(salaries), 2) if salaries else None,
            "sample_size": len(salaries),
        },
        "profile_recommendations": profile_recommendations(found, profile),
    }


def profile_recommendations(jobs: list[Job], profile=None) -> list[str]:
    """O que estudar/ajustar, deduzido das lacunas reais das vagas vistas.

    Sem perfil configurado, degrada para uma recomendacao acionavel em vez
    de derrubar o relatorio.
    """
    if profile is None:
        from app.services.profile_service import current_profile
        try:
            profile = current_profile()
        except FileNotFoundError:
            return ["Configure config/profile.yaml (copie de profile.example.yaml) "
                    "para receber recomendacoes personalizadas."]

    mine = profile.known_technologies()

    gap_counter: Counter[str] = Counter()
    for job in jobs:
        for tech in job.technologies_list():
            if tech not in mine:
                gap_counter[tech] += 1

    recommendations: list[str] = []
    for tech, count in gap_counter.most_common(6):
        share = _pct(count, len(jobs)) if jobs else 0
        is_goal = tech in profile.growth_technologies()
        recommendations.append(
            f"'{tech}' aparece em {count} vaga(s) ({share}%) e nao esta no seu perfil."
            + (" Ja esta nos seus objetivos de carreira: priorize." if is_goal else "")
        )

    # Sinais estruturais, nao so de stack.
    unknown_dates = sum(1 for j in jobs if j.posted_at is None)
    if jobs and unknown_dates / len(jobs) > 0.4:
        recommendations.append(
            f"{unknown_dates} de {len(jobs)} vagas vieram sem data de publicacao. "
            f"Considere adicionar fontes ATS (Greenhouse/Lever), que informam a data real."
        )
    if not profile.experience.years_by_technology:
        recommendations.append(
            "Preencha 'experience.years_by_technology' em profile.yaml: sem isso o agente "
            "nao consegue responder 'quantos anos de X?' sem pedir sua confirmacao."
        )
    missing_english = not any(
        (lang.level or "").strip() for lang in profile.identity.languages
        if lang.language.lower().startswith(("ingl", "engl"))
    )
    if missing_english:
        recommendations.append(
            "Seu nivel de ingles nao esta declarado. Muitas vagas remotas perguntam isso."
        )
    return recommendations


def format_weekly_report(report: dict) -> str:
    """Versao texto do relatorio, para terminal e arquivo."""
    lines = [
        "=" * 66,
        f"  RELATORIO — ultimos {report['period_days']} dias",
        f"  Gerado em {report['generated_at']}",
        "=" * 66,
        "",
        f"Vagas encontradas ............ {report['jobs_found']}",
        f"Vagas relevantes ............. {report['jobs_relevant']}",
        f"Candidaturas enviadas ........ {report['applications_sent']}",
        f"Entrevistas .................. {report['interviews']}",
        f"Rejeicoes .................... {report['rejections']}",
        f"Taxa de resposta ............. {report['response_rate']}%",
        "",
        "-- Tecnologias mais exigidas " + "-" * 37,
    ]
    lines += [f"  {tech:<28} {count}" for tech, count in report["top_technologies"]] or ["  (sem dados)"]
    lines += ["", "-- Empresas mais frequentes " + "-" * 38]
    lines += [f"  {company:<28} {count}" for company, count in report["top_companies"]] or ["  (sem dados)"]

    salary = report["salary_range"]
    lines += ["", "-- Faixa salarial (BRL/mes, estimada) " + "-" * 28]
    if salary["sample_size"]:
        lines += [
            f"  minimo ..... {format_brl(salary['min'])}",
            f"  media ...... {format_brl(salary['avg'])}",
            f"  maximo ..... {format_brl(salary['max'])}",
            f"  amostra .... {salary['sample_size']} vaga(s) com salario informado",
        ]
    else:
        lines.append("  Nenhuma vaga do periodo informou salario.")

    lines += ["", "-- Recomendacoes para o seu perfil " + "-" * 31]
    lines += [f"  * {r}" for r in report["profile_recommendations"]] or ["  (nenhuma)"]
    lines += ["", "=" * 66]
    return "\n".join(lines)
