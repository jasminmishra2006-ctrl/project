import { Info } from 'lucide-react';

export function EmptyState({ title, description, icon: Icon = Info, className = '' }) {
  return (
    <div className={`flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl bg-slate-50 px-5 py-6 text-center text-slate-500 ${className}`} role="status">
      <Icon aria-hidden="true" className="h-5 w-5" />
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description && <p className="max-w-lg text-sm text-slate-500">{description}</p>}
    </div>
  );
}
