"""Enums do dominio: status da vaga/candidatura, modalidade, nivel, recencia."""
from __future__ import annotations

from enum import Enum


class JobStatus(str, Enum):
    """Ciclo de vida completo, do descobrimento ao resultado."""
    FOUND = "FOUND"
    REVIEW = "REVIEW"
    APPROVED = "APPROVED"
    READY_TO_APPLY = "READY_TO_APPLY"
    APPLIED = "APPLIED"
    SCREENING = "SCREENING"
    INTERVIEW = "INTERVIEW"
    TECHNICAL_INTERVIEW = "TECHNICAL_INTERVIEW"
    OFFER = "OFFER"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"
    IGNORED = "IGNORED"
    DUPLICATE = "DUPLICATE"


#: Transicoes permitidas. Guardrail central do fluxo de aprovacao:
#: nao existe caminho de FOUND direto para APPLIED.
ALLOWED_TRANSITIONS: dict[JobStatus, set[JobStatus]] = {
    JobStatus.FOUND: {JobStatus.REVIEW, JobStatus.IGNORED, JobStatus.DUPLICATE},
    JobStatus.REVIEW: {JobStatus.APPROVED, JobStatus.IGNORED, JobStatus.FOUND},
    JobStatus.APPROVED: {JobStatus.READY_TO_APPLY, JobStatus.IGNORED, JobStatus.REVIEW},
    JobStatus.READY_TO_APPLY: {JobStatus.APPLIED, JobStatus.WITHDRAWN, JobStatus.APPROVED},
    JobStatus.APPLIED: {JobStatus.SCREENING, JobStatus.INTERVIEW, JobStatus.REJECTED, JobStatus.WITHDRAWN},
    JobStatus.SCREENING: {JobStatus.INTERVIEW, JobStatus.TECHNICAL_INTERVIEW, JobStatus.REJECTED, JobStatus.WITHDRAWN},
    JobStatus.INTERVIEW: {JobStatus.TECHNICAL_INTERVIEW, JobStatus.OFFER, JobStatus.REJECTED, JobStatus.WITHDRAWN},
    JobStatus.TECHNICAL_INTERVIEW: {JobStatus.INTERVIEW, JobStatus.OFFER, JobStatus.REJECTED, JobStatus.WITHDRAWN},
    JobStatus.OFFER: {JobStatus.APPLIED, JobStatus.REJECTED, JobStatus.WITHDRAWN},
    JobStatus.REJECTED: set(),
    JobStatus.WITHDRAWN: set(),
    JobStatus.IGNORED: {JobStatus.FOUND, JobStatus.REVIEW},
    JobStatus.DUPLICATE: {JobStatus.FOUND},
}

#: Estagios que contam como "em processo ativo" nas metricas.
ACTIVE_PIPELINE = {
    JobStatus.APPLIED, JobStatus.SCREENING, JobStatus.INTERVIEW,
    JobStatus.TECHNICAL_INTERVIEW, JobStatus.OFFER,
}


class Modality(str, Enum):
    REMOTE = "remote"
    HYBRID = "hybrid"
    ONSITE = "onsite"
    UNKNOWN = "unknown"


class Seniority(str, Enum):
    INTERN = "intern"
    JUNIOR = "junior"
    ASSOCIATE = "associate"
    MID = "mid"
    SENIOR = "senior"
    STAFF = "staff"
    PRINCIPAL = "principal"
    LEAD = "lead"
    MANAGER = "manager"
    UNKNOWN = "unknown"


#: Ordem crescente de senioridade, para medir distancia ao nivel desejado.
SENIORITY_RANK: dict[Seniority, int] = {
    Seniority.INTERN: 0,
    Seniority.JUNIOR: 1,
    Seniority.ASSOCIATE: 2,
    Seniority.MID: 3,
    Seniority.SENIOR: 4,
    Seniority.STAFF: 5,
    Seniority.PRINCIPAL: 6,
    Seniority.LEAD: 5,
    Seniority.MANAGER: 6,
    Seniority.UNKNOWN: 3,
}


class Recency(str, Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    ACCEPTABLE = "acceptable"
    LOW = "low"          # acima do limite de deprioritizacao
    IGNORE = "ignore"    # acima do limite de ignorar
    UNKNOWN = "unknown"


class Recommendation(str, Enum):
    EXCELENTE = "EXCELENTE"
    MUITO_BOA = "MUITO BOA"
    BOA_AVALIAR = "BOA / AVALIAR"
    STRETCH = "STRETCH"
    NAO_PRIORITARIA = "NAO PRIORITARIA"
