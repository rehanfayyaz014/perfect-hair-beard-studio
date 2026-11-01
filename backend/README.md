# Perfect Hair and Beard Studio Backend

This is the separate FastAPI backend for the salon website. It provides the health endpoint, database-backed catalog APIs, protected admin authentication and catalog-management APIs, and gallery metadata preparation. The frontend remains a separate Next.js application in `../frontend`.

## Local setup

From the repository root in PowerShell:

```powershell
py -3.12 -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
```

Edit `backend/.env` with local PostgreSQL credentials. Do not commit that file or put real credentials in `.env.example`.

## Run the API

```powershell
backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

The health endpoint is available at `http://127.0.0.1:8000/api/health` and should return:

```json
{"status":"ok"}
```

The health endpoint does not access PostgreSQL. The SQLAlchemy engine is created lazily only when a future route explicitly requests database access.

## Database and migrations

Database settings are read from environment variables. Keep real credentials in the local `backend/.env` only; never commit that file or copy real values into `.env.example`.

The repository contains Alembic migrations for the catalog tables, admin authentication tables, and gallery metadata tables. The applied revision and the gallery migration status must be checked against the current project status before running any migration. Do not assume that every migration file has already been applied.

The backend uses separate database roles for public runtime access, admin authentication/writes, and migrations where configured. Role creation, grants, and migration application are operational steps and are not performed by application startup.

## Current capabilities

- Public catalog endpoints for categories, services, deals, and deal items.
- Protected admin endpoints for categories, services, deals, and gallery metadata.
- HttpOnly-session admin authentication and password-management utilities.
- Catalog seed and verification utilities under `app.db`.
- Admin bootstrap, reset, and update utilities under `app.db`.
- Gallery metadata APIs with a checked-in static asset allowlist.

The current gallery approach uses Git-managed static images in the frontend. Binary uploads, external object storage, and dynamic image persistence are not implemented.

The catalog and admin utilities use database credentials from the configured local environment or credential-management integration. They do not store passwords in source code or print secrets.

The frontend development proxy forwards browser API requests to the backend according to the configured frontend environment/proxy target. Keep that target local and deployment-specific.
