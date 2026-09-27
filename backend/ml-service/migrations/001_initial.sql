CREATE TABLE IF NOT EXISTS areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  district TEXT,
  state TEXT,
  latitude REAL,
  longitude REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK(latitude IS NULL OR latitude BETWEEN -90 AND 90),
  CHECK(longitude IS NULL OR longitude BETWEEN -180 AND 180)
);

CREATE TABLE IF NOT EXISTS sensors (
  id TEXT PRIMARY KEY,
  area_id TEXT NOT NULL REFERENCES areas(id),
  name TEXT NOT NULL,
  latitude REAL NOT NULL CHECK(latitude BETWEEN -90 AND 90),
  longitude REAL NOT NULL CHECK(longitude BETWEEN -180 AND 180),
  active INTEGER NOT NULL DEFAULT 1,
  expected_interval_seconds INTEGER NOT NULL DEFAULT 60,
  last_seen_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS readings (
  id TEXT PRIMARY KEY,
  source_id TEXT UNIQUE,
  area_id TEXT NOT NULL REFERENCES areas(id),
  sensor_id TEXT REFERENCES sensors(id),
  timestamp TEXT NOT NULL,
  parameters_json TEXT NOT NULL,
  parameter_status_json TEXT NOT NULL,
  status TEXT NOT NULL,
  overall_score INTEGER,
  main_contributor TEXT,
  recommended_action TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(sensor_id, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_readings_area ON readings(area_id);
CREATE INDEX IF NOT EXISTS idx_readings_sensor ON readings(sensor_id);
CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON readings(timestamp);
CREATE INDEX IF NOT EXISTS idx_readings_area_timestamp ON readings(area_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_readings_sensor_timestamp ON readings(sensor_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_sensors_area ON sensors(area_id);
