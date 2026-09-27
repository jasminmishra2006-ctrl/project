import { useState, useEffect } from 'react';
import { Card, Badge } from '@/components/ui/Card';
import { predictWaterQuality } from '@/services/mlService';
import { getLatestSensorReading, getTrends, getDataSource } from '@/services/waterDataService';
import { WaterTrendChart } from '@/components/WaterTrendChart';
import type { MLPrediction } from '@/types';
import { Brain, RefreshCw, Cpu, Zap } from 'lucide-react';

const RISK_COLORS: Record<string, 'green' | 'yellow' | 'orange' | 'red' | 'gray'> = {
  LOW: 'green',
  MODERATE: 'yellow',
  HIGH: 'orange',
  CRITICAL: 'red',
};

export function MLAnalytics() {
  const reading = getLatestSensorReading();
  const [prediction, setPrediction] = useState<MLPrediction | null>(null);
  const [loading, setLoading] = useState(true);

  async function predict() {
    setLoading(true);
    const result = await predictWaterQuality({
      ph: reading.ph,
      tds: reading.tds,
      turbidity: reading.turbidity,
      temperature: reading.temperature,
    });
    setPrediction(result);
    setLoading(false);
  }

  useEffect(() => { predict(); }, []);

  const trends = getTrends('24h');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-semibold text-slate-700">AI Water Quality Analysis</h3>
        </div>
        <button onClick={predict} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Re-run Prediction
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card title="ML Prediction Results" right={prediction?.isDemo ? <Badge color="yellow">DEMO PREDICTION</Badge> : <Badge color="blue">ML CONNECTED</Badge>}>
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 animate-pulse" />
                <span>Running prediction...</span>
              </div>
            </div>
          ) : prediction ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <p className="text-xs text-slate-400 mb-1">Risk Level</p>
                  <p className="text-xl font-bold text-slate-800">{prediction.riskLevel}</p>
                  <div className="mt-2">
                    <Badge color={RISK_COLORS[prediction.riskLevel] ?? 'gray'}>{prediction.riskLevel}</Badge>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <p className="text-xs text-slate-400 mb-1">Predicted Contaminant</p>
                  <p className="text-xl font-bold text-slate-800">{prediction.predictedContaminant}</p>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-blue-700">Model Confidence</span>
                  <span className="text-lg font-bold text-blue-700">{prediction.confidence}%</span>
                </div>
                <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all duration-700" style={{ width: `${prediction.confidence}%` }} />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Input Parameters</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="text-center bg-slate-50 rounded-lg p-2 border border-slate-100">
                    <p className="text-xs text-slate-400">pH</p>
                    <p className="font-semibold text-slate-700">{prediction.inputs.ph}</p>
                  </div>
                  <div className="text-center bg-slate-50 rounded-lg p-2 border border-slate-100">
                    <p className="text-xs text-slate-400">TDS</p>
                    <p className="font-semibold text-slate-700">{prediction.inputs.tds}</p>
                  </div>
                  <div className="text-center bg-slate-50 rounded-lg p-2 border border-slate-100">
                    <p className="text-xs text-slate-400">Turbidity</p>
                    <p className="font-semibold text-slate-700">{prediction.inputs.turbidity}</p>
                  </div>
                  <div className="text-center bg-slate-50 rounded-lg p-2 border border-slate-100">
                    <p className="text-xs text-slate-400">Temp</p>
                    <p className="font-semibold text-slate-700">{prediction.inputs.temperature}°C</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 px-3 py-2.5 bg-yellow-50 border border-yellow-200 rounded-lg">
                <Zap className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-700">
                  This is a DEMO prediction using rule-based logic. Connect a Python/FastAPI ML model via <code className="text-xs bg-yellow-100 px-1 rounded">mlService.ts</code> to enable real predictions.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">No prediction available.</p>
          )}
        </Card>

        <Card title="Parameter Trends (24h)" subtitle={`Source: ${getDataSource()}`}>
          <WaterTrendChart data={trends} params={['ph', 'tds']} height={180} />
          <div className="mt-4">
            <WaterTrendChart data={trends} params={['turbidity', 'temperature']} height={180} />
          </div>
        </Card>
      </div>
    </div>
  );
}
