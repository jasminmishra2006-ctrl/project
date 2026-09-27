import type { DistrictAgg } from '@/types';
import { RISK_COLORS } from '@/services/waterDataService';
import { TrendingUp, MapPin } from 'lucide-react';

interface MostImprovedAreasProps {
  districts: DistrictAgg[];
}

export function MostImprovedAreas({ districts }: MostImprovedAreasProps) {
  const improved = districts
    .filter(d => d.riskLevel !== 'nodata' && d.improvementPct > 0)
    .sort((a, b) => b.improvementPct - a.improvementPct)
    .slice(0, 5);

  if (improved.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-slate-400">
        <TrendingUp className="w-6 h-6 mb-1.5 opacity-40" />
        <p className="text-xs">No historical improvement data available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {improved.map((d) => {
        const beforeColor = RISK_COLORS[d.beforeRisk];
        const afterColor = RISK_COLORS[d.afterRisk];
        return (
          <div key={d.district} className="flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: afterColor }} />
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-slate-700 truncate">{d.district}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: beforeColor }} />
                  <span className="text-[10px] text-slate-400">→</span>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: afterColor }} />
                  <span className="text-[10px] text-slate-400">{d.mainIssue !== 'None' ? d.mainIssue : 'All clear'}</span>
                </div>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <div className="flex items-center justify-end gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                <span className="text-sm font-bold text-green-600">+{d.improvementPct}%</span>
              </div>
              <span className="text-[10px] text-slate-400">Improvement</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
