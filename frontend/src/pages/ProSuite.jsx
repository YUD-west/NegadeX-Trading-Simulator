import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { pro } from '../services/api';
import { useMarketStore } from '../store/marketStore';
import { fmt } from '../utils/format';
import PageHeader from '../components/PageHeader';
import {
  Award, CandlestickChart, ShieldAlert, MessageSquare, FlaskConical, BarChart3,
  Newspaper, Smartphone, TestTube2, ThumbsUp, Sparkles,
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const TABS = [
  ['challenges', 'Challenges',       Award],
  ['options',    'Options',          CandlestickChart],
  ['orders',     'Stop / TP',        ShieldAlert],
  ['social',     'Social',           MessageSquare],
  ['backtest',   'Backtest',         FlaskConical],
  ['analytics',  'Analytics',        BarChart3],
  ['sentiment',  'Sentiment',        Newspaper],
  ['pwa',        'PWA',              Smartphone],
  ['tests',      'Tests',            TestTube2],
];

export default function ProSuite() {
  const [params, setParams] = useSearchParams();
  const active = params.get('tab') || 'challenges';
  const stocks = useMarketStore(s => s.stocks);
  const symbols = Object.keys(stocks);

  const setTab = (tab) => {
    const next = new URLSearchParams(params);
    next.set('tab', tab);
    setParams(next);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Premium toolkit"
        title="Pro Suite"
        subtitle="Ten institutional-grade modules: paper challenges, options, stop / take-profit, social, backtests, analytics, sentiment, PWA and DSA tests."
        icon={Sparkles}
        accent="fuchsia"
      />

      <div className="card p-2 flex gap-1 overflow-x-auto no-scrollbar">
        {TABS.map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`relative shrink-0 px-3.5 py-2 rounded-xl text-sm flex items-center gap-2 transition ${
              active === id ? 'text-cyan-100' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}>
            {active === id && (
              <motion.span layoutId="pro-tab"
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                className="absolute inset-0 rounded-xl bg-cyan-500/12 border border-cyan-400/30 shadow-[0_0_22px_-4px_rgba(34,211,238,0.55)]" />
            )}
            <Icon size={14} className="relative z-10" />
            <span className="relative z-10">{label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
        >
          {active === 'challenges' && <Challenges />}
          {active === 'options'    && <Options symbols={symbols} stocks={stocks} />}
          {active === 'orders'     && <AdvancedOrders symbols={symbols} stocks={stocks} />}
          {active === 'social'     && <Social symbols={symbols} />}
          {active === 'backtest'   && <Backtest symbols={symbols} />}
          {active === 'analytics'  && <Analytics />}
          {active === 'sentiment'  && <Sentiment />}
          {active === 'pwa'        && <PwaInfo />}
          {active === 'tests'      && <TestsInfo />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Challenges() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let alive = true;
    const load = () => pro.challenges().then(d => alive && setItems(d.items || [])).catch(() => {});
    load();
    const id = setInterval(load, 6000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map((c, i) => (
        <motion.div
          key={c.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className={`card card-rim p-5 overflow-hidden relative ${c.completed ? 'border-bull-500/30 bg-bull-500/[0.04]' : ''}`}>
          {c.completed && <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-bull-300/70 to-transparent" />}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display font-semibold">{c.title}</h3>
              <p className="text-xs text-slate-500 mt-1">
                Reward · <span className="num text-amber-200">{c.reward.toLocaleString('en-ET')} Br</span> bonus cash
              </p>
            </div>
            <span className={`badge text-[11px] ${c.completed
              ? 'bg-bull-500/15 text-bull-300 border border-bull-500/30'
              : 'bg-white/5 text-slate-400 border border-white/10'}`}>
              {c.completed ? 'Done' : `${c.progress}/${c.goal}`}
            </span>
          </div>
          <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden mt-4 relative">
            <motion.div
              className={`h-full ${c.completed ? 'bg-gradient-to-r from-bull-400 to-emerald-300' : 'bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400'}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, c.progressPercent)}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
            {!c.completed && (
              <div className="absolute inset-0 market-scanline opacity-50" />
            )}
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
            <span>{c.description || 'Trade to unlock'}</span>
            <span className="num">{Math.min(100, Math.round(c.progressPercent))}%</span>
          </div>
        </motion.div>
      ))}
      {items.length === 0 && (
        <div className="card p-10 text-center text-slate-500 col-span-full">No active challenges yet.</div>
      )}
    </div>
  );
}

function Options({ symbols, stocks }) {
  const [form, setForm] = useState({ symbol: symbols[0] || 'CBE', type: 'CALL', strike: 1850, daysToExpiry: 30 });
  const [quote, setQuote] = useState(null);
  useEffect(() => {
    if (symbols.length && !symbols.includes(form.symbol)) setForm(f => ({ ...f, symbol: symbols[0] }));
  }, [symbols, form.symbol]);
  const load = async () => {
    try {
      const d = await pro.optionQuote(form);
      setQuote(d.quote);
    } catch (e) { toast.error(e.response?.data?.message || 'Quote failed'); }
  };
  useEffect(() => { if (form.symbol) load(); /* eslint-disable-next-line */ }, [form.symbol, form.type]);
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="card p-5">
        <h3 className="font-display font-semibold mb-4">Options Simulator</h3>
        <label className="eyebrow">Symbol</label>
        <select className="input-sm mt-1 mb-3" value={form.symbol} onChange={e => setForm({ ...form, symbol: e.target.value })}>
          {symbols.map(s => <option key={s}>{s}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/10 mb-3">
          {['CALL', 'PUT'].map(t => (
            <button key={t} onClick={() => setForm({ ...form, type: t })}
              className={`py-1.5 rounded-lg text-xs uppercase tracking-[0.18em] transition ${
                form.type === t ? 'bg-white/10 text-white border border-white/15' : 'text-slate-500 hover:text-white'
              }`}>{t}</button>
          ))}
        </div>
        <label className="eyebrow">Strike</label>
        <input className="input-sm mt-1 mb-3" type="number" value={form.strike} onChange={e => setForm({ ...form, strike: e.target.value })} />
        <label className="eyebrow">Days to expiry</label>
        <input className="input-sm mt-1 mb-4" type="number" value={form.daysToExpiry} onChange={e => setForm({ ...form, daysToExpiry: e.target.value })} />
        <button onClick={load} className="btn-primary w-full">Recalculate</button>
      </div>
      <div className="card card-rim p-5 lg:col-span-2 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <h3 className="font-display font-semibold mb-4 relative">Black-Scholes Style Quote</h3>
        {quote ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 relative">
            <Metric label="Underlying" value={fmt.money(quote.underlyingPrice)} />
            <Metric label="Premium" value={fmt.money(quote.premium)} highlight />
            <Metric label="Breakeven" value={fmt.money(quote.breakeven)} />
            <Metric label="IV" value={`${quote.impliedVolatility}%`} />
            <Metric label="Delta" value={quote.delta} />
            <Metric label="Gamma" value={quote.gamma} />
            <Metric label="Theta / day" value={quote.theta} />
            <Metric label="Contract" value={`${quote.type} ${quote.strike}`} />
          </div>
        ) : <div className="text-slate-500 text-sm">Pick a symbol to quote.</div>}
      </div>
    </div>
  );
}

function AdvancedOrders({ symbols, stocks }) {
  const [form, setForm] = useState({ symbol: symbols[0] || 'CBE', side: 'SELL', kind: 'STOP_LOSS', quantity: 1, triggerPrice: 1800 });
  const [items, setItems] = useState([]);
  const load = () => pro.advancedOrders().then(d => setItems(d.items || [])).catch(() => {});
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const px = stocks[form.symbol]?.price;
    if (px) setForm(f => ({ ...f, triggerPrice: f.kind === 'STOP_LOSS' ? +(px * 0.95).toFixed(2) : +(px * 1.05).toFixed(2) }));
  }, [form.symbol, form.kind, stocks]);
  const submit = async () => {
    try {
      await pro.createAdvancedOrder(form);
      toast.success(`${form.kind} order armed`);
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Could not create order'); }
  };
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="card p-5">
        <h3 className="font-display font-semibold mb-4">Stop-Loss / Take-Profit</h3>
        <label className="eyebrow">Symbol</label>
        <select className="input-sm mt-1 mb-3" value={form.symbol} onChange={e => setForm({ ...form, symbol: e.target.value })}>
          {symbols.map(s => <option key={s}>{s}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/10 mb-3">
          {['STOP_LOSS', 'TAKE_PROFIT'].map(k => (
            <button key={k} onClick={() => setForm({ ...form, kind: k })}
              className={`py-1.5 rounded-lg text-[11px] uppercase tracking-[0.18em] transition ${
                form.kind === k ? 'bg-white/10 text-white border border-white/15' : 'text-slate-500 hover:text-white'
              }`}>{k.replace('_', ' ')}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {['BUY', 'SELL'].map(s => (
            <button key={s} onClick={() => setForm({ ...form, side: s })}
              className={`py-2 rounded-xl font-semibold transition border ${
                form.side === s
                  ? s === 'BUY'
                    ? 'bg-bull-500/90 text-white border-bull-400'
                    : 'bg-bear-500/90 text-white border-bear-400'
                  : 'bg-white/[0.03] border-white/10 text-slate-400'
              }`}>{s}</button>
          ))}
        </div>
        <label className="eyebrow">Quantity</label>
        <input className="input-sm mt-1 mb-3" type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
        <label className="eyebrow">Trigger Price</label>
        <input className="input-sm mt-1 mb-4" type="number" step="0.01" value={form.triggerPrice} onChange={e => setForm({ ...form, triggerPrice: e.target.value })} />
        <button onClick={submit} className="btn-primary w-full">Arm Order</button>
      </div>
      <div className="card p-5 lg:col-span-2">
        <h3 className="font-display font-semibold mb-4">Armed Orders</h3>
        <div className="space-y-2">
          {items.length === 0 && <div className="text-slate-500 text-sm text-center py-10">No advanced orders yet.</div>}
          <AnimatePresence initial={false}>
            {items.map(o => {
              const live = stocks[o.symbol]?.price || o.executionPrice || 0;
              const distance = live && o.triggerPrice
                ? Math.min(100, Math.abs(((live - o.triggerPrice) / o.triggerPrice) * 100))
                : 0;
              const status = o.status;
              return (
                <motion.div
                  key={o.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3 rounded-xl bg-white/[0.025] border border-white/5 hover:border-cyan-400/20 transition">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        {o.symbol}
                        <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{o.kind.replace('_', ' ')}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {o.side} {o.quantity} @ trigger {fmt.money(o.triggerPrice)}
                      </div>
                    </div>
                    <span className={`badge ${
                      status === 'ACTIVE' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/25'
                      : status === 'TRIGGERED' ? 'bg-bull-500/15 text-bull-300 border border-bull-500/25'
                      : 'bg-bear-500/15 text-bear-300 border border-bear-500/25'
                    }`}>{status}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Live <span className="num text-slate-300">{fmt.money(live)}</span></span>
                    <span>{status === 'ACTIVE'
                      ? <span className="num">{distance.toFixed(2)}% from trigger</span>
                      : o.executionPrice
                      ? `Executed ${fmt.money(o.executionPrice)}`
                      : status}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                    <motion.div
                      className={`h-full ${status === 'TRIGGERED' ? 'bg-bull-400' : 'bg-gradient-to-r from-cyan-400 to-violet-400'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${status === 'TRIGGERED' ? 100 : Math.max(8, 100 - distance * 12)}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Social({ symbols }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ text: '', symbol: '', sentiment: 'NEUTRAL' });
  const load = () => pro.social().then(d => setItems(d.items || [])).catch(() => {});
  useEffect(() => { load(); const id = setInterval(load, 5000); return () => clearInterval(id); }, []);
  const post = async () => {
    if (!form.text.trim()) return toast.error('Write something first');
    try {
      await pro.createPost(form);
      setForm({ text: '', symbol: '', sentiment: 'NEUTRAL' });
      load();
    } catch { toast.error('Post failed'); }
  };
  const like = async (id) => { await pro.likePost(id); load(); };
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="card p-5">
        <h3 className="font-display font-semibold mb-4">Post Trade Idea</h3>
        <textarea className="input mb-3" rows="5" maxLength="280"
          placeholder="Share an idea about an Ethiopian stock or the macro picture…"
          value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} />
        <div className="flex justify-between text-[11px] text-slate-500 -mt-1.5 mb-3">
          <span>Stay constructive · be respectful</span>
          <span className="num">{form.text.length}/280</span>
        </div>
        <select className="input-sm mb-3" value={form.symbol} onChange={e => setForm({ ...form, symbol: e.target.value })}>
          <option value="">No symbol</option>{symbols.map(s => <option key={s}>{s}</option>)}
        </select>
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/10 mb-4">
          {['BULLISH', 'NEUTRAL', 'BEARISH'].map(s => (
            <button key={s} onClick={() => setForm({ ...form, sentiment: s })}
              className={`py-1.5 rounded-lg text-[11px] uppercase tracking-[0.18em] transition ${
                form.sentiment === s
                  ? s === 'BULLISH' ? 'bg-bull-500/20 text-bull-200' : s === 'BEARISH' ? 'bg-bear-500/20 text-bear-200' : 'bg-white/10 text-slate-200'
                  : 'text-slate-500 hover:text-white'
              }`}>{s}</button>
          ))}
        </div>
        <button onClick={post} className="btn-primary w-full">Publish</button>
      </div>
      <div className="lg:col-span-2 space-y-3">
        {items.length === 0 && <div className="card p-10 text-center text-slate-500">No posts yet — share the first idea.</div>}
        <AnimatePresence initial={false}>
          {items.map(p => (
            <motion.div key={p.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="card p-4">
              <div className="flex justify-between items-start gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg grid place-items-center text-[11px] font-bold bg-gradient-to-br from-cyan-400 to-fuchsia-400 text-ink-950 shrink-0">
                    {(p.userName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{p.userName}</div>
                    <div className="text-[11px] text-slate-500">
                      {fmt.time(p.createdAt)} {p.symbol && <>· <span className="text-slate-300 font-semibold">{p.symbol}</span></>}
                    </div>
                  </div>
                </div>
                <span className={`badge ${
                  p.sentiment === 'BULLISH' ? 'bg-bull-500/15 text-bull-300 border border-bull-500/25'
                  : p.sentiment === 'BEARISH' ? 'bg-bear-500/15 text-bear-300 border border-bear-500/25'
                  : 'bg-white/5 text-slate-400 border border-white/10'}`}>
                  {p.sentiment}
                </span>
              </div>
              <p className="text-sm text-slate-200 mt-3 leading-relaxed">{p.text}</p>
              <button onClick={() => like(p.id)} className="btn-ghost text-xs mt-3">
                <ThumbsUp size={13} /> {p.likes}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Backtest({ symbols }) {
  const [form, setForm] = useState({ symbol: symbols[0] || 'CBE', fast: 5, slow: 15, capital: 250000 });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (symbols.length && !symbols.includes(form.symbol)) setForm(f => ({ ...f, symbol: symbols[0] })); }, [symbols, form.symbol]);
  const run = async () => {
    setBusy(true);
    try { setResult((await pro.backtest(form)).result); }
    catch (e) { toast.error(e.response?.data?.message || 'Need more history'); }
    finally { setBusy(false); }
  };
  return (
    <div className="grid lg:grid-cols-4 gap-4">
      <div className="card p-5">
        <h3 className="font-display font-semibold mb-4">MA-Crossover Backtest</h3>
        <label className="eyebrow">Symbol</label>
        <select className="input-sm mt-1 mb-3" value={form.symbol} onChange={e => setForm({ ...form, symbol: e.target.value })}>
          {symbols.map(s => <option key={s}>{s}</option>)}
        </select>
        <label className="eyebrow">Fast MA</label>
        <input className="input-sm mt-1 mb-3" type="number" value={form.fast} onChange={e => setForm({ ...form, fast: e.target.value })} />
        <label className="eyebrow">Slow MA</label>
        <input className="input-sm mt-1 mb-3" type="number" value={form.slow} onChange={e => setForm({ ...form, slow: e.target.value })} />
        <label className="eyebrow">Capital (Br)</label>
        <input className="input-sm mt-1 mb-4" type="number" value={form.capital} onChange={e => setForm({ ...form, capital: e.target.value })} />
        <button onClick={run} disabled={busy} className="btn-primary w-full">
          {busy ? 'Running…' : 'Run Backtest'}
        </button>
      </div>
      <div className="card card-rim p-5 lg:col-span-3 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl" />
        {result ? (
          <div className="relative">
            {result.warming && (
              <div className="mb-4 px-4 py-3 rounded-xl border border-amber-400/30 bg-amber-500/10 text-amber-200 text-xs">
                {result.message || 'Simulator is still warming up — try again in a few seconds.'}
              </div>
            )}
            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              <Metric label="Final Value" value={fmt.money(result.finalValue)} highlight />
              <Metric label="ROI" value={`${result.roi}%`} />
              <Metric label="Trades" value={result.trades.length} />
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={result.equity}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickFormatter={(t) => fmt.time(t * 1000)} />
                <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => fmt.compact(v)} />
                <Tooltip
                  formatter={(v) => [fmt.money(v), 'Equity']}
                  labelFormatter={(t) => fmt.time(t * 1000)}
                  contentStyle={{ background: 'rgba(13,16,24,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontFamily: 'JetBrains Mono' }}
                />
                <Line dataKey="value" stroke="#22d3ee" dot={false} strokeWidth={2.2} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 grid md:grid-cols-2 gap-2">
              {result.trades.slice(-6).reverse().map((t, i) => (
                <motion.div
                  key={`${t.time}-${i}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-xs">
                  <span className={t.side === 'BUY' ? 'text-bull-300 font-semibold' : 'text-bear-300 font-semibold'}>{t.side}</span>
                  <span className="text-slate-400">{t.shares} shares</span>
                  <span className="num">{fmt.money(t.price)}</span>
                  <span className="text-slate-600">{fmt.time(t.time * 1000)}</span>
                </motion.div>
              ))}
            </div>
          </div>
        ) : <div className="text-center text-slate-500 py-20 text-sm relative">Run a strategy to see equity, trades and ROI.</div>}
      </div>
    </div>
  );
}

function Analytics() {
  const [m, setM] = useState(null);
  useEffect(() => { const load = () => pro.analytics().then(d => setM(d.metrics)); load(); const id = setInterval(load, 6000); return () => clearInterval(id); }, []);
  if (!m) return <div className="card p-8 text-slate-500 text-center">Loading analytics…</div>;
  return (
    <div className="grid lg:grid-cols-4 gap-4">
      <div className="lg:col-span-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="Sharpe-like" value={m.sharpeLike} highlight />
        <Metric label="Win Rate" value={`${m.winRate}%`} />
        <Metric label="Max Drawdown" value={`${m.maxDrawdown}%`} />
        <Metric label="Concentration" value={`${m.concentration}%`} />
        <Metric label="Diversification" value={`${m.diversificationScore}/100`} />
        <Metric label="Turnover" value={m.turnover} />
        <Metric label="P/L" value={fmt.money(m.pnl)} />
        <Metric label="ROI" value={`${m.pnlPercent.toFixed(2)}%`} />
      </div>
      <div className="card card-rim p-5 space-y-4 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-300/30 to-transparent" />
        <h3 className="font-display font-semibold">Risk Radar</h3>
        {[
          ['Win Quality',         m.winRate,             'from-bull-400 to-emerald-300'],
          ['Diversification',     m.diversificationScore,'from-cyan-400 to-violet-400'],
          ['Concentration Risk',  m.concentration,       'from-amber-300 to-amber-500'],
          ['Drawdown Pressure',   m.maxDrawdown,         'from-bear-400 to-rose-500'],
        ].map(([label, value, gradient]) => (
          <div key={label}>
            <div className="mb-1 flex justify-between text-xs text-slate-400"><span>{label}</span><span className="num">{Number(value).toFixed(1)}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.04]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className={`h-full bg-gradient-to-r ${gradient}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Sentiment() {
  const [data, setData] = useState({ items: [], symbols: [] });
  useEffect(() => { const load = () => pro.sentiment().then(setData); load(); const id = setInterval(load, 8000); return () => clearInterval(id); }, []);
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="card p-5">
        <h3 className="font-display font-semibold mb-3">Symbol Sentiment</h3>
        <div className="space-y-2">
          {data.symbols.length === 0 && <div className="text-slate-500 text-sm text-center py-8">No coverage yet.</div>}
          {data.symbols.map(s => {
            const pct = Math.min(100, Math.abs(s.score) * 28);
            const bull = s.score > 0;
            const bear = s.score < 0;
            return (
              <div key={s.symbol} className="rounded-xl bg-white/[0.025] border border-white/5 p-3">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">{s.symbol}</span>
                  <span className={bull ? 'text-bull-300' : bear ? 'text-bear-300' : 'text-slate-400'}>
                    {bull ? 'Bullish' : bear ? 'Bearish' : 'Neutral'} <span className="num text-[11px] text-slate-500 ml-1">{s.score.toFixed(2)}</span>
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(8, pct)}%` }}
                    className={`h-full ${bull ? 'bg-gradient-to-r from-bull-400 to-emerald-300' : bear ? 'bg-gradient-to-r from-bear-400 to-rose-400' : 'bg-slate-500'}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="lg:col-span-2 space-y-2">
        {data.items.length === 0 && <div className="card p-10 text-center text-slate-500">News stream warming up…</div>}
        {data.items.map((n, i) => (
          <motion.div
            key={n.id || i}
            initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
            className="card p-4">
            <div className="flex justify-between items-start gap-3">
              <div>
                <span className="text-sm font-semibold">{n.symbol || 'Market'}</span>
                <div className="text-[11px] text-slate-500 mt-0.5">{fmt.time(n.time || Date.now())}</div>
              </div>
              <span className={`badge ${n.sentiment === 'BULLISH' ? 'bg-bull-500/15 text-bull-300 border border-bull-500/25' : n.sentiment === 'BEARISH' ? 'bg-bear-500/15 text-bear-300 border border-bear-500/25' : 'bg-white/5 text-slate-400 border border-white/10'}`}>
                {n.sentiment}
              </span>
            </div>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">{n.text}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function PwaInfo() {
  return (
    <div className="card card-rim p-6 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-fuchsia-500/15 blur-3xl" />
      <h3 className="font-display font-semibold mb-2 flex items-center gap-2 relative">
        <Smartphone size={16} className="text-fuchsia-300" /> Mobile PWA Support
      </h3>
      <p className="text-slate-400 text-sm relative leading-relaxed">
        Install NegadeX like a native app. The manifest, service worker, offline fallback and app icons
        are all configured. In Chrome / Edge, click "Install app" from the URL bar; on iOS Safari use
        "Add to Home Screen".
      </p>
      <div className="mt-4 grid sm:grid-cols-3 gap-2 relative">
        {['Service Worker · v1', 'Offline cache shell', 'Web App Manifest'].map(t => (
          <div key={t} className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-300">{t}</div>
        ))}
      </div>
    </div>
  );
}

function TestsInfo() {
  return (
    <div className="card card-rim p-6 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-cyan-500/15 blur-3xl" />
      <h3 className="font-display font-semibold mb-2 flex items-center gap-2 relative">
        <TestTube2 size={16} className="text-cyan-300" /> DSA Unit Tests
      </h3>
      <p className="text-slate-400 text-sm relative leading-relaxed">
        Backend tests use Node's built-in test runner. They validate the heap, the matching engine
        (price-time priority + cancellation), the portfolio (hash-map / stack / queue) and the binary
        search over price history.
      </p>
      <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-xs relative">
        <span className="num text-cyan-200">npm test</span>
        <span className="text-slate-400">— from the backend folder</span>
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }) {
  return (
    <div className={`p-4 rounded-2xl border ${highlight
      ? 'bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_22px_-6px_rgba(34,211,238,0.55)]'
      : 'bg-white/[0.025] border-white/5'}`}>
      <div className="eyebrow">{label}</div>
      <div className="num font-display text-xl font-bold mt-1 gradient-text-subtle">{value}</div>
    </div>
  );
}
