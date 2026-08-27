"""Camada LLM OPCIONAL.

O LLM nunca calcula score e nunca decide nada. Ele so redige texto, e todo
texto redigido passa pelo guard antes de chegar a voce. Sem chave de API,
o sistema usa templates deterministicos e continua 100% funcional.
"""
from __future__ import annotations

from abc import ABC, abstractmethod

from app.logging_setup import get_logger
from app.settings import get_settings

log = get_logger("llm")

SYSTEM_PROMPT = """Voce redige textos de candidatura para um profissional especifico.

REGRAS ABSOLUTAS:
1. Use EXCLUSIVAMENTE os fatos fornecidos no perfil. Nao adicione nada.
2. NUNCA invente tecnologias, cargos, empresas, certificacoes, diplomas,
   projetos, metricas ou numeros de anos de experiencia.
3. Se a vaga pede algo que o perfil nao tem, NAO finja ter. Pode ser honesto
   sobre interesse em aprender, se o perfil indicar esse interesse.
4. Nao use superlativos vazios ("expert", "dominio total", "ninja").
5. Se faltar informacao para escrever uma frase, omita a frase.
6. Escreva no idioma solicitado, em tom profissional, direto e sem clichê.
"""


class LLMUnavailable(RuntimeError):
    """Nenhum provedor de LLM configurado."""


class LLMProvider(ABC):
    name = "none"

    @abstractmethod
    def complete(self, prompt: str, max_tokens: int = 1200, temperature: float = 0.3) -> str:
        ...


class NullProvider(LLMProvider):
    """Provedor inativo: forca o uso dos templates deterministicos."""
    name = "none"

    def complete(self, prompt: str, max_tokens: int = 1200, temperature: float = 0.3) -> str:
        raise LLMUnavailable(
            "LLM_PROVIDER=none (ou chave de API ausente). Usando templates locais."
        )


class AnthropicProvider(LLMProvider):
    name = "anthropic"
    DEFAULT_MODEL = "claude-sonnet-4-5"

    def __init__(self, api_key: str, model: str = "") -> None:
        try:
            import anthropic
        except ImportError as exc:
            raise LLMUnavailable(
                "Instale o SDK: pip install anthropic"
            ) from exc
        self._client = anthropic.Anthropic(api_key=api_key)
        self._model = model or self.DEFAULT_MODEL

    def complete(self, prompt: str, max_tokens: int = 1200, temperature: float = 0.3) -> str:
        response = self._client.messages.create(
            model=self._model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        return "".join(
            block.text for block in response.content if getattr(block, "type", "") == "text"
        ).strip()


class OpenAIProvider(LLMProvider):
    name = "openai"
    DEFAULT_MODEL = "gpt-4o-mini"

    def __init__(self, api_key: str, model: str = "") -> None:
        try:
            from openai import OpenAI
        except ImportError as exc:
            raise LLMUnavailable("Instale o SDK: pip install openai") from exc
        self._client = OpenAI(api_key=api_key)
        self._model = model or self.DEFAULT_MODEL

    def complete(self, prompt: str, max_tokens: int = 1200, temperature: float = 0.3) -> str:
        response = self._client.chat.completions.create(
            model=self._model,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
        )
        return (response.choices[0].message.content or "").strip()


def get_provider() -> LLMProvider:
    """Provedor conforme .env. Nunca levanta: cai no NullProvider."""
    settings = get_settings()
    provider = (settings.llm_provider or "none").strip().lower()
    try:
        if provider == "anthropic" and settings.anthropic_api_key:
            return AnthropicProvider(settings.anthropic_api_key, settings.llm_model)
        if provider == "openai" and settings.openai_api_key:
            return OpenAIProvider(settings.openai_api_key, settings.llm_model)
    except LLMUnavailable as exc:
        log.warning("Provedor '%s' indisponivel: %s", provider, exc)
    if provider not in ("none", ""):
        log.info("LLM_PROVIDER=%s sem chave de API valida; usando templates locais.", provider)
    return NullProvider()


def is_available() -> bool:
    return not isinstance(get_provider(), NullProvider)
