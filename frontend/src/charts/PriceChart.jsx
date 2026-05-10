import { useEffect, useRef } from 'react';
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts';

/**
 * TradingView Lightweight Charts wrapper.
 * Supports area/line/candlestick variants.
 *
 * Props:
 *   data       Array<{ time, open?, high?, low?, close?, value? }>
 *   variant    'area' | 'candles' (default 'area')
 *   livePrice  optional latest price → updates the last bar
 *   height     pixel height (default 360)
 */
export default function PriceChart({ data = [], variant = 'area', livePrice, height = 360 }) {
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const seriesRef    = useRef(null);

  useEffect(() => {
    const chart = createChart(containerRef.current, {
      autoSize: true,
      height,
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#94a3b8',
        fontFamily: 'JetBrains Mono, monospace',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        timeVisible: true,
        secondsVisible: true,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(34,211,238,0.4)', style: LineStyle.Dashed, width: 1 },
        horzLine: { color: 'rgba(34,211,238,0.4)', style: LineStyle.Dashed, width: 1 },
      },
    });
    chartRef.current = chart;

    if (variant === 'candles') {
      seriesRef.current = chart.addCandlestickSeries({
        upColor: '#22c55e', downColor: '#ef4444',
        borderUpColor: '#22c55e', borderDownColor: '#ef4444',
        wickUpColor: '#22c55e',  wickDownColor: '#ef4444',
      });
    } else {
      seriesRef.current = chart.addAreaSeries({
        lineColor: '#22d3ee',
        topColor:  'rgba(34,211,238,0.45)',
        bottomColor: 'rgba(34,211,238,0.02)',
        lineWidth: 2,
      });
    }

    return () => chart.remove();
    // eslint-disable-next-line
  }, [variant]);

  useEffect(() => {
    if (!seriesRef.current || !data.length) return;
    if (variant === 'candles') {
      seriesRef.current.setData(
        data.map(d => ({
          time: d.time,
          open: d.open ?? d.close,
          high: d.high ?? d.close,
          low:  d.low  ?? d.close,
          close: d.close,
        })),
      );
    } else {
      seriesRef.current.setData(
        data.map(d => ({ time: d.time, value: d.close ?? d.value })),
      );
    }
    chartRef.current?.timeScale().fitContent();
  }, [data, variant]);

  // Live update of the last bar without resetting all data
  useEffect(() => {
    if (!seriesRef.current || !livePrice || !data.length) return;
    const last = data[data.length - 1];
    if (variant === 'candles') {
      seriesRef.current.update({
        time: last.time,
        open: last.open,
        high: Math.max(last.high, livePrice),
        low:  Math.min(last.low,  livePrice),
        close: livePrice,
      });
    } else {
      seriesRef.current.update({ time: last.time, value: livePrice });
    }
  }, [livePrice, data, variant]);

  return <div ref={containerRef} style={{ height }} className="w-full" />;
}
