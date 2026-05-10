import { useEffect, useState } from 'react';
import PriceChart from '../charts/PriceChart';
import { insights } from '../services/api';
import { fmt } from '../utils/format';
import { TrendingUp } from 'lucide-react';
import LiveBars from './LiveBars';

export default function EquityCurve() {
  const [points, setPoints] = useState([]);

  useEffect(() => {
    let alive = true;
    const load = () => insights.equity().then(d => alive && setPoints(d.points || [])).catch(() => {});
    load();
    const id = setInterval(load, 5000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const start = points[0]?.value;
  const last  = points[points.length - 1]?.value;
  const delta = start && last ? last - start : 0;
  const pct   = start ? (delta / start) * 100 : 0;

  return (
    <div className="card card-rim p-5 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent" />
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <span className="h-7 w-7 rounded-lg bg-cyan-500/15 text-cyan-300 grid place-items-center"><TrendingUp size={14} /></span>
          Equity Curve
        </h3>
        <div className="flex items-center gap-3">
          <span className="pill"><LiveBars /><span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">5s</span></span>
          {points.length > 1 && (
            <div className="text-right">
              <div className={`num font-semibold ${delta >= 0 ? 'text-bull-300' : 'text-bear-300'}`}>
                {delta >= 0 ? '+' : ''}{fmt.money(delta)}
                <span className="text-xs text-slate-500 ml-1">({pct >= 0 ? '+' : ''}{pct.toFixed(2)}%)</span>
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-[0.18em]">since session start</div>
            </div>
          )}
        </div>
      </div>
      {points.length < 2 ? (
        <div className="text-center text-slate-500 py-12 text-sm">
          Sampling your equity… new datapoint every few seconds.
        </div>
      ) : (
        <PriceChart data={points} variant="area" height={280} />
      )}
    </div>
  );
}
