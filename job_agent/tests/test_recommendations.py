"""Geracao de recomendacoes: analise, relatorio e metricas."""
from __future__ import annotations

from app.crawler.normalize import normalize
from app.database import repository as repo
from app.models.enums import Recommendation
from app.ranking.fit import analyze
from app.reports import metrics
from tests.conftest import make_raw


def store(session, profile, **kwargs):
    job = normalize(make_raw(**kwargs), profile)
    row, _ = repo.upsert_job(session, job, analyze(job, profile))
    return row


# --- recomendacao por vaga -------------------------------------------------
def test_recommendation_explains_both_sides(profile):
    job = normalize(make_raw(
        title="Backend Engineer",
        description="Java, Spring Boot, Kubernetes, Kafka required. 3+ years. Remote Brazil.",
        location="Remote - Brazil",
    ), profile)
    analysis = analyze(job, profile)

    assert analysis.why_it_fits, "faltou explicar por que combina"
    assert analysis.matched_requirements, "faltou listar o que voce ja tem"
    assert analysis.missing_requirements, "faltou listar o que falta"
    assert analysis.should_apply_reason, "faltou a recomendacao de acao"
    assert analysis.recommendation in list(Recommendation)


def test_missing_requirements_are_split_by_criticality(profile):
    job = normalize(make_raw(
        description="Must have Java. Must have Python. Terraform is nice to have.",
    ), profile)
    analysis = analyze(job, profile)
    assert set(analysis.critical_missing) | set(analysis.nice_to_have_missing) \
        == set(analysis.missing_requirements)
    assert not set(analysis.critical_missing) & set(analysis.nice_to_have_missing)


def test_growth_opportunities_exclude_what_you_already_know(profile):
    job = normalize(make_raw(description="Java, Docker, Kafka, Kubernetes."), profile)
    analysis = analyze(job, profile)
    known = profile.known_technologies()
    assert all(tech not in known for tech in analysis.growth_opportunities)
    assert "kafka" in analysis.growth_opportunities


def test_liferay_only_job_scores_lower_on_growth(profile):
    liferay = normalize(make_raw(description="Liferay DXP and Java maintenance.",
                                 external_id="a", url="https://a.com/1"), profile)
    broad = normalize(make_raw(description="Java, Spring Boot, PostgreSQL, Kafka, AWS.",
                               external_id="b", url="https://b.com/1"), profile)
    assert (analyze(broad, profile).breakdown.growth_potential
            > analyze(liferay, profile).breakdown.growth_potential)


# --- metricas --------------------------------------------------------------
def test_overview_on_empty_database(db_session):
    overview = metrics.overview(db_session)
    assert overview["total_jobs"] == 0
    assert overview["response_rate"] == 0.0
    assert overview["avg_salary_brl_month"] is None


def test_overview_counts_by_category(db_session, profile):
    store(db_session, profile, external_id="a", url="https://a.com/1",
          title="Associate Backend Engineer",
          description="Java, Spring Boot, Docker. 2 years. Remote Brazil.",
          location="Remote - Brazil")
    store(db_session, profile, external_id="b", url="https://b.com/1",
          title="Senior Staff Engineer", description="Go and Rust. 10+ years.")

    overview = metrics.overview(db_session)
    assert overview["total_jobs"] == 2
    assert overview["new_jobs"] == 2
    assert overview["applications_sent"] == 0


def test_average_salary_ignores_jobs_without_salary(db_session, profile):
    store(db_session, profile, external_id="a", url="https://a.com/1",
          salary="R$ 10.000 por mes")
    store(db_session, profile, external_id="b", url="https://b.com/1", salary="")
    assert metrics.overview(db_session)["avg_salary_brl_month"] == 10000.0


def test_top_technologies_and_companies(db_session, profile):
    store(db_session, profile, external_id="a", url="https://a.com/1", company="Acme",
          description="Java and Spring Boot.")
    store(db_session, profile, external_id="b", url="https://b.com/1", company="Acme",
          title="Java Developer II", description="Java and PostgreSQL.")

    techs = dict(metrics.top_technologies(db_session))
    assert techs.get("java") == 2
    companies = dict(metrics.top_companies(db_session))
    assert companies.get("Acme") == 2


def test_applications_per_week_returns_the_full_window(db_session):
    weeks = metrics.applications_per_week(db_session, weeks=6)
    assert len(weeks) == 6
    assert all(w["count"] == 0 for w in weeks)
    assert all(w["week_start"] and w["week_end"] for w in weeks)


def test_recency_distribution(db_session, profile):
    store(db_session, profile, external_id="a", url="https://a.com/1", posted_days_ago=2)
    store(db_session, profile, external_id="b", url="https://b.com/1", posted_days_ago=20)
    distribution = metrics.recency_distribution(db_session)
    assert distribution.get("excellent") == 1
    assert distribution.get("acceptable") == 1


# --- relatorio -------------------------------------------------------------
def test_weekly_report_has_every_required_section(db_session, profile):
    store(db_session, profile, external_id="a", url="https://a.com/1",
          description="Java, Spring Boot, Kafka. Remote Brazil.", salary="R$ 11.000 por mes")

    report = metrics.weekly_report(db_session, days=7, profile=profile)
    for key in ("jobs_found", "jobs_relevant", "applications_sent", "interviews",
                "rejections", "response_rate", "top_technologies", "top_companies",
                "salary_range", "profile_recommendations"):
        assert key in report, f"secao ausente: {key}"
    assert report["jobs_found"] == 1


def test_weekly_report_recommends_gaps_that_match_your_goals(db_session, profile):
    for index in range(4):
        store(db_session, profile, external_id=f"j{index}",
              url=f"https://acme.com/{index}", title=f"Backend Engineer {index}",
              description="Java with Spring Boot and Kafka required.")

    report = metrics.weekly_report(db_session, days=7, profile=profile)
    joined = " ".join(report["profile_recommendations"]).lower()
    assert "spring" in joined or "kafka" in joined
    assert "objetivos de carreira" in joined


def test_report_flags_missing_profile_data(db_session, profile):
    """Perfil sem anos por tecnologia deve gerar recomendacao de preenchimento."""
    profile.experience.years_by_technology = {}

    report = metrics.weekly_report(db_session, days=7, profile=profile)
    joined = " ".join(report["profile_recommendations"]).lower()
    assert "years_by_technology" in joined


def test_report_text_is_human_readable(db_session, profile):
    store(db_session, profile, external_id="a", url="https://a.com/1",
          description="Java and Spring Boot.")
    text = metrics.format_weekly_report(metrics.weekly_report(db_session, days=7, profile=profile))
    assert "RELATORIO" in text
    assert "Vagas encontradas" in text
    assert "Recomendacoes para o seu perfil" in text
    assert len(text.splitlines()) > 15


def test_report_handles_no_salary_data_gracefully(db_session, profile):
    store(db_session, profile, external_id="a", url="https://a.com/1", salary="")
    text = metrics.format_weekly_report(metrics.weekly_report(db_session, days=7, profile=profile))
    assert "Nenhuma vaga do periodo informou salario" in text
