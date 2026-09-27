import { THRESHOLDS } from '@/services/thresholds';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { StatusBadge } from '@/components/common/StatusBadge';
import { WaterQualityGauge } from '@/components/metric-cards/WaterQualityGauge';

const STATUS_STYLE = {
  safe: { color: '#4F7D55', background: '#E8F0E8' },
  elevated: { color: '#A56D16', background: '#F8EEDC' },
  high: { color: '#A63E36', background: '#F8E2E0' },
  critical: { color: '#A63E36', background: '#F8E2E0' },
  nodata: { color: '#657174', background: '#ECEFF0' },
  offline: { color: '#657174', background: '#ECEFF0' },
};

function getRange(name) {
  const key = name.toLowerCase();
  if (key === 'ph') return { label: 'Safe range', text: `${THRESHOLDS.ph.safe.min}–${THRESHOLDS.ph.safe.max} pH`, markers: [THRESHOLDS.ph.safe.min, THRESHOLDS.ph.safe.max] };
  if (key === 'tds') return { label: 'Permissible limit', text: `≤${THRESHOLDS.tds.safe} mg/L`, markers: [THRESHOLDS.tds.safe] };
  if (key === 'turbidity') return { label: 'Permissible limit', text: `≤${THRESHOLDS.turbidity.safe} NTU`, markers: [THRESHOLDS.turbidity.safe] };
  if (key === 'temperature') return { label: 'Safe range', text: `${THRESHOLDS.temperature.safe.min}–${THRESHOLDS.temperature.safe.max} °C`, markers: [THRESHOLDS.temperature.safe.min, THRESHOLDS.temperature.safe.max] };
  return { label: 'Target score', text: '≥70 / 100', markers: [70] };
}

function formatUpdated(timestamp) {
  if (!timestamp) return null;
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return null;
  const minutes = Math.max(0, Math.floor((Date.now() - parsed) / 60000));
  return minutes < 1 ? 'Updated just now' : `Updated ${minutes} min${minutes === 1 ? '' : 's'} ago`;
}

function getTrend(value, previousValue) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))
    || previousValue === null || previousValue === undefined || !Number.isFinite(Number(previousValue))) return null;
  const previous = Number(previousValue);
  if (previous === 0) return { direction: 'flat', text: 'No previous reading' };
  const difference = Number(value) - previous;
  if (Math.abs(difference) < 0.01) return { direction: 'flat', text: 'No change vs previous reading' };
  return {
    direction: difference > 0 ? 'up' : 'down',
    text: `${Math.abs((difference / previous) * 100).toFixed(1)}% vs previous reading`,
  };
}

function getSparklinePoints(values) {
  const points = values.map(Number).filter(Number.isFinite);
  if (points.length < 2) return '';
  const minimum = Math.min(...points);
  const spread = Math.max(...points) - minimum || 1;
  return points.map((point, index) => `${(index / (points.length - 1)) * 100},${18 - ((point - minimum) / spread) * 14}`).join(' ');
}

export function GaugeCard({ name, value, unit, risk, statusLabel, min, max, previousValue, icon, timestamp, updatedLabel, sparkline = [], mainContributor, recommendation, areaLabel, onViewDetails }) {
  const isOverall = name.toLowerCase().includes('overall') || name.toLowerCase().includes('score');
  const status = STATUS_STYLE[risk] ?? STATUS_STYLE.nodata;
  const hasValue = value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  const displayValue = hasValue ? value : 'No data';
  const range = getRange(name);
  const trend = getTrend(value, previousValue);
  const TrendIcon = trend?.direction === 'up' ? TrendingUp : trend?.direction === 'down' ? TrendingDown : Minus;
  const sparklinePoints = getSparklinePoints(sparkline);
  const updated = updatedLabel ?? formatUpdated(timestamp);

  return (
    <article className={`metric-card flex h-full min-w-0 flex-col rounded-xl border p-[18px] ${isOverall ? 'metric-card-overall' : ''}`} style={{ borderColor: '#E7E3DA', backgroundColor: '#fff', boxShadow: '0 2px 12px rgba(38,50,56,.045)', borderTop: isOverall ? '3px solid #4F7D55' : '1px solid #E7E3DA' }}>
      <div className="flex min-h-8 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ color: status.color, background: status.background }} aria-hidden="true">{icon}</span>
          <h3 className="truncate text-sm font-bold normal-case tracking-normal" style={{ color: '#263238', fontFamily: "'Nunito Sans', sans-serif" }}>{isOverall ? 'Overall Water Quality' : name}</h3>
        </div>
        <StatusBadge status={risk} label={statusLabel} />
      </div>

      {isOverall ? (
        <div className="overall-card-content">
          <div className="overall-card-score">
            <p className="text-sm" style={{ color: '#6E7772' }}>{areaLabel || 'Network-wide average'}</p>
            <p className={`mt-2 font-extrabold leading-none tabular-nums ${hasValue ? 'text-4xl' : 'text-lg'}`} style={{ color: '#263238' }}>{displayValue}<span className="ml-1 text-sm font-semibold" style={{ color: '#6E7772' }}>{unit}</span></p>
          </div>
          <div className="overall-card-details space-y-1 rounded-lg px-3 py-2" style={{ background: '#F7F6F2', color: '#263238' }}>
            <p className="text-sm"><span className="font-bold">Main contributor:</span> {mainContributor || 'Unavailable'}</p>
            <p className="text-sm"><span className="font-bold">Recommended action:</span> {recommendation || 'Continue routine monitoring.'}</p>
            {onViewDetails && <button type="button" onClick={onViewDetails} className="mt-1 min-h-10 w-fit rounded-lg border border-[#d8d7cb] px-3 py-2 text-sm font-semibold transition-colors hover:bg-[#f3ede3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ color: '#4F7D55' }}>View Details</button>}
          </div>
        </div>
      ) : (
        <>
          <div className="mt-2 text-center">
            <div className={`font-extrabold leading-none tabular-nums ${hasValue ? 'text-[34px]' : 'text-lg'}`} style={{ color: '#263238' }}>{displayValue}</div>
            <div className="mt-1 text-xs font-semibold" style={{ color: '#6E7772' }}>{unit}</div>
          </div>
          <div className="mt-1 flex justify-center">
            <WaterQualityGauge value={hasValue ? value : null} min={min} max={max} markers={range.markers} status={risk} label={`${name} gauge${hasValue ? `, ${value} ${unit}` : ', no data'}`} />
          </div>
          <p className="metric-safe-range text-center text-xs font-semibold text-[#30352e]">
            <span style={{ color: '#6E7772' }}>{range.label}: </span>{range.text}
          </p>
        </>
      )}

      <div className="mt-auto flex min-h-8 items-end justify-between gap-2 pt-3">
        {trend ? (
          <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold" style={{ color: '#6E7772' }}>
            <TrendIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{trend.text}</span>
          </span>
        ) : <span className="text-xs" style={{ color: '#6E7772' }}>Trend unavailable</span>}
        {sparklinePoints && <svg viewBox="0 0 100 20" className="h-5 w-16 shrink-0" role="img" aria-label={`${name} recent trend`}><polyline points={sparklinePoints} fill="none" stroke="#4a7c59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
      <p className="mt-1 min-h-5 text-xs" style={{ color: '#6E7772' }}>{updated || 'Update time unavailable'}</p>
    </article>
  );
}
