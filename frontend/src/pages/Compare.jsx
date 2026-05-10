import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { stocks as stocksApi } from '../services/api';
import { useMarketStore } from '../store/marketStore';
import { fmt } from '../utils/format';
import PriceCell from '../components/PriceCell';
import ChangeBadge from '../components/ChangeBadge';
import PageHeader from '../components/PageHeader';
import { GitCompare, ArrowLeftRight } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

export default function Compare() {
  const [params, setParams] = useSearchParams();
  const stocks = useMarketStore(s => s.stocks);
  const symbols = Object.keys(stocks);

  const a = (params.get('a') || symbols[0] || 'CBE').toUpperCase();
  const b = (params.get('b') || symbols[1] || 'ETHA').toUpperCase();

  const [historyA, setHistoryA] = useState([]);
  const [historyB, setHistoryB] = useState([]);

  useEffect(() => {
    let alive = true;
    stocksApi.history(a).then(d => alive && setHistoryA(d.candles || []));
    stocksApi.history(b).then(d => alive && setHistoryB(d.candles || []));
    return () => { alive = false; };
  }, [a, b]);

  const merged = useMemo(() => {
    if (!historyA.length || !historyB.length) return [];
    const baseA = historyA[0].close || 1;
    const baseB = historyB[0].close || 1;
    const len = Math.min(historyA.length, historyB.length);
    const offsetA = historyA.length - len;
    const offsetB = historyB.length - len;
    const out = [];
    for (let i = 0; i < len; i++) {
      out.push({
        time: historyA[i + offsetA].time,
        [a]: +(historyA[i + offsetA].close / baseA * 100).toFixed(2),
        [b]: +(historyB[i + offsetB].close / baseB * 100).toFixed(2),
      });
    }
    return out;
  }, [historyA, historyB, a, b]);

  const sa = stocks[a];
  const sb = stocks[b];

  const setSym = (slot, value) => {
    const next = new URLSearchParams(params);
    next.set(slot, value.toUpperCase());
    setParams(next);
  };
  const swap = () => {
    const next = new URLSearchParams(params);
    next.set('a', b); next.set('b', a);
    setParams(next);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Side by side"
        title="Compare Stocks"
        subtitle="Normalised performance · both rebased to 100 at session start"
        icon={GitCompare}
        accent="cyan"
      />

      <div className="grid lg:grid-cols-2 gap-4 items-end">
        <SymbolPicker label="Symbol A" value={a} onChange={(v) => setSym('a', v)} symbols={symbols} stocks={stocks} accent="text-cyan-300" />
        <div className="flex items-end gap-2">
          <SymbolPicker label="Symbol B" value={b} onChange={(v) => setSym('b', v)} symbols={symbols} stocks={stocks} accent="text-fuchsia-300" />
          <button onClick={swap} className="btn-ghost h-[46px] px-3" title="Swap">
            <ArrowLeftRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {[sa, sb].map((s, i) => s && (
          <div key={s.symbol} className="card card-rim p-5 relative overflow-hidden">
            <div className={`absolute -top-20 -right-20 w-56 h-56 rounded-full blur-3xl ${i === 0 ? 'bg-cyan-500/15' : 'bg-fuchsia-500/15'}`} />
            <div className="relative flex items-center justify-between">
              <div className="min-w-0">
                <div className={`eyebrow ${i === 0 ? 'text-cyan-300' : 'text-fuchsia-300'}`}>
                  Symbol {i === 0 ? 'A' : 'B'}
                </div>
                <div className="font-display text-2xl font-bold mt-1 truncate">{s.symbol}</div>
                <div className="text-xs text-slate-500 truncate">{s.name} · {s.sector}</div>
              </div>
              <div className="text-right">
                <PriceCell value={s.price} className="text-xl" />
                <div className="mt-1"><ChangeBadge value={s.changePercent} /></div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-xs relative">
              <Stat label="Open"   value={fmt.money(s.open)} />
              <Stat label="High"   value={fmt.money(s.high)} />
              <Stat label="Volume" value={fmt.compact(s.volume24h)} />
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h3 className="font-display font-semibold mb-3">Relative Performance (rebased to 100)</h3>
        {merged.length < 2 ? (
          <div className="text-center text-slate-500 py-12 text-sm">Loading history…</div>
        ) : (
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={merged}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={10}
                tickFormatter={(t) => fmt.time(t * 1000)} />
              <YAxis stroke="#64748b" fontSize={10} domain={['dataMin - 1', 'dataMax + 1']} />
              <Tooltip
                contentStyle={{ background: 'rgba(13,16,24,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontFamily: 'JetBrains Mono' }}
                labelFormatter={(t) => fmt.time(t * 1000)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey={a} stroke="#22d3ee" strokeWidth={2.2} dot={false} />
              <Line type="monotone" dataKey={b} stroke="#ec4899" strokeWidth={2.2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function SymbolPicker({ label, value, onChange, symbols, stocks, accent }) {
  return (
    <div>
      <label className={`eyebrow mb-1 block ${accent}`}>{label}</label>
      <select className="input w-full" value={value} onChange={e => onChange(e.target.value)}>
        {symbols.map(s => (
          <option key={s} value={s}>{s} — {stocks[s].name}</option>
        ))}
      </select>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="p-2 rounded-lg bg-white/[0.025] border border-white/5">
      <div className="eyebrow">{label}</div>
      <div className="num font-semibold mt-0.5">{value}</div>
    </div>
  );
}
