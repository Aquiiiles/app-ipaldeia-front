"""Persistencia SQLite: upsert, duplicatas, transicoes de status."""
from __future__ import annotations

import json

import pytest

from app.crawler.normalize import normalize
from app.crawler.pipeline import process_raw_jobs, store_jobs
from app.database import repository as repo
from app.database.repository import TransitionError
from app.database.schema import Job, JobDuplicate
from app.models.enums import JobStatus
from app.ranking.fit import analyze
from tests.conftest import make_raw


def store_one(session, profile, **kwargs):
    job = normalize(make_raw(**kwargs), profile)
    return repo.upsert_job(session, job, analyze(job, profile))


# --- upsert ----------------------------------------------------------------
def test_insert_then_update_does_not_duplicate(db_session, profile):
    row, created = store_one(db_session, profile, external_id="x1")
    assert created
    job_id = row.id

    row2, created2 = store_one(db_session, profile, external_id="x1",
                               title="Backend Engineer II")
    assert not created2
    assert row2.id == job_id
    assert row2.title == "Backend Engineer II"
    assert db_session.query(Job).count() == 1


def test_all_required_fields_are_persisted(db_session, profile):
    row, _ = store_one(
        db_session, profile,
        title="Backend Engineer", company="Acme", url="https://acme.com/jobs/1",
        description="Java, Spring Boot, PostgreSQL. 3+ years required.",
        location="Remote - Brazil", salary="R$ 11.000 por mes", posted_days_ago=4,
    )
    assert row.title and row.company and row.url and row.source
    assert row.location == "Remote - Brazil"
    assert row.remote == "remote"
    assert row.accepts_brazil is True
    assert row.salary == "R$ 11.000 por mes"
    assert row.salary_min_brl_month == pytest.approx(11000.0)
    assert row.seniority
    assert row.years_required == 3.0
    assert "java" in row.technologies_list()
    assert json.loads(row.requirements) is not None
    assert row.posted_at is not None
    assert row.discovered_at is not None
    assert row.recency == "excellent"
    assert row.recency_days == 4
    assert row.fit_score > 0
    assert row.recommendation
    assert row.status == JobStatus.FOUND.value
    assert row.dedupe_key and row.canonical_url


def test_unknown_posted_at_is_stored_as_null(db_session, profile):
    """"Desconhecida" e persistido como NULL, nao como a data de hoje."""
    row, _ = store_one(db_session, profile, posted_days_ago=None)
    assert row.posted_at is None
    assert row.recency_days is None
    assert row.discovered_at is not None


def test_user_chosen_status_survives_a_rescan(db_session, profile):
    row, _ = store_one(db_session, profile, external_id="keep")
    repo.set_job_status(db_session, row, JobStatus.REVIEW)
    repo.set_job_status(db_session, row, JobStatus.APPROVED)

    store_one(db_session, profile, external_id="keep", title="Updated title")
    refreshed = db_session.get(Job, row.id)
    assert refreshed.status == JobStatus.APPROVED.value
    assert refreshed.title == "Updated title"


# --- duplicatas ------------------------------------------------------------
def test_duplicates_are_linked_to_one_canonical_entry(db_session, profile):
    jobs = [
        normalize(make_raw(company="Acme", title="Backend Engineer",
                           url="https://acme.com/1", source="remotive", external_id="r1"), profile),
        normalize(make_raw(company="Acme Inc.", title="Backend Engineer (Remote)",
                           url="https://acme.com/2", source="lever", external_id="l1"), profile),
    ]
    new_count, _, dup_count = store_jobs(db_session, jobs, profile)
    # new_count conta apenas entradas canonicas; a duplicata e contada separado.
    assert new_count == 1
    assert dup_count >= 1

    # Ambas as linhas existem, mas so uma e candidata.
    assert len(repo.list_jobs(db_session, include_duplicates=True)) == 2
    canonicals = repo.list_jobs(db_session, include_duplicates=False)
    assert len(canonicals) == 1
    assert canonicals[0].duplicate_of_id is None
    assert db_session.query(JobDuplicate).count() >= 1


def test_duplicate_from_a_later_run_is_linked_not_re_added(db_session, profile):
    first = normalize(make_raw(company="Acme", title="Backend Engineer",
                               url="https://acme.com/1", source="remotive",
                               external_id="r1"), profile)
    store_jobs(db_session, [first], profile)

    second = normalize(make_raw(company="Acme", title="Backend Engineer",
                                url="https://acme.com/9", source="greenhouse",
                                external_id="g1"), profile)
    store_jobs(db_session, [second], profile)

    assert len(repo.list_jobs(db_session, include_duplicates=False)) == 1
    assert len(repo.list_jobs(db_session, include_duplicates=True)) == 2


def test_marking_duplicate_never_downgrades_a_progressed_job(db_session, profile):
    canonical, _ = store_one(db_session, profile, external_id="c", url="https://a.com/c")
    other, _ = store_one(db_session, profile, external_id="d", url="https://a.com/d")
    repo.set_job_status(db_session, other, JobStatus.REVIEW)
    repo.set_job_status(db_session, other, JobStatus.APPROVED)

    repo.mark_duplicate(db_session, canonical, other, reason="test")
    assert other.status == JobStatus.APPROVED.value     # nao virou DUPLICATE
    assert other.duplicate_of_id == canonical.id


def test_mark_duplicate_is_idempotent(db_session, profile):
    a, _ = store_one(db_session, profile, external_id="a", url="https://a.com/a")
    b, _ = store_one(db_session, profile, external_id="b", url="https://a.com/b")
    repo.mark_duplicate(db_session, a, b)
    repo.mark_duplicate(db_session, a, b)
    assert db_session.query(JobDuplicate).count() == 1


def test_self_duplicate_is_a_noop(db_session, profile):
    a, _ = store_one(db_session, profile, external_id="a")
    repo.mark_duplicate(db_session, a, a)
    assert db_session.query(JobDuplicate).count() == 0


# --- transicoes de status --------------------------------------------------
def test_valid_transition_path(db_session, profile):
    row, _ = store_one(db_session, profile)
    for status in (JobStatus.REVIEW, JobStatus.APPROVED, JobStatus.READY_TO_APPLY,
                   JobStatus.APPLIED, JobStatus.INTERVIEW, JobStatus.OFFER):
        repo.set_job_status(db_session, row, status)
        assert row.status == status.value


def test_found_cannot_jump_straight_to_applied(db_session, profile):
    """Guardrail central: nao existe atalho para APPLIED."""
    row, _ = store_one(db_session, profile)
    with pytest.raises(TransitionError) as exc:
        repo.set_job_status(db_session, row, JobStatus.APPLIED)
    assert "nao permitida" in str(exc.value)
    assert row.status == JobStatus.FOUND.value


def test_approved_cannot_skip_ready_to_apply(db_session, profile):
    row, _ = store_one(db_session, profile)
    repo.set_job_status(db_session, row, JobStatus.REVIEW)
    repo.set_job_status(db_session, row, JobStatus.APPROVED)
    with pytest.raises(TransitionError):
        repo.set_job_status(db_session, row, JobStatus.APPLIED)


def test_terminal_states_are_terminal(db_session, profile):
    row, _ = store_one(db_session, profile)
    repo.set_job_status(db_session, row, JobStatus.REVIEW)
    repo.set_job_status(db_session, row, JobStatus.APPROVED)
    repo.set_job_status(db_session, row, JobStatus.READY_TO_APPLY)
    repo.set_job_status(db_session, row, JobStatus.APPLIED)
    repo.set_job_status(db_session, row, JobStatus.REJECTED)
    with pytest.raises(TransitionError):
        repo.set_job_status(db_session, row, JobStatus.INTERVIEW)


def test_force_bypasses_transition_rules_for_manual_correction(db_session, profile):
    row, _ = store_one(db_session, profile)
    repo.set_job_status(db_session, row, JobStatus.APPLIED, force=True)
    assert row.status == JobStatus.APPLIED.value


def test_same_status_transition_is_a_noop(db_session, profile):
    row, _ = store_one(db_session, profile)
    repo.set_job_status(db_session, row, JobStatus.FOUND)
    assert row.status == JobStatus.FOUND.value


# --- consultas -------------------------------------------------------------
def test_listing_filters(db_session, profile):
    store_one(db_session, profile, external_id="a", url="https://a.com/1",
              title="Backend Engineer", company="Acme",
              description="Java, Spring Boot. 2 years. Remote Brazil.",
              location="Remote - Brazil")
    store_one(db_session, profile, external_id="b", url="https://b.com/1",
              title="Senior Data Scientist", company="Globex",
              description="Python, R, 8+ years.")

    assert len(repo.list_jobs(db_session, search="acme")) == 1
    assert len(repo.list_jobs(db_session, search="java")) == 1
    assert len(repo.list_jobs(db_session, status=JobStatus.FOUND.value)) == 2
    assert len(repo.list_jobs(db_session, min_score=95)) <= 1


def test_notes_are_attached_to_the_job(db_session, profile):
    row, _ = store_one(db_session, profile)
    repo.add_note(db_session, row, "Recrutador respondeu por e-mail.")
    db_session.refresh(row)
    assert len(row.notes) == 1
    assert row.notes[0].body.startswith("Recrutador")


# --- pipeline --------------------------------------------------------------
def test_pipeline_reports_a_reason_for_every_discard(profile):
    raws = [
        make_raw(external_id="ok", url="https://a.com/1", posted_days_ago=3),
        make_raw(external_id="old", url="https://a.com/2", posted_days_ago=300),
        make_raw(external_id="closed", url="https://a.com/3",
                 description="Vaga encerrada."),
    ]
    kept, discarded = process_raw_jobs(raws, profile)
    assert len(kept) == 1
    assert len(discarded) == 2
    for _job, reason in discarded:
        assert reason.strip()


def test_pipeline_skips_records_without_title_or_url(profile):
    raws = [make_raw(title="", external_id="a"), make_raw(url="", external_id="b")]
    kept, _ = process_raw_jobs(raws, profile)
    assert kept == []


# --- auditoria de execucao -------------------------------------------------
def test_source_runs_are_recorded(db_session, profile):
    run = repo.start_source_run(db_session, "remotive")
    repo.finish_source_run(db_session, run, fetched=10, kept=7, duplicates=2, discarded=1)
    runs = repo.list_source_runs(db_session)
    assert len(runs) == 1
    assert runs[0].fetched == 10 and runs[0].kept == 7
    assert runs[0].finished_at is not None
