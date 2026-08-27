"""Respostas a perguntas de formulario de candidatura.

Regra: uma resposta so e proposta como CONFIRMADA quando pode ser derivada
DIRETAMENTE de um dado declarado. Qualquer duvida -> needs_confirmation=True,
e o dashboard exige [CONFIRMAR] / [EDITAR] antes de qualquer uso.

Perguntas sensiveis (salario, etnia, genero, deficiencia, visto, data de
nascimento) NUNCA sao respondidas automaticamente.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from app.crawler.extract import detect_technologies, normalize_text
from app.formatting import format_brl
from app.models.profile import Profile


@dataclass
class AnsweredQuestion:
    question: str
    suggested_answer: str
    source_of_truth: str
    confidence: str            # high | medium | low
    needs_confirmation: bool
    reason: str = ""

    def as_dict(self) -> dict:
        return {
            "question": self.question,
            "suggested_answer": self.suggested_answer,
            "source_of_truth": self.source_of_truth,
            "confidence": self.confidence,
            "needs_confirmation": self.needs_confirmation,
            "reason": self.reason,
        }


#: Temas que exigem decisao pessoal ou tem implicacao legal.
SENSITIVE_TOPICS: dict[str, list[str]] = {
    "salario": ["salary expectation", "expected salary", "pretensao salarial",
                "desired salary", "compensation expectation", "current salary",
                "salario atual", "faixa salarial desejada"],
    "diversidade": ["gender", "genero", "race", "raca", "etnia", "ethnicity",
                    "sexual orientation", "orientacao sexual", "disability",
                    "deficiencia", "pcd", "veteran", "religiao", "religion"],
    "dados_pessoais": ["date of birth", "data de nascimento", "cpf", "rg", "ssn",
                       "social security", "idade", "age", "estado civil",
                       "marital status", "numero de dependentes"],
    "imigracao": ["visa", "visto", "sponsorship", "work permit", "green card",
                  "citizenship", "cidadania", "authorized to work in the united states",
                  "require sponsorship"],
    "referencias": ["reference", "referencia profissional", "contact of former manager"],
    "notice": ["notice period", "aviso previo", "when can you start",
               "quando pode comecar", "data de inicio", "start date"],
}

_YEARS_QUESTION = re.compile(
    r"(?:how many years|quantos anos|years of experience|anos de experiencia)", re.I
)
_YESNO_QUESTION = re.compile(
    r"^\s*(?:do you|are you|have you|can you|will you|voce (?:tem|possui|esta|pode|aceita))\b", re.I
)


def _sensitive_topic(question: str) -> str | None:
    blob = normalize_text(question)
    for topic, markers in SENSITIVE_TOPICS.items():
        if any(normalize_text(m) in blob for m in markers):
            return topic
    return None


def _blocked(question: str, topic: str, hint: str = "") -> AnsweredQuestion:
    return AnsweredQuestion(
        question=question,
        suggested_answer=hint,
        source_of_truth="",
        confidence="low",
        needs_confirmation=True,
        reason=(f"Pergunta sensivel (tema: {topic}). O agente NAO responde "
                f"automaticamente. Preencha voce mesmo."),
    )


def answer_question(question: str, profile: Profile) -> AnsweredQuestion:
    """Propoe uma resposta baseada SOMENTE no perfil declarado."""
    if not question or not question.strip():
        return AnsweredQuestion(question, "", "", "low", True, "Pergunta vazia.")

    q = question.strip()
    blob = normalize_text(q)

    # --- 1. temas sensiveis: bloqueio incondicional ---------------------
    topic = _sensitive_topic(q)
    if topic:
        hint = ""
        if topic == "salario" and profile.preferences.target_salary_brl_month:
            hint = (f"(Seu alvo configurado: "
                    f"{format_brl(profile.preferences.target_salary_brl_month)}/mes. "
                    f"Decida o valor a informar.)")
        elif topic == "imigracao" and profile.identity.work_authorization:
            hint = f"(Seu perfil declara: {profile.identity.work_authorization})"
        return _blocked(q, topic, hint)

    # --- 2. "quantos anos de X?" ----------------------------------------
    if _YEARS_QUESTION.search(q):
        techs = detect_technologies(q)
        if len(techs) == 1:
            tech = techs[0]
            years = profile.years_for(tech)
            if years is not None:
                return AnsweredQuestion(
                    question=q,
                    suggested_answer=f"{years:g}",
                    source_of_truth=f"profile.yaml -> experience.years_by_technology.{tech} = {years:g}",
                    confidence="high",
                    needs_confirmation=False,
                )
            in_profile = tech in profile.known_technologies()
            return AnsweredQuestion(
                question=q,
                suggested_answer="",
                source_of_truth="",
                confidence="low",
                needs_confirmation=True,
                reason=(f"'{tech}' {'aparece no seu perfil, mas' if in_profile else 'nao aparece no seu perfil e'} "
                        f"nao tem anos declarados em experience.years_by_technology. "
                        f"Nao vou chutar um numero."),
            )
        if len(techs) > 1:
            return AnsweredQuestion(
                question=q, suggested_answer="", source_of_truth="", confidence="low",
                needs_confirmation=True,
                reason=(f"A pergunta menciona varias tecnologias ({', '.join(techs)}). "
                        f"Nao esta claro sobre qual responder."),
            )
        # Sem tecnologia identificada: assume experiencia total, mas confirma.
        return AnsweredQuestion(
            question=q,
            suggested_answer=f"{profile.experience.total_years:g}",
            source_of_truth=f"profile.yaml -> experience.total_years = {profile.experience.total_years:g}",
            confidence="medium",
            needs_confirmation=True,
            reason="Interpretei como experiencia total. Confirme se a pergunta e sobre isso.",
        )

    # --- 3. dados de identidade diretos ---------------------------------
    identity_map: list[tuple[list[str], str, str]] = [
        (["full name", "nome completo", "your name", "seu nome"],
         profile.identity.full_name, "identity.full_name"),
        (["email address", "e-mail", "email"], profile.identity.email, "identity.email"),
        (["phone", "telefone", "celular", "whatsapp"], profile.identity.phone, "identity.phone"),
        (["linkedin"], profile.identity.linkedin, "identity.linkedin"),
        (["github", "portfolio url", "repositorio"], profile.identity.github, "identity.github"),
        (["current company", "empresa atual"], profile.current.company, "current.company"),
        (["current title", "current role", "cargo atual"], profile.current.title, "current.title"),
        (["where are you located", "your location", "sua localizacao", "cidade", "country", "pais"],
         profile.identity.location, "identity.location"),
    ]
    for markers, value, field in identity_map:
        if any(normalize_text(m) in blob for m in markers):
            if value:
                return AnsweredQuestion(
                    question=q, suggested_answer=value,
                    source_of_truth=f"profile.yaml -> {field}",
                    confidence="high", needs_confirmation=False,
                )
            return AnsweredQuestion(
                question=q, suggested_answer="", source_of_truth="", confidence="low",
                needs_confirmation=True,
                reason=f"O campo '{field}' esta vazio em profile.yaml. Preencha-o primeiro.",
            )

    # --- 4. idiomas ------------------------------------------------------
    if any(m in blob for m in ["english level", "nivel de ingles", "proficiency in english",
                               "fluent in english", "ingles"]):
        english = next(
            (lang for lang in profile.identity.languages
             if normalize_text(lang.language) in ("ingles", "english")), None
        )
        if english and english.level:
            return AnsweredQuestion(
                question=q, suggested_answer=english.level,
                source_of_truth="profile.yaml -> identity.languages (Ingles)",
                confidence="high", needs_confirmation=False,
            )
        return AnsweredQuestion(
            question=q, suggested_answer="", source_of_truth="", confidence="low",
            needs_confirmation=True,
            reason="Seu nivel de ingles nao esta declarado em profile.yaml. Preencha-o.",
        )

    # --- 5. remoto / modalidade -----------------------------------------
    if any(m in blob for m in ["work remotely", "trabalhar remoto", "remote work",
                               "comfortable working remotely", "aceita remoto"]):
        return AnsweredQuestion(
            question=q, suggested_answer="Sim" if profile.preferences.remote_only else "",
            source_of_truth="profile.yaml -> preferences.remote_only",
            confidence="high" if profile.preferences.remote_only else "low",
            needs_confirmation=not profile.preferences.remote_only,
        )

    # --- 6. sim/nao generico: nunca chutamos ----------------------------
    if _YESNO_QUESTION.search(q):
        return AnsweredQuestion(
            question=q, suggested_answer="", source_of_truth="", confidence="low",
            needs_confirmation=True,
            reason=("Pergunta de sim/nao sem correspondencia direta no seu perfil. "
                    "Um 'sim' errado numa candidatura e grave; responda voce."),
        )

    # --- 7. fallback -----------------------------------------------------
    return AnsweredQuestion(
        question=q, suggested_answer="", source_of_truth="", confidence="low",
        needs_confirmation=True,
        reason=("Nao encontrei base factual no seu perfil para responder isso. "
                "Escreva a resposta ou adicione o dado em profile.yaml."),
    )


def answer_all(questions: list[str], profile: Profile) -> list[AnsweredQuestion]:
    return [answer_question(q, profile) for q in questions if q and q.strip()]
