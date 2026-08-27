"""Fontes que NAO sao raspadas — por decisao de compliance.

LinkedIn, Indeed, Glassdoor, Gupy e Vagas.com proibem scraping automatizado
nos seus Termos de Uso e/ou robots.txt. Em vez de contornar isso, o agente:

  1. gera as URLs de busca (com filtros de remoto + ultimos 7 dias) para
     voce abrir manualmente no navegador; e
  2. aceita importacao manual: voce cola a URL/texto da vaga e ela passa
     pelo MESMO pipeline (normalizacao, recencia, dedupe, fit).

Assim voce nao perde essas fontes, e nada e obtido de forma indevida.
"""
from __future__ import annotations

from datetime import datetime
from urllib.parse import quote_plus

from app.crawler.fetcher import PoliteFetcher
from app.models.job import RawJob
from app.models.profile import Profile
from app.sources.base import JobSource, register


@register
class ManualSearchLinksSource(JobSource):
    id = "manual_search_links"
    label = "Links de busca manual (LinkedIn, Indeed, Gupy)"
    compliance_note = ("Estes sites proibem scraping. O agente apenas monta a URL "
                       "de busca para voce abrir. Nenhuma requisicao e feita a eles.")

    DEFAULT_TARGETS = [
        {
            "name": "LinkedIn Jobs",
            "url_template": ("https://www.linkedin.com/jobs/search/?keywords={query}"
                             "&location=Brazil&f_WT=2&f_TPR=r604800&sortBy=DD"),
            "note": "Termos de Uso proibem scraping. Abra manualmente.",
        },
        {
            "name": "Indeed Brasil",
            "url_template": "https://br.indeed.com/jobs?q={query}&fromage=7&sort=date",
            "note": "Termos de Uso proibem scraping. Abra manualmente.",
        },
    ]

    async def fetch(self, fetcher: PoliteFetcher, profile: Profile) -> list[RawJob]:
        """Nao faz requisicao alguma. Nao ha vagas a retornar daqui."""
        return []

    def build_links(self, profile: Profile) -> list[dict[str, str]]:
        """URLs de busca prontas para voce abrir no navegador."""
        targets = self.config.get("targets") or self.DEFAULT_TARGETS
        links: list[dict[str, str]] = []
        for query in self.queries(profile):
            for target in targets:
                template = target.get("url_template", "")
                if not template:
                    continue
                links.append({
                    "name": target.get("name", "?"),
                    "query": query,
                    "url": template.replace("{query}", quote_plus(query)),
                    "note": target.get("note", ""),
                })
        return links


def raw_job_from_manual_input(
    title: str,
    company: str = "",
    url: str = "",
    description: str = "",
    location: str = "",
    salary: str = "",
    posted_at: datetime | None = None,
) -> RawJob:
    """Cria uma vaga a partir de dados colados por voce.

    `posted_at=None` e legitimo e significa "desconhecida": o pipeline vai
    tratar como tal, sem fingir recencia.
    """
    identifier = url.strip() or f"{company.strip().lower()}:{title.strip().lower()}"
    return RawJob(
        source="manual",
        external_id=identifier,
        title=title.strip(),
        company=company.strip(),
        url=url.strip(),
        description=description,
        location_raw=location.strip(),
        salary_raw=salary.strip(),
        posted_at=posted_at,
    )
