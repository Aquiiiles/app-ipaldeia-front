"""Guard anti-invencao.

Toda saida de texto (cover letter, mensagem, resposta a pergunta) passa por
aqui ANTES de chegar a voce. O guard procura afirmacoes que nao tenham base
no seu perfil/CV e as marca.

Checagens:
  1. Tecnologia afirmada como sua sem estar no perfil/CV.
  2. Numeros de anos de experiencia divergentes do declarado.
  3. Cargos/titulos nao presentes no perfil.
  4. Certificacoes/diplomas nao presentes no perfil.
  5. Frases de exagero tipicas ("expert em", "dominio total de").

O guard nao "corrige" o texto: ele BLOQUEIA e devolve o problema, porque a
correcao correta e factual e sua, nao dele.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.crawler.extract import TECH_VOCABULARY, detect_technologies, normalize_text
from app.models.profile import Profile


@dataclass
class Violation:
    kind: str
    detail: str
    evidence: str = ""

    def __str__(self) -> str:
        return f"[{self.kind}] {self.detail}" + (f" -> \"{self.evidence}\"" if self.evidence else "")


@dataclass
class GuardResult:
    ok: bool
    violations: list[Violation] = field(default_factory=list)
    warnings: list[Violation] = field(default_factory=list)

    def summary(self) -> str:
        if self.ok and not self.warnings:
            return "Nenhuma afirmacao sem base factual detectada."
        lines = [f"BLOQUEIO: {v}" for v in self.violations]
        lines += [f"ATENCAO: {w}" for w in self.warnings]
        return "\n".join(lines)


#: Verbos que indicam APROPRIACAO de uma tecnologia em 1a pessoa.
_CLAIM_PATTERNS = [
    r"\b(?:tenho|possuo|trabalho|trabalhei|atuei|atuo|desenvolvi|desenvolvo|utilizo|utilizei|usei|uso|domino|implementei|implemento|construi|liderei)\b",
    r"\b(?:i have|i've|my experience|i worked|i work|i developed|i built|i implemented|i led|i used|i use|experienced in|proficient in|skilled in|expert in)\b",
]

#: Marcadores de ASPIRACAO. Numa frase que os contenha, mencionar uma
#: tecnologia e declarar interesse em aprender — nao afirmar que a domina.
#: O usuario pediu explicitamente que isso continue permitido; as checagens
#: de anos, credenciais e exagero seguem valendo na mesma frase.
_ASPIRATION_PATTERNS = [
    r"\b(?:quero|queria|gostaria|pretendo|busco|buscando|tenho interesse|interesse em|interessado em|espero)\b",
    r"\b(?:aprender|aprendendo|estudar|estudando|desenvolver minha|evoluir|crescer|aprofundar|expandir|ampliar|migrar para|transicao para|explorar)\b",
    r"\b(?:i(?:'d| would)? (?:like|want)|looking to|eager to|hoping to|keen to|interested in|aiming to)\b",
    r"\b(?:learn|learning|grow into|expand|deepen|move towards|transition to)\b",
    r"\b(?:ainda nao|nao tenho|sem experiencia|do not have|don't have|no experience)\b",
]

#: Exageros que nao queremos numa candidatura honesta.
_OVERCLAIM_PATTERNS = [
    r"\bexpert\s+(?:in|em)\b", r"\bespecialista\s+em\b", r"\bdominio\s+(?:total|completo|pleno)\b",
    r"\bmastery\b", r"\bworld[- ]class\b", r"\bninja\b", r"\brockstar\b",
    r"\b10x\s+(?:engineer|developer)\b", r"\bprofundo\s+conhecimento\s+em\b",
    r"\bamplo\s+dominio\b", r"\bdeep\s+expertise\b",
]

_YEARS_CLAIM = re.compile(
    r"(\d{1,2}(?:[.,]\d)?)\s*(?:\+)?\s*(?:anos?|years?)\s*(?:de\s+|of\s+)?"
    r"(?:experiencia\s*(?:em|com|in|with)?\s*|experience\s*(?:in|with)?\s*)?([a-z0-9#+./ ]{0,30})",
    re.I,
)

_TITLE_WORDS = [
    "senior", "staff", "principal", "tech lead", "team lead", "engineering manager",
    "arquiteto de software", "software architect", "gerente", "director", "head of",
    "cto", "coordenador",
]

_CREDENTIAL_WORDS = [
    "certified", "certificado", "certificacao", "aws certified", "oracle certified",
    "azure certified", "scrum master", "pmp", "mba", "mestrado", "doutorado",
    "phd", "bacharel", "licenciatura", "pos-graduacao", "especializacao",
]


def _tech_is_known(tech: str, profile: Profile) -> bool:
    return tech.strip().lower() in profile.known_technologies()


def _sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?;\n])\s+", text) if s.strip()]


def check_text(text: str, profile: Profile, strict: bool = True) -> GuardResult:
    """Valida um texto gerado contra os fatos do perfil.

    `strict=True` (padrao) transforma tecnologias nao comprovadas em
    BLOQUEIO. Com `strict=False` viram apenas avisos.
    """
    violations: list[Violation] = []
    warnings: list[Violation] = []
    if not text or not text.strip():
        return GuardResult(ok=True)

    corpus = normalize_text(profile.fact_corpus())

    # --- 1. tecnologias afirmadas em 1a pessoa -------------------------
    for sentence in _sentences(text):
        norm = normalize_text(sentence)
        claims_ownership = any(re.search(p, norm) for p in _CLAIM_PATTERNS)
        if not claims_ownership:
            continue
        # "Quero aprender Kafka" contem "quero", mas nao afirma dominio.
        if any(re.search(p, norm) for p in _ASPIRATION_PATTERNS):
            continue
        for tech in detect_technologies(sentence):
            if _tech_is_known(tech, profile):
                continue
            # A tecnologia pode aparecer no CV com outro nome; checamos o corpus.
            synonyms = TECH_VOCABULARY.get(tech, [tech])
            if any(normalize_text(s) in corpus for s in synonyms):
                continue
            item = Violation(
                kind="TECNOLOGIA_NAO_COMPROVADA",
                detail=f"O texto afirma experiencia com '{tech}', que nao consta no seu "
                       f"perfil nem no seu CV.",
                evidence=sentence[:200],
            )
            (violations if strict else warnings).append(item)

    # --- 2. numeros de anos ------------------------------------------------
    declared_total = profile.experience.total_years
    for match in _YEARS_CLAIM.finditer(text):
        try:
            claimed = float(match.group(1).replace(",", "."))
        except ValueError:
            continue
        subject = (match.group(2) or "").strip().lower()
        subject_tech = next(
            (t for t in detect_technologies(subject) if t), None
        ) if subject else None

        if subject_tech:
            declared = profile.years_for(subject_tech)
            if declared is None:
                warnings.append(Violation(
                    kind="ANOS_SEM_BASE",
                    detail=f"O texto afirma {claimed:g} anos de '{subject_tech}', mas voce "
                           f"nao declarou anos para essa tecnologia em profile.yaml.",
                    evidence=match.group(0)[:120],
                ))
            elif abs(declared - claimed) > 0.5:
                violations.append(Violation(
                    kind="ANOS_DIVERGENTES",
                    detail=f"O texto afirma {claimed:g} anos de '{subject_tech}', mas seu "
                           f"perfil declara {declared:g}.",
                    evidence=match.group(0)[:120],
                ))
        elif claimed - declared_total > 0.5:
            violations.append(Violation(
                kind="ANOS_DIVERGENTES",
                detail=f"O texto afirma {claimed:g} anos de experiencia, mas seu perfil "
                       f"declara {declared_total:g}.",
                evidence=match.group(0)[:120],
            ))

    # --- 3. cargos ---------------------------------------------------------
    norm_text = normalize_text(text)
    current_title = normalize_text(profile.current.title)
    for word in _TITLE_WORDS:
        if word in norm_text and word not in current_title and word not in corpus:
            warnings.append(Violation(
                kind="CARGO_NAO_COMPROVADO",
                detail=f"O texto menciona '{word}', que nao aparece no seu historico. "
                       f"Confirme se e uma referencia a vaga, e nao a voce.",
            ))

    # --- 4. certificacoes / diplomas --------------------------------------
    for word in _CREDENTIAL_WORDS:
        if word in norm_text and word not in corpus:
            violations.append(Violation(
                kind="CREDENCIAL_NAO_COMPROVADA",
                detail=f"O texto menciona '{word}', que nao consta no seu perfil/CV.",
            ))

    # --- 5. exagero --------------------------------------------------------
    for pattern in _OVERCLAIM_PATTERNS:
        found = re.search(pattern, norm_text)
        if found:
            warnings.append(Violation(
                kind="EXAGERO",
                detail=f"Expressao de exagero detectada: '{found.group(0)}'. "
                       f"Prefira uma formulacao verificavel.",
            ))

    return GuardResult(ok=not violations, violations=violations, warnings=warnings)


def assert_grounded(text: str, profile: Profile) -> str:
    """Devolve o texto ou levanta erro. Use quando o texto vai para producao."""
    result = check_text(text, profile, strict=True)
    if not result.ok:
        raise ValueError(
            "Texto bloqueado pelo guard anti-invencao:\n" + result.summary()
        )
    return text
