"""Parsing de vagas: senioridade, modalidade, stack, anos e salario."""
from __future__ import annotations

import pytest

from app.crawler.extract import (
    accepts_brazil, detect_modality, detect_seniority, detect_technologies,
    extract_requirements, extract_years_required, is_backend_relevant,
    is_support_or_infra_only, normalize_text,
)
from app.crawler.normalize import normalize
from app.crawler.salary import parse_salary_to_brl_month
from app.models.enums import Modality, Seniority
from tests.conftest import make_raw


# --- senioridade -----------------------------------------------------------
@pytest.mark.parametrize("title,expected", [
    ("Senior Backend Engineer", Seniority.SENIOR),
    ("Sr. Java Developer", Seniority.SENIOR),
    ("Desenvolvedor Java Senior", Seniority.SENIOR),
    ("Staff Software Engineer", Seniority.STAFF),
    ("Principal Engineer", Seniority.PRINCIPAL),
    ("Tech Lead Backend", Seniority.LEAD),
    ("Engineering Manager", Seniority.MANAGER),
    ("Associate Software Engineer", Seniority.ASSOCIATE),
    ("Junior Backend Developer", Seniority.JUNIOR),
    ("Desenvolvedor Backend Pleno", Seniority.MID),
    ("Mid-level Java Engineer", Seniority.MID),
    ("Estagiario em Desenvolvimento", Seniority.INTERN),
    ("Backend Engineer", Seniority.UNKNOWN),
])
def test_seniority_from_title(title, expected):
    assert detect_seniority(title) is expected


def test_higher_seniority_wins_in_compound_titles():
    """'Senior Engineering Manager' e manager, nao senior."""
    assert detect_seniority("Senior Engineering Manager") is Seniority.MANAGER
    assert detect_seniority("Staff/Principal Engineer") is Seniority.PRINCIPAL


def test_title_takes_precedence_over_description():
    level = detect_seniority(
        "Junior Backend Developer",
        "You will work alongside our senior engineers and tech leads.",
    )
    assert level is Seniority.JUNIOR


# --- modalidade ------------------------------------------------------------
@pytest.mark.parametrize("text,expected", [
    ("Remote - Brazil", Modality.REMOTE),
    ("100% remoto", Modality.REMOTE),
    ("Home office", Modality.REMOTE),
    ("Hybrid - Sao Paulo", Modality.HYBRID),
    ("Trabalho hibrido", Modality.HYBRID),
    ("Presencial em Curitiba", Modality.ONSITE),
    ("On-site", Modality.ONSITE),
    ("Sao Paulo", Modality.UNKNOWN),
])
def test_modality_detection(text, expected):
    assert detect_modality(text) is expected


def test_hybrid_beats_remote_mention():
    """Anuncio hibrido que menciona 'remote' nao deve passar como remoto."""
    assert detect_modality("Hybrid role with 2 remote days per week") is Modality.HYBRID


# --- regiao ----------------------------------------------------------------
def test_brazil_acceptance():
    assert accepts_brazil("Remote - Brazil") is True
    assert accepts_brazil("LATAM") is True
    assert accepts_brazil("Worldwide") is True
    assert accepts_brazil("Remote", "This role is US only.") is False
    assert accepts_brazil("Remote", "Must reside in the United States.") is False
    assert accepts_brazil("") is None


# --- tecnologias -----------------------------------------------------------
def test_technologies_are_canonical_and_deduplicated():
    techs = detect_technologies(
        "Java 17 with Spring Boot, springboot, PostgreSQL, Postgres, k8s and Kafka"
    )
    assert "java" in techs
    assert "spring boot" in techs
    assert "postgresql" in techs
    assert "kubernetes" in techs
    assert "kafka" in techs
    assert len(techs) == len(set(techs))


def test_no_false_positives_from_substrings():
    """'javascript' nao deve virar 'java'; 'going' nao deve virar 'go'."""
    techs = detect_technologies("We are going to use javascript on the frontend")
    assert "java" not in techs
    assert "go" not in techs
    assert "javascript" in techs


def test_symbol_technologies_are_detected():
    techs = detect_technologies("Experience with C#, .NET, CI/CD and Node.js")
    assert "c#" in techs
    assert "ci/cd" in techs
    assert "node.js" in techs


def test_portuguese_synonyms_are_detected():
    techs = detect_technologies(
        "Experiencia com microsservicos, mensageria, testes automatizados e observabilidade"
    )
    for expected in ("microservices", "messaging", "automated testing", "observability"):
        assert expected in techs


# --- anos exigidos ---------------------------------------------------------
@pytest.mark.parametrize("text,expected", [
    ("3+ years of experience with Java", 3.0),
    ("At least 5 years of experience", 5.0),
    ("Minimo de 4 anos de experiencia", 4.0),
    ("2 to 4 years of experience", 2.0),
    ("Pelo menos 6 anos de experiencia", 6.0),
    ("We value curiosity", None),
])
def test_years_required(text, expected):
    assert extract_years_required(text) == expected


def test_years_required_takes_the_lowest_entry_bar():
    """Com varios requisitos, o piso de entrada e o que importa."""
    text = "3+ years with Java. 5+ years with distributed systems. 8+ years total."
    assert extract_years_required(text) == 3.0


def test_implausible_year_values_are_rejected():
    assert extract_years_required("Founded in 1998, 2024 anos de historia") is None


# --- requisitos ------------------------------------------------------------
def test_requirements_extracted_from_html_bullets():
    html = ("<h3>Requirements</h3><ul>"
            "<li>Strong experience with Java and Spring Boot</li>"
            "<li>Knowledge of relational databases such as PostgreSQL</li>"
            "<li>x</li></ul>")
    requirements = extract_requirements(html)
    assert len(requirements) == 2      # 'x' e curto demais
    assert "Java" in requirements[0]
    assert "<li>" not in " ".join(requirements)


# --- salario ---------------------------------------------------------------
def test_salary_brl_monthly():
    lo, _ = parse_salary_to_brl_month("R$ 9.000,00 por mes")
    assert lo == pytest.approx(9000.0)


def test_salary_usd_yearly_converted_to_brl_month():
    lo, hi = parse_salary_to_brl_month("USD 60,000 - 80,000 per year")
    assert lo == pytest.approx(60000 / 12 * 5.4, rel=0.01)
    assert hi == pytest.approx(80000 / 12 * 5.4, rel=0.01)


def test_salary_without_currency_is_unknown_not_guessed():
    """Sem moeda nao ha conversao honesta: retorna desconhecido."""
    assert parse_salary_to_brl_month("9000 - 12000") == (None, None)
    assert parse_salary_to_brl_month("") == (None, None)
    assert parse_salary_to_brl_month("Competitive salary") == (None, None)


# --- escopo tecnico --------------------------------------------------------
def test_backend_relevance():
    assert is_backend_relevant("Backend Engineer", "Java, Spring", ["java", "spring"])
    assert not is_backend_relevant("UI Designer", "Figma and visual design", [])


def test_support_only_role_is_flagged():
    assert is_support_or_infra_only(
        "Analista de Suporte Tecnico", "Atendimento a usuarios e abertura de tickets.", []
    )
    assert not is_support_or_infra_only(
        "Backend Engineer", "Develop Java APIs", ["java", "rest api"]
    )


# --- normalizacao completa -------------------------------------------------
def test_normalize_produces_complete_record(profile):
    raw = make_raw(
        title="Backend Engineer (Java)",
        description="We need 3+ years with Java, Spring Boot and PostgreSQL. Remote.",
        location="Remote - Brazil",
        salary="R$ 10.000 por mes",
        posted_days_ago=5,
    )
    job = normalize(raw, profile)

    assert job.modality is Modality.REMOTE
    assert job.accepts_brazil is True
    assert job.years_required == 3.0
    assert "java" in job.technologies
    assert job.recency_days == 5
    assert job.posted_at_display != "desconhecida"
    assert job.dedupe_key
    assert job.canonical_url
    assert job.salary_min_brl_month == pytest.approx(10000.0)


def test_normalize_keeps_unknown_date_as_none(profile):
    """A data de descoberta nunca substitui a de publicacao."""
    job = normalize(make_raw(posted_days_ago=None), profile)
    assert job.posted_at is None
    assert job.posted_at_display == "desconhecida"
    assert job.recency_days is None
    assert job.discovered_at is not None


def test_normalize_text_strips_html_and_accents():
    assert normalize_text("<p>Experiência   com Java</p>") == "experiencia com java"
