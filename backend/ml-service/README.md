# Water quality Random Forest inference service

This FastAPI service loads the supplied scikit-learn Pipeline once at startup and exposes its raw class prediction and predict_proba() probabilities. It does not translate class 0 or class 1 into a water-safety label; the training label mapping was not included with the application or model.

## Model and feature availability

The supplied model is stored at `models/Water_Quality_RandomForest_Demo.pkl`. It was inspected with scikit-learn 1.6.1: it is a Pipeline with `imputer` and `model` steps, a 300-tree RandomForestClassifier, classes `[0, 1]`, and the expected 11 feature names in the requested order.

The existing bundled reading schema has these model inputs:

| Model feature | Existing reading field | Availability |
| --- | --- | --- |
| `pH` | `ph` | Present |
| `tds_mg_l` | `tds` | Present |
| `turbidity_ntu` | `turbidity` | Present |
| `temperature_c` | `temperature` | Present |
| `hardness_mg_l_as_caco3` | - | Missing |
| `residual_free_chlorine_mg_l` | - | Missing |
| `ammonia_mg_l` | - | Missing |
| `fluoride_mg_l` | `fluoride` | Present |
| `nitrate_mg_l` | - | Missing |
| `e_coli_cfu_100ml` | - | Missing |
| `fecal_coliform_cfu_100ml` | - | Missing |

Missing fields are sent as `null`; the model's fitted SimpleImputer supplies its trained median. No values are generated in the frontend. The response identifies missing fields so callers can disclose that limitation.

No physical sensor or MQTT source is configured in this repository. The water API documented below provides secured sensor registration/ingestion and SSE delivery, but it will not fabricate live updates. `waterDataService.js` still reads the bundled `Demo Dataset`, and existing views keep that data until they explicitly opt into the API. ML predictions therefore retain the existing reading's source label.

## Run locally (PowerShell)

From `project/backend/ml-service/`:

```powershell
py -3.9 -m venv .venv
& .\.venv\Scripts\python.exe -m pip install --upgrade pip==25.3
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt
$env:CORS_ORIGINS = "http://localhost:5173"
& .\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000
```

In another terminal, from `project/`:

```powershell
npm install
Copy-Item frontend/.env.example frontend/.env
npm run dev:frontend
```

`frontend/.env.example` documents the browser-safe `VITE_ML_API_URL`. `CORS_ORIGINS` is a comma-separated list of allowed frontend origins. Configure an explicit production origin when deploying; the service does not enable wildcard CORS.

## API checks (PowerShell)

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod http://127.0.0.1:8000/model-info
```

Example prediction using the existing reading values; unavailable fields remain null:

```powershell
$body = @{
  pH = 6.82
  tds_mg_l = 684
  turbidity_ntu = 4.2
  temperature_c = 27.4
  hardness_mg_l_as_caco3 = $null
  residual_free_chlorine_mg_l = $null
  ammonia_mg_l = $null
  fluoride_mg_l = 1.0
  nitrate_mg_l = $null
  e_coli_cfu_100ml = $null
  fecal_coliform_cfu_100ml = $null
}
Invoke-RestMethod -Uri http://127.0.0.1:8000/predict -Method Post -ContentType 'application/json' -Body ($body | ConvertTo-Json)
```

The prediction endpoint returns the raw class, per-class probabilities, the predicted-class probability as confidence, the exact feature order, missing feature names, and processing time. Invalid/non-finite values return HTTP 422. If the service is unavailable or times out, the UI displays "Prediction unavailable"; it does not fall back to rule-based output.

## Water monitoring API

The same FastAPI service now also provides a persistent water-data API. It uses the Python standard-library SQLite database, so local development needs no separate database server or new package. On startup it applies `migrations/*.sql` and stores the DB at `backend/ml-service/data/water.sqlite3` by default. Set `WATER_DATABASE_PATH` to move it. For deployments needing shared concurrent writes or spatial queries, migrate this storage to PostgreSQL/PostGIS before horizontal scaling; the current schema keeps validated latitude/longitude columns and does not claim spatial indexing.

### Start and configure

Set backend-only variables in the service process (do not prefix secrets with `VITE_`). Configure strong, distinct tokens before using the admin import or ingestion routes. Set `FRONTEND_ORIGIN` to the dashboard origin, or `CORS_ORIGINS` to a comma-separated allowlist. `OFFLINE_MULTIPLIER` defaults to 2.

```powershell
cd backend/ml-service
py -3.9 -m venv .venv
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt
$env:ADMIN_TOKEN = "<long-random-admin-token>"
$env:INGEST_TOKEN = "<long-random-ingestion-token>"
$env:FRONTEND_ORIGIN = "http://localhost:5173"
& .\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000
```

In another terminal, import the supplied CSV into the persistent database. The import command defaults to `shared/data/waterQualityHistory.csv`:

```powershell
cd backend/ml-service
& .\.venv\Scripts\python.exe import_dataset.py
```

It is safe to rerun: `sample_id` is the stable unique key. The attached CSV contains 80 Chhattisgarh city samples with coordinates and water measurements. It has no district or sensor ID columns. Imported observations are therefore retained as area history with their original sample IDs, and are not mislabeled as live sensor readings. The separate Jharkhand dashboard demo data is not imported as measured production data. Sensor locations and ingestion become available once actual sensors are provisioned.

### Routes

- `GET /health`, `/health/live`, `/health/ready`
- `GET /api/areas`, `/api/areas/{areaId}`, `/api/areas/{areaId}/sensors`
- `GET /api/sensors`, `/api/sensors/{sensorId}`, `/api/sensors/status`
- `GET /api/map/locations` (latest sensor positions plus geocoded area samples where no sensors are registered; no invented sensor pins)
- `GET /api/readings/latest?areaId=...&sensorId=...`
- `GET /api/areas/{areaId}/readings/latest`, `/api/sensors/{sensorId}/readings/latest`
- `GET /api/readings/history`, `/api/areas/{areaId}/readings`, `/api/sensors/{sensorId}/readings`
- `GET /api/realtime?areaId=...&sensorId=...` (Server-Sent Events, acknowledgement and heartbeat)
- `POST /api/admin/import-readings` (CSV body or `{"csv":"..."}`, `X-Admin-Token`)
- `POST /api/sensors` (provision sensor, `X-Admin-Token`)
- `POST /api/readings` (sensor ingestion, `X-Ingest-Token`)

History accepts ISO-8601 `from`, `to`, `limit` (maximum 2000), and `parameter` query fields. It returns chronological results and only records belonging to the requested area/sensor. Reading status uses the dashboard's existing thresholds for pH, TDS, turbidity, temperature, and fluoride. Other supplied measurements remain available but have no configured status threshold, so they are explicitly excluded from the score until a project threshold is approved. Scores are dashboard indicators, not a claim of legal or health-standard compliance. Missing values stay missing.

Example sensor provisioning and ingestion:

```powershell
$headers = @{ "X-Admin-Token" = $env:ADMIN_TOKEN }
$area = (Invoke-RestMethod http://127.0.0.1:8000/api/areas)[0]
$areaId = $area.id
$sensorId = "sensor-001"
$sensor = @{ id=$sensorId; areaId=$areaId; name="Sampling point 1"; latitude=21.25; longitude=81.61; expectedIntervalSeconds=60 } | ConvertTo-Json
Invoke-RestMethod -Uri http://127.0.0.1:8000/api/sensors -Method Post -Headers $headers -ContentType "application/json" -Body $sensor
$reading = @{ areaId=$areaId; sensorId=$sensorId; timestamp=(Get-Date).ToUniversalTime().ToString("o"); parameters=@{ ph=7.2; tds=320; turbidity=2.1; temperature=27 } } | ConvertTo-Json
Invoke-RestMethod -Uri http://127.0.0.1:8000/api/readings -Method Post -Headers @{ "X-Ingest-Token"=$env:INGEST_TOKEN } -ContentType "application/json" -Body $reading
```

### Frontend access and checks

The Vite dev server proxies `/api` and `/health` to `http://127.0.0.1:8000`. `frontend/src/services/waterApi.js` provides browser helpers for the read routes and reconnecting SSE subscriptions. Existing dashboard views continue to use their bundled demo datasets unless a view opts into these API methods; this avoids replacing or blanking currently working screens when the database has no imported data. Set `VITE_WATER_API_PROXY` to change the dev proxy, and `VITE_WATER_API_URL` only when the browser must contact a separately hosted API directly.

```powershell
cd backend/ml-service
& .\.venv\Scripts\python.exe run_tests.py
cd ..\..
npm run build
npm run lint
```

Use HTTPS and a managed database with backups, restricted network access, secret-manager-backed tokens, and explicit production CORS origins when deploying. The admin/import and sensor-ingest operations return 503 until their backend tokens are configured.
