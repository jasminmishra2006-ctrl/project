import type { TreatmentStage } from '@/types';
import {
  Check, Circle, AlertTriangle, X, Loader, ArrowRight,
  Droplets, FlaskRound, Layers, Filter, Sun, Waves, ShieldCheck, Beaker,
} from 'lucide-react';

interface PurificationPipelineProps {
  stages: TreatmentStage[];
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: typeof Check; label: string }> = {
  completed: { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-300', icon: Check, label: 'Done' },
  active: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-400', icon: Loader, label: 'Active' },
  required: { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-300', icon: Circle, label: 'Required' },
  notRequired: { color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200', icon: Circle, label: 'Skipped' },
  attention: { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-300', icon: AlertTriangle, label: 'Attention' },
  failed: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-300', icon: X, label: 'Failed' },
};

const STAGE_ICONS: Record<string, typeof Droplets> = {
  raw: Droplets,
  diagnose: FlaskRound,
  sediment: Layers,
  carbon: Filter,
  uf: Filter,
  uv: Sun,
  ro: Waves,
  verify: ShieldCheck,
  output: Beaker,
};

export function PurificationPipeline({ stages }: PurificationPipelineProps) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-stretch gap-0 min-w-max">
        {stages.map((stage, i) => {
          const cfg = STATUS_CONFIG[stage.status];
          const StatusIcon = cfg.icon;
          const StageIcon = STAGE_ICONS[stage.key] ?? Droplets;
          const isActive = stage.status === 'active';
          const isCompleted = stage.status === 'completed';
          const dim = stage.status === 'notRequired';

          return (
            <div key={stage.key} className="flex items-stretch">
              <div className={`flex flex-col items-center justify-center px-3 py-2.5 ${cfg.bg} border-2 ${cfg.border} rounded-lg min-w-[100px] transition-all ${dim ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <StageIcon className={`w-4 h-4 ${cfg.color}`} />
                  {isActive && <StatusIcon className={`w-3.5 h-3.5 ${cfg.color} animate-spin`} />}
                  {isCompleted && <StatusIcon className={`w-3.5 h-3.5 ${cfg.color}`} />}
                  {(stage.status === 'required' || stage.status === 'attention' || stage.status === 'failed') && (
                    <StatusIcon className={`w-3.5 h-3.5 ${cfg.color}`} />
                  )}
                </div>
                <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">{stage.label}</span>
                <span className={`text-[9px] mt-0.5 ${cfg.color} font-bold uppercase`}>{cfg.label}</span>
              </div>
              {i < stages.length - 1 && (
                <div className="flex items-center px-0.5">
                  <div className={`flex items-center ${isCompleted ? 'text-green-400' : 'text-slate-300'}`}>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
