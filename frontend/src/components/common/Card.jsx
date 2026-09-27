export function Card({ id, title, subtitle, right, children, className = '', bodyClassName = '' }) {
  return (<div id={id} className={`min-w-0 overflow-hidden bg-[#FDFAF5] rounded-[16px] border border-[#d8d7cb]/60 shadow-[0_2px_16px_rgba(46,50,48,0.06)] ${className}`}>
    {(title || right) && (<div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 pb-3 border-b border-[#E7EEF5]">
      <div className="min-w-0 flex-1">
        {title && <h3 className="break-words text-sm font-semibold text-slate-800">{title}</h3>}
        {subtitle && <p className="mt-0.5 break-words text-xs text-slate-400">{subtitle}</p>}
      </div>
      {right && <div className="min-w-0 max-w-full">{right}</div>}
    </div>)}
    <div className={`min-w-0 p-4 ${bodyClassName}`}>{children}</div>
  </div>);
}
export function Badge({ color = 'gray', children, className = '' }) {
  const colors = {
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    gray: 'bg-slate-50 text-slate-500 border-slate-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colors[color]} ${className}`}>
    {children}
  </span>);
}
export function StatusDot({ color = 'green' }) {
  const colors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    gray: 'bg-slate-400',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[color] ?? colors.gray}`} />;
}
