"""RawJob -> NormalizedJob. Ponto unico onde a interpretacao acontece."""
from __future__ import annotations

from app.crawler import dedupe, recency, salary
from app.crawler.extract import (
    accepts_brazil, detect_modality, detect_seniority, detect_technologies,
    extract_requirements, extract_years_required, normalize_text,
)
from app.models.job import NormalizedJob, RawJob
from app.models.profile import Profile


def normalize(raw: RawJob, profile: Profile, now=None) -> NormalizedJob:
    """Converte uma vaga bruta na forma canonica, sem inventar dados."""
    description = raw.description or ""
    tag_text = " ".join(raw.tags or [])

    technologies = detect_technologies(raw.title, description, tag_text)
    bucket, days = recency.classify(
        raw.posted_at, profile.recency, updated_at=raw.updated_at, now=now
    )
    sal_min, sal_max = salary.parse_salary_to_brl_month(raw.salary_raw)

    job = NormalizedJob(
        source=raw.source,
        external_id=raw.external_id,
        title=(raw.title or "").strip(),
        company=(raw.company or "").strip(),
        url=(raw.url or "").strip(),
        description=description,
        location=(raw.location_raw or "").strip(),
        modality=detect_modality(raw.location_raw, raw.title, description, tag_text),
        seniority=detect_seniority(raw.title, description),
        technologies=technologies,
        requirements=extract_requirements(description),
        salary_raw=(raw.salary_raw or "").strip(),
        salary_min_brl_month=sal_min,
        salary_max_brl_month=sal_max,
        years_required=extract_years_required(description),
        posted_at=raw.posted_at,
        updated_at=raw.updated_at,
        discovered_at=recency.utcnow() if now is None else now,
        recency=bucket,
        recency_days=days,
        accepts_brazil=accepts_brazil(raw.location_raw, description),
    )
    job.canonical_url = dedupe.canonical_url(job.url)
    job.dedupe_key = dedupe.dedupe_key(job.company, job.title)
    return job


def matches_language_preference(job: NormalizedJob, profile: Profile) -> bool:
    """Heuristica leve de idioma: pt/en cobrem o caso do usuario."""
    allowed = {code.lower() for code in profile.preferences.languages_for_jobs}
    if not allowed or {"pt", "en"} <= allowed:
        return True
    blob = normalize_text(f"{job.title} {job.description}")[:2000]
    pt_markers = [" e ", " de ", " para ", " com ", " voce ", " nossa ", " experiencia "]
    looks_pt = sum(m in blob for m in pt_markers) >= 3
    return ("pt" in allowed) if looks_pt else ("en" in allowed)
