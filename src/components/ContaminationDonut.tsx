import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { ContaminationSlice } from '@/types';

interface ContaminationDonutProps {
  data: ContaminationSlice[];
  onSelect?: (name: string) => void;
  selected?: string;
}

export function ContaminationDonut({ data, onSelect, selected }: ContaminationDonutProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex flex-col lg:flex-row items-center gap-4">
      <div className="w-full lg:w-1/2" style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              onClick={(e: any) => onSelect?.(e.name as string)}
              style={{ cursor: 'pointer' }}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={entry.color}
                  stroke={selected === entry.name ? '#0f2747' : 'none'}
                  strokeWidth={selected === entry.name ? 2 : 0}
                  opacity={selected && selected !== entry.name ? 0.4 : 1}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
              formatter={(value: any) => [`${value}%`, '']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="w-full lg:w-1/2 space-y-2">
        {data.map((d) => (
          <button
            key={d.name}
            onClick={() => onSelect?.(d.name)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
              selected === d.name ? 'bg-slate-100' : 'hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
              <span className="font-medium text-slate-700">{d.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">{d.samples} samples</span>
              <span className="font-semibold text-slate-700">{d.value}%</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
