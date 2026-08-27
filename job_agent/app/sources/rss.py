"""Feeds RSS oficiais. Um feed RSS existe para ser consumido por maquina."""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

from app.crawler.fetcher import PoliteFetcher
from app.logging_setup import get_logger
from app.models.job import RawJob
from app.models.profile import Profile
from app.sources.base import JobSource, register

log = get_logger("sources.rss")


def parse_rfc2822(value: str | None) -> datetime | None:
    """Datas de RSS vem em RFC 2822. None se nao der parse — nunca chuta."""
    if not value:
        return None
    try:
        parsed = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        return None
    if parsed is None:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def split_title(raw_title: str) -> tuple[str, str]:
    """WeWorkRemotely usa 'Empresa: Titulo da vaga'."""
    if ":" in raw_title:
        company, _, title = raw_title.partition(":")
        if 1 < len(company.strip()) < 60:
            return title.strip(), company.strip()
    return raw_title.strip(), ""


@register
class RssSource(JobSource):
    id = "weworkremotely"
    label = "We Work Remotely (RSS)"
    compliance_note = "Feeds RSS publicos oficiais, destinados a consumo automatizado."

    DEFAULT_FEEDS = [
        "https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss",
    ]

    def feeds(self) -> list[str]:
        return [f for f in self.config.get("feeds", []) if f] or self.DEFAULT_FEEDS

    async def fetch(self, fetcher: PoliteFetcher, profile: Profile) -> list[RawJob]:
        jobs: list[RawJob] = []
        for feed_url in self.feeds():
            text = await fetcher.get_text(feed_url)
            jobs.extend(self.parse_feed(text, feed_url))
        return jobs

    def parse_feed(self, xml_text: str, feed_url: str = "") -> list[RawJob]:
        """Parse de RSS 2.0 e Atom. Tolerante, mas nunca inventa data."""
        try:
            root = ET.fromstring(xml_text.strip())
        except ET.ParseError as exc:
            log.warning("Feed invalido (%s): %s", feed_url, exc)
            return []

        ns = {"atom": "http://www.w3.org/2005/Atom"}
        items = root.findall(".//item") or root.findall(".//atom:entry", ns)

        jobs: list[RawJob] = []
        for item in items:
            def text_of(*paths: str) -> str:
                for path in paths:
                    node = item.find(path, ns) if path.startswith("atom:") else item.find(path)
                    if node is not None:
                        if node.text and node.text.strip():
                            return node.text.strip()
                        href = node.get("href")
                        if href:
                            return href.strip()
                return ""

            raw_title = text_of("title", "atom:title")
            if not raw_title:
                continue
            title, company = split_title(raw_title)
            link = text_of("link", "atom:link", "guid", "atom:id")
            description = text_of("description", "atom:summary", "atom:content", "content:encoded")
            region = text_of("region", "location")
            company = company or text_of("company")

            jobs.append(RawJob(
                source=self.id,
                external_id=text_of("guid", "atom:id") or link,
                title=title,
                company=company,
                url=link,
                description=description,
                location_raw=region or "Remote",
                posted_at=parse_rfc2822(text_of("pubDate"))
                          or self.parse_iso(text_of("atom:published", "atom:updated")),
                tags=[c.text.strip() for c in item.findall("category") if c.text],
            ))
        return jobs
