import { HEALTH_CONFIG } from '@/services/sensorHealthService';
export function DataFreshnessIndicator({ secondsAgo, label }) {
    const isFresh = secondsAgo < 120;
    const isStale = secondsAgo >= 120 && secondsAgo < 600;
    const isOffline = secondsAgo >= 600;
    const cfg = isFresh
        ? { color: 'text-green-600', bg: 'bg-green-50', dot: 'bg-green-500', text: 'LIVE DATA' }
        : isStale
            ? { color: 'text-yellow-600', bg: 'bg-yellow-50', dot: 'bg-yellow-500', text: 'STALE DATA' }
            : { color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500', text: 'LAST KNOWN DATA' };
    const timeLabel = secondsAgo === 0
        ? 'No timestamp'
        : secondsAgo < 60
            ? `${secondsAgo}s ago`
            : secondsAgo < 3600
                ? `${Math.floor(secondsAgo / 60)}m ago`
                : secondsAgo < 86400
                    ? `${Math.floor(secondsAgo / 3600)}h ago`
                    : `${Math.floor(secondsAgo / 86400)}d ago`;
    return (<div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${isFresh ? 'animate-pulse' : ''}`}/>
      <span>{label ?? cfg.text}</span>
      <span className="text-slate-400 font-normal">· {timeLabel}</span>
    </div>);
}
export function ConnectionStatus({ status, label, icon }) {
    const cfg = HEALTH_CONFIG[status];
    return (<div className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-full ${cfg.bgColor} ${cfg.borderColor}`}>
      {icon}
      <span className={`text-xs font-semibold ${cfg.color}`}>{label ?? cfg.label}</span>
    </div>);
}
