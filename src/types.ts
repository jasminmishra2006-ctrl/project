export type RiskLevel = 'safe' | 'elevated' | 'high' | 'critical' | 'nodata';

export type TreatmentStageStatus =
  | 'completed'
  | 'active'
  | 'required'
  | 'notRequired'
  | 'attention'
  | 'failed';

export interface WaterReading {
  id: string;
  timestamp: string;
  district: string;
  block: string;
  village: string;
  waterSource: string;
  latitude: number;
  longitude: number;

  ph: number;
  tds: number;
  turbidity: number;
  temperature: number;

  iron: number;
  arsenic: number;
  fluoride: number;
  calcium: number;
  phosphorus: number;

  riskLevel: RiskLevel;
  waterQualityScore: number;

  treatmentRequired: boolean;
  treatmentStatus: string;

  beforeTreatment: {
    ph: number;
    tds: number;
    turbidity: number;
    temperature: number;
  };
  afterTreatment: {
    ph: number;
    tds: number;
    turbidity: number;
    temperature: number;
  };

  filterHealth: {
    sediment: number;
    carbon: number;
    ultrafiltration: number;
    uv: number;
    ro: number;
  };
}

export interface DistrictAgg {
  district: string;
  block: string;
  village: string;
  waterSource: string;
  latitude: number;
  longitude: number;
  waterSources: number;
  riskLevel: RiskLevel;
  mainIssue: string;
  ph: number;
  tds: number;
  turbidity: number;
  temperature: number;
  iron: number;
  arsenic: number;
  fluoride: number;
  calcium: number;
  phosphorus: number;
  lastUpdated: string;
  improvementPct: number;
  beforeRisk: RiskLevel;
  afterRisk: RiskLevel;
}

export interface TrendPoint {
  time: string;
  ph: number;
  tds: number;
  turbidity: number;
  temperature: number;
  score: number;
}

export interface AlertItem {
  id: string;
  time: string;
  location: string;
  parameter: string;
  value: string;
  severity: 'critical' | 'warning' | 'info' | 'resolved';
  status: 'OPEN' | 'MONITORING' | 'RESOLVED';
}

export interface ContaminationSlice {
  name: string;
  value: number;
  samples: number;
  color: string;
}

export interface FilterHealthItem {
  name: string;
  percent: number;
  status: 'healthy' | 'monitor' | 'replacement';
  lastService: string;
  nextMaintenance: string;
}

export type DeviceHealthStatus =
  | 'online'
  | 'offline'
  | 'stale'
  | 'error'
  | 'maintenance'
  | 'nodata';

export type CalibrationStatus =
  | 'calibrated'
  | 'due'
  | 'overdue'
  | 'unknown';

export type MaintenanceStatus =
  | 'healthy'
  | 'service_soon'
  | 'service_due'
  | 'overdue';

export interface SensorStatus {
  name: string;
  type: 'controller' | 'sensor' | 'network' | 'api' | 'database';
  online: boolean;
  lastReading?: string;
  /** ISO timestamp of last data received */
  lastDataReceived?: string;
  /** Seconds since last reading — used for staleness checks */
  secondsSinceLastReading?: number;
  /** Latest measured value (for sensors) */
  value?: number;
  unit?: string;
  /** Whether the reading passed validation */
  readingValid?: boolean;
  /** Error message if sensor is in error state */
  errorMessage?: string;
  /** Calibration info */
  calibration?: {
    status: CalibrationStatus;
    lastCalibration: string;
    nextCalibration: string;
  };
  /** Maintenance info */
  maintenance?: {
    status: MaintenanceStatus;
    lastService: string;
    nextService: string;
  };
  /** ESP32-specific fields */
  heartbeatSecondsAgo?: number;
  wifiConnected?: boolean;
  signalStrength?: number;
  uptime?: string;
  firmwareVersion?: string;
}

export interface SensorHealthSummary {
  total: number;
  online: number;
  warning: number;
  offline: number;
  error: number;
  noData: number;
}

export interface SensorAlert {
  id: string;
  device: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
}

export interface MLPrediction {
  riskLevel: string;
  predictedContaminant: string;
  confidence: number;
  inputs: {
    ph: number;
    tds: number;
    turbidity: number;
    temperature: number;
  };
  isDemo: boolean;
}

export interface TreatmentStage {
  key: string;
  label: string;
  status: TreatmentStageStatus;
}

export interface TreatmentPlan {
  stages: TreatmentStage[];
  reasons: string[];
}

export interface TreatmentComparison {
  parameter: string;
  before: number;
  after: number;
  unit: string;
  changePct: number;
  status: 'improved' | 'stable' | 'worse';
}

export interface Filters {
  district: string;
  block: string;
  waterSource: string;
  contaminant: string;
  timeRange: string;
}
