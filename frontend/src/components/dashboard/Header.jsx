import { Menu } from 'lucide-react';
export function Header({ onMenuClick, menuOpen = false }) {
  return (<header className="sticky top-0 z-30 flex min-h-[72px] items-center border-b border-[#d8d7cb] bg-[#FDFAF5] px-4 py-3 lg:px-6">
    <div className="flex items-center gap-3">
      <button type="button" onClick={onMenuClick} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-controls="primary-navigation" aria-expanded={menuOpen} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden">
        <Menu className="w-6 h-6" />
      </button>
      <div>
        <p className="hidden text-[10px] font-bold leading-tight tracking-[0.12em] text-[#898a7c] sm:block">RURAL WATER INTELLIGENCE</p>
        <h2 className="text-2xl font-semibold leading-tight text-[#30352e]">NEER-X</h2>
      </div>
    </div>
  </header>);
}
