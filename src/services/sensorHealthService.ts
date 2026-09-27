import type {
  SensorStatus,
  DeviceHealthStatus,
  SensorHealthSummary,
  SensorAlert,
  WaterReading,
} from '@/types';
import { getSensorHealth, getLatestSensorReading } from './waterDataService';

// ---- Configurable thresholds ----

/** Seconds without data before a sensor is considered STALE */
export const STALE_THRESHOLD_SEC = 120;

/** Seconds without data before a sensor is considered OFFLINE */
export const OFFLINE_THRESHOLD_SEC = 600;

/** Valid physical sensor ranges — readings outside these are flagged as ERROR */
export const SENSOR_RANGES = {
  ph: { min: 0, max: 14 },
  tds: { min: 0, max: 5000 },
  turbidity: { min: 0, max: 100 },
  temperature: { min: -10, max: 60 },
} as const;

/** Sensor name → parameter key for validation */
const SENSOR_PARAM_MAP: Record<string, keyof typeof SENSOR_RANGES> = {
  'pH Sensor (E-201)': 'ph',
  'TDS Sensor (Gravity)': 'tds',
  'Turbidity Sensor (TSW-30)': 'turbidity',
  'DS18B20 Temperature': 'temperature',
};

// ---- Core health computation ----

export function computeDeviceHealth(sensor: SensorStatus): DeviceHealthStatus {
  // If the device reports offline, it's offline
  if (!sensor.online) {
    return sensor.errorMessage ? 'error' : 'offline';
  }

  // If sensor reports an error message, it's in error state
  if (sensor.errorMessage) {
    return 'error';
  }

  // If sensor has a value and it failed validation, it's in error
  if (sensor.value !== undefined && sensor.readingValid === false) {
    return 'error';
  }

  // Network/API/database: if online, they're online
  if (sensor.type === 'network' || sensor.type === 'api' || sensor.type === 'database') {
    return 'online';
  }

  // Controller and sensors: check staleness via secondsSinceLastReading
  const secs = sensor.secondsSinceLastReading;
  if (secs === undefined) {
    return 'online'; // No timestamp info — trust the online flag
  }

  if (secs >= OFFLINE_THRESHOLD_SEC) {
    return 'offline';
  }

  if (secs >= STALE_THRESHOLD_SEC) {
    return 'stale';
  }

  // Check maintenance status — if service overdue, flag as maintenance
  if (sensor.maintenance?.status === 'overdue') {
    return 'maintenance';
  }

  return 'online';
}

// ---- Reading validation ----

export function validateReading(param: keyof typeof SENSOR_RANGES, value: number): boolean {
  const range = SENSOR_RANGES[param];
  if (!range) return true;
  if (isNaN(value)) return false;
  return value >= range.min && value <= range.max;
}

export function validateAllReadings(reading: WaterReading): Record<string, boolean> {
  return {
    ph: validateReading('ph', reading.ph),
    tds: validateReading('tds', reading.tds),
    turbidity: validateReading('turbidity', reading.turbidity),
    temperature: validateReading('temperature', reading.temperature),
  };
}

// ---- Data freshness ----

export function getDataFreshness(secondsAgo: number): {
  label: string;
  status: 'fresh' | 'stale' | 'offline' | 'nodata';
  color: string;
} {
  if (secondsAgo === 0 || secondsAgo === undefined) {
    return { label: 'No timestamp', status: 'nodata', color: '#94a3b8' };
  }
  if (secondsAgo < STALE_THRESHOLD_SEC) {
    return { label: `${secondsAgo}s ago`, status: 'fresh', color: '#22c55e' };
  }
  if (secondsAgo < OFFLINE_THRESHOLD_SEC) {
    return formatStaleLabel(secondsAgo);
  }
  return formatOfflineLabel(secondsAgo);
}

function formatStaleLabel(secs: number): { label: string; status: 'stale'; color: string } {
  if (secs < 3600) {
    const mins = Math.floor(secs / 60);
    return { label: `${mins} min ago`, status: 'stale', color: '#eab308' };
  }
  const hours = Math.floor(secs / 3600);
  return { label: `${hours}h ago`, status: 'stale', color: '#eab308' };
}

function formatOfflineLabel(secs: number): { label: string; status: 'offline'; color: string } {
  if (secs < 86400) {
    const hours = Math.floor(secs / 3600);
    return { label: `${hours}h ago`, status: 'offline', color: '#ef4444' };
  }
  const days = Math.floor(secs / 86400);
  return { label: `${days}d ago`, status: 'offline', color: '#ef4444' };
}

// ---- Health summary ----

export function getHealthSummary(sensors: SensorStatus[]): SensorHealthSummary {
  const summary: SensorHealthSummary = {
    total: sensors.length,
    online: 0,
    warning: 0,
    offline: 0,
    error: 0,
    noData: 0,
  };

  for (const s of sensors) {
    const health = computeDeviceHealth(s);
    switch (health) {
      case 'online':
        summary.online++;
        break;
      case 'stale':
      case 'maintenance':
        summary.warning++;
        break;
      case 'offline':
        summary.offline++;
        break;
      case 'error':
        summary.error++;
        break;
      case 'nodata':
        summary.noData++;
        break;
    }
  }

  return summary;
}

// ---- Sensor alerts generation ----

export function generateSensorAlerts(sensors: SensorStatus[]): SensorAlert[] {
  const alerts: SensorAlert[] = [];
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  for (const s of sensors) {
    const health = computeDeviceHealth(s);

    if (health === 'offline') {
      alerts.push({
        id: `SA-${s.name}-OFF`,
        device: s.name,
        severity: 'critical',
        message: `${s.name} Offline`,
        timestamp: now,
      });
    }

    if (health === 'error') {
      alerts.push({
        id: `SA-${s.name}-ERR`,
        device: s.name,
        severity: 'critical',
        message: s.errorMessage || `${s.name} Error — Invalid Reading`,
        timestamp: now,
      });
    }

    if (health === 'stale') {
      alerts.push({
        id: `SA-${s.name}-STALE`,
        device: s.name,
        severity: 'warning',
        message: `${s.name} Data Stale`,
        timestamp: now,
      });
    }

    // Calibration alerts
    if (s.calibration) {
      if (s.calibration.status === 'overdue') {
        alerts.push({
          id: `SA-${s.name}-CAL-OV`,
          device: s.name,
          severity: 'warning',
          message: `${s.name} Calibration Overdue`,
          timestamp: now,
        });
      } else if (s.calibration.status === 'due') {
        alerts.push({
          id: `SA-${s.name}-CAL-DUE`,
          device: s.name,
          severity: 'warning',
          message: `${s.name} Calibration Due`,
          timestamp: now,
        });
      }
    }

    // Maintenance alerts
    if (s.maintenance) {
      if (s.maintenance.status === 'overdue' || s.maintenance.status === 'service_due') {
        alerts.push({
          id: `SA-${s.name}-MAINT`,
          device: s.name,
          severity: 'warning',
          message: `${s.name} Maintenance Due`,
          timestamp: now,
        });
      } else if (s.maintenance.status === 'service_soon') {
        alerts.push({
          id: `SA-${s.name}-MAINT-SOON`,
          device: s.name,
          severity: 'info',
          message: `${s.name} Service Scheduled Soon`,
          timestamp: now,
        });
      }
    }

    // ESP32-specific alerts
    if (s.type === 'controller') {
      if (s.wifiConnected === false) {
        alerts.push({
          id: `SA-${s.name}-WIFI`,
          device: s.name,
          severity: 'critical',
          message: 'ESP32 WiFi Disconnected',
          timestamp: now,
        });
      }
    }
  }

  return alerts;
}

// ---- Convenience: get enriched sensor list with computed health ----

export interface EnrichedSensor extends SensorStatus {
  health: DeviceHealthStatus;
  freshness: { label: string; status: string; color: string };
}

export function getEnrichedSensors(): EnrichedSensor[] {
  const sensors = getSensorHealth();
  return sensors.map((s) => ({
    ...s,
    health: computeDeviceHealth(s),
    freshness: getDataFreshness(s.secondsSinceLastReading ?? 0),
  }));
}

// ---- ESP32 status for header ----

export type Esp32State = 'live' | 'connecting' | 'offline' | 'error';

export function getEsp32State(): Esp32State {
  const sensors = getSensorHealth();
  const esp32 = sensors.find((s) => s.type === 'controller');
  if (!esp32) return 'offline';
  const health = computeDeviceHealth(esp32);
  if (health === 'error') return 'error';
  if (health === 'offline') return 'offline';
  if (health === 'stale') return 'connecting';
  return 'live';
}

// ---- API status for header ----

export type ApiState = 'online' | 'offline' | 'error';

export function getApiState(): ApiState {
  const sensors = getSensorHealth();
  const api = sensors.find((s) => s.type === 'api');
  if (!api) return 'offline';
  if (api.errorMessage) return 'error';
  return api.online ? 'online' : 'offline';
}

// ---- Database status ----

export type DatabaseState = 'connected' | 'disconnected';

export function getDatabaseState(): DatabaseState {
  const sensors = getSensorHealth();
  const db = sensors.find((s) => s.type === 'database');
  if (!db) return 'disconnected';
  return db.online ? 'connected' : 'disconnected';
}

// ---- Status display config ----

export const HEALTH_CONFIG: Record<DeviceHealthStatus, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
}> = {
  online: { label: 'ONLINE', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200', dotColor: 'bg-green-500' },
  stale: { label: 'STALE DATA', color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200', dotColor: 'bg-yellow-500' },
  offline: { label: 'OFFLINE', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200', dotColor: 'bg-red-500' },
  error: { label: 'ERROR', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200', dotColor: 'bg-red-500' },
  maintenance: { label: 'MAINTENANCE REQ.', color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200', dotColor: 'bg-yellow-500' },
  nodata: { label: 'NO DATA', color: 'text-slate-500', bgColor: 'bg-slate-50', borderColor: 'border-slate-200', dotColor: 'bg-slate-400' },
};

export const CALIBRATION_CONFIG: Record<string, { label: string; color: string }> = {
  calibrated: { label: 'Calibrated', color: 'text-green-600' },
  due: { label: 'Calibration Due', color: 'text-yellow-600' },
  overdue: { label: 'Calibration Overdue', color: 'text-red-600' },
  unknown: { label: 'Unknown', color: 'text-slate-400' },
};

export const MAINTENANCE_CONFIG: Record<string, { label: string; color: string }> = {
  healthy: { label: 'Healthy', color: 'text-green-600' },
  service_soon: { label: 'Service Soon', color: 'text-yellow-600' },
  service_due: { label: 'Service Due', color: 'text-orange-600' },
  overdue: { label: 'Service Overdue', color: 'text-red-600' },
};
