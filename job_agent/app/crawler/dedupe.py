"""Deduplicacao: a mesma vaga aparece em varias fontes.

Estrategia em 3 niveis, do mais forte ao mais fraco:
  1. URL canonica identica (mesmo anuncio, mesmo link).
  2. Chave (empresa normalizada + titulo canonico).
  3. Similaridade de titulo >= limiar, dentro da MESMA empresa.

O resultado e uma entrada principal (canonica) e as demais marcadas como
duplicatas, apontando para ela. Assim nunca aplicamos duas vezes.
"""
from __future__ import annotations

import re
from difflib import SequenceMatcher
from urllib.parse import urlsplit, urlunsplit

from app.crawler.extract import normalize_text
from app.models.job import NormalizedJob

#: Similaridade minima de titulo para considerar duplicata na mesma empresa.
TITLE_SIMILARITY_THRESHOLD = 0.86

#: Parametros de tracking removidos da URL antes de comparar.
_TRACKING_PARAMS_PREFIXES = ("utm_", "gh_src", "ref", "source", "src", "trk", "gclid", "fbclid", "lever-source")

#: Ruido comum em titulos que nao distingue a vaga.
_TITLE_NOISE = [
    "remote", "remoto", "100% remoto", "home office", "hibrido", "presencial",
    "brasil", "brazil", "latam", "full time", "full-time", "clt", "pj",
    "m/f/d", "m/w/d", "f/m/x", "urgente", "vaga", "we are hiring", "hiring",
]


def canonical_url(url: str) -> str:
    """URL sem tracking, sem fragmento, sem barra final e sem 'www.'."""
    if not url:
        return ""
    try:
        parts = urlsplit(url.strip())
    except ValueError:
        return url.strip().lower()

    host = (parts.netloc or "").lower()
    if host.startswith("www."):
        host = host[4:]

    kept = []
    for chunk in (parts.query or "").split("&"):
        if not chunk or "=" not in chunk:
            continue
        key = chunk.split("=", 1)[0].lower()
        if any(key == p or key.startswith(p) for p in _TRACKING_PARAMS_PREFIXES):
            continue
        kept.append(chunk)

    path = (parts.path or "").rstrip("/")
    # Esquema normalizado: http e https apontam para o mesmo anuncio.
    return urlunsplit(("https", host, path, "&".join(sorted(kept)), ""))


def normalize_company(company: str) -> str:
    """'Nubank S.A.' e 'nubank' devem colidir."""
    name = normalize_text(company)
    name = re.sub(r"\b(s\.?a\.?|ltda\.?|inc\.?|llc|gmbh|corp\.?|co\.?|company|technologies|tecnologia|group|holdings|brasil|brazil)\b", " ", name)
    name = re.sub(r"[^a-z0-9 ]", " ", name)
    return re.sub(r"\s+", "", name).strip()


def canonical_title(title: str) -> str:
    """Titulo sem ruido de anuncio, para comparacao."""
    name = normalize_text(title)
    for noise in _TITLE_NOISE:
        name = re.sub(r"(?<![a-z])" + re.escape(normalize_text(noise)) + r"(?![a-z])", " ", name)
    name = re.sub(r"[\(\)\[\]\{\}\|\-–—/,:;#@!\.]+", " ", name)
    # Remove restos como "100%" apos a retirada de "100% remoto".
    name = re.sub(r"(?<![a-z0-9])\d{1,3}\s*%", " ", name)
    return re.sub(r"\s+", " ", name).strip()


def dedupe_key(company: str, title: str) -> str:
    """Chave estavel para colisao exata empresa+titulo."""
    return f"{normalize_company(company)}::{canonical_title(title)}"


def title_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, canonical_title(a), canonical_title(b)).ratio()


def is_duplicate(job_a: NormalizedJob, job_b: NormalizedJob) -> bool:
    """Duas vagas normalizadas descrevem a MESMA posicao?"""
    url_a, url_b = canonical_url(job_a.url), canonical_url(job_b.url)
    if url_a and url_a == url_b:
        return True
    if dedupe_key(job_a.company, job_a.title) == dedupe_key(job_b.company, job_b.title):
        return True
    if normalize_company(job_a.company) and normalize_company(job_a.company) == normalize_company(job_b.company):
        return title_similarity(job_a.title, job_b.title) >= TITLE_SIMILARITY_THRESHOLD
    return False


def _recency_rank(job: NormalizedJob) -> tuple[int, int]:
    """Chave de preferencia: data conhecida ganha; depois, mais recente."""
    has_date = 1 if job.posted_at is not None else 0
    age = job.recency_days if job.recency_days is not None else 10_000
    return (has_date, -age)


def _description_len(job: NormalizedJob) -> int:
    return len(job.description or "")


def pick_canonical(group: list[NormalizedJob]) -> NormalizedJob:
    """Entrada principal do grupo: a mais informativa e mais confiavel.

    Preferimos data de publicacao conhecida, depois vaga mais recente,
    depois descricao mais completa (melhor material para o fit e o CV).
    """
    return max(group, key=lambda j: (_recency_rank(j), _description_len(j)))


def group_duplicates(jobs: list[NormalizedJob]) -> list[tuple[NormalizedJob, list[NormalizedJob]]]:
    """Agrupa em [(canonica, [duplicatas...]), ...] preservando a ordem."""
    groups: list[list[NormalizedJob]] = []
    for job in jobs:
        for group in groups:
            if any(is_duplicate(job, existing) for existing in group):
                group.append(job)
                break
        else:
            groups.append([job])

    result: list[tuple[NormalizedJob, list[NormalizedJob]]] = []
    for group in groups:
        canonical = pick_canonical(group)
        duplicates = [j for j in group if j is not canonical]
        result.append((canonical, duplicates))
    return result
