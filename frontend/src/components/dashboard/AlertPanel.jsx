import { useState } from 'react';
import { Badge } from '@/components/common/Card';
const SEVERITY_COLOR = {
    critical: 'red',
    warning: 'yellow',
    info: 'blue',
    resolved: 'green',
};
export function AlertPanel({ alerts, showFilters = true, compact = false }) {
    const [filter, setFilter] = useState('All');
    const filters = ['All', 'Critical', 'Warning', 'Resolved'];
    const filtered = filter === 'All' ? alerts :
        filter === 'Critical' ? alerts.filter(a => a.severity === 'critical') :
            filter === 'Warning' ? alerts.filter(a => a.severity === 'warning') :
                alerts.filter(a => a.status === 'RESOLVED');
    return (<div className="space-y-3">
      {showFilters && (<div className="flex gap-2">
          {filters.map((f) => (<button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {f}
            </button>))}
        </div>)}

      <div className="space-y-2">
        {filtered.length === 0 && (<p className="text-sm text-slate-400 text-center py-6">No alerts in this category.</p>)}
        {filtered.map((alert) => (<div key={alert.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-100 ${compact ? '' : 'bg-slate-50'}`}>
            <div className="text-xs text-slate-400 font-mono tabular-nums w-20 flex-shrink-0">{alert.time}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700 truncate">{alert.location}</span>
                <span className="text-xs text-slate-500">{alert.parameter}</span>
              </div>
              {!compact && <div className="text-xs text-slate-400">{alert.value}</div>}
            </div>
            <Badge color={SEVERITY_COLOR[alert.severity]}>{alert.severity}</Badge>
            <span className={`text-xs font-medium w-20 text-right ${alert.status === 'OPEN' ? 'text-red-600' : alert.status === 'MONITORING' ? 'text-yellow-600' : 'text-green-600'}`}>
              {alert.status}
            </span>
          </div>))}
      </div>
    </div>);
}
