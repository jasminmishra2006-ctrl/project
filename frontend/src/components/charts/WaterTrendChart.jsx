import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Legend } from 'recharts';
import { classifyPH, classifyTDS, classifyTurbidity, riskToLabel } from '@/services/waterDataService';
import { EmptyState } from '@/components/common/EmptyState';
const PARAM_CONFIG = {
    ph: { color: '#4A7C59', label: 'pH', unit: '' },
    tds: { color: '#705C30', label: 'TDS', unit: 'mg/L' },
    turbidity: { color: '#8BA888', label: 'Turbidity', unit: 'NTU' },
    temperature: { color: '#A75545', label: 'Temperature', unit: '°C' },
};
function getParamStatus(param, value) {
    switch (param) {
        case 'ph': return riskToLabel(classifyPH(value));
        case 'tds': return riskToLabel(classifyTDS(value));
        case 'turbidity': return riskToLabel(classifyTurbidity(value));
        default: return 'Normal';
    }
}
function TrendTooltip({ active, payload, label }) {
    if (!active || !payload || payload.length === 0)
        return null;
    return (<div className="bg-[#FDFAF5] rounded-[16px] border border-[#d8d7cb]/60 shadow-[0_2px_16px_rgba(46,50,48,0.06)] p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map((entry) => (<div key={entry.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}/>
            <span className="text-slate-500">{PARAM_CONFIG[entry.dataKey]?.label ?? entry.dataKey}</span>
          </div>
          <div className="text-right">
            <span className="font-semibold text-slate-700">{entry.value}{PARAM_CONFIG[entry.dataKey]?.unit}</span>
            <span className="text-slate-400 ml-2">{getParamStatus(entry.dataKey, entry.value)}</span>
          </div>
        </div>))}
    </div>);
}
export function WaterTrendChart({ data, params, height = 280 }) {
    if (!Array.isArray(data) || data.length === 0 || !Array.isArray(params) || params.length === 0)
        return <EmptyState title="No trend data available" description="Historical readings are not available for this area." className="min-h-0" />;
    return (<ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
        <defs>
          {params.filter((p) => PARAM_CONFIG[p]).map((p) => (<linearGradient key={p} id={`grad-${p}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PARAM_CONFIG[p].color} stopOpacity={0.2}/>
              <stop offset="100%" stopColor={PARAM_CONFIG[p].color} stopOpacity={0}/>
            </linearGradient>))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(216,208,200,0.65)"/>
        <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#686d60' }} stroke="#d8d7cb"/>
        <YAxis tick={{ fontSize: 11, fill: '#686d60' }} stroke="#d8d7cb"/>
        <Tooltip content={<TrendTooltip />}/>
        {params.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }}/>}
        {params.filter((p) => PARAM_CONFIG[p]).map((p) => (<Area key={p} type="monotone" dataKey={p} name={PARAM_CONFIG[p].label} stroke={PARAM_CONFIG[p].color} strokeWidth={2} fill={`url(#grad-${p})`} dot={{ r: 3 }} activeDot={{ r: 5 }}/>))}
      </AreaChart>
    </ResponsiveContainer>);
}
export function MiniTrendChart({ data, param, height = 200, color }) {
    const config = PARAM_CONFIG[param] ?? { color: '#4a7c59', label: 'Score', unit: '' };
    const stroke = color ?? config.color;
    if (!Array.isArray(data) || data.length === 0)
        return <EmptyState title="No history available" description="There are no historical readings to plot." className="min-h-0" />;
    return (<ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(216,208,200,0.65)"/>
        <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#686d60' }} stroke="#d8d7cb"/>
        <YAxis tick={{ fontSize: 10, fill: '#686d60' }} stroke="#d8d7cb"/>
        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #d8d7cb', background: '#30352e', color: '#FFFDF9', fontSize: 12 }}/>
        <Line type="monotone" dataKey={param} stroke={stroke} strokeWidth={2} dot={false}/>
      </LineChart>
    </ResponsiveContainer>);
}
