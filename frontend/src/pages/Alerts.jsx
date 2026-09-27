import { Card } from '@/components/common/Card';
import { AlertPanel } from '@/components/dashboard/AlertPanel';
import { getAlerts, getDataSource } from '@/services/waterDataService';
import { Bell } from 'lucide-react';
export function Alerts() {
    const alerts = getAlerts();
    const critical = alerts.filter(a => a.severity === 'critical').length;
    const warning = alerts.filter(a => a.severity === 'warning').length;
    const open = alerts.filter(a => a.status === 'OPEN').length;
    const resolved = alerts.filter(a => a.status === 'RESOLVED').length;
    return (<div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FDFAF5] rounded-[16px] border border-[#d8d7cb]/60 shadow-[0_2px_16px_rgba(46,50,48,0.06)] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Critical</p>
              <p className="text-2xl font-bold text-red-600">{critical}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <Bell className="w-5 h-5 text-red-500"/>
            </div>
          </div>
        </div>
        <div className="bg-[#FDFAF5] rounded-[16px] border border-[#d8d7cb]/60 shadow-[0_2px_16px_rgba(46,50,48,0.06)] p-4">
          <p className="text-xs text-slate-400">Warnings</p>
          <p className="text-2xl font-bold text-yellow-600">{warning}</p>
        </div>
        <div className="bg-[#FDFAF5] rounded-[16px] border border-[#d8d7cb]/60 shadow-[0_2px_16px_rgba(46,50,48,0.06)] p-4">
          <p className="text-xs text-slate-400">Open</p>
          <p className="text-2xl font-bold text-orange-600">{open}</p>
        </div>
        <div className="bg-[#FDFAF5] rounded-[16px] border border-[#d8d7cb]/60 shadow-[0_2px_16px_rgba(46,50,48,0.06)] p-4">
          <p className="text-xs text-slate-400">Resolved</p>
          <p className="text-2xl font-bold text-green-600">{resolved}</p>
        </div>
      </div>

      <Card title="Water Safety Alerts" subtitle={`Source: ${getDataSource()} — all recent alerts`}>
        <AlertPanel alerts={alerts}/>
      </Card>
    </div>);
}
