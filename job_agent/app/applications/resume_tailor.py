"""Personalizacao de curriculo por vaga.

O que o sistema FAZ:
  * sugere o que DESTACAR / REORDENAR do que voce ja tem;
  * aponta lacunas reais em relacao a vaga;
  * gera um arquivo derivado (Markdown) com uma secao de destaques.

O que o sistema NUNCA FAZ:
  * adicionar tecnologia, cargo, projeto ou certificacao que nao esteja no
    seu perfil/CV;
  * alterar o seu CV original — ele fica intacto na pasta resumes/.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from app.crawler.extract import display_name, normalize_text
from app.database.schema import Job
from app.logging_setup import get_logger
from app.models.profile import Profile
from app.settings import get_settings

log = get_logger("resume_tailor")


@dataclass
class TailoringSuggestion:
    kind: str          # DESTACAR | REORDENAR | LACUNA | ATENCAO
    message: str
    evidence: str = ""

    def as_dict(self) -> dict:
        return {"kind": self.kind, "message": self.message, "evidence": self.evidence}


@dataclass
class TailoredResume:
    suggestions: list[TailoringSuggestion] = field(default_factory=list)
    highlights: list[str] = field(default_factory=list)
    gaps: list[str] = field(default_factory=list)
    version_name: str = ""
    path: str = ""
    original_path: str = ""

    def as_dict(self) -> dict:
        return {
            "suggestions": [s.as_dict() for s in self.suggestions],
            "highlights": self.highlights,
            "gaps": self.gaps,
            "version_name": self.version_name,
            "path": self.path,
            "original_path": self.original_path,
        }


def _evidence_for(tech: str, profile: Profile) -> str:
    """Frase REAL do perfil/CV que comprova a tecnologia. Vazio se nao houver."""
    needle = normalize_text(tech)
    pool = list(profile.experience.highlights)
    if profile.resume:
        pool += profile.resume.experience_entries + profile.resume.achievements + profile.resume.projects
    for entry in pool:
        if needle and needle in normalize_text(entry):
            return entry
    return ""


def suggest_tailoring(job: Job, profile: Profile) -> TailoredResume:
    """Sugestoes de personalizacao. Somente reorganizacao de fatos existentes."""
    mine = profile.known_technologies()
    growth = profile.growth_technologies()
    asked = job.technologies_list()

    result = TailoredResume(original_path=(profile.resume.source_file if profile.resume else ""))

    matched = [t for t in asked if t in mine]
    missing = [t for t in asked if t not in mine]

    for tech in matched:
        evidence = _evidence_for(tech, profile)
        years = profile.years_for(tech)
        detail = f" ({years:g} anos declarados)" if years is not None else ""
        result.suggestions.append(TailoringSuggestion(
            kind="DESTACAR",
            message=f"Para esta vaga, vale destacar sua experiencia com {display_name(tech)}{detail}.",
            evidence=evidence,
        ))
        if evidence:
            result.highlights.append(evidence)

    if matched:
        result.suggestions.append(TailoringSuggestion(
            kind="REORDENAR",
            message=("Coloque no topo da secao de habilidades, nesta ordem: "
                     + ", ".join(display_name(t) for t in matched) + "."),
        ))

    for tech in missing:
        if tech in growth:
            result.suggestions.append(TailoringSuggestion(
                kind="LACUNA",
                message=(f"A vaga pede {display_name(tech)}, que voce ainda nao tem. Esta na sua lista "
                         f"de objetivos: pode mencionar interesse em aprender, mas NAO "
                         f"listar como experiencia."),
            ))
        else:
            result.suggestions.append(TailoringSuggestion(
                kind="LACUNA",
                message=(f"A vaga pede {display_name(tech)}, ausente do seu perfil/CV. Nao inclua no "
                         f"curriculo: seria informacao falsa."),
            ))
        result.gaps.append(tech)

    if not matched:
        result.suggestions.append(TailoringSuggestion(
            kind="ATENCAO",
            message=("Nenhuma tecnologia da vaga foi encontrada no seu perfil. Reveja se "
                     "esta vaga faz sentido, ou se falta atualizar seu profile.yaml."),
        ))

    # Sinal honesto sobre o objetivo de carreira do usuario.
    if "liferay" in mine and "liferay" not in asked:
        result.suggestions.append(TailoringSuggestion(
            kind="REORDENAR",
            message=("A vaga nao pede Liferay. Reduza o espaco dado a Liferay e descreva "
                     "essas experiencias em termos gerais (Java, upgrades, debugging, "
                     "Elasticsearch), sem omitir a verdade."),
        ))

    return result


# --------------------------------------------------------------------------
def _slug(text: str, max_len: int = 40) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", normalize_text(text)).strip("-")
    return slug[:max_len] or "vaga"


def generate_tailored_file(job: Job, profile: Profile, tailoring: TailoredResume) -> Path:
    """Escreve uma versao derivada do CV em data/generated/resumes/.

    O ORIGINAL nunca e tocado. Este arquivo e um documento de apoio:
    contem a base do CV mais uma secao de destaques, e um aviso explicito
    listando o que NAO deve ser adicionado.
    """
    settings = get_settings()
    out_dir = settings.generated_path / "resumes"
    out_dir.mkdir(parents=True, exist_ok=True)

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    version = f"{stamp}-{_slug(job.company)}-{_slug(job.title)}"
    path = out_dir / f"{version}.md"

    lines = [
        f"# Curriculo adaptado — {job.title} @ {job.company}",
        "",
        f"> Gerado em {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} "
        f"para a vaga: {job.url}",
        f"> Versao: `{version}`",
        "",
        "> **IMPORTANTE:** este arquivo apenas REORGANIZA e DESTACA fatos que "
        "ja constam no seu perfil e no seu CV original. Nada foi adicionado. "
        "O CV original permanece intacto em `resumes/`.",
        "",
        "---",
        "",
        "## Destaques para esta vaga",
        "",
    ]

    if tailoring.highlights:
        lines += [f"- {h}" for h in dict.fromkeys(tailoring.highlights)]
    else:
        lines.append("_Nenhum destaque com evidencia direta no seu CV para esta vaga._")

    lines += ["", "## Ordem sugerida de habilidades", ""]
    matched = [s.message for s in tailoring.suggestions if s.kind == "REORDENAR"]
    lines += ([f"- {m}" for m in matched] or ["_Sem sugestao de reordenacao._"])

    if tailoring.gaps:
        lines += [
            "", "## Lacunas — NAO ADICIONAR AO CURRICULO", "",
            "As tecnologias abaixo sao pedidas pela vaga e **nao constam** no seu "
            "perfil/CV. Incluir qualquer uma delas seria informacao falsa:", "",
        ]
        lines += [f"- [ ] {g}" for g in tailoring.gaps]

    lines += ["", "---", "", "## Conteudo do CV original (inalterado)", ""]
    if profile.resume and profile.resume.raw_text:
        lines += ["```text", profile.resume.raw_text.strip(), "```"]
    else:
        lines.append("_Nenhum CV carregado. Coloque um arquivo em `resumes/`._")

    path.write_text("\n".join(lines), encoding="utf-8")
    log.info("Versao adaptada do CV gerada: %s (original intacto)", path.name)

    tailoring.version_name = version
    tailoring.path = str(path)
    return path
