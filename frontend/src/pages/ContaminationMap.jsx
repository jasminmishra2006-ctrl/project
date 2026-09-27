import { useState } from 'react';
import { Card, Badge } from '@/components/common/Card';
import { WaterQualityMap } from '@/components/map/WaterQualityMap';
import { ImprovementPanel } from '@/components/dashboard/ImprovementPanel';
import { getHistoricalMapCenter, getHistoricalMapRecords } from '@/services/historyDataService';
import { MapPin, X } from 'lucide-react';

const CONTAMINANTS = ['Overall', 'pH', 'TDS', 'Turbidity', 'Temperature', 'Hardness', 'Residual chlorine', 'Ammonia', 'Fluoride', 'Nitrate', 'E. coli', 'Fecal coliform'];
const SAMPLES = getHistoricalMapRecords();
const SAMPLE_CENTER = getHistoricalMapCenter();

function statusBadgeColor(risk) {
  if (risk === 'safe') return 'green';
  if (risk === 'elevated') return 'yellow';
  if (risk === 'high') return 'orange';
  if (risk === 'critical') return 'red';
  return 'gray';
}

export function ContaminationMap() {
  const [contaminant, setContaminant] = useState('Overall');
  const [selected, setSelected] = useState(null);
  const sampleFields = selected ? [
    ['pH', selected.ph, ''],
    ['TDS', selected.tds, 'mg/L'],
    ['Turbidity', selected.turbidity, 'NTU'],
    ['Temperature', selected.temperature, '°C'],
    ['Hardness', selected.hardness_mg_l_as_caco3, 'mg/L as CaCO₃'],
    ['Residual chlorine', selected.residual_free_chlorine_mg_l, 'mg/L'],
    ['Ammonia', selected.ammonia_mg_l, 'mg/L'],
    ['Fluoride', selected.fluoride_mg_l, 'mg/L'],
    ['Nitrate', selected.nitrate_mg_l, 'mg/L'],
    ['E. coli', selected.e_coli_cfu_100ml, 'CFU/100mL'],
    ['Fecal coliform', selected.fecal_coliform_cfu_100ml, 'CFU/100mL'],
  ].filter(([, value]) => typeof value === 'number' && Number.isFinite(value)) : [];

  return (<div className="space-y-5">
      <Card title="Chhattisgarh Water Quality Intelligence" subtitle="Map powered by the provided water-quality dataset · click a sample for details">
        <div className="flex flex-wrap gap-1.5 mb-4">
          {CONTAMINANTS.map((parameter) => (<button key={parameter} onClick={() => setContaminant(parameter)} className={`px-3 py-1.5 text-xs font-medium rounded-lg ${contaminant === parameter ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {parameter}
            </button>))}
        </div>
        {SAMPLES.length > 0 && SAMPLE_CENTER ? <WaterQualityMap
          districts={SAMPLES}
          contaminant={contaminant}
          boundaryUrl={null}
          center={SAMPLE_CENTER}
          zoom={7}
          onSelect={setSelected}
          selected={selected?.sampleId}
        /> : <div className="flex h-[420px] items-center justify-center rounded-xl border border-slate-200 text-sm text-slate-500">No records with valid coordinates are available to map.</div>}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card title="Water Quality Improvement" subtitle="Existing Jharkhand dashboard dataset · separate from CSV map samples">
          <ImprovementPanel />
        </Card>
        <Card title="Sample Details" subtitle={selected ? `${selected.city}, ${selected.state}` : 'Select a sample on the map'}>
          {selected ? (<div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600"/>
                  <span className="font-semibold text-slate-800">{selected.city}, {selected.state}</span>
                </div>
                <Badge color={statusBadgeColor(selected.riskLevel)}>{selected.demo_water_status || 'No Data'}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs text-slate-400">Sample ID</p>
                  <p className="font-semibold text-slate-700">{selected.sample_id}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs text-slate-400">Sample date</p>
                  <p className="font-semibold text-slate-700">{selected.sample_date}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 col-span-2">
                  <p className="text-xs text-slate-400">Testing source</p>
                  <p className="font-semibold text-slate-700">{selected.testing_source}</p>
                </div>
                {sampleFields.map(([label, value, unit]) => <div key={label} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <p className="text-xs text-slate-400">{label}{unit ? ` (${unit})` : ''}</p>
                  <p className="font-semibold text-slate-700">{value}</p>
                </div>)}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 col-span-2">
                  <p className="text-xs text-slate-400">Coordinates (CSV)</p>
                  <p className="font-semibold text-slate-700">{selected.latitude}, {selected.longitude}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                <span>Dataset status: {selected.demo_water_status}</span>
                <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-slate-500 hover:text-slate-700">
                  <X className="w-3 h-3"/> Close
                </button>
              </div>
            </div>) : (<div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <MapPin className="w-8 h-8 mb-2 opacity-40"/>
              <p className="text-sm">Click a sample on the map to view its CSV details</p>
            </div>)}
        </Card>
      </div>
    </div>);
}
