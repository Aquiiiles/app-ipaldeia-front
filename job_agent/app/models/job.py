"""Vaga normalizada — a forma canonica em que toda fonte e convertida."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from app.models.enums import Modality, Recency, Recommendation, Seniority


@dataclass
class RawJob:
    """Vaga como veio da fonte, ainda sem interpretacao."""
    source: str
    external_id: str
    title: str
    company: str
    url: str
    description: str = ""
    location_raw: str = ""
    salary_raw: str = ""
    posted_at: datetime | None = None
    updated_at: datetime | None = None
    tags: list[str] = field(default_factory=list)
    extra: dict = field(default_factory=dict)


@dataclass
class NormalizedJob:
    """Vaga interpretada: nivel, modalidade, stack e recencia resolvidos.

    `posted_at is None` significa literalmente "data desconhecida".
    Nunca preenchemos com a data de descoberta para fingir recencia.
    """
    source: str
    external_id: str
    title: str
    company: str
    url: str
    description: str = ""
    location: str = ""
    modality: Modality = Modality.UNKNOWN
    seniority: Seniority = Seniority.UNKNOWN
    technologies: list[str] = field(default_factory=list)
    requirements: list[str] = field(default_factory=list)
    salary_raw: str = ""
    salary_min_brl_month: float | None = None
    salary_max_brl_month: float | None = None
    years_required: float | None = None
    posted_at: datetime | None = None
    updated_at: datetime | None = None
    discovered_at: datetime | None = None
    recency: Recency = Recency.UNKNOWN
    recency_days: int | None = None
    accepts_brazil: bool | None = None
    dedupe_key: str = ""
    canonical_url: str = ""

    @property
    def posted_at_display(self) -> str:
        return self.posted_at.strftime("%Y-%m-%d") if self.posted_at else "desconhecida"


@dataclass
class ScoreBreakdown:
    """Score por dimensao + explicacao textual. Totalmente deterministico."""
    experience_match: float = 0.0
    tech_stack: float = 0.0
    job_level: float = 0.0
    modality_location: float = 0.0
    seniority_required: float = 0.0
    growth_potential: float = 0.0
    compensation: float = 0.0

    def total(self) -> float:
        return round(
            self.experience_match + self.tech_stack + self.job_level
            + self.modality_location + self.seniority_required
            + self.growth_potential + self.compensation,
            2,
        )

    def as_dict(self) -> dict[str, float]:
        return {
            "experience_match": self.experience_match,
            "tech_stack": self.tech_stack,
            "job_level": self.job_level,
            "modality_location": self.modality_location,
            "seniority_required": self.seniority_required,
            "growth_potential": self.growth_potential,
            "compensation": self.compensation,
        }


@dataclass
class FitAnalysis:
    """Resultado completo da avaliacao de uma vaga."""
    score: float
    recommendation: Recommendation
    breakdown: ScoreBreakdown
    matched_requirements: list[str] = field(default_factory=list)
    missing_requirements: list[str] = field(default_factory=list)
    critical_missing: list[str] = field(default_factory=list)
    nice_to_have_missing: list[str] = field(default_factory=list)
    growth_opportunities: list[str] = field(default_factory=list)
    why_it_fits: list[str] = field(default_factory=list)
    concerns: list[str] = field(default_factory=list)
    should_apply: bool = False
    should_apply_reason: str = ""
    filter_flags: list[str] = field(default_factory=list)
    is_stretch: bool = False
