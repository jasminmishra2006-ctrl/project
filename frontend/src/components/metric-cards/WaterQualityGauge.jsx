const STATUS_COLORS = {
  safe: '#4F7D55',
  elevated: '#A56D16',
  warning: '#A56D16',
  high: '#A63E36',
  critical: '#A63E36',
  offline: '#657174',
  nodata: '#657174',
};

const GAUGE = { cx: 120, cy: 98, radius: 76, startX: 44, endX: 196 };

function pointAt(position, radius = GAUGE.radius) {
  const angle = Math.PI * (1 - position);
  return {
    x: GAUGE.cx + Math.cos(angle) * radius,
    y: GAUGE.cy - Math.sin(angle) * radius,
  };
}

export function WaterQualityGauge({ value, min, max, threshold, markers = [], status = 'nodata', label = 'Water quality reading' }) {
  const rangeIsValid = Number.isFinite(min) && Number.isFinite(max) && max > min;
  const numericValue = value === null || value === undefined || value === '' ? NaN : Number(value);
  const hasValue = rangeIsValid && Number.isFinite(numericValue) && status !== 'nodata' && status !== 'offline';
  const position = hasValue ? Math.max(0, Math.min(1, (numericValue - min) / (max - min))) : null;
  const endpoint = position === null ? null : pointAt(position);
  const pointerEnd = position === null ? null : pointAt(position, 34);
  const markerValues = [...markers, ...(threshold === undefined ? [] : [threshold])]
    .filter((marker, index, all) => rangeIsValid && Number.isFinite(marker) && all.indexOf(marker) === index);

  return (
    <svg className="water-quality-gauge" viewBox="0 0 240 112" role="img" aria-label={label}>
      <title>{label}</title>
      <path d={`M ${GAUGE.startX} ${GAUGE.cy} A ${GAUGE.radius} ${GAUGE.radius} 0 0 1 ${GAUGE.endX} ${GAUGE.cy}`} fill="none" stroke="#E9E5DD" strokeWidth="10" strokeLinecap="round" />
      {position !== null && position > 0 && endpoint && (
        <path d={`M ${GAUGE.startX} ${GAUGE.cy} A ${GAUGE.radius} ${GAUGE.radius} 0 0 1 ${endpoint.x.toFixed(2)} ${endpoint.y.toFixed(2)}`} fill="none" stroke={STATUS_COLORS[status] ?? STATUS_COLORS.nodata} strokeWidth="10" strokeLinecap="round" />
      )}
      {markerValues.map((marker) => {
        const markerPoint = pointAt(Math.max(0, Math.min(1, (marker - min) / (max - min))));
        const insidePoint = pointAt(Math.max(0, Math.min(1, (marker - min) / (max - min))), GAUGE.radius - 6);
        return <line key={marker} x1={insidePoint.x.toFixed(2)} y1={insidePoint.y.toFixed(2)} x2={markerPoint.x.toFixed(2)} y2={markerPoint.y.toFixed(2)} stroke="#6E746C" strokeWidth="2" strokeLinecap="round" />;
      })}
      {hasValue && pointerEnd && (
        <>
          <line x1={GAUGE.cx} y1={GAUGE.cy} x2={pointerEnd.x.toFixed(2)} y2={pointerEnd.y.toFixed(2)} stroke="#2E322F" strokeWidth="2" strokeLinecap="round" />
          <circle cx={GAUGE.cx} cy={GAUGE.cy} r="5" fill="#2E322F" />
          <circle cx={GAUGE.cx} cy={GAUGE.cy} r="2" fill="#FFFDF9" />
        </>
      )}
    </svg>
  );
}
