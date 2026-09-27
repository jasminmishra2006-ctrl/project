import { useState, useMemo, useEffect } from 'react';
import { Droplets, Thermometer, FlaskConical, Activity, Gauge, RotateCcw, Waves, Brain, AlertTriangle, Cpu, Zap } from 'lucide-react';
import { Card, Badge } from '@/components/common/Card';
import { Select } from '@/components/filters/Select';
import { GaugeCard } from '@/components/metric-cards/GaugeCard';
import { WaterQualityMap } from '@/components/map/WaterQualityMap';
import { DashboardErrorBoundary } from '@/components/dashboard/DashboardErrorBoundary';
import { MostAffectedAreas } from '@/components/dashboard/MostAffectedAreas';
import { MostImprovedAreas } from '@/components/dashboard/MostImprovedAreas';
import { ContaminationDonut } from '@/components/charts/ContaminationDonut';
import { PurificationPipeline } from '@/components/dashboard/PurificationPipeline';
import { FilterHealth } from '@/components/dashboard/FilterHealth';
import { AlertPanel } from '@/components/dashboard/AlertPanel';
import { SensorHealthPanel } from '@/components/dashboard/SensorHealthPanel';
import { getDistrictNames, getBlocks, getWaterSources, getFilterHealth, getDataSource, classifyPH, classifyTDS, classifyTurbidity, classifyTemperature, riskToLabel, getAlertsForDistricts, getContaminationDataForDistricts, getWaterReadings } from '@/services/waterDataService';
import { getEnrichedSensors, generateSensorAlerts, getHealthSummary } from '@/services/sensorHealthService';
import { evaluateTreatment } from '@/services/decisionEngine';
import { predictWaterQuality } from '@/services/mlService';
import { THRESHOLDS } from '@/services/thresholds';
import { EmptyState } from '@/components/common/EmptyState';
const CONTAMINANTS = ['Overall', 'Iron', 'Arsenic', 'Fluoride', 'Calcium', 'Phosphorus', 'TDS', 'pH', 'Turbidity'];
const RISK_PRIORITY = { safe: 0, nodata: 0, elevated: 1, high: 2, critical: 3 };

function averageFor(rows, key) {
    const values = rows.map((row) => row[key]).filter((value) => value !== null && value !== undefined && value !== '').map(Number).filter(Number.isFinite);
    return values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : null;
}

function areaRisk(rows) {
    return rows.map((row) => row.riskLevel).filter(Boolean).sort((a, b) => (RISK_PRIORITY[b] ?? 0) - (RISK_PRIORITY[a] ?? 0))[0] ?? 'nodata';
}
export function Dashboard() {
    const [filters, setFilters] = useState({
        district: 'All Districts',
        block: 'All Blocks',
        waterSource: 'All Sources',
    });
    const [selectedDistrict, setSelectedDistrict] = useState();
    const [trendParam, setTrendParam] = useState('ph');
    const [selectedContaminant, setSelectedContaminant] = useState();
    const [mlPrediction, setMlPrediction] = useState(null);
    const [mlLoading, setMlLoading] = useState(true);
    const [mlError, setMlError] = useState('');
    const dataSource = getDataSource();
    const filteredDistricts = useMemo(() => getWaterReadings(filters), [filters]);
    const districtNames = useMemo(() => filteredDistricts.map(d => d.district), [filteredDistricts]);
    const selectedArea = filteredDistricts.find((district) => district.district === selectedDistrict);
    const overview = useMemo(() => ({
        district: 'Network-wide aggregate',
        waterSource: `${filteredDistricts.length} district${filteredDistricts.length === 1 ? '' : 's'}`,
        ph: averageFor(filteredDistricts, 'ph'),
        tds: averageFor(filteredDistricts, 'tds'),
        turbidity: averageFor(filteredDistricts, 'turbidity'),
        temperature: averageFor(filteredDistricts, 'temperature'),
        riskLevel: areaRisk(filteredDistricts),
        waterQualityScore: null,
    }), [filteredDistricts]);
    const reading = selectedArea ?? overview;
    const updatedLabel = selectedArea
        ? (selectedArea.lastUpdated ? `Updated at ${selectedArea.lastUpdated}` : 'Update time unavailable')
        : `Aggregate of ${filteredDistricts.length} district records`;
    // Trend data has no district key and cannot be attributed to a selected area.
    const trends = [];
    const enrichedSensors = getEnrichedSensors();
    const sensorSummary = getHealthSummary(enrichedSensors);
    const sensorAlerts = generateSensorAlerts(enrichedSensors);
    const alerts = useMemo(() => {
        const districtAlerts = districtNames.length ? getAlertsForDistricts(districtNames) : [];
        const mergedSensorAlerts = sensorAlerts.map(sa => ({
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
    const contamination = useMemo(() => filteredDistricts.length ? getContaminationDataForDistricts(filteredDistricts) : [], [filteredDistricts]);
    const filterHealth = getFilterHealth();
    const phRisk = reading.ph == null ? 'nodata' : classifyPH(reading.ph);
    const tdsRisk = reading.tds == null ? 'nodata' : classifyTDS(reading.tds);
    const turbRisk = reading.turbidity == null ? 'nodata' : classifyTurbidity(reading.turbidity);
    const tempRisk = reading.temperature == null ? 'nodata' : classifyTemperature(reading.temperature);
    // Run ML prediction
    useEffect(() => {
        let active = true;
        setMlLoading(true);
        setMlError('');
        predictWaterQuality(reading, dataSource).then(pred => {
            if (active) setMlPrediction(pred);
        }).catch(error => {
            if (active) {
                setMlPrediction(null);
                setMlError(error.message || 'Prediction unavailable.');
            }
        }).finally(() => {
            if (active) setMlLoading(false);
        });
        return () => { active = false; };
    }, [reading, dataSource]);
    // Gauge zone configs
    const phZones = useMemo(() => {
        const t = THRESHOLDS.ph;
        const range = 14;
        return [
            { risk: 'critical', fraction: t.high.min / range },
            { risk: 'high', fraction: (t.elevated.min - t.high.min) / range },
            { risk: 'elevated', fraction: (t.safe.min - t.elevated.min) / range },
            { risk: 'safe', fraction: (t.safe.max - t.safe.min) / range },
            { risk: 'elevated', fraction: (t.elevated.max - t.safe.max) / range },
            { risk: 'high', fraction: (t.high.max - t.elevated.max) / range },
            { risk: 'critical', fraction: (range - t.high.max) / range },
        ].filter(z => z.fraction > 0);
    }, []);
    const tdsZones = useMemo(() => {
        const max = 2000;
        const t = THRESHOLDS.tds;
        return [
            { risk: 'safe', fraction: t.safe / max },
            { risk: 'elevated', fraction: (t.elevated - t.safe) / max },
            { risk: 'high', fraction: (t.high - t.elevated) / max },
            { risk: 'critical', fraction: (max - t.high) / max },
        ];
    }, []);
    const turbZones = useMemo(() => {
        const max = 30;
        const t = THRESHOLDS.turbidity;
        return [
            { risk: 'safe', fraction: t.safe / max },
            { risk: 'elevated', fraction: (t.elevated - t.safe) / max },
            { risk: 'high', fraction: (t.high - t.elevated) / max },
            { risk: 'critical', fraction: (max - t.high) / max },
        ];
    }, []);
    const tempZones = useMemo(() => {
        const min = 0, max = 50;
        const t = THRESHOLDS.temperature;
        return [
            { risk: 'critical', fraction: (t.high.min - min) / (max - min) },
            { risk: 'high', fraction: (t.elevated.min - t.high.min) / (max - min) },
            { risk: 'elevated', fraction: (t.safe.min - t.elevated.min) / (max - min) },
            { risk: 'safe', fraction: (t.safe.max - t.safe.min) / (max - min) },
            { risk: 'elevated', fraction: (t.elevated.max - t.safe.max) / (max - min) },
            { risk: 'high', fraction: (t.high.max - t.elevated.max) / (max - min) },
            { risk: 'critical', fraction: (max - t.high.max) / (max - min) },
        ].filter(z => z.fraction > 0);
    }, []);
    const scoreZones = [
        { risk: 'critical', fraction: 0.3 },
        { risk: 'high', fraction: 0.2 },
        { risk: 'elevated', fraction: 0.2 },
        { risk: 'safe', fraction: 0.3 },
    ];
    const plan = evaluateTreatment(reading);
    const riskPriority = RISK_PRIORITY;
    const parameterContributor = [
        { name: 'pH', risk: phRisk }, { name: 'TDS', risk: tdsRisk },
        { name: 'Turbidity', risk: turbRisk }, { name: 'Temperature', risk: tempRisk },
    ].sort((a, b) => (riskPriority[b.risk] ?? 0) - (riskPriority[a.risk] ?? 0))[0];
    const mainContributor = selectedArea?.mainIssue && selectedArea.mainIssue !== 'None' ? selectedArea.mainIssue : parameterContributor?.risk === 'safe' ? 'No elevated parameters' : parameterContributor?.name;
    const recommendation = selectedArea ? (selectedArea.mainIssue && selectedArea.mainIssue !== 'None' ? `Review reported concern: ${selectedArea.mainIssue}.` : 'Continue routine monitoring.') : 'Review the highest-risk districts and verify their latest readings.';
    function resetFilters() {
        setFilters({ district: 'All Districts', block: 'All Blocks', waterSource: 'All Sources' });
        setSelectedDistrict(undefined);
        setSelectedContaminant(undefined);
    }
    return (<div className="dashboard-page space-y-4">
      <div className="dashboard-page-heading">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">Water Quality Monitoring</h1>
          <p className="text-sm text-slate-500">{selectedArea ? selectedArea.district : 'Network-wide overview'} · {dataSource}</p>
        </div>
      </div>
      {/* Filter bar */}
      <div className="dashboard-filter-panel">
        <div className="dashboard-filter-grid">
          <Select label="District" value={filters.district} options={['All Districts', ...getDistrictNames()]} onChange={(v) => { setFilters((current) => ({ ...current, district: v })); setSelectedDistrict(v === 'All Districts' ? undefined : v); }}/>
          <Select label="Block" value={filters.block} options={['All Blocks', ...getBlocks()]} onChange={(v) => { setFilters((current) => ({ ...current, block: v })); setSelectedDistrict(undefined); }}/>
          <Select label="Water Source" value={filters.waterSource} options={['All Sources', ...getWaterSources()]} onChange={(v) => { setFilters((current) => ({ ...current, waterSource: v })); setSelectedDistrict(undefined); }}/>
          <button type="button" onClick={resetFilters} className="flex min-h-10 items-center justify-center gap-1.5 px-3 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
            <RotateCcw className="w-4 h-4"/> Reset
          </button>
        </div>
      </div>

      {/* Section 1: Water Parameters â€” 5 gauges in one row */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-3.5 h-3.5 text-blue-600"/>
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Current Area Water Parameters</h3>
          <span className="text-xs text-slate-400 ml-1">{selectedArea ? `Selected area: ${selectedArea.district} · ${selectedArea.lastUpdated ? `latest record ${selectedArea.lastUpdated}` : 'update time unavailable'}` : `Network-wide average · ${filteredDistricts.length} districts`}</span>
        </div>
        <div className="dashboard-metric-grid">
          <GaugeCard name="pH" value={reading.ph} unit="pH" risk={phRisk} statusLabel={riskToLabel(phRisk)} min={0} max={14} zones={phZones} updatedLabel={updatedLabel} icon={<FlaskConical className="w-4 h-4"/>}/>
          <GaugeCard name="TDS" value={reading.tds} unit="mg/L" risk={tdsRisk} statusLabel={riskToLabel(tdsRisk)} min={0} max={2000} zones={tdsZones} updatedLabel={updatedLabel} icon={<Droplets className="w-4 h-4"/>}/>
          <GaugeCard name="Turbidity" value={reading.turbidity} unit="NTU" risk={turbRisk} statusLabel={riskToLabel(turbRisk)} min={0} max={30} zones={turbZones} updatedLabel={updatedLabel} icon={<Waves className="w-4 h-4"/>}/>
          <GaugeCard name="Temperature" value={reading.temperature} unit="°C" risk={tempRisk} statusLabel={riskToLabel(tempRisk)} min={0} max={50} zones={tempZones} updatedLabel={updatedLabel} icon={<Thermometer className="w-4 h-4"/>}/>
          <GaugeCard name="Overall Water Quality" value={reading.waterQualityScore} unit="/ 100" risk={reading.waterQualityScore == null ? 'nodata' : reading.riskLevel} statusLabel={reading.waterQualityScore == null ? 'Score unavailable' : riskToLabel(reading.riskLevel)} min={0} max={100} zones={scoreZones} updatedLabel={updatedLabel} mainContributor={mainContributor} recommendation={recommendation} areaLabel={selectedArea?.district ?? 'Network-wide average'} onViewDetails={() => document.getElementById('treatment-effectiveness')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} icon={<Gauge className="w-4 h-4"/>}/>
        </div>
      </div>

      {/* Section 2 & 3: Map (65%) + Affected/Improved Areas (35%) */}
      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
        <Card title="Jharkhand Water Contamination Intelligence" subtitle="District-level monitoring â€” click a district for details" right={<div className="flex flex-wrap gap-1">
              {CONTAMINANTS.map((c) => (<button key={c} onClick={() => setSelectedContaminant(c)} className={`px-2 py-1 text-xs font-medium rounded-md ${(selectedContaminant ?? 'Overall') === c ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {c}
                </button>))}
            </div>} bodyClassName="p-3">
          <DashboardErrorBoundary title="Map temporarily unavailable" message="The live metric cards are still working.">
            <WaterQualityMap districts={filteredDistricts} contaminant={selectedContaminant ?? 'Overall'} onSelect={(d) => setSelectedDistrict(d.district)} selected={selectedDistrict}/>
          </DashboardErrorBoundary>
        </Card>

        <div className="space-y-4">
          <Card title="Most Affected Areas" subtitle="Highest risk districts" right={<AlertTriangle className="w-4 h-4 text-orange-500"/>}>
            <MostAffectedAreas districts={filteredDistricts}/>
          </Card>
          <Card title="Most Improved Areas" subtitle="Trending better over time">
            <MostImprovedAreas districts={filteredDistricts}/>
          </Card>
        </div>
      </div>

      {/* Section 4 & 5: Trend (50%) + Donut (50%) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Area Water Quality Trends" subtitle="District-linked history is unavailable in this dataset" right={<div className="flex gap-1">
              {['ph', 'tds', 'turbidity', 'temperature'].map((p) => (<button key={p} onClick={() => setTrendParam(p)} className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize ${trendParam === p ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {p}
                </button>))}
            </div>}>
          <div className="flex items-baseline gap-4 mb-3">
            <div>
              <span className="text-xs text-slate-400">Current</span>
              <span className="ml-1.5 text-lg font-bold text-slate-800">{trends[trends.length - 1]?.[trendParam] ?? 'â€”'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400">Previous</span>
              <span className="ml-1.5 text-sm font-semibold text-slate-600">{trends[trends.length - 2]?.[trendParam] ?? 'â€”'}</span>
            </div>
            {trends.length >= 2 && (<div>
                {(() => {
                const cur = trends[trends.length - 1]?.[trendParam] ?? 0;
                const prv = trends[trends.length - 2]?.[trendParam] ?? 0;
                if (prv === 0)
                    return null;
                const pct = ((cur - prv) / prv) * 100;
                return (<span className={`text-xs font-semibold ${pct < 0 ? 'text-green-600' : pct > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                      {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
                    </span>);
            })()}
              </div>)}
          </div>
          <div className="flex h-60 flex-col items-center justify-center rounded-lg bg-slate-50 text-center text-slate-500"><p className="text-sm font-semibold">Area history unavailable</p><p className="mt-1 max-w-sm text-xs">The available records do not include district-linked historical readings, so no trend is shown for this selection.</p></div>
        </Card>

        <Card title="Contamination Distribution" subtitle="Click a segment to filter">
          {contamination.length > 0 ? (<ContaminationDonut data={contamination} onSelect={setSelectedContaminant} selected={selectedContaminant}/>) : (<div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <p className="text-sm">No Data Available</p>
              <p className="text-xs mt-1">No contamination data for current filter.</p>
            </div>)}
        </Card>
      </div>

      {/* Section 6: Full-width Purification Pipeline */}
      <Card title="Smart Purification Pipeline" subtitle="Dynamic stage-by-stage treatment status" right={<Badge color="blue">RULE-BASED</Badge>}>
        <PurificationPipeline stages={plan.stages}/>
        {plan.reasons.length > 0 && (<div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
            {plan.reasons.map((r, i) => (<div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                <Brain className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0"/>
                <span>{r}</span>
              </div>))}
          </div>)}
      </Card>

      {/* Section 7 & 8: Treatment (50%) + ML Prediction (50%) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card id="treatment-effectiveness" title="Treatment Effectiveness" subtitle="Before vs after treatment verification">
          <div className="flex h-48 flex-col items-center justify-center text-center text-slate-500"><p className="text-sm font-semibold">Treatment verification unavailable</p><p className="mt-1 max-w-sm text-xs">Before and after readings are not available for the selected area records.</p></div>
        </Card>

        <Card title="Water Quality Prediction" subtitle="Random Forest model" right={mlPrediction ? <Badge color="green">RANDOM FOREST</Badge> : <Badge color={mlError ? 'red' : 'gray'}>{mlError ? 'UNAVAILABLE' : 'MODEL STATUS'}</Badge>}>
          {mlLoading ? (<div className="flex items-center justify-center h-48 text-slate-400">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 animate-pulse"/>
                <span>Running prediction...</span>
              </div>
            </div>) : mlPrediction ? (<div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <p className="text-xs text-slate-400 mb-1">Prediction class</p>
                  <p className="text-2xl font-bold text-slate-800">{String(mlPrediction.prediction)}</p>
                  <p className="text-xs text-slate-500">Raw model label</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <p className="text-xs text-slate-400 mb-1">Confidence</p>
                  <p className="text-2xl font-bold text-slate-800">{mlPrediction.confidencePercent.toFixed(1)}%</p>
                  <p className="text-xs text-slate-500">Model probability for class {String(mlPrediction.prediction)}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">Input source: {mlPrediction.sourceLabel}</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(mlPrediction.probability).map(([label, probability]) => <Badge key={label} color="gray">Class {label}: {(probability * 100).toFixed(1)}%</Badge>)}
              </div>
              {mlPrediction.features_missing.length > 0 && <p className="rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-700">Unavailable in this reading: {mlPrediction.features_missing.join(', ')}. The trained pipeline handles missing features with its fitted imputer.</p>}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap className="w-3.5 h-3.5 text-slate-400"/>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Model input features</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(mlPrediction.inputs).map(([feature, inputValue]) => <div key={feature} className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                    <p className="text-[10px] text-slate-500">{feature}</p>
                    <p className="text-sm font-semibold text-slate-700">{inputValue ?? 'Unavailable'}</p>
                  </div>)}
                </div>
              </div>
            </div>) : (<div className="flex flex-col items-center justify-center h-48 text-slate-500">
              <Cpu className="w-6 h-6 mb-2 opacity-50"/>
              <p className="text-sm font-semibold">Prediction unavailable</p>
              <p className="mt-1 max-w-md text-center text-xs">{mlError || 'Configure and start the Python ML service to request a prediction.'}</p>
            </div>)}
        </Card>
      </div>

      {/* Section 9: Bottom 3-column monitoring */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Water Safety Alerts" subtitle={`${alerts.filter(a => a.status === 'OPEN').length} open alerts`}>
          <AlertPanel alerts={alerts.slice(0, 8)} compact showFilters={false}/>
        </Card>
        <Card title="Filter Health" subtitle="Purification component life">
          <FilterHealth items={filterHealth} compact/>
        </Card>
        <Card title="Sensor & System Health" subtitle={`${sensorSummary.online}/${sensorSummary.total} online Â· ${sensorSummary.warning} warning Â· ${sensorSummary.offline} offline`}>
          <SensorHealthPanel compact/>
        </Card>
      </div>
    </div>);
}

