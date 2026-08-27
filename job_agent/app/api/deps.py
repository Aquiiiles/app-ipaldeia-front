"""Dependencias FastAPI."""
from __future__ import annotations

from collections.abc import Iterator

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.database.db import get_session_factory
from app.models.profile import Profile
from app.services.profile_service import current_profile


def get_db() -> Iterator[Session]:
    session = get_session_factory()()
    try:
        yield session
        session.commit()
    except HTTPException:
        session.rollback()
        raise
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_profile() -> Profile:
    try:
        return current_profile()
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail=(f"{exc} Copie config/profile.example.yaml para config/profile.yaml "
                    f"e edite seus dados."),
        ) from exc
