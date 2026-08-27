"""Job boards remotos com API JSON publica e gratuita.

Todas as fontes deste modulo expoem endpoints documentados e publicos.
Nenhuma exige autenticacao e nenhuma e obtida por scraping de HTML.
"""
from __future__ import annotations

from app.crawler.fetcher import PoliteFetcher
from app.logging_setup import get_logger
from app.models.job import RawJob
from app.models.profile import Profile
from app.sources.base import JobSource, register

log = get_logger("sources.boards")


@register
class RemotiveSource(JobSource):
    id = "remotive"
    label = "Remotive"
    compliance_note = "API JSON publica e gratuita documentada em remotive.com/api."
    ENDPOINT = "https://remotive.com/api/remote-jobs"

    async def fetch(self, fetcher: PoliteFetcher, profile: Profile) -> list[RawJob]:
        jobs: list[RawJob] = []
        for query in self.queries(profile):
            data = await fetcher.get_json(
                self.ENDPOINT, params={"search": query, "limit": 100}
            )
            for item in (data or {}).get("jobs", []) if isinstance(data, dict) else []:
                jobs.append(RawJob(
                    source=self.id,
                    external_id=str(item.get("id") or item.get("url") or ""),
                    title=item.get("title") or "",
                    company=item.get("company_name") or "",
                    url=item.get("url") or "",
                    description=item.get("description") or "",
                    location_raw=item.get("candidate_required_location") or "Remote",
                    salary_raw=item.get("salary") or "",
                    posted_at=self.parse_iso(item.get("publication_date")),
                    tags=[t for t in (item.get("tags") or []) if t] + [item.get("category") or ""],
                    extra={"job_type": item.get("job_type") or ""},
                ))
        return jobs


@register
class RemoteOkSource(JobSource):
    id = "remoteok"
    label = "RemoteOK"
    compliance_note = ("API JSON publica (remoteok.com/api). Exige User-Agent "
                       "identificavel e atribuicao da fonte, ambos respeitados.")
    ENDPOINT = "https://remoteok.com/api"

    async def fetch(self, fetcher: PoliteFetcher, profile: Profile) -> list[RawJob]:
        data = await fetcher.get_json(self.ENDPOINT)
        if not isinstance(data, list):
            return []
        jobs: list[RawJob] = []
        # O primeiro elemento do feed e um aviso legal, nao uma vaga.
        for item in data:
            if not isinstance(item, dict) or item.get("legal"):
                continue
            jobs.append(RawJob(
                source=self.id,
                external_id=str(item.get("id") or item.get("slug") or ""),
                title=item.get("position") or "",
                company=item.get("company") or "",
                url=item.get("url") or item.get("apply_url") or "",
                description=item.get("description") or "",
                location_raw=item.get("location") or "Remote",
                salary_raw=self._salary(item),
                posted_at=self.parse_iso(item.get("date")) or self.parse_epoch(item.get("epoch")),
                tags=[t for t in (item.get("tags") or []) if t],
            ))
        return jobs

    @staticmethod
    def _salary(item: dict) -> str:
        lo, hi = item.get("salary_min"), item.get("salary_max")
        if lo and hi:
            return f"USD {lo} - {hi} per year"
        if lo:
            return f"USD {lo}+ per year"
        return ""


@register
class ArbeitnowSource(JobSource):
    id = "arbeitnow"
    label = "Arbeitnow"
    compliance_note = "API JSON publica documentada em arbeitnow.com/api/job-board-api."
    ENDPOINT = "https://www.arbeitnow.com/api/job-board-api"

    async def fetch(self, fetcher: PoliteFetcher, profile: Profile) -> list[RawJob]:
        max_pages = int(self.config.get("max_pages", 2))
        wanted = {q.lower() for q in self.queries(profile)}
        jobs: list[RawJob] = []
        for page in range(1, max_pages + 1):
            data = await fetcher.get_json(self.ENDPOINT, params={"page": page})
            items = (data or {}).get("data", []) if isinstance(data, dict) else []
            if not items:
                break
            for item in items:
                blob = f"{item.get('title', '')} {' '.join(item.get('tags') or [])}".lower()
                # Feed global: filtramos localmente pelos termos de interesse.
                if wanted and not any(q in blob for q in wanted):
                    continue
                jobs.append(RawJob(
                    source=self.id,
                    external_id=str(item.get("slug") or item.get("url") or ""),
                    title=item.get("title") or "",
                    company=item.get("company_name") or "",
                    url=item.get("url") or "",
                    description=item.get("description") or "",
                    location_raw=("Remote" if item.get("remote") else (item.get("location") or "")),
                    posted_at=self.parse_epoch(item.get("created_at")),
                    tags=[t for t in (item.get("tags") or []) if t]
                         + [t for t in (item.get("job_types") or []) if t],
                ))
        return jobs


@register
class HimalayasSource(JobSource):
    id = "himalayas"
    label = "Himalayas"
    compliance_note = "API JSON publica documentada em himalayas.app/jobs/api."
    ENDPOINT = "https://himalayas.app/jobs/api"

    async def fetch(self, fetcher: PoliteFetcher, profile: Profile) -> list[RawJob]:
        wanted = {q.lower() for q in self.queries(profile)}
        data = await fetcher.get_json(self.ENDPOINT, params={"limit": 100})
        items = (data or {}).get("jobs", []) if isinstance(data, dict) else []
        jobs: list[RawJob] = []
        for item in items:
            blob = f"{item.get('title', '')} {' '.join(item.get('categories') or [])}".lower()
            if wanted and not any(q in blob for q in wanted):
                continue
            locations = item.get("locationRestrictions") or []
            jobs.append(RawJob(
                source=self.id,
                external_id=str(item.get("guid") or item.get("applicationLink") or ""),
                title=item.get("title") or "",
                company=item.get("companyName") or "",
                url=item.get("applicationLink") or item.get("url") or "",
                description=item.get("description") or item.get("excerpt") or "",
                location_raw=", ".join(locations) if locations else "Remote",
                salary_raw=self._salary(item),
                posted_at=self.parse_epoch(item.get("pubDate")),
                tags=[t for t in (item.get("categories") or []) if t],
            ))
        return jobs

    @staticmethod
    def _salary(item: dict) -> str:
        lo, hi = item.get("minSalary"), item.get("maxSalary")
        currency = item.get("salaryCurrency") or "USD"
        if lo and hi:
            return f"{currency} {lo} - {hi} per year"
        if lo:
            return f"{currency} {lo}+ per year"
        return ""
