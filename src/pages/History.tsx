import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { MiniTrendChart } from '@/components/WaterTrendChart';
import { getTrends, getDistrictNames, getDataSource } from '@/services/waterDataService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { RotateCcw } from 'lucide-react';

const VILLAGES = ['All Villages', 'Govindpur', 'Chandrapura', 'Kanke', 'Patratu', 'Barhi', 'Ghatshila', 'Dumka', 'Chatra', 'Latehar'];
const CONTAMINANTS = ['All Contaminants', 'Iron', 'Fluoride', 'Arsenic', 'TDS', 'Turbidity'];
const DATE_RANGES = ['Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'Last 12 Months'];

export function History() {
  const [district, setDistrict] = useState('All Districts');
  const [village, setVillage] = useState('All Villages');
  const [contaminant, setContaminant] = useState('All Contaminants');
  const [dateRange, setDateRange] = useState('Last 30 Days');

  const trends30 = getTrends('30d');
  const trends7 = getTrends('7d');
  const trends24 = getTrends('24h');

  const treatmentData = [
    { week: 'W1', success: 72, failed: 28 },
    { week: 'W2', success: 80, failed: 20 },
    { week: 'W3', success: 85, failed: 15 },
    { week: 'W4', success: 91, failed: 9 },
  ];

  const contaminationTrend = [
    { month: 'May', iron: 45, fluoride: 28, arsenic: 18 },
    { month: 'Jun', iron: 42, fluoride: 26, arsenic: 16 },
    { month: 'Jul', iron: 40, fluoride: 25, arsenic: 15 },
    { month: 'Aug', iron: 38, fluoride: 24, arsenic: 15 },
    { month: 'Sep', iron: 38, fluoride: 24, arsenic: 15 },
  ];

  function reset() {
    setDistrict('All Districts');
    setVillage('All Villages');
    setContaminant('All Contaminants');
    setDateRange('Last 30 Days');
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Select label="District" value={district} options={['All Districts', ...getDistrictNames()]} onChange={setDistrict} />
          <Select label="Village" value={village} options={VILLAGES} onChange={setVillage} />
          <Select label="Contaminant" value={contaminant} options={CONTAMINANTS} onChange={setContaminant} />
          <Select label="Date Range" value={dateRange} options={DATE_RANGES} onChange={setDateRange} />
          <button onClick={reset} className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>

      <Card title="Water Quality Score Over Time" subtitle={`Source: ${getDataSource()}`}>
        <MiniTrendChart data={trends30} param="score" height={220} color="#22c55e" />
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card title="TDS Trend" subtitle="Last 30 days (weekly)">
          <MiniTrendChart data={trends30} param="tds" height={200} color="#f97316" />
        </Card>
        <Card title="Turbidity Trend" subtitle="Last 30 days (weekly)">
          <MiniTrendChart data={trends30} param="turbidity" height={200} color="#8b5cf6" />
        </Card>
      </div>

      <Card title="pH Trend" subtitle="Last 7 days (daily)">
        <MiniTrendChart data={trends7} param="ph" height={200} color="#2563eb" />
      </Card>

      <Card title="Contamination Trend" subtitle="Monthly contaminant distribution">
        <div style={{ height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={contaminationTrend} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="iron" name="Iron (%)" fill="#f97316" radius={[3, 3, 0, 0]} />
              <Bar dataKey="fluoride" name="Fluoride (%)" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="arsenic" name="Arsenic (%)" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Treatment Success Rate" subtitle="Weekly treatment outcomes">
        <div style={{ height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={treatmentData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" unit="%" />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="success" name="Success Rate (%)" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="failed" name="Failed (%)" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
