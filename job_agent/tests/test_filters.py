"""Filtros: sinalizam em vez de apagar; poucos causam descarte real."""
from __future__ import annotations

from app.crawler.normalize import normalize
from app.ranking.filters import HARD_FLAGS, apply_filters, looks_closed
from tests.conftest import make_raw


def norm(profile, **kwargs):
    return normalize(make_raw(**kwargs), profile)


# --- filtros duros ---------------------------------------------------------
def test_expired_recency_is_a_hard_reject(profile):
    result = apply_filters(norm(profile, posted_days_ago=200), profile)
    assert result.hard_rejected
    assert "RECENCIA_EXPIRADA" in result.flags
    assert result.reasons["RECENCIA_EXPIRADA"]


def test_closed_posting_is_a_hard_reject(profile):
    result = apply_filters(
        norm(profile, description="This job is closed. We are no longer accepting applications."),
        profile,
    )
    assert result.hard_rejected
    assert "VAGA_ENCERRADA" in result.flags


def test_region_exclusion_is_a_hard_reject(profile):
    result = apply_filters(
        norm(profile, description="Great Java role. US only, must reside in the United States.",
             location="Remote"),
        profile,
    )
    assert result.hard_rejected
    assert "NAO_ACEITA_BRASIL" in result.flags


def test_hard_flag_set_is_deliberately_small(profile):
    """Poucos motivos apagam uma vaga; o resto e prioridade reduzida."""
    assert HARD_FLAGS == {"RECENCIA_EXPIRADA", "VAGA_ENCERRADA", "NAO_ACEITA_BRASIL"}


# --- filtros suaves --------------------------------------------------------
def test_senior_role_is_flagged_but_not_discarded(profile):
    result = apply_filters(norm(profile, title="Senior Backend Engineer"), profile)
    assert "SENIORIDADE_ACIMA" in result.flags
    assert not result.hard_rejected


def test_tech_lead_and_manager_are_flagged(profile):
    for title in ("Tech Lead Backend", "Engineering Manager", "Staff Engineer",
                  "Principal Engineer"):
        result = apply_filters(norm(profile, title=title), profile)
        assert "SENIORIDADE_ACIMA" in result.flags, title
        assert not result.hard_rejected, title


def test_far_excess_experience_is_flagged_not_discarded(profile):
    result = apply_filters(
        norm(profile, description="Java role. 10+ years of experience required."), profile
    )
    assert "EXPERIENCIA_MUITO_ACIMA" in result.flags
    assert not result.hard_rejected


def test_slight_excess_experience_becomes_stretch(profile):
    result = apply_filters(
        norm(profile, description="Java role. 4 years of experience required."), profile
    )
    assert "STRETCH_EXPERIENCIA" in result.flags
    assert "EXPERIENCIA_MUITO_ACIMA" not in result.flags


def test_onsite_is_flagged_when_remote_preferred(profile):
    result = apply_filters(
        norm(profile, description="Presencial em Sao Paulo.", location="Presencial - SP"), profile
    )
    assert "PRESENCIAL" in result.flags
    assert not result.hard_rejected


def test_hybrid_is_flagged_when_only_remote_accepted(profile):
    result = apply_filters(
        norm(profile, description="Hybrid, 3 days in office.", location="Hybrid - SP"), profile
    )
    assert "HIBRIDA" in result.flags


def test_hybrid_is_not_flagged_when_accepted(profile):
    profile.preferences.accepted_modalities = ["remote", "hybrid"]
    result = apply_filters(
        norm(profile, description="Hybrid role.", location="Hybrid - SP"), profile
    )
    assert "HIBRIDA" not in result.flags


def test_frontend_only_role_is_flagged(profile):
    result = apply_filters(
        norm(profile, title="UI Designer",
             description="Figma, visual design, brand identity work.",
             location="Remote - Brazil"),
        profile,
    )
    assert "SEM_BACKEND_RELEVANTE" in result.flags


def test_support_only_role_is_flagged(profile):
    result = apply_filters(
        norm(profile, title="Analista de Suporte Tecnico",
             description="Atendimento a usuarios, abertura e triagem de tickets.",
             location="Remote - Brazil"),
        profile,
    )
    assert "SUPORTE_INFRA_SEM_DEV" in result.flags


def test_mid_level_alone_is_not_flagged_as_too_senior(profile):
    """'mid-level' com requisitos razoaveis nao deve ser excluido."""
    result = apply_filters(
        norm(profile, title="Mid-level Backend Engineer",
             description="Java, Spring Boot. 2+ years. Remote Brazil.",
             location="Remote - Brazil"),
        profile,
    )
    assert "SENIORIDADE_ACIMA" not in result.flags
    assert not result.hard_rejected


# --- dados incertos --------------------------------------------------------
def test_unknown_date_is_flagged_for_your_attention(profile):
    result = apply_filters(norm(profile, posted_days_ago=None), profile)
    assert "DATA_DESCONHECIDA" in result.flags
    assert not result.hard_rejected


def test_unknown_region_is_flagged_not_rejected(profile):
    result = apply_filters(
        norm(profile, description="Java backend role.", location="Remote"), profile
    )
    assert "REGIAO_DESCONHECIDA" in result.flags
    assert not result.hard_rejected


def test_every_flag_carries_a_human_readable_reason(profile):
    result = apply_filters(
        norm(profile, title="Senior Engineer", posted_days_ago=None,
             description="10+ years required. Presencial.", location="Presencial - SP"),
        profile,
    )
    assert result.flags
    for flag in result.flags:
        assert result.reasons.get(flag), f"flag {flag} sem motivo"


def test_closed_detection_covers_pt_and_en():
    from app.models.job import NormalizedJob
    for text in ("Vaga encerrada", "candidaturas encerradas",
                 "no longer accepting applications", "This job is closed"):
        job = NormalizedJob(source="t", external_id="1", title="X", company="Y",
                            url="u", description=text)
        assert looks_closed(job), text
