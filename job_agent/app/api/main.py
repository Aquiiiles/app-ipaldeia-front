"""Aplicacao FastAPI: API + dashboard local.

Escuta em 127.0.0.1 por padrao: o sistema e para o SEU PC, nao para a
internet. Seus dados nunca saem daqui, exceto as chamadas as APIs de
vagas e, se voce configurar, ao provedor de LLM.
"""
from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.api import routes_applications, routes_jobs, routes_reports
from app.database.db import init_db
from app.logging_setup import get_logger, setup_logging
from app.settings import get_settings

log = get_logger("api")

BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = BASE_DIR / "dashboard" / "templates"
STATIC_DIR = BASE_DIR / "dashboard" / "static"

templates = Jinja2Templates(directory=str(TEMPLATES_DIR))


def create_app() -> FastAPI:
    setup_logging()
    settings = get_settings()

    app = FastAPI(
        title="job_agent — AI Career Agent local",
        description=(
            "Agente local de gestao de candidaturas. Nao envia candidatura sem "
            "sua aprovacao explicita. Nao contorna CAPTCHA, MFA ou anti-bot."
        ),
        version="0.1.0",
    )

    init_db()

    app.include_router(routes_jobs.router)
    app.include_router(routes_jobs.search_router)
    app.include_router(routes_applications.router)
    app.include_router(routes_applications.questions_router)
    app.include_router(routes_reports.router)

    if STATIC_DIR.exists():
        app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

    @app.get("/", response_class=HTMLResponse)
    def dashboard(request: Request):
        return templates.TemplateResponse(
            request, "index.html", {"dry_run": settings.dry_run}
        )

    @app.get("/healthz")
    def healthz() -> dict:
        return {"ok": True, "dry_run": settings.dry_run}

    @app.exception_handler(FileNotFoundError)
    def missing_config(_request: Request, exc: FileNotFoundError):
        return JSONResponse(status_code=503, content={"detail": str(exc)})

    banner = "DRY_RUN=true — nenhuma candidatura sera enviada" if settings.dry_run else \
             "DRY_RUN=false — envios permitidos APENAS apos sua aprovacao explicita"
    log.info("job_agent iniciado. %s", banner)
    return app


app = create_app()
