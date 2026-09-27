import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip as LeafletTooltip } from 'react-leaflet';
import type { DistrictAgg, RiskLevel } from '@/types';
import { RISK_COLORS } from '@/services/waterDataService';
import { Badge } from './ui/Card';

interface WaterQualityMapProps {
  districts: DistrictAgg[];
  contaminant: string;
  onSelect?: (d: DistrictAgg) => void;
  selected?: string;
}

// Jharkhand center: ~23.6, 85.3
const JK_CENTER: [number, number] = [23.6, 85.3];
const JK_ZOOM = 7;

function getContaminantValue(d: DistrictAgg, contaminant: string): number {
  const map: Record<string, number> = {
    Overall: d.riskLevel === 'nodata' ? -1 : ['safe', 'elevated', 'high', 'critical'].indexOf(d.riskLevel),
    Iron: d.iron,
    Arsenic: d.arsenic,
    Fluoride: d.fluoride,
    Calcium: d.calcium,
    Phosphorus: d.phosphorus,
    TDS: d.tds,
    pH: d.ph,
    Turbidity: d.turbidity,
  };
  return map[contaminant] ?? 0;
}

function classifyValue(d: DistrictAgg, contaminant: string): RiskLevel {
  if (contaminant === 'Overall') return d.riskLevel;
  if (d.riskLevel === 'nodata') return 'nodata';
  // Use the district's own risk as a proxy for individual contaminant coloring
  return d.riskLevel;
}

export function WaterQualityMap({ districts, contaminant, onSelect, selected }: WaterQualityMapProps) {
  return (
    <div className="relative w-full h-[420px] rounded-xl overflow-hidden border border-slate-200">
      <MapContainer center={JK_CENTER} zoom={JK_ZOOM} scrollWheelZoom={false} style={{ width: '100%', height: '100%' }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap &copy; CARTO'
        />
        {districts.map((d) => {
          const risk = classifyValue(d, contaminant);
          const color = RISK_COLORS[risk];
          const radius = d.riskLevel === 'critical' ? 14 : d.riskLevel === 'high' ? 12 : d.riskLevel === 'elevated' ? 10 : 8;
          return (
            <CircleMarker
              key={d.district}
              center={[d.latitude, d.longitude]}
              radius={radius}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 2 }}
              eventHandlers={{ click: () => onSelect?.(d) }}
            >
              <LeafletTooltip sticky>
                <div className="font-semibold">{d.district}</div>
                <div className="text-slate-500">Risk: {risk}</div>
              </LeafletTooltip>
              <Popup>
                <div className="space-y-1">
                  <div className="font-bold text-[#0f2747] text-base">{d.district}</div>
                  <div className="text-xs text-slate-500">Water Sources: {d.waterSources}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500">Current Risk:</span>
                    <Badge color={risk === 'safe' ? 'green' : risk === 'elevated' ? 'yellow' : risk === 'high' ? 'orange' : risk === 'critical' ? 'red' : 'gray'}>
                      {risk}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-600 mt-1">Main Contaminant: {d.mainIssue}</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1.5 text-xs">
                    <div className="text-slate-500">pH: <span className="font-medium text-slate-700">{d.ph || '—'}</span></div>
                    <div className="text-slate-500">TDS: <span className="font-medium text-slate-700">{d.tds || '—'} mg/L</span></div>
                    <div className="text-slate-500">Turbidity: <span className="font-medium text-slate-700">{d.turbidity || '—'} NTU</span></div>
                    <div className="text-slate-500">Temp: <span className="font-medium text-slate-700">{d.temperature || '—'}°C</span></div>
                    <div className="text-slate-500">Iron: <span className="font-medium text-slate-700">{d.iron || '—'}</span></div>
                    <div className="text-slate-500">Fluoride: <span className="font-medium text-slate-700">{d.fluoride || '—'}</span></div>
                  </div>
                  {d.improvementPct > 0 && (
                    <div className="text-xs text-green-600 mt-1 font-medium">Trend: improving +{d.improvementPct}%</div>
                  )}
                  {d.riskLevel === 'nodata' && (
                    <div className="text-xs text-slate-400 mt-1">Status: No sensor data available</div>
                  )}
                  <div className="text-xs text-slate-400 mt-1 pt-1 border-t border-slate-100">Last Updated: {d.lastUpdated}</div>
                  {onSelect && (
                    <button
                      onClick={() => onSelect(d)}
                      className="mt-2 text-xs text-blue-600 font-medium hover:underline"
                    >
                      View details →
                    </button>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Legend overlay */}
      <div className="absolute bottom-3 right-3 bg-white rounded-lg border border-slate-200 shadow-sm px-3 py-2 z-[1000]">
        <p className="text-xs font-semibold text-slate-600 mb-1.5">Risk Level</p>
        <div className="space-y-1">
          {[
            { label: 'Safe', color: RISK_COLORS.safe },
            { label: 'Elevated', color: RISK_COLORS.elevated },
            { label: 'High', color: RISK_COLORS.high },
            { label: 'Critical', color: RISK_COLORS.critical },
            { label: 'No Data', color: RISK_COLORS.nodata },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
              <span className="text-xs text-slate-600">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="absolute top-3 left-3 bg-white rounded-lg border border-slate-200 shadow-sm px-4 py-3 z-[1000] max-w-xs">
          {(() => {
            const d = districts.find((dd) => dd.district === selected);
            if (!d) return null;
            return (
              <div className="space-y-1">
                <div className="font-bold text-[#0f2747]">{d.district}</div>
                <div className="text-xs text-slate-500">Water Sources: {d.waterSources}</div>
                <div className="text-xs text-slate-600">Main Issue: {d.mainIssue}</div>
                <div className="text-xs text-slate-600">pH: {d.ph || '—'} | TDS: {d.tds || '—'} | Turbidity: {d.turbidity || '—'}</div>
                <div className="text-xs text-slate-400">Updated: {d.lastUpdated}</div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
