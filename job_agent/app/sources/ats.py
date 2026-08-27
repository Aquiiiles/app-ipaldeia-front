"""ATS: APIs oficiais de job board, por empresa.

Greenhouse, Lever e Ashby publicam endpoints JSON documentados para que
as vagas de um board possam ser consumidas por terceiros. Sao a forma
LEGITIMA de acompanhar as vagas de uma empresa especifica — e traz a data
de publicacao real, o que resolve o requisito de recencia.
"""
from __future__ import annotations

from app.crawler.fetcher import BlockedByRobots, HumanInterventionRequired, PoliteFetcher
from app.logging_setup import get_logger
from app.models.job import RawJob
from app.models.profile import Profile
from app.sources.base import JobSource, register

log = get_logger("sources.ats")


class _PerCompanySource(JobSource):
    """Base para fontes que iteram sobre uma lista de empresas."""

    def companies(self) -> list[str]:
        return [c.strip() for c in self.config.get("companies", []) if c and c.strip()]

    async def fetch(self, fetcher: PoliteFetcher, profile: Profile) -> list[RawJob]:
        companies = self.companies()
        if not companies:
            log.info("Fonte '%s' sem empresas configuradas; nada a buscar. "
                     "Adicione tokens em config/sources.yaml.", self.id)
            return []
        jobs: list[RawJob] = []
        for company in companies:
            try:
                jobs.extend(await self.fetch_company(fetcher, company))
            except HumanInterventionRequired:
                raise
            except BlockedByRobots as exc:
                log.warning("%s: %s", self.id, exc)
            except Exception as exc:
                # Um board inexistente nao deve derrubar os outros.
                log.warning("%s/%s falhou: %s: %s", self.id, company, type(exc).__name__, exc)
        return jobs

    async def fetch_company(self, fetcher: PoliteFetcher, company: str) -> list[RawJob]:
        raise NotImplementedError


@register
class GreenhouseSource(_PerCompanySource):
    id = "greenhouse"
    label = "Greenhouse (por empresa)"
    compliance_note = ("Job Board API publica oficial: "
                       "boards-api.greenhouse.io/v1/boards/{token}/jobs")

    async def fetch_company(self, fetcher: PoliteFetcher, company: str) -> list[RawJob]:
        url = f"https://boards-api.greenhouse.io/v1/boards/{company}/jobs"
        data = await fetcher.get_json(url, params={"content": "true"})
        items = (data or {}).get("jobs", []) if isinstance(data, dict) else []
        jobs: list[RawJob] = []
        for item in items:
            offices = [o.get("name", "") for o in (item.get("offices") or [])]
            location = (item.get("location") or {}).get("name") or ", ".join(offices)
            jobs.append(RawJob(
                source=self.id,
                external_id=f"{company}:{item.get('id')}",
                title=item.get("title") or "",
                company=(item.get("company_name") or company).strip(),
                url=item.get("absolute_url") or "",
                description=item.get("content") or "",
                location_raw=location,
                posted_at=self.parse_iso(item.get("first_published") or item.get("created_at")),
                updated_at=self.parse_iso(item.get("updated_at")),
                tags=[d.get("name", "") for d in (item.get("departments") or [])],
            ))
        return jobs


@register
class LeverSource(_PerCompanySource):
    id = "lever"
    label = "Lever (por empresa)"
    compliance_note = "Postings API publica oficial: api.lever.co/v0/postings/{company}"

    async def fetch_company(self, fetcher: PoliteFetcher, company: str) -> list[RawJob]:
        url = f"https://api.lever.co/v0/postings/{company}"
        data = await fetcher.get_json(url, params={"mode": "json"})
        items = data if isinstance(data, list) else []
        jobs: list[RawJob] = []
        for item in items:
            categories = item.get("categories") or {}
            jobs.append(RawJob(
                source=self.id,
                external_id=f"{company}:{item.get('id')}",
                title=item.get("text") or "",
                company=company,
                url=item.get("hostedUrl") or item.get("applyUrl") or "",
                description=(item.get("descriptionPlain") or item.get("description") or "")
                            + "\n" + "\n".join(
                                (lst.get("text") or "") + " " + (lst.get("content") or "")
                                for lst in (item.get("lists") or [])
                            ),
                location_raw=categories.get("location") or "",
                salary_raw=item.get("salaryDescription") or "",
                posted_at=self.parse_epoch(item.get("createdAt")),
                tags=[v for v in (categories.get("team"), categories.get("department"),
                                  categories.get("commitment")) if v],
                extra={"workplace_type": item.get("workplaceType") or ""},
            ))
        return jobs


@register
class AshbySource(_PerCompanySource):
    id = "ashby"
    label = "Ashby (por empresa)"
    compliance_note = ("Posting API publica oficial: "
                       "api.ashbyhq.com/posting-api/job-board/{org}")

    async def fetch_company(self, fetcher: PoliteFetcher, company: str) -> list[RawJob]:
        url = f"https://api.ashbyhq.com/posting-api/job-board/{company}"
        data = await fetcher.get_json(url, params={"includeCompensation": "true"})
        items = (data or {}).get("jobs", []) if isinstance(data, dict) else []
        jobs: list[RawJob] = []
        for item in items:
            comp = item.get("compensation") or {}
            summary = comp.get("compensationTierSummary") if isinstance(comp, dict) else ""
            jobs.append(RawJob(
                source=self.id,
                external_id=f"{company}:{item.get('id')}",
                title=item.get("title") or "",
                company=company,
                url=item.get("jobUrl") or item.get("applyUrl") or "",
                description=item.get("descriptionPlain") or item.get("descriptionHtml") or "",
                location_raw=item.get("location") or "",
                salary_raw=summary or "",
                posted_at=self.parse_iso(item.get("publishedAt")),
                updated_at=self.parse_iso(item.get("updatedAt")),
                tags=[v for v in (item.get("department"), item.get("team"),
                                  item.get("employmentType")) if v]
                     + (["Remote"] if item.get("isRemote") else []),
            ))
        return jobs
