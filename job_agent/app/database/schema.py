"""Schema SQLite via SQLAlchemy 2.0.

Tabelas: jobs, applications, interviews, job_duplicates,
application_answers, notes, source_runs.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from app.models.enums import JobStatus


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Job(Base):
    __tablename__ = "jobs"
    __table_args__ = (
        # Uma vaga por (fonte, id externo): reprocessar uma busca atualiza,
        # nao duplica.
        UniqueConstraint("source", "external_id", name="uq_jobs_source_external"),
        Index("ix_jobs_dedupe_key", "dedupe_key"),
        Index("ix_jobs_canonical_url", "canonical_url"),
        Index("ix_jobs_status", "status"),
        Index("ix_jobs_fit_score", "fit_score"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    company: Mapped[str] = mapped_column(String(300), default="")
    url: Mapped[str] = mapped_column(Text, default="")
    canonical_url: Mapped[str] = mapped_column(Text, default="")
    dedupe_key: Mapped[str] = mapped_column(String(400), default="")
    source: Mapped[str] = mapped_column(String(80), default="")
    external_id: Mapped[str] = mapped_column(String(300), default="")
    location: Mapped[str] = mapped_column(String(300), default="")
    remote: Mapped[str] = mapped_column(String(20), default="unknown")   # Modality
    accepts_brazil: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    salary: Mapped[str] = mapped_column(String(300), default="")
    salary_min_brl_month: Mapped[float | None] = mapped_column(Float, nullable=True)
    salary_max_brl_month: Mapped[float | None] = mapped_column(Float, nullable=True)
    seniority: Mapped[str] = mapped_column(String(30), default="unknown")
    years_required: Mapped[float | None] = mapped_column(Float, nullable=True)
    technologies: Mapped[str] = mapped_column(Text, default="")          # CSV canonico
    requirements: Mapped[str] = mapped_column(Text, default="")          # JSON list
    description: Mapped[str] = mapped_column(Text, default="")

    # `posted_at` NULL significa "desconhecida". Nunca preenchido por chute.
    posted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    discovered_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    recency: Mapped[str] = mapped_column(String(20), default="unknown")
    recency_days: Mapped[int | None] = mapped_column(Integer, nullable=True)

    fit_score: Mapped[float] = mapped_column(Float, default=0.0)
    recommendation: Mapped[str] = mapped_column(String(30), default="")
    fit_breakdown: Mapped[str] = mapped_column(Text, default="")         # JSON
    fit_analysis: Mapped[str] = mapped_column(Text, default="")          # JSON
    filter_flags: Mapped[str] = mapped_column(Text, default="")          # CSV
    is_stretch: Mapped[bool] = mapped_column(Boolean, default=False)

    status: Mapped[str] = mapped_column(String(30), default=JobStatus.FOUND.value)
    status_changed_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    duplicate_of_id: Mapped[int | None] = mapped_column(ForeignKey("jobs.id"), nullable=True)

    applications: Mapped[list["Application"]] = relationship(
        back_populates="job", cascade="all, delete-orphan"
    )
    notes: Mapped[list["Note"]] = relationship(
        back_populates="job", cascade="all, delete-orphan"
    )

    def technologies_list(self) -> list[str]:
        return [t for t in (self.technologies or "").split(",") if t]

    def flags_list(self) -> list[str]:
        return [f for f in (self.filter_flags or "").split(",") if f]


class JobDuplicate(Base):
    """Registro de que uma vaga e duplicata de outra (evita aplicar 2x)."""
    __tablename__ = "job_duplicates"
    __table_args__ = (UniqueConstraint("canonical_job_id", "duplicate_job_id", name="uq_dup_pair"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    canonical_job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), nullable=False)
    duplicate_job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), nullable=False)
    reason: Mapped[str] = mapped_column(String(200), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    applied_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default=JobStatus.READY_TO_APPLY.value)

    resume_version: Mapped[str] = mapped_column(String(300), default="")
    resume_path: Mapped[str] = mapped_column(Text, default="")
    cover_letter: Mapped[str] = mapped_column(Text, default="")
    recruiter_message: Mapped[str] = mapped_column(Text, default="")
    tailoring_suggestions: Mapped[str] = mapped_column(Text, default="")   # JSON
    notes: Mapped[str] = mapped_column(Text, default="")

    interview_stage: Mapped[str] = mapped_column(String(60), default="")
    result: Mapped[str] = mapped_column(String(60), default="")

    # Trilha de aprovacao. Sem estes campos nao existe envio.
    approved_by_user: Mapped[bool] = mapped_column(Boolean, default=False)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    submission_confirmed_by_user: Mapped[bool] = mapped_column(Boolean, default=False)
    submission_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    submitted_via: Mapped[str] = mapped_column(String(60), default="")   # manual | assisted
    dry_run_at_creation: Mapped[bool] = mapped_column(Boolean, default=True)

    job: Mapped["Job"] = relationship(back_populates="applications")
    answers: Mapped[list["ApplicationAnswer"]] = relationship(
        back_populates="application", cascade="all, delete-orphan"
    )
    interviews: Mapped[list["Interview"]] = relationship(
        back_populates="application", cascade="all, delete-orphan"
    )


class ApplicationAnswer(Base):
    """Resposta a uma pergunta do formulario de candidatura.

    `needs_confirmation=True` = o agente NAO tem base factual segura.
    Nada com essa marca pode ser usado sem aprovacao explicita.
    """
    __tablename__ = "application_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id"), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    suggested_answer: Mapped[str] = mapped_column(Text, default="")
    final_answer: Mapped[str] = mapped_column(Text, default="")
    source_of_truth: Mapped[str] = mapped_column(Text, default="")   # de onde saiu o dado
    confidence: Mapped[str] = mapped_column(String(20), default="low")
    needs_confirmation: Mapped[bool] = mapped_column(Boolean, default=True)
    confirmed_by_user: Mapped[bool] = mapped_column(Boolean, default=False)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    application: Mapped["Application"] = relationship(back_populates="answers")


class Interview(Base):
    __tablename__ = "interviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id"), nullable=False)
    date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    type: Mapped[str] = mapped_column(String(60), default="")     # screening | technical | ...
    questions: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    result: Mapped[str] = mapped_column(String(60), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    application: Mapped["Application"] = relationship(back_populates="interviews")


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"), nullable=False)
    body: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)

    job: Mapped["Job"] = relationship(back_populates="notes")


class SourceRun(Base):
    """Auditoria de cada execucao de busca, por fonte."""
    __tablename__ = "source_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source: Mapped[str] = mapped_column(String(80), default="")
    started_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    fetched: Mapped[int] = mapped_column(Integer, default=0)
    kept: Mapped[int] = mapped_column(Integer, default=0)
    duplicates: Mapped[int] = mapped_column(Integer, default=0)
    discarded: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(30), default="ok")
    error: Mapped[str] = mapped_column(Text, default="")
