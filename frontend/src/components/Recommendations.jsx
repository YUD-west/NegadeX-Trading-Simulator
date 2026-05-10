import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { insights } from '../services/api';
import { fmt } from '../utils/format';
import ChangeBadge from './ChangeBadge';
import { Sparkles, TrendingDown, BrainCircuit, ArrowRight } from 'lucide-react';

export default function Recommendations() {
  const [data, setData] = useState({ buys: [], dips: [] });
  const [tab, setTab] = useState('buys');

  useEffect(() => {
    let alive = true;
    const load = () => insights.recos().then(d => alive && setData(d)).catch(() => {});
    load();
    const id = setInterval(load, 8000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const items = data[tab] || [];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <span className="h-7 w-7 rounded-lg bg-fuchsia-500/15 text-fuchsia-300 grid place-items-center"><BrainCircuit size={14} /></span>
          AI Picks
          <span className="eyebrow font-normal hidden sm:inline">Composite signals</span>
        </h3>
        <div className="flex gap-1 bg-white/[0.03] border border-white/10 rounded-xl p-1">
          <button onClick={() => setTab('buys')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
              tab === 'buys'
                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}>
            <Sparkles size={12} /> Momentum
          </button>
          <button onClick={() => setTab('dips')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
              tab === 'dips'
                ? 'bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-500/30'
                : 'text-slate-400 hover:text-white'
            }`}>
            <TrendingDown size={12} /> Buy The Dip
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        {items.length === 0 && (
          <div className="col-span-full text-center text-slate-500 py-8 text-sm">Computing signals…</div>
        )}
        {items.map(s => (
          <Link to={`/trade/${s.symbol}`} key={s.symbol}
            className="group flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.025] hover:bg-white/[0.05] border border-white/5 hover:border-cyan-400/25 transition">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{s.symbol}</span>
                <span className="text-xs text-slate-500 truncate">{s.name}</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">{s.reason}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="num font-semibold text-sm">{fmt.money(s.price)}</div>
              <ChangeBadge value={s.changePercent} />
            </div>
            <div className="flex flex-col items-end shrink-0 ml-1">
              <span className={`text-[10px] uppercase tracking-[0.18em] font-bold ${tab === 'buys' ? 'text-cyan-300' : 'text-fuchsia-300'}`}>
                {s.confidence}%
              </span>
              <ArrowRight size={14} className="text-slate-600 group-hover:text-cyan-300 transition mt-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
