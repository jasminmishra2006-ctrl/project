import { getEnrichedSensors, getHealthSummary } from '@/services/sensorHealthService';
import { SensorStatusCard } from './SensorStatusCard';
import { CheckCircle, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';

interface SensorHealthPanelProps {
  compact?: boolean;
}

export function SensorHealthPanel({ compact = false }: SensorHealthPanelProps) {
  const sensors = getEnrichedSensors();
  const summary = getHealthSummary(sensors.map(s => ({ ...s, health: s.health })));

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">
            {summary.online}/{summary.total} Online
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle className="w-3.5 h-3.5" />
            {summary.online} Healthy
          </span>
          {summary.warning > 0 && (
            <span className="flex items-center gap-1 text-yellow-600">
              <AlertTriangle className="w-3.5 h-3.5" />
              {summary.warning} Warning
            </span>
          )}
          {summary.offline > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <XCircle className="w-3.5 h-3.5" />
              {summary.offline} Offline
            </span>
          )}
          {summary.error > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <AlertTriangle className="w-3.5 h-3.5" />
              {summary.error} Error
            </span>
          )}
          {summary.noData > 0 && (
            <span className="flex items-center gap-1 text-slate-400">
              <HelpCircle className="w-3.5 h-3.5" />
              {summary.noData} No Data
            </span>
          )}
        </div>
      </div>

      {/* Sensor cards */}
      <div className={compact ? "space-y-2" : "grid grid-cols-1 sm:grid-cols-2 gap-2.5"}>
        {sensors.map((sensor) => (
          <SensorStatusCard key={sensor.name} sensor={sensor} compact={compact} />
        ))}
      </div>
    </div>
  );
}
