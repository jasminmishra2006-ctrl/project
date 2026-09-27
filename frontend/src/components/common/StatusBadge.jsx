import { AlertTriangle, CheckCircle2, CircleHelp, WifiOff, XCircle } from 'lucide-react';

const STATUS_STYLES = {
  safe: { color: '#4F7D55', background: '#E8F0E8', Icon: CheckCircle2, defaultLabel: 'Safe' },
  elevated: { color: '#A56D16', background: '#F8EEDC', Icon: AlertTriangle, defaultLabel: 'Elevated' },
  warning: { color: '#A56D16', background: '#F8EEDC', Icon: AlertTriangle, defaultLabel: 'Warning' },
  high: { color: '#A63E36', background: '#F8E2E0', Icon: AlertTriangle, defaultLabel: 'High' },
  critical: { color: '#A63E36', background: '#F8E2E0', Icon: XCircle, defaultLabel: 'Critical' },
  offline: { color: '#657174', background: '#ECEFF0', Icon: WifiOff, defaultLabel: 'Offline' },
  nodata: { color: '#657174', background: '#ECEFF0', Icon: CircleHelp, defaultLabel: 'No data' },
};

export function StatusBadge({ status = 'nodata', label, className = '' }) {
  const config = STATUS_STYLES[status] ?? STATUS_STYLES.nodata;
  const Icon = config.Icon;
  const text = label ?? config.defaultLabel;

  return (
    <span
      className={`inline-flex min-h-7 max-w-full shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
      style={{ color: config.color, backgroundColor: config.background }}
      role="status"
      aria-label={text}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      <span>{text}</span>
    </span>
  );
}
