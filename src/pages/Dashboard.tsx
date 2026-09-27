import { useState, useMemo, useEffect } from 'react';
import { Droplets, Thermometer, FlaskConical, Activity, Gauge, RotateCcw, Waves, Brain, AlertTriangle, Cpu, Zap } from 'lucide-react';
import { Card, Badge } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { GaugeCard } from '@/components/GaugeCard';
import { WaterQualityMap } from '@/components/WaterQualityMap';
import { MostAffectedAreas } from '@/components/MostAffectedAreas';
import { MostImprovedAreas } from '@/components/MostImprovedAreas';
import { WaterTrendChart } from '@/components/WaterTrendChart';
import { ContaminationDonut } from '@/components/ContaminationDonut';
import { PurificationPipeline } from '@/components/PurificationPipeline';
import { TreatmentComparison } from '@/components/TreatmentComparison';
import { FilterHealth } from '@/components/FilterHealth';
import { AlertPanel } from '@/components/AlertPanel';
import { SensorHealthPanel } from '@/components/SensorHealthPanel';
import {
  getLatestSensorReading, getDistricts, getDistrictNames, getBlocks, getWaterSources,
  getTrends, getContaminationData, getFilterHealth, getDataSource,
  classifyPH, classifyTDS, classifyTurbidity, classifyTemperature, riskToLabel,
  getAlertsForDistricts, getContaminationDataForDistricts, getWaterReadings,
} from '@/services/waterDataService';
import { getEnrichedSensors, generateSensorAlerts, getHealthSummary } from '@/services/sensorHealthService';
import { evaluateTreatment } from '@/services/decisionEngine';
import { predictWaterQuality } from '@/services/mlService';
import { THRESHOLDS } from '@/services/thresholds';
import type { RiskLevel, MLPrediction, AlertItem } from '@/types';

const CONTAMINANTS = ['Overall', 'Iron', 'Arsenic', 'Fluoride', 'Calcium', 'Phosphorus', 'TDS', 'pH', 'Turbidity'];
const TIME_RANGES = ['Last 24 Hours', '7 Days', '30 Days'];

export function Dashboard() {
  const [filters, setFilters] = useState({
    district: 'All Districts',
    block: 'All Blocks',
    waterSource: 'All Sources',
    contaminant: 'Overall',
    timeRange: 'Last 24 Hours',
  });

  const [selectedDistrict, setSelectedDistrict] = useState<string | undefined>();
  const [trendParam, setTrendParam] = useState<'ph' | 'tds' | 'turbidity' | 'temperature'>('ph');
  const [selectedContaminant, setSelectedContaminant] = useState<string | undefined>();
  const [mlPrediction, setMlPrediction] = useState<MLPrediction | null>(null);
  const [mlLoading, setMlLoading] = useState(true);

  const reading = getLatestSensorReading();
  const allDistricts = getDistricts();
  const dataSource = getDataSource();

  // Filtered districts for map, affected areas, improved areas
  const filteredDistricts = useMemo(() => getWaterReadings(filters), [filters]);
  const districtNames = useMemo(() => filteredDistricts.map(d => d.district), [filteredDistricts]);

  // Filter-responsive data
  const trends = getTrends(filters.timeRange === '7 Days' ? '7d' : filters.timeRange === '30 Days' ? '30d' : '24h');
  const enrichedSensors = getEnrichedSensors();
  const sensorSummary = getHealthSummary(enrichedSensors);
  const sensorAlerts = generateSensorAlerts(enrichedSensors);
  const alerts = useMemo(() => {
    const districtAlerts = getAlertsForDistricts(districtNames);
    const mergedSensorAlerts: AlertItem[] = sensorAlerts.map(sa => ({
      id: sa.id,
      time: sa.timestamp,
      location: sa.device,
      parameter: 'Sensor',
      value: sa.message,
      severity: sa.severity,
      status: 'OPEN',
    }));
    return [...districtAlerts, ...mergedSensorAlerts];
  }, [districtNames, sensorAlerts]);
  const contamination = useMemo(() => getContaminationDataForDistricts(filteredDistricts), [filteredDistricts]);
  const filterHealth = getFilterHealth();

  const phRisk = classifyPH(reading.ph);
  const tdsRisk = classifyTDS(reading.tds);
  const turbRisk = classifyTurbidity(reading.turbidity);
  const tempRisk = classifyTemperature(reading.temperature);

  // Run ML prediction
  useEffect(() => {
    let active = true;
    setMlLoading(true);
    predictWaterQuality({
      ph: reading.ph,
      tds: reading.tds,
      turbidity: reading.turbidity,
      temperature: reading.temperature,
    }).then(pred => {
      if (active) { setMlPrediction(pred); setMlLoading(false); }
    });
    return () => { active = false; };
  }, [reading.ph, reading.tds, reading.turbidity, reading.temperature]);

  // Gauge zone configs
  const phZones = useMemo(() => {
    const t = THRESHOLDS.ph;
    const range = 14;
    return [
      { risk: 'critical' as RiskLevel, fraction: t.high.min / range },
      { risk: 'high' as RiskLevel, fraction: (t.elevated.min - t.high.min) / range },
      { risk: 'elevated' as RiskLevel, fraction: (t.safe.min - t.elevated.min) / range },
      { risk: 'safe' as RiskLevel, fraction: (t.safe.max - t.safe.min) / range },
      { risk: 'elevated' as RiskLevel, fraction: (t.elevated.max - t.safe.max) / range },
      { risk: 'high' as RiskLevel, fraction: (t.high.max - t.elevated.max) / range },
      { risk: 'critical' as RiskLevel, fraction: (range - t.high.max) / range },
    ].filter(z => z.fraction > 0);
  }, []);

  const tdsZones = useMemo(() => {
    const max = 2000;
    const t = THRESHOLDS.tds;
    return [
      { risk: 'safe' as RiskLevel, fraction: t.safe / max },
      { risk: 'elevated' as RiskLevel, fraction: (t.elevated - t.safe) / max },
      { risk: 'high' as RiskLevel, fraction: (t.high - t.elevated) / max },
      { risk: 'critical' as RiskLevel, fraction: (max - t.high) / max },
    ];
  }, []);

  const turbZones = useMemo(() => {
    const max = 30;
    const t = THRESHOLDS.turbidity;
    return [
      { risk: 'safe' as RiskLevel, fraction: t.safe / max },
      { risk: 'elevated' as RiskLevel, fraction: (t.elevated - t.safe) / max },
      { risk: 'high' as RiskLevel, fraction: (t.high - t.elevated) / max },
      { risk: 'critical' as RiskLevel, fraction: (max - t.high) / max },
    ];
  }, []);

  const tempZones = useMemo(() => {
    const min = 0, max = 50;
    const t = THRESHOLDS.temperature;
    return [
      { risk: 'critical' as RiskLevel, fraction: (t.high.min - min) / (max - min) },
      { risk: 'high' as RiskLevel, fraction: (t.elevated.min - t.high.min) / (max - min) },
      { risk: 'elevated' as RiskLevel, fraction: (t.safe.min - t.elevated.min) / (max - min) },
      { risk: 'safe' as RiskLevel, fraction: (t.safe.max - t.safe.min) / (max - min) },
      { risk: 'elevated' as RiskLevel, fraction: (t.elevated.max - t.safe.max) / (max - min) },
      { risk: 'high' as RiskLevel, fraction: (t.high.max - t.elevated.max) / (max - min) },
      { risk: 'critical' as RiskLevel, fraction: (max - t.high.max) / (max - min) },
    ].filter(z => z.fraction > 0);
  }, []);

  const scoreZones = [
    { risk: 'critical' as RiskLevel, fraction: 0.3 },
    { risk: 'high' as RiskLevel, fraction: 0.2 },
    { risk: 'elevated' as RiskLevel, fraction: 0.2 },
    { risk: 'safe' as RiskLevel, fraction: 0.3 },
  ];

  const plan = evaluateTreatment(reading);

  const prev = reading.previousReading;

  function resetFilters() {
    setFilters({ district: 'All Districts', block: 'All Blocks', waterSource: 'All Sources', contaminant: 'Overall', timeRange: 'Last 24 Hours' });
    setSelectedDistrict(undefined);
    setSelectedContaminant(undefined);
  }

  const mlRiskColor: Record<string, 'green' | 'yellow' | 'orange' | 'red' | 'gray'> = {
    LOW: 'green', MODERATE: 'yellow', HIGH: 'orange', CRITICAL: 'red',
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-3">
        <div className="flex flex-wrap items-end gap-3">
          <Select label="District" value={filters.district} options={['All Districts', ...getDistrictNames()]} onChange={(v) => { setFilters({ ...filters, district: v }); setSelectedDistrict(undefined); }} />
          <Select label="Block" value={filters.block} options={['All Blocks', ...getBlocks()]} onChange={(v) => setFilters({ ...filters, block: v })} />
          <Select label="Water Source" value={filters.waterSource} options={['All Sources', ...getWaterSources()]} onChange={(v) => setFilters({ ...filters, waterSource: v })} />
          <Select label="Contaminant" value={filters.contaminant} options={['Overall Water Quality', ...CONTAMINANTS]} onChange={(v) => setFilters({ ...filters, contaminant: v })} />
          <Select label="Time Range" value={filters.timeRange} options={TIME_RANGES} onChange={(v) => setFilters({ ...filters, timeRange: v })} />
          <button onClick={resetFilters} className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <div className="ml-auto flex items-center gap-2">
            <Badge color="gray">DEMO DATA</Badge>
            <span className="text-xs text-slate-400 hidden sm:inline">Source: {dataSource}</span>
          </div>
        </div>
      </div>

      {/* Section 1: Live Water Parameters — 5 gauges in one row */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-3.5 h-3.5 text-blue-600" />
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Live Water Parameters</h3>
          <span className="text-xs text-slate-400 ml-1">{reading.district} — {reading.waterSource}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          <GaugeCard
            name="pH" value={reading.ph} unit="pH" risk={phRisk} statusLabel={riskToLabel(phRisk)}
            min={0} max={14} previousValue={prev?.ph} zones={phZones}
            icon={<FlaskConical className="w-4 h-4 text-blue-500" />}
          />
          <GaugeCard
            name="TDS" value={reading.tds} unit="mg/L" risk={tdsRisk} statusLabel={riskToLabel(tdsRisk)}
            min={0} max={2000} previousValue={prev?.tds} zones={tdsZones}
            icon={<Droplets className="w-4 h-4 text-blue-500" />}
          />
          <GaugeCard
            name="Turbidity" value={reading.turbidity} unit="NTU" risk={turbRisk} statusLabel={riskToLabel(turbRisk)}
            min={0} max={30} previousValue={prev?.turbidity} zones={turbZones}
            icon={<Waves className="w-4 h-4 text-blue-500" />}
          />
          <GaugeCard
            name="Temperature" value={reading.temperature} unit="°C" risk={tempRisk} statusLabel={riskToLabel(tempRisk)}
            min={0} max={50} previousValue={prev?.temperature} zones={tempZones}
            icon={<Thermometer className="w-4 h-4 text-blue-500" />}
          />
          <GaugeCard
            name="Overall Water Quality" value={reading.waterQualityScore} unit="/ 100" risk={reading.riskLevel} statusLabel="Moderate Risk"
            min={0} max={100} zones={scoreZones}
            icon={<Gauge className="w-4 h-4 text-blue-500" />}
          />
        </div>
      </div>

      {/* Section 2 & 3: Map (65%) + Affected/Improved Areas (35%) */}
      <div className="grid grid-cols-1 xl:grid-cols-[65%_35%] gap-4">
        <Card
          title="Jharkhand Water Contamination Intelligence"
          subtitle="District-level monitoring — click a district for details"
          right={
            <div className="flex flex-wrap gap-1">
              {CONTAMINANTS.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedContaminant(c)}
                  className={`px-2 py-1 text-xs font-medium rounded-md ${
                    (selectedContaminant ?? 'Overall') === c ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          }
          bodyClassName="p-3"
        >
          <WaterQualityMap
            districts={filteredDistricts}
            contaminant={selectedContaminant ?? 'Overall'}
            onSelect={(d) => setSelectedDistrict(d.district)}
            selected={selectedDistrict}
          />
        </Card>

        <div className="space-y-4">
          <Card title="Most Affected Areas" subtitle="Highest risk districts" right={<AlertTriangle className="w-4 h-4 text-orange-500" />}>
            <MostAffectedAreas districts={filteredDistricts} />
          </Card>
          <Card title="Most Improved Areas" subtitle="Trending better over time">
            <MostImprovedAreas districts={filteredDistricts} />
          </Card>
        </div>
      </div>

      {/* Section 4 & 5: Trend (50%) + Donut (50%) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card
          title="Real-Time Water Quality Trends"
          subtitle={`Source: ${dataSource}`}
          right={
            <div className="flex gap-1">
              {(['ph', 'tds', 'turbidity', 'temperature'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setTrendParam(p)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize ${
                    trendParam === p ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          }
        >
          <div className="flex items-baseline gap-4 mb-3">
            <div>
              <span className="text-xs text-slate-400">Current</span>
              <span className="ml-1.5 text-lg font-bold text-slate-800">{trends[trends.length - 1]?.[trendParam] ?? '—'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400">Previous</span>
              <span className="ml-1.5 text-sm font-semibold text-slate-600">{trends[trends.length - 2]?.[trendParam] ?? '—'}</span>
            </div>
            {trends.length >= 2 && (
              <div>
                {(() => {
                  const cur = trends[trends.length - 1]?.[trendParam] ?? 0;
                  const prv = trends[trends.length - 2]?.[trendParam] ?? 0;
                  if (prv === 0) return null;
                  const pct = ((cur - prv) / prv) * 100;
                  return (
                    <span className={`text-xs font-semibold ${pct < 0 ? 'text-green-600' : pct > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                      {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
                    </span>
                  );
                })()}
              </div>
            )}
          </div>
          <WaterTrendChart data={trends} params={[trendParam]} height={240} />
        </Card>

        <Card title="Contamination Distribution" subtitle="Click a segment to filter">
          {contamination.length > 0 ? (
            <ContaminationDonut data={contamination} onSelect={setSelectedContaminant} selected={selectedContaminant} />
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <p className="text-sm">No Data Available</p>
              <p className="text-xs mt-1">No contamination data for current filter.</p>
            </div>
          )}
        </Card>
      </div>

      {/* Section 6: Full-width Purification Pipeline */}
      <Card title="Smart Purification Pipeline" subtitle="Dynamic stage-by-stage treatment status" right={<Badge color="blue">RULE-BASED</Badge>}>
        <PurificationPipeline stages={plan.stages} />
        {plan.reasons.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
            {plan.reasons.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                <Brain className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                <span>{r}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Section 7 & 8: Treatment (50%) + ML Prediction (50%) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Treatment Effectiveness" subtitle="Before vs after treatment verification">
          <TreatmentComparison reading={reading} />
        </Card>

        <Card
          title="AI Water Quality Analysis"
          subtitle="ML-based risk prediction"
          right={mlPrediction?.isDemo ? <Badge color="yellow">DEMO PREDICTION</Badge> : <Badge color="blue">ML CONNECTED</Badge>}
        >
          {mlLoading ? (
            <div className="flex items-center justify-center h-48 text-slate-400">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 animate-pulse" />
                <span>Running prediction...</span>
              </div>
            </div>
          ) : mlPrediction ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <p className="text-xs text-slate-400 mb-1">Risk Level</p>
                  <p className="text-xl font-bold text-slate-800">{mlPrediction.riskLevel}</p>
                  <div className="mt-1.5">
                    <Badge color={mlRiskColor[mlPrediction.riskLevel] ?? 'gray'}>{mlPrediction.riskLevel}</Badge>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <p className="text-xs text-slate-400 mb-1">Predicted Issue</p>
                  <p className="text-xl font-bold text-slate-800">{mlPrediction.predictedContaminant}</p>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-blue-700">Model Confidence</span>
                  <span className="text-base font-bold text-blue-700">{mlPrediction.confidence}%</span>
                </div>
                <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all duration-700" style={{ width: `${mlPrediction.confidence}%` }} />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Live Sensor Inputs</p>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center bg-slate-50 rounded-lg p-2 border border-slate-100">
                    <p className="text-[10px] text-slate-400">pH</p>
                    <p className="text-sm font-semibold text-slate-700">{mlPrediction.inputs.ph}</p>
                  </div>
                  <div className="text-center bg-slate-50 rounded-lg p-2 border border-slate-100">
                    <p className="text-[10px] text-slate-400">TDS</p>
                    <p className="text-sm font-semibold text-slate-700">{mlPrediction.inputs.tds}</p>
                  </div>
                  <div className="text-center bg-slate-50 rounded-lg p-2 border border-slate-100">
                    <p className="text-[10px] text-slate-400">Turb</p>
                    <p className="text-sm font-semibold text-slate-700">{mlPrediction.inputs.turbidity}</p>
                  </div>
                  <div className="text-center bg-slate-50 rounded-lg p-2 border border-slate-100">
                    <p className="text-[10px] text-slate-400">Temp</p>
                    <p className="text-sm font-semibold text-slate-700">{mlPrediction.inputs.temperature}°</p>
                  </div>
                </div>
              </div>

              {mlPrediction.isDemo && (
                <div className="flex items-start gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-yellow-700">
                    Demo prediction using rule-based logic. Connect a Python/FastAPI ML model via mlService.ts for real predictions.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Cpu className="w-6 h-6 mb-2 opacity-40" />
              <p className="text-sm">ML MODEL NOT CONNECTED</p>
            </div>
          )}
        </Card>
      </div>

      {/* Section 9: Bottom 3-column monitoring */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Water Safety Alerts" subtitle={`${alerts.filter(a => a.status === 'OPEN').length} open alerts`}>
          <AlertPanel alerts={alerts.slice(0, 8)} compact showFilters={false} />
        </Card>
        <Card title="Filter Health" subtitle="Purification component life">
          <FilterHealth items={filterHealth} compact />
        </Card>
        <Card title="Sensor & System Health" subtitle={`${sensorSummary.online}/${sensorSummary.total} online · ${sensorSummary.warning} warning · ${sensorSummary.offline} offline`}>
          <SensorHealthPanel compact />
        </Card>
      </div>
    </div>
  );
}
