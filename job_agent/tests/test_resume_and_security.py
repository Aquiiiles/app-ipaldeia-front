"""Leitura de CV, redacao de segredos e politicas de rede."""
from __future__ import annotations

import logging

import pytest

from app.crawler.fetcher import _looks_like_challenge
from app.logging_setup import REDACTED, SecretRedactingFilter
from app.resume.parser import (
    SUPPORTED_EXTENSIONS, find_resume, parse_resume, split_sections,
)
from app.services.profile_service import _merge_resume

RESUME_MD = """# Aquiles Teste
Backend Software Engineer — Brasil

## Experiencia Profissional
Associate Software Engineer na Liferay (2024 - atual)
Responsavel por upgrades e migracoes em sistemas Java de grande porte.
Investigacao de problemas de reindexacao no Elasticsearch.

## Habilidades
Java, Liferay, Gradle, Docker, Elasticsearch, SQL, Git

## Formacao Academica
Bacharelado em Ciencia da Computacao — Universidade Federal (2019 - 2023)

## Certificacoes
Liferay DXP Developer Certification

## Idiomas
Portugues (nativo), Ingles (intermediario)

## Projetos
Ferramenta interna de diagnostico de indices Elasticsearch.

## Conquistas
Reduzi o tempo de reindexacao completa de um cliente em 40%.
"""


@pytest.fixture
def resume_file(tmp_path):
    path = tmp_path / "cv.md"
    path.write_text(RESUME_MD, encoding="utf-8")
    return path


# --- parsing do CV ---------------------------------------------------------
def test_sections_are_recognised_in_portuguese():
    sections = split_sections(RESUME_MD)
    assert sections["experience"]
    assert sections["education"]
    assert sections["certifications"]
    assert sections["languages"]
    assert sections["projects"]
    assert sections["achievements"]
    assert sections["skills"]


def test_english_headings_also_recognised():
    text = ("## Work Experience\nSoftware Engineer at Acme doing backend work\n"
            "## Education\nBSc Computer Science at University\n"
            "## Certifications\nAWS Practitioner\n")
    sections = split_sections(text)
    assert sections["experience"] and sections["education"] and sections["certifications"]


def test_resume_facts_are_extracted_not_invented(resume_file):
    facts = parse_resume(resume_file)
    assert facts.source_file == str(resume_file)
    assert facts.raw_text
    assert "java" in facts.technologies
    assert "elasticsearch" in facts.technologies
    assert facts.education and facts.certifications
    assert facts.languages and facts.projects and facts.achievements
    assert facts.experience_entries
    # Nada que nao esteja no arquivo aparece nos fatos.
    assert "kubernetes" not in facts.technologies


def test_resume_merge_complements_but_never_overwrites(profile, resume_file):
    original_years = dict(profile.experience.years_by_technology)
    original_title = profile.current.title

    merged = _merge_resume(profile, parse_resume(resume_file))
    assert merged.resume is not None
    assert merged.current.title == original_title
    assert merged.experience.years_by_technology == original_years
    assert merged.education                       # veio do CV
    assert merged.certifications
    assert "java" in merged.known_technologies()
    assert merged.fact_corpus()


def test_merge_does_not_duplicate_technologies(profile, resume_file):
    merged = _merge_resume(profile, parse_resume(resume_file))
    lowered = [t.lower() for t in merged.experience.technologies]
    assert len(lowered) == len(set(lowered))


def test_missing_resume_raises_a_clear_error(tmp_path):
    with pytest.raises(FileNotFoundError):
        parse_resume(tmp_path / "nao_existe.pdf")


def test_unsupported_extension_is_rejected(tmp_path):
    path = tmp_path / "cv.odt"
    path.write_text("conteudo", encoding="utf-8")
    with pytest.raises(RuntimeError) as exc:
        parse_resume(path)
    assert "nao suportada" in str(exc.value)


def test_find_resume_picks_the_most_recent(tmp_path):
    import os, time
    old = tmp_path / "cv_antigo.md"
    old.write_text("velho", encoding="utf-8")
    time.sleep(0.01)
    new = tmp_path / "cv_novo.md"
    new.write_text("novo", encoding="utf-8")
    os.utime(new, (time.time() + 10, time.time() + 10))
    assert find_resume(tmp_path) == new


def test_find_resume_ignores_hidden_and_unknown_files(tmp_path):
    (tmp_path / ".DS_Store").write_text("x", encoding="utf-8")
    (tmp_path / "notes.odt").write_text("x", encoding="utf-8")
    assert find_resume(tmp_path) is None


def test_find_resume_on_missing_directory(tmp_path):
    assert find_resume(tmp_path / "nao_existe") is None


def test_supported_extensions_cover_the_common_cases():
    assert {".pdf", ".docx", ".md", ".txt"} <= SUPPORTED_EXTENSIONS


# --- redacao de segredos ---------------------------------------------------
def _record(message, *args):
    return logging.LogRecord("t", logging.INFO, "f", 1, message, args, None)


def test_known_api_keys_are_redacted():
    secret = "sk-ant-api03-SEGREDO-MUITO-LONGO-AQUI"
    log_filter = SecretRedactingFilter([secret])
    record = _record(f"Chamando o provedor com {secret}")
    log_filter.filter(record)
    assert secret not in record.msg
    assert REDACTED in record.msg


@pytest.mark.parametrize("message", [
    "Authorization: Bearer abc123def456ghi",
    "api_key=sk-proj-abcdefghijklmnop",
    "password=minhaSenhaSecreta123",
    "senha=outraSenha456",
    "Cookie: session_id=abcdef1234567890",
    "token: ghp_abcdefghijklmnopqrstuvwxyz1234",
])
def test_secret_shaped_content_is_redacted_even_if_unknown(message):
    log_filter = SecretRedactingFilter([])
    record = _record(message)
    log_filter.filter(record)
    assert REDACTED in record.msg


def test_secrets_in_log_args_are_redacted():
    secret = "sk-ant-SEGREDO-AQUI-LONGO"
    log_filter = SecretRedactingFilter([secret])
    record = _record("provedor=%s", secret)
    log_filter.filter(record)
    assert secret not in str(record.args)


def test_numeric_args_survive_redaction():
    """Argumentos numericos nao podem ser convertidos: %d quebraria."""
    log_filter = SecretRedactingFilter(["sk-ant-SEGREDO-LONGO"])
    record = _record("CV lido: %s (%d chars, %d tecnologias)", "cv.md", 561, 11)
    log_filter.filter(record)
    assert record.getMessage() == "CV lido: cv.md (561 chars, 11 tecnologias)"


def test_string_args_are_still_redacted_alongside_numbers():
    secret = "sk-ant-SEGREDO-LONGO-AQUI"
    log_filter = SecretRedactingFilter([secret])
    record = _record("provedor=%s tentativa=%d", secret, 2)
    log_filter.filter(record)
    assert secret not in record.getMessage()
    assert "tentativa=2" in record.getMessage()


def test_ordinary_messages_are_not_mangled():
    log_filter = SecretRedactingFilter([])
    record = _record("Busca concluida: 12 vagas novas, 3 duplicatas.")
    log_filter.filter(record)
    assert record.msg == "Busca concluida: 12 vagas novas, 3 duplicatas."


def test_short_values_are_not_treated_as_secrets():
    """Um valor curto nao e tratado como segredo (evita falso positivo)."""
    log_filter = SecretRedactingFilter(["abc"])
    record = _record("contexto abc")
    log_filter.filter(record)
    assert record.msg == "contexto abc"


def test_settings_never_expose_secrets_in_repr():
    from app.settings import Settings
    settings = Settings(anthropic_api_key="sk-ant-SEGREDO", openai_api_key="sk-SEGREDO2")
    assert settings.secret_values == ["sk-ant-SEGREDO", "sk-SEGREDO2"]
    log_filter = SecretRedactingFilter(settings.secret_values)
    record = _record("usando sk-ant-SEGREDO e sk-SEGREDO2")
    log_filter.filter(record)
    assert "SEGREDO" not in record.msg


# --- deteccao de anti-bot: parar, nunca contornar --------------------------
class FakeResponse:
    def __init__(self, status_code=200, text="", headers=None):
        self.status_code = status_code
        self.text = text
        self.headers = headers or {"content-type": "text/html"}


@pytest.mark.parametrize("body", [
    "Please complete the CAPTCHA to continue",
    "<div class='g-recaptcha'></div>",
    "Checking your browser before accessing",
    "Just a moment...",
    "Verifique que voce e humano",
    "cf_chl_opt challenge",
    "px-captcha blocked",
])
def test_challenge_pages_are_detected(body):
    assert _looks_like_challenge(FakeResponse(200, body))


@pytest.mark.parametrize("status", [401, 403, 407, 511])
def test_auth_required_statuses_are_treated_as_intervention(status):
    assert _looks_like_challenge(FakeResponse(status, "Forbidden"))


def test_cloudflare_503_is_detected():
    assert _looks_like_challenge(
        FakeResponse(503, "error", {"content-type": "text/html", "server": "cloudflare"})
    )


def test_normal_json_response_is_not_a_challenge():
    assert not _looks_like_challenge(
        FakeResponse(200, '{"jobs": []}', {"content-type": "application/json"})
    )


def test_normal_html_response_is_not_a_challenge():
    assert not _looks_like_challenge(
        FakeResponse(200, "<html><body><h1>Backend Engineer</h1></body></html>")
    )


def test_fetcher_defaults_are_conservative():
    from app.crawler.fetcher import PoliteFetcher
    fetcher = PoliteFetcher()
    assert fetcher.respect_robots is True
    assert fetcher.min_interval >= 1.0
    assert fetcher.max_requests > 0
    assert "job-agent" in (fetcher.user_agent or "")


def test_browser_module_never_offers_a_bypass():
    """O modulo de navegador nao expoe nenhuma funcao de contorno."""
    import app.browser.assist as assist
    names = " ".join(dir(assist)).lower()
    for forbidden in ("solve", "bypass", "captcha_solver", "stealth", "undetected"):
        assert forbidden not in names
    assert assist.INTERVENTION_MARKERS
