"""Perfil do candidato: carregado de config/profile.yaml.

Este objeto e a base factual de TODA geracao de texto. O guard de
anti-invencao (app/llm/guard.py) valida qualquer afirmacao contra ele.
"""
from __future__ import annotations

from pathlib import Path

import yaml
from pydantic import BaseModel, Field

from app.models.enums import Recency


class Language(BaseModel):
    language: str
    level: str = ""


class Identity(BaseModel):
    full_name: str = ""
    email: str = ""
    phone: str = ""
    linkedin: str = ""
    github: str = ""
    location: str = ""
    timezone: str = ""
    work_authorization: str = ""
    languages: list[Language] = Field(default_factory=list)


class Current(BaseModel):
    title: str = ""
    company: str = ""
    salary_brl_month: float | None = None
    currency: str = "BRL"


class Experience(BaseModel):
    total_years: float = 0.0
    years_by_technology: dict[str, float] = Field(default_factory=dict)
    technologies: list[str] = Field(default_factory=list)
    highlights: list[str] = Field(default_factory=list)


class Preferences(BaseModel):
    area: str = ""
    target_levels: list[str] = Field(default_factory=lambda: ["junior", "associate", "mid"])
    avoid_levels: list[str] = Field(
        default_factory=lambda: ["senior", "staff", "principal", "lead", "tech lead", "manager", "director"]
    )
    remote_only: bool = True
    accepted_modalities: list[str] = Field(default_factory=lambda: ["remote"])
    accepted_regions: list[str] = Field(default_factory=lambda: ["brazil", "latam", "remote", "worldwide"])
    languages_for_jobs: list[str] = Field(default_factory=lambda: ["pt", "en"])
    target_salary_brl_month: float | None = None
    minimum_salary_brl_month: float | None = None
    desired_titles: list[str] = Field(default_factory=list)


class CareerGoals(BaseModel):
    narrative: str = ""
    growth_technologies: list[str] = Field(default_factory=list)


class RecencyConfig(BaseModel):
    excellent_max_days: int = 7
    good_max_days: int = 14
    acceptable_max_days: int = 30
    deprioritize_after_days: int = 30
    ignore_after_days: int = 60
    unknown_treated_as: str = "acceptable"

    def bucket_for_unknown(self) -> Recency:
        try:
            return Recency(self.unknown_treated_as)
        except ValueError:
            return Recency.ACCEPTABLE


class ScoringWeights(BaseModel):
    experience_match: float = 25
    tech_stack: float = 25
    job_level: float = 20
    modality_location: float = 10
    seniority_required: float = 10
    growth_potential: float = 5
    compensation: float = 5

    def total(self) -> float:
        return (
            self.experience_match + self.tech_stack + self.job_level
            + self.modality_location + self.seniority_required
            + self.growth_potential + self.compensation
        )


class ScoringThresholds(BaseModel):
    excellent: int = 90
    very_good: int = 80
    good: int = 70
    stretch: int = 60


class ScoringConfig(BaseModel):
    weights: ScoringWeights = Field(default_factory=ScoringWeights)
    thresholds: ScoringThresholds = Field(default_factory=ScoringThresholds)
    stretch_years_tolerance: float = 3.0
    hard_reject_below: int = 25


class ResumeFacts(BaseModel):
    """Fatos extraidos do CV. Complementa (nunca sobrescreve) o YAML."""
    source_file: str = ""
    raw_text: str = ""
    technologies: list[str] = Field(default_factory=list)
    education: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    achievements: list[str] = Field(default_factory=list)
    experience_entries: list[str] = Field(default_factory=list)


class Profile(BaseModel):
    identity: Identity = Field(default_factory=Identity)
    current: Current = Field(default_factory=Current)
    experience: Experience = Field(default_factory=Experience)
    education: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    projects: list[str] = Field(default_factory=list)
    preferences: Preferences = Field(default_factory=Preferences)
    career_goals: CareerGoals = Field(default_factory=CareerGoals)
    recency: RecencyConfig = Field(default_factory=RecencyConfig)
    scoring: ScoringConfig = Field(default_factory=ScoringConfig)
    resume: ResumeFacts | None = None

    # -- helpers factuais -------------------------------------------------
    def known_technologies(self) -> set[str]:
        """Uniao das tecnologias declaradas no YAML e extraidas do CV."""
        techs = {t.strip().lower() for t in self.experience.technologies if t.strip()}
        techs |= {t.strip().lower() for t in self.experience.years_by_technology}
        if self.resume:
            techs |= {t.strip().lower() for t in self.resume.technologies if t.strip()}
        return techs

    def growth_technologies(self) -> set[str]:
        return {t.strip().lower() for t in self.career_goals.growth_technologies if t.strip()}

    def years_for(self, technology: str) -> float | None:
        """Anos de experiencia numa tecnologia, ou None se nao declarado.

        None significa "nao sei" — e obriga confirmacao humana, nunca um chute.
        """
        return self.experience.years_by_technology.get(technology.strip().lower())

    def fact_corpus(self) -> str:
        """Todo o texto factual conhecido. Usado pelo guard anti-invencao."""
        parts: list[str] = [
            self.identity.full_name, self.identity.location, self.identity.work_authorization,
            self.current.title, self.current.company, self.preferences.area,
            self.career_goals.narrative,
            *(f"{lang.language} {lang.level}" for lang in self.identity.languages),
            *self.experience.technologies,
            *self.experience.years_by_technology.keys(),
            *self.experience.highlights,
            *self.education, *self.certifications, *self.projects,
        ]
        if self.resume:
            parts.extend([
                self.resume.raw_text, *self.resume.technologies, *self.resume.education,
                *self.resume.certifications, *self.resume.projects,
                *self.resume.achievements, *self.resume.experience_entries,
            ])
        return "\n".join(p for p in parts if p)


def load_profile(path: str | Path) -> Profile:
    """Carrega o perfil do YAML. Erro claro se o arquivo nao existir."""
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(
            f"Perfil nao encontrado em {p}.\n"
            "Copie config/profile.example.yaml para config/profile.yaml e edite."
        )
    data = yaml.safe_load(p.read_text(encoding="utf-8")) or {}
    return Profile.model_validate(data)
