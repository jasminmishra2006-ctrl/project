import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Legend } from 'recharts';
import type { TrendPoint } from '@/types';
import { classifyPH, classifyTDS, classifyTurbidity, riskToLabel } from '@/services/waterDataService';

interface WaterTrendChartProps {
  data: TrendPoint[];
  params: ('ph' | 'tds' | 'turbidity' | 'temperature')[];
  height?: number;
}

const PARAM_CONFIG: Record<string, { color: string; label: string; unit: string }> = {
  ph: { color: '#2563eb', label: 'pH', unit: '' },
  tds: { color: '#f97316', label: 'TDS', unit: 'mg/L' },
  turbidity: { color: '#8b5cf6', label: 'Turbidity', unit: 'NTU' },
  temperature: { color: '#ef4444', label: 'Temperature', unit: '°C' },
};

function getParamStatus(param: string, value: number): string {
  switch (param) {
    case 'ph': return riskToLabel(classifyPH(value));
    case 'tds': return riskToLabel(classifyTDS(value));
    case 'turbidity': return riskToLabel(classifyTurbidity(value));
    default: return 'Normal';
  }
}

function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-md p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-500">{PARAM_CONFIG[entry.dataKey]?.label ?? entry.dataKey}</span>
          </div>
          <div className="text-right">
            <span className="font-semibold text-slate-700">{entry.value}{PARAM_CONFIG[entry.dataKey]?.unit}</span>
            <span className="text-slate-400 ml-2">{getParamStatus(entry.dataKey, entry.value)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function WaterTrendChart({ data, params, height = 280 }: WaterTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
        <defs>
          {params.map((p) => (
            <linearGradient key={p} id={`grad-${p}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PARAM_CONFIG[p].color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={PARAM_CONFIG[p].color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
        <Tooltip content={<TrendTooltip />} />
        {params.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {params.map((p) => (
          <Area
            key={p}
            type="monotone"
            dataKey={p}
            name={PARAM_CONFIG[p].label}
            stroke={PARAM_CONFIG[p].color}
            strokeWidth={2}
            fill={`url(#grad-${p})`}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface MiniTrendChartProps {
  data: TrendPoint[];
  param: 'ph' | 'tds' | 'turbidity' | 'temperature' | 'score';
  height?: number;
  color?: string;
}

export function MiniTrendChart({ data, param, height = 200, color }: MiniTrendChartProps) {
  const config = PARAM_CONFIG[param] ?? { color: '#22c55e', label: 'Score', unit: '' };
  const stroke = color ?? config.color;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} stroke="#cbd5e1" />
        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} stroke="#cbd5e1" />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
        />
        <Line type="monotone" dataKey={param} stroke={stroke} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
