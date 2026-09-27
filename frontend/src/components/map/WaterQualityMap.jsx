import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, Tooltip as LeafletTooltip } from 'react-leaflet';
import { RISK_COLORS, riskToLabel, classifyPH, classifyTDS, classifyTurbidity, classifyTemperature } from '@/services/waterDataService';
import { THRESHOLDS } from '@/services/thresholds';
import { Badge } from '@/components/common/Card';
// Jharkhand center: ~23.6, 85.3
const JK_CENTER = [23.6, 85.3];
const JK_ZOOM = 7;
const DISTRICT_ALIASES = {
    hazaribag: 'hazaribagh',
    'purba singhbhum': 'east singhbhum',
};

function normalizeDistrictName(name) {
    const normalized = String(name ?? '')
        .normalize('NFKC')
        .trim()
        .toLowerCase()
        .replace(/\bdistrict\b/g, ' ')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim()
        .replace(/\s+/g, ' ');
    return DISTRICT_ALIASES[normalized] ?? normalized;
}

function getRecordId(record) {
    return record.sampleId ?? record.district;
}

function getRecordName(record) {
    return record.sampleId ? `${record.city} · ${record.sampleId}` : record.district;
}

function isValidCoordinate(latitude, longitude) {
    return typeof latitude === 'number' && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
        && typeof longitude === 'number' && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

function classifyValue(d, contaminant) {
    if (d.sampleId && contaminant !== 'Overall') {
        switch (contaminant) {
            case 'pH': return d.ph == null ? 'nodata' : classifyPH(d.ph);
            case 'TDS': return d.tds == null ? 'nodata' : classifyTDS(d.tds);
            case 'Turbidity': return d.turbidity == null ? 'nodata' : classifyTurbidity(d.turbidity);
            case 'Temperature': return d.temperature == null ? 'nodata' : classifyTemperature(d.temperature);
            case 'Fluoride': {
                const value = d.fluoride_mg_l;
                const threshold = THRESHOLDS.fluoride;
                if (value == null) return 'nodata';
                if (value <= threshold.safe) return 'safe';
                if (value <= threshold.elevated) return 'elevated';
                if (value <= threshold.high) return 'high';
                return 'critical';
            }
            default: return d.riskLevel;
        }
    }
    if (contaminant === 'Overall')
        return d.riskLevel;
    if (d.riskLevel === 'nodata')
        return 'nodata';
    // Use the district's own risk as a proxy for individual contaminant coloring
    return d.riskLevel;
}
export function WaterQualityMap({ districts, contaminant, onSelect, selected, boundaryUrl = '/data/jharkhand.geojson', center = JK_CENTER, zoom = JK_ZOOM }) {
    const [boundaryData, setBoundaryData] = useState(null);
    const [boundaryError, setBoundaryError] = useState(false);
    const validDistricts = useMemo(() => Array.isArray(districts)
        ? districts.filter((district) => district
            && (typeof district.district === 'string' || (typeof district.sampleId === 'string' && typeof district.city === 'string'))
            && isValidCoordinate(district.latitude, district.longitude))
        : [], [districts]);
    const districtsRef = useRef(validDistricts);
    const onSelectRef = useRef(onSelect);

    useEffect(() => {
        districtsRef.current = validDistricts;
        onSelectRef.current = onSelect;
        if (Array.isArray(districts) && validDistricts.length !== districts.length) {
            console.warn(`Skipping ${districts.length - validDistricts.length} invalid district map record(s).`);
        }
    }, [districts, validDistricts, onSelect]);

    useEffect(() => {
        let active = true;
        setBoundaryError(false);
        if (!boundaryUrl) {
            setBoundaryData(null);
            return () => { active = false; };
        }
        fetch(boundaryUrl)
            .then(response => {
                if (!response.ok) throw new Error(`District boundary request failed (${response.status})`);
                return response.json();
            })
            .then(data => { if (active) setBoundaryData(data); })
            .catch(() => { if (active) setBoundaryError(true); });
        return () => { active = false; };
    }, [boundaryUrl]);

    function getDistrict(feature) {
        const featureName = normalizeDistrictName(feature?.properties?.Dist_Name);
        return districtsRef.current.find(district => normalizeDistrictName(district.district) === featureName);
    }

    function styleBoundary(feature) {
        const district = getDistrict(feature);
        const risk = district ? classifyValue(district, contaminant) : 'nodata';
        const isSelected = district?.district === selected;
        return {
            color: isSelected ? '#365E43' : '#8b927f',
            weight: isSelected ? 3 : 1,
            opacity: isSelected ? 0.95 : 0.65,
            fillColor: RISK_COLORS[risk] ?? RISK_COLORS.nodata,
            fillOpacity: isSelected ? 0.2 : district ? 0.08 : 0.015,
        };
    }

    function bindDistrictSelection(feature, layer) {
        const name = feature?.properties?.Dist_Name;
        const district = getDistrict(feature);
        if (!name) return;
        const label = district ? (riskToLabel(classifyValue(district, contaminant)) ?? 'No Data') : 'No Data';
        layer.bindTooltip(`${name} · ${label}`, { sticky: true });
        layer.on('click', () => {
            const currentDistrict = getDistrict(feature);
            if (currentDistrict) onSelectRef.current?.(currentDistrict);
        });
    }

    return (<div className="water-map relative w-full rounded-xl overflow-hidden border border-slate-200">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} style={{ width: '100%', height: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'/>
        {boundaryData && <GeoJSON data={boundaryData} style={styleBoundary} onEachFeature={bindDistrictSelection} />}
        {validDistricts.map((d) => {
            const risk = classifyValue(d, contaminant);
            const color = RISK_COLORS[risk];
            const radius = d.riskLevel === 'critical' ? 14 : d.riskLevel === 'high' ? 12 : d.riskLevel === 'elevated' ? 10 : 8;
            return (<CircleMarker key={getRecordId(d)} center={[d.latitude, d.longitude]} radius={radius} pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 2 }} eventHandlers={{ click: () => onSelect?.(d) }}>
              <LeafletTooltip sticky>
                <div className="font-semibold">{getRecordName(d)}</div>
                <div className="text-slate-500">{d.sampleId ? `Sample status: ${d.demo_water_status}` : `Risk: ${risk}`}</div>
              </LeafletTooltip>
              <Popup>
                {d.sampleId ? <div className="space-y-1">
                  <div className="font-bold text-[#30352e] text-base">{d.city}, {d.state}</div>
                  <div className="text-xs text-slate-600">Sample: {d.sampleId} · {d.sample_date}</div>
                  <div className="text-xs text-slate-600">Testing source: {d.testing_source}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500">CSV status:</span>
                    <Badge color={d.riskLevel === 'safe' ? 'green' : d.riskLevel === 'elevated' ? 'yellow' : d.riskLevel === 'high' ? 'orange' : d.riskLevel === 'critical' ? 'red' : 'gray'}>{d.demo_water_status || 'No Data'}</Badge>
                    {['pH', 'TDS', 'Turbidity', 'Temperature', 'Fluoride'].includes(contaminant) && <span className="text-xs text-slate-500">{contaminant} rating: {riskToLabel(risk) ?? 'No Data'}</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1.5 text-xs">
                    {[
                      ['pH', d.ph, ''], ['TDS', d.tds, 'mg/L'], ['Turbidity', d.turbidity, 'NTU'],
                      ['Temperature', d.temperature, '°C'], ['Hardness', d.hardness_mg_l_as_caco3, 'mg/L as CaCO₃'],
                      ['Residual chlorine', d.residual_free_chlorine_mg_l, 'mg/L'], ['Ammonia', d.ammonia_mg_l, 'mg/L'],
                      ['Fluoride', d.fluoride_mg_l, 'mg/L'], ['Nitrate', d.nitrate_mg_l, 'mg/L'],
                      ['E. coli', d.e_coli_cfu_100ml, 'CFU/100mL'], ['Fecal coliform', d.fecal_coliform_cfu_100ml, 'CFU/100mL'],
                    ].filter(([, value]) => typeof value === 'number' && Number.isFinite(value)).map(([label, value, unit]) => (
                      <div key={label} className="text-slate-500">{label}: <span className="font-medium text-slate-700">{value} {unit}</span></div>
                    ))}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Coordinates: {d.latitude}, {d.longitude}</div>
                </div> : <div className="space-y-1">
                  <div className="font-bold text-[#30352e] text-base">{d.district}</div>
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
                  {d.improvementPct > 0 && (<div className="text-xs text-green-600 mt-1 font-medium">Trend: improving +{d.improvementPct}%</div>)}
                  {d.riskLevel === 'nodata' && (<div className="text-xs text-slate-400 mt-1">Status: No sensor data available</div>)}
                  <div className="text-xs text-slate-400 mt-1 pt-1 border-t border-slate-100">Last Updated: {d.lastUpdated}</div>
                  {onSelect && (<button onClick={() => onSelect(d)} className="mt-2 text-xs text-blue-600 font-medium hover:underline">
                      View details →
                    </button>)}
                </div>}
              </Popup>
            </CircleMarker>);
        })}
      </MapContainer>

      {boundaryError && <div className="absolute left-3 top-3 z-[1000] max-w-[min(90%,24rem)] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm" role="status">District boundaries are unavailable. Available reading markers remain on the map.</div>}

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
        ].map((l) => (<div key={l.label} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }}/>
              <span className="text-xs text-slate-600">{l.label}</span>
            </div>))}
        </div>
      </div>

      {selected && (<div className="absolute top-3 left-3 bg-white rounded-lg border border-slate-200 shadow-sm px-4 py-3 z-[1000] max-w-xs">
          {(() => {
                const d = validDistricts.find((record) => getRecordId(record) === selected);
                if (!d)
                    return null;
                if (d.sampleId) return (<div className="space-y-1">
                  <div className="font-bold text-[#30352e]">{d.city}, {d.state}</div>
                  <div className="text-xs text-slate-500">Sample {d.sampleId} · {d.sample_date}</div>
                  <div className="text-xs text-slate-600">{d.demo_water_status}</div>
                </div>);
                return (<div className="space-y-1">
                <div className="font-bold text-[#30352e]">{d.district}</div>
                <div className="text-xs text-slate-500">Water Sources: {d.waterSources}</div>
                <div className="text-xs text-slate-600">Main Issue: {d.mainIssue}</div>
                <div className="text-xs text-slate-600">pH: {d.ph || '—'} | TDS: {d.tds || '—'} | Turbidity: {d.turbidity || '—'}</div>
                <div className="text-xs text-slate-400">Updated: {d.lastUpdated}</div>
              </div>);
            })()}
        </div>)}
    </div>);
}
