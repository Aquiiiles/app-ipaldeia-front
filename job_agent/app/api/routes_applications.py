"""Rotas de candidatura. Todo endpoint aqui respeita os tres portoes."""
from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_profile
from app.api.schemas import (
    AnswerQuestionRequest, ConfirmAnswerRequest, InterviewRequest,
    MarkAppliedRequest, PrepareRequest, QuestionsRequest, StageRequest,
)
from app.applications import service as app_service
from app.applications.questions import answer_question
from app.database import repository as repo
from app.database.schema import Application, ApplicationAnswer
from app.models.enums import JobStatus
from app.models.profile import Profile
from app.settings import get_settings

router = APIRouter(prefix="/api/applications", tags=["applications"])


def application_to_dict(application: Application, detailed: bool = False) -> dict:
    can_submit, reason = app_service.check_can_submit(application)
    data = {
        "id": application.id,
        "job_id": application.job_id,
        "status": application.status,
        "created_at": application.created_at.strftime("%Y-%m-%d %H:%M") if application.created_at else None,
        "applied_at": application.applied_at.strftime("%Y-%m-%d %H:%M") if application.applied_at else None,
        "resume_version": application.resume_version,
        "interview_stage": application.interview_stage,
        "result": application.result,
        "approved_by_user": application.approved_by_user,
        "submission_confirmed_by_user": application.submission_confirmed_by_user,
        "submitted_via": application.submitted_via,
        "can_submit": can_submit,
        "submit_blocked_reason": "" if can_submit else reason,
        "pending_answers": sum(1 for a in application.answers if a.needs_confirmation),
    }
    if detailed:
        data["cover_letter"] = application.cover_letter
        data["recruiter_message"] = application.recruiter_message
        data["resume_path"] = application.resume_path
        data["notes"] = application.notes
        data["tailoring"] = json.loads(application.tailoring_suggestions or "{}")
        data["answers"] = [
            {
                "id": a.id, "question": a.question,
                "suggested_answer": a.suggested_answer, "final_answer": a.final_answer,
                "source_of_truth": a.source_of_truth, "confidence": a.confidence,
                "needs_confirmation": a.needs_confirmation,
                "confirmed_by_user": a.confirmed_by_user,
            }
            for a in application.answers
        ]
        data["interviews"] = [
            {"id": i.id, "type": i.type, "result": i.result,
             "date": i.date.strftime("%Y-%m-%d %H:%M") if i.date else None,
             "questions": i.questions, "notes": i.notes}
            for i in application.interviews
        ]
    return data


def _get_application(db: Session, application_id: int) -> Application:
    application = repo.get_application(db, application_id)
    if application is None:
        raise HTTPException(404, f"Candidatura {application_id} nao encontrada.")
    return application


@router.get("")
def list_applications(db: Session = Depends(get_db)) -> dict:
    applications = repo.list_applications(db)
    return {"count": len(applications),
            "applications": [application_to_dict(a) for a in applications]}


@router.get("/{application_id}")
def get_application(application_id: int, db: Session = Depends(get_db)) -> dict:
    return application_to_dict(_get_application(db, application_id), detailed=True)


@router.post("/prepare/{job_id}")
def prepare(
    job_id: int,
    payload: PrepareRequest,
    db: Session = Depends(get_db),
    profile: Profile = Depends(get_profile),
) -> dict:
    """[Preparar candidatura] — gera material. NAO envia, nem com DRY_RUN=false."""
    job = repo.get_job(db, job_id)
    if job is None:
        raise HTTPException(404, f"Vaga {job_id} nao encontrada.")
    try:
        prepared = app_service.prepare_application(
            db, job, profile, questions=payload.questions, language=payload.language
        )
    except app_service.ApprovalRequired as exc:
        raise HTTPException(409, str(exc)) from exc
    except app_service.DuplicateApplication as exc:
        raise HTTPException(409, str(exc)) from exc
    return prepared.__dict__


@router.post("/{application_id}/approve")
def approve(application_id: int, db: Session = Depends(get_db)) -> dict:
    """Portao 2: voce aprovou o MATERIAL preparado."""
    application = _get_application(db, application_id)
    try:
        app_service.approve_application(db, application)
    except app_service.ApprovalRequired as exc:
        raise HTTPException(409, str(exc)) from exc
    can_submit, reason = app_service.check_can_submit(application)
    return {"application_id": application_id, "approved": True,
            "can_submit": can_submit, "next_step": reason}


@router.post("/{application_id}/questions")
def add_questions(
    application_id: int,
    payload: QuestionsRequest,
    db: Session = Depends(get_db),
    profile: Profile = Depends(get_profile),
) -> dict:
    """Adiciona perguntas do formulario e propoe respostas fundamentadas."""
    application = _get_application(db, application_id)
    answered = app_service.add_questions(db, application, payload.questions, profile)
    return {"application_id": application_id,
            "answers": [a.as_dict() for a in answered],
            "pending": sum(1 for a in answered if a.needs_confirmation)}


@router.post("/answers/{answer_id}/confirm")
def confirm_answer(
    answer_id: int, payload: ConfirmAnswerRequest, db: Session = Depends(get_db)
) -> dict:
    """[CONFIRMAR] / [EDITAR] — sua palavra final sobre uma resposta."""
    answer = db.get(ApplicationAnswer, answer_id)
    if answer is None:
        raise HTTPException(404, f"Resposta {answer_id} nao encontrada.")
    try:
        app_service.confirm_answer(db, answer, payload.final_answer)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return {"answer_id": answer_id, "final_answer": answer.final_answer, "confirmed": True}


@router.post("/{application_id}/confirm-submission")
def confirm_submission(application_id: int, db: Session = Depends(get_db)) -> dict:
    """Portao 3: sua autorizacao explicita de envio. NAO envia por si."""
    application = _get_application(db, application_id)
    try:
        app_service.confirm_submission(db, application)
    except app_service.ApprovalRequired as exc:
        raise HTTPException(403, str(exc)) from exc
    return {
        "application_id": application_id,
        "submission_authorized": True,
        "reminder": ("O agente NAO envia por voce. Abra a vaga, cole o material revisado "
                     "e clique em enviar. Depois use [Marcar como aplicada]."),
    }


@router.post("/{application_id}/mark-applied")
def mark_applied(
    application_id: int, payload: MarkAppliedRequest, db: Session = Depends(get_db)
) -> dict:
    """[Marcar como aplicada] — registra que VOCE enviou."""
    application = _get_application(db, application_id)
    try:
        app_service.mark_as_applied(
            db, application, submitted_via=payload.submitted_via, notes=payload.notes
        )
    except app_service.DuplicateApplication as exc:
        raise HTTPException(409, str(exc)) from exc
    except app_service.ApprovalRequired as exc:
        raise HTTPException(403, str(exc)) from exc
    return {"application_id": application_id, "status": application.status,
            "applied_at": application.applied_at.strftime("%Y-%m-%d %H:%M")}


@router.post("/{application_id}/stage")
def update_stage(
    application_id: int, payload: StageRequest, db: Session = Depends(get_db)
) -> dict:
    """Acompanhamento: screening, entrevista, oferta, rejeicao..."""
    application = _get_application(db, application_id)
    try:
        status = JobStatus(payload.status)
    except ValueError as exc:
        valid = ", ".join(s.value for s in JobStatus)
        raise HTTPException(400, f"Status invalido. Use um de: {valid}") from exc
    app_service.update_stage(db, application, status, result=payload.result, stage=payload.stage)
    return {"application_id": application_id, "status": application.status}


@router.post("/interviews")
def add_interview(payload: InterviewRequest, db: Session = Depends(get_db)) -> dict:
    application = _get_application(db, payload.application_id)
    interview = repo.add_interview(
        db, application, date=payload.date, type_=payload.type,
        questions=payload.questions, notes=payload.notes, result=payload.result,
    )
    return {"interview_id": interview.id, "application_id": application.id}


@router.get("/interviews/all")
def list_interviews(db: Session = Depends(get_db)) -> dict:
    interviews = repo.list_interviews(db)
    return {"count": len(interviews), "interviews": [
        {"id": i.id, "application_id": i.application_id, "type": i.type,
         "date": i.date.strftime("%Y-%m-%d %H:%M") if i.date else None,
         "result": i.result, "questions": i.questions, "notes": i.notes}
        for i in interviews
    ]}


# --------------------------------------------------------------------------
questions_router = APIRouter(prefix="/api/questions", tags=["questions"])


@questions_router.post("/answer")
def answer(payload: AnswerQuestionRequest, profile: Profile = Depends(get_profile)) -> dict:
    """Testa uma pergunta isolada, sem criar candidatura.

    Util para ver se o agente tem base factual para responder algo.
    """
    return answer_question(payload.question, profile).as_dict()
