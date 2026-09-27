import { Menu, Radio, Cloud, Database } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getDataSource } from '@/services/waterDataService';
import { getEsp32State, getApiState, getDatabaseState } from '@/services/sensorHealthService';
import type { Esp32State, ApiState, DatabaseState } from '@/services/sensorHealthService';

interface HeaderProps {
  onMenuClick: () => void;
}

const ESP32_CONFIG: Record<Esp32State, { label: string; color: string; bg: string; border: string }> = {
  live: { label: 'ESP32 LIVE', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
  connecting: { label: 'ESP32 CONNECTING', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  offline: { label: 'ESP32 OFFLINE', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  error: { label: 'ESP32 ERROR', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
};

const API_CONFIG: Record<ApiState, { label: string; color: string; bg: string; border: string }> = {
  online: { label: 'API ONLINE', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
  offline: { label: 'API OFFLINE', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  error: { label: 'API ERROR', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
};

const DB_CONFIG: Record<DatabaseState, { label: string; color: string; bg: string; border: string }> = {
  connected: { label: 'DB CONNECTED', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
  disconnected: { label: 'DB OFFLINE', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
};

export function Header({ onMenuClick }: HeaderProps) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const dataSource = getDataSource();
  const esp32State = getEsp32State();
  const apiState = getApiState();
  const dbState = getDatabaseState();
  const esp32Cfg = ESP32_CONFIG[esp32State];
  const apiCfg = API_CONFIG[apiState];
  const dbCfg = DB_CONFIG[dbState];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 lg:px-6 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden text-slate-600 hover:text-slate-900">
          <Menu className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-base font-bold text-[#0f2747] leading-tight">JalRakshak</h2>
          <p className="text-[11px] text-slate-400 leading-tight hidden sm:block">Smart Water Quality & Purification Monitoring</p>
        </div>
      </div>
      <div className="flex items-center gap-2 lg:gap-3">
        <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 border rounded-full ${esp32Cfg.bg} ${esp32Cfg.border}`}>
          <Radio className={`w-3.5 h-3.5 ${esp32Cfg.color}`} />
          <span className={`text-xs font-semibold ${esp32Cfg.color}`}>{esp32Cfg.label}</span>
        </div>
        <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 border rounded-full ${apiCfg.bg} ${apiCfg.border}`}>
          <Cloud className={`w-3.5 h-3.5 ${apiCfg.color}`} />
          <span className={`text-xs font-semibold ${apiCfg.color}`}>{apiCfg.label}</span>
        </div>
        <div className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 border rounded-full ${dbCfg.bg} ${dbCfg.border}`}>
          <Database className={`w-3.5 h-3.5 ${dbCfg.color}`} />
          <span className={`text-xs font-semibold ${dbCfg.color}`}>{dbCfg.label}</span>
        </div>
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full">
          <span className="text-xs font-medium text-slate-500">{dataSource}</span>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400 leading-tight">Last updated</p>
          <p className="text-xs font-semibold text-slate-700 tabular-nums leading-tight">{time}</p>
        </div>
      </div>
    </header>
  );
}
