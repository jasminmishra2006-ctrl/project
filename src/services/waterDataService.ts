import rawJson from '@/data/waterData.json';
import type {
  WaterReading,
  DistrictAgg,
  TrendPoint,
  AlertItem,
  ContaminationSlice,
  SensorStatus,
  FilterHealthItem,
  Filters,
  RiskLevel,
} from '@/types';
import { THRESHOLDS } from './thresholds';

interface RawData {
  dataSource: string;
  lastUpdated: string;
  districts: DistrictAgg[];
  latestReading: WaterReading & { previousReading: Partial<WaterReading> };
  trends: Record<string, TrendPoint[]>;
  contaminationDistribution: ContaminationSlice[];
  alerts: AlertItem[];
  sensorHealth: SensorStatus[];
  improvementAreas: { district: string; before: string; now: string; improvementPct: number }[];
}

const data = rawJson as unknown as RawData;

export function getDataSource(): string {
  return data.dataSource;
}

export function getLastUpdated(): string {
  return data.lastUpdated;
}

export function getDistricts(): DistrictAgg[] {
  return data.districts;
}

export function getDistrictNames(): string[] {
  return data.districts.map((d) => d.district).sort();
}

export function getBlocks(): string[] {
  return Array.from(new Set(data.districts.map((d) => d.block))).sort();
}

export function getWaterSources(): string[] {
  return Array.from(new Set(data.districts.map((d) => d.waterSource))).sort();
}

export function getLatestSensorReading(): WaterReading & { previousReading: Partial<WaterReading> } {
  return data.latestReading;
}

export function getTrends(range: string): TrendPoint[] {
  const key = range === '7d' ? '7d' : range === '30d' ? '30d' : '24h';
  return data.trends[key] ?? data.trends['24h'];
}

export function getContaminationData(): ContaminationSlice[] {
  return data.contaminationDistribution;
}

export function getAlerts(): AlertItem[] {
  return data.alerts;
}

export function getSensorHealth(): SensorStatus[] {
  return data.sensorHealth;
}

export function getImprovementAreas() {
  return data.improvementAreas;
}

export function getFilterHealth(): FilterHealthItem[] {
  const fh = data.latestReading.filterHealth;
  const items: FilterHealthItem[] = [
    { name: 'Sediment Filter', percent: fh.sediment, status: classifyFilter(fh.sediment), lastService: '12 Aug 2026', nextMaintenance: '28 Oct 2026' },
    { name: 'Activated Carbon', percent: fh.carbon, status: classifyFilter(fh.carbon), lastService: '30 Jul 2026', nextMaintenance: '15 Oct 2026' },
    { name: 'Ultrafiltration', percent: fh.ultrafiltration, status: classifyFilter(fh.ultrafiltration), lastService: '05 Sep 2026', nextMaintenance: '20 Nov 2026' },
    { name: 'UV System', percent: fh.uv, status: classifyFilter(fh.uv), lastService: '10 Sep 2026', nextMaintenance: '10 Dec 2026' },
    { name: 'RO Membrane', percent: fh.ro, status: classifyFilter(fh.ro), lastService: '22 Aug 2026', nextMaintenance: '22 Nov 2026' },
  ];
  return items;
}

function classifyFilter(pct: number): FilterHealthItem['status'] {
  if (pct >= 75) return 'healthy';
  if (pct >= 50) return 'monitor';
  return 'replacement';
}

export function getWaterReadings(filters?: Filters): DistrictAgg[] {
  let result = data.districts;
  if (filters) {
    if (filters.district && filters.district !== 'All Districts') {
      result = result.filter((d) => d.district === filters.district);
    }
    if (filters.block && filters.block !== 'All Blocks') {
      result = result.filter((d) => d.block === filters.block);
    }
    if (filters.waterSource && filters.waterSource !== 'All Sources') {
      result = result.filter((d) => d.waterSource === filters.waterSource);
    }
  }
  return result;
}

export function getDistrictData(districtName: string): DistrictAgg | undefined {
  return data.districts.find((d) => d.district === districtName);
}

// ---- Risk classification (range-based for pH/temperature, progressive for others) ----

export function classifyPH(value: number): RiskLevel {
  if (value === 0) return 'nodata';
  const t = THRESHOLDS.ph;
  if (value >= t.safe.min && value <= t.safe.max) return 'safe';
  if (value >= t.elevated.min && value <= t.elevated.max) return 'elevated';
  if (value >= t.high.min && value <= t.high.max) return 'high';
  return 'critical';
}

export function classifyTDS(value: number): RiskLevel {
  if (value === 0) return 'nodata';
  const t = THRESHOLDS.tds;
  if (value <= t.safe) return 'safe';
  if (value <= t.elevated) return 'elevated';
  if (value <= t.high) return 'high';
  return 'critical';
}

export function classifyTurbidity(value: number): RiskLevel {
  if (value === 0) return 'nodata';
  const t = THRESHOLDS.turbidity;
  if (value <= t.safe) return 'safe';
  if (value <= t.elevated) return 'elevated';
  if (value <= t.high) return 'high';
  return 'critical';
}

export function classifyTemperature(value: number): RiskLevel {
  if (value === 0) return 'nodata';
  const t = THRESHOLDS.temperature;
  if (value >= t.safe.min && value <= t.safe.max) return 'safe';
  if (value >= t.elevated.min && value <= t.elevated.max) return 'elevated';
  if (value >= t.high.min && value <= t.high.max) return 'high';
  return 'critical';
}

export function riskToLabel(risk: RiskLevel): string {
  switch (risk) {
    case 'safe': return 'Normal';
    case 'elevated': return 'Elevated';
    case 'high': return 'High';
    case 'critical': return 'Critical';
    case 'nodata': return 'No Data';
  }
}

export const RISK_COLORS: Record<RiskLevel, string> = {
  safe: '#22c55e',
  elevated: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
  nodata: '#94a3b8',
};

export const RISK_BG: Record<RiskLevel, string> = {
  safe: 'bg-green-50 text-green-700 border-green-200',
  elevated: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
  nodata: 'bg-gray-50 text-gray-500 border-gray-200',
};

export function getAlertsForDistricts(districtNames: string[]): AlertItem[] {
  if (districtNames.length === 0) return data.alerts;
  return data.alerts.filter(a => districtNames.includes(a.location));
}

export function getContaminationDataForDistricts(districts: DistrictAgg[]): ContaminationSlice[] {
  if (districts.length === 0 || districts.length === data.districts.length) return data.contaminationDistribution;
  // Recalculate distribution based on filtered districts' mainIssue
  const issueMap: Record<string, { count: number; name: string; color: string }> = {
    'High TDS': { count: 0, name: 'High TDS', color: '#eab308' },
    'Turbidity': { count: 0, name: 'High Turbidity', color: '#8b5cf6' },
    'Iron': { count: 0, name: 'Iron', color: '#f97316' },
    'Fluoride': { count: 0, name: 'Fluoride', color: '#3b82f6' },
    'Arsenic': { count: 0, name: 'Arsenic', color: '#ef4444' },
    'Calcium': { count: 0, name: 'Calcium', color: '#64748b' },
    'None': { count: 0, name: 'Other', color: '#94a3b8' },
    'No Data': { count: 0, name: 'Other', color: '#94a3b8' },
  };
  districts.forEach(d => {
    const issue = issueMap[d.mainIssue];
    if (issue) issue.count++;
  });
  const total = Object.values(issueMap).reduce((s, v) => s + v.count, 0);
  if (total === 0) return [];
  const result: ContaminationSlice[] = [];
  const grouped: Record<string, { name: string; count: number; color: string }> = {};
  Object.values(issueMap).forEach(v => {
    if (v.count > 0) {
      if (!grouped[v.name]) grouped[v.name] = { name: v.name, count: 0, color: v.color };
      grouped[v.name].count += v.count;
    }
  });
  Object.values(grouped).forEach(v => {
    result.push({ name: v.name, value: Math.round((v.count / total) * 100), samples: v.count, color: v.color });
  });
  return result.sort((a, b) => b.value - a.value);
}

// ---- Simulated polling for live data (clearly labeled DEMO) ----

export function fetchLatestSensorData(): Promise<{ reading: WaterReading; isDemo: boolean }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ reading: data.latestReading, isDemo: true });
    }, 300);
  });
}
