import type { FilterHealthItem } from '@/types';
import { AlertTriangle, CheckCircle, Eye, Wrench } from 'lucide-react';

interface FilterHealthProps {
  items: FilterHealthItem[];
  compact?: boolean;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: typeof CheckCircle }> = {
  healthy: { color: 'text-green-600', bg: 'bg-green-500', label: 'Healthy', icon: CheckCircle },
  monitor: { color: 'text-yellow-600', bg: 'bg-yellow-500', label: 'Monitor', icon: Eye },
  replacement: { color: 'text-red-600', bg: 'bg-red-500', label: 'Replace Soon', icon: AlertTriangle },
};

export function FilterHealth({ items, compact = false }: FilterHealthProps) {
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const cfg = STATUS_CONFIG[item.status];
        const Icon = cfg.icon;
        return (
          <div key={item.name}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-slate-700">{item.name}</span>
              <span className="text-sm font-bold text-slate-800">{item.percent}%</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${cfg.bg} transition-all duration-500`}
                style={{ width: `${item.percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <div className={`flex items-center gap-1 text-xs ${cfg.color}`}>
                <Icon className="w-3.5 h-3.5" />
                <span>{cfg.label}</span>
              </div>
              {!compact && (
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span>Last: {item.lastService}</span>
                  <span className="text-slate-300">|</span>
                  <span className="flex items-center gap-0.5"><Wrench className="w-2.5 h-2.5" />Next: {item.nextMaintenance}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
