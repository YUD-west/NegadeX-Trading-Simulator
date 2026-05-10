import { useMemo } from 'react';

/**
 * Lightweight inline SVG sparkline. Generates a polyline + soft area
 * fill based on a numeric series. No external library overhead.
 *
 * Props:
 *   data       Array<number|{value:number}>
 *   width      px (default 120)
 *   height     px (default 32)
 *   positive   force positive (cyan/bull) color regardless of data
 *   negative   force negative (bear) color regardless of data
 */
export default function Sparkline({ data = [], width = 120, height = 32, positive, negative }) {
  const series = useMemo(() => {
    return (data || [])
      .map(d => (typeof d === 'number' ? d : d?.value ?? d?.close ?? d?.price))
      .filter(v => typeof v === 'number' && !isNaN(v));
  }, [data]);

  if (series.length < 2) {
    return <div style={{ width, height }} className="opacity-40" />;
  }

  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const stepX = width / (series.length - 1);
  const points = series.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y];
  });

  const polyline = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = [
    `M0,${height}`,
    ...points.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`),
    `L${width},${height}`,
    'Z',
  ].join(' ');

  const trendUp = series[series.length - 1] >= series[0];
  const useUp = positive ?? (negative ? false : trendUp);
  const stroke = useUp ? '#4ade80' : '#f87171';
  const fillTop = useUp ? 'rgba(74,222,128,0.32)' : 'rgba(248,113,113,0.32)';
  const fillBot = useUp ? 'rgba(74,222,128,0.0)'  : 'rgba(248,113,113,0.0)';
  const gradId = `spark-${useUp ? 'up' : 'dn'}-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"  stopColor={fillTop} />
          <stop offset="100%" stopColor={fillBot} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <polyline
        points={polyline}
        fill="none"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
