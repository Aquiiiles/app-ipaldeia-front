"""Fixtures compartilhadas."""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import pytest

# Ambiente de teste isolado, definido ANTES de importar app.settings.
os.environ.setdefault("DRY_RUN", "true")
os.environ.setdefault("LLM_PROVIDER", "none")
os.environ.setdefault("ANTHROPIC_API_KEY", "")
os.environ.setdefault("OPENAI_API_KEY", "")

from app.models.job import RawJob  # noqa: E402
from app.models.profile import Profile  # noqa: E402


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def days_ago(days: float) -> datetime:
    return utcnow() - timedelta(days=days)


PROFILE_DATA = {
    "identity": {
        "full_name": "Aquiles Teste",
        "email": "teste@exemplo.com",
        "location": "Brasil",
        "work_authorization": "Brasil (CLT/PJ)",
        "languages": [
            {"language": "Portugues", "level": "Nativo"},
            {"language": "Ingles", "level": "Intermediario"},
        ],
    },
    "current": {
        "title": "Associate Software Engineer",
        "company": "Liferay",
        "salary_brl_month": 5000,
    },
    "experience": {
        "total_years": 2.0,
        "years_by_technology": {
            "java": 2.0, "liferay": 2.0, "gradle": 2.0,
            "docker": 1.5, "elasticsearch": 1.5, "sql": 1.5,
        },
        "technologies": [
            "java", "liferay", "gradle", "docker", "elasticsearch",
            "sql", "git", "debugging", "migrations",
        ],
        "highlights": [
            "Upgrades e migracoes de versao em sistemas grandes e codigo legado.",
            "Investigacao de problemas de indexacao com Elasticsearch.",
        ],
    },
    "preferences": {
        "target_levels": ["associate", "junior", "mid"],
        "avoid_levels": ["senior", "staff", "principal", "lead", "tech lead", "manager"],
        "remote_only": True,
        "accepted_modalities": ["remote"],
        "accepted_regions": ["brazil", "latam", "remote", "worldwide"],
        "target_salary_brl_month": 8000,
        "minimum_salary_brl_month": 6000,
        "desired_titles": ["backend engineer", "java developer"],
    },
    "career_goals": {
        "narrative": "Sair da especializacao em Liferay para backend amplo.",
        "growth_technologies": [
            "spring", "spring boot", "postgresql", "kubernetes", "aws",
            "kafka", "microservices", "redis", "observability",
        ],
    },
    "recency": {
        "excellent_max_days": 7, "good_max_days": 14, "acceptable_max_days": 30,
        "deprioritize_after_days": 30, "ignore_after_days": 60,
        "unknown_treated_as": "acceptable",
    },
}


@pytest.fixture
def profile() -> Profile:
    return Profile.model_validate(PROFILE_DATA)


@pytest.fixture
def db_session(tmp_path):
    """Banco SQLite isolado por teste."""
    from app.database.db import init_db, reset_engine, session_scope

    reset_engine()
    url = f"sqlite:///{tmp_path / 'test.db'}"
    os.environ["DATABASE_URL"] = url

    from app.settings import get_settings
    get_settings.cache_clear()
    init_db()

    with session_scope() as session:
        yield session

    reset_engine()
    os.environ.pop("DATABASE_URL", None)
    get_settings.cache_clear()


def make_raw(
    title: str = "Backend Engineer",
    company: str = "Acme",
    url: str = "https://acme.com/jobs/1",
    description: str = "We need Java and Spring Boot. 2+ years of experience.",
    location: str = "Remote - Brazil",
    salary: str = "",
    posted_days_ago: float | None = 3,
    source: str = "test",
    external_id: str | None = None,
    tags: list[str] | None = None,
) -> RawJob:
    """Vaga bruta para testes. `posted_days_ago=None` => data desconhecida."""
    return RawJob(
        source=source,
        external_id=external_id or url,
        title=title,
        company=company,
        url=url,
        description=description,
        location_raw=location,
        salary_raw=salary,
        posted_at=days_ago(posted_days_ago) if posted_days_ago is not None else None,
        tags=tags or [],
    )
