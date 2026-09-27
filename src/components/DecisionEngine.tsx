import type { WaterReading } from '@/types';
import { evaluateTreatment, getTreatmentConditions } from '@/services/decisionEngine';
import { PurificationPipeline } from './PurificationPipeline';
import { Card } from './ui/Card';
import { Check, Circle, Droplets, Brain } from 'lucide-react';

interface DecisionEngineProps {
  reading: WaterReading;
}

export function DecisionEngine({ reading }: DecisionEngineProps) {
  const plan = evaluateTreatment(reading);
  const conditions = getTreatmentConditions(reading);

  const levelColor: Record<string, string> = {
    NORMAL: 'text-green-600 bg-green-50',
    ELEVATED: 'text-yellow-600 bg-yellow-50',
    HIGH: 'text-red-600 bg-red-50',
  };

  return (
    <div className="space-y-4">
      {/* Current conditions */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Current Water Condition</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {conditions.map((c) => (
            <div key={c.label} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{c.label}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${levelColor[c.level] ?? levelColor.NORMAL}`}>
                  {c.level}
                </span>
              </div>
              <p className="text-sm font-bold text-slate-800 mt-1">{c.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended treatment summary */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Recommended Treatment</h4>
        <div className="flex flex-wrap gap-2">
          {plan.stages.filter(s => s.key !== 'raw' && s.key !== 'diagnose' && s.key !== 'verify' && s.key !== 'accept').map((s) => (
            <div key={s.key} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border"
              style={{
                color: s.status === 'notRequired' ? '#94a3b8' : '#0f2747',
                backgroundColor: s.status === 'notRequired' ? '#f8fafc' : s.status === 'active' ? '#eff6ff' : '#f0fdf4',
                borderColor: s.status === 'notRequired' ? '#e2e8f0' : s.status === 'active' ? '#bfdbfe' : '#bbf7d0',
              }}>
              {s.status === 'notRequired' ? <Circle className="w-3 h-3" /> : <Check className="w-3 h-3 text-green-600" />}
              {s.label}
              {s.status === 'notRequired' && <span className="text-slate-400 ml-1">— Not Required</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Reasons */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Reasoning</h4>
        <div className="space-y-1.5">
          {plan.reasons.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
              <Brain className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
              <span>{r}</span>
            </div>
          ))}
          {plan.reasons.length === 0 && (
            <p className="text-xs text-slate-400">All parameters within safe range. No treatment required.</p>
          )}
        </div>
      </div>

      {/* Pipeline */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Adaptive Purification Pipeline</h4>
        <PurificationPipeline stages={plan.stages} />
      </div>
    </div>
  );
}
