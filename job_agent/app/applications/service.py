"""Servico de candidaturas: preparo, aprovacao e registro de envio.

TRES PORTOES independentes antes de qualquer envio:
  1. `job.status` = APPROVED    -> voce aprovou a VAGA;
  2. `application.approved_by_user` -> voce aprovou o MATERIAL preparado;
  3. `application.submission_confirmed_by_user` + DRY_RUN=false
                                -> voce confirmou o ENVIO.

Nao existe funcao neste modulo que envie candidatura automaticamente.
O envio real e sempre feito por VOCE, no navegador. `mark_as_applied`
apenas REGISTRA que voce enviou.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.applications import cover_letter as cover_letter_mod
from app.applications import resume_tailor
from app.applications.questions import AnsweredQuestion, answer_all
from app.database import repository as repo
from app.database.schema import Application, ApplicationAnswer, Job
from app.logging_setup import get_logger
from app.models.enums import JobStatus
from app.models.profile import Profile
from app.settings import get_settings

log = get_logger("applications")


class ApprovalRequired(PermissionError):
    """Uma etapa de aprovacao humana ainda nao foi cumprida."""


class DuplicateApplication(ValueError):
    """Ja existe candidatura enviada para esta posicao."""


def _utcnow_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


@dataclass
class PreparedApplication:
    application_id: int
    job_id: int
    cover_letter: str
    cover_letter_source: str
    recruiter_message: str
    guard_summary: str
    guard_ok: bool
    resume_version: str
    resume_path: str
    tailoring: dict
    answers: list[dict] = field(default_factory=list)
    pending_confirmations: int = 0
    dry_run: bool = True
    next_step: str = ""


# --------------------------------------------------------------------------
# Portao 1: aprovar a vaga
# --------------------------------------------------------------------------
def approve_job(session: Session, job: Job) -> Job:
    """Voce aprovou a VAGA. Ainda nao ha material nem envio.

    Uma vaga marcada como DUPLICATE ou IGNORED pode ser resgatada aqui: se
    voce decidiu que vale a pena, sua decisao prevalece sobre a heuristica.
    """
    current = JobStatus(job.status)
    if current in {JobStatus.DUPLICATE, JobStatus.IGNORED}:
        repo.set_job_status(session, job, JobStatus.FOUND)
        current = JobStatus.FOUND
    if current is JobStatus.FOUND:
        repo.set_job_status(session, job, JobStatus.REVIEW)
    repo.set_job_status(session, job, JobStatus.APPROVED)
    log.info("Vaga %s aprovada por voce: %s @ %s", job.id, job.title, job.company)
    return job


def ignore_job(session: Session, job: Job) -> Job:
    return repo.set_job_status(session, job, JobStatus.IGNORED, force=True)


# --------------------------------------------------------------------------
# Portao 2: preparar o material
# --------------------------------------------------------------------------
def prepare_application(
    session: Session,
    job: Job,
    profile: Profile,
    questions: list[str] | None = None,
    language: str = "pt",
) -> PreparedApplication:
    """Gera CV adaptado, cover letter, mensagem e respostas — SEM enviar.

    Funciona normalmente em DRY_RUN: preparar nunca envia nada.
    """
    settings = get_settings()

    # A guarda anti-duplicata vem primeiro: e a informacao mais util quando
    # voce ja aplicou para esta posicao (por qualquer fonte).
    already = repo.has_applied_to_company_position(session, job)
    if already is not None:
        raise DuplicateApplication(
            f"Ja existe candidatura ENVIADA (application #{already.id}) para esta posicao "
            f"ou para uma duplicata dela. Nao vou preparar uma segunda."
        )

    if JobStatus(job.status) not in {JobStatus.APPROVED, JobStatus.READY_TO_APPLY}:
        raise ApprovalRequired(
            f"A vaga {job.id} esta em '{job.status}'. Aprove a vaga antes de preparar "
            f"a candidatura (status esperado: APPROVED)."
        )

    tailoring = resume_tailor.suggest_tailoring(job, profile)
    resume_tailor.generate_tailored_file(job, profile, tailoring)

    letter = cover_letter_mod.generate_cover_letter(job, profile, language)
    message = cover_letter_mod.generate_recruiter_message(job, profile, language)

    application = repo.find_application_for_job(session, job.id)
    if application is None or application.applied_at is not None:
        application = Application(job_id=job.id, dry_run_at_creation=settings.dry_run)
        session.add(application)
        session.flush()

    application.status = JobStatus.READY_TO_APPLY.value
    application.resume_version = tailoring.version_name
    application.resume_path = tailoring.path
    application.cover_letter = letter.body
    application.recruiter_message = message.body
    import json
    application.tailoring_suggestions = json.dumps(tailoring.as_dict(), ensure_ascii=False)
    # Preparar NAO aprova: cada preparo reseta as aprovacoes.
    application.approved_by_user = False
    application.approved_at = None
    application.submission_confirmed_by_user = False
    application.submission_confirmed_at = None
    session.flush()

    answered = answer_all(questions or [], profile)
    _persist_answers(session, application, answered)

    repo.set_job_status(session, job, JobStatus.READY_TO_APPLY)

    pending = sum(1 for a in answered if a.needs_confirmation)
    guard_ok = letter.guard_ok and message.guard_ok
    guard_summary = "\n".join(s for s in (letter.guard_summary, message.guard_summary) if s)

    log.info("Candidatura #%s preparada para vaga %s (DRY_RUN=%s). Nada foi enviado.",
             application.id, job.id, settings.dry_run)

    return PreparedApplication(
        application_id=application.id,
        job_id=job.id,
        cover_letter=letter.body,
        cover_letter_source=letter.generated_by,
        recruiter_message=message.body,
        guard_summary=guard_summary,
        guard_ok=guard_ok,
        resume_version=tailoring.version_name,
        resume_path=tailoring.path,
        tailoring=tailoring.as_dict(),
        answers=[a.as_dict() for a in answered],
        pending_confirmations=pending,
        dry_run=settings.dry_run,
        next_step=("Revise o material no dashboard e clique em [Aprovar candidatura]. "
                   "Nada sera enviado sem isso."),
    )


def _persist_answers(
    session: Session, application: Application, answered: list[AnsweredQuestion]
) -> None:
    for item in answered:
        session.add(ApplicationAnswer(
            application_id=application.id,
            question=item.question,
            suggested_answer=item.suggested_answer,
            source_of_truth=item.source_of_truth or item.reason,
            confidence=item.confidence,
            needs_confirmation=item.needs_confirmation,
        ))
    session.flush()


def add_questions(
    session: Session, application: Application, questions: list[str], profile: Profile
) -> list[AnsweredQuestion]:
    """Adiciona perguntas do formulario e propoe respostas."""
    answered = answer_all(questions, profile)
    _persist_answers(session, application, answered)
    return answered


def confirm_answer(
    session: Session, answer: ApplicationAnswer, final_answer: str
) -> ApplicationAnswer:
    """Voce confirmou/editou uma resposta. So aqui ela se torna utilizavel."""
    if not final_answer.strip():
        raise ValueError("A resposta final nao pode ser vazia.")
    answer.final_answer = final_answer.strip()
    answer.confirmed_by_user = True
    answer.confirmed_at = _utcnow_naive()
    answer.needs_confirmation = False
    session.flush()
    return answer


def approve_application(session: Session, application: Application) -> Application:
    """Portao 2: voce revisou e aprovou o MATERIAL.

    Bloqueia se houver resposta pendente de confirmacao: material com um
    campo em branco (ou chutado) nao pode ser aprovado.
    """
    pending = [a for a in application.answers if a.needs_confirmation and not a.confirmed_by_user]
    if pending:
        raise ApprovalRequired(
            f"{len(pending)} pergunta(s) ainda aguardam sua confirmacao: "
            + " | ".join(a.question[:80] for a in pending[:5])
        )
    application.approved_by_user = True
    application.approved_at = _utcnow_naive()
    session.flush()
    log.info("Candidatura #%s aprovada por voce. Envio ainda exige confirmacao.",
             application.id)
    return application


# --------------------------------------------------------------------------
# Portao 3: envio
# --------------------------------------------------------------------------
def check_can_submit(application: Application) -> tuple[bool, str]:
    """Todos os portoes estao abertos? Retorna (pode, motivo)."""
    settings = get_settings()

    if settings.dry_run:
        return False, ("DRY_RUN=true. Nenhum envio e permitido. Para habilitar, defina "
                       "DRY_RUN=false no .env — e ainda assim sera exigida sua confirmacao.")
    if not application.approved_by_user:
        return False, "Candidatura ainda nao aprovada por voce (portao 2)."
    if settings.require_manual_approval and not application.submission_confirmed_by_user:
        return False, ("Confirmacao explicita de envio ausente (portao 3). "
                       "Use [Confirmar envio] no dashboard.")
    if application.applied_at is not None:
        return False, f"Candidatura #{application.id} ja foi registrada como enviada."
    return True, "Todos os portoes de aprovacao foram cumpridos."


def confirm_submission(session: Session, application: Application) -> Application:
    """Portao 3: voce confirmou explicitamente o envio.

    Isso NAO envia nada. Apenas registra sua autorizacao. O envio continua
    sendo feito por voce, no navegador.
    """
    if not application.approved_by_user:
        raise ApprovalRequired(
            "Aprove a candidatura (portao 2) antes de confirmar o envio."
        )
    settings = get_settings()
    if settings.dry_run:
        raise ApprovalRequired(
            "DRY_RUN=true: confirmacao de envio recusada. Nada foi enviado. "
            "Altere DRY_RUN=false no .env se realmente quiser habilitar envios."
        )
    application.submission_confirmed_by_user = True
    application.submission_confirmed_at = _utcnow_naive()
    session.flush()
    log.info("Envio da candidatura #%s confirmado por voce.", application.id)
    return application


def mark_as_applied(
    session: Session,
    application: Application,
    submitted_via: str = "manual",
    notes: str = "",
) -> Application:
    """Registra que a candidatura FOI enviada (por voce).

    Em DRY_RUN, o registro manual continua permitido: voce pode ter aplicado
    no navegador e querer registrar isso. O que DRY_RUN bloqueia e o sistema
    enviar — nao voce registrar o que fez.
    """
    if application.applied_at is not None:
        raise DuplicateApplication(
            f"Candidatura #{application.id} ja marcada como enviada em "
            f"{application.applied_at:%Y-%m-%d %H:%M}."
        )
    job = session.get(Job, application.job_id)
    if job is not None:
        already = repo.has_applied_to_company_position(session, job)
        if already is not None and already.id != application.id:
            raise DuplicateApplication(
                f"Ja existe candidatura enviada (#{already.id}) para esta posicao."
            )
    if not application.approved_by_user:
        raise ApprovalRequired(
            "Aprove a candidatura antes de marcar como enviada — assim o registro "
            "reflete um material que voce revisou."
        )

    application.applied_at = _utcnow_naive()
    application.status = JobStatus.APPLIED.value
    application.submitted_via = submitted_via
    if notes:
        application.notes = (application.notes + "\n" + notes).strip()
    if job is not None:
        repo.set_job_status(session, job, JobStatus.APPLIED, force=True)
    session.flush()
    log.info("Candidatura #%s registrada como ENVIADA via '%s'.", application.id, submitted_via)
    return application


def update_stage(
    session: Session,
    application: Application,
    new_status: JobStatus,
    result: str = "",
    stage: str = "",
) -> Application:
    """Avanca o acompanhamento do processo (screening, entrevista, oferta...)."""
    job = session.get(Job, application.job_id)
    if job is not None:
        repo.set_job_status(session, job, new_status, force=True)
    application.status = new_status.value
    if stage:
        application.interview_stage = stage
    if result:
        application.result = result
    session.flush()
    return application
