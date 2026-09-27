import type { SensorStatus } from '@/types';
import { StatusDot } from './ui/Card';

interface SensorHealthProps {
  sensors: SensorStatus[];
}

export function SensorHealth({ sensors }: SensorHealthProps) {
  return (
    <div className="space-y-2.5">
      {sensors.map((s) => (
        <div key={s.name} className="flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-100">
          <div className="flex items-center gap-3">
            <StatusDot color={s.online ? 'green' : 'red'} />
            <span className="text-sm font-medium text-slate-700">{s.name}</span>
          </div>
          <div className="text-right">
            <span className={`text-xs font-semibold ${s.online ? 'text-green-600' : 'text-red-600'}`}>
              {s.online ? 'Online' : 'Offline'}
            </span>
            {s.lastReading && s.lastReading !== '—' && (
              <p className="text-xs text-slate-400">Last: {s.lastReading}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
