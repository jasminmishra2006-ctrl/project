import rawJson from '@/data/waterData.json';
import { THRESHOLDS } from './thresholds';
const data = rawJson;
export function getDataSource() {
    return data.dataSource;
}
export function getLastUpdated() {
    return data.lastUpdated;
}
export function getDistricts() {
    return data.districts;
}
export function getDistrictNames() {
    return data.districts.map((d) => d.district).sort();
}
export function getBlocks() {
    return Array.from(new Set(data.districts.map((d) => d.block))).sort();
}
export function getWaterSources() {
    return Array.from(new Set(data.districts.map((d) => d.waterSource))).sort();
}
export function getLatestSensorReading() {
    return data.latestReading;
}
export function getTrends(range) {
    const key = range === '7d' ? '7d' : range === '30d' ? '30d' : '24h';
    return data.trends[key] ?? data.trends['24h'];
}
export function getContaminationData() {
    return data.contaminationDistribution;
}
export function getAlerts() {
    return data.alerts;
}
export function getSensorHealth() {
    return data.sensorHealth;
}
export function getImprovementAreas() {
    return data.improvementAreas;
}
export function getFilterHealth() {
    const fh = data.latestReading.filterHealth;
    const items = [
        { name: 'Sediment Filter', percent: fh.sediment, status: classifyFilter(fh.sediment), lastService: '12 Aug 2026', nextMaintenance: '28 Oct 2026' },
        { name: 'Activated Carbon', percent: fh.carbon, status: classifyFilter(fh.carbon), lastService: '30 Jul 2026', nextMaintenance: '15 Oct 2026' },
        { name: 'Ultrafiltration', percent: fh.ultrafiltration, status: classifyFilter(fh.ultrafiltration), lastService: '05 Sep 2026', nextMaintenance: '20 Nov 2026' },
        { name: 'UV System', percent: fh.uv, status: classifyFilter(fh.uv), lastService: '10 Sep 2026', nextMaintenance: '10 Dec 2026' },
        { name: 'RO Membrane', percent: fh.ro, status: classifyFilter(fh.ro), lastService: '22 Aug 2026', nextMaintenance: '22 Nov 2026' },
    ];
    return items;
}
function classifyFilter(pct) {
    if (pct >= 75)
        return 'healthy';
    if (pct >= 50)
        return 'monitor';
    return 'replacement';
}
export function getWaterReadings(filters) {
    let result = data.districts;
    if (filters) {
        if (filters.district && filters.district !== 'All Districts') {
            result = result.filter((d) => d.district === filters.district);
        }
        if (filters.block && filters.block !== 'All Blocks') {
            result = result.filter((d) => d.block === filters.block);
        }
        if (filters.waterSource && filters.waterSource !== 'All Sources') {
            result = result.filter((d) => d.waterSource === filters.waterSource);
        }
    }
    return result;
}
export function getDistrictData(districtName) {
    return data.districts.find((d) => d.district === districtName);
}
// ---- Risk classification (range-based for pH/temperature, progressive for others) ----
export function classifyPH(value) {
    if (value === 0)
        return 'nodata';
    const t = THRESHOLDS.ph;
    if (value >= t.safe.min && value <= t.safe.max)
        return 'safe';
    if (value >= t.elevated.min && value <= t.elevated.max)
        return 'elevated';
    if (value >= t.high.min && value <= t.high.max)
        return 'high';
    return 'critical';
}
export function classifyTDS(value) {
    if (value === 0)
        return 'nodata';
    const t = THRESHOLDS.tds;
    if (value <= t.safe)
        return 'safe';
    if (value <= t.elevated)
        return 'elevated';
    if (value <= t.high)
        return 'high';
    return 'critical';
}
export function classifyTurbidity(value) {
    if (value === 0)
        return 'nodata';
    const t = THRESHOLDS.turbidity;
    if (value <= t.safe)
        return 'safe';
    if (value <= t.elevated)
        return 'elevated';
    if (value <= t.high)
        return 'high';
    return 'critical';
}
export function classifyTemperature(value) {
    if (value === 0)
        return 'nodata';
    const t = THRESHOLDS.temperature;
    if (value >= t.safe.min && value <= t.safe.max)
        return 'safe';
    if (value >= t.elevated.min && value <= t.elevated.max)
        return 'elevated';
    if (value >= t.high.min && value <= t.high.max)
        return 'high';
    return 'critical';
}
export function riskToLabel(risk) {
    switch (risk) {
        case 'safe': return 'Normal';
        case 'elevated': return 'Elevated';
        case 'high': return 'High';
        case 'critical': return 'Critical';
        case 'nodata': return 'No Data';
    }
}
export const RISK_COLORS = {
    safe: '#4E7A50',
    elevated: '#B9791C',
    high: '#A96923',
    critical: '#A74735',
    nodata: '#83786E',
};
export const RISK_BG = {
    safe: 'bg-green-50 text-green-700 border-green-200',
    elevated: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    high: 'bg-orange-50 text-orange-700 border-orange-200',
    critical: 'bg-red-50 text-red-700 border-red-200',
    nodata: 'bg-gray-50 text-gray-500 border-gray-200',
};
export function getAlertsForDistricts(districtNames) {
    if (districtNames.length === 0)
        return data.alerts;
    return data.alerts.filter(a => districtNames.includes(a.location));
}
export function getContaminationDataForDistricts(districts) {
    if (districts.length === 0 || districts.length === data.districts.length)
        return data.contaminationDistribution;
    // Recalculate distribution based on filtered districts' mainIssue
    const issueMap = {
        'High TDS': { count: 0, name: 'High TDS', color: '#B9791C' },
        'Turbidity': { count: 0, name: 'High Turbidity', color: '#7A596A' },
        'Iron': { count: 0, name: 'Iron', color: '#A96923' },
        'Fluoride': { count: 0, name: 'Fluoride', color: '#8C3C3C' },
        'Arsenic': { count: 0, name: 'Arsenic', color: '#A74735' },
        'Calcium': { count: 0, name: 'Calcium', color: '#83786E' },
        'None': { count: 0, name: 'Other', color: '#83786E' },
        'No Data': { count: 0, name: 'Other', color: '#83786E' },
    };
    districts.forEach(d => {
        const issue = issueMap[d.mainIssue];
        if (issue)
            issue.count++;
    });
    const total = Object.values(issueMap).reduce((s, v) => s + v.count, 0);
    if (total === 0)
        return [];
    const result = [];
    const grouped = {};
    Object.values(issueMap).forEach(v => {
        if (v.count > 0) {
            if (!grouped[v.name])
                grouped[v.name] = { name: v.name, count: 0, color: v.color };
            grouped[v.name].count += v.count;
        }
    });
    Object.values(grouped).forEach(v => {
        result.push({ name: v.name, value: Math.round((v.count / total) * 100), samples: v.count, color: v.color });
    });
    return result.sort((a, b) => b.value - a.value);
}
// ---- Simulated polling for live data (clearly labeled DEMO) ----
export function fetchLatestSensorData() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ reading: data.latestReading, isDemo: true });
        }, 300);
    });
}
