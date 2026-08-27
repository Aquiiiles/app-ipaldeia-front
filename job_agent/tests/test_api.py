"""Testes end-to-end da API e do fluxo completo pelo HTTP."""
from __future__ import annotations

import os

import pytest
import yaml
from fastapi.testclient import TestClient

from tests.conftest import PROFILE_DATA


@pytest.fixture
def client(tmp_path, monkeypatch):
    """Aplicacao com banco, perfil e fontes isolados no tmp_path."""
    from app.database.db import reset_engine
    from app.settings import get_settings

    profile_path = tmp_path / "profile.yaml"
    profile_path.write_text(yaml.safe_dump(PROFILE_DATA, allow_unicode=True), encoding="utf-8")
    sources_path = tmp_path / "sources.yaml"
    sources_path.write_text(
        "sources:\n  - id: remotive\n    enabled: true\n    queries: ['java']\n",
        encoding="utf-8",
    )
    (tmp_path / "resumes").mkdir()

    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'api.db'}")
    monkeypatch.setenv("PROFILE_PATH", str(profile_path))
    monkeypatch.setenv("SOURCES_PATH", str(sources_path))
    monkeypatch.setenv("RESUME_DIR", str(tmp_path / "resumes"))
    monkeypatch.setenv("LOG_DIR", str(tmp_path / "logs"))
    monkeypatch.setenv("DRY_RUN", "true")

    get_settings.cache_clear()
    reset_engine()
    import app.services.profile_service as ps
    ps._cache = None

    from app.api.main import create_app
    with TestClient(create_app()) as test_client:
        yield test_client

    reset_engine()
    get_settings.cache_clear()
    ps._cache = None


def import_job(client, **overrides):
    payload = {
        "title": "Backend Engineer (Java)",
        "company": "Acme",
        "url": "https://acme.com/jobs/1",
        "description": "Java, Spring Boot, Docker required. 2+ years. Remote Brazil.",
        "location": "Remote - Brazil",
        "salary": "R$ 11.000 por mes",
        "posted_at": "2026-08-25T00:00:00",
    }
    payload.update(overrides)
    response = client.post("/api/search/manual-import", json=payload)
    assert response.status_code == 200, response.text
    return response.json()


# --- basico ----------------------------------------------------------------
def test_healthz_reports_dry_run(client):
    body = client.get("/healthz").json()
    assert body["ok"] is True
    assert body["dry_run"] is True


def test_dashboard_page_renders(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "job_agent" in response.text
    assert "DRY RUN" in response.text


def test_status_exposes_the_safety_configuration(client):
    body = client.get("/api/status").json()
    assert body["dry_run"] is True
    assert body["require_manual_approval"] is True
    assert body["submission_allowed_by_config"] is False
    assert body["respect_robots_txt"] is True
    assert body["profile"]["ok"] is True


def test_sources_endpoint_states_the_scraping_policy(client):
    body = client.get("/api/search/sources").json()
    assert body["available"]
    assert "remotive" in body["enabled"]
    assert "scraping" in body["note"].lower()
    assert body["manual_search_links"]


# --- importacao e analise --------------------------------------------------
def test_manual_import_scores_the_job(client):
    result = import_job(client)
    assert result["imported"] is True
    assert result["fit_score"] > 0
    assert result["recommendation"]
    assert result["posted_at"] == "2026-08-25"


def test_manual_import_without_a_date_says_unknown(client):
    result = import_job(client, posted_at=None, url="https://acme.com/jobs/2")
    assert result["posted_at"] == "desconhecida"
    assert "nao foi inventada" in result["note"]


def test_manual_import_requires_a_title(client):
    response = client.post("/api/search/manual-import", json={"title": "  "})
    assert response.status_code == 400


def test_job_detail_includes_the_full_analysis(client):
    import_job(client)
    job_id = client.get("/api/jobs").json()["jobs"][0]["id"]
    detail = client.get(f"/api/jobs/{job_id}").json()

    assert detail["fit_breakdown"]
    assert detail["fit_analysis"]["why_it_fits"]
    assert "should_apply" in detail["fit_analysis"]
    assert detail["technologies"]
    assert detail["requirements"] is not None


def test_missing_job_returns_404(client):
    assert client.get("/api/jobs/9999").status_code == 404


def test_listing_filters_work_over_http(client):
    import_job(client)
    import_job(client, title="Senior Staff Engineer", company="Globex",
               url="https://globex.com/1", description="Go and Rust. 10+ years.")

    assert client.get("/api/jobs").json()["count"] == 2
    assert client.get("/api/jobs?search=acme").json()["count"] == 1
    assert client.get("/api/jobs?status=FOUND").json()["count"] == 2
    assert client.get("/api/jobs?min_score=200").json()["count"] == 0


def test_reanalyze_endpoint(client):
    import_job(client)
    job_id = client.get("/api/jobs").json()["jobs"][0]["id"]
    result = client.post(f"/api/jobs/{job_id}/analyze").json()
    assert result["fit_score"] > 0
    assert result["breakdown"]
    assert result["should_apply_reason"]


def test_notes_and_ignore(client):
    import_job(client)
    job_id = client.get("/api/jobs").json()["jobs"][0]["id"]

    assert client.post(f"/api/jobs/{job_id}/notes",
                       json={"body": "Empresa interessante."}).status_code == 200
    assert client.post(f"/api/jobs/{job_id}/notes", json={"body": " "}).status_code == 400

    assert client.post(f"/api/jobs/{job_id}/ignore").status_code == 200
    assert client.get(f"/api/jobs/{job_id}").json()["status"] == "IGNORED"


# --- fluxo completo de aprovacao ------------------------------------------
def test_full_flow_stops_at_dry_run(client):
    """Fluxo inteiro: importar -> aprovar -> preparar -> aprovar -> BLOQUEIO."""
    import_job(client)
    job_id = client.get("/api/jobs").json()["jobs"][0]["id"]

    # Preparar antes de aprovar a vaga: recusado.
    assert client.post(f"/api/applications/prepare/{job_id}", json={}).status_code == 409

    approved = client.post(f"/api/jobs/{job_id}/approve").json()
    assert approved["status"] == "APPROVED"

    prepared = client.post(f"/api/applications/prepare/{job_id}",
                           json={"questions": [], "language": "pt"}).json()
    application_id = prepared["application_id"]
    assert prepared["cover_letter"]
    assert prepared["dry_run"] is True

    detail = client.get(f"/api/applications/{application_id}").json()
    assert detail["applied_at"] is None
    assert detail["can_submit"] is False

    assert client.post(f"/api/applications/{application_id}/approve").status_code == 200
    detail = client.get(f"/api/applications/{application_id}").json()
    assert detail["approved_by_user"] is True
    assert detail["can_submit"] is False
    assert "DRY_RUN" in detail["submit_blocked_reason"]

    # DRY_RUN recusa a confirmacao de envio.
    response = client.post(f"/api/applications/{application_id}/confirm-submission")
    assert response.status_code == 403
    assert "DRY_RUN" in response.json()["detail"]


def test_pending_question_blocks_approval_over_http(client):
    import_job(client)
    job_id = client.get("/api/jobs").json()["jobs"][0]["id"]
    client.post(f"/api/jobs/{job_id}/approve")

    prepared = client.post(f"/api/applications/prepare/{job_id}", json={
        "questions": ["How many years of experience do you have with Kubernetes?"],
    }).json()
    application_id = prepared["application_id"]
    assert prepared["pending_confirmations"] == 1

    blocked = client.post(f"/api/applications/{application_id}/approve")
    assert blocked.status_code == 409

    detail = client.get(f"/api/applications/{application_id}").json()
    answer_id = detail["answers"][0]["id"]
    assert client.post(f"/api/applications/answers/{answer_id}/confirm",
                       json={"final_answer": "Sem experiencia profissional"}).status_code == 200
    assert client.post(f"/api/applications/{application_id}/approve").status_code == 200


def test_mark_applied_then_duplicate_is_refused(client):
    import_job(client)
    job_id = client.get("/api/jobs").json()["jobs"][0]["id"]
    client.post(f"/api/jobs/{job_id}/approve")
    application_id = client.post(f"/api/applications/prepare/{job_id}", json={}).json()["application_id"]
    client.post(f"/api/applications/{application_id}/approve")

    applied = client.post(f"/api/applications/{application_id}/mark-applied",
                          json={"submitted_via": "manual", "notes": "portal"})
    assert applied.status_code == 200
    assert applied.json()["status"] == "APPLIED"

    again = client.post(f"/api/applications/{application_id}/mark-applied", json={})
    assert again.status_code == 409

    # E preparar de novo para a mesma vaga tambem e recusado.
    assert client.post(f"/api/applications/prepare/{job_id}", json={}).status_code == 409


def test_stage_updates_and_interviews(client):
    import_job(client)
    job_id = client.get("/api/jobs").json()["jobs"][0]["id"]
    client.post(f"/api/jobs/{job_id}/approve")
    application_id = client.post(f"/api/applications/prepare/{job_id}", json={}).json()["application_id"]
    client.post(f"/api/applications/{application_id}/approve")
    client.post(f"/api/applications/{application_id}/mark-applied", json={})

    assert client.post(f"/api/applications/{application_id}/stage",
                       json={"status": "TECHNICAL_INTERVIEW"}).status_code == 200
    assert client.post(f"/api/applications/{application_id}/stage",
                       json={"status": "STATUS_INVALIDO"}).status_code == 400

    assert client.post("/api/applications/interviews", json={
        "application_id": application_id, "type": "technical",
        "questions": "Reindexacao no Elasticsearch", "result": "passed",
    }).status_code == 200
    assert client.get("/api/applications/interviews/all").json()["count"] == 1


# --- perguntas -------------------------------------------------------------
def test_question_endpoint_answers_what_it_can(client):
    result = client.post("/api/questions/answer", json={
        "question": "How many years of experience do you have with Java?",
    }).json()
    assert result["suggested_answer"] == "2"
    assert result["needs_confirmation"] is False


def test_question_endpoint_refuses_sensitive_topics(client):
    result = client.post("/api/questions/answer", json={
        "question": "What is your salary expectation?",
    }).json()
    assert result["needs_confirmation"] is True
    assert "sensivel" in result["reason"].lower()


# --- metricas e relatorio --------------------------------------------------
def test_metrics_endpoint(client):
    import_job(client)
    body = client.get("/api/metrics").json()
    assert body["overview"]["total_jobs"] == 1
    assert body["top_technologies"]
    assert len(body["applications_per_week"]) == 8


def test_weekly_report_endpoint(client):
    import_job(client)
    body = client.get("/api/report/weekly?days=7").json()
    assert body["jobs_found"] == 1
    assert "RELATORIO" in body["text"]
    assert body["profile_recommendations"] is not None


def test_profile_reload_endpoint(client):
    body = client.post("/api/profile/reload").json()
    assert body["reloaded"] is True
    assert body["profile"]["ok"] is True


def test_openapi_schema_is_valid(client):
    schema = client.get("/openapi.json").json()
    assert schema["info"]["title"]
    assert "/api/jobs" in schema["paths"]
