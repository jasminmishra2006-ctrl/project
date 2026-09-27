import { Card } from '@/components/ui/Card';
import { SensorHealthPanel } from '@/components/SensorHealthPanel';
import { getDataSource, getLastUpdated } from '@/services/waterDataService';
import { getEnrichedSensors, getHealthSummary, getEsp32State, getApiState, getDatabaseState } from '@/services/sensorHealthService';
import { Cpu, Wifi, Cloud, Database, Activity, Server } from 'lucide-react';

export function SystemHealth() {
  const sensors = getEnrichedSensors();
  const summary = getHealthSummary(sensors);
  const esp32State = getEsp32State();
  const apiState = getApiState();
  const dbState = getDatabaseState();
  const esp32 = sensors.find(s => s.type === 'controller');

  const summaryCards = [
    {
      label: 'ESP32 Controller',
      value: esp32State === 'live' ? 'Live' : esp32State === 'connecting' ? 'Connecting' : esp32State === 'error' ? 'Error' : 'Offline',
      color: esp32State === 'live' ? 'text-green-600' : 'text-red-600',
      bg: esp32State === 'live' ? 'bg-green-50' : 'bg-red-50',
      icon: Cpu,
      detail: esp32?.heartbeatSecondsAgo !== undefined ? `Heartbeat: ${esp32.heartbeatSecondsAgo}s ago` : 'Not Available',
    },
    {
      label: 'Network',
      value: sensors.find(s => s.type === 'network')?.online ? 'Connected' : 'Disconnected',
      color: sensors.find(s => s.type === 'network')?.online ? 'text-green-600' : 'text-red-600',
      bg: sensors.find(s => s.type === 'network')?.online ? 'bg-green-50' : 'bg-red-50',
      icon: Wifi,
      detail: esp32?.wifiConnected ? `Signal: ${esp32.signalStrength ?? '—'} dBm` : 'WiFi Down',
    },
    {
      label: 'Cloud API',
      value: apiState === 'online' ? 'Connected' : apiState === 'error' ? 'Error' : 'Disconnected',
      color: apiState === 'online' ? 'text-green-600' : 'text-red-600',
      bg: apiState === 'online' ? 'bg-green-50' : 'bg-red-50',
      icon: Cloud,
      detail: apiState === 'online' ? 'Responding' : 'No response',
    },
    {
      label: 'Database',
      value: dbState === 'connected' ? 'Connected' : 'Disconnected',
      color: dbState === 'connected' ? 'text-green-600' : 'text-red-600',
      bg: dbState === 'connected' ? 'bg-green-50' : 'bg-red-50',
      icon: Database,
      detail: dbState === 'connected' ? 'Operational' : 'Unavailable',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">{card.label}</p>
                  <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{card.detail}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall health summary */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-bold text-slate-700">System Health Summary</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="font-bold text-slate-800">{summary.online}/{summary.total} Online</span>
            <span className="text-green-600">{summary.online} Healthy</span>
            {summary.warning > 0 && <span className="text-yellow-600">{summary.warning} Warning</span>}
            {summary.offline > 0 && <span className="text-red-600">{summary.offline} Offline</span>}
            {summary.error > 0 && <span className="text-red-600">{summary.error} Error</span>}
          </div>
        </div>
      </div>

      {/* Full sensor panel */}
      <Card title="Sensor & System Health" subtitle={`Source: ${getDataSource()} — Last updated: ${getLastUpdated()}`}>
        <SensorHealthPanel />
      </Card>

      {/* System information */}
      <Card title="System Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <p className="text-xs text-slate-400 mb-1">Microcontroller</p>
            <p className="font-semibold text-slate-700">ESP32-WROOM-32</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <p className="text-xs text-slate-400 mb-1">pH Sensor</p>
            <p className="font-semibold text-slate-700">E-201-C (Analog)</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <p className="text-xs text-slate-400 mb-1">TDS Sensor</p>
            <p className="font-semibold text-slate-700">Gravity Analog TDS</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <p className="text-xs text-slate-400 mb-1">Turbidity Sensor</p>
            <p className="font-semibold text-slate-700">TSW-30</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <p className="text-xs text-slate-400 mb-1">Temperature Sensor</p>
            <p className="font-semibold text-slate-700">DS18B20 (Digital)</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <p className="text-xs text-slate-400 mb-1">Data Protocol</p>
            <p className="font-semibold text-slate-700">MQTT / REST API</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
