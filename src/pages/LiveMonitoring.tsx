import { useState, useEffect } from 'react';
import { Card, Badge } from '@/components/ui/Card';
import { GaugeCard } from '@/components/GaugeCard';
import { WaterTrendChart } from '@/components/WaterTrendChart';
import { SensorHealthPanel } from '@/components/SensorHealthPanel';
import { AlertPanel } from '@/components/AlertPanel';
import {
  fetchLatestSensorData, getTrends, getAlerts,
  classifyPH, classifyTDS, classifyTurbidity, classifyTemperature, riskToLabel, getDataSource,
} from '@/services/waterDataService';
import { THRESHOLDS } from '@/services/thresholds';
import type { RiskLevel, WaterReading } from '@/types';
import { FlaskConical, Droplets, Thermometer, Gauge, RefreshCw } from 'lucide-react';

export function LiveMonitoring() {
  const [reading, setReading] = useState<WaterReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(true);
  const [trendParam, setTrendParam] = useState<'ph' | 'tds' | 'turbidity' | 'temperature'>('ph');
  const [timeRange, setTimeRange] = useState('24h');

  async function load() {
    setLoading(true);
    const { reading: r, isDemo: demo } = await fetchLatestSensorData();
    setReading(r);
    setIsDemo(demo);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const trends = getTrends(timeRange);
  const alerts = getAlerts();

  if (loading || !reading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Fetching live sensor data...</span>
        </div>
      </div>
    );
  }

  const phRisk = classifyPH(reading.ph);
  const tdsRisk = classifyTDS(reading.tds);
  const turbRisk = classifyTurbidity(reading.turbidity);
  const tempRisk = classifyTemperature(reading.temperature);

  const phZones = [
    { risk: 'critical' as RiskLevel, fraction: THRESHOLDS.ph.high.min / 14 },
    { risk: 'high' as RiskLevel, fraction: (THRESHOLDS.ph.elevated.min - THRESHOLDS.ph.high.min) / 14 },
    { risk: 'elevated' as RiskLevel, fraction: (THRESHOLDS.ph.safe.min - THRESHOLDS.ph.elevated.min) / 14 },
    { risk: 'safe' as RiskLevel, fraction: (THRESHOLDS.ph.safe.max - THRESHOLDS.ph.safe.min) / 14 },
    { risk: 'elevated' as RiskLevel, fraction: (THRESHOLDS.ph.elevated.max - THRESHOLDS.ph.safe.max) / 14 },
    { risk: 'high' as RiskLevel, fraction: (THRESHOLDS.ph.high.max - THRESHOLDS.ph.elevated.max) / 14 },
    { risk: 'critical' as RiskLevel, fraction: (14 - THRESHOLDS.ph.high.max) / 14 },
  ].filter(z => z.fraction > 0);

  const tdsZones = [
    { risk: 'safe' as RiskLevel, fraction: THRESHOLDS.tds.safe / 2000 },
    { risk: 'elevated' as RiskLevel, fraction: (THRESHOLDS.tds.elevated - THRESHOLDS.tds.safe) / 2000 },
    { risk: 'high' as RiskLevel, fraction: (THRESHOLDS.tds.high - THRESHOLDS.tds.elevated) / 2000 },
    { risk: 'critical' as RiskLevel, fraction: (2000 - THRESHOLDS.tds.high) / 2000 },
  ];

  const turbZones = [
    { risk: 'safe' as RiskLevel, fraction: THRESHOLDS.turbidity.safe / 30 },
    { risk: 'elevated' as RiskLevel, fraction: (THRESHOLDS.turbidity.elevated - THRESHOLDS.turbidity.safe) / 30 },
    { risk: 'high' as RiskLevel, fraction: (THRESHOLDS.turbidity.high - THRESHOLDS.turbidity.elevated) / 30 },
    { risk: 'critical' as RiskLevel, fraction: (30 - THRESHOLDS.turbidity.high) / 30 },
  ];

  const tempZones = [
    { risk: 'critical' as RiskLevel, fraction: THRESHOLDS.temperature.high.min / 50 },
    { risk: 'high' as RiskLevel, fraction: (THRESHOLDS.temperature.elevated.min - THRESHOLDS.temperature.high.min) / 50 },
    { risk: 'elevated' as RiskLevel, fraction: (THRESHOLDS.temperature.safe.min - THRESHOLDS.temperature.elevated.min) / 50 },
    { risk: 'safe' as RiskLevel, fraction: (THRESHOLDS.temperature.safe.max - THRESHOLDS.temperature.safe.min) / 50 },
    { risk: 'elevated' as RiskLevel, fraction: (THRESHOLDS.temperature.elevated.max - THRESHOLDS.temperature.safe.max) / 50 },
    { risk: 'high' as RiskLevel, fraction: (THRESHOLDS.temperature.high.max - THRESHOLDS.temperature.elevated.max) / 50 },
    { risk: 'critical' as RiskLevel, fraction: (50 - THRESHOLDS.temperature.high.max) / 50 },
  ].filter(z => z.fraction > 0);

  const scoreZones = [
    { risk: 'critical' as RiskLevel, fraction: 0.3 },
    { risk: 'high' as RiskLevel, fraction: 0.2 },
    { risk: 'elevated' as RiskLevel, fraction: 0.2 },
    { risk: 'safe' as RiskLevel, fraction: 0.3 },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isDemo && <Badge color="yellow">DEMO LIVE DATA</Badge>}
          <span className="text-xs text-slate-400">Source: {getDataSource()}</span>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        <GaugeCard name="pH" value={reading.ph} unit="pH" risk={phRisk} statusLabel={riskToLabel(phRisk)} min={0} max={14} zones={phZones} icon={<FlaskConical className="w-4 h-4 text-blue-500" />} />
        <GaugeCard name="TDS" value={reading.tds} unit="mg/L" risk={tdsRisk} statusLabel={riskToLabel(tdsRisk)} min={0} max={2000} zones={tdsZones} icon={<Droplets className="w-4 h-4 text-blue-500" />} />
        <GaugeCard name="Turbidity" value={reading.turbidity} unit="NTU" risk={turbRisk} statusLabel={riskToLabel(turbRisk)} min={0} max={30} zones={turbZones} icon={<Droplets className="w-4 h-4 text-blue-500" />} />
        <GaugeCard name="Temperature" value={reading.temperature} unit="°C" risk={tempRisk} statusLabel={riskToLabel(tempRisk)} min={0} max={50} zones={tempZones} icon={<Thermometer className="w-4 h-4 text-blue-500" />} />
        <GaugeCard name="Water Quality Score" value={reading.waterQualityScore} unit="/ 100" risk={reading.riskLevel} statusLabel="Moderate" min={0} max={100} zones={scoreZones} icon={<Gauge className="w-4 h-4 text-blue-500" />} />
      </div>

      <Card title="Live Sensor Readings" subtitle={`Location: ${reading.district} — ${reading.village} — ${reading.waterSource}`}
        right={
          <div className="flex gap-1.5">
            {(['24h', '7d', '30d'] as const).map((r) => (
              <button key={r} onClick={() => setTimeRange(r)} className={`px-3 py-1 text-xs font-medium rounded-lg ${timeRange === r ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {r === '24h' ? '24 Hours' : r === '7d' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>
        }
      >
        <div className="flex gap-1.5 mb-4">
          {(['ph', 'tds', 'turbidity', 'temperature'] as const).map((p) => (
            <button key={p} onClick={() => setTrendParam(p)} className={`px-3 py-1 text-xs font-medium rounded-lg capitalize ${trendParam === p ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {p}
            </button>
          ))}
        </div>
        <WaterTrendChart data={trends} params={[trendParam]} height={300} />
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Sensor & System Health">
          <SensorHealthPanel compact />
        </Card>
        <Card title="Recent Alerts">
          <AlertPanel alerts={alerts.slice(0, 5)} compact />
        </Card>
      </div>
    </div>
  );
}
