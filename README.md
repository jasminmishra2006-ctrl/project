# NEER-X water quality dashboard

The repository keeps browser code, server code, and the shared historical CSV in separate areas. The existing Literata/Nunito Sans theme and application data contracts are unchanged by this layout.

## Structure

```text
frontend/                 React + Vite application
  src/components/         dashboard, metric-cards, map, charts, filters, common
  src/pages/              application pages
  src/services/            browser API, ML API, and local reading adapters
  public/                  static map assets
backend/ml-service/       Python FastAPI model and water-data API
  migrations/              SQLite schema migrations
  models/                  trained model artifact
  tests/                   backend API tests
shared/data/               historical CSV consumed by frontend and importer
```

## Requirements

- Node.js and npm
- Python 3.9 and pip

## Configure and run

Install the frontend workspace dependencies from the repository root:

```powershell
npm install
```

Copy `frontend/.env.example` to `frontend/.env`. These variables are browser-visible URLs only. For Vite's API proxy, `VITE_WATER_API_PROXY` is read by the Vite development server.

Set up the Python service from `backend/ml-service/`:

```powershell
py -3.9 -m venv .venv
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item ..\.env.example ..\.env
```

Activate that Python environment before running root scripts. Set strong values for `ADMIN_TOKEN` and `INGEST_TOKEN` in the backend process environment before using protected endpoints. The service reads process environment variables; the example file is a reference and is not loaded automatically.

```powershell
Set-Location backend/ml-service
& .\.venv\Scripts\Activate.ps1
Set-Location ..\..
```

Start the backend from the repository root:

```powershell
python -m uvicorn app:app --app-dir backend/ml-service --host 127.0.0.1 --port 8000
```

Start the frontend in another terminal:

```powershell
npm run dev --workspace frontend
```

The frontend can also be started from its own directory with `npm run dev` after running `npm install` at the repository root.

To launch both together, activate the Python environment first and run `npm run dev` from the repository root. The backend listens on port 8000 and Vite proxies `/api` and `/health` to it. You can also start only the frontend or backend using `npm run dev:frontend` or `npm run dev:backend`.

## Environment files

- `frontend/.env.example`: safe `VITE_*` URLs. Never put secrets in frontend variables.
- `backend/.env.example`: database path, allowed frontend origin, admin/ingest tokens, offline sensor interval, and optional model path.

The FastAPI service reads backend settings from its process environment; copy the backend example to `backend/.env` and export its values in the service environment when running locally. Actual `.env` files are ignored by Git.

## Data import and database

The service applies `backend/ml-service/migrations/*.sql` on startup and stores SQLite data under `backend/ml-service/data/` by default. Import the bundled historical CSV with:

```powershell
Set-Location backend/ml-service
python import_dataset.py
```

The importer defaults to `shared/data/waterQualityHistory.csv`. Pass a CSV path explicitly to import another dataset. The CSV is also used by the frontend's historical sample views; it is a shared data asset, not backend or frontend implementation code.

## Development checks

```powershell
npm run lint
npm run build
npm test
```

The npm workspace is the React/Vite frontend. Backend tests run with Python's `unittest` through `npm test`; install the backend `requirements.txt` in the active environment first.

## API and realtime

The FastAPI service exposes `/health`, `/health/live`, `/health/ready`, `/predict`, `/model-info`, and water monitoring endpoints under `/api`. The detailed route list and request examples are in [backend/ml-service/README.md](backend/ml-service/README.md). Sensor readings are ingested by the backend and delivered to browser clients through the existing SSE endpoint at `/api/realtime`; frontend requests and subscriptions are implemented in `frontend/src/services/`.
