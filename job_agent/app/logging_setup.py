"""Logging com redacao obrigatoria de segredos.

Qualquer valor de API key conhecido, ou linha que pareca conter
token/senha/cookie, e mascarado ANTES de ir para arquivo ou console.
"""
from __future__ import annotations

import logging
import re
from logging.handlers import RotatingFileHandler

from app.settings import get_settings

REDACTED = "***REDACTED***"

# Padroes de segredo em texto livre (ex.: um dict logado por acidente).
_PATTERNS = [
    re.compile(r"(?i)\b(api[_-]?key|authorization|bearer|token|secret|password|senha|passwd|cookie|set-cookie|session[_-]?id|csrf)\b\s*[:=]\s*[\"']?([^\s\"',;}]+)"),
    re.compile(r"\bsk-[A-Za-z0-9_\-]{12,}"),
    re.compile(r"\bsk-ant-[A-Za-z0-9_\-]{12,}"),
    re.compile(r"\bghp_[A-Za-z0-9]{20,}"),
]


class SecretRedactingFilter(logging.Filter):
    def __init__(self, secrets: list[str] | None = None) -> None:
        super().__init__()
        self._secrets = [s for s in (secrets or []) if s and len(s) >= 8]

    def _scrub(self, text: str) -> str:
        for secret in self._secrets:
            text = text.replace(secret, REDACTED)
        for pattern in _PATTERNS:
            if pattern.groups >= 2:
                text = pattern.sub(lambda m: f"{m.group(1)}={REDACTED}", text)
            else:
                text = pattern.sub(REDACTED, text)
        return text

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = self._scrub(record.msg)
        if record.args:
            # Somente strings sao mascaradas: converter numeros quebraria os
            # especificadores %d/%f da mensagem.
            if isinstance(record.args, dict):
                record.args = {
                    k: (self._scrub(v) if isinstance(v, str) else v)
                    for k, v in record.args.items()
                }
            else:
                record.args = tuple(
                    self._scrub(a) if isinstance(a, str) else a for a in record.args
                )
        return True


def setup_logging() -> logging.Logger:
    settings = get_settings()
    settings.logs_dir.mkdir(parents=True, exist_ok=True)

    root = logging.getLogger("job_agent")
    if root.handlers:
        return root

    root.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))
    fmt = logging.Formatter("%(asctime)s %(levelname)-7s [%(name)s] %(message)s")
    redactor = SecretRedactingFilter(settings.secret_values)

    console = logging.StreamHandler()
    console.setFormatter(fmt)
    console.addFilter(redactor)
    root.addHandler(console)

    file_handler = RotatingFileHandler(
        settings.logs_dir / "job_agent.log", maxBytes=2_000_000, backupCount=5, encoding="utf-8"
    )
    file_handler.setFormatter(fmt)
    file_handler.addFilter(redactor)
    root.addHandler(file_handler)

    root.propagate = False
    return root


def get_logger(name: str) -> logging.Logger:
    setup_logging()
    return logging.getLogger(f"job_agent.{name}")
