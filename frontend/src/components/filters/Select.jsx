import { useId } from 'react';

export function Select({ label, value, options, onChange, className = '' }) {
    const id = useId();
    return (<div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-xs font-medium text-slate-500">{label}</label>
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full min-w-0 cursor-pointer rounded-[8px] border border-[#d8d7cb] bg-[#FDFAF5] px-3 py-2 text-sm text-[#30352e] focus:border-[#4A7C59] focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/15">
        {options.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
      </select>
    </div>);
}
