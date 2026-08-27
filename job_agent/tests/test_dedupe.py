"""Deduplicacao: a mesma vaga em fontes diferentes vira uma entrada."""
from __future__ import annotations

from app.crawler.dedupe import (
    canonical_title, canonical_url, dedupe_key, group_duplicates,
    is_duplicate, normalize_company, pick_canonical, title_similarity,
)
from app.crawler.normalize import normalize
from tests.conftest import make_raw


def norm(profile, **kwargs):
    return normalize(make_raw(**kwargs), profile)


# --- URL canonica ----------------------------------------------------------
def test_tracking_params_and_www_are_stripped():
    a = canonical_url("https://www.acme.com/jobs/42/?utm_source=linkedin&gh_src=abc")
    b = canonical_url("http://acme.com/jobs/42")
    assert a == b


def test_meaningful_query_params_are_preserved():
    url = canonical_url("https://acme.com/jobs?id=42&utm_medium=email")
    assert "id=42" in url
    assert "utm_medium" not in url


def test_fragment_and_trailing_slash_ignored():
    assert canonical_url("https://acme.com/jobs/42/#apply") == canonical_url("https://acme.com/jobs/42")


# --- empresa e titulo ------------------------------------------------------
def test_company_suffixes_collapse():
    assert normalize_company("Nubank S.A.") == normalize_company("nubank")
    assert normalize_company("Acme Technologies Ltda.") == normalize_company("ACME")


def test_title_noise_is_removed():
    assert canonical_title("Backend Engineer (Remote, Brasil)") == canonical_title("backend engineer")
    assert canonical_title("Java Developer - 100% Remoto") == canonical_title("java developer")


def test_dedupe_key_is_stable_across_formatting():
    assert (dedupe_key("Nubank S.A.", "Backend Engineer (Remote)")
            == dedupe_key("nubank", "backend engineer"))


# --- deteccao de duplicata -------------------------------------------------
def test_same_url_from_different_sources_is_duplicate(profile):
    a = norm(profile, source="remotive", external_id="1", url="https://acme.com/jobs/9")
    b = norm(profile, source="linkedin", external_id="2",
             url="https://www.acme.com/jobs/9?utm_source=li")
    assert is_duplicate(a, b)


def test_same_company_and_title_different_urls_is_duplicate(profile):
    a = norm(profile, company="Acme", title="Backend Engineer",
             url="https://boards.greenhouse.io/acme/jobs/1", source="greenhouse", external_id="g1")
    b = norm(profile, company="Acme Inc.", title="Backend Engineer (Remote)",
             url="https://jobs.lever.co/acme/2", source="lever", external_id="l1")
    assert is_duplicate(a, b)


def test_similar_titles_at_same_company_are_duplicates(profile):
    a = norm(profile, company="Acme", title="Backend Software Engineer",
             url="https://acme.com/a", external_id="a")
    b = norm(profile, company="Acme", title="Backend Software Engineers",
             url="https://acme.com/b", external_id="b")
    assert is_duplicate(a, b)


def test_different_roles_at_same_company_are_not_duplicates(profile):
    a = norm(profile, company="Acme", title="Backend Engineer",
             url="https://acme.com/a", external_id="a")
    b = norm(profile, company="Acme", title="Data Scientist",
             url="https://acme.com/b", external_id="b")
    assert not is_duplicate(a, b)


def test_same_title_at_different_companies_is_not_duplicate(profile):
    a = norm(profile, company="Acme", title="Backend Engineer",
             url="https://acme.com/a", external_id="a")
    b = norm(profile, company="Globex", title="Backend Engineer",
             url="https://globex.com/b", external_id="b")
    assert not is_duplicate(a, b)


def test_title_similarity_bounds():
    assert title_similarity("Backend Engineer", "Backend Engineer") == 1.0
    assert title_similarity("Backend Engineer", "Frontend Designer") < 0.6


# --- agrupamento -----------------------------------------------------------
def test_grouping_returns_one_canonical_per_position(profile):
    jobs = [
        norm(profile, company="Acme", title="Backend Engineer",
             url="https://acme.com/1", source="remotive", external_id="r1"),
        norm(profile, company="Acme Inc", title="Backend Engineer (Remote)",
             url="https://acme.com/2", source="lever", external_id="l1"),
        norm(profile, company="Globex", title="Java Developer",
             url="https://globex.com/1", source="remotive", external_id="r2"),
    ]
    groups = group_duplicates(jobs)
    assert len(groups) == 2
    sizes = sorted(1 + len(dups) for _, dups in groups)
    assert sizes == [1, 2]


def test_canonical_prefers_known_date_over_unknown(profile):
    with_date = norm(profile, url="https://acme.com/1", external_id="a", posted_days_ago=10)
    without_date = norm(profile, url="https://acme.com/1", external_id="b", posted_days_ago=None)
    assert pick_canonical([without_date, with_date]) is with_date


def test_canonical_prefers_the_more_recent_posting(profile):
    older = norm(profile, url="https://acme.com/1", external_id="a", posted_days_ago=20)
    newer = norm(profile, url="https://acme.com/1", external_id="b", posted_days_ago=2)
    assert pick_canonical([older, newer]) is newer


def test_canonical_prefers_richer_description_when_dates_tie(profile):
    thin = norm(profile, url="https://acme.com/1", external_id="a",
                posted_days_ago=5, description="Java.")
    rich = norm(profile, url="https://acme.com/1", external_id="b",
                posted_days_ago=5, description="Java, Spring Boot. " * 60)
    assert pick_canonical([thin, rich]) is rich


def test_empty_input_groups_to_nothing():
    assert group_duplicates([]) == []
