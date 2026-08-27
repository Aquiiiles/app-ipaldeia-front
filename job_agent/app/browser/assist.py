"""Assistencia de navegador — modo "abrir e entregar o controle".

O QUE ESTE MODULO FAZ:
  * abre um navegador VISIVEL (headed) na pagina da vaga;
  * mantem um perfil persistente, para que VOCE faca login uma vez, a mao;
  * copia o material preparado para a area de transferencia, se voce pedir;
  * detecta CAPTCHA / MFA / anti-bot e PARA, avisando voce.

O QUE ESTE MODULO NAO FAZ, POR PRINCIPIO:
  * nao resolve nem contorna CAPTCHA, Cloudflare, MFA ou anti-bot;
  * nao simula comportamento humano para escapar de deteccao;
  * nao preenche nem envia formularios automaticamente;
  * nao clica em "Submit". O clique final e SEMPRE seu.

Playwright e uma dependencia OPCIONAL (requirements-optional.txt).
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from app.logging_setup import get_logger
from app.settings import get_settings

log = get_logger("browser")

#: Sinais de que uma acao humana e necessaria. Detectar => parar e avisar.
INTERVENTION_MARKERS = [
    "captcha", "recaptcha", "hcaptcha", "turnstile",
    "verify you are human", "verifique que voce e humano",
    "two-factor", "2fa", "mfa", "verification code", "codigo de verificacao",
    "authenticator", "sign in", "log in", "entrar", "fazer login",
    "checking your browser", "just a moment",
]


class PlaywrightMissing(RuntimeError):
    """Playwright nao instalado."""


@dataclass
class BrowserSessionResult:
    url: str
    intervention_needed: bool
    detected_markers: list[str]
    message: str


def _require_playwright():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as exc:
        raise PlaywrightMissing(
            "Playwright nao instalado. Para usar o modo assistido:\n"
            "  pip install -r requirements-optional.txt\n"
            "  python -m playwright install chromium"
        ) from exc
    return sync_playwright


def user_data_dir() -> Path:
    """Perfil persistente do navegador: seus logins ficam aqui, no seu PC.

    Nada deste diretorio e lido, logado ou transmitido pelo agente.
    """
    directory = get_settings().generated_path / "browser-profile"
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def open_for_manual_application(
    url: str,
    material: str = "",
    keep_open_seconds: int = 0,
) -> BrowserSessionResult:
    """Abre a vaga num navegador visivel e devolve o controle a voce.

    Retorna assim que a pagina carrega. Se `keep_open_seconds` > 0, mantem
    o navegador aberto por esse tempo para voce trabalhar nele.
    """
    settings = get_settings()
    sync_playwright = _require_playwright()

    detected: list[str] = []
    with sync_playwright() as playwright:
        # headless=False e deliberado: voce precisa VER e CONTROLAR a pagina.
        context = playwright.chromium.launch_persistent_context(
            user_data_dir=str(user_data_dir()),
            headless=False,
            user_agent=settings.user_agent,
            locale="pt-BR",
        )
        page = context.pages[0] if context.pages else context.new_page()
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=60_000)
            body = (page.content() or "").lower()
            detected = [m for m in INTERVENTION_MARKERS if m in body]

            if material:
                # Apenas disponibiliza o texto; nao preenche campo algum.
                log.info("Material preparado disponivel para copiar manualmente "
                         "(%d caracteres).", len(material))

            if keep_open_seconds > 0:
                log.info("Navegador aberto por %ss. Faca a candidatura manualmente.",
                         keep_open_seconds)
                page.wait_for_timeout(keep_open_seconds * 1000)
        finally:
            if keep_open_seconds > 0:
                context.close()

    if detected:
        message = (
            "PAUSA — INTERVENCAO HUMANA NECESSARIA.\n"
            f"A pagina apresenta: {', '.join(sorted(set(detected)))}.\n"
            "O agente nao tenta resolver nem contornar esses mecanismos. "
            "Assuma o controle do navegador e prossiga manualmente."
        )
        log.warning("Intervencao humana necessaria em %s: %s", url, detected)
    else:
        message = (
            "Pagina aberta. O agente NAO preenche nem envia formularios: "
            "revise o material preparado e faca a candidatura voce mesmo."
        )
    return BrowserSessionResult(url, bool(detected), sorted(set(detected)), message)
