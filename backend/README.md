# MoneyKeeper Backend

FastAPI backend foundation. Business modules are added incrementally.

## Requirements
- Python 3.12+
- PostgreSQL 16 (or compatible)

## Local setup

From the repository root, start PostgreSQL:

```bash
docker compose up -d db
```

Then open a terminal in `backend/`:

```bash
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS / Linux:
# source .venv/bin/activate

python -m pip install -e ".[dev]"
uvicorn app.main:app --reload
```

API:
- `http://127.0.0.1:8000/health/live` — process liveness
- `http://127.0.0.1:8000/health/ready` — PostgreSQL readiness
- `http://127.0.0.1:8000/docs` — interactive OpenAPI docs

## Tests

From `backend/`:

```bash
pytest
```

The liveness test does not require a running database. Readiness is expected to return HTTP 503 while PostgreSQL is unavailable.

## Configuration

The backend reads environment variables, including `DATABASE_URL`, `APP_ENV` and `APP_SECRET_KEY`. For local development, copy the repository-root `.env.example` to the repository-root `.env` and keep it out of Git. The backend is started from `backend/`, so its settings load `../.env`. The default secret is development-only and must be replaced before any deployment.

This scaffold does not yet implement authentication, ledger operations or database migrations.
