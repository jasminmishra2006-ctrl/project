from __future__ import annotations

import logging
import math
import os
import time
import asyncio
from contextlib import asynccontextmanager, suppress
from pathlib import Path
from typing import Any, Dict, Optional

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict
from water_api import router as water_router, DB_PATH, monitor_sensor_status

MODEL_NAME = "Water_Quality_RandomForest"
FEATURES = [
    "pH",
    "tds_mg_l",
    "turbidity_ntu",
    "temperature_c",
    "hardness_mg_l_as_caco3",
    "residual_free_chlorine_mg_l",
    "ammonia_mg_l",
    "fluoride_mg_l",
    "nitrate_mg_l",
    "e_coli_cfu_100ml",
    "fecal_coliform_cfu_100ml",
]
MODEL_PATH = Path(os.getenv(
    "MODEL_PATH",
    Path(__file__).parent / "models" / "Water_Quality_RandomForest_Demo.pkl",
))
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("water_quality_ml")
model: Any = None


class PredictionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sensor_id: Optional[str] = None
    pH: Optional[float] = None
    tds_mg_l: Optional[float] = None
    turbidity_ntu: Optional[float] = None
    temperature_c: Optional[float] = None
    hardness_mg_l_as_caco3: Optional[float] = None
    residual_free_chlorine_mg_l: Optional[float] = None
    ammonia_mg_l: Optional[float] = None
    fluoride_mg_l: Optional[float] = None
    nitrate_mg_l: Optional[float] = None
    e_coli_cfu_100ml: Optional[float] = None
    fecal_coliform_cfu_100ml: Optional[float] = None

    def feature_values(self) -> Dict[str, Optional[float]]:
        return {feature: getattr(self, feature) for feature in FEATURES}


@asynccontextmanager
async def lifespan(_: FastAPI):
    global model
    if not MODEL_PATH.is_file():
        raise RuntimeError(f"Trained model file not found: {MODEL_PATH}")
    try:
        loaded = joblib.load(MODEL_PATH)
    except Exception as exc:
        raise RuntimeError(f"Could not load trained model at {MODEL_PATH}: {exc}") from exc

    actual_features = list(getattr(loaded, "feature_names_in_", []))
    if actual_features and actual_features != FEATURES:
        raise RuntimeError(
            "Model feature names/order do not match the configured API contract: "
            f"{actual_features}"
        )
    if not hasattr(loaded, "predict") or not hasattr(loaded, "predict_proba"):
        raise RuntimeError("Loaded model must provide predict() and predict_proba().")
    model = loaded
    logger.info("Loaded %s from %s", MODEL_NAME, MODEL_PATH)
    status_task = asyncio.create_task(monitor_sensor_status())
    try:
        yield
    finally:
        status_task.cancel()
        with suppress(asyncio.CancelledError):
            await status_task
        model = None


app = FastAPI(title=MODEL_NAME, version="1.0.0", lifespan=lifespan)
origins = [origin.strip() for origin in os.getenv(
    "CORS_ORIGINS", os.getenv("FRONTEND_ORIGIN", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173")
).split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Admin-Token", "X-Ingest-Token"],
)
app.include_router(water_router)


@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    raw_length = request.headers.get("content-length")
    limit = 5 * 1024 * 1024 if request.url.path == "/api/admin/import-readings" else 1024 * 1024
    if raw_length and raw_length.isdigit() and int(raw_length) > limit:
        return JSONResponse(status_code=413, content={"error": {
            "code": "REQUEST_TOO_LARGE", "message": "Request body exceeds the configured size limit."
        }})
    return await call_next(request)


@app.exception_handler(HTTPException)
async def api_http_error(_: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail and "message" in detail:
        error = detail
    else:
        error = {"code": "HTTP_ERROR", "message": str(detail)}
    return JSONResponse(status_code=exc.status_code, content={"error": error}, headers=exc.headers)


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"error": {
        "code": "INVALID_REQUEST", "message": "Request validation failed.",
        "fields": [{"field": ".".join(str(part) for part in item["loc"]), "reason": item["msg"]} for item in exc.errors()],
    }})


@app.exception_handler(Exception)
async def unexpected_error(request: Request, exc: Exception):
    logger.exception("Unhandled request failure method=%s path=%s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"error": {
        "code": "INTERNAL_ERROR", "message": "An unexpected server error occurred."
    }})


@app.get("/health")
def health() -> Dict[str, Any]:
    return {"status": "ok", "database": "connected", "realtime": "ready",
            "model_loaded": model is not None, "model_name": MODEL_NAME,
            "timestamp": pd.Timestamp.now(tz="UTC").isoformat()}


@app.get("/health/live")
def health_live() -> Dict[str, Any]:
    return {"status": "ok", "timestamp": pd.Timestamp.now(tz="UTC").isoformat()}


@app.get("/health/ready")
def health_ready() -> Dict[str, Any]:
    try:
        import sqlite3
        with sqlite3.connect(DB_PATH, timeout=2) as connection:
            connection.execute("SELECT 1")
        return {"status": "ok", "database": "connected", "realtime": "ready",
                "timestamp": pd.Timestamp.now(tz="UTC").isoformat()}
    except Exception:
        logger.exception("Readiness check failed")
        raise HTTPException(status_code=503, detail={"code": "NOT_READY", "message": "Required service is unavailable."})


@app.get("/model-info")
def model_info() -> Dict[str, Any]:
    if model is None:
        raise HTTPException(status_code=503, detail="Model is not loaded")
    estimator = model.named_steps.get("model") if hasattr(model, "named_steps") else model
    return {
        "model_name": MODEL_NAME,
        "model_type": type(estimator).__name__,
        "n_estimators": getattr(estimator, "n_estimators", None),
        "features": len(FEATURES),
        "feature_names": FEATURES,
        "classes": [str(value) for value in getattr(model, "classes_", [])],
    }


@app.post("/predict")
def predict(request: PredictionRequest) -> Dict[str, Any]:
    if model is None:
        raise HTTPException(status_code=503, detail="Model is not loaded")

    supplied = request.feature_values()
    invalid = [name for name, value in supplied.items() if value is not None and not math.isfinite(value)]
    if invalid:
        raise HTTPException(status_code=422, detail=f"Features must be finite numeric values: {', '.join(invalid)}")
    missing = [name for name, value in supplied.items() if value is None]
    if len(missing) == len(FEATURES):
        raise HTTPException(status_code=422, detail="At least one model feature must be provided")

    frame = pd.DataFrame([[supplied[name] for name in FEATURES]], columns=FEATURES)
    started = time.perf_counter()
    try:
        predicted = model.predict(frame)[0]
        probabilities = model.predict_proba(frame)[0]
        classes = list(model.classes_)
        predicted_index = classes.index(predicted)
    except Exception as exc:
        logger.exception("Prediction failed for sensor_id=%s", request.sensor_id)
        raise HTTPException(status_code=500, detail="Model prediction failed") from exc

    prediction = predicted.item() if hasattr(predicted, "item") else predicted
    probability = {
        str(label.item() if hasattr(label, "item") else label): float(probabilities[index])
        for index, label in enumerate(classes)
    }
    confidence = float(probabilities[predicted_index])
    elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
    logger.info(
        "prediction timestamp=%s sensor_id=%s prediction=%s confidence=%.6f model=%s processing_ms=%.2f",
        pd.Timestamp.now(tz="UTC").isoformat(), request.sensor_id or "unspecified",
        prediction, confidence, MODEL_NAME, elapsed_ms,
    )
    return {
        "prediction": prediction,
        "probability": probability,
        "confidence": confidence,
        "model": MODEL_NAME,
        "features_used": FEATURES,
        "features_missing": missing,
        "processing_ms": elapsed_ms,
    }
