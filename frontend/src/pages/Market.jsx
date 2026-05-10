import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMarketStore } from '../store/marketStore';
import { stocks as stocksApi, watchlist as wlApi } from '../services/api';
import { fmt } from '../utils/format';
import PriceCell from '../components/PriceCell';
import ChangeBadge from '../components/ChangeBadge';
import Sparkline from '../components/Sparkline';
import PageHeader from '../components/PageHeader';
import LiveBars from '../components/LiveBars';
import { Search, Star, ArrowUpDown, X, BarChart3, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function Market() {
  const stocks = useMarketStore(s => s.stocks);
  const connected = useMarketStore(s => s.connected);
  const [sectors, setSectors] = useState([]);
  const [filter, setFilter] = useState({ search: '', sector: '', sort: 'changePercent', dir: 'desc' });
  const [wl, setWl] = useState(new Set());
  const [view, setView] = useState('all'); // all | watch

  useEffect(() => {
    stocksApi.sectors().then(d => setSectors(d.sectors || []));
    wlApi.list().then(d => setWl(new Set(d.symbols || []))).catch(() => {});
  }, []);

  const rows = useMemo(() => {
    let arr = Object.values(stocks);
    if (view === 'watch') arr = arr.filter(s => wl.has(s.symbol));
    if (filter.search) {
      const q = filter.search.toLowerCase();
      arr = arr.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    }
    if (filter.sector) arr = arr.filter(s => s.sector === filter.sector);
    arr = [...arr].sort((a, b) => {
      const av = a[filter.sort] ?? 0;
      const bv = b[filter.sort] ?? 0;
      if (typeof av === 'string') {
        return filter.dir === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv);
      }
      return filter.dir === 'desc' ? bv - av : av - bv;
    });
    return arr;
  }, [stocks, filter, wl, view]);

  const stats = useMemo(() => {
    const arr = rows;
    const advancing = arr.filter(s => s.changePercent > 0).length;
    const declining = arr.filter(s => s.changePercent < 0).length;
    const avg = arr.reduce((s, x) => s + (x.changePercent || 0), 0) / Math.max(1, arr.length);
    const totalCap = arr.reduce((s, x) => s + (x.marketCap || 0), 0);
    return { advancing, declining, avg, totalCap };
  }, [rows]);

  const toggleWl = async (sym) => {
    if (wl.has(sym)) {
      await wlApi.remove(sym);
      setWl(prev => { const n = new Set(prev); n.delete(sym); return n; });
      toast.success(`${sym} removed from watchlist`);
    } else {
      await wlApi.add(sym);
      setWl(prev => new Set(prev).add(sym));
      toast.success(`${sym} added to watchlist`);
    }
  };

  const setSort = (col) => {
    setFilter(f => ({
      ...f,
      sort: col,
      dir: f.sort === col ? (f.dir === 'desc' ? 'asc' : 'desc') : 'desc',
    }));
  };

  const SortHeader = ({ col, children, align = 'left' }) => (
    <button onClick={() => setSort(col)}
      className={`group inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-slate-500 hover:text-slate-200 transition ${align === 'right' ? 'ml-auto' : ''}`}>
      {children}
      <ArrowUpDown size={11} className={filter.sort === col ? 'text-cyan-300' : 'opacity-40 group-hover:opacity-100'} />
    </button>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Addis Exchange"
        title="Market"
        subtitle={`${rows.length} symbols · live prices streamed via Socket.IO`}
        icon={BarChart3}
        accent="cyan"
        actions={
          <span className="pill">
            <LiveBars />
            <span className="text-[10px] uppercase tracking-[0.18em]">{connected ? 'live' : 'offline'}</span>
          </span>
        }
      />

      {/* Mini stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat label="Symbols listed" value={rows.length} accent="cyan" />
        <MiniStat label="Advancing"      value={stats.advancing} accent="bull" />
        <MiniStat label="Declining"      value={stats.declining} accent="bear" />
        <MiniStat label="Σ Mkt Cap"      value={fmt.compact(stats.totalCap)} accent="violet" />
      </div>

      {/* Toolbar */}
      <div className="card p-3 lg:p-4 flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="flex items-center gap-1 p-1 rounded-xl border border-white/10 bg-white/[0.03] w-full lg:w-auto">
          {[['all','All'],['watch','Watchlist']].map(([id, label]) => (
            <button key={id} onClick={() => setView(id)}
              className={`flex-1 lg:flex-none px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                view === id ? 'bg-white/10 text-white border border-white/15 shadow-[0_0_18px_-6px_rgba(34,211,238,0.6)]' : 'text-slate-400 hover:text-white'
              }`}>{label}</button>
          ))}
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="input-sm pl-9 pr-9" placeholder="Search symbol or name…"
              value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })} />
            {filter.search && (
              <button onClick={() => setFilter({ ...filter, search: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>
          <select className="input-sm w-full sm:w-48"
            value={filter.sector} onChange={e => setFilter({ ...filter, sector: e.target.value })}>
            <option value="">All sectors</option>
            {sectors.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.025] border-b border-white/[0.06]">
              <tr className="text-left">
                <th className="px-4 py-3 w-10"></th>
                <th className="px-4 py-3"><SortHeader col="symbol">Symbol</SortHeader></th>
                <th className="px-4 py-3"><SortHeader col="name">Name</SortHeader></th>
                <th className="px-4 py-3"><SortHeader col="sector">Sector</SortHeader></th>
                <th className="px-4 py-3 text-right"><SortHeader col="price"          align="right">Price</SortHeader></th>
                <th className="px-4 py-3 text-right"><SortHeader col="changePercent"  align="right">Change</SortHeader></th>
                <th className="px-4 py-3 text-right">Range</th>
                <th className="px-4 py-3 text-right"><SortHeader col="volume24h"      align="right">Volume</SortHeader></th>
                <th className="px-4 py-3 text-right"><SortHeader col="marketCap"      align="right">Mkt Cap</SortHeader></th>
                <th className="px-4 py-3 w-24 text-right"></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {rows.map(s => {
                  const series = [s.open, s.low, s.high, s.price].filter(v => typeof v === 'number');
                  const up = (s.changePercent ?? 0) >= 0;
                  return (
                    <motion.tr
                      key={s.symbol}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.16 }}
                      className="border-b border-white/[0.04] hover:bg-white/[0.025] transition"
                    >
                      <td className="px-4 py-3">
                        <button onClick={() => toggleWl(s.symbol)}
                          className={`p-1 rounded hover:bg-white/10 transition ${wl.has(s.symbol) ? 'text-amber-300' : 'text-slate-600 hover:text-amber-200'}`}
                          title={wl.has(s.symbol) ? 'Remove from watchlist' : 'Add to watchlist'}>
                          <Star size={15} fill={wl.has(s.symbol) ? 'currentColor' : 'none'} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`hidden sm:grid w-8 h-8 rounded-lg place-items-center text-[10px] font-bold border
                            ${up ? 'border-bull-500/30 bg-bull-500/10 text-bull-300'
                                  : 'border-bear-500/30 bg-bear-500/10 text-bear-300'}`}>
                            {s.symbol.slice(0, 2)}
                          </span>
                          <span className="font-semibold tracking-wide">{s.symbol}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300 max-w-[260px] truncate">{s.name}</td>
                      <td className="px-4 py-3">
                        <span className="chip">{s.sector}</span>
                      </td>
                      <td className="px-4 py-3 text-right"><PriceCell value={s.price} /></td>
                      <td className="px-4 py-3 text-right"><ChangeBadge value={s.changePercent} /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <Sparkline data={series} width={84} height={26} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right num text-slate-400">{fmt.compact(s.volume24h)}</td>
                      <td className="px-4 py-3 text-right num text-slate-400">{fmt.compact(s.marketCap)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/trade/${s.symbol}`}
                          className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:border-cyan-400/30 hover:bg-cyan-400/5 text-cyan-200 transition">
                          Trade <ArrowRight size={12} />
                        </Link>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
              {rows.length === 0 && (
                <tr><td colSpan={10} className="text-center text-slate-500 py-16">
                  <div className="font-display text-lg mb-1">No matches</div>
                  <div className="text-xs">Try a different sector, search, or switch back to "All".</div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const MINI_ACCENT = {
  cyan:    'text-cyan-200    border-cyan-500/25 bg-cyan-500/[0.06]',
  bull:    'text-bull-300    border-bull-500/25 bg-bull-500/[0.06]',
  bear:    'text-bear-300    border-bear-500/25 bg-bear-500/[0.06]',
  violet:  'text-violet-200  border-violet-500/25 bg-violet-500/[0.06]',
};

function MiniStat({ label, value, accent = 'cyan' }) {
  return (
    <div className={`p-3 rounded-2xl border ${MINI_ACCENT[accent]}`}>
      <div className="eyebrow">{label}</div>
      <div className="num font-display text-xl font-bold mt-1">{value}</div>
    </div>
  );
}
