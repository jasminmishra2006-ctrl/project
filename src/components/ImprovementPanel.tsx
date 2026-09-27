import { getImprovementAreas, getDistricts } from '@/services/waterDataService';
import { RISK_COLORS, riskToLabel } from '@/services/waterDataService';
import type { RiskLevel } from '@/types';
import { useState } from 'react';
import { TrendingUp, Minus, TrendingDown } from 'lucide-react';

interface ImprovementPanelProps {
  mode?: 'risk' | 'improvement';
}

function riskFromString(s: string): RiskLevel {
  const map: Record<string, RiskLevel> = {
    'Critical': 'critical', 'High': 'high', 'Moderate': 'elevated', 'Low': 'safe',
  };
  return map[s] ?? 'nodata';
}

function getImprovementLabel(pct: number): { label: string; color: string; icon: typeof TrendingUp } {
  if (pct >= 30) return { label: 'Strong Improvement', color: 'text-green-600', icon: TrendingUp };
  if (pct >= 15) return { label: 'Moderate Improvement', color: 'text-blue-600', icon: TrendingUp };
  if (pct >= 0) return { label: 'Stable', color: 'text-slate-500', icon: Minus };
  return { label: 'Deteriorating', color: 'text-red-600', icon: TrendingDown };
}

export function ImprovementPanel({ mode: initialMode = 'risk' }: ImprovementPanelProps) {
  const [mode, setMode] = useState<'risk' | 'improvement'>(initialMode);
  const areas = getImprovementAreas();

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={() => setMode('risk')}
          className={`px-3 py-1 text-xs font-medium rounded-lg ${mode === 'risk' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          Current Risk
        </button>
        <button
          onClick={() => setMode('improvement')}
          className={`px-3 py-1 text-xs font-medium rounded-lg ${mode === 'improvement' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          Improvement
        </button>
      </div>

      <div className="space-y-2">
        {areas.map((a) => {
          if (mode === 'risk') {
            const beforeRisk = riskFromString(a.before);
            const nowRisk = riskFromString(a.now);
            return (
              <div key={a.district} className="flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-sm font-medium text-slate-700">{a.district}</span>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: RISK_COLORS[beforeRisk] }} />
                  <span className="text-xs text-slate-400">→</span>
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: RISK_COLORS[nowRisk] }} />
                  <span className="text-xs font-medium text-slate-600 ml-1">{riskToLabel(nowRisk)}</span>
                </div>
              </div>
            );
          }
          const imp = getImprovementLabel(a.improvementPct);
          const Icon = imp.icon;
          return (
            <div key={a.district} className="flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-sm font-medium text-slate-700">{a.district}</span>
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${imp.color}`} />
                <span className="text-sm font-bold text-slate-800">{a.improvementPct}%</span>
                <span className={`text-xs ${imp.color}`}>{imp.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
