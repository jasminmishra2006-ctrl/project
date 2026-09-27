import { useState } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { Dashboard } from '@/pages/Dashboard';
import { LiveMonitoring } from '@/pages/LiveMonitoring';
import { ContaminationMap } from '@/pages/ContaminationMap';
import { Purification } from '@/pages/Purification';
import { MLAnalytics } from '@/pages/MLAnalytics';
import { Alerts } from '@/pages/Alerts';
import { History } from '@/pages/History';
import { SystemHealth } from '@/pages/SystemHealth';
import { DashboardErrorBoundary } from '@/components/dashboard/DashboardErrorBoundary';
function App() {
    const [page, setPage] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    function renderPage() {
        switch (page) {
            case 'dashboard': return <Dashboard />;
            case 'live': return <LiveMonitoring />;
            case 'map': return <ContaminationMap />;
            case 'purification': return <Purification />;
            case 'ml': return <MLAnalytics />;
            case 'alerts': return <Alerts />;
            case 'history': return <History />;
            case 'system': return <SystemHealth />;
            default: return <Dashboard />;
        }
    }
      return (<div className="flex min-h-screen bg-[#FAF6F0]">
      <Sidebar current={page} onNavigate={setPage} open={sidebarOpen} onClose={() => setSidebarOpen(false)}/>
      <div className="flex-1 min-w-0 flex flex-col">
        <Header menuOpen={sidebarOpen} onMenuClick={() => setSidebarOpen((open) => !open)}/>
        <main className="app-main flex-1 p-4 lg:p-6 max-w-[1600px] mx-auto w-full">
          <DashboardErrorBoundary>{renderPage()}</DashboardErrorBoundary>
        </main>
      </div>
    </div>);
}
export default App;
