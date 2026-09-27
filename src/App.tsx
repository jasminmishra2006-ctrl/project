import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import type { PageKey } from '@/components/Sidebar';
import { Dashboard } from '@/pages/Dashboard';
import { LiveMonitoring } from '@/pages/LiveMonitoring';
import { ContaminationMap } from '@/pages/ContaminationMap';
import { Purification } from '@/pages/Purification';
import { MLAnalytics } from '@/pages/MLAnalytics';
import { Alerts } from '@/pages/Alerts';
import { History } from '@/pages/History';
import { SystemHealth } from '@/pages/SystemHealth';

function App() {
  const [page, setPage] = useState<PageKey>('dashboard');
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
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar current={page} onNavigate={setPage} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] mx-auto w-full">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;
