import type { DistrictAgg } from '@/types';
import { RISK_COLORS, riskToLabel } from '@/services/waterDataService';
import { AlertTriangle, MapPin } from 'lucide-react';

interface MostAffectedAreasProps {
  districts: DistrictAgg[];
}

const RISK_RANK: Record<string, number> = { critical: 4, high: 3, elevated: 2, safe: 1, nodata: 0 };

export function MostAffectedAreas({ districts }: MostAffectedAreasProps) {
  const affected = districts
    .filter(d => d.riskLevel !== 'nodata' && d.riskLevel !== 'safe')
    .sort((a, b) => (RISK_RANK[b.riskLevel] ?? 0) - (RISK_RANK[a.riskLevel] ?? 0))
    .slice(0, 5);

  if (affected.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-slate-400">
        <AlertTriangle className="w-6 h-6 mb-1.5 opacity-40" />
        <p className="text-xs">No affected areas in current filter.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {affected.map((d) => {
        const color = RISK_COLORS[d.riskLevel];
        return (
          <div key={d.district} className="flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-slate-700 truncate">{d.district}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{d.waterSources} sources · {d.mainIssue}</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-sm font-bold text-slate-700">{d.tds > 0 ? d.tds : '—'}</span>
                {d.tds > 0 && <span className="text-[10px] text-slate-400">mg/L</span>}
              </div>
              <span className="text-[10px] font-bold uppercase" style={{ color }}>
                {riskToLabel(d.riskLevel)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
