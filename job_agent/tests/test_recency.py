"""Recencia: a data nunca e inventada e os cortes sao respeitados."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app.crawler.recency import age_in_days, classify, should_discard
from app.models.enums import Recency
from tests.conftest import days_ago, utcnow


@pytest.mark.parametrize("days,expected", [
    (0, Recency.EXCELLENT),
    (7, Recency.EXCELLENT),
    (8, Recency.GOOD),
    (14, Recency.GOOD),
    (15, Recency.ACCEPTABLE),
    (30, Recency.ACCEPTABLE),
    (31, Recency.LOW),
    (60, Recency.LOW),
    (61, Recency.IGNORE),
    (200, Recency.IGNORE),
])
def test_buckets_follow_configured_thresholds(profile, days, expected):
    bucket, age = classify(days_ago(days), profile.recency)
    assert bucket is expected
    assert age == days


def test_unknown_date_is_never_faked(profile):
    """Sem data, o bucket e o configurado e a idade permanece None."""
    bucket, age = classify(None, profile.recency)
    assert age is None
    assert bucket is Recency.ACCEPTABLE   # unknown_treated_as


def test_unknown_treated_as_is_configurable(profile):
    profile.recency.unknown_treated_as = "low"
    bucket, _ = classify(None, profile.recency)
    assert bucket is Recency.LOW


def test_updated_at_rescues_an_old_posting(profile):
    """Vaga antiga com atualizacao recente deixa de ser descartada.

    E a "evidencia clara de que a vaga continua aberta e foi atualizada".
    """
    stale, _ = classify(days_ago(120), profile.recency)
    assert stale is Recency.IGNORE

    rescued, age = classify(days_ago(120), profile.recency, updated_at=days_ago(2))
    assert rescued is Recency.EXCELLENT
    assert age == 2


def test_updated_at_older_than_posted_is_ignored(profile):
    bucket, age = classify(days_ago(3), profile.recency, updated_at=days_ago(90))
    assert bucket is Recency.EXCELLENT
    assert age == 3


def test_only_ignore_bucket_is_discarded():
    assert should_discard(Recency.IGNORE)
    for bucket in (Recency.EXCELLENT, Recency.GOOD, Recency.ACCEPTABLE,
                   Recency.LOW, Recency.UNKNOWN):
        assert not should_discard(bucket)


def test_age_handles_naive_and_aware_datetimes():
    naive = datetime.utcnow() - timedelta(days=5)
    aware = datetime.now(timezone.utc) - timedelta(days=5)
    assert age_in_days(naive) == 5
    assert age_in_days(aware) == 5
    assert age_in_days(None) is None


def test_future_dates_do_not_produce_negative_age():
    future = utcnow() + timedelta(days=3)
    assert age_in_days(future) == 0
