"""Parsing conservador de salario, convertido para BRL/mes.

Se houver qualquer ambiguidade, retornamos None: um salario errado
distorce o score e a decisao. Melhor "desconhecido" do que chute.
"""
from __future__ import annotations

import re

from app.crawler.extract import normalize_text

#: Taxas de cambio APROXIMADAS, usadas apenas para comparacao relativa
#: local. Editaveis via config no futuro; nao sao cotacao real.
APPROX_RATES_TO_BRL: dict[str, float] = {
    "BRL": 1.0,
    "USD": 5.4,
    "EUR": 5.9,
    "GBP": 6.9,
}

_CURRENCY_HINTS = [
    (["r$", "brl", "reais", "real"], "BRL"),
    (["us$", "usd", "u$s", "$"], "USD"),
    (["eur", "€"], "EUR"),
    (["gbp", "£"], "GBP"),
]

_MONTHLY_HINTS = ["/mes", "por mes", "mensal", "per month", "/month", "monthly", "/mo", "pm)"]
_YEARLY_HINTS = ["/ano", "por ano", "anual", "per year", "/year", "yearly", "annually", "/yr", "k/yr", "pa)"]
_HOURLY_HINTS = ["/hora", "por hora", "per hour", "/hour", "hourly", "/hr"]


def _detect_currency(blob: str) -> str | None:
    for tokens, code in _CURRENCY_HINTS:
        if any(t in blob for t in tokens):
            return code
    return None


def _detect_period(blob: str) -> str | None:
    if any(h in blob for h in _MONTHLY_HINTS):
        return "month"
    if any(h in blob for h in _YEARLY_HINTS):
        return "year"
    if any(h in blob for h in _HOURLY_HINTS):
        return "hour"
    return None


def _parse_number(raw: str) -> float | None:
    """Converte '10.500,00', '10,500', '120k' em float."""
    token = raw.strip().lower().replace(" ", "")
    multiplier = 1.0
    if token.endswith("k"):
        multiplier = 1000.0
        token = token[:-1]
    if "," in token and "." in token:
        # Formato pt-BR (1.234,56) vs en-US (1,234.56): decide pelo ultimo separador.
        token = token.replace(".", "").replace(",", ".") if token.rfind(",") > token.rfind(".") else token.replace(",", "")
    elif "," in token:
        # Virgula como decimal so se houver 1-2 digitos depois.
        parts = token.split(",")
        token = token.replace(",", ".") if len(parts) == 2 and len(parts[1]) <= 2 else token.replace(",", "")
    elif "." in token:
        # Ponto isolado: separador de milhar em pt-BR ("10.000") quando o
        # ultimo grupo tem exatamente 3 digitos; caso contrario, decimal.
        groups = token.split(".")
        if len(groups[-1]) == 3 and all(g.isdigit() for g in groups):
            token = token.replace(".", "")
    try:
        value = float(token) * multiplier
    except ValueError:
        return None
    return value if value > 0 else None


def parse_salary_to_brl_month(raw: str) -> tuple[float | None, float | None]:
    """Retorna (min_brl_mes, max_brl_mes). (None, None) se indeterminavel."""
    if not raw or not raw.strip():
        return None, None
    blob = normalize_text(raw)
    currency = _detect_currency(blob)
    period = _detect_period(blob)

    numbers = [n for n in (_parse_number(m) for m in re.findall(r"\d[\d.,]*\s*k?", blob)) if n]
    # Descarta valores absurdos (anos, quantidades de vagas, etc.).
    numbers = [n for n in numbers if 100 <= n <= 5_000_000]
    if not numbers:
        return None, None

    if currency is None:
        # Sem moeda explicita nao ha como converter com honestidade.
        return None, None
    if period is None:
        # Heuristica minima e conservadora: valores altos sao anuais.
        period = "year" if max(numbers) >= 30_000 else "month"

    rate = APPROX_RATES_TO_BRL.get(currency)
    if rate is None:
        return None, None

    def to_month(value: float) -> float:
        if period == "year":
            value = value / 12.0
        elif period == "hour":
            value = value * 160.0
        return round(value * rate, 2)

    lo, hi = min(numbers), max(numbers)
    lo_m, hi_m = to_month(lo), to_month(hi)
    # Faixas implausiveis indicam parse ruim; melhor descartar.
    if hi_m < 500 or lo_m > 500_000:
        return None, None
    return lo_m, (hi_m if hi_m != lo_m else None)
