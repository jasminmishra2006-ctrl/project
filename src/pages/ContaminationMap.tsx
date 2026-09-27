import { useState } from 'react';
import { Card, Badge } from '@/components/ui/Card';
import { WaterQualityMap } from '@/components/WaterQualityMap';
import { ImprovementPanel } from '@/components/ImprovementPanel';
import { getDistricts, getDataSource } from '@/services/waterDataService';
import { MapPin, X } from 'lucide-react';
import type { DistrictAgg } from '@/types';

const CONTAMINANTS = ['Overall', 'Iron', 'Arsenic', 'Fluoride', 'Calcium', 'Phosphorus', 'TDS', 'pH', 'Turbidity'];

export function ContaminationMap() {
  const [contaminant, setContaminant] = useState('Overall');
  const [selected, setSelected] = useState<DistrictAgg | null>(null);
  const districts = getDistricts();

  return (
    <div className="space-y-5">
      <Card title="Jharkhand Water Contamination Intelligence" subtitle={`Source: ${getDataSource()} — click a district for details`}>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {CONTAMINANTS.map((c) => (
            <button key={c} onClick={() => setContaminant(c)} className={`px-3 py-1.5 text-xs font-medium rounded-lg ${contaminant === c ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {c}
            </button>
          ))}
        </div>
        <WaterQualityMap districts={districts} contaminant={contaminant} onSelect={(d) => setSelected(d)} selected={selected?.district} />
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card title="Water Quality Improvement" subtitle="Before vs after treatment by district">
          <ImprovementPanel />
        </Card>
        <Card title="District Details" subtitle={selected ? selected.district : 'Select a district on the map'}>
          {selected ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-slate-800">{selected.district}</span>
                </div>
                <Badge color={selected.riskLevel === 'safe' ? 'green' : selected.riskLevel === 'elevated' ? 'yellow' : selected.riskLevel === 'high' ? 'orange' : selected.riskLevel === 'critical' ? 'red' : 'gray'}>
                  {selected.riskLevel}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs text-slate-400">Water Sources</p>
                  <p className="font-semibold text-slate-700">{selected.waterSources}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs text-slate-400">Main Issue</p>
                  <p className="font-semibold text-slate-700">{selected.mainIssue}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs text-slate-400">pH</p>
                  <p className="font-semibold text-slate-700">{selected.ph || '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs text-slate-400">TDS (mg/L)</p>
                  <p className="font-semibold text-slate-700">{selected.tds || '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs text-slate-400">Turbidity (NTU)</p>
                  <p className="font-semibold text-slate-700">{selected.turbidity || '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs text-slate-400">Temperature</p>
                  <p className="font-semibold text-slate-700">{selected.temperature || '—'} °C</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs text-slate-400">Iron (mg/L)</p>
                  <p className="font-semibold text-slate-700">{selected.iron || '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs text-slate-400">Fluoride (mg/L)</p>
                  <p className="font-semibold text-slate-700">{selected.fluoride || '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs text-slate-400">Arsenic (mg/L)</p>
                  <p className="font-semibold text-slate-700">{selected.arsenic || '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs text-slate-400">Calcium (mg/L)</p>
                  <p className="font-semibold text-slate-700">{selected.calcium || '—'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                <span>Last Updated: {selected.lastUpdated}</span>
                <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-slate-500 hover:text-slate-700">
                  <X className="w-3 h-3" /> Close
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <MapPin className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">Click a district on the map to view details</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
