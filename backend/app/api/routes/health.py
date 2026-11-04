from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.db.session import engine

router = APIRouter(tags=["health"])


@router.get("/health/live", summary="Liveness probe")
def liveness() -> dict[str, str]:
    """Return success when the API process is running."""
    return {"status": "ok"}


@router.get(
    "/health/ready",
    summary="Readiness probe",
    response_model=None,
)
def readiness() -> dict[str, str] | JSONResponse:
    """Return success only when the API can reach PostgreSQL."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError:
        return JSONResponse(
            status_code=503,
            content={"status": "unavailable", "dependency": "database"},
        )

    return {"status": "ok", "dependency": "database"}
