"""Fontes: parsing de payload real, datas honestas e compliance."""
from __future__ import annotations

from datetime import datetime, timezone

import pytest

from app.sources import DEFAULT_SOURCES, build_sources, load_source_configs
from app.sources.base import REGISTRY, JobSource
from app.sources.boards import ArbeitnowSource, HimalayasSource, RemoteOkSource, RemotiveSource
from app.sources.manual import ManualSearchLinksSource, raw_job_from_manual_input
from app.sources.rss import RssSource, parse_rfc2822, split_title


# --- registro e config -----------------------------------------------------
def test_all_registered_sources_declare_compliance():
    assert REGISTRY
    for source_id, cls in REGISTRY.items():
        assert cls.id == source_id
        assert cls.label, source_id
        assert cls.compliance_note, f"{source_id} sem nota de compliance"


def test_config_falls_back_to_defaults(tmp_path):
    assert load_source_configs(tmp_path / "missing.yaml") == DEFAULT_SOURCES


def test_config_merges_defaults_section(tmp_path):
    path = tmp_path / "sources.yaml"
    path.write_text(
        "defaults:\n  max_pages: 5\nsources:\n"
        "  - id: remotive\n    enabled: true\n"
        "  - id: remoteok\n    enabled: false\n",
        encoding="utf-8",
    )
    configs = load_source_configs(path)
    assert configs[0]["max_pages"] == 5
    built = build_sources(configs)
    assert [s.id for s in built] == ["remotive"]     # remoteok esta desabilitada


def test_unknown_source_ids_are_ignored():
    built = build_sources([{"id": "nao_existe", "enabled": True}])
    assert built == []


def test_only_filter_restricts_sources():
    configs = [{"id": "remotive", "enabled": True}, {"id": "remoteok", "enabled": True}]
    built = build_sources(configs, only=["remoteok"])
    assert [s.id for s in built] == ["remoteok"]


# --- parsing de datas ------------------------------------------------------
def test_iso_dates_parse_to_utc():
    parsed = JobSource.parse_iso("2026-08-20T10:30:00Z")
    assert parsed == datetime(2026, 8, 20, 10, 30, tzinfo=timezone.utc)
    assert JobSource.parse_iso("2026-08-20") is not None


def test_unparseable_dates_return_none_not_now():
    """Nunca substituimos uma data invalida por 'agora'."""
    for value in (None, "", "nao informado", "yesterday", "0000", 12345):
        assert JobSource.parse_iso(value) is None


def test_epoch_parsing_handles_seconds_and_milliseconds():
    seconds = JobSource.parse_epoch(1755000000)
    millis = JobSource.parse_epoch(1755000000000)
    assert seconds == millis
    assert JobSource.parse_epoch(0) is None
    assert JobSource.parse_epoch("nao numero") is None


def test_rfc2822_rss_dates():
    parsed = parse_rfc2822("Wed, 20 Aug 2026 10:30:00 +0000")
    assert parsed.year == 2026 and parsed.month == 8
    assert parse_rfc2822("data invalida") is None
    assert parse_rfc2822(None) is None


# --- RSS -------------------------------------------------------------------
RSS_SAMPLE = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <item>
    <title>Acme Corp: Senior Backend Engineer</title>
    <link>https://weworkremotely.com/remote-jobs/acme-backend</link>
    <description>We need Java and Spring Boot. 5+ years.</description>
    <pubDate>Wed, 20 Aug 2026 10:30:00 +0000</pubDate>
    <region>Anywhere in the World</region>
  </item>
  <item>
    <title>Globex: Java Developer</title>
    <link>https://weworkremotely.com/remote-jobs/globex-java</link>
    <description>Java role.</description>
  </item>
</channel></rss>"""


def test_rss_parsing_extracts_company_from_title():
    jobs = RssSource({}).parse_feed(RSS_SAMPLE)
    assert len(jobs) == 2
    assert jobs[0].company == "Acme Corp"
    assert jobs[0].title == "Senior Backend Engineer"
    assert jobs[0].url.startswith("https://")
    assert jobs[0].posted_at is not None


def test_rss_item_without_pubdate_has_no_date():
    """Item sem pubDate fica com posted_at=None, nao com a data de hoje."""
    jobs = RssSource({}).parse_feed(RSS_SAMPLE)
    assert jobs[1].posted_at is None


def test_malformed_feed_returns_empty_instead_of_raising():
    assert RssSource({}).parse_feed("<not xml") == []
    assert RssSource({}).parse_feed("") == []


def test_split_title_leaves_plain_titles_alone():
    assert split_title("Backend Engineer") == ("Backend Engineer", "")
    assert split_title("Acme: Backend Engineer") == ("Backend Engineer", "Acme")


# --- fontes que nao raspamos ----------------------------------------------
def test_manual_source_makes_no_requests():
    note = ManualSearchLinksSource({}).compliance_note.lower()
    assert "scraping" in note
    assert "nenhuma requisicao" in note or "nenhuma requisição" in note


@pytest.mark.asyncio
async def test_manual_source_fetch_returns_nothing(profile):
    """A fonte de links nunca devolve vagas: ela nao acessa os sites."""
    assert await ManualSearchLinksSource({}).fetch(None, profile) == []


def test_manual_links_are_built_from_your_titles(profile):
    links = ManualSearchLinksSource({}).build_links(profile)
    assert links
    for link in links:
        assert link["url"].startswith("https://")
        assert link["note"]
    joined = " ".join(l["url"] for l in links)
    assert "linkedin.com" in joined


def test_manual_import_preserves_unknown_date():
    raw = raw_job_from_manual_input(
        title="Backend Engineer", company="Acme", url="https://acme.com/1"
    )
    assert raw.posted_at is None
    assert raw.source == "manual"
    assert raw.external_id == "https://acme.com/1"


def test_manual_import_without_url_still_gets_an_id():
    raw = raw_job_from_manual_input(title="Backend Engineer", company="Acme")
    assert raw.external_id


# --- payloads das APIs publicas -------------------------------------------
def test_source_queries_fall_back_to_profile_titles(profile):
    assert RemotiveSource({}).queries(profile) == profile.preferences.desired_titles[:4]
    assert RemotiveSource({"queries": ["java"]}).queries(profile) == ["java"]


def test_remoteok_salary_formatting():
    assert "USD" in RemoteOkSource._salary({"salary_min": 60000, "salary_max": 90000})
    assert RemoteOkSource._salary({}) == ""


def test_himalayas_salary_formatting():
    formatted = HimalayasSource._salary(
        {"minSalary": 50000, "maxSalary": 70000, "salaryCurrency": "USD"}
    )
    assert "USD" in formatted and "per year" in formatted
    assert HimalayasSource._salary({}) == ""


class FakeFetcher:
    """Fetcher de teste: devolve payloads fixos, sem rede."""

    def __init__(self, payload):
        self.payload = payload
        self.calls = []

    async def get_json(self, url, params=None):
        self.calls.append((url, params))
        return self.payload

    async def get_text(self, url, params=None):
        self.calls.append((url, params))
        return self.payload


@pytest.mark.asyncio
async def test_remotive_payload_is_normalised(profile):
    fetcher = FakeFetcher({"jobs": [{
        "id": 123, "title": "Backend Engineer", "company_name": "Acme",
        "url": "https://remotive.com/jobs/123",
        "description": "Java and Spring Boot",
        "candidate_required_location": "Brazil",
        "publication_date": "2026-08-20T10:00:00",
        "salary": "$60,000 - $80,000", "tags": ["java", "backend"],
        "category": "Software Development",
    }]})
    jobs = await RemotiveSource({"queries": ["java"]}).fetch(fetcher, profile)
    assert len(jobs) == 1
    job = jobs[0]
    assert job.source == "remotive"
    assert job.external_id == "123"
    assert job.company == "Acme"
    assert job.posted_at is not None
    assert "java" in job.tags


@pytest.mark.asyncio
async def test_remoteok_skips_the_legal_notice_entry(profile):
    fetcher = FakeFetcher([
        {"legal": "RemoteOK terms notice"},
        {"id": "1", "position": "Backend Engineer", "company": "Acme",
         "url": "https://remoteok.com/l/1", "description": "Java",
         "location": "Worldwide", "date": "2026-08-20T00:00:00+00:00", "tags": ["java"]},
    ])
    jobs = await RemoteOkSource({}).fetch(fetcher, profile)
    assert len(jobs) == 1
    assert jobs[0].title == "Backend Engineer"


@pytest.mark.asyncio
async def test_arbeitnow_filters_by_query_locally(profile):
    fetcher = FakeFetcher({"data": [
        {"slug": "a", "title": "Java Backend Engineer", "company_name": "Acme",
         "url": "https://arbeitnow.com/a", "description": "Java", "remote": True,
         "created_at": 1755000000, "tags": ["java"], "job_types": ["full_time"]},
        {"slug": "b", "title": "Marketing Manager", "company_name": "Globex",
         "url": "https://arbeitnow.com/b", "description": "Ads", "remote": True,
         "created_at": 1755000000, "tags": ["marketing"], "job_types": []},
    ]})
    jobs = await ArbeitnowSource({"queries": ["java"], "max_pages": 1}).fetch(fetcher, profile)
    assert [j.title for j in jobs] == ["Java Backend Engineer"]


@pytest.mark.asyncio
async def test_ats_sources_do_nothing_without_configured_companies(profile):
    from app.sources.ats import AshbySource, GreenhouseSource, LeverSource
    for cls in (GreenhouseSource, LeverSource, AshbySource):
        assert await cls({"companies": []}).fetch(FakeFetcher({}), profile) == []


@pytest.mark.asyncio
async def test_one_broken_company_does_not_stop_the_others(profile):
    from app.sources.ats import GreenhouseSource

    class FlakyFetcher(FakeFetcher):
        async def get_json(self, url, params=None):
            if "broken" in url:
                raise RuntimeError("404 board nao existe")
            return {"jobs": [{
                "id": 1, "title": "Backend Engineer", "absolute_url": "https://gh.io/1",
                "content": "Java", "location": {"name": "Remote - Brazil"},
                "first_published": "2026-08-20T10:00:00Z", "company_name": "Good",
            }]}

    jobs = await GreenhouseSource({"companies": ["broken", "good"]}).fetch(
        FlakyFetcher(None), profile
    )
    assert len(jobs) == 1
    assert jobs[0].company == "Good"
