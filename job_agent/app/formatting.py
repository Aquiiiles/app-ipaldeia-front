"""Formatacao de valores para exibicao. Sem dependencias internas."""
from __future__ import annotations


def format_brl(value: float, decimals: int = 2) -> str:
    """Formata em pt-BR: 12345.6 -> 'R$ 12.345,60'."""
    formatted = f"{value:,.{decimals}f}"          # 12,345.60 (en-US)
    integer, _, fraction = formatted.partition(".")
    integer = integer.replace(",", ".")
    return f"R$ {integer},{fraction}" if fraction else f"R$ {integer}"
