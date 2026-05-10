import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  ArrowRight, Zap, BarChart3, Layers, Activity, Database,
  Sparkles, Globe2, ChevronRight, ChevronDown, Building2, Radio, MapPin,
  CandlestickChart, Trophy, WalletCards, Smartphone,
  GitBranch, Check, Star, Quote, ShieldCheck, Wifi, Code2, PlayCircle,
} from 'lucide-react';
import { useMarketStore } from '../store/marketStore';
import { fmt } from '../utils/format';
import ChangeBadge from '../components/ChangeBadge';
import PriceCell from '../components/PriceCell';
import LiveBars from '../components/LiveBars';
import Sparkline from '../components/Sparkline';

/* ───────────────────────────────────────────────────────────────────
   Static content — all marketing copy lives here so the JSX stays clean
─────────────────────────────────────────────────────────────────── */

const HERO_KPIS = [
  { k: '1M Br',    v: 'Virtual capital on signup' },
  { k: '32',       v: 'Ethiopian symbols listed' },
  { k: '~2.5s',    v: 'Live tick frequency' },
  { k: 'O(log n)', v: 'Per-fill heap match' },
];

const TRUST_LOGOS = [
  'CBE', 'ETHA', 'ETHTEL', 'TBIRR', 'AWASH', 'SAFCM', 'NOC', 'EBC',
];

const ALGO_PILLARS = [
  { icon: Zap,       title: 'Heap-based matching',    text: 'Max-heap on the bid side, min-heap on the ask. Price-time priority, O(log n) per fill.' },
  { icon: BarChart3, title: 'Geometric simulation',   text: 'Brownian random-walk pricing with bullish, bearish, neutral and volatile market regimes.' },
  { icon: Layers,    title: 'Hash-map portfolios',    text: 'Holdings, alerts and watchlists keyed for O(1) lookup. No N² loops.' },
  { icon: Database,  title: 'Binary search history',  text: 'Find historical Birr prices by timestamp in O(log n) for instant playback and backtests.' },
  { icon: GitBranch, title: 'Stack + queue ledger',   text: 'Stack-based undo for trades, FIFO queue for transaction processing.' },
  { icon: Activity,  title: 'Realtime sockets',       text: 'Trades, ticks, alerts, news and the leaderboard streamed via Socket.IO.' },
];

const ETH_PILLARS = [
  { icon: Building2, title: 'Local blue chips',  text: 'CBE, Ethiopian Airlines, Ethio Telecom, Awash, Tele-Birr and 25+ more.' },
  { icon: MapPin,    title: 'Addis timing',      text: 'Africa/Addis_Ababa timezone with ETB-native formatting throughout.' },
  { icon: Radio,     title: 'Macro atmosphere',  text: 'NBE rates, ETB devaluations, GERD news and export cycles drive the simulator.' },
];

const PRODUCTS = [
  {
    icon: CandlestickChart,
    eyebrow: '01 · Trading desk',
    title: 'A real trading terminal in the browser.',
    text: 'TradingView-style chart, animated order book with bid/ask depth bars, live trades tape, and a professional order ticket with quick-fill quantity helpers — all keyed to a real heap-based matching engine.',
    bullets: ['Area + candlestick chart variants', 'Animated bid/ask depth + imbalance', 'Market and limit orders with stack-undo'],
    accent: 'cyan',
  },
  {
    icon: WalletCards,
    eyebrow: '02 · Portfolio cockpit',
    title: 'Live valuation, equity curve, risk radar.',
    text: 'Watch your portfolio breathe. Equity curve samples every five seconds, risk panels recompute concentration scores, and the holdings table keeps live prices flashing on every tick.',
    bullets: ['Animated equity sparkline + scanline', 'Sector concentration + risk rating', 'Transaction history + CSV export'],
    accent: 'fuchsia',
  },
  {
    icon: Trophy,
    eyebrow: '03 · Pro Suite',
    title: 'Ten institutional modules, one tab bar.',
    text: 'Paper challenges, options pricer, stop-loss / take-profit, social trading feed, MA-crossover backtests, advanced analytics, news sentiment scanner, admin replay mode, mobile PWA and a battery of DSA unit tests.',
    bullets: ['Stop-loss + take-profit triggers', 'MA-crossover backtest with equity curve', 'Sentiment scanner across Ethiopian news'],
    accent: 'violet',
  },
];

const JOURNEY = [
  { step: '01', title: 'Create account', text: 'Get 1,000,000 Br in virtual capital. No card, no KYC, no risk.' },
  { step: '02', title: 'Trade live market', text: 'Buy and sell 32 Ethiopian companies with real-time prices and order book.' },
  { step: '03', title: 'Use Pro Suite', text: 'Backtests, options, stop-loss, sentiment, replay and analytics — unlocked from day one.' },
  { step: '04', title: 'Climb the ladder', text: 'Earn achievements, unlock challenges and rank on the live trader leaderboard.' },
];

const TESTIMONIALS = [
  {
    name: 'Bethel A.',
    role: 'Junior Engineer · Awash IT',
    text: 'I finally understand heaps and matching engines. NegadeX makes DSA feel like a Bloomberg terminal — I can see every algorithm at work in real time.',
  },
  {
    name: 'Daniel M.',
    role: 'CS Lecturer · Addis Ababa University',
    text: 'I assign this to my data structures class. Instead of pen-and-paper heap exercises, students see fills, undos and binary searches happen live on Ethiopian stocks.',
  },
  {
    name: 'Selam K.',
    role: 'Quant Analyst · CBE Capital',
    text: 'The macro shocks, sector dynamics and Birr-native formatting make it the closest thing Ethiopia has to a real practice exchange. Replay mode is gold for demos.',
  },
];

const FAQ = [
  {
    q: 'Is any real money involved?',
    a: 'No. NegadeX is a fully-simulated Ethiopian stock exchange. All capital, prices, news and order books are generated by an in-process algorithm. You can never lose real Birr.',
  },
  {
    q: 'How does the matching engine actually work?',
    a: 'Buys go into a max-heap and sells into a min-heap, both keyed by price with timestamp tie-breaking. Each fill costs O(log n) — exactly how production exchanges work.',
  },
  {
    q: 'Which Ethiopian companies are simulated?',
    a: 'All 32 are major Ethiopian operators across banking (CBE, Awash, Abyssinia), telecom (Ethio Telecom, Safaricom Ethiopia, Tele-Birr), aviation (Ethiopian Airlines), energy (NOC) and more.',
  },
  {
    q: 'Can I install NegadeX as a mobile app?',
    a: 'Yes. NegadeX ships with a Web App Manifest and service worker. Use "Install app" in Chrome / Edge or "Add to Home Screen" on iOS Safari.',
  },
  {
    q: 'Is the source code open?',
    a: 'The full stack — Node.js + Express, MongoDB-with-in-memory-fallback, Socket.IO, React + Vite + Tailwind + Framer Motion — lives in the repo with DSA unit tests.',
  },
  {
    q: 'How fast is the live data?',
    a: 'The market simulator ticks every ~2.5 s. Trades, order book depth, regime changes and news are pushed instantly via Socket.IO with sub-200ms fan-out.',
  },
];

/* ───────────────────────────────────────────────────────────────────
   Page
─────────────────────────────────────────────────────────────────── */

export default function Landing() {
  const stocks = useMarketStore(s => s.stocks);
  const regime = useMarketStore(s => s.regime);
  const connected = useMarketStore(s => s.connected);
  const tickLatencyMs = useMarketStore(s => s.tickLatencyMs);

  const stockList = useMemo(
    () => Object.values(stocks).filter(s => typeof s.changePercent === 'number'),
    [stocks],
  );
  const top = useMemo(
    () => [...stockList].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)).slice(0, 8),
    [stockList],
  );
  const gainers   = stockList.filter(s => s.changePercent > 0).length;
  const decliners = stockList.filter(s => s.changePercent < 0).length;
  const totalVolume = stockList.reduce((sum, s) => sum + (s.volume24h || 0), 0);
  const sectorCount = new Set(stockList.map(s => s.sector).filter(Boolean)).size;
  const featured = top[0];

  return (
    <div className="route-fade pb-10">
      <Hero
        connected={connected}
        regime={regime}
        tickLatencyMs={tickLatencyMs}
        top={top}
        featured={featured}
        gainers={gainers}
        decliners={decliners}
        totalVolume={totalVolume}
      />
      <TrustStrip />
      <NumbersBand
        stockList={stockList}
        sectorCount={sectorCount}
        totalVolume={totalVolume}
      />
      <SectorPulse stockList={stockList} />
      <ProductSections />
      <AlgoSection />
      <EthiopianSection />
      <JourneySection />
      <TestimonialsSection />
      <PricingSection />
      <FaqSection />
      <FinalCta />
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────
   Hero
─────────────────────────────────────────────────────────────────── */

function Hero({ connected, regime, tickLatencyMs, top, featured, gainers, decliners, totalVolume }) {
  return (
    <section className="relative overflow-hidden rounded-[32px] glass-strong p-5 md:p-10 lg:p-16 min-h-[700px] flex items-center">
      {/* Backdrop layers */}
      <div className="absolute inset-0 grid-bg-fine opacity-[0.32]" />
      <div className="absolute inset-0 bg-honeycomb opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent" />
      <div className="absolute -top-40 -right-32 w-[34rem] h-[34rem] rounded-full bg-cyan-500/20 blur-3xl animate-aurora" />
      <div className="absolute -bottom-44 -left-40 w-[32rem] h-[32rem] rounded-full bg-fuchsia-500/20 blur-3xl animate-aurora" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] rounded-full bg-violet-500/10 blur-3xl" />
      <div className="absolute left-0 right-0 top-24 h-px bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent" />

      <div className="relative grid lg:grid-cols-12 gap-10 xl:gap-14 items-center w-full">
        {/* LEFT — pitch */}
        <div className="lg:col-span-7">
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-200 text-[11px] mb-6 tracking-[0.2em] uppercase shadow-[0_0_28px_-12px_rgba(34,211,238,0.8)]">
            <span className="live-dot" />
            Addis Exchange OS · v1.0
            <span className="hidden sm:inline text-cyan-300/60">— now live</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="font-display text-[44px] sm:text-6xl lg:text-[80px] xl:text-[88px] font-bold leading-[0.95] tracking-[-0.045em]">
            <span className="block text-slate-50">Ethiopia's first</span>
            <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent gradient-pan">
              algorithmic exchange.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}
            className="mt-6 text-base lg:text-lg text-slate-400 max-w-2xl leading-relaxed">
            NegadeX is a production-grade trading simulator built on real data structures.
            Trade <span className="text-slate-100">CBE, Ethiopian Airlines, Ethio Telecom, Tele-Birr, Awash</span> and
            27 more in Birr — with a live order book, animated trades tape and a
            heap-powered matching engine running under the hood.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
            className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="btn-primary text-base px-6 py-3 group">
              Open free account
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link to="/login" className="btn-ghost text-base px-6 py-3">Sign in</Link>
            <Link to="/market" className="btn-outline text-base px-5 py-3 hidden sm:inline-flex">
              <PlayCircle size={16} /> Live demo
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}
            className="mt-6 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="pill">
              <LiveBars />
              <span>{connected ? `streaming · ${tickLatencyMs ?? 0}ms` : 'awaiting market stream'}</span>
            </span>
            <span className="pill">
              <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-300 animate-pulse" />
              Regime <span className="text-slate-200 font-semibold">{regime || 'NEUTRAL'}</span>
            </span>
            <span className="pill hidden sm:inline-flex">
              <Globe2 size={11} className="text-cyan-300" /> ETB · Africa/Addis_Ababa
            </span>
            <span className="pill hidden md:inline-flex">
              <ShieldCheck size={11} className="text-bull-300" /> JWT · rate-limited APIs
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.42 }}
            className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">
            {HERO_KPIS.map(({ k, v }) => (
              <motion.div
                key={k}
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                className="card card-rim p-4 relative overflow-hidden">
                <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-cyan-500/10 blur-2xl" />
                <div className="font-display text-2xl font-bold gradient-text">{k}</div>
                <div className="text-[11px] text-slate-500 mt-1">{v}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* RIGHT — terminal preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.6 }}
          className="lg:col-span-5 relative">
          <div className="absolute -inset-5 bg-gradient-to-br from-cyan-500/15 via-violet-500/10 to-fuchsia-500/10 blur-3xl rounded-[36px]" />
          <ExchangeTerminal
            top={top}
            featured={featured}
            connected={connected}
            regime={regime}
            gainers={gainers}
            decliners={decliners}
            totalVolume={totalVolume}
          />
        </motion.div>
      </div>
    </section>
  );
}

function ExchangeTerminal({ top, featured, connected, regime, gainers, decliners, totalVolume }) {
  return (
    <div className="relative card card-rim p-4 md:p-5 overflow-hidden">
      {/* macOS-style window chrome */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        </div>
        <div className="flex items-center gap-2">
          <Wifi size={11} className={connected ? 'text-bull-400' : 'text-bear-400'} />
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">negadex.exchange</span>
        </div>
        <span className={`pill ${connected ? 'border-bull-500/30 text-bull-300' : ''}`}>
          <LiveBars />
          <span className="font-medium text-[10px]">{connected ? regime || 'STREAM' : 'OFFLINE'}</span>
        </span>
      </div>

      {/* Featured mover */}
      {featured ? (
        <Link
          to={`/trade/${featured.symbol}`}
          className="block rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/[0.07] via-transparent to-fuchsia-500/[0.05] p-4 hover:border-cyan-300/40 transition relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="eyebrow text-cyan-300/80">Featured mover</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-display text-2xl font-bold">{featured.symbol}</span>
                <ChangeBadge value={featured.changePercent} />
              </div>
              <div className="text-xs text-slate-500 mt-1 max-w-[240px] truncate">{featured.name}</div>
            </div>
            <div className="text-right">
              <PriceCell value={featured.price} className="text-lg font-bold" />
              <div className="text-[11px] text-slate-500 mt-1">Vol {fmt.compact(featured.volume24h)}</div>
            </div>
          </div>
          <div className="relative mt-3">
            <Sparkline
              data={[featured.open, featured.low, featured.high, featured.price].filter(v => typeof v === 'number')}
              width={360}
              height={56}
              positive={featured.changePercent >= 0}
            />
          </div>
        </Link>
      ) : (
        <div className="skeleton h-32 rounded-2xl" />
      )}

      {/* Mini metrics */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <MiniMetric label="Up"      value={gainers}                cls="text-bull-300" />
        <MiniMetric label="Down"    value={decliners}              cls="text-bear-300" />
        <MiniMetric label="Volume"  value={fmt.compact(totalVolume)} cls="text-cyan-200" />
      </div>

      {/* Top movers list */}
      <div className="space-y-1.5 mt-4">
        {top.length === 0 && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-11" />
        ))}
        {top.slice(0, 5).map(s => {
          const up = (s.changePercent || 0) >= 0;
          return (
            <Link
              to={`/trade/${s.symbol}`}
              key={s.symbol}
              className="flex items-center justify-between p-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:border-cyan-400/30 hover:bg-white/[0.05] transition group">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-7 h-7 rounded-lg grid place-items-center text-[10px] font-bold border
                  ${up ? 'border-bull-500/30 text-bull-300 bg-bull-500/10'
                       : 'border-bear-500/30 text-bear-300 bg-bear-500/10'}`}>
                  {s.symbol.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{s.symbol}</div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[140px]">{s.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <PriceCell value={s.price} className="text-xs" />
                <ChangeBadge value={s.changePercent} />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
        <span>Matched live · in-process DSA engine</span>
        <Link to="/market" className="text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1">
          All movers <ChevronRight size={12} />
        </Link>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, cls }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-2.5">
      <div className="eyebrow">{label}</div>
      <div className={`num font-display text-base font-bold mt-0.5 ${cls}`}>{value}</div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────
   Trust strip
─────────────────────────────────────────────────────────────────── */

function TrustStrip() {
  return (
    <section className="mt-16 lg:mt-24">
      <div className="text-center">
        <div className="eyebrow text-slate-500">Trade Ethiopia's biggest names</div>
      </div>
      <div className="mt-4 relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-ink-950 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-ink-950 to-transparent z-10 pointer-events-none" />
        <motion.div
          className="flex min-w-max items-center gap-10 lg:gap-16 py-3"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 38, ease: 'linear', repeat: Infinity }}
        >
          {[...TRUST_LOGOS, ...TRUST_LOGOS].map((sym, i) => (
            <span
              key={`${sym}-${i}`}
              className="font-display font-bold text-2xl lg:text-3xl tracking-[0.05em] text-slate-600 hover:text-slate-300 transition select-none"
            >
              {sym}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────────────────────────
   Big numbers band (with intersection-observer counter)
─────────────────────────────────────────────────────────────────── */

function NumbersBand({ stockList, sectorCount, totalVolume }) {
  return (
    <section className="mt-20 lg:mt-28">
      <div className="text-center mb-10">
        <div className="eyebrow text-cyan-300/80 mb-2">By the numbers</div>
        <h2 className="section-title">A market that scales with you.</h2>
        <p className="text-slate-500 mt-3 max-w-2xl mx-auto">
          From your first 1,000,000 Birr to the deepest order book — every metric is measured live.
        </p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <BigStat value={stockList.length || 32}     suffix=""   label="Listed companies"     accent="cyan" />
        <BigStat value={1000000}                    suffix=" Br" label="Starting capital"    accent="violet" compact />
        <BigStat value={sectorCount || 8}           suffix="+"  label="Ethiopian sectors"    accent="fuchsia" />
        <BigStat value={Math.max(10, Math.round(totalVolume / 1000))} suffix="K+" label="24h shares traded" accent="bull" />
      </div>
    </section>
  );
}

function BigStat({ value, suffix, label, accent, compact }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf;
    const start = performance.now();
    const dur = 1100;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.floor(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  const display = compact ? fmt.compact(n) : fmt.num(n);

  const accentMap = {
    cyan:    'from-cyan-500/30 to-transparent',
    violet:  'from-violet-500/30 to-transparent',
    fuchsia: 'from-fuchsia-500/30 to-transparent',
    bull:    'from-bull-500/30 to-transparent',
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="card card-rim p-5 lg:p-6 relative overflow-hidden">
      <div className={`absolute -top-12 -right-12 h-32 w-32 rounded-full blur-3xl bg-gradient-to-br ${accentMap[accent]}`} />
      <div className="relative">
        <div className="font-display text-3xl lg:text-5xl font-bold gradient-text-subtle num">
          {display}{suffix}
        </div>
        <div className="text-xs text-slate-500 mt-2 uppercase tracking-[0.18em]">{label}</div>
      </div>
    </motion.div>
  );
}

/* ───────────────────────────────────────────────────────────────────
   Sector pulse — live tape grouped by sector
─────────────────────────────────────────────────────────────────── */

function SectorPulse({ stockList }) {
  const sectors = useMemo(() => {
    const map = new Map();
    for (const s of stockList) {
      if (!s.sector) continue;
      if (!map.has(s.sector)) map.set(s.sector, []);
      map.get(s.sector).push(s);
    }
    return [...map.entries()]
      .map(([sector, items]) => {
        const avg = items.reduce((sum, x) => sum + (x.changePercent || 0), 0) / items.length;
        const vol = items.reduce((sum, x) => sum + (x.volume24h || 0), 0);
        return { sector, items, avg, vol };
      })
      .sort((a, b) => Math.abs(b.avg) - Math.abs(a.avg))
      .slice(0, 6);
  }, [stockList]);

  return (
    <section className="mt-20 lg:mt-28">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <div className="eyebrow text-cyan-300/80 mb-2">Sector pulse</div>
          <h2 className="section-title">Watch the Ethiopian economy breathe.</h2>
          <p className="text-slate-500 mt-2 max-w-xl">
            Banking, telecom, aviation, energy — every sector ticks with its own volatility, drift and beta.
          </p>
        </div>
        <Link to="/heatmap" className="btn-ghost text-sm">
          Open live heatmap <ChevronRight size={14} />
        </Link>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sectors.length === 0 && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-28" />
        ))}
        {sectors.map((s, i) => {
          const up = s.avg >= 0;
          return (
            <motion.div
              key={s.sector}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="card card-rim p-4 relative overflow-hidden hover-lift">
              <div className={`absolute inset-x-0 top-0 h-px ${up ? 'bg-gradient-to-r from-transparent via-bull-400/40 to-transparent' : 'bg-gradient-to-r from-transparent via-bear-400/40 to-transparent'}`} />
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display font-semibold text-sm">{s.sector}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{s.items.length} symbols · vol {fmt.compact(s.vol)}</div>
                </div>
                <span className={`num text-sm font-semibold ${up ? 'text-bull-300' : 'text-bear-300'}`}>
                  {fmt.pct(s.avg, 2)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {s.items.slice(0, 5).map(it => (
                  <Link
                    key={it.symbol}
                    to={`/trade/${it.symbol}`}
                    className="px-2 py-0.5 rounded-md text-[11px] border border-white/10 bg-white/[0.025] hover:border-cyan-400/30 hover:bg-cyan-400/5 transition num">
                    <span className="text-slate-300 font-semibold">{it.symbol}</span>
                    <span className={`ml-1 ${it.changePercent >= 0 ? 'text-bull-300' : 'text-bear-300'}`}>
                      {fmt.pct(it.changePercent, 1)}
                    </span>
                  </Link>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────────────────────────
   Product showcase — three alternating sections
─────────────────────────────────────────────────────────────────── */

function ProductSections() {
  return (
    <section className="mt-20 lg:mt-28">
      <div className="text-center mb-12">
        <div className="eyebrow text-cyan-300/80 mb-2">The product</div>
        <h2 className="section-title">Every screen built like a real exchange.</h2>
        <p className="text-slate-500 mt-3 max-w-2xl mx-auto">
          Three core surfaces, dozens of details. Each one wired into the same live engine.
        </p>
      </div>
      <div className="space-y-12">
        {PRODUCTS.map((p, i) => (
          <ProductRow key={p.title} {...p} index={i} />
        ))}
      </div>
    </section>
  );
}

const ACCENT_ICON = {
  cyan:    'from-cyan-500/20 to-cyan-500/0   text-cyan-200 border-cyan-500/30',
  fuchsia: 'from-fuchsia-500/20 to-fuchsia-500/0 text-fuchsia-200 border-fuchsia-500/30',
  violet:  'from-violet-500/20 to-violet-500/0 text-violet-200 border-violet-500/30',
};
const ACCENT_GLOW = {
  cyan:    'bg-cyan-500/10',
  fuchsia: 'bg-fuchsia-500/10',
  violet:  'bg-violet-500/10',
};

function ProductRow({ icon: Icon, eyebrow, title, text, bullets, accent, index }) {
  const flip = index % 2 === 1;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
      className={`grid lg:grid-cols-12 gap-6 lg:gap-10 items-center ${flip ? 'lg:[&>div:first-child]:order-2' : ''}`}>
      <div className="lg:col-span-6">
        <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gradient-to-br ${ACCENT_ICON[accent]} text-[11px] uppercase tracking-[0.18em] border mb-4`}>
          <Icon size={12} />
          {eyebrow}
        </div>
        <h3 className="font-display text-3xl lg:text-4xl font-bold gradient-text-subtle leading-tight">{title}</h3>
        <p className="text-slate-400 mt-4 leading-relaxed">{text}</p>
        <ul className="mt-5 space-y-2">
          {bullets.map(b => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-slate-300">
              <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-cyan-500/15 border border-cyan-500/30 grid place-items-center text-cyan-300">
                <Check size={12} strokeWidth={3} />
              </span>
              {b}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/register" className="btn-primary text-sm">
            Try it free <ArrowRight size={14} />
          </Link>
          <Link to="/market" className="btn-ghost text-sm">
            See live demo <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      <div className="lg:col-span-6">
        <div className="relative">
          <div className={`absolute -inset-6 ${ACCENT_GLOW[accent]} blur-3xl rounded-[40px]`} />
          <div className="relative card card-rim p-5 lg:p-6 overflow-hidden">
            <div className="absolute inset-0 grid-bg-fine opacity-25" />
            <div className="relative">
              <ProductMock variant={accent} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* Mocks — purely visual, fully styled inline so every section feels like a screenshot */

function ProductMock({ variant }) {
  if (variant === 'cyan')    return <TradingDeskMock />;
  if (variant === 'fuchsia') return <PortfolioMock />;
  return <ProSuiteMock />;
}

function TradingDeskMock() {
  const candles = [38, 30, 26, 22, 28, 32, 24, 18, 24, 30, 36, 32, 28, 18, 12, 22, 18, 28, 30, 36];
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-display text-base font-bold text-slate-100">CBE</span>
          <span className="chip">Banking</span>
        </div>
        <span className="num">1,756.20 Br <span className="text-bull-300 ml-1">+1.42%</span></span>
      </div>
      <svg viewBox="0 0 320 120" className="w-full h-32 mt-3">
        <defs>
          <linearGradient id="tdgrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(34,211,238,0.45)" />
            <stop offset="100%" stopColor="rgba(34,211,238,0)" />
          </linearGradient>
        </defs>
        <polygon
          points={
            candles.map((v, i) => `${(i / (candles.length - 1)) * 320},${v + 30}`).join(' ')
            + ` 320,120 0,120`
          }
          fill="url(#tdgrad)"
        />
        <polyline
          points={candles.map((v, i) => `${(i / (candles.length - 1)) * 320},${v + 30}`).join(' ')}
          stroke="#22d3ee" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="rounded-xl border border-bull-500/20 bg-bull-500/5 p-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-bull-300">Bids</div>
          <div className="space-y-0.5 mt-1.5 text-[11px] num">
            {[[1755.6, 240], [1755.4, 180], [1755.1, 120]].map(([p, q]) => (
              <div key={p} className="relative flex justify-between">
                <span className="text-bull-300">{p.toFixed(2)}</span>
                <span className="text-slate-300">{q}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-bear-500/20 bg-bear-500/5 p-2">
          <div className="text-[10px] uppercase tracking-[0.18em] text-bear-300">Asks</div>
          <div className="space-y-0.5 mt-1.5 text-[11px] num">
            {[[1756.4, 110], [1756.7, 200], [1757.0, 260]].map(([p, q]) => (
              <div key={p} className="relative flex justify-between">
                <span className="text-bear-300">{p.toFixed(2)}</span>
                <span className="text-slate-300">{q}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-bull-500/30 bg-bull-500/15 px-3 py-2 text-center text-bull-200 text-xs font-semibold">BUY</div>
        <div className="rounded-xl border border-bear-500/30 bg-bear-500/10 px-3 py-2 text-center text-bear-200 text-xs font-semibold">SELL</div>
      </div>
    </div>
  );
}

function PortfolioMock() {
  const equity = [62, 60, 58, 54, 56, 50, 48, 44, 40, 42, 36, 30, 26, 22, 26, 18, 14];
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="eyebrow">Net worth</div>
          <div className="font-display text-2xl font-bold gradient-text-subtle num">1,184,520 Br</div>
        </div>
        <span className="badge bg-bull-500/15 text-bull-300 border border-bull-500/25">+18.45%</span>
      </div>
      <svg viewBox="0 0 320 96" className="w-full h-24 mt-3">
        <defs>
          <linearGradient id="pmgrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(236,72,153,0.45)" />
            <stop offset="100%" stopColor="rgba(236,72,153,0)" />
          </linearGradient>
        </defs>
        <polygon
          points={equity.map((v, i) => `${(i / (equity.length - 1)) * 320},${v + 8}`).join(' ') + ` 320,96 0,96`}
          fill="url(#pmgrad)"
        />
        <polyline
          points={equity.map((v, i) => `${(i / (equity.length - 1)) * 320},${v + 8}`).join(' ')}
          stroke="#ec4899" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="grid grid-cols-3 gap-2 mt-3">
        {[
          ['Sharpe', '1.82', 'text-cyan-200'],
          ['Win rate', '64%', 'text-bull-300'],
          ['Max DD', '8.4%', 'text-amber-200'],
        ].map(([k, v, c]) => (
          <div key={k} className="rounded-xl border border-white/10 bg-white/[0.025] p-2">
            <div className="eyebrow">{k}</div>
            <div className={`num font-semibold mt-0.5 ${c}`}>{v}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {[
          ['Banking',  62, 'from-cyan-400 to-violet-400'],
          ['Telecom',  22, 'from-fuchsia-400 to-rose-400'],
          ['Aviation', 16, 'from-amber-300 to-amber-500'],
        ].map(([label, pct, grad]) => (
          <div key={label}>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="text-slate-400">{label}</span>
              <span className="num text-slate-300">{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
              <div className={`h-full rounded-full bg-gradient-to-r ${grad}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProSuiteMock() {
  const TABS = ['Challenges', 'Options', 'Stop / TP', 'Backtest', 'Analytics'];
  return (
    <div>
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/10 overflow-x-auto no-scrollbar">
        {TABS.map((t, i) => (
          <span
            key={t}
            className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium ${i === 1 ? 'bg-violet-500/20 text-violet-200 border border-violet-400/30' : 'text-slate-400'}`}>
            {t}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3">
          <div className="eyebrow">Premium</div>
          <div className="num font-display font-bold text-base mt-1">42.18 Br</div>
        </div>
        {['Underlying 1,756', 'IV 28%', 'Δ 0.62', 'Θ -0.18'].map((m, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/[0.025] p-2.5">
            <div className="eyebrow">{m.split(' ')[0]}</div>
            <div className="num text-sm font-semibold mt-0.5">{m.split(' ').slice(1).join(' ')}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.025] p-3">
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
          <span>Risk radar</span>
          <span className="num">live</span>
        </div>
        <div className="space-y-1.5">
          {[
            ['Win quality',     72, 'from-bull-400 to-emerald-300'],
            ['Diversification', 58, 'from-cyan-400 to-violet-400'],
            ['Concentration',   31, 'from-amber-300 to-amber-500'],
          ].map(([label, pct, grad]) => (
            <div key={label}>
              <div className="flex justify-between text-[10px] text-slate-500"><span>{label}</span><span className="num">{pct}%</span></div>
              <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden mt-0.5">
                <div className={`h-full rounded-full bg-gradient-to-r ${grad}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────
   Algorithm pillars (six)
─────────────────────────────────────────────────────────────────── */

function AlgoSection() {
  return (
    <section className="mt-20 lg:mt-28">
      <div className="text-center mb-10">
        <div className="eyebrow text-cyan-300/80 mb-2">Under the hood</div>
        <h2 className="section-title">Six algorithms. One exchange.</h2>
        <p className="text-slate-500 mt-3 max-w-2xl mx-auto">
          Every interaction touches a textbook DSA — visible, inspectable and unit-tested in the code.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ALGO_PILLARS.map(({ icon: Icon, title, text }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ delay: i * 0.05, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            className="card card-rim p-6 group hover-lift relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-cyan-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition" />
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 via-violet-500/15 to-fuchsia-500/20 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition">
              <Icon size={20} className="text-cyan-200" />
            </div>
            <h3 className="font-display font-semibold text-lg">{title}</h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">{text}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────────────────────────
   Ethiopian market section
─────────────────────────────────────────────────────────────────── */

function EthiopianSection() {
  return (
    <section className="mt-20 lg:mt-28 grid lg:grid-cols-12 gap-4 items-stretch">
      <div className="lg:col-span-5 card card-rim p-6 relative overflow-hidden">
        <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="relative">
          <div className="eyebrow text-fuchsia-300/80 mb-2">Built for Ethiopia</div>
          <h2 className="section-title">A local market, not a renamed template.</h2>
          <p className="text-slate-400 mt-3 leading-relaxed">
            The simulator speaks Birr, tracks Addis Ababa time, responds to Ethiopian macro
            events and groups companies by local sectors so every screen feels anchored in
            the Ethiopian financial story.
          </p>
          <div className="mt-6 grid gap-3">
            {ETH_PILLARS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-white/[0.04] border border-white/10 grid place-items-center text-cyan-300">
                  <Icon size={16} />
                </div>
                <div>
                  <div className="font-display font-semibold text-sm">{title}</div>
                  <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-7 card p-6 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg-fine opacity-20" />
        <div className="relative flex items-center justify-between gap-4 mb-5">
          <div>
            <div className="eyebrow">News stream sample</div>
            <h3 className="font-display text-2xl font-bold gradient-text-subtle mt-1">Ethiopian macro headlines</h3>
          </div>
          <span className="pill"><LiveBars /><span className="text-[10px] uppercase tracking-[0.18em]">live</span></span>
        </div>
        <div className="space-y-2 relative">
          {[
            { kind: 'positive', text: 'NBE cuts policy rate by 50 bps to spur lending.', sym: 'CBE' },
            { kind: 'negative', text: 'ETB devaluation widens import-cost concerns for industrials.', sym: 'NOC' },
            { kind: 'positive', text: 'Ethiopian Airlines posts record cargo revenue this quarter.', sym: 'ETHA' },
            { kind: 'info',     text: 'GERD reaches another generation milestone, lifting energy stocks.' },
            { kind: 'positive', text: 'Tele-Birr crosses 50M users — fintech sentiment turns bullish.', sym: 'TBIRR' },
          ].map((n, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="p-3 rounded-xl bg-white/[0.025] border border-white/5 hover:border-cyan-400/20 transition flex items-start gap-3">
              <span className={`badge text-[10px] shrink-0 ${
                n.kind === 'positive' ? 'bg-bull-500/15 text-bull-300 border border-bull-500/25'
                : n.kind === 'negative' ? 'bg-bear-500/15 text-bear-300 border border-bear-500/25'
                : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/25'}`}>
                {n.kind.toUpperCase()}
              </span>
              <p className="text-sm text-slate-300 leading-relaxed flex-1">
                {n.text}
                {n.sym && <span className="ml-2 text-xs text-slate-500">· {n.sym}</span>}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────────────────────────
   Journey (4 steps)
─────────────────────────────────────────────────────────────────── */

function JourneySection() {
  return (
    <section className="mt-20 lg:mt-28">
      <div className="text-center mb-10">
        <div className="eyebrow text-cyan-300/80 mb-2">From signup to leaderboard</div>
        <h2 className="section-title">Get to your first trade in under a minute.</h2>
      </div>
      <div className="relative">
        <div className="hidden lg:block absolute top-12 left-[8%] right-[8%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
          {JOURNEY.map(({ step, title, text }, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="card card-rim p-5 relative overflow-hidden">
              <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-cyan-500/10 blur-2xl" />
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 to-fuchsia-400 text-ink-950 grid place-items-center font-display font-bold text-sm shadow-[0_0_22px_-4px_rgba(34,211,238,0.55)]">
                {step}
              </div>
              <div className="font-display font-semibold mt-3">{title}</div>
              <div className="text-xs text-slate-500 mt-1.5 leading-relaxed">{text}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────────────────────────
   Testimonials
─────────────────────────────────────────────────────────────────── */

function TestimonialsSection() {
  return (
    <section className="mt-20 lg:mt-28">
      <div className="text-center mb-10">
        <div className="eyebrow text-cyan-300/80 mb-2">Trusted by builders and traders</div>
        <h2 className="section-title">Loved by Addis engineers, students and analysts.</h2>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {TESTIMONIALS.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            className="card card-rim p-6 relative overflow-hidden hover-lift">
            <Quote size={28} className="text-cyan-300/40 absolute top-4 right-4" />
            <div className="flex items-center gap-1 text-amber-300 mb-3">
              {Array.from({ length: 5 }).map((_, k) => <Star key={k} size={12} fill="currentColor" />)}
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">"{t.text}"</p>
            <div className="mt-5 flex items-center gap-3 pt-4 border-t border-white/5">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-400 text-ink-950 grid place-items-center font-bold text-sm">
                {t.name.charAt(0)}
              </div>
              <div>
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="text-[11px] text-slate-500">{t.role}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────────────────────────
   Pricing — single highlight (free) + Pro (free preview)
─────────────────────────────────────────────────────────────────── */

function PricingSection() {
  const tiers = [
    {
      name: 'Trader',
      price: 'Free',
      sub: 'Forever, for everyone.',
      perks: [
        '1,000,000 Br virtual capital',
        'Live order book & matching engine',
        'Watchlists, alerts, notifications',
        'Equity curve, risk radar, achievements',
        'Mobile PWA install',
      ],
      cta: { label: 'Open free account', to: '/register' },
      highlight: false,
    },
    {
      name: 'Pro Suite',
      price: 'Included',
      sub: 'Ten institutional modules.',
      perks: [
        'Stop-loss / take-profit triggers',
        'Black-Scholes options simulator',
        'MA-crossover backtests',
        'News sentiment scanner',
        'Admin replay & advanced analytics',
      ],
      cta: { label: 'Explore Pro Suite', to: '/pro' },
      highlight: true,
    },
    {
      name: 'Builder',
      price: 'Open source',
      sub: 'For students & engineers.',
      perks: [
        'Full Node + React stack on disk',
        'DSA unit tests in the backend',
        'In-memory fallback (no DB needed)',
        'Socket.IO contract documented',
        'MIT-style usage for learning',
      ],
      cta: { label: 'View algorithms', to: '/dashboard' },
      highlight: false,
    },
  ];

  return (
    <section className="mt-20 lg:mt-28">
      <div className="text-center mb-10">
        <div className="eyebrow text-cyan-300/80 mb-2">Pricing</div>
        <h2 className="section-title">Always free. Always live.</h2>
        <p className="text-slate-500 mt-3 max-w-2xl mx-auto">
          NegadeX is a learning-first platform. Every module — from charts to options — is included from day one.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {tiers.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            className={`relative card card-rim p-6 overflow-hidden hover-lift ${t.highlight ? 'border-cyan-400/40 shadow-[0_0_60px_-20px_rgba(34,211,238,0.6)]' : ''}`}>
            {t.highlight && (
              <>
                <div className="absolute inset-x-0 top-0 h-px market-scanline" />
                <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-cyan-500/15 blur-3xl" />
                <span className="absolute top-4 right-4 badge bg-cyan-500/15 text-cyan-200 border border-cyan-400/30 text-[10px]">
                  Most loved
                </span>
              </>
            )}
            <div className="relative">
              <div className="eyebrow">{t.name}</div>
              <div className="font-display text-3xl font-bold mt-1 gradient-text-subtle">{t.price}</div>
              <div className="text-xs text-slate-500 mt-1">{t.sub}</div>
              <ul className="mt-5 space-y-2">
                {t.perks.map(p => (
                  <li key={p} className="flex items-start gap-2 text-sm text-slate-300">
                    <Check size={14} className="text-cyan-300 mt-0.5 shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={t.cta.to}
                className={`mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                  t.highlight
                    ? 'bg-gradient-to-r from-cyan-300 via-cyan-400 to-fuchsia-400 text-ink-950 hover:shadow-[0_0_28px_rgba(34,211,238,0.4)]'
                    : 'bg-white/[0.04] border border-white/10 text-slate-200 hover:bg-white/[0.08]'
                }`}>
                {t.cta.label}
                <ArrowRight size={14} />
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────────────────────────
   FAQ accordion
─────────────────────────────────────────────────────────────────── */

function FaqSection() {
  const [open, setOpen] = useState(0);
  return (
    <section className="mt-20 lg:mt-28">
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5">
          <div className="eyebrow text-cyan-300/80 mb-2">Common questions</div>
          <h2 className="section-title">Everything you need to know.</h2>
          <p className="text-slate-500 mt-3 leading-relaxed">
            Still curious? Open the live demo, peek at the order book, then come back to ask
            sharper questions in the social feed.
          </p>
          <Link to="/market" className="btn-ghost mt-6 text-sm">
            <PlayCircle size={14} /> Skip to the live demo
          </Link>
        </div>
        <div className="lg:col-span-7 space-y-2">
          {FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={item.q}
                className={`card transition overflow-hidden ${isOpen ? 'border-cyan-400/30' : ''}`}>
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="w-full flex items-center justify-between text-left p-4 lg:p-5 gap-4">
                  <span className="font-display font-semibold text-sm lg:text-base">{item.q}</span>
                  <ChevronDown
                    size={18}
                    className={`text-slate-400 transition-transform shrink-0 ${isOpen ? 'rotate-180 text-cyan-300' : ''}`}
                  />
                </button>
                <motion.div
                  initial={false}
                  animate={{
                    height: isOpen ? 'auto' : 0,
                    opacity: isOpen ? 1 : 0,
                  }}
                  transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                  className="overflow-hidden">
                  <div className="px-4 lg:px-5 pb-4 lg:pb-5 text-sm text-slate-400 leading-relaxed">
                    {item.a}
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────────────────────────────────────────────
   Final CTA
─────────────────────────────────────────────────────────────────── */

function FinalCta() {
  return (
    <section className="mt-20 lg:mt-28 relative overflow-hidden rounded-[32px] card card-rim p-10 md:p-16 text-center
                        bg-gradient-to-br from-cyan-500/10 via-transparent to-fuchsia-500/10">
      <div className="absolute inset-0 grid-bg-fine opacity-30" />
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[40rem] h-[20rem] rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[40rem] h-[20rem] rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] uppercase tracking-[0.2em] text-slate-300 mb-5">
          <Sparkles size={12} className="text-cyan-300" />
          Launch ready · v1.0
        </div>
        <h3 className="font-display text-3xl lg:text-5xl font-bold gradient-text-subtle leading-tight">
          Your trading desk is one click away.
        </h3>
        <p className="text-slate-400 mt-4 max-w-xl mx-auto leading-relaxed">
          Spin up a NegadeX account in under 30 seconds — no card required.
          One million Birr in virtual capital is waiting.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/register" className="btn-primary px-8 py-3 text-base">
            Create my portfolio <ArrowRight size={18} />
          </Link>
          <Link to="/heatmap" className="btn-ghost px-6 py-3 text-base">
            See the heatmap
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-500">
          <span className="pill"><Smartphone size={11} className="text-cyan-300" /> Installable PWA</span>
          <span className="pill"><Code2 size={11} className="text-fuchsia-300" /> Open source DSA</span>
          <span className="pill"><Trophy size={11} className="text-amber-300" /> Live leaderboard</span>
        </div>
      </div>
    </section>
  );
}
