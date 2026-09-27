import { HEALTH_CONFIG, CALIBRATION_CONFIG, MAINTENANCE_CONFIG } from '@/services/sensorHealthService';
import { Cpu, Wifi, Cloud, Database, FlaskConical, Droplets, Waves, Thermometer, AlertCircle, Wrench, Gauge } from 'lucide-react';
const TYPE_ICONS = {
    controller: Cpu,
    sensor: FlaskConical,
    network: Wifi,
    api: Cloud,
    database: Database,
};
const SENSOR_SPECIFIC_ICONS = {
    'pH Sensor (E-201)': FlaskConical,
    'TDS Sensor (Gravity)': Droplets,
    'Turbidity Sensor (TSW-30)': Waves,
    'DS18B20 Temperature': Thermometer,
};
export function SensorStatusCard({ sensor, compact = false }) {
    const cfg = HEALTH_CONFIG[sensor.health];
    const Icon = SENSOR_SPECIFIC_ICONS[sensor.name] ?? TYPE_ICONS[sensor.type] ?? Cpu;
    const calCfg = sensor.calibration ? CALIBRATION_CONFIG[sensor.calibration.status] : null;
    const maintCfg = sensor.maintenance ? MAINTENANCE_CONFIG[sensor.maintenance.status] : null;
    return (<div className={`rounded-lg border ${cfg.borderColor} ${cfg.bgColor} p-3`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 text-slate-500 flex-shrink-0"/>
          <span className="text-sm font-semibold text-slate-700 truncate">{sensor.name}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`w-2 h-2 rounded-full ${cfg.dotColor} ${sensor.health === 'online' ? 'animate-pulse' : ''}`}/>
          <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
        </div>
      </div>

      {/* Value + freshness row (for sensors) */}
      {!compact && (sensor.type === 'sensor' || sensor.type === 'controller') && (<div className="flex items-center justify-between text-xs mb-2">
          <div>
            {sensor.value !== undefined && sensor.readingValid !== false ? (<span className="font-bold text-slate-800">
                {sensor.value} <span className="text-slate-400 font-normal">{sensor.unit}</span>
              </span>) : sensor.health === 'error' ? (<span className="text-red-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3"/> Invalid Reading
              </span>) : (<span className="text-slate-400">—</span>)}
          </div>
          {sensor.secondsSinceLastReading !== undefined && sensor.secondsSinceLastReading > 0 && (<div className="flex items-center gap-1" style={{ color: sensor.freshness.color }}>
              <span className="font-medium">{sensor.freshness.label}</span>
            </div>)}
        </div>)}

      {/* ESP32-specific details */}
      {!compact && sensor.type === 'controller' && (<div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-2">
          <div className="text-slate-500">
            <span className="text-slate-400">Heartbeat:</span>{' '}
            <span className="font-medium text-slate-600">
              {sensor.heartbeatSecondsAgo !== undefined ? `${sensor.heartbeatSecondsAgo}s ago` : 'Not Available'}
            </span>
          </div>
          <div className="text-slate-500">
            <span className="text-slate-400">WiFi:</span>{' '}
            <span className={`font-medium ${sensor.wifiConnected ? 'text-green-600' : 'text-red-600'}`}>
              {sensor.wifiConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="text-slate-500">
            <span className="text-slate-400">Signal:</span>{' '}
            <span className="font-medium text-slate-600">
              {sensor.signalStrength !== undefined ? `${sensor.signalStrength} dBm` : 'Not Available'}
            </span>
          </div>
          <div className="text-slate-500">
            <span className="text-slate-400">Uptime:</span>{' '}
            <span className="font-medium text-slate-600">{sensor.uptime ?? 'Not Available'}</span>
          </div>
          <div className="text-slate-500 col-span-2">
            <span className="text-slate-400">Firmware:</span>{' '}
            <span className="font-medium text-slate-600">{sensor.firmwareVersion ?? 'Not Available'}</span>
          </div>
        </div>)}

      {/* Last data received (non-sensor types) */}
      {!compact && (sensor.type === 'network' || sensor.type === 'api' || sensor.type === 'database') && (<div className="text-xs text-slate-500 mb-2">
          <span className="text-slate-400">Last data:</span>{' '}
          <span className="font-medium text-slate-600">{sensor.lastReading && sensor.lastReading !== '—' ? sensor.lastReading : 'Continuous'}</span>
        </div>)}

      {/* Error message */}
      {!compact && sensor.errorMessage && (<div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 rounded px-2 py-1 mb-2">
          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0"/>
          <span>{sensor.errorMessage}</span>
        </div>)}

      {/* Calibration + maintenance (compact footer) */}
      {!compact && (calCfg || maintCfg) && (<div className="flex items-center gap-3 text-[10px] pt-2 border-t border-slate-200/60">
          {calCfg && (<div className={`flex items-center gap-1 ${calCfg.color}`}>
              <Gauge className="w-2.5 h-2.5"/>
              <span>{calCfg.label}</span>
            </div>)}
          {maintCfg && (<div className={`flex items-center gap-1 ${maintCfg.color}`}>
              <Wrench className="w-2.5 h-2.5"/>
              <span>{maintCfg.label}</span>
            </div>)}
        </div>)}

      {/* Compact mode: just show status + last reading */}
      {compact && (<div className="text-xs text-slate-500">
          {sensor.lastReading && sensor.lastReading !== '—' ? `Last: ${sensor.lastReading}` : 'No data'}
        </div>)}
    </div>);
}
