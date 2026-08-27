"""Carregamento do perfil + fusao com os fatos do CV.

O perfil e cacheado em memoria; `reload_profile()` limpa o cache depois de
voce editar profile.yaml ou trocar o CV.
"""
from __future__ import annotations

from pathlib import Path

from app.logging_setup import get_logger
from app.models.profile import Profile, ResumeFacts, load_profile
from app.resume.parser import find_resume, parse_resume
from app.settings import get_settings

log = get_logger("profile_service")

_cache: Profile | None = None
_load_warnings: list[str] = []


def _merge_resume(profile: Profile, facts: ResumeFacts) -> Profile:
    """Anexa os fatos do CV ao perfil.

    O CV COMPLEMENTA o YAML: acrescenta o que faltava (educacao,
    certificacoes, projetos, tecnologias) e nunca sobrescreve o que voce
    declarou explicitamente.
    """
    profile.resume = facts

    def merge(existing: list[str], incoming: list[str]) -> list[str]:
        seen = {item.strip().lower() for item in existing}
        return existing + [i for i in incoming if i.strip().lower() not in seen]

    profile.education = merge(profile.education, facts.education)
    profile.certifications = merge(profile.certifications, facts.certifications)
    profile.projects = merge(profile.projects, facts.projects)
    profile.experience.technologies = merge(profile.experience.technologies, facts.technologies)
    return profile


def load_current_profile(resume_path: str | Path | None = None) -> Profile:
    """Carrega profile.yaml e, se houver, o CV mais recente de resumes/."""
    global _load_warnings
    settings = get_settings()
    _load_warnings = []

    profile = load_profile(settings.profile_file)

    target = Path(resume_path) if resume_path else find_resume(settings.resumes_dir)
    if target is None:
        _load_warnings.append(
            f"Nenhum curriculo encontrado em {settings.resumes_dir}. "
            f"Coloque um PDF/DOCX/MD/TXT lá para enriquecer o perfil."
        )
        return profile

    try:
        facts = parse_resume(target)
    except Exception as exc:
        _load_warnings.append(f"Falha ao ler o curriculo {target.name}: {exc}")
        log.warning("Falha ao ler CV %s: %s", target, exc)
        return profile

    return _merge_resume(profile, facts)


def current_profile() -> Profile:
    global _cache
    if _cache is None:
        _cache = load_current_profile()
    return _cache


def reload_profile() -> Profile:
    global _cache
    _cache = None
    return current_profile()


def load_warnings() -> list[str]:
    return list(_load_warnings)


def profile_status() -> dict:
    """Diagnostico do perfil, exibido no dashboard."""
    settings = get_settings()
    try:
        profile = current_profile()
    except FileNotFoundError as exc:
        return {"ok": False, "error": str(exc), "resume_loaded": False}

    missing: list[str] = []
    if not profile.identity.full_name:
        missing.append("identity.full_name")
    if not profile.identity.email:
        missing.append("identity.email")
    if not profile.experience.years_by_technology:
        missing.append("experience.years_by_technology")
    if not any((l.level or "").strip() for l in profile.identity.languages):
        missing.append("identity.languages[].level")

    return {
        "ok": True,
        "profile_path": str(settings.profile_file),
        "resume_loaded": profile.resume is not None,
        "resume_file": (Path(profile.resume.source_file).name if profile.resume else ""),
        "technologies": sorted(profile.known_technologies()),
        "growth_technologies": sorted(profile.growth_technologies()),
        "total_years": profile.experience.total_years,
        "missing_fields": missing,
        "warnings": load_warnings(),
    }
