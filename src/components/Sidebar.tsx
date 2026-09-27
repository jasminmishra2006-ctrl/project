import { Droplets, LayoutDashboard, Activity, Map, Filter, Brain, Bell, History, HeartPulse, X } from 'lucide-react';
import { StatusDot } from './ui/Card';

export type PageKey = 'dashboard' | 'live' | 'map' | 'purification' | 'ml' | 'alerts' | 'history' | 'system';

interface SidebarProps {
  current: PageKey;
  onNavigate: (page: PageKey) => void;
  open: boolean;
  onClose: () => void;
}

const NAV: { key: PageKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'live', label: 'Live Monitoring', icon: Activity },
  { key: 'map', label: 'Contamination Map', icon: Map },
  { key: 'purification', label: 'Purification', icon: Filter },
  { key: 'ml', label: 'ML Analytics', icon: Brain },
  { key: 'alerts', label: 'Alerts', icon: Bell },
  { key: 'history', label: 'History', icon: History },
  { key: 'system', label: 'System Health', icon: HeartPulse },
];

export function Sidebar({ current, onNavigate, open, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={onClose} />}

      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen w-64 bg-[#0f2747] text-slate-200 flex flex-col z-50
        transform transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">JalRakshak</h1>
              <p className="text-[11px] text-slate-400 leading-tight">Jharkhand Water Intelligence</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { onNavigate(key); onClose(); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                current === key
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Bottom status */}
        <div className="px-5 py-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">ESP32</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              <span className="text-xs font-medium text-green-400">SYSTEM ONLINE</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
