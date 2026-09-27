import type { WaterReading } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CheckCircle, AlertTriangle } from 'lucide-react';

interface TreatmentComparisonProps {
  reading: WaterReading;
}

export function TreatmentComparison({ reading }: TreatmentComparisonProps) {
  const { beforeTreatment: before, afterTreatment: after } = reading;

  const params = [
    { key: 'ph', label: 'pH', unit: '', before: before.ph, after: after.ph },
    { key: 'tds', label: 'TDS', unit: 'mg/L', before: before.tds, after: after.tds },
    { key: 'turbidity', label: 'Turbidity', unit: 'NTU', before: before.turbidity, after: after.turbidity },
    { key: 'temperature', label: 'Temperature', unit: '°C', before: before.temperature, after: after.temperature },
  ];

  // Verification rule: after-treatment values must be within safe thresholds
  const verified = after.ph >= 6.5 && after.ph <= 8.5 && after.tds <= 500 && after.turbidity <= 5;

  const chartData = params.map((p) => ({
    name: p.label,
    Before: p.before,
    After: p.after,
  }));

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 px-2 text-xs font-semibold text-slate-500">Parameter</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-slate-500">Before</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-slate-500">After</th>
              <th className="text-right py-2 px-2 text-xs font-semibold text-slate-500">Change</th>
              <th className="text-center py-2 px-2 text-xs font-semibold text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {params.map((p) => {
              const changePct = p.before !== 0 ? ((p.after - p.before) / p.before) * 100 : 0;
              const improved = p.key === 'ph' ? (p.after >= 6.5 && p.after <= 8.5) : (p.after < p.before);
              return (
                <tr key={p.key} className="border-b border-slate-100">
                  <td className="py-2.5 px-2 font-medium text-slate-700">{p.label}</td>
                  <td className="py-2.5 px-2 text-right text-slate-600">{p.before} {p.unit}</td>
                  <td className="py-2.5 px-2 text-right font-semibold text-slate-800">{p.after} {p.unit}</td>
                  <td className={`py-2.5 px-2 text-right font-medium ${improved ? 'text-green-600' : 'text-orange-600'}`}>
                    {changePct > 0 ? '+' : ''}{changePct.toFixed(0)}%
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    {improved ? (
                      <CheckCircle className="w-4 h-4 text-green-600 inline" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-orange-500 inline" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Before" fill="#f97316" radius={[4, 4, 0, 0]} />
            <Bar dataKey="After" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border ${
        verified ? 'bg-green-50 border-green-200 text-green-700' : 'bg-orange-50 border-orange-200 text-orange-700'
      }`}>
        {verified ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
        <span className="text-sm font-semibold">
          {verified ? 'TREATMENT VERIFIED' : 'RECHECK REQUIRED'}
        </span>
      </div>
    </div>
  );
}
