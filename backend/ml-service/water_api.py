"""Persistent water monitoring API added to the existing FastAPI service."""
from __future__ import annotations

import asyncio
import csv
import io
import json
import logging
import math
import os
import re
import sqlite3
import threading
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, Header, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field

logger = logging.getLogger("water_quality_api")
router = APIRouter(prefix="/api")
DB_PATH = Path(os.getenv("WATER_DATABASE_PATH", Path(__file__).parent / "data" / "water.sqlite3"))
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
OFFLINE_MULTIPLIER = max(1, int(os.getenv("OFFLINE_MULTIPLIER", "2")))
MAX_IMPORT_BYTES = 5 * 1024 * 1024
MAX_HISTORY_LIMIT = 2000
PARAMETERS = {
    "ph": (0, 14), "tds": (0, 5000), "turbidity": (0, 100),
    "temperature": (-10, 60), "hardness": (0, 10000),
    "residualFreeChlorine": (0, 20), "ammonia": (0, 100),
    "fluoride": (0, 100), "nitrate": (0, 1000),
    "eColi": (0, 1_000_000), "fecalColiform": (0, 1_000_000),
}
CSV_FIELDS = {
    "sample_id": "sample_id", "sample_date": "timestamp", "city": "areaName",
    "state": "state", "latitude": "latitude", "longitude": "longitude",
    "pH": "ph", "tds_mg_l": "tds", "turbidity_ntu": "turbidity",
    "temperature_c": "temperature", "hardness_mg_l_as_caco3": "hardness",
    "residual_free_chlorine_mg_l": "residualFreeChlorine", "ammonia_mg_l": "ammonia",
    "fluoride_mg_l": "fluoride", "nitrate_mg_l": "nitrate",
    "e_coli_cfu_100ml": "eColi", "fecal_coliform_cfu_100ml": "fecalColiform",
    "testing_source": "source", "demo_water_status": "sourceStatus",
}


@contextmanager
def db():
    connection = sqlite3.connect(DB_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys=ON")
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database() -> None:
    with db() as conn:
        conn.execute("CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)")
        migration_dir = Path(__file__).parent / "migrations"
        for migration in sorted(migration_dir.glob("*.sql")):
            if conn.execute("SELECT 1 FROM schema_migrations WHERE version=?", (migration.name,)).fetchone():
                continue
            conn.executescript(migration.read_text(encoding="utf-8"))
            conn.execute("INSERT INTO schema_migrations(version,applied_at) VALUES(?,?)", (migration.name, datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")))
            logger.info("Applied database migration %s", migration.name)


initialize_database()
_clients: set[tuple[asyncio.AbstractEventLoop, asyncio.Queue]] = set()
_clients_lock = threading.Lock()
_known_sensor_online: dict[str, bool] = {}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def normalize_area(name: str) -> str:
    return re.sub(r"\s+", " ", name.strip()).casefold()


def error(status: int, code: str, message: str) -> None:
    raise HTTPException(status_code=status, detail={"code": code, "message": message})


def require_secret(provided: Optional[str], env_name: str) -> None:
    configured = os.getenv(env_name, "")
    if not configured:
        error(503, "SERVICE_NOT_CONFIGURED", f"{env_name} must be configured before this operation is enabled.")
    if provided is None or not __import__("hmac").compare_digest(provided, configured):
        error(401, "UNAUTHENTICATED", "A valid service token is required.")


def finite_number(value: Any, name: str, low: float, high: float) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < low or value > high:
        error(422, "INVALID_VALUE", f"{name} must be a finite number between {low} and {high}.")
    return float(value)


def parse_timestamp(value: Any) -> str:
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        parsed = parsed.astimezone(timezone.utc)
    except (TypeError, ValueError):
        error(422, "INVALID_TIMESTAMP", "timestamp must be an ISO 8601 date or datetime.")
    if parsed.timestamp() > datetime.now(timezone.utc).timestamp() + 300:
        error(422, "INVALID_TIMESTAMP", "timestamp cannot be more than five minutes in the future.")
    return parsed.isoformat().replace("+00:00", "Z")


def calculate_status(parameters: Dict[str, Any]) -> Dict[str, Any]:
    # Thresholds mirror the current dashboard configuration; they are operational
    # indicators and do not assert compliance with a jurisdictional standard.
    levels: dict[str, str] = {}
    limits = {"ph": (6.5, 8.5, 6.0, 9.0, 5.5, 9.5), "tds": (500, 1000, 1500),
              "turbidity": (5, 10, 25), "temperature": (20, 30, 15, 35, 10, 40),
              "fluoride": (1.0, 1.5, 2.0)}
    ranks = {"safe": 0, "warning": 1, "critical": 2}
    score_penalty = {"safe": 0, "warning": 12, "critical": 28}
    for key, value in parameters.items():
        if value is None:
            continue
        bounds = limits.get(key)
        if not bounds:
            continue
        if key in ("ph", "temperature"):
            if bounds[0] <= value <= bounds[1]: level = "safe"
            elif bounds[2] <= value <= bounds[3]: level = "warning"
            elif bounds[4] <= value <= bounds[5]: level = "warning"
            else: level = "critical"
        else:
            safe, elevated, high = bounds
            level = "safe" if value <= safe else "warning" if value <= elevated else "warning" if value <= high else "critical"
        levels[key] = level
    if not levels:
        has_values = any(value is not None for value in parameters.values())
        return {"status": "warning" if has_values else "offline", "overallScore": None, "parameterStatus": {}, "mainContributor": None, "recommendedAction": "Configure thresholds before interpreting these readings." if has_values else "Collect a valid water sample."}
    contributor = max(levels, key=lambda key: ranks[levels[key]])
    status = levels[contributor]
    score = max(0, 100 - max(score_penalty[level] for level in levels.values()))
    action = "Continue routine monitoring." if status == "safe" else "Review the elevated reading and collect a confirmatory sample." if status == "warning" else "Inspect the source and arrange confirmatory testing."
    return {"status": status, "overallScore": score, "parameterStatus": levels, "mainContributor": contributor, "recommendedAction": action}


def serialize_reading(row: sqlite3.Row) -> Dict[str, Any]:
    result = {"id": row["id"], "areaId": row["area_id"], "sensorId": row["sensor_id"],
              "timestamp": row["timestamp"], "parameters": json.loads(row["parameters_json"]),
              "parameterStatus": json.loads(row["parameter_status_json"]), "status": row["status"],
              "overallScore": row["overall_score"], "mainContributor": row["main_contributor"],
              "recommendedAction": row["recommended_action"]}
    return result


def insert_reading(conn: sqlite3.Connection, area_id: str, sensor_id: Optional[str], timestamp: str,
                   parameters: Dict[str, Any], source_id: Optional[str] = None) -> tuple[bool, Dict[str, Any]]:
    assessment = calculate_status(parameters)
    reading_id = str(uuid.uuid4())
    try:
        conn.execute("""INSERT INTO readings(id,source_id,area_id,sensor_id,timestamp,parameters_json,
          parameter_status_json,status,overall_score,main_contributor,recommended_action,created_at)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?)""", (reading_id, source_id, area_id, sensor_id, timestamp,
          json.dumps(parameters), json.dumps(assessment["parameterStatus"]), assessment["status"],
          assessment["overallScore"], assessment["mainContributor"], assessment["recommendedAction"], now_iso()))
    except sqlite3.IntegrityError:
        return False, {"id": source_id or reading_id, "timestamp": timestamp}
    return True, {"id": reading_id, "areaId": area_id, "sensorId": sensor_id, "timestamp": timestamp,
                  "parameters": parameters, **assessment}


class SensorCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(min_length=1, max_length=100)
    areaId: str
    name: str = Field(min_length=1, max_length=120)
    latitude: float
    longitude: float
    expectedIntervalSeconds: int = Field(default=60, ge=5, le=86400)


class ReadingCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    areaId: str
    sensorId: str
    timestamp: str
    parameters: Dict[str, Optional[float]]


def area_json(row: sqlite3.Row) -> Dict[str, Any]:
    return {"id": row["id"], "name": row["name"], "district": row["district"], "state": row["state"],
            "latitude": row["latitude"], "longitude": row["longitude"], "createdAt": row["created_at"], "updatedAt": row["updated_at"]}


def sensor_json(row: sqlite3.Row) -> Dict[str, Any]:
    return {"id":row["id"], "areaId":row["area_id"], "name":row["name"],
            "latitude":row["latitude"], "longitude":row["longitude"], "active":bool(row["active"]),
            "expectedIntervalSeconds":row["expected_interval_seconds"], "lastSeenAt":row["last_seen_at"],
            "createdAt":row["created_at"], "updatedAt":row["updated_at"], "online":sensor_online(row)}


def sensor_online(sensor: sqlite3.Row) -> bool:
    if not sensor["active"] or not sensor["last_seen_at"]:
        return False
    seen = datetime.fromisoformat(sensor["last_seen_at"].replace("Z", "+00:00"))
    return (datetime.now(timezone.utc) - seen).total_seconds() <= sensor["expected_interval_seconds"] * OFFLINE_MULTIPLIER


def check_sensor_status_once() -> None:
    with db() as conn:
        rows = conn.execute("SELECT s.*,a.name area_name FROM sensors s JOIN areas a ON a.id=s.area_id").fetchall()
    for sensor in rows:
        online = sensor_online(sensor)
        was_online = _known_sensor_online.get(sensor["id"])
        _known_sensor_online[sensor["id"]] = online
        if was_online is True and not online:
            publish({"type":"sensor_status", "areaId":sensor["area_id"], "areaName":sensor["area_name"],
                     "sensorId":sensor["id"], "status":"offline", "online":False,
                     "lastSeenAt":sensor["last_seen_at"]})
            logger.info("Sensor changed to offline sensor_id=%s area_id=%s", sensor["id"], sensor["area_id"])


async def monitor_sensor_status() -> None:
    """Publish a status event when a previously live sensor crosses offline."""
    while True:
        try: check_sensor_status_once()
        except Exception: logger.exception("Sensor offline check failed")
        await asyncio.sleep(15)


@router.get("/areas")
def list_areas():
    with db() as conn:
        return [area_json(row) for row in conn.execute("SELECT * FROM areas ORDER BY name")]


@router.get("/areas/{area_id}")
def get_area(area_id: str):
    with db() as conn:
        row = conn.execute("SELECT * FROM areas WHERE id=?", (area_id,)).fetchone()
        if not row: error(404, "AREA_NOT_FOUND", "The requested area does not exist.")
        return area_json(row)


@router.get("/areas/{area_id}/sensors")
def area_sensors(area_id: str):
    with db() as conn:
        if not conn.execute("SELECT 1 FROM areas WHERE id=?", (area_id,)).fetchone(): error(404, "AREA_NOT_FOUND", "The requested area does not exist.")
        return [sensor_json(row) for row in conn.execute("SELECT * FROM sensors WHERE area_id=? ORDER BY name", (area_id,))]


@router.get("/sensors")
def sensors():
    with db() as conn:
        return [sensor_json(row) for row in conn.execute("SELECT * FROM sensors ORDER BY name")]


@router.get("/sensors/status")
def sensors_status():
    return sensors()


@router.get("/sensors/{sensor_id}")
def get_sensor(sensor_id: str):
    with db() as conn:
        row = conn.execute("SELECT * FROM sensors WHERE id=?", (sensor_id,)).fetchone()
        if not row: error(404, "SENSOR_NOT_FOUND", "The requested sensor does not exist.")
        return sensor_json(row)


def latest_for(conn: sqlite3.Connection, condition: str, value: str):
    row = conn.execute(f"SELECT r.*,a.name area_name,s.name sensor_name,s.latitude sensor_latitude,s.longitude sensor_longitude,s.last_seen_at,s.expected_interval_seconds,s.active FROM readings r JOIN areas a ON a.id=r.area_id LEFT JOIN sensors s ON s.id=r.sensor_id WHERE {condition} ORDER BY r.timestamp DESC LIMIT 1", (value,)).fetchone()
    if not row: return None
    result = serialize_reading(row) | {"areaName": row["area_name"], "sensorName": row["sensor_name"]}
    result["online"] = sensor_online(row) if row["sensor_id"] else None
    if row["sensor_id"]:
        result["waterQualityStatus"] = result["status"]
        if not result["online"]: result["status"] = "offline"
        result["latitude"], result["longitude"] = row["sensor_latitude"], row["sensor_longitude"]
    return result


@router.get("/readings/latest")
def latest_reading(areaId: Optional[str] = None, sensorId: Optional[str] = None):
    if areaId and sensorId:
        with db() as conn:
            row = conn.execute("SELECT id FROM sensors WHERE id=? AND area_id=?", (sensorId, areaId)).fetchone()
            if not row: error(404, "SENSOR_NOT_FOUND", "No sensor belongs to that area.")
            result = latest_for(conn, "r.sensor_id=?", sensorId)
    elif areaId or sensorId:
        with db() as conn:
            if areaId and not conn.execute("SELECT 1 FROM areas WHERE id=?", (areaId,)).fetchone(): error(404, "AREA_NOT_FOUND", "The requested area does not exist.")
            if sensorId and not conn.execute("SELECT 1 FROM sensors WHERE id=?", (sensorId,)).fetchone(): error(404, "SENSOR_NOT_FOUND", "The requested sensor does not exist.")
            result = latest_for(conn, "r.area_id=?" if areaId else "r.sensor_id=?", areaId or sensorId)
    else:
        with db() as conn:
            row = conn.execute("SELECT r.*,a.name area_name FROM readings r JOIN areas a ON a.id=r.area_id ORDER BY r.timestamp DESC LIMIT 1").fetchone()
            result = serialize_reading(row) | {"areaName": row["area_name"]} if row else None
    if not result: error(404, "READING_NOT_FOUND", "No reading is available for the requested resource.")
    return result


@router.get("/areas/{area_id}/readings/latest")
def latest_area_reading(area_id: str):
    with db() as conn:
        if not conn.execute("SELECT 1 FROM areas WHERE id=?", (area_id,)).fetchone(): error(404, "AREA_NOT_FOUND", "The requested area does not exist.")
        result = latest_for(conn, "r.area_id=?", area_id)
    if not result: error(404, "READING_NOT_FOUND", "No reading is available for this area.")
    return result


@router.get("/sensors/{sensor_id}/readings/latest")
def latest_sensor_reading(sensor_id: str):
    with db() as conn:
        if not conn.execute("SELECT 1 FROM sensors WHERE id=?", (sensor_id,)).fetchone(): error(404, "SENSOR_NOT_FOUND", "The requested sensor does not exist.")
        result = latest_for(conn, "r.sensor_id=?", sensor_id)
    if not result: error(404, "READING_NOT_FOUND", "No reading is available for this sensor.")
    return result


@router.get("/readings/history")
def history(from_: Optional[str] = Query(None, alias="from"), to: Optional[str] = None,
            limit: int = 500, parameter: Optional[str] = None, areaId: Optional[str] = None, sensorId: Optional[str] = None):
    clauses, params = [], []
    if areaId or sensorId:
        with db() as conn:
            if areaId and not conn.execute("SELECT 1 FROM areas WHERE id=?", (areaId,)).fetchone(): error(404, "AREA_NOT_FOUND", "The requested area does not exist.")
            if sensorId and not conn.execute("SELECT 1 FROM sensors WHERE id=?", (sensorId,)).fetchone(): error(404, "SENSOR_NOT_FOUND", "The requested sensor does not exist.")
            if areaId and sensorId and not conn.execute("SELECT 1 FROM sensors WHERE id=? AND area_id=?", (sensorId, areaId)).fetchone(): error(404, "SENSOR_NOT_FOUND", "No sensor belongs to that area.")
    if areaId: clauses.append("area_id=?"); params.append(areaId)
    if sensorId: clauses.append("sensor_id=?"); params.append(sensorId)
    if not clauses: clauses.append("1=1")
    return _history_with_params(clauses, params, from_, to, limit, parameter)


def _history_with_params(clauses, params, from_, to, limit, parameter):
    if not 1 <= limit <= MAX_HISTORY_LIMIT: error(400, "INVALID_LIMIT", f"limit must be between 1 and {MAX_HISTORY_LIMIT}.")
    if from_: clauses.append("timestamp>=?"); params.append(parse_timestamp(from_))
    if to: clauses.append("timestamp<=?"); params.append(parse_timestamp(to))
    if from_ and to and parse_timestamp(from_) > parse_timestamp(to): error(400, "INVALID_DATE_RANGE", "from must be earlier than or equal to to.")
    with db() as conn: rows = conn.execute(f"SELECT * FROM readings WHERE {' AND '.join(clauses)} ORDER BY timestamp DESC LIMIT ?", (*params, limit)).fetchall()
    result = [serialize_reading(row) for row in reversed(rows)]
    if parameter:
        if parameter not in PARAMETERS: error(400, "UNKNOWN_PARAMETER", "parameter is not supported.")
        result = [item for item in result if parameter in item["parameters"]]
    return {"readings": result, "count": len(result)}


@router.get("/areas/{area_id}/readings")
def area_history(area_id: str, from_: Optional[str] = Query(None, alias="from"), to: Optional[str] = None, limit: int = 500, parameter: Optional[str] = None):
    with db() as conn:
        if not conn.execute("SELECT 1 FROM areas WHERE id=?", (area_id,)).fetchone(): error(404, "AREA_NOT_FOUND", "The requested area does not exist.")
    return _history_with_params(["area_id=?"], [area_id], from_, to, limit, parameter) | {"areaId": area_id}


@router.get("/sensors/{sensor_id}/readings")
def sensor_history(sensor_id: str, from_: Optional[str] = Query(None, alias="from"), to: Optional[str] = None, limit: int = 500, parameter: Optional[str] = None):
    with db() as conn:
        if not conn.execute("SELECT 1 FROM sensors WHERE id=?", (sensor_id,)).fetchone(): error(404, "SENSOR_NOT_FOUND", "The requested sensor does not exist.")
    return _history_with_params(["sensor_id=?"], [sensor_id], from_, to, limit, parameter) | {"sensorId": sensor_id}


@router.get("/map/locations")
def map_locations():
    with db() as conn:
        rows = conn.execute("SELECT s.*,a.name area_name,a.district,a.state FROM sensors s JOIN areas a ON a.id=s.area_id WHERE s.latitude BETWEEN -90 AND 90 AND s.longitude BETWEEN -180 AND 180").fetchall()
        locations = []
        for sensor in rows:
            latest = latest_for(conn, "r.sensor_id=?", sensor["id"])
            locations.append({"areaId": sensor["area_id"], "areaName": sensor["area_name"], "district": sensor["district"], "state": sensor["state"], "sensorId": sensor["id"], "sensorName": sensor["name"], "latitude": sensor["latitude"], "longitude": sensor["longitude"], "status": latest["status"] if latest else "offline", "waterQualityStatus": latest["waterQualityStatus"] if latest else None, "parameters": latest["parameters"] if latest else {}, "timestamp": latest["timestamp"] if latest else None, "lastSeenAt": sensor["last_seen_at"], "online": sensor_online(sensor)})
        area_rows = conn.execute("""SELECT a.* FROM areas a
            WHERE a.latitude BETWEEN -90 AND 90 AND a.longitude BETWEEN -180 AND 180
              AND EXISTS (SELECT 1 FROM readings r WHERE r.area_id=a.id)
              AND NOT EXISTS (SELECT 1 FROM sensors s WHERE s.area_id=a.id)
            ORDER BY a.name""").fetchall()
        for area in area_rows:
            latest = latest_for(conn, "r.area_id=?", area["id"])
            if latest:
                locations.append({"locationType":"area", "areaId":area["id"], "areaName":area["name"],
                                  "district":area["district"], "state":area["state"], "sensorId":None,
                                  "sensorName":None, "latitude":area["latitude"], "longitude":area["longitude"],
                                  "status":latest["status"], "parameters":latest["parameters"],
                                  "timestamp":latest["timestamp"], "lastSeenAt":None, "online":None})
        return locations


def publish(event: Dict[str, Any]) -> None:
    with _clients_lock: clients = list(_clients)
    for loop, queue in clients:
        def enqueue(target: asyncio.Queue, value: Dict[str, Any]) -> None:
            if target.full():
                try: target.get_nowait()
                except asyncio.QueueEmpty: pass
            try: target.put_nowait(value)
            except asyncio.QueueFull: pass
        try: loop.call_soon_threadsafe(enqueue, queue, event)
        except RuntimeError: logger.warning("Could not queue realtime event for disconnected client")


@router.get("/realtime")
async def realtime(request: Request, areaId: Optional[str] = None, sensorId: Optional[str] = None):
    if areaId:
        with db() as conn:
            if not conn.execute("SELECT 1 FROM areas WHERE id=?", (areaId,)).fetchone(): error(404, "AREA_NOT_FOUND", "The requested area does not exist.")
    if sensorId:
        with db() as conn:
            if not conn.execute("SELECT 1 FROM sensors WHERE id=?", (sensorId,)).fetchone(): error(404, "SENSOR_NOT_FOUND", "The requested sensor does not exist.")
    async def events():
        loop = asyncio.get_running_loop(); queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        client = (loop, queue)
        with _clients_lock: _clients.add(client)
        try:
            yield f"data: {json.dumps({'type':'connection_status','status':'connected','timestamp':now_iso()})}\n\n"
            while not await request.is_disconnected():
                try: event = await asyncio.wait_for(queue.get(), timeout=20)
                except asyncio.TimeoutError:
                    yield ": heartbeat\n\n"; continue
                if (areaId and event.get("areaId") != areaId) or (sensorId and event.get("sensorId") != sensorId): continue
                yield f"data: {json.dumps(event, separators=(',', ':'))}\n\n"
        finally:
            with _clients_lock: _clients.discard(client)
    return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control":"no-cache", "X-Accel-Buffering":"no"})


@router.post("/sensors", status_code=201)
def create_sensor(sensor: SensorCreate, x_admin_token: Optional[str] = Header(None)):
    require_secret(x_admin_token, "ADMIN_TOKEN")
    lat = finite_number(sensor.latitude, "latitude", -90, 90); lon = finite_number(sensor.longitude, "longitude", -180, 180)
    stamp = now_iso()
    with db() as conn:
        if not conn.execute("SELECT 1 FROM areas WHERE id=?", (sensor.areaId,)).fetchone(): error(404, "AREA_NOT_FOUND", "The requested area does not exist.")
        try: conn.execute("INSERT INTO sensors(id,area_id,name,latitude,longitude,expected_interval_seconds,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)", (sensor.id,sensor.areaId,sensor.name,lat,lon,sensor.expectedIntervalSeconds,stamp,stamp))
        except sqlite3.IntegrityError: error(409, "SENSOR_CONFLICT", "Sensor ID is already registered.")
    logger.info("Registered sensor id=%s area_id=%s", sensor.id, sensor.areaId)
    return {"id":sensor.id,"areaId":sensor.areaId,"name":sensor.name,"latitude":lat,"longitude":lon,"active":True,"expectedIntervalSeconds":sensor.expectedIntervalSeconds,"createdAt":stamp,"updatedAt":stamp}


@router.post("/readings", status_code=201)
def ingest_reading(reading: ReadingCreate, x_ingest_token: Optional[str] = Header(None)):
    require_secret(x_ingest_token, "INGEST_TOKEN")
    timestamp = parse_timestamp(reading.timestamp)
    if len(reading.parameters) > len(PARAMETERS): error(422, "INVALID_PARAMETERS", "Too many parameter fields were supplied.")
    params = {}
    for key, value in reading.parameters.items():
        if key not in PARAMETERS: error(422, "INVALID_PARAMETERS", f"Unsupported parameter: {key}.")
        if value is not None: params[key] = finite_number(value, key, *PARAMETERS[key])
    if not params: error(422, "INVALID_PARAMETERS", "At least one parameter value is required.")
    with db() as conn:
        sensor = conn.execute("SELECT s.*,a.name area_name FROM sensors s JOIN areas a ON a.id=s.area_id WHERE s.id=?", (reading.sensorId,)).fetchone()
        if not sensor: error(404, "SENSOR_NOT_FOUND", "The requested sensor does not exist.")
        if sensor["area_id"] != reading.areaId: error(422, "SENSOR_AREA_MISMATCH", "Sensor does not belong to the specified area.")
        inserted, normalized = insert_reading(conn, reading.areaId, reading.sensorId, timestamp, params)
        if not inserted: error(409, "DUPLICATE_READING", "A reading already exists for this sensor and timestamp.")
        conn.execute("UPDATE sensors SET last_seen_at=?,updated_at=? WHERE id=?", (timestamp,now_iso(),reading.sensorId))
    event = {"type":"sensor_reading","areaId":reading.areaId,"areaName":sensor["area_name"],"sensorId":reading.sensorId,"sensorName":sensor["name"],"latitude":sensor["latitude"],"longitude":sensor["longitude"],"timestamp":timestamp,"parameters":params,"status":normalized["status"],"overallScore":normalized["overallScore"],"online":True}
    publish(event); logger.info("Accepted sensor reading sensor_id=%s area_id=%s",reading.sensorId,reading.areaId)
    return normalized | {"areaName":sensor["area_name"],"sensorName":sensor["name"],"latitude":sensor["latitude"],"longitude":sensor["longitude"],"online":True}


def csv_value(value: str, key: str):
    if value is None or value.strip() == "": return None
    if key in ("latitude", "longitude"):
        try: number=float(value)
        except ValueError: raise ValueError(f"Invalid {key}")
        if not math.isfinite(number) or (key == "latitude" and not -90 <= number <= 90) or (key == "longitude" and not -180 <= number <= 180): raise ValueError(f"Invalid {key}")
        return number
    if key in PARAMETERS:
        try: number=float(value)
        except ValueError: raise ValueError(f"Invalid {key}")
        if not math.isfinite(number) or not PARAMETERS[key][0] <= number <= PARAMETERS[key][1]: raise ValueError(f"Invalid {key}")
        return number
    return value.strip()


def import_csv(text: str) -> Dict[str, Any]:
    reader = csv.DictReader(io.StringIO(text.lstrip("\ufeff")))
    if not reader.fieldnames: error(422, "INVALID_DATASET", "CSV header row is missing.")
    required = {"sample_id", "sample_date", "city", "state", "latitude", "longitude"}
    missing = sorted(required - set(reader.fieldnames))
    if missing: error(422, "INVALID_DATASET", "CSV is missing required columns: " + ", ".join(missing))
    imported = skipped = updated = 0; errors = []
    with db() as conn:
        for row_number, raw in enumerate(reader, start=2):
            try:
                values = {CSV_FIELDS[key]: csv_value(raw.get(key, ""), CSV_FIELDS[key]) for key in CSV_FIELDS if key in raw}
                if not values.get("sample_id") or not values.get("areaName") or not values.get("state"): raise ValueError("Missing sample_id, city, or state")
                if values.get("latitude") is None or values.get("longitude") is None: raise ValueError("Invalid coordinates")
                timestamp = parse_timestamp(values.get("timestamp"))
                parameters = {key:value for key,value in values.items() if key in PARAMETERS and value is not None}
                if not parameters: raise ValueError("No valid measured parameter values")
                area_name = values["areaName"]; normalized = normalize_area(area_name); stamp=now_iso()
                area = conn.execute("SELECT * FROM areas WHERE normalized_name=?", (normalized,)).fetchone()
                if area:
                    area_id=area["id"]
                    conn.execute("UPDATE areas SET latitude=?,longitude=?,state=?,updated_at=? WHERE id=?", (values["latitude"],values["longitude"],values.get("state"),stamp,area_id))
                else:
                    area_id=str(uuid.uuid4())
                    conn.execute("INSERT INTO areas(id,name,normalized_name,state,latitude,longitude,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)", (area_id,area_name,normalized,values.get("state"),values["latitude"],values["longitude"],stamp,stamp))
                inserted, _ = insert_reading(conn,area_id,None,timestamp,parameters,values["sample_id"])
                if inserted: imported += 1
                else: skipped += 1
            except HTTPException as exc:
                errors.append({"row":row_number,"reason":exc.detail.get("message", "Invalid timestamp") if isinstance(exc.detail,dict) else str(exc.detail)})
            except (ValueError, TypeError) as exc: errors.append({"row":row_number,"reason":str(exc)})
            if len(errors)>=1000: errors.append({"row":row_number,"reason":"Further row errors omitted."}); break
    summary={"imported":imported,"updated":updated,"skipped":skipped,"errors":errors}
    logger.info("Dataset import completed imported=%d skipped=%d errors=%d",imported,skipped,len(errors))
    return summary


@router.post("/admin/import-readings")
async def import_readings(request: Request, x_admin_token: Optional[str] = Header(None)):
    require_secret(x_admin_token,"ADMIN_TOKEN")
    body=await request.body()
    if len(body)>MAX_IMPORT_BYTES: error(413,"DATASET_TOO_LARGE","Dataset must be at most 5 MB.")
    content_type=request.headers.get("content-type","")
    if "application/json" in content_type:
        try: payload=json.loads(body); text=payload["csv"]
        except (ValueError,KeyError,TypeError): error(400,"INVALID_DATASET","JSON request must contain a string property named csv.")
    else:
        try: text=body.decode("utf-8-sig")
        except UnicodeDecodeError: error(422,"INVALID_DATASET","CSV must use UTF-8 encoding.")
    if not isinstance(text,str): error(400,"INVALID_DATASET","CSV content must be text.")
    return import_csv(text)
