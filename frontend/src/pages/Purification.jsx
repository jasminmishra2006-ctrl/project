import { Card, Badge } from '@/components/common/Card';
import { DecisionEngine } from '@/components/dashboard/DecisionEngine';
import { TreatmentComparison } from '@/components/dashboard/TreatmentComparison';
import { FilterHealth } from '@/components/dashboard/FilterHealth';
import { PurificationPipeline } from '@/components/dashboard/PurificationPipeline';
import { evaluateTreatment } from '@/services/decisionEngine';
import { getLatestSensorReading, getFilterHealth, getDataSource } from '@/services/waterDataService';
import { Filter } from 'lucide-react';
export function Purification() {
    const reading = getLatestSensorReading();
    const filterHealth = getFilterHealth();
    const plan = evaluateTreatment(reading);
    return (<div className="space-y-5">
      <Card title="Adaptive Purification Pipeline" subtitle={`Source: ${getDataSource()}`} right={<Badge color="blue">RULE-BASED</Badge>}>
        <PurificationPipeline stages={plan.stages}/>
      </Card>

      <Card title="Smart Decision Engine" subtitle="Current sensor readings and recommended treatment">
        <DecisionEngine reading={reading}/>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card title="Treatment Effectiveness" subtitle="Before vs after treatment verification">
          <TreatmentComparison reading={reading}/>
        </Card>
        <Card title="Filter Health" subtitle="Remaining life of purification components" right={<Filter className="w-4 h-4 text-slate-400"/>}>
          <FilterHealth items={filterHealth}/>
        </Card>
      </div>
    </div>);
}
