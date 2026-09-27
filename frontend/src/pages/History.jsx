import { useState } from 'react';
import { Card } from '@/components/common/Card';
import { Select } from '@/components/filters/Select';
import { MiniTrendChart } from '@/components/charts/WaterTrendChart';
import { getTrends, getDistrictNames, getDataSource } from '@/services/waterDataService';
import { RotateCcw } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
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
    function reset() {
        setDistrict('All Districts');
        setVillage('All Villages');
        setContaminant('All Contaminants');
        setDateRange('Last 30 Days');
    }
    return (<div className="space-y-5">
      <div className="bg-[#FDFAF5] rounded-[16px] border border-[#d8d7cb]/60 shadow-[0_2px_16px_rgba(46,50,48,0.06)] p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Select label="District" value={district} options={['All Districts', ...getDistrictNames()]} onChange={setDistrict}/>
          <Select label="Village" value={village} options={VILLAGES} onChange={setVillage}/>
          <Select label="Contaminant" value={contaminant} options={CONTAMINANTS} onChange={setContaminant}/>
          <Select label="Date Range" value={dateRange} options={DATE_RANGES} onChange={setDateRange}/>
          <button onClick={reset} className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
            <RotateCcw className="w-4 h-4"/> Reset
          </button>
        </div>
      </div>

      <Card title="Water Quality Score Over Time" subtitle={`Source: ${getDataSource()}`}>
        <MiniTrendChart data={trends30} param="score" height={220} color="#4a7c59"/>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card title="TDS Trend" subtitle="Last 30 days (weekly)">
          <MiniTrendChart data={trends30} param="tds" height={200} color="#705C30"/>
        </Card>
        <Card title="Turbidity Trend" subtitle="Last 30 days (weekly)">
          <MiniTrendChart data={trends30} param="turbidity" height={200} color="#8BA888"/>
        </Card>
      </div>

      <Card title="pH Trend" subtitle="Last 7 days (daily)">
        <MiniTrendChart data={trends7} param="ph" height={200} color="#4A7C59"/>
      </Card>

      <Card title="Contamination Trend" subtitle="Monthly contaminant distribution">
        <EmptyState title="No contamination history available" description="Monthly contaminant records are not available for the selected dataset." />
      </Card>

      <Card title="Treatment Success Rate" subtitle="Weekly treatment outcomes">
        <EmptyState title="No treatment history available" description="Verified before and after treatment outcomes are not available." />
      </Card>
    </div>);
}
