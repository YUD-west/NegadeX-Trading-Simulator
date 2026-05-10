import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMarketStore } from '../store/marketStore';
import { stocks as stocksApi, trade as tradeApi, watchlist as wlApi } from '../services/api';
import { getSocket } from '../services/socket';
import { fmt } from '../utils/format';
import PriceCell from '../components/PriceCell';
import ChangeBadge from '../components/ChangeBadge';
import OrderBook from '../components/OrderBook';
import TradesTape from '../components/TradesTape';
import LiveBars from '../components/LiveBars';
import PriceChart from '../charts/PriceChart';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Star, Bell, Activity, Undo2, AreaChart, CandlestickChart,
  Zap, Percent, ChevronRight, X,
} from 'lucide-react';
import toast from 'react-hot-toast';

const QTY_QUICK = [10, 25, 50, 100];
const PCT_QUICK = [25, 50, 75, 100];

export default function Trade() {
  const { symbol: routeSym } = useParams();
  const nav = useNavigate();
  const stocks = useMarketStore(s => s.stocks);
  const portfolio = useMarketStore(s => s.portfolio);
  const fetchPortfolio = useMarketStore(s => s.fetchPortfolio);
  const connected = useMarketStore(s => s.connected);

  const symbols = Object.keys(stocks);
  const symbol = (routeSym || symbols[0] || 'CBE').toUpperCase();
  const stock = stocks[symbol];

  const [history, setHistory] = useState([]);
  const [variant, setVariant] = useState('area');
  const [side, setSide]   = useState('BUY');
  const [type, setType]   = useState('MARKET');
  const [qty, setQty]     = useState(10);
  const [limit, setLimit] = useState(0);
  const [busy, setBusy]   = useState(false);
  const [search, setSearch] = useState('');
  const [wl, setWl] = useState(new Set());
  const [alertPx, setAlertPx]   = useState('');
  const [alertDir, setAlertDir] = useState('ABOVE');

  // Load chart history & watchlist
  useEffect(() => {
    let alive = true;
    setHistory([]);
    stocksApi.history(symbol).then(d => alive && setHistory(d.candles || []));
    wlApi.list().then(d => setWl(new Set(d.symbols || []))).catch(() => {});
    return () => { alive = false; };
  }, [symbol]);

  // Subscribe to per-symbol socket room
  useEffect(() => {
    const s = getSocket();
    s.emit('subscribe:stock', symbol);
    return () => s.emit('unsubscribe:stock', symbol);
  }, [symbol]);

  // Reset limit price to current price whenever symbol or order-type changes
  useEffect(() => {
    if (stock) setLimit(stock.price);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, type]);

  const holding = portfolio?.positions?.find(p => p.symbol === symbol);

  const filteredSymbols = useMemo(() => {
    if (!search) return symbols.slice(0, 30);
    const q = search.toLowerCase();
    return symbols.filter(s => s.toLowerCase().includes(q) ||
      stocks[s].name.toLowerCase().includes(q)).slice(0, 30);
  }, [search, symbols, stocks]);

  const submit = async () => {
    if (!stock) return;
    if (qty <= 0) return toast.error('Quantity must be positive');
    setBusy(true);
    try {
      const payload = { symbol, side, quantity: Number(qty), type };
      if (type === 'LIMIT') payload.price = Number(limit);
      const r = await tradeApi.place(payload);
      toast.success(`${side} order ${r.order.status}: ${r.order.filled}/${r.order.quantity} filled`);
      fetchPortfolio();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Order rejected');
    } finally {
      setBusy(false);
    }
  };

  const undo = async () => {
    try {
      const r = await tradeApi.undo();
      toast.success(`Undone: ${r.undone.type} ${r.undone.symbol}`);
      fetchPortfolio();
    } catch (e) { toast.error(e.response?.data?.message || 'Nothing to undo'); }
  };

  const toggleWl = async () => {
    if (wl.has(symbol)) {
      await wlApi.remove(symbol);
      setWl(prev => { const n = new Set(prev); n.delete(symbol); return n; });
    } else {
      await wlApi.add(symbol);
      setWl(prev => new Set(prev).add(symbol));
    }
  };

  const addAlert = async () => {
    if (!alertPx || alertPx <= 0) return toast.error('Enter a target price');
    try {
      await wlApi.addAlert({ symbol, price: Number(alertPx), direction: alertDir });
      toast.success(`Alert set for ${symbol} ${alertDir} ${alertPx} Br`);
      setAlertPx('');
    } catch { toast.error('Could not set alert'); }
  };

  if (!stock) {
    return (
      <div className="p-12 text-center text-slate-500">
        <div className="inline-flex items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
          Loading {symbol}…
        </div>
      </div>
    );
  }

  const estPrice = type === 'LIMIT' ? Number(limit) : stock.price;
  const estCost  = estPrice * Number(qty || 0);
  const cash     = portfolio?.cash || 0;
  const canAfford = side === 'BUY' ? estCost <= cash : true;

  const handlePctQty = (pct) => {
    if (side === 'BUY') {
      const max = Math.floor(cash / Math.max(0.01, estPrice));
      setQty(Math.max(1, Math.floor(max * pct / 100)));
    } else {
      const have = holding?.quantity || 0;
      setQty(Math.max(1, Math.floor(have * pct / 100)));
    }
  };

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Symbol picker */}
      <aside className="col-span-12 lg:col-span-2 space-y-2 order-2 lg:order-1">
        <div className="card p-3">
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="input-sm pl-9 pr-9" placeholder="Search…"
              value={search} onChange={e => setSearch(e.target.value)} />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
            {filteredSymbols.map(s => {
              const st = stocks[s];
              const up = (st.changePercent || 0) >= 0;
              return (
                <button key={s} onClick={() => nav(`/trade/${s}`)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-sm flex justify-between items-center gap-2 transition border ${
                    s === symbol
                      ? 'bg-cyan-500/10 border-cyan-400/40 shadow-[0_0_18px_-6px_rgba(34,211,238,0.6)]'
                      : 'border-transparent hover:bg-white/[0.04] hover:border-white/10'
                  }`}>
                  <span className="flex items-center gap-2 min-w-0">
                    {wl.has(s) && <Star size={11} className="text-amber-300 shrink-0" fill="currentColor" />}
                    <span className="font-semibold truncate">{s}</span>
                  </span>
                  <span className={`text-[11px] num ${up ? 'text-bull-300' : 'text-bear-300'}`}>
                    {fmt.pct(st.changePercent, 1)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Chart + header */}
      <section className="col-span-12 lg:col-span-7 space-y-4 order-1 lg:order-2">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card card-rim p-5 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
          <div className="relative flex flex-wrap items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className={`hidden sm:grid w-10 h-10 rounded-xl place-items-center text-xs font-bold border
                    ${stock.changePercent >= 0 ? 'border-bull-500/30 bg-bull-500/10 text-bull-300'
                                                : 'border-bear-500/30 bg-bear-500/10 text-bear-300'}`}>
                    {stock.symbol.slice(0, 2)}
                  </span>
                  <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">{stock.symbol}</h1>
                </div>
                <button onClick={toggleWl}
                  className={`p-1.5 rounded-lg transition ${wl.has(symbol) ? 'text-amber-300 bg-amber-500/10' : 'text-slate-500 hover:text-amber-200 hover:bg-white/5'}`}>
                  <Star size={16} fill={wl.has(symbol) ? 'currentColor' : 'none'} />
                </button>
                <span className="chip">{stock.sector}</span>
                <span className="pill">
                  <LiveBars />
                  <span className="text-[10px] uppercase tracking-[0.18em]">{connected ? 'streaming' : 'offline'}</span>
                </span>
              </div>
              <div className="text-slate-500 text-sm mt-1">{stock.name}</div>
            </div>

            <div className="text-right">
              <PriceCell value={stock.price} className="text-3xl font-display font-bold gradient-text-subtle" />
              <div className="mt-1 inline-flex items-center gap-2">
                <ChangeBadge value={stock.changePercent} size="lg" />
                <span className={`text-xs num ${stock.change >= 0 ? 'text-bull-300' : 'text-bear-300'}`}>
                  {stock.change >= 0 ? '+' : ''}{fmt.money(stock.change)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="inline-flex items-center gap-1 p-1 rounded-xl border border-white/10 bg-white/[0.03]">
              {[
                ['area', 'Area', AreaChart],
                ['candles', 'Candles', CandlestickChart],
              ].map(([v, label, Icon]) => (
                <button key={v} onClick={() => setVariant(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition ${
                    variant === v ? 'bg-white/10 text-white border border-white/15' : 'text-slate-400 hover:text-white'
                  }`}>
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
            <div className="text-[11px] text-slate-500">Powered by Lightweight Charts · {fmt.timezone}</div>
          </div>

          <PriceChart data={history} variant={variant} livePrice={stock.price} height={400} />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <Stat label="Open"   value={fmt.money(stock.open)} />
            <Stat label="High"   value={fmt.money(stock.high)} accent="bull" />
            <Stat label="Low"    value={fmt.money(stock.low)}  accent="bear" />
            <Stat label="Volume" value={fmt.compact(stock.volume24h)} />
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-4">
          <OrderBook symbol={symbol} />
          <TradesTape symbol={symbol} />
        </div>
      </section>

      {/* Order ticket */}
      <aside className="col-span-12 lg:col-span-3 space-y-4 order-3">
        <div className="card card-rim p-5 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent" />
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-cyan-500/15 text-cyan-300 grid place-items-center"><Zap size={14} /></span>
            Place Order
          </h3>

          <div className="grid grid-cols-2 gap-2 mb-3">
            {['BUY', 'SELL'].map(s => (
              <button key={s} onClick={() => setSide(s)}
                className={`py-2.5 rounded-xl font-semibold transition border ${
                  side === s
                    ? s === 'BUY'
                      ? 'bg-bull-500/90 text-white border-bull-400 shadow-[0_0_22px_-4px_rgba(74,222,128,0.7)]'
                      : 'bg-bear-500/90 text-white border-bear-400 shadow-[0_0_22px_-4px_rgba(248,113,113,0.7)]'
                    : 'bg-white/[0.03] text-slate-400 border-white/10 hover:text-white'
                }`}>
                {s}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/10 mb-3">
            {['MARKET', 'LIMIT'].map(t => (
              <button key={t} onClick={() => setType(t)}
                className={`py-1.5 rounded-lg text-xs uppercase tracking-[0.18em] transition ${
                  type === t ? 'bg-white/10 text-white border border-white/15' : 'text-slate-500 hover:text-white'
                }`}>
                {t}
              </button>
            ))}
          </div>

          <label className="eyebrow">Quantity</label>
          <input type="number" min="1" className="input-sm mt-1 mb-2"
            value={qty} onChange={e => setQty(e.target.value)} />
          <div className="flex items-center gap-1 mb-3">
            {QTY_QUICK.map(q => (
              <button key={q} onClick={() => setQty(q)}
                className="text-[11px] flex-1 py-1 rounded-md bg-white/[0.03] border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition">
                {q}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 mb-3">
            {PCT_QUICK.map(p => (
              <button key={p} onClick={() => handlePctQty(p)}
                className="text-[11px] flex-1 py-1 rounded-md bg-cyan-500/[0.06] border border-cyan-500/20 text-cyan-200 hover:bg-cyan-500/10 transition inline-flex items-center justify-center gap-0.5">
                {p}<Percent size={9} />
              </button>
            ))}
          </div>

          <AnimatePresence initial={false}>
            {type === 'LIMIT' && (
              <motion.div
                key="limit"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="eyebrow">Limit Price</label>
                <input type="number" step="0.01" className="input-sm mt-1 mb-3"
                  value={limit} onChange={e => setLimit(e.target.value)} />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="text-xs text-slate-400 space-y-1.5 mb-4 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <Row label={`Est. ${side === 'BUY' ? 'Cost' : 'Proceeds'}`} value={fmt.money(estCost)} />
            <Row label="Available Cash" value={fmt.money(cash)} accent={canAfford ? '' : 'text-bear-300'} />
            {holding && <Row label="You Hold" value={`${fmt.num(holding.quantity)} @ ${fmt.money(holding.avgPrice)}`} />}
          </div>

          <button onClick={submit} disabled={busy || (side === 'BUY' && !canAfford)}
            className={`${side === 'BUY' ? 'btn-bull' : 'btn-bear'} w-full py-3`}>
            <Activity size={16} /> {busy ? 'Placing…' : `${side} ${symbol}`}
          </button>

          {side === 'BUY' && !canAfford && (
            <p className="text-[11px] text-bear-300 mt-2 text-center">Insufficient cash for this order.</p>
          )}

          <button onClick={undo} className="btn-ghost w-full mt-2 text-xs">
            <Undo2 size={14} /> Undo last trade <span className="text-slate-500 ml-1">(stack pop)</span>
          </button>
        </div>

        <div className="card p-5">
          <h3 className="font-display font-semibold flex items-center gap-2 mb-3">
            <span className="h-7 w-7 rounded-lg bg-amber-500/15 text-amber-300 grid place-items-center"><Bell size={14} /></span>
            Price Alert
          </h3>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/10 mb-2">
            {['ABOVE', 'BELOW'].map(d => (
              <button key={d} onClick={() => setAlertDir(d)}
                className={`py-1.5 rounded-lg text-xs uppercase tracking-[0.18em] transition ${
                  alertDir === d ? 'bg-white/10 text-white border border-white/15' : 'text-slate-500 hover:text-white'
                }`}>{d}</button>
            ))}
          </div>
          <input type="number" step="0.01" className="input-sm mb-2"
            placeholder="Target price (Br)"
            value={alertPx} onChange={e => setAlertPx(e.target.value)} />
          <button onClick={addAlert} className="btn-ghost w-full text-sm">Set Alert</button>
          <p className="text-[11px] text-slate-500 mt-2 leading-snug">
            Alerts notify you instantly via the bell when {symbol} crosses your target.
          </p>
        </div>

        <Link to={`/compare?a=${symbol}`} className="card p-4 flex items-center justify-between hover:border-cyan-400/30 transition">
          <div>
            <div className="font-display font-semibold text-sm">Compare {symbol}</div>
            <div className="text-[11px] text-slate-500">Rebase against any peer · /compare</div>
          </div>
          <ChevronRight size={16} className="text-slate-500" />
        </Link>
      </aside>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
      <div className="eyebrow">{label}</div>
      <div className={`num font-semibold mt-1 ${accent === 'bull' ? 'text-bull-300' : accent === 'bear' ? 'text-bear-300' : ''}`}>
        {value}
      </div>
    </div>
  );
}

function Row({ label, value, accent }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-500">{label}</span>
      <span className={`num text-slate-200 ${accent || ''}`}>{value}</span>
    </div>
  );
}
