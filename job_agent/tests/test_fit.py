"""Fit score: deterministico, 0-100, e explicavel."""
from __future__ import annotations

import pytest

from app.crawler.normalize import normalize
from app.models.enums import Recommendation, Seniority
from app.ranking.fit import (
    RECENCY_MULTIPLIER, analyze, classify, score_compensation, score_experience,
    score_growth, score_job_level, score_modality, score_tech_stack,
)
from tests.conftest import make_raw


def norm(profile, **kwargs):
    return normalize(make_raw(**kwargs), profile)


# --- propriedades gerais ---------------------------------------------------
def test_score_is_bounded_and_deterministic(profile):
    job = norm(profile, description="Java, Spring Boot, PostgreSQL. 2+ years.")
    first = analyze(job, profile)
    second = analyze(job, profile)
    assert 0.0 <= first.score <= 100.0
    assert first.score == second.score
    assert first.breakdown.as_dict() == second.breakdown.as_dict()


def test_breakdown_respects_configured_weights(profile):
    job = norm(profile, description="Java, Spring Boot. 2 years of experience. Remote Brazil.")
    analysis = analyze(job, profile)
    weights = profile.scoring.weights
    breakdown = analysis.breakdown
    assert breakdown.experience_match <= weights.experience_match
    assert breakdown.tech_stack <= weights.tech_stack
    assert breakdown.job_level <= weights.job_level
    assert breakdown.modality_location <= weights.modality_location
    assert breakdown.seniority_required <= weights.seniority_required
    assert breakdown.growth_potential <= weights.growth_potential
    assert breakdown.compensation <= weights.compensation


def test_custom_weights_are_honoured(profile):
    """Zerar um peso deve zerar a contribuicao daquela dimensao."""
    profile.scoring.weights.tech_stack = 0
    job = norm(profile, description="Java and Spring Boot.")
    assert analyze(job, profile).breakdown.tech_stack == 0.0


# --- ranking relativo ------------------------------------------------------
def test_ideal_job_beats_senior_job(profile):
    ideal = norm(profile, title="Associate Backend Engineer",
                 description="Java, Spring Boot, Docker, PostgreSQL. 2+ years. Remote Brazil.",
                 location="Remote - Brazil", external_id="a", url="https://a.com/1")
    senior = norm(profile, title="Senior Staff Backend Engineer",
                  description="Java. 9+ years of experience required.",
                  location="Remote - Brazil", external_id="b", url="https://b.com/1")
    assert analyze(ideal, profile).score > analyze(senior, profile).score


def test_remote_beats_onsite(profile):
    remote = norm(profile, description="Java. Fully remote.", location="Remote - Brazil",
                  external_id="a", url="https://a.com/1")
    onsite = norm(profile, description="Java. Presencial em Curitiba.",
                  location="Presencial - Curitiba", external_id="b", url="https://b.com/1")
    assert analyze(remote, profile).score > analyze(onsite, profile).score


def test_fresh_posting_beats_stale_one(profile):
    fresh = norm(profile, posted_days_ago=2, external_id="a", url="https://a.com/1")
    stale = norm(profile, posted_days_ago=45, external_id="b", url="https://b.com/1")
    assert analyze(fresh, profile).score > analyze(stale, profile).score


def test_recency_acts_as_multiplier_not_dimension(profile):
    assert RECENCY_MULTIPLIER[profile.recency.bucket_for_unknown()] <= 1.0
    assert max(RECENCY_MULTIPLIER.values()) == 1.0


# --- dimensoes isoladas ----------------------------------------------------
def test_experience_full_credit_when_requirement_met(profile):
    job = norm(profile, description="2 years of experience with Java.")
    value, notes = score_experience(job, profile)
    assert value == 1.0
    assert notes


def test_experience_degrades_gradually_then_collapses(profile):
    values = []
    for years in (2, 3, 4, 5, 9):
        job = norm(profile, description=f"{years} years of experience required.")
        values.append(score_experience(job, profile)[0])
    assert values == sorted(values, reverse=True)
    assert values[0] == 1.0
    assert values[-1] < 0.15


def test_missing_requirement_count_is_neutral_not_punished(profile):
    """Vaga que nao diz quantos anos exige nao deve ser penalizada."""
    job = norm(profile, description="We value curiosity and collaboration.")
    assert score_experience(job, profile)[0] == pytest.approx(0.70)


def test_tech_stack_rewards_core_language_match(profile):
    java_job = norm(profile, description="Java and Spring Boot.")
    python_job = norm(profile, description="Python and Django with FastAPI.")
    assert score_tech_stack(java_job, profile)[0] > score_tech_stack(python_job, profile)[0]


def test_tech_stack_detail_separates_critical_from_nice_to_have(profile):
    job = norm(profile, description="Java required. Python required. Terraform is a plus.")
    _, detail = score_tech_stack(job, profile)
    assert "java" in detail["matched"]
    assert "python" in detail["critical_missing"]
    assert "terraform" in detail["nice_to_have_missing"]


def test_avoided_level_scores_near_zero(profile):
    staff = norm(profile, title="Staff Engineer")
    assert score_job_level(staff, profile)[0] == 0.0
    senior = norm(profile, title="Senior Engineer")
    assert score_job_level(senior, profile)[0] < 0.2


def test_target_level_scores_full(profile):
    job = norm(profile, title="Associate Software Engineer")
    assert score_job_level(job, profile)[0] == 1.0


def test_mid_level_is_accepted_when_configured(profile):
    """'mid-level' nao deve ser excluido: esta nos niveis desejados."""
    job = norm(profile, title="Mid-level Backend Engineer")
    assert job.seniority is Seniority.MID
    assert score_job_level(job, profile)[0] == 1.0


def test_region_exclusion_zeroes_modality(profile):
    job = norm(profile, description="Remote role. This position is US only.",
               location="Remote")
    assert score_modality(job, profile)[0] == 0.0


def test_growth_rewards_new_goal_technologies(profile):
    with_growth = norm(profile, description="Java, Spring Boot, Kafka, Kubernetes.")
    no_growth = norm(profile, description="Java and Liferay only.")
    assert score_growth(with_growth, profile)[0] > score_growth(no_growth, profile)[0]


def test_unknown_salary_is_neutral(profile):
    job = norm(profile, salary="")
    assert score_compensation(job, profile)[0] == pytest.approx(0.50)


def test_salary_below_minimum_is_penalised(profile):
    low = norm(profile, salary="R$ 4.000 por mes")
    good = norm(profile, salary="R$ 12.000 por mes")
    assert score_compensation(low, profile)[0] < score_compensation(good, profile)[0]


# --- classificacao ---------------------------------------------------------
@pytest.mark.parametrize("score,expected", [
    (100, Recommendation.EXCELENTE),
    (90, Recommendation.EXCELENTE),
    (89.9, Recommendation.MUITO_BOA),
    (80, Recommendation.MUITO_BOA),
    (79, Recommendation.BOA_AVALIAR),
    (70, Recommendation.BOA_AVALIAR),
    (69, Recommendation.STRETCH),
    (60, Recommendation.STRETCH),
    (59, Recommendation.NAO_PRIORITARIA),
    (0, Recommendation.NAO_PRIORITARIA),
])
def test_classification_thresholds(profile, score, expected):
    assert classify(score, profile) is expected


# --- explicacao ------------------------------------------------------------
def test_analysis_explains_every_required_aspect(profile):
    job = norm(profile,
               description="Java, Spring Boot, Kubernetes required. 3+ years. Remote Brazil.")
    analysis = analyze(job, profile)
    assert analysis.why_it_fits
    assert analysis.matched_requirements
    assert analysis.missing_requirements
    assert analysis.should_apply_reason
    assert isinstance(analysis.should_apply, bool)
    assert analysis.critical_missing is not None
    assert analysis.nice_to_have_missing is not None
    assert analysis.growth_opportunities


def test_stretch_jobs_are_surfaced_not_eliminated(profile):
    """Vaga que pede um pouco mais deve aparecer como stretch, nao desaparecer."""
    job = norm(profile,
               description="Java, Spring Boot. 4 years of experience. Remote Brazil.",
               location="Remote - Brazil")
    analysis = analyze(job, profile)
    assert analysis.is_stretch
    assert analysis.should_apply           # a decisao continua sendo do usuario
    assert "STRETCH_EXPERIENCIA" in analysis.filter_flags


def test_hard_rejected_job_is_not_recommended(profile):
    job = norm(profile, description="Java. This role is US only.", location="Remote")
    analysis = analyze(job, profile)
    assert not analysis.should_apply
    assert "NAO_ACEITA_BRASIL" in analysis.filter_flags
