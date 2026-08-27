"""Cliente HTTP educado.

Garantias desta camada:
  * User-Agent identificavel com contato real;
  * robots.txt consultado e OBEDECIDO (inclusive Crawl-delay);
  * intervalo minimo entre requisicoes ao mesmo host;
  * teto de requisicoes por execucao;
  * respeito a Retry-After em 429/503;
  * deteccao de CAPTCHA / anti-bot -> PARA e avisa, nunca contorna.
"""
from __future__ import annotations

import asyncio
import time
import urllib.robotparser
from dataclasses import dataclass, field
from urllib.parse import urlsplit

import httpx

from app.logging_setup import get_logger
from app.settings import get_settings

log = get_logger("fetcher")


class BlockedByRobots(RuntimeError):
    """robots.txt proibe esta URL para o nosso User-Agent."""


class HumanInterventionRequired(RuntimeError):
    """CAPTCHA, login ou anti-bot detectado. O agente PARA aqui.

    Nunca tentamos resolver, contornar ou disfarcar. A acao correta e
    devolver o controle ao usuario.
    """


class RequestBudgetExceeded(RuntimeError):
    """Teto de requisicoes da execucao alcancado."""


#: Sinais de bloqueio/anti-bot no corpo ou nos headers da resposta.
_CHALLENGE_MARKERS = [
    "captcha", "recaptcha", "hcaptcha", "turnstile",
    "cf-challenge", "cf_chl_opt", "checking your browser",
    "verifique que voce e humano", "verificando seu navegador",
    "just a moment...", "attention required! | cloudflare",
    "access denied", "unusual traffic", "are you a robot",
    "px-captcha", "perimeterx", "incapsula", "distil",
]


def _looks_like_challenge(response: httpx.Response) -> bool:
    if response.status_code in (401, 403, 407, 511):
        return True
    server = (response.headers.get("server") or "").lower()
    if response.status_code == 503 and "cloudflare" in server:
        return True
    ctype = (response.headers.get("content-type") or "").lower()
    if "html" not in ctype and "text" not in ctype:
        return False
    body = (response.text or "")[:20_000].lower()
    return any(marker in body for marker in _CHALLENGE_MARKERS)


@dataclass
class HostState:
    last_request_at: float = 0.0
    crawl_delay: float | None = None
    robots: urllib.robotparser.RobotFileParser | None = None
    robots_loaded: bool = False
    blocked_until: float = 0.0


@dataclass
class PoliteFetcher:
    """Um fetcher por execucao de busca (mantem estado de rate limiting)."""

    user_agent: str | None = None
    min_interval: float | None = None
    timeout: float | None = None
    max_requests: int | None = None
    respect_robots: bool | None = None

    _hosts: dict[str, HostState] = field(default_factory=dict, init=False)
    _requests_made: int = field(default=0, init=False)
    _client: httpx.AsyncClient | None = field(default=None, init=False)

    def __post_init__(self) -> None:
        s = get_settings()
        self.user_agent = self.user_agent or s.user_agent
        self.min_interval = s.min_seconds_between_requests if self.min_interval is None else self.min_interval
        self.timeout = s.http_timeout_seconds if self.timeout is None else self.timeout
        self.max_requests = s.max_requests_per_run if self.max_requests is None else self.max_requests
        self.respect_robots = s.respect_robots_txt if self.respect_robots is None else self.respect_robots

    # -- ciclo de vida -----------------------------------------------------
    async def __aenter__(self) -> "PoliteFetcher":
        self._client = httpx.AsyncClient(
            timeout=self.timeout,
            follow_redirects=True,
            headers={
                "User-Agent": self.user_agent or "job-agent/0.1",
                "Accept": "application/json, text/xml, text/html;q=0.9, */*;q=0.5",
                "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
            },
        )
        return self

    async def __aexit__(self, *_exc) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    @property
    def requests_made(self) -> int:
        return self._requests_made

    # -- robots.txt --------------------------------------------------------
    def _state(self, host: str) -> HostState:
        return self._hosts.setdefault(host, HostState())

    async def _load_robots(self, scheme: str, host: str) -> None:
        state = self._state(host)
        if state.robots_loaded:
            return
        state.robots_loaded = True
        parser = urllib.robotparser.RobotFileParser()
        url = f"{scheme}://{host}/robots.txt"
        try:
            assert self._client is not None
            resp = await self._client.get(url, timeout=10.0)
            if resp.status_code == 200:
                parser.parse(resp.text.splitlines())
                state.robots = parser
                delay = parser.crawl_delay(self.user_agent or "*")
                if delay:
                    state.crawl_delay = float(delay)
                    log.info("robots.txt de %s pede Crawl-delay de %ss", host, delay)
            else:
                # Sem robots.txt acessivel: seguimos com nosso proprio limite.
                log.debug("robots.txt de %s indisponivel (HTTP %s)", host, resp.status_code)
        except Exception as exc:  # rede instavel nao deve derrubar a busca
            log.debug("Falha ao ler robots.txt de %s: %s", host, type(exc).__name__)

    async def allowed(self, url: str) -> bool:
        if not self.respect_robots:
            return True
        parts = urlsplit(url)
        if not parts.netloc:
            return False
        await self._load_robots(parts.scheme or "https", parts.netloc)
        robots = self._state(parts.netloc).robots
        if robots is None:
            return True
        return robots.can_fetch(self.user_agent or "*", url)

    # -- rate limiting -----------------------------------------------------
    async def _throttle(self, host: str) -> None:
        state = self._state(host)
        now = time.monotonic()
        if state.blocked_until > now:
            await asyncio.sleep(state.blocked_until - now)
            now = time.monotonic()
        interval = max(self.min_interval or 0.0, state.crawl_delay or 0.0)
        elapsed = now - state.last_request_at
        if state.last_request_at and elapsed < interval:
            await asyncio.sleep(interval - elapsed)
        self._state(host).last_request_at = time.monotonic()

    # -- request -----------------------------------------------------------
    async def get(self, url: str, params: dict | None = None) -> httpx.Response:
        """GET educado. Levanta excecao clara em vez de insistir."""
        if self._client is None:
            raise RuntimeError("Use PoliteFetcher como async context manager.")
        if self._requests_made >= (self.max_requests or 0):
            raise RequestBudgetExceeded(
                f"Teto de {self.max_requests} requisicoes por execucao alcancado."
            )
        if not await self.allowed(url):
            raise BlockedByRobots(f"robots.txt proibe acesso a {url}. Fonte ignorada.")

        host = urlsplit(url).netloc
        await self._throttle(host)
        self._requests_made += 1

        response = await self._client.get(url, params=params)

        if response.status_code in (429, 503):
            retry_after = response.headers.get("retry-after")
            wait = 60.0
            if retry_after:
                try:
                    wait = min(300.0, float(retry_after))
                except ValueError:
                    pass
            self._state(host).blocked_until = time.monotonic() + wait
            log.warning("%s pediu para desacelerar (HTTP %s). Pausando %ss.",
                        host, response.status_code, wait)

        if _looks_like_challenge(response):
            raise HumanInterventionRequired(
                f"{host} apresentou CAPTCHA / bloqueio anti-bot ou exige autenticacao "
                f"(HTTP {response.status_code}). O agente NAO tenta contornar. "
                f"Abra {url} no navegador manualmente, ou desative esta fonte."
            )

        response.raise_for_status()
        return response

    async def get_json(self, url: str, params: dict | None = None) -> dict | list:
        response = await self.get(url, params=params)
        return response.json()

    async def get_text(self, url: str, params: dict | None = None) -> str:
        return (await self.get(url, params=params)).text
