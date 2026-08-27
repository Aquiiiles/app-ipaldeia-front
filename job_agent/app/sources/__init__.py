"""Registro de fontes + carregamento de config/sources.yaml."""
from __future__ import annotations

from pathlib import Path

import yaml

from app.sources.base import REGISTRY, JobSource, register  # noqa: F401
# Importar os modulos registra as classes no REGISTRY.
from app.sources import ats, boards, manual, rss  # noqa: F401,E402

DEFAULT_SOURCES: list[dict] = [
    {"id": "remotive", "enabled": True, "queries": ["java", "backend"]},
    {"id": "remoteok", "enabled": True, "queries": ["java", "backend"]},
    {"id": "arbeitnow", "enabled": True, "queries": ["java", "backend"]},
    {"id": "himalayas", "enabled": True, "queries": ["java", "backend"]},
    {"id": "weworkremotely", "enabled": True},
]


def load_source_configs(path: str | Path) -> list[dict]:
    """Le sources.yaml. Cai nos defaults se o arquivo nao existir."""
    p = Path(path)
    if not p.exists():
        return list(DEFAULT_SOURCES)
    data = yaml.safe_load(p.read_text(encoding="utf-8")) or {}
    defaults = data.get("defaults") or {}
    configs: list[dict] = []
    for entry in data.get("sources") or []:
        if not isinstance(entry, dict) or not entry.get("id"):
            continue
        merged = {**defaults, **entry}
        configs.append(merged)
    return configs or list(DEFAULT_SOURCES)


def build_sources(configs: list[dict], only: list[str] | None = None) -> list[JobSource]:
    """Instancia as fontes habilitadas e conhecidas."""
    wanted = {s.lower() for s in only} if only else None
    built: list[JobSource] = []
    for config in configs:
        source_id = str(config.get("id", "")).strip()
        if not config.get("enabled", True):
            continue
        if wanted and source_id.lower() not in wanted:
            continue
        cls = REGISTRY.get(source_id)
        if cls is None:
            continue
        built.append(cls(config))
    return built


def available_sources() -> list[dict[str, str]]:
    """Catalogo das fontes suportadas + a nota de compliance de cada uma."""
    return [
        {"id": cls.id, "label": cls.label, "compliance_note": cls.compliance_note}
        for cls in REGISTRY.values()
    ]
