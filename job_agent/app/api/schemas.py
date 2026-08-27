"""Modelos de request/response da API."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    sources: list[str] | None = Field(default=None, description="IDs de fontes; None = todas habilitadas")


class ManualJobRequest(BaseModel):
    title: str
    company: str = ""
    url: str = ""
    description: str = ""
    location: str = ""
    salary: str = ""
    posted_at: datetime | None = Field(
        default=None, description="Deixe vazio se nao souber. Nao chute."
    )


class PrepareRequest(BaseModel):
    questions: list[str] = Field(default_factory=list)
    language: str = "pt"


class QuestionsRequest(BaseModel):
    questions: list[str]


class ConfirmAnswerRequest(BaseModel):
    final_answer: str


class NoteRequest(BaseModel):
    body: str


class MarkAppliedRequest(BaseModel):
    submitted_via: str = "manual"
    notes: str = ""


class StageRequest(BaseModel):
    status: str
    stage: str = ""
    result: str = ""


class InterviewRequest(BaseModel):
    application_id: int
    date: datetime | None = None
    type: str = ""
    questions: str = ""
    notes: str = ""
    result: str = ""


class AnswerQuestionRequest(BaseModel):
    question: str
