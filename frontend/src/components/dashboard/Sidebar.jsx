import { Droplets, LayoutDashboard, Activity, Map, Filter, Brain, Bell, History, HeartPulse, X } from 'lucide-react';
const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'live', label: 'Live Monitoring', icon: Activity },
  { key: 'map', label: 'Contamination Map', icon: Map },
  { key: 'purification', label: 'Purification', icon: Filter },
  { key: 'ml', label: 'ML Analytics', icon: Brain },
  { key: 'alerts', label: 'Alerts', icon: Bell },
  { key: 'history', label: 'History', icon: History },
  { key: 'system', label: 'System Health', icon: HeartPulse },
];
export function Sidebar({ current, onNavigate, open, onClose }) {
  return (<>
    {/* Mobile overlay */}
    {open && <button type="button" aria-label="Close navigation" className="fixed inset-0 z-40 cursor-default bg-[#30352e]/[0.28] lg:hidden" onClick={onClose} />}

    <aside className={`
        fixed lg:sticky top-0 left-0 h-screen w-64 bg-[#F3EDE3] text-slate-600 flex flex-col z-50 rounded-r-[12px] border-r border-[#d8d7cb] shadow-[0_4px_20px_rgba(46,50,48,0.06)]
        transform transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `} id="primary-navigation" aria-label="Primary navigation">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-[#d8d7cb]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] bg-[#DDEADE] flex items-center justify-center">
            <Droplets className="w-6 h-6 text-[#4A7C59]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#30352e] leading-tight">NEER-X</h1>
            <p className="text-[11px] text-[#898a7c] leading-tight">Detect.Decide.Purify.Verify</p>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close navigation" className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#898a7c] hover:bg-[#FFFDF9] hover:text-[#4A7C59] lg:hidden">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ key, label, icon: Icon }) => (<button type="button" key={key} aria-current={current === key ? 'page' : undefined} onClick={() => { onNavigate(key); onClose(); }} className={`min-h-11 w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${current === key
          ? 'bg-[#DDEADE] text-[#34583F] border-l-[3px] border-[#4A7C59] font-bold'
          : 'text-[#686d60] hover:bg-[#FFFDF9] hover:text-[#4A7C59]'}`}>
          <Icon className="w-[18px] h-[18px] flex-shrink-0" />
          {label}
        </button>))}
      </nav>

    </aside>
  </>);
}
