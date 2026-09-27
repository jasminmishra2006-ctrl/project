import { RISK_COLORS } from '@/services/waterDataService';
import type { RiskLevel } from '@/types';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface GaugeCardProps {
  name: string;
  value: number;
  unit: string;
  risk: RiskLevel;
  statusLabel: string;
  min: number;
  max: number;
  previousValue?: number;
  zones: { risk: RiskLevel; fraction: number }[];
  icon?: React.ReactNode;
}

export function GaugeCard({ name, value, unit, risk, statusLabel, min, max, previousValue, zones, icon }: GaugeCardProps) {
  const radius = 72;
  const cx = 110;
  const cy = 100;
  const strokeWidth = 20;
  const startAngle = 180;
  const endAngle = 360;
  const totalAngle = endAngle - startAngle;

  const position = Math.max(0, Math.min(1, (value - min) / (max - min)));

  let accAngle = startAngle;
  const zoneArcs = zones.map((z) => {
    const zoneStart = accAngle;
    const zoneEnd = accAngle + z.fraction * totalAngle;
    accAngle = zoneEnd;
    return { risk: z.risk, start: zoneStart, end: zoneEnd };
  });

  const needleAngle = startAngle + position * totalAngle;
  const needleRad = (needleAngle * Math.PI) / 180;
  const needleLen = radius - 6;
  const needleX = cx + needleLen * Math.cos(needleRad);
  const needleY = cy + needleLen * Math.sin(needleRad);

  function polarArc(startDeg: number, endDeg: number, r: number) {
    const startRad = (startDeg * Math.PI) / 180;
    const endRad = (endDeg * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  // Tick marks
  const ticks = [];
  const tickCount = 6;
  for (let i = 0; i <= tickCount; i++) {
    const a = startAngle + (i / tickCount) * totalAngle;
    const rad = (a * Math.PI) / 180;
    const r1 = radius + 4;
    const r2 = radius + 9;
    ticks.push({
      x1: cx + r1 * Math.cos(rad),
      y1: cy + r1 * Math.sin(rad),
      x2: cx + r2 * Math.cos(rad),
      y2: cy + r2 * Math.sin(rad),
    });
  }

  const currentColor = RISK_COLORS[risk];

  let change: { direction: 'up' | 'down' | 'flat'; text: string } | null = null;
  if (previousValue !== undefined && previousValue !== 0) {
    const diff = value - previousValue;
    const pct = Math.abs((diff / previousValue) * 100);
    if (Math.abs(diff) < 0.01) {
      change = { direction: 'flat', text: 'No change' };
    } else if (diff > 0) {
      change = { direction: 'up', text: `${pct.toFixed(1)}% vs prev` };
    } else {
      change = { direction: 'down', text: `${pct.toFixed(1)}% vs prev` };
    }
  } else if (previousValue !== undefined && previousValue === 0) {
    change = { direction: 'flat', text: 'No previous data' };
  }

  const changeColor = change?.direction === 'down' ? 'text-green-600' : change?.direction === 'up' ? 'text-orange-600' : 'text-slate-400';

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-3 flex flex-col">
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-1.5">
          {icon}
          <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{name}</h4>
        </div>
        <span
          className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide"
          style={{ color: currentColor, backgroundColor: `${currentColor}18` }}
        >
          {statusLabel}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <svg viewBox="0 0 220 130" className="w-full max-w-[240px]">
          {/* Background track */}
          <path
            d={polarArc(startAngle, endAngle, radius)}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth + 2}
            strokeLinecap="butt"
          />

          {/* Zone arcs */}
          {zoneArcs.map((za, i) => (
            <path
              key={i}
              d={polarArc(za.start, za.end, radius)}
              fill="none"
              stroke={RISK_COLORS[za.risk]}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              opacity={0.25}
            />
          ))}

          {/* Active arc up to needle */}
          <path
            d={polarArc(startAngle, needleAngle, radius)}
            fill="none"
            stroke={currentColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{ transition: 'all 0.6s ease' }}
          />

          {/* Tick marks */}
          {ticks.map((t, i) => (
            <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#cbd5e1" strokeWidth={1} />
          ))}

          {/* Needle */}
          <line
            x1={cx}
            y1={cy}
            x2={needleX}
            y2={needleY}
            stroke="#0f2747"
            strokeWidth={3}
            strokeLinecap="round"
            style={{ transition: 'all 0.6s ease' }}
          />
          <circle cx={cx} cy={cy} r={7} fill="#0f2747" />
          <circle cx={cx} cy={cy} r={3} fill="#fff" />

          {/* Center value */}
          <text x={cx} y={cy - 18} textAnchor="middle" fill="#0f2747" style={{ fontSize: '30px', fontWeight: 800 }}>
            {value}
          </text>
          <text x={cx} y={cy - 3} textAnchor="middle" fill="#64748b" style={{ fontSize: '12px', fontWeight: 500 }}>
            {unit}
          </text>
        </svg>
      </div>

      <div className="flex items-center justify-between mt-0.5 px-1">
        <div className="flex gap-0.5">
          {zones.filter(z => z.fraction > 0.02).map((z, i) => (
            <span key={i} className="w-3 h-1 rounded-full" style={{ backgroundColor: RISK_COLORS[z.risk], opacity: 0.5 }} />
          ))}
        </div>
        {change && (
          <span className={`flex items-center gap-0.5 text-[10px] font-medium ${changeColor}`}>
            {change.direction === 'down' ? <TrendingDown className="w-3 h-3" /> :
             change.direction === 'up' ? <TrendingUp className="w-3 h-3" /> :
             <Minus className="w-3 h-3" />}
            {change.text}
          </span>
        )}
      </div>
    </div>
  );
}
