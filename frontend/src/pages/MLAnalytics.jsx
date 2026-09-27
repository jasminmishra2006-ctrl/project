import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Badge } from '@/components/common/Card';
import { Select } from '@/components/filters/Select';
import { predictWaterQuality } from '@/services/mlService';
import { getLatestSensorReading, getDataSource } from '@/services/waterDataService';
import { getHistoricalSampleCount, getHistoricalTrends, getHistoryCities } from '@/services/historyDataService';
import { WaterTrendChart } from '@/components/charts/WaterTrendChart';
import { Brain, RefreshCw, Cpu, Zap } from 'lucide-react';

const HISTORY_CITIES = getHistoryCities();
const HISTORY_CITY_OPTIONS = ['All Cities', ...HISTORY_CITIES];

export function MLAnalytics() {
  const reading = getLatestSensorReading();
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [historyCity, setHistoryCity] = useState('All Cities');
  const historyTrends = useMemo(() => getHistoricalTrends(historyCity), [historyCity]);
  const historySampleCount = getHistoricalSampleCount(historyCity);
  const predict = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await predictWaterQuality(reading, getDataSource());
      setPrediction(result);
    } catch (err) {
      setPrediction(null);
      setError(err.message || 'Prediction unavailable.');
    } finally {
      setLoading(false);
    }
  }, [reading]);
  useEffect(() => { predict(); }, [predict]);
  return (<div className="space-y-5">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Brain className="w-5 h-5 text-blue-600" />
        <h3 className="text-sm font-semibold text-slate-700">Water Quality Model Analysis</h3>
      </div>
      <button onClick={predict} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50">
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Run Prediction
      </button>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <Card title="Random Forest Prediction" subtitle={`Latest dashboard reading · ${getDataSource()}`} right={prediction ? <Badge color="green">MODEL LOADED</Badge> : <Badge color="gray">PREDICTION STATUS</Badge>}>
        {loading ? <div className="flex items-center justify-center h-48 text-slate-400"><div className="flex items-center gap-2"><Cpu className="w-5 h-5 animate-pulse" /><span>Requesting model prediction...</span></div></div>
          : prediction ? <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Prediction class</p>
                <p className="text-2xl font-bold text-slate-800">{String(prediction.prediction)}</p>
                <p className="text-xs text-slate-500">Raw model label</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Confidence</p>
                <p className="text-2xl font-bold text-slate-800">{prediction.confidencePercent.toFixed(1)}%</p>
                <p className="text-xs text-slate-500">Probability for predicted class</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">Input source: {prediction.sourceLabel}</p>
            <div className="flex flex-wrap gap-2">{Object.entries(prediction.probability).map(([label, probability]) => <Badge key={label} color="gray">Class {label}: {(probability * 100).toFixed(1)}%</Badge>)}</div>
            {prediction.features_missing.length > 0 && <p className="rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-700">Unavailable in this reading: {prediction.features_missing.join(', ')}. The trained pipeline handles missing features with its fitted imputer.</p>}
            <div>
              <div className="flex items-center gap-1.5 mb-2"><Zap className="w-3.5 h-3.5 text-slate-400" /><p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Model input features</p></div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{Object.entries(prediction.inputs).map(([feature, value]) => <div key={feature} className="bg-slate-50 rounded-lg p-2 border border-slate-100"><p className="text-[10px] text-slate-500">{feature}</p><p className="text-sm font-semibold text-slate-700">{value ?? 'Unavailable'}</p></div>)}</div>
            </div>
          </div>
            : <div className="flex flex-col items-center justify-center h-48 text-slate-500"><Cpu className="w-6 h-6 mb-2 opacity-50" /><p className="text-sm font-semibold">Prediction unavailable</p><p className="mt-1 max-w-md text-center text-xs">{error}</p></div>}
      </Card>

      <Card
        title="CSV Reference History"
        subtitle={historyCity === 'All Cities'
          ? `Chhattisgarh daily mean across sampled cities · ${historySampleCount} samples · Aug–Sep 2024`
          : `${historyCity}, Chhattisgarh · ${historySampleCount} dated samples · Aug–Sep 2024`}
        right={<div className="min-w-[160px]"><Select label="Sample area" value={historyCity} options={HISTORY_CITY_OPTIONS} onChange={setHistoryCity} /></div>}
      >
        {historyTrends.length > 0 ? <>
          <WaterTrendChart data={historyTrends} params={['ph', 'tds']} height={180} />
          <div className="mt-4"><WaterTrendChart data={historyTrends} params={['turbidity', 'temperature']} height={180} /></div>
        </> : <div className="flex h-48 items-center justify-center text-sm text-slate-500">No historical samples are available for this area.</div>}
      </Card>
    </div>
  </div>);
}
