"""Protecao contra informacao inventada.

Estes sao os testes mais importantes do projeto: garantem que o agente
nunca afirme algo que nao esteja no perfil ou no CV.
"""
from __future__ import annotations

import pytest

from app.applications.cover_letter import (
    template_cover_letter, template_recruiter_message,
)
from app.applications.questions import answer_question
from app.applications.resume_tailor import suggest_tailoring
from app.crawler.normalize import normalize
from app.database import repository as repo
from app.llm import guard
from app.ranking.fit import analyze
from tests.conftest import make_raw


def store_job(session, profile, **kwargs):
    job = normalize(make_raw(**kwargs), profile)
    row, _ = repo.upsert_job(session, job, analyze(job, profile))
    return row


# ==========================================================================
#  GUARD: tecnologias
# ==========================================================================
def test_claiming_an_unknown_technology_is_blocked(profile):
    result = guard.check_text("Tenho 3 anos de experiencia com Kubernetes.", profile)
    assert not result.ok
    kinds = {v.kind for v in result.violations}
    assert "TECNOLOGIA_NAO_COMPROVADA" in kinds or "ANOS_DIVERGENTES" in kinds


def test_claiming_a_known_technology_passes(profile):
    result = guard.check_text(
        "Trabalho com Java e Elasticsearch no meu dia a dia.", profile
    )
    assert result.ok, result.summary()


def test_mentioning_a_technology_without_claiming_it_passes(profile):
    """Citar a stack da vaga nao e afirmar que voce a domina."""
    result = guard.check_text(
        "A vaga menciona Kubernetes e Kafka, tecnologias que pretendo aprender.", profile
    )
    assert result.ok, result.summary()


def test_english_first_person_claims_are_checked(profile):
    result = guard.check_text("I have extensive experience with Kubernetes.", profile)
    assert not result.ok


# ==========================================================================
#  GUARD: numeros de anos
# ==========================================================================
def test_inflated_total_years_is_blocked(profile):
    result = guard.check_text("Tenho 8 anos de experiencia em desenvolvimento.", profile)
    assert not result.ok
    assert any(v.kind == "ANOS_DIVERGENTES" for v in result.violations)


def test_correct_total_years_passes(profile):
    result = guard.check_text("Tenho 2 anos de experiencia profissional.", profile)
    assert result.ok, result.summary()


def test_inflated_per_technology_years_is_blocked(profile):
    """Perfil declara 2 anos de Java; afirmar 6 deve ser bloqueado."""
    result = guard.check_text("Possuo 6 anos de experiencia com Java.", profile)
    assert not result.ok
    assert any(v.kind == "ANOS_DIVERGENTES" for v in result.violations)


def test_undeclared_technology_years_raises_a_warning(profile):
    result = guard.check_text("Tenho 3 anos de experiencia com Redis.", profile)
    assert not result.ok or result.warnings


# ==========================================================================
#  GUARD: credenciais e cargos
# ==========================================================================
def test_invented_certification_is_blocked(profile):
    result = guard.check_text("Sou AWS Certified Solutions Architect.", profile)
    assert not result.ok
    assert any(v.kind == "CREDENCIAL_NAO_COMPROVADA" for v in result.violations)


def test_invented_degree_is_blocked(profile):
    result = guard.check_text("Concluí meu mestrado em Ciencia da Computacao.", profile)
    assert not result.ok


def test_invented_seniority_title_is_warned(profile):
    result = guard.check_text("Atuo como Tech Lead da equipe.", profile)
    assert result.warnings or not result.ok


def test_overclaiming_language_is_warned(profile):
    result = guard.check_text("Sou especialista em Java com dominio total da JVM.", profile)
    assert result.warnings
    assert any(v.kind == "EXAGERO" for v in result.warnings)


# ==========================================================================
#  GUARD: contrato
# ==========================================================================
def test_empty_text_is_trivially_ok(profile):
    assert guard.check_text("", profile).ok
    assert guard.check_text("   ", profile).ok


def test_assert_grounded_raises_on_violation(profile):
    with pytest.raises(ValueError) as exc:
        guard.assert_grounded("Tenho 10 anos de experiencia com Kubernetes.", profile)
    assert "bloqueado" in str(exc.value).lower()


def test_assert_grounded_returns_clean_text(profile):
    text = "Trabalho com Java e Docker."
    assert guard.assert_grounded(text, profile) == text


def test_guard_summary_is_actionable(profile):
    result = guard.check_text("Sou AWS Certified e tenho 9 anos de Kubernetes.", profile)
    summary = result.summary()
    assert "BLOQUEIO" in summary
    assert len(summary) > 30


def test_non_strict_mode_downgrades_tech_claims_to_warnings(profile):
    result = guard.check_text("Trabalhei com Kubernetes.", profile, strict=False)
    assert result.ok
    assert result.warnings


# ==========================================================================
#  TEXTOS GERADOS: os templates nunca inventam
# ==========================================================================
def test_template_cover_letter_passes_its_own_guard(db_session, profile):
    job = store_job(db_session, profile,
                    description="Java, Spring Boot, Kubernetes, Kafka, AWS required.")
    letter = template_cover_letter(job, profile)
    result = guard.check_text(letter, profile)
    assert result.ok, result.summary()


def test_template_cover_letter_omits_technologies_you_lack(db_session, profile):
    job = store_job(db_session, profile,
                    description="We need Kubernetes, Kafka, Terraform and Go.")
    letter = template_cover_letter(job, profile).lower()
    # Podem aparecer como "quero aprender", nunca como experiencia possuida.
    assert "trabalho diretamente com kubernetes" not in letter
    assert "experiencia com go" not in letter


def test_template_recruiter_message_passes_guard(db_session, profile):
    job = store_job(db_session, profile, description="Java and Terraform. 5+ years.")
    message = template_recruiter_message(job, profile)
    assert guard.check_text(message, profile).ok


def test_english_template_also_passes_guard(db_session, profile):
    job = store_job(db_session, profile, description="Java, Spring Boot, Kubernetes.")
    letter = template_cover_letter(job, profile, language="en")
    assert guard.check_text(letter, profile).ok


# ==========================================================================
#  TAILORING: sugere, nunca fabrica
# ==========================================================================
def test_tailoring_marks_missing_tech_as_do_not_add(db_session, profile):
    job = store_job(db_session, profile,
                    description="Java plus Kubernetes and Terraform required.")
    tailoring = suggest_tailoring(job, profile)
    gaps = [s for s in tailoring.suggestions if s.kind == "LACUNA"]
    assert gaps
    assert "kubernetes" in tailoring.gaps or "terraform" in tailoring.gaps
    assert any(("nao invente" in s.message.lower() or "nao listar" in s.message.lower()
                or "informacao falsa" in s.message.lower()) for s in gaps)


def test_tailoring_only_highlights_facts_with_evidence(db_session, profile):
    job = store_job(db_session, profile, description="Java and Elasticsearch.")
    tailoring = suggest_tailoring(job, profile)
    corpus = profile.fact_corpus()
    for highlight in tailoring.highlights:
        assert highlight in corpus


def test_tailoring_suggests_highlighting_a_matching_technology(db_session, profile):
    job = store_job(db_session, profile,
                    description="Elasticsearch reindexing experience needed.")
    tailoring = suggest_tailoring(job, profile)
    messages = " ".join(s.message.lower() for s in tailoring.suggestions)
    assert "elasticsearch" in messages
    assert "destacar" in messages


# ==========================================================================
#  PERGUNTAS: sem base factual => confirmacao humana
# ==========================================================================
def test_declared_technology_years_answered_with_high_confidence(profile):
    answer = answer_question(
        "How many years of experience do you have with Java?", profile
    )
    assert answer.suggested_answer == "2"
    assert answer.confidence == "high"
    assert not answer.needs_confirmation
    assert "years_by_technology" in answer.source_of_truth


def test_undeclared_technology_years_requires_confirmation(profile):
    answer = answer_question(
        "How many years of experience do you have with Kubernetes?", profile
    )
    assert answer.suggested_answer == ""
    assert answer.needs_confirmation
    assert "nao vou chutar" in answer.reason.lower()


def test_ambiguous_multi_technology_question_requires_confirmation(profile):
    answer = answer_question(
        "How many years of experience with Java and Kubernetes?", profile
    )
    assert answer.needs_confirmation


@pytest.mark.parametrize("question", [
    "What is your salary expectation?",
    "Qual sua pretensao salarial?",
    "Do you require visa sponsorship?",
    "What is your gender?",
    "Qual sua data de nascimento?",
    "Please share your ethnicity",
])
def test_sensitive_questions_are_never_auto_answered(profile, question):
    answer = answer_question(question, profile)
    assert answer.needs_confirmation
    assert "sensivel" in answer.reason.lower()


def test_generic_yes_no_question_requires_confirmation(profile):
    answer = answer_question(
        "Do you have production experience with Apache Cassandra?", profile
    )
    assert answer.needs_confirmation
    assert answer.suggested_answer == ""


def test_identity_questions_use_declared_values(profile):
    answer = answer_question("What is your full name?", profile)
    assert answer.suggested_answer == "Aquiles Teste"
    assert not answer.needs_confirmation


def test_empty_profile_field_requires_confirmation(profile):
    profile.identity.phone = ""
    answer = answer_question("What is your phone number?", profile)
    assert answer.needs_confirmation
    assert "vazio" in answer.reason.lower()


def test_english_level_uses_declared_level(profile):
    answer = answer_question("What is your English level?", profile)
    assert answer.suggested_answer == "Intermediario"
    assert not answer.needs_confirmation


def test_undeclared_english_level_requires_confirmation(profile):
    for language in profile.identity.languages:
        if language.language.lower().startswith("ingl"):
            language.level = ""
    answer = answer_question("What is your English level?", profile)
    assert answer.needs_confirmation


def test_every_answer_states_its_basis_or_its_doubt(profile):
    questions = [
        "How many years of experience do you have with Java?",
        "How many years of experience do you have with Rust?",
        "What is your salary expectation?",
        "What is your email?",
        "Do you like working in teams?",
    ]
    for question in questions:
        answer = answer_question(question, profile)
        assert answer.source_of_truth or answer.reason, question


# ==========================================================================
#  LIMITES CONHECIDOS DO GUARD (documentados, nao acidentais)
# ==========================================================================
def test_aspiration_wording_is_allowed(profile):
    """Declarar interesse em aprender e permitido — e desejado."""
    for text in [
        "Ainda nao tenho experiencia com Kubernetes, e quero aprender.",
        "Tenho interesse em aprender Kafka e Spring Boot.",
        "I do not yet have experience with Kubernetes; learning it is my goal.",
    ]:
        assert guard.check_text(text, profile).ok, text


def test_ownership_claim_without_aspiration_is_still_blocked(profile):
    """A excecao de aspiracao nao vira porta dos fundos."""
    for text in [
        "Trabalhei com Kubernetes em producao por 3 anos.",
        "Implementei microsservicos em Kafka na empresa anterior.",
        "I built and operated Kubernetes clusters.",
    ]:
        assert not guard.check_text(text, profile).ok, text


def test_years_check_still_applies_inside_aspiration_sentences(profile):
    """A frase pode ser aspiracional, mas o numero de anos segue verificado."""
    result = guard.check_text(
        "Quero aprender Kubernetes; tenho 9 anos de experiencia em Java.", profile
    )
    assert not result.ok
    assert any(v.kind == "ANOS_DIVERGENTES" for v in result.violations)


def test_credential_check_still_applies_inside_aspiration_sentences(profile):
    result = guard.check_text(
        "Quero aprender AWS; sou AWS Certified Solutions Architect.", profile
    )
    assert not result.ok
    assert any(v.kind == "CREDENCIAL_NAO_COMPROVADA" for v in result.violations)
