"""Engine e sessao SQLAlchemy."""
from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.database.schema import Base
from app.settings import get_settings

_engine: Engine | None = None
_SessionFactory: sessionmaker[Session] | None = None


def _configure_sqlite(engine: Engine) -> None:
    @event.listens_for(engine, "connect")
    def _set_pragmas(dbapi_conn, _record):  # noqa: ANN001
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")     # leituras durante escrita
        cursor.execute("PRAGMA foreign_keys=ON")      # integridade referencial
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()


def get_engine(url: str | None = None) -> Engine:
    global _engine, _SessionFactory
    if _engine is not None and url is None:
        return _engine

    settings = get_settings()
    target = url or settings.sqlalchemy_url
    if target.startswith("sqlite:///") and not target.endswith(":memory:"):
        Path(target[len("sqlite:///"):]).parent.mkdir(parents=True, exist_ok=True)

    engine = create_engine(target, future=True, echo=False)
    if engine.dialect.name == "sqlite":
        _configure_sqlite(engine)

    if url is None:
        _engine = engine
        _SessionFactory = sessionmaker(bind=engine, expire_on_commit=False, future=True)
    return engine


def init_db(url: str | None = None) -> Engine:
    """Cria as tabelas se ainda nao existirem. Idempotente."""
    engine = get_engine(url)
    Base.metadata.create_all(engine)
    return engine


def get_session_factory() -> sessionmaker[Session]:
    global _SessionFactory
    if _SessionFactory is None:
        get_engine()
    assert _SessionFactory is not None
    return _SessionFactory


@contextmanager
def session_scope() -> Iterator[Session]:
    """Transacao: commit no sucesso, rollback no erro."""
    session = get_session_factory()()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def reset_engine() -> None:
    """Usado pelos testes para isolar bancos."""
    global _engine, _SessionFactory
    if _engine is not None:
        _engine.dispose()
    _engine = None
    _SessionFactory = None
