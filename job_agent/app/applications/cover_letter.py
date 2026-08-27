"""Cover letter e mensagem para recrutador.

Duas vias:
  * template deterministico (sempre disponivel, so usa fatos do perfil);
  * LLM opcional, cujo resultado passa OBRIGATORIAMENTE pelo guard.

Se o guard bloquear a saida do LLM, caimos no template. Nunca entregamos
texto com afirmacao sem base.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.crawler.extract import display_name
from app.database.schema import Job
from app.llm import guard
from app.llm.client import LLMUnavailable, get_provider
from app.logging_setup import get_logger
from app.models.profile import Profile

log = get_logger("cover_letter")

#: Constante para uso dentro de f-strings (Python 3.11 nao aceita
#: aspas duplas aninhadas em f-strings delimitadas por aspas duplas).
LANG_EN = "en"


@dataclass
class GeneratedText:
    body: str
    generated_by: str          # "template" | "llm"
    guard_summary: str = ""
    guard_ok: bool = True
    fallback_reason: str = ""


def _matched_techs(job: Job, profile: Profile) -> list[str]:
    mine = profile.known_technologies()
    return [t for t in job.technologies_list() if t in mine]


def _growth_techs(job: Job, profile: Profile) -> list[str]:
    mine = profile.known_technologies()
    return [t for t in job.technologies_list() if t in profile.growth_technologies() and t not in mine]


def _fmt_list(items: list[str], language: str = "pt") -> str:
    """Lista legivel, com a grafia correta de cada tecnologia."""
    names = [display_name(i) for i in items]
    if not names:
        return ""
    if len(names) == 1:
        return names[0]
    conjunction = " and " if language.startswith("en") else " e "
    return ", ".join(names[:-1]) + conjunction + names[-1]


# --------------------------------------------------------------------------
def template_cover_letter(job: Job, profile: Profile, language: str = "pt") -> str:
    """Cover letter montada so com fatos declarados. Sem LLM, sem invencao."""
    name = profile.identity.full_name or "[SEU NOME]"
    matched = _matched_techs(job, profile)
    growth = _growth_techs(job, profile)
    highlights = profile.experience.highlights[:3]
    company = job.company or "a empresa"
    title = job.title or "a vaga"

    if language.startswith("en"):
        parts = [
            f"Hello,",
            "",
            f"I'm writing to apply for the {title} position at {company}.",
        ]
        if profile.current.title and profile.current.company:
            parts.append(
                f"I currently work as {profile.current.title} at {profile.current.company}, "
                f"with {profile.experience.total_years:g} years of professional experience "
                f"in software engineering."
            )
        if matched:
            parts.append(f"I work directly with {_fmt_list(matched, LANG_EN)}, which the role requires.")
        if highlights:
            parts.append("In practice, that has meant: " + " ".join(highlights))
        if growth:
            parts.append(
                f"I do not yet have hands-on experience with {_fmt_list(growth, LANG_EN)}, and "
                f"learning them is exactly the direction I want my career to take — "
                f"which is part of why this role interests me."
            )
        parts += ["", "Thank you for your time and consideration.", "", name]
    else:
        parts = ["Olá,", "", f"Escrevo para me candidatar à vaga de {title} na {company}."]
        if profile.current.title and profile.current.company:
            parts.append(
                f"Atualmente atuo como {profile.current.title} na {profile.current.company}, "
                f"com {profile.experience.total_years:g} anos de experiência profissional em "
                f"engenharia de software."
            )
        if matched:
            parts.append(f"Trabalho diretamente com {_fmt_list(matched)}, tecnologias que a vaga pede.")
        if highlights:
            parts.append("Na prática, isso significou: " + " ".join(highlights))
        if growth:
            parts.append(
                f"Ainda não tenho experiência prática com {_fmt_list(growth)}, e "
                f"aprender essas tecnologias é exatamente a direção que quero dar à "
                f"minha carreira — parte do meu interesse nesta posição."
            )
        parts += ["", "Agradeço a atenção e fico à disposição.", "", name]

    return "\n".join(p for p in parts if p is not None)


def template_recruiter_message(job: Job, profile: Profile, language: str = "pt") -> str:
    """Mensagem curta (LinkedIn/e-mail) para recrutador."""
    matched = _matched_techs(job, profile)[:3]
    name = profile.identity.full_name or "[SEU NOME]"
    if language.startswith("en"):
        lines = [
            f"Hi! I saw the {job.title} opening at {job.company} and I'd like to apply.",
            f"I'm a {profile.current.title} at {profile.current.company} with "
            f"{profile.experience.total_years:g} years of experience.",
        ]
        if matched:
            lines.append(f"My day-to-day work involves {_fmt_list(matched, LANG_EN)}.")
        lines.append("Happy to share more details. Thank you!")
        lines.append(f"— {name}")
    else:
        lines = [
            f"Olá! Vi a vaga de {job.title} na {job.company} e gostaria de me candidatar.",
            f"Sou {profile.current.title} na {profile.current.company}, com "
            f"{profile.experience.total_years:g} anos de experiência.",
        ]
        if matched:
            lines.append(f"No dia a dia trabalho com {_fmt_list(matched)}.")
        lines.append("Fico à disposição para mais detalhes. Obrigado!")
        lines.append(f"— {name}")
    return "\n".join(lines)


# --------------------------------------------------------------------------
def _facts_block(profile: Profile, job: Job) -> str:
    """Bloco de fatos entregue ao LLM. Ele NAO pode sair daqui."""
    years = "; ".join(f"{k}: {v:g} anos" for k, v in profile.experience.years_by_technology.items())
    languages = "; ".join(f"{l.language}: {l.level or 'nao declarado'}" for l in profile.identity.languages)
    return f"""
=== FATOS DO CANDIDATO (unica fonte permitida) ===
Nome: {profile.identity.full_name}
Localizacao: {profile.identity.location}
Cargo atual: {profile.current.title} na {profile.current.company}
Experiencia total: {profile.experience.total_years:g} anos
Anos por tecnologia: {years or "nao declarado"}
Tecnologias que domina: {", ".join(sorted(profile.known_technologies())) or "nao declarado"}
Idiomas: {languages or "nao declarado"}
Destaques reais: {" | ".join(profile.experience.highlights) or "nao declarado"}
Formacao: {" | ".join(profile.education) or "nao declarado"}
Certificacoes: {" | ".join(profile.certifications) or "nenhuma declarada"}
Objetivo de carreira: {profile.career_goals.narrative}
Tecnologias que QUER APRENDER (nao domina ainda): {", ".join(sorted(profile.growth_technologies())) or "nenhuma"}

=== VAGA ===
Titulo: {job.title}
Empresa: {job.company}
Local/modalidade: {job.location} / {job.remote}
Tecnologias pedidas: {", ".join(job.technologies_list()) or "nao identificadas"}
Descricao (trecho): {(job.description or "")[:2500]}
""".strip()


def _generate_with_llm(prompt: str, profile: Profile, max_tokens: int) -> tuple[str, str]:
    """Gera com LLM e valida. Retorna (texto, motivo_de_falha)."""
    provider = get_provider()
    try:
        text = provider.complete(prompt, max_tokens=max_tokens)
    except LLMUnavailable as exc:
        return "", str(exc)
    except Exception as exc:
        log.warning("Falha na chamada ao LLM: %s", type(exc).__name__)
        return "", f"Erro no provedor de LLM: {type(exc).__name__}"

    if not text.strip():
        return "", "O LLM retornou texto vazio."

    result = guard.check_text(text, profile, strict=True)
    if not result.ok:
        log.warning("Saida do LLM bloqueada pelo guard; usando template.")
        return "", "Guard anti-invencao bloqueou a saida do LLM:\n" + result.summary()
    return text, ""


def generate_cover_letter(job: Job, profile: Profile, language: str = "pt") -> GeneratedText:
    """Cover letter: tenta LLM, valida, cai no template se necessario."""
    prompt = (
        _facts_block(profile, job)
        + f"\n\n=== TAREFA ===\nEscreva uma cover letter em "
          f"{'ingles' if language.startswith('en') else 'portugues'}, de 3 a 4 paragrafos "
          f"curtos. Conecte apenas a experiencia REAL do candidato aos requisitos da vaga. "
          f"Se a vaga pede algo que ele nao tem, nao mencione como se tivesse; no maximo "
          f"expresse interesse em aprender, e somente se constar na lista de tecnologias "
          f"que quer aprender. Nao invente metricas nem resultados numericos. "
          f"Nao use superlativos. Assine com o nome dele."
    )
    llm_text, failure = _generate_with_llm(prompt, profile, max_tokens=1200)
    if llm_text:
        check = guard.check_text(llm_text, profile, strict=True)
        return GeneratedText(llm_text, "llm", check.summary(), check.ok)

    body = template_cover_letter(job, profile, language)
    check = guard.check_text(body, profile, strict=True)
    return GeneratedText(body, "template", check.summary(), check.ok, fallback_reason=failure)


def generate_recruiter_message(job: Job, profile: Profile, language: str = "pt") -> GeneratedText:
    """Mensagem curta para recrutador."""
    prompt = (
        _facts_block(profile, job)
        + f"\n\n=== TAREFA ===\nEscreva uma mensagem curta (maximo 5 linhas) para um "
          f"recrutador em {'ingles' if language.startswith('en') else 'portugues'}. "
          f"Direta, sem clichê, apenas com fatos reais do candidato."
    )
    llm_text, failure = _generate_with_llm(prompt, profile, max_tokens=400)
    if llm_text:
        check = guard.check_text(llm_text, profile, strict=True)
        return GeneratedText(llm_text, "llm", check.summary(), check.ok)

    body = template_recruiter_message(job, profile, language)
    check = guard.check_text(body, profile, strict=True)
    return GeneratedText(body, "template", check.summary(), check.ok, fallback_reason=failure)
