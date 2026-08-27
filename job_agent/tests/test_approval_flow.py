"""Fluxo de aprovacao e DRY_RUN.

Estes testes provam que o sistema NAO PODE enviar candidatura sem tres
aprovacoes humanas explicitas, e que DRY_RUN bloqueia o envio.
"""
from __future__ import annotations

import pytest

from app.applications import service as app_service
from app.applications.service import ApprovalRequired, DuplicateApplication
from app.crawler.normalize import normalize
from app.database import repository as repo
from app.models.enums import JobStatus
from app.ranking.fit import analyze
from app.settings import get_settings
from tests.conftest import make_raw


@pytest.fixture
def job(db_session, profile):
    normalized = normalize(make_raw(
        description="Java, Spring Boot, Docker. 2+ years. Remote Brazil.",
        location="Remote - Brazil",
    ), profile)
    row, _ = repo.upsert_job(db_session, normalized, analyze(normalized, profile))
    return row


@pytest.fixture
def dry_run_off(monkeypatch):
    """Desliga o DRY_RUN apenas dentro do teste."""
    get_settings.cache_clear()
    monkeypatch.setenv("DRY_RUN", "false")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()
    monkeypatch.delenv("DRY_RUN", raising=False)
    get_settings.cache_clear()


# ==========================================================================
#  PORTAO 1: aprovar a vaga
# ==========================================================================
def test_preparing_without_approving_the_job_is_refused(db_session, profile, job):
    assert job.status == JobStatus.FOUND.value
    with pytest.raises(ApprovalRequired) as exc:
        app_service.prepare_application(db_session, job, profile)
    assert "aprove a vaga" in str(exc.value).lower()


def test_approving_a_job_moves_it_through_review(db_session, profile, job):
    app_service.approve_job(db_session, job)
    assert job.status == JobStatus.APPROVED.value


def test_ignored_job_cannot_be_prepared(db_session, profile, job):
    app_service.ignore_job(db_session, job)
    with pytest.raises(ApprovalRequired):
        app_service.prepare_application(db_session, job, profile)


# ==========================================================================
#  PORTAO 2: aprovar o material
# ==========================================================================
def test_prepare_creates_material_without_sending(db_session, profile, job):
    app_service.approve_job(db_session, job)
    prepared = app_service.prepare_application(db_session, job, profile)

    assert prepared.application_id
    assert prepared.cover_letter
    assert prepared.recruiter_message
    assert prepared.resume_path
    assert prepared.dry_run is True

    application = repo.get_application(db_session, prepared.application_id)
    assert application.applied_at is None          # nada foi enviado
    assert application.approved_by_user is False   # portao 2 ainda fechado
    assert application.status == JobStatus.READY_TO_APPLY.value


def test_prepare_never_marks_the_job_as_applied(db_session, profile, job):
    app_service.approve_job(db_session, job)
    app_service.prepare_application(db_session, job, profile)
    assert job.status == JobStatus.READY_TO_APPLY.value
    assert job.status != JobStatus.APPLIED.value


def test_re_preparing_resets_previous_approvals(db_session, profile, job):
    """Material novo exige aprovacao nova."""
    app_service.approve_job(db_session, job)
    first = app_service.prepare_application(db_session, job, profile)
    application = repo.get_application(db_session, first.application_id)
    app_service.approve_application(db_session, application)
    assert application.approved_by_user

    app_service.prepare_application(db_session, job, profile)
    db_session.refresh(application)
    assert application.approved_by_user is False
    assert application.submission_confirmed_by_user is False


def test_pending_question_blocks_material_approval(db_session, profile, job):
    app_service.approve_job(db_session, job)
    prepared = app_service.prepare_application(
        db_session, job, profile,
        questions=["How many years of experience do you have with Kubernetes?"],
    )
    assert prepared.pending_confirmations == 1

    application = repo.get_application(db_session, prepared.application_id)
    with pytest.raises(ApprovalRequired) as exc:
        app_service.approve_application(db_session, application)
    assert "confirmacao" in str(exc.value).lower()


def test_confirming_the_answer_unblocks_approval(db_session, profile, job):
    app_service.approve_job(db_session, job)
    prepared = app_service.prepare_application(
        db_session, job, profile,
        questions=["How many years of experience do you have with Kubernetes?"],
    )
    application = repo.get_application(db_session, prepared.application_id)
    pending = [a for a in application.answers if a.needs_confirmation]
    app_service.confirm_answer(db_session, pending[0], "Nenhuma experiencia profissional ainda")

    app_service.approve_application(db_session, application)
    assert application.approved_by_user is True


def test_confirming_with_an_empty_answer_is_refused(db_session, profile, job):
    app_service.approve_job(db_session, job)
    prepared = app_service.prepare_application(
        db_session, job, profile, questions=["What is your salary expectation?"]
    )
    application = repo.get_application(db_session, prepared.application_id)
    pending = [a for a in application.answers if a.needs_confirmation][0]
    with pytest.raises(ValueError):
        app_service.confirm_answer(db_session, pending, "   ")


# ==========================================================================
#  PORTAO 3 e DRY_RUN
# ==========================================================================
def test_dry_run_blocks_submission_even_after_approval(db_session, profile, job):
    app_service.approve_job(db_session, job)
    prepared = app_service.prepare_application(db_session, job, profile)
    application = repo.get_application(db_session, prepared.application_id)
    app_service.approve_application(db_session, application)

    can_submit, reason = app_service.check_can_submit(application)
    assert can_submit is False
    assert "DRY_RUN" in reason

    with pytest.raises(ApprovalRequired) as exc:
        app_service.confirm_submission(db_session, application)
    assert "DRY_RUN" in str(exc.value)
    assert application.submission_confirmed_by_user is False


def test_dry_run_setting_reports_itself_clearly():
    settings = get_settings()
    allowed, reason = settings.can_submit()
    assert allowed is False
    assert "DRY_RUN" in reason


def test_confirming_submission_requires_material_approval(db_session, profile, job, dry_run_off):
    app_service.approve_job(db_session, job)
    prepared = app_service.prepare_application(db_session, job, profile)
    application = repo.get_application(db_session, prepared.application_id)

    with pytest.raises(ApprovalRequired) as exc:
        app_service.confirm_submission(db_session, application)
    assert "portao 2" in str(exc.value).lower()


def test_all_three_gates_open_only_with_dry_run_off(db_session, profile, job, dry_run_off):
    app_service.approve_job(db_session, job)
    prepared = app_service.prepare_application(db_session, job, profile)
    application = repo.get_application(db_session, prepared.application_id)

    assert app_service.check_can_submit(application)[0] is False   # portao 2 fechado
    app_service.approve_application(db_session, application)
    assert app_service.check_can_submit(application)[0] is False   # portao 3 fechado
    app_service.confirm_submission(db_session, application)
    assert app_service.check_can_submit(application)[0] is True    # todos abertos


def test_confirm_submission_does_not_itself_send(db_session, profile, job, dry_run_off):
    """Confirmar autoriza; nao envia. applied_at continua nulo."""
    app_service.approve_job(db_session, job)
    prepared = app_service.prepare_application(db_session, job, profile)
    application = repo.get_application(db_session, prepared.application_id)
    app_service.approve_application(db_session, application)
    app_service.confirm_submission(db_session, application)

    assert application.applied_at is None
    assert job.status != JobStatus.APPLIED.value


# ==========================================================================
#  REGISTRO DE ENVIO
# ==========================================================================
def test_mark_applied_requires_material_approval(db_session, profile, job):
    app_service.approve_job(db_session, job)
    prepared = app_service.prepare_application(db_session, job, profile)
    application = repo.get_application(db_session, prepared.application_id)

    with pytest.raises(ApprovalRequired):
        app_service.mark_as_applied(db_session, application)


def test_mark_applied_records_the_submission(db_session, profile, job):
    app_service.approve_job(db_session, job)
    prepared = app_service.prepare_application(db_session, job, profile)
    application = repo.get_application(db_session, prepared.application_id)
    app_service.approve_application(db_session, application)

    app_service.mark_as_applied(db_session, application, submitted_via="manual",
                                notes="Enviado pelo portal da empresa.")
    assert application.applied_at is not None
    assert application.status == JobStatus.APPLIED.value
    assert application.submitted_via == "manual"
    assert "portal" in application.notes
    assert job.status == JobStatus.APPLIED.value


def test_marking_applied_twice_is_refused(db_session, profile, job):
    app_service.approve_job(db_session, job)
    prepared = app_service.prepare_application(db_session, job, profile)
    application = repo.get_application(db_session, prepared.application_id)
    app_service.approve_application(db_session, application)
    app_service.mark_as_applied(db_session, application)

    with pytest.raises(DuplicateApplication):
        app_service.mark_as_applied(db_session, application)


def test_cannot_prepare_a_second_application_for_the_same_position(db_session, profile, job):
    app_service.approve_job(db_session, job)
    prepared = app_service.prepare_application(db_session, job, profile)
    application = repo.get_application(db_session, prepared.application_id)
    app_service.approve_application(db_session, application)
    app_service.mark_as_applied(db_session, application)

    with pytest.raises(DuplicateApplication) as exc:
        app_service.prepare_application(db_session, job, profile)
    assert "ja existe candidatura" in str(exc.value).lower()


def test_duplicate_guard_spans_linked_duplicates(db_session, profile):
    """Aplicar na vaga do Greenhouse bloqueia a mesma vaga vinda do Lever."""
    a = normalize(make_raw(company="Acme", title="Backend Engineer",
                           url="https://acme.com/1", source="greenhouse",
                           external_id="g1"), profile)
    b = normalize(make_raw(company="Acme", title="Backend Engineer",
                           url="https://acme.com/2", source="lever",
                           external_id="l1"), profile)
    row_a, _ = repo.upsert_job(db_session, a, analyze(a, profile))
    row_b, _ = repo.upsert_job(db_session, b, analyze(b, profile))
    repo.mark_duplicate(db_session, row_a, row_b, reason="mesma posicao")

    app_service.approve_job(db_session, row_a)
    prepared = app_service.prepare_application(db_session, row_a, profile)
    application = repo.get_application(db_session, prepared.application_id)
    app_service.approve_application(db_session, application)
    app_service.mark_as_applied(db_session, application)

    assert repo.has_applied_to_company_position(db_session, row_b) is not None
    app_service.approve_job(db_session, row_b)
    with pytest.raises(DuplicateApplication):
        app_service.prepare_application(db_session, row_b, profile)


# ==========================================================================
#  ACOMPANHAMENTO
# ==========================================================================
def test_stage_updates_track_the_process(db_session, profile, job):
    app_service.approve_job(db_session, job)
    prepared = app_service.prepare_application(db_session, job, profile)
    application = repo.get_application(db_session, prepared.application_id)
    app_service.approve_application(db_session, application)
    app_service.mark_as_applied(db_session, application)

    for status in (JobStatus.SCREENING, JobStatus.TECHNICAL_INTERVIEW, JobStatus.OFFER):
        app_service.update_stage(db_session, application, status, stage=status.value)
        assert application.status == status.value
        assert job.status == status.value


def test_interviews_are_recorded_against_the_application(db_session, profile, job):
    app_service.approve_job(db_session, job)
    prepared = app_service.prepare_application(db_session, job, profile)
    application = repo.get_application(db_session, prepared.application_id)

    repo.add_interview(db_session, application, date=None, type_="technical",
                       questions="Explique reindexacao no Elasticsearch.",
                       notes="Correu bem.", result="passed")
    db_session.refresh(application)
    assert len(application.interviews) == 1
    assert application.interviews[0].result == "passed"
