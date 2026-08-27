"""CLI do job_agent.

Comandos:
  init            cria o banco e valida a configuracao
  profile         mostra o perfil carregado (YAML + CV)
  search          executa a busca de vagas
  list            lista vagas rankeadas
  show ID         detalha uma vaga com a analise completa
  approve ID      aprova uma vaga (portao 1)
  prepare ID      prepara a candidatura (nao envia)
  ask "pergunta"  testa uma pergunta de candidatura
  report          gera o relatorio
  serve           inicia o dashboard web
  sources         lista as fontes e os links de busca manual
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys

from app.logging_setup import setup_logging
from app.settings import get_settings


def _banner() -> None:
    settings = get_settings()
    mode = "DRY_RUN=true — nenhuma candidatura sera enviada" if settings.dry_run else \
           "DRY_RUN=false — envio permitido APENAS apos sua aprovacao explicita"
    print(f"\n  job_agent  ·  {mode}\n")


# --------------------------------------------------------------------------
def cmd_init(_args) -> int:
    from app.database.db import init_db
    from app.services.profile_service import profile_status

    settings = get_settings()
    settings.logs_dir.mkdir(parents=True, exist_ok=True)
    settings.generated_path.mkdir(parents=True, exist_ok=True)

    init_db()
    print(f"[ok] Banco de dados criado/verificado: {settings.sqlalchemy_url}")

    if not settings.profile_file.exists():
        print(f"[!!] Perfil ausente: {settings.profile_file}")
        print("     Rode: cp config/profile.example.yaml config/profile.yaml")
        return 1

    status = profile_status()
    print(f"[ok] Perfil carregado: {status['profile_path']}")
    print(f"     Curriculo: {status['resume_file'] or 'nenhum encontrado em resumes/'}")
    print(f"     Tecnologias: {', '.join(status['technologies']) or '(nenhuma)'}")
    if status["missing_fields"]:
        print(f"[!!] Campos vazios em profile.yaml: {', '.join(status['missing_fields'])}")
    for warning in status["warnings"]:
        print(f"[!!] {warning}")

    if not settings.sources_file.exists():
        print(f"[!!] Fontes nao configuradas: {settings.sources_file}")
        print("     Rode: cp config/sources.example.yaml config/sources.yaml")
    else:
        print(f"[ok] Fontes configuradas: {settings.sources_file}")
    return 0


def cmd_profile(_args) -> int:
    from app.services.profile_service import current_profile, profile_status
    status = profile_status()
    print(json.dumps(status, indent=2, ensure_ascii=False))
    profile = current_profile()
    print(f"\nCorpus factual: {len(profile.fact_corpus())} caracteres "
          f"(base de validacao do guard anti-invencao).")
    return 0


def cmd_search(args) -> int:
    from app.crawler.pipeline import run_search
    from app.database.db import init_db
    from app.services.profile_service import current_profile

    init_db()
    profile = current_profile()
    settings = get_settings()
    sources = args.sources.split(",") if args.sources else None

    summary = asyncio.run(run_search(profile, str(settings.sources_file), only_sources=sources))

    print("\n" + "=" * 62)
    print(f"  BUSCA CONCLUIDA — {summary.requests_made} requisicoes")
    print("=" * 62)
    print(f"  Buscadas ......... {summary.total_fetched}")
    print(f"  Novas ............ {summary.new_jobs}")
    print(f"  Atualizadas ...... {summary.updated_jobs}")
    print(f"  Duplicatas ....... {summary.duplicates}")
    print(f"  Descartadas ...... {summary.discarded}")
    print("\n  Por fonte:")
    for outcome in summary.per_source:
        print(f"    {outcome.source:<22} buscadas={outcome.fetched:<5} "
              f"mantidas={outcome.kept:<5} status={outcome.status}")
        if outcome.error:
            print(f"      -> {outcome.error[:160]}")
    if summary.human_intervention:
        print("\n  *** INTERVENCAO HUMANA NECESSARIA ***")
        for item in summary.human_intervention:
            print(f"    {item}")
    print()
    return 0


def cmd_list(args) -> int:
    from app.database.db import init_db, session_scope
    from app.database import repository as repo

    init_db()
    with session_scope() as session:
        jobs = repo.list_jobs(
            session, status=args.status, recommendation=args.recommendation,
            min_score=args.min_score, limit=args.limit,
        )
        if not jobs:
            print("Nenhuma vaga encontrada. Rode: python -m app.cli search")
            return 0
        print(f"\n{'ID':>5}  {'SCORE':>5}  {'PUBL.':<13} {'STATUS':<15} VAGA")
        print("-" * 100)
        for job in jobs:
            published = (job.posted_at.strftime("%Y-%m-%d") if job.posted_at else "desconhecida")
            print(f"{job.id:>5}  {job.fit_score:>5.0f}  {published:<13} {job.status:<15} "
                  f"{job.title[:44]} @ {job.company[:24]}")
        print(f"\n{len(jobs)} vaga(s). Detalhe com: python -m app.cli show <ID>\n")
    return 0


def cmd_show(args) -> int:
    from app.database.db import init_db, session_scope
    from app.database import repository as repo

    init_db()
    with session_scope() as session:
        job = repo.get_job(session, args.job_id)
        if job is None:
            print(f"Vaga {args.job_id} nao encontrada.")
            return 1
        analysis = json.loads(job.fit_analysis or "{}")
        breakdown = json.loads(job.fit_breakdown or "{}")

        print("\n" + "=" * 72)
        print(f"  {job.title}")
        print(f"  {job.company} · {job.location or 'local nao informado'} · {job.remote}")
        print("=" * 72)
        print(f"  URL .............. {job.url}")
        print(f"  Fonte ............ {job.source}")
        print(f"  Publicada ........ {job.posted_at.strftime('%Y-%m-%d') if job.posted_at else 'desconhecida'}"
              f"{f' ({job.recency_days} dias)' if job.recency_days is not None else ''}")
        print(f"  Descoberta ....... {job.discovered_at.strftime('%Y-%m-%d %H:%M') if job.discovered_at else '-'}")
        print(f"  Nivel ............ {job.seniority}"
              f"{f' · exige ~{job.years_required:.0f} anos' if job.years_required else ''}")
        print(f"  Salario .......... {job.salary or 'nao informado'}")
        print(f"  Status ........... {job.status}")
        print(f"\n  SCORE: {job.fit_score:.1f}  ->  {job.recommendation}")

        if breakdown:
            print("\n  Composicao:")
            for key, value in breakdown.items():
                print(f"    {key:<24} {value:>6.2f}")

        for title, key in [("POR QUE COMBINA COM VOCE", "why_it_fits"),
                           ("PONTOS DE ATENCAO", "concerns")]:
            items = analysis.get(key) or []
            print(f"\n  {title}:")
            for item in items:
                print(f"    * {item}")
            if not items:
                print("    (nenhum)")

        for title, key in [("JA POSSUI", "matched_requirements"),
                           ("CRITICOS QUE FALTAM", "critical_missing"),
                           ("NICE TO HAVE QUE FALTAM", "nice_to_have_missing"),
                           ("OPORTUNIDADE DE CRESCIMENTO", "growth_opportunities")]:
            items = analysis.get(key) or []
            print(f"  {title:<30} {', '.join(items) or '(nenhum)'}")

        print(f"\n  DEVO APLICAR? {'SIM' if analysis.get('should_apply') else 'NAO PRIORITARIO'}")
        print(f"    {analysis.get('should_apply_reason', '')}")
        print("\n  (A decisao final e sua. O agente nao aplica sozinho.)\n")
    return 0


def cmd_approve(args) -> int:
    from app.applications import service as app_service
    from app.database.db import init_db, session_scope
    from app.database import repository as repo

    init_db()
    with session_scope() as session:
        job = repo.get_job(session, args.job_id)
        if job is None:
            print(f"Vaga {args.job_id} nao encontrada.")
            return 1
        app_service.approve_job(session, job)
        print(f"[ok] Vaga {job.id} aprovada (status: {job.status}).")
        print(f"     Proximo passo: python -m app.cli prepare {job.id}")
    return 0


def cmd_prepare(args) -> int:
    from app.applications import service as app_service
    from app.database.db import init_db, session_scope
    from app.database import repository as repo
    from app.services.profile_service import current_profile

    init_db()
    profile = current_profile()
    questions = args.question or []

    with session_scope() as session:
        job = repo.get_job(session, args.job_id)
        if job is None:
            print(f"Vaga {args.job_id} nao encontrada.")
            return 1
        try:
            prepared = app_service.prepare_application(
                session, job, profile, questions=questions, language=args.language
            )
        except (app_service.ApprovalRequired, app_service.DuplicateApplication) as exc:
            print(f"[!!] {exc}")
            return 1

    print("\n" + "=" * 72)
    print(f"  CANDIDATURA #{prepared.application_id} PREPARADA — NADA FOI ENVIADO")
    print(f"  DRY_RUN={prepared.dry_run}")
    print("=" * 72)
    print(f"\n  CV adaptado: {prepared.resume_path}")
    print(f"  (versao: {prepared.resume_version} — seu CV original esta intacto)")

    print("\n  SUGESTOES DE PERSONALIZACAO:")
    for suggestion in prepared.tailoring.get("suggestions", []):
        print(f"    [{suggestion['kind']}] {suggestion['message']}")
        if suggestion.get("evidence"):
            print(f"        evidencia no CV: \"{suggestion['evidence'][:110]}\"")

    print(f"\n  COVER LETTER (gerada por: {prepared.cover_letter_source}):")
    print("  " + "-" * 68)
    for line in prepared.cover_letter.splitlines():
        print(f"  {line}")
    print("  " + "-" * 68)

    print("\n  MENSAGEM PARA RECRUTADOR:")
    for line in prepared.recruiter_message.splitlines():
        print(f"  {line}")

    print(f"\n  GUARD ANTI-INVENCAO: {'OK' if prepared.guard_ok else 'BLOQUEIOS ENCONTRADOS'}")
    if prepared.guard_summary:
        for line in prepared.guard_summary.splitlines():
            print(f"    {line}")

    if prepared.answers:
        print("\n  PERGUNTAS DE CANDIDATURA:")
        for answer in prepared.answers:
            print(f"\n    PERGUNTA: {answer['question']}")
            print(f"    RESPOSTA SUGERIDA: {answer['suggested_answer'] or '(nenhuma)'}")
            print(f"    Confianca: {answer['confidence']}")
            if answer["source_of_truth"]:
                print(f"    Base: {answer['source_of_truth']}")
            if answer["needs_confirmation"]:
                print("    >>> [CONFIRMAR] [EDITAR] — aguardando sua decisao")

    print(f"\n  {prepared.next_step}\n")
    return 0


def cmd_ask(args) -> int:
    from app.applications.questions import answer_question
    from app.services.profile_service import current_profile

    result = answer_question(args.question, current_profile())
    print(f"\nPERGUNTA:\n  {result.question}")
    print(f"\nRESPOSTA SUGERIDA:\n  {result.suggested_answer or '(nenhuma — sem base factual)'}")
    print(f"\nConfianca: {result.confidence}")
    if result.source_of_truth:
        print(f"Base: {result.source_of_truth}")
    if result.reason:
        print(f"Motivo: {result.reason}")
    print("\n" + ("[CONFIRMAR] [EDITAR]  <- exige sua aprovacao"
                  if result.needs_confirmation
                  else "Pode ser usada: derivada diretamente do seu perfil.") + "\n")
    return 0


def cmd_report(args) -> int:
    from app.database.db import init_db, session_scope
    from app.reports import metrics
    from app.services.profile_service import current_profile

    init_db()
    with session_scope() as session:
        report = metrics.weekly_report(session, days=args.days, profile=current_profile())
        print(metrics.format_weekly_report(report))
    return 0


def cmd_sources(_args) -> int:
    from app.services.profile_service import current_profile
    from app.sources import available_sources, load_source_configs
    from app.sources.manual import ManualSearchLinksSource

    settings = get_settings()
    configs = load_source_configs(str(settings.sources_file))
    enabled = {c["id"] for c in configs if c.get("enabled", True)}

    print("\nFONTES SUPORTADAS\n" + "=" * 72)
    for source in available_sources():
        mark = "[x]" if source["id"] in enabled else "[ ]"
        print(f"{mark} {source['id']:<22} {source['label']}")
        print(f"    {source['compliance_note']}")

    manual_config = next((c for c in configs if c.get("id") == "manual_search_links"), {})
    links = ManualSearchLinksSource(manual_config).build_links(current_profile())
    if links:
        print("\nLINKS DE BUSCA MANUAL (sites que proibem scraping)\n" + "=" * 72)
        print("O agente NAO faz requisicoes a estes sites. Abra manualmente:\n")
        for link in links[:14]:
            print(f"  {link['name']} — \"{link['query']}\"\n    {link['url']}")
    print()
    return 0


def cmd_serve(args) -> int:
    import uvicorn
    settings = get_settings()
    host = args.host or settings.host
    port = args.port or settings.port
    print(f"\n  Dashboard: http://{host}:{port}\n")
    uvicorn.run("app.api.main:app", host=host, port=port, reload=args.reload, log_level="info")
    return 0


# --------------------------------------------------------------------------
def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m app.cli",
        description="job_agent — agente local de candidaturas. Nunca envia sem sua aprovacao.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("init", help="cria o banco e valida a configuracao").set_defaults(func=cmd_init)
    sub.add_parser("profile", help="mostra o perfil carregado").set_defaults(func=cmd_profile)

    p_search = sub.add_parser("search", help="executa a busca de vagas")
    p_search.add_argument("--sources", help="IDs separados por virgula (ex.: remotive,lever)")
    p_search.set_defaults(func=cmd_search)

    p_list = sub.add_parser("list", help="lista vagas rankeadas")
    p_list.add_argument("--status")
    p_list.add_argument("--recommendation")
    p_list.add_argument("--min-score", type=float, dest="min_score")
    p_list.add_argument("--limit", type=int, default=40)
    p_list.set_defaults(func=cmd_list)

    p_show = sub.add_parser("show", help="detalha uma vaga")
    p_show.add_argument("job_id", type=int)
    p_show.set_defaults(func=cmd_show)

    p_approve = sub.add_parser("approve", help="aprova uma vaga (portao 1)")
    p_approve.add_argument("job_id", type=int)
    p_approve.set_defaults(func=cmd_approve)

    p_prepare = sub.add_parser("prepare", help="prepara a candidatura (nao envia)")
    p_prepare.add_argument("job_id", type=int)
    p_prepare.add_argument("--question", action="append", help="pergunta do formulario (repetivel)")
    p_prepare.add_argument("--language", default="pt", choices=["pt", "en"])
    p_prepare.set_defaults(func=cmd_prepare)

    p_ask = sub.add_parser("ask", help="testa uma pergunta de candidatura")
    p_ask.add_argument("question")
    p_ask.set_defaults(func=cmd_ask)

    p_report = sub.add_parser("report", help="gera o relatorio")
    p_report.add_argument("--days", type=int, default=7)
    p_report.set_defaults(func=cmd_report)

    sub.add_parser("sources", help="lista fontes e links manuais").set_defaults(func=cmd_sources)

    p_serve = sub.add_parser("serve", help="inicia o dashboard web")
    p_serve.add_argument("--host")
    p_serve.add_argument("--port", type=int)
    p_serve.add_argument("--reload", action="store_true")
    p_serve.set_defaults(func=cmd_serve)

    return parser


def main(argv: list[str] | None = None) -> int:
    setup_logging()
    args = build_parser().parse_args(argv)
    _banner()
    try:
        return args.func(args)
    except FileNotFoundError as exc:
        print(f"\n[!!] {exc}\n")
        return 1
    except KeyboardInterrupt:
        print("\nInterrompido.")
        return 130


if __name__ == "__main__":
    sys.exit(main())
