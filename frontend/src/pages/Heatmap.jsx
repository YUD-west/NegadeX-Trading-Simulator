import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { insights } from '../services/api';
import { useMarketStore } from '../store/marketStore';
import { fmt } from '../utils/format';
import PageHeader from '../components/PageHeader';
import LiveBars from '../components/LiveBars';
import { Activity, Info } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Sector heatmap. Each cell area scales with sqrt(marketCap) so the
 * largest names dominate visually but smaller ones remain readable.
 * Colour intensity tracks the % change.
 */
export default function Heatmap() {
  const [sectors, setSectors] = useState([]);
  const stocksLive = useMarketStore(s => s.stocks);
  const connected = useMarketStore(s => s.connected);

  useEffect(() => {
    let alive = true;
    const load = () => insights.heatmap().then(d => alive && setSectors(d.sectors || []));
    load();
    const id = setInterval(load, 6000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Replace static change% with live values from the socket stream
  const liveSectors = useMemo(() => sectors.map(sec => ({
    ...sec,
    items: sec.items.map(it => {
      const live = stocksLive[it.symbol];
      return live ? { ...it, price: live.price, changePercent: live.changePercent } : it;
    }),
  })), [sectors, stocksLive]);

  const colorFor = (pct) => {
    const clamp = Math.max(-6, Math.min(6, pct));
    const alpha = (Math.abs(clamp) / 6) * 0.85 + 0.06;
    if (clamp >= 0) return `rgba(34,197,94,${alpha})`;
    return `rgba(239,68,68,${alpha})`;
  };
  const glowFor = (pct) => {
    const clamp = Math.max(-6, Math.min(6, pct));
    const intensity = (Math.abs(clamp) / 6) * 26;
    return clamp >= 0
      ? `0 0 ${intensity}px rgba(74,222,128,0.45)`
      : `0 0 ${intensity}px rgba(248,113,113,0.45)`;
  };

  const overall = useMemo(() => {
    const all = liveSectors.flatMap(s => s.items);
    if (!all.length) return { adv: 0, dec: 0, avg: 0 };
    const adv = all.filter(x => x.changePercent > 0).length;
    const dec = all.filter(x => x.changePercent < 0).length;
    const avg = all.reduce((s, x) => s + (x.changePercent || 0), 0) / all.length;
    return { adv, dec, avg };
  }, [liveSectors]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Live distribution"
        title="Market Heatmap"
        subtitle="Tile size = √market cap · color & glow = % change · streamed live"
        icon={Activity}
        accent="cyan"
        actions={
          <div className="flex items-center gap-2">
            <span className="pill"><LiveBars /><span className="text-[10px] uppercase tracking-[0.18em]">{connected ? 'live' : 'offline'}</span></span>
            <span className="pill text-[11px]">
              <span className="text-bull-300">{overall.adv} up</span>
              <span className="text-slate-700">·</span>
              <span className="text-bear-300">{overall.dec} down</span>
              <span className="text-slate-700">·</span>
              <span className="text-slate-300">avg {fmt.pct(overall.avg, 2)}</span>
            </span>
          </div>
        }
      />

      {/* Legend */}
      <div className="card p-3 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-4 rounded" style={{ background: 'rgba(239,68,68,0.85)', boxShadow: glowFor(-6) }} /> -6%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-4 rounded" style={{ background: 'rgba(239,68,68,0.4)' }} /> -3%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-4 rounded bg-white/10" /> 0
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-4 rounded" style={{ background: 'rgba(34,197,94,0.4)' }} /> +3%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-4 rounded" style={{ background: 'rgba(34,197,94,0.85)', boxShadow: glowFor(6) }} /> +6%
          </span>
        </div>
        <div className="hidden sm:block">{liveSectors.length} sectors · {liveSectors.flatMap(s => s.items).length} symbols</div>
      </div>

      <div className="space-y-4">
        {liveSectors.map((sec, sIdx) => {
          const weights = sec.items.map(it => Math.sqrt(it.marketCap));
          const totalW  = weights.reduce((a, b) => a + b, 0);
          const sectorAvg = sec.items.reduce((s, x) => s + (x.changePercent || 0), 0) / Math.max(1, sec.items.length);
          const sectorUp = sectorAvg >= 0;
          return (
            <motion.div
              key={sec.sector}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sIdx * 0.05 }}
              className="card p-4 relative overflow-hidden">
              <div className={`absolute inset-x-0 top-0 h-px ${sectorUp ? 'bg-gradient-to-r from-transparent via-bull-400/40 to-transparent' : 'bg-gradient-to-r from-transparent via-bear-400/40 to-transparent'}`} />
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <h2 className="font-display font-semibold">{sec.sector}</h2>
                  <span className={`text-xs num ${sectorUp ? 'text-bull-300' : 'text-bear-300'}`}>
                    {fmt.pct(sectorAvg, 2)}
                  </span>
                </div>
                <span className="pill text-[11px]">
                  <span className="text-slate-500">Σ Mkt Cap</span>
                  <span className="num text-slate-200">{fmt.compact(sec.totalCap)}</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sec.items.map((it, i) => {
                  const ratio = weights[i] / totalW;
                  const widthPct = Math.max(12, Math.min(38, ratio * 100 * 1.6));
                  return (
                    <Link
                      key={it.symbol}
                      to={`/trade/${it.symbol}`}
                      className="rounded-lg p-3 border border-white/10 hover:border-white/40 transition flex flex-col justify-between min-h-[88px] hover:scale-[1.02]"
                      style={{
                        flex: `1 1 ${widthPct}%`,
                        background: colorFor(it.changePercent),
                        boxShadow: glowFor(it.changePercent),
                      }}>
                      <div>
                        <div className="font-bold text-sm text-white drop-shadow">{it.symbol}</div>
                        <div className="text-[10px] text-white/80 truncate">{it.name}</div>
                      </div>
                      <div className="flex items-end justify-between mt-2">
                        <span className="text-[11px] num text-white/95 font-semibold">{fmt.money(it.price)}</span>
                        <span className="num text-xs font-bold text-white drop-shadow">
                          {it.changePercent > 0 ? '+' : ''}{it.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="card p-4 flex items-start gap-3 text-xs text-slate-500">
        <Info size={14} className="text-cyan-300 mt-0.5 shrink-0" />
        <div>
          Heatmap groups stocks by sector. Tile width is proportional to <span className="text-slate-300">√market cap</span> so mega-caps dominate without hiding smaller names. Click any tile to jump to its trade desk.
        </div>
      </div>
    </div>
  );
}
