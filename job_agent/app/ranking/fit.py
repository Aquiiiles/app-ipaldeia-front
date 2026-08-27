"""Fit score 0-100, 100% deterministico e explicavel.

Nenhum LLM participa do calculo: dado o mesmo perfil e a mesma vaga, o
score e sempre identico. Isso torna o ranking testavel e auditavel.
Cada dimensao devolve um valor normalizado 0..1 que e multiplicado pelo
peso configurado em config/profile.yaml.
"""
from __future__ import annotations

from app.crawler.extract import BACKEND_SIGNALS, normalize_text
from app.models.enums import (
    Modality, Recency, Recommendation, Seniority, SENIORITY_RANK,
)
from app.formatting import format_brl
from app.models.job import FitAnalysis, NormalizedJob, ScoreBreakdown
from app.models.profile import Profile
from app.ranking.filters import (
    FilterResult, apply_filters, avoided_seniorities, target_seniorities,
)

#: Tecnologias criticas: se a vaga pede e voce nao tem, pesa de verdade.
#: (linguagens/plataformas nucleares, nao ferramentas perifericas)
CRITICAL_TECHS = {
    "java", "kotlin", "python", "node.js", "go", "c#", "php", "ruby",
    "spring", "spring boot", "sql",
}

#: Multiplicador de recencia aplicado ao score final.
RECENCY_MULTIPLIER: dict[Recency, float] = {
    Recency.EXCELLENT: 1.00,
    Recency.GOOD: 0.97,
    Recency.ACCEPTABLE: 0.92,
    Recency.LOW: 0.75,
    Recency.UNKNOWN: 0.90,
    Recency.IGNORE: 0.40,
}


# --------------------------------------------------------------------------
# Dimensoes (cada uma retorna 0.0 .. 1.0)
# --------------------------------------------------------------------------
def score_experience(job: NormalizedJob, profile: Profile) -> tuple[float, list[str]]:
    """Compatibilidade de anos de experiencia."""
    notes: list[str] = []
    mine = profile.experience.total_years
    required = job.years_required

    if required is None:
        notes.append("A vaga nao explicita anos de experiencia exigidos (neutro).")
        return 0.70, notes

    gap = required - mine
    if gap <= 0:
        notes.append(f"Voce atende ao minimo de {required:.0f} anos ({mine:.1f} anos).")
        return 1.0, notes
    if gap <= 1:
        notes.append(f"Falta ~{gap:.1f} ano para o minimo de {required:.0f}; diferenca pequena.")
        return 0.80, notes
    if gap <= 2:
        notes.append(f"Faltam ~{gap:.1f} anos para o minimo de {required:.0f}; stretch moderado.")
        return 0.55, notes
    if gap <= profile.scoring.stretch_years_tolerance:
        notes.append(f"Faltam ~{gap:.1f} anos para o minimo de {required:.0f}; stretch alto.")
        return 0.30, notes
    notes.append(f"Exige {required:.0f} anos, muito acima dos seus {mine:.1f}.")
    return 0.08, notes


def score_tech_stack(job: NormalizedJob, profile: Profile) -> tuple[float, dict]:
    """Aderencia da stack: quanto do que a vaga pede voce ja tem."""
    mine = profile.known_technologies()
    growth = profile.growth_technologies()
    asked = [t for t in job.technologies if t]

    detail = {"matched": [], "missing": [], "critical_missing": [], "nice_to_have_missing": [], "growth": []}
    if not asked:
        detail["note"] = "Nao foi possivel identificar a stack no anuncio (neutro)."
        return 0.55, detail

    matched = [t for t in asked if t in mine]
    missing = [t for t in asked if t not in mine]
    critical_missing = [t for t in missing if t in CRITICAL_TECHS]
    nice_missing = [t for t in missing if t not in CRITICAL_TECHS]

    detail["matched"] = matched
    detail["missing"] = missing
    detail["critical_missing"] = critical_missing
    detail["nice_to_have_missing"] = nice_missing
    detail["growth"] = [t for t in missing if t in growth]

    # Base: cobertura simples do que foi pedido.
    coverage = len(matched) / len(asked)

    # Bonus: dominar a linguagem/plataforma central importa mais que contar itens.
    core_asked = [t for t in asked if t in CRITICAL_TECHS]
    if core_asked:
        core_coverage = len([t for t in core_asked if t in mine]) / len(core_asked)
        # 60% cobertura central, 40% cobertura geral.
        coverage = 0.6 * core_coverage + 0.4 * coverage

    # Tecnologias que voce nao tem mas QUER aprender nao devem punir tanto:
    # elas sao o objetivo de carreira, nao um deficit.
    if detail["growth"]:
        forgiveness = min(0.15, 0.03 * len(detail["growth"]))
        coverage = min(1.0, coverage + forgiveness)

    return round(min(1.0, coverage), 4), detail


def score_job_level(job: NormalizedJob, profile: Profile) -> tuple[float, list[str]]:
    """Nivel anunciado vs niveis desejados."""
    notes: list[str] = []
    targets = target_seniorities(profile)
    avoid = avoided_seniorities(profile)

    if job.seniority is Seniority.UNKNOWN:
        notes.append("Nivel nao explicito no anuncio (neutro).")
        return 0.65, notes
    if job.seniority in targets:
        notes.append(f"Nivel '{job.seniority.value}' esta exatamente no seu alvo.")
        return 1.0, notes
    if job.seniority in avoid:
        notes.append(f"Nivel '{job.seniority.value}' esta na sua lista de niveis a evitar.")
        return 0.10 if job.seniority is Seniority.SENIOR else 0.0, notes

    # Nivel nao listado: pontua pela distancia ao alvo mais proximo.
    if targets:
        distance = min(abs(SENIORITY_RANK[job.seniority] - SENIORITY_RANK[t]) for t in targets)
        value = max(0.0, 1.0 - 0.30 * distance)
        notes.append(f"Nivel '{job.seniority.value}' esta a {distance} passo(s) do seu alvo.")
        return round(value, 4), notes
    return 0.5, notes


def score_modality(job: NormalizedJob, profile: Profile) -> tuple[float, list[str]]:
    """Modalidade e regiao de contratacao."""
    notes: list[str] = []
    accepted = {m.lower() for m in profile.preferences.accepted_modalities}

    if job.modality is Modality.REMOTE and "remote" in accepted:
        value, note = 1.0, "Vaga remota, como voce prefere."
    elif job.modality is Modality.HYBRID:
        value = 1.0 if "hybrid" in accepted else 0.35
        note = "Vaga hibrida." + ("" if "hybrid" in accepted else " Voce prefere remoto.")
    elif job.modality is Modality.ONSITE:
        value = 1.0 if "onsite" in accepted else 0.0
        note = "Vaga presencial." + ("" if "onsite" in accepted else " Fora da sua preferencia.")
    else:
        value, note = 0.55, "Modalidade nao confirmada no anuncio."
    notes.append(note)

    # Regiao: nao aceitar Brasil zera esta dimensao.
    if job.accepts_brazil is False:
        notes.append("O anuncio exclui contratacao no Brasil.")
        value = 0.0
    elif job.accepts_brazil is None:
        notes.append("Nao ficou claro se aceitam contratacao no Brasil.")
        value *= 0.75

    return round(value, 4), notes


def score_seniority_required(job: NormalizedJob, profile: Profile) -> tuple[float, list[str]]:
    """Exigencia de senioridade, separada do nivel anunciado.

    Um titulo pode dizer "Software Engineer" e o corpo exigir 8 anos.
    Esta dimensao captura essa incoerencia.
    """
    notes: list[str] = []
    mine_rank = max(SENIORITY_RANK[s] for s in target_seniorities(profile)) if target_seniorities(profile) else 2
    job_rank = SENIORITY_RANK[job.seniority]

    if job.seniority is Seniority.UNKNOWN and job.years_required is None:
        notes.append("Nenhum sinal forte de senioridade exigida (neutro).")
        return 0.70, notes

    steps_above = max(0, job_rank - mine_rank)
    value = max(0.0, 1.0 - 0.35 * steps_above)
    if steps_above:
        notes.append(f"Senioridade exigida esta {steps_above} nivel(is) acima do seu alvo.")
    else:
        notes.append("Senioridade exigida compativel com o seu nivel.")

    if job.years_required is not None:
        gap = job.years_required - profile.experience.total_years
        if gap > profile.scoring.stretch_years_tolerance:
            value *= 0.4
            notes.append(f"Exigencia de {job.years_required:.0f} anos reforca a distancia.")
    return round(value, 4), notes


def score_growth(job: NormalizedJob, profile: Profile) -> tuple[float, list[str]]:
    """Potencial de crescimento: a vaga te tira da especializacao atual?"""
    notes: list[str] = []
    growth = profile.growth_technologies()
    mine = profile.known_technologies()
    asked = set(job.technologies)

    new_growth = sorted(asked & growth - mine)
    if not growth:
        return 0.5, ["Nenhuma tecnologia de crescimento configurada."]
    if not new_growth:
        notes.append("A vaga nao adiciona tecnologias novas dos seus objetivos de carreira.")
        return 0.20, notes

    # 3+ tecnologias novas dos seus objetivos = potencial maximo.
    value = min(1.0, len(new_growth) / 3.0)
    notes.append("Adiciona ao seu repertorio: " + ", ".join(new_growth) + ".")

    # Sinal extra: vaga que amplia backend sem depender de Liferay.
    if "liferay" not in asked and (asked & BACKEND_SIGNALS):
        value = min(1.0, value + 0.15)
        notes.append("Backend fora do ecossistema Liferay, alinhado ao seu objetivo.")
    return round(value, 4), notes


def score_compensation(job: NormalizedJob, profile: Profile) -> tuple[float, list[str]]:
    """Compensacao vs alvo. Salario desconhecido = neutro, nunca punido."""
    notes: list[str] = []
    target = profile.preferences.target_salary_brl_month
    minimum = profile.preferences.minimum_salary_brl_month
    current = profile.current.salary_brl_month

    offered = job.salary_max_brl_month or job.salary_min_brl_month
    if offered is None:
        notes.append("Salario nao informado no anuncio (neutro).")
        return 0.50, notes

    notes.append(f"Faixa estimada: ~{format_brl(offered)}/mes (conversao aproximada).")
    if minimum is not None and offered < minimum:
        notes.append(f"Abaixo do seu minimo de {format_brl(minimum)}.")
        return 0.10, notes
    if target is not None and offered >= target:
        if current and offered >= current * 1.5:
            notes.append("Bem acima do seu salario atual.")
            return 1.0, notes
        notes.append("Atinge ou supera seu alvo.")
        return 0.90, notes
    if current is not None and offered > current:
        notes.append("Acima do seu salario atual, abaixo do alvo.")
        return 0.65, notes
    notes.append("Nao representa aumento em relacao ao atual.")
    return 0.25, notes


# --------------------------------------------------------------------------
def classify(score: float, profile: Profile) -> Recommendation:
    t = profile.scoring.thresholds
    if score >= t.excellent:
        return Recommendation.EXCELENTE
    if score >= t.very_good:
        return Recommendation.MUITO_BOA
    if score >= t.good:
        return Recommendation.BOA_AVALIAR
    if score >= t.stretch:
        return Recommendation.STRETCH
    return Recommendation.NAO_PRIORITARIA


def analyze(job: NormalizedJob, profile: Profile, filters: FilterResult | None = None) -> FitAnalysis:
    """Avaliacao completa: score, breakdown e explicacao em linguagem natural."""
    weights = profile.scoring.weights
    filters = filters if filters is not None else apply_filters(job, profile)

    exp_v, exp_notes = score_experience(job, profile)
    stack_v, stack_detail = score_tech_stack(job, profile)
    level_v, level_notes = score_job_level(job, profile)
    mod_v, mod_notes = score_modality(job, profile)
    sen_v, sen_notes = score_seniority_required(job, profile)
    growth_v, growth_notes = score_growth(job, profile)
    comp_v, comp_notes = score_compensation(job, profile)

    breakdown = ScoreBreakdown(
        experience_match=round(exp_v * weights.experience_match, 2),
        tech_stack=round(stack_v * weights.tech_stack, 2),
        job_level=round(level_v * weights.job_level, 2),
        modality_location=round(mod_v * weights.modality_location, 2),
        seniority_required=round(sen_v * weights.seniority_required, 2),
        growth_potential=round(growth_v * weights.growth_potential, 2),
        compensation=round(comp_v * weights.compensation, 2),
    )

    raw_total = breakdown.total()
    # Normaliza caso os pesos nao somem 100, para o score seguir sendo 0-100.
    total_weight = weights.total() or 100.0
    normalized = raw_total * (100.0 / total_weight)
    # Recencia e multiplicador, nao dimensao: uma vaga perfeita mas velha
    # nao deve competir de igual para igual com uma perfeita e nova.
    score = round(max(0.0, min(100.0, normalized * RECENCY_MULTIPLIER.get(job.recency, 0.9))), 2)

    recommendation = classify(score, profile)
    is_stretch = filters.has("STRETCH_EXPERIENCIA") or recommendation is Recommendation.STRETCH

    why: list[str] = []
    concerns: list[str] = []
    matched = list(stack_detail.get("matched", []))
    if matched:
        why.append("Voce ja trabalha com: " + ", ".join(matched) + ".")
    why.extend(n for n in level_notes + mod_notes if "Fora" not in n and "evitar" not in n)
    why.extend(growth_notes)
    why.extend(n for n in exp_notes if "muito acima" not in n)
    why.extend(comp_notes)

    for flag in filters.flags:
        concerns.append(f"[{flag}] {filters.reasons.get(flag, '')}".strip())
    if stack_detail.get("critical_missing"):
        concerns.append("Requisitos criticos ausentes no seu perfil: "
                        + ", ".join(stack_detail["critical_missing"]) + ".")

    # Recomendacao de acao. Nunca automatica: e uma sugestao para voce decidir.
    if filters.hard_rejected:
        should, reason = False, "Descartada por filtro obrigatorio: " + ", ".join(
            f for f in filters.flags if f in {"RECENCIA_EXPIRADA", "VAGA_ENCERRADA", "NAO_ACEITA_BRASIL"})
    elif recommendation in (Recommendation.EXCELENTE, Recommendation.MUITO_BOA):
        should, reason = True, "Alta aderencia ao seu perfil e aos seus objetivos. Vale aplicar."
    elif recommendation is Recommendation.BOA_AVALIAR:
        should, reason = True, "Boa aderencia com pontos a checar. Leia o anuncio antes de aplicar."
    elif recommendation is Recommendation.STRETCH:
        should, reason = True, ("Stretch: pede um pouco mais do que voce tem hoje, mas o "
                                "aprendizado compensa. Decisao sua.")
    else:
        should, reason = False, "Baixa aderencia. Nao priorizar, mas fica registrada para consulta."

    return FitAnalysis(
        score=score,
        recommendation=recommendation,
        breakdown=breakdown,
        matched_requirements=matched,
        missing_requirements=list(stack_detail.get("missing", [])),
        critical_missing=list(stack_detail.get("critical_missing", [])),
        nice_to_have_missing=list(stack_detail.get("nice_to_have_missing", [])),
        growth_opportunities=list(stack_detail.get("growth", [])),
        why_it_fits=[w for w in why if w],
        concerns=[c for c in concerns if c],
        should_apply=should,
        should_apply_reason=reason,
        filter_flags=list(filters.flags),
        is_stretch=is_stretch,
    )
