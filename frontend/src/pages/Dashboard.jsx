import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMarketStore } from '../store/marketStore';
import { useAuthStore } from '../store/authStore';
import { stocks as stocksApi, watchlist as wlApi, insights } from '../services/api';
import { fmt } from '../utils/format';
import PriceCell from '../components/PriceCell';
import ChangeBadge from '../components/ChangeBadge';
import Skeleton from '../components/Skeleton';
import Recommendations from '../components/Recommendations';
import Sparkline from '../components/Sparkline';
import LiveBars from '../components/LiveBars';
import PageHeader from '../components/PageHeader';
import {
  Wallet, TrendingUp, TrendingDown, Activity, Eye, Newspaper, ArrowRight, Coins,
  Flame, ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const user = useAuthStore(s => s.user);
  const portfolio = useMarketStore(s => s.portfolio);
  const news = useMarketStore(s => s.news);
  const stocks = useMarketStore(s => s.stocks);
  const regime = useMarketStore(s => s.regime);
  const connected = useMarketStore(s => s.connected);

  const [trending, setTrending] = useState({ gainers: [], losers: [], mostTraded: [] });
  const [summary, setSummary] = useState(null);
  const [watch, setWatch] = useState([]);
  const [equity, setEquity] = useState([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [t, s, wl, eq] = await Promise.all([
          stocksApi.trending(),
          stocksApi.summary(),
          wlApi.list().catch(() => ({ details: [] })),
          insights.equity().catch(() => ({ points: [] })),
        ]);
        if (!alive) return;
        setTrending(t);
        setSummary(s);
        setWatch(wl.details || []);
        setEquity(eq.points || []);
      } catch {}
    };
    load();
    const id = setInterval(load, 8000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const liveWatch = watch.map(w => stocks[w.symbol] || w);
  const equityValues = useMemo(() => equity.map(p => p.value), [equity]);

  const sentimentClass = summary?.sentiment === 'BULLISH' ? 'text-bull-300'
    : summary?.sentiment === 'BEARISH' ? 'text-bear-300' : 'text-slate-300';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Hi ${user?.name?.split(' ')[0] || 'trader'}`}
        title="Today on the Addis Exchange"
        subtitle="Your live portfolio, watchlist, market sentiment and the freshest movers — all updating in real time."
        accent="cyan"
        actions={
          <div className="flex items-center gap-2">
            <span className="pill">
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-bull-400 animate-pulse' : 'bg-bear-400'}`} />
              <span className="text-[10px] uppercase tracking-[0.18em]">{connected ? 'live' : 'offline'}</span>
            </span>
            <Link to="/trade" className="btn-primary text-sm">
              Open trade desk <ArrowRight size={14} />
            </Link>
          </div>
        }
      />

      {/* KPI strip */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {portfolio ? (
          <>
            <KpiCard
              icon={Wallet}
              label="Total Portfolio"
              value={fmt.money(portfolio.totalValue)}
              delta={portfolio.pnlPercent}
              spark={equityValues}
              accent="cyan"
              live
            />
            <KpiCard
              icon={TrendingUp}
              label="Unrealized P/L"
              value={fmt.money((portfolio.pnl ?? 0) - (portfolio.realizedPnL ?? 0))}
              accent="bull"
            />
            <KpiCard
              icon={Activity}
              label="Realized P/L"
              value={fmt.money(portfolio.realizedPnL ?? 0)}
              accent="violet"
            />
            <KpiCard
              icon={Coins}
              label="Available Cash"
              value={fmt.money(portfolio.cash ?? 0)}
              accent="fuchsia"
            />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)
        )}
      </div>

      {/* Market summary */}
      {summary && (
        <div className="card card-rim p-5 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px market-scanline" />
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <SummaryItem label="Market Sentiment" main={
              <span className={`font-display text-xl font-bold ${sentimentClass}`}>{summary.sentiment}</span>
            } sub={`Regime · ${regime || summary.regime}`} />
            <div className="v-divider hidden lg:block" />
            <SummaryItem label="Advancing" main={<span className="num font-semibold text-bull-300">{summary.advancing}</span>} />
            <SummaryItem label="Declining" main={<span className="num font-semibold text-bear-300">{summary.declining}</span>} />
            <SummaryItem label="Avg Δ"     main={<span className="num font-semibold">{fmt.pct(summary.averageChangePercent)}</span>} />
            {summary.topGainer && (
              <SummaryItem label="Top Gainer" main={
                <Link to={`/trade/${summary.topGainer.symbol}`} className="text-bull-300 font-semibold hover:underline">{summary.topGainer.symbol}</Link>
              } sub={fmt.pct(summary.topGainer.changePercent)} />
            )}
            {summary.topLoser && (
              <SummaryItem label="Top Loser" main={
                <Link to={`/trade/${summary.topLoser.symbol}`} className="text-bear-300 font-semibold hover:underline">{summary.topLoser.symbol}</Link>
              } sub={fmt.pct(summary.topLoser.changePercent)} />
            )}
            <div className="ml-auto pill">
              <LiveBars />
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Streaming</span>
            </div>
          </div>
        </div>
      )}

      {/* Trending */}
      <div className="grid lg:grid-cols-3 gap-4">
        <TrendingPanel title="Top Gainers" icon={TrendingUp} accent="bull" items={trending.gainers} />
        <TrendingPanel title="Top Losers"  icon={TrendingDown} accent="bear" items={trending.losers} />
        <TrendingPanel title="Most Traded" icon={Flame} accent="cyan" items={trending.mostTraded} valueKey="volume24h" formatter={fmt.compact} />
      </div>

      <Recommendations />

      {/* Watchlist + News */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold flex items-center gap-2">
              <span className="h-7 w-7 rounded-lg bg-cyan-500/15 text-cyan-300 grid place-items-center"><Eye size={14} /></span>
              Watchlist
            </h3>
            <Link to="/market" className="text-xs text-cyan-300 hover:text-cyan-200 inline-flex items-center gap-1">
              Manage <ChevronRight size={12} />
            </Link>
          </div>
          {liveWatch.length === 0 ? (
            <p className="text-sm text-slate-500 py-10 text-center">
              Your watchlist is empty. <Link to="/market" className="text-cyan-300">Add some Ethiopian stocks</Link>.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {liveWatch.map(s => {
                const up = (s.changePercent || 0) >= 0;
                return (
                  <Link to={`/trade/${s.symbol}`} key={s.symbol}
                    className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:border-cyan-400/25 hover:bg-white/[0.04] transition group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl grid place-items-center text-[10px] font-bold border
                        ${up ? 'border-bull-500/30 bg-bull-500/10 text-bull-300'
                              : 'border-bear-500/30 bg-bear-500/10 text-bear-300'}`}>
                        {s.symbol.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{s.symbol}</div>
                        <div className="text-[11px] text-slate-500 truncate">{s.name}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <PriceCell value={s.price} className="text-sm" />
                      <ChangeBadge value={s.changePercent} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-display font-semibold flex items-center gap-2 mb-4">
            <span className="h-7 w-7 rounded-lg bg-fuchsia-500/15 text-fuchsia-300 grid place-items-center"><Newspaper size={14} /></span>
            Market News
          </h3>
          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {news.length === 0 && (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
              </div>
            )}
            {news.map(n => (
              <motion.div
                key={n.id || n.text}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-cyan-400/20 transition">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge text-[10px] ${
                    n.kind === 'positive' ? 'bg-bull-500/15 text-bull-300 border border-bull-500/25'
                    : n.kind === 'negative' ? 'bg-bear-500/15 text-bear-300 border border-bear-500/25'
                    : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/25'}`}>
                    {n.kind?.toUpperCase() || 'INFO'}
                  </span>
                  {n.symbol && <span className="text-xs font-semibold text-slate-200">{n.symbol}</span>}
                  <span className="ml-auto text-[10px] text-slate-600">{fmt.time(n.time || Date.now())}</span>
                </div>
                <p className="text-sm text-slate-300 leading-snug">{n.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, main, sub }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className="mt-0.5 leading-tight">{main}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

const ACCENT = {
  cyan:    { glow: 'bg-cyan-500/30',    iconWrap: 'text-cyan-200',    border: 'border-cyan-500/25' },
  bull:    { glow: 'bg-bull-500/30',    iconWrap: 'text-bull-300',    border: 'border-bull-500/25' },
  fuchsia: { glow: 'bg-fuchsia-500/30', iconWrap: 'text-fuchsia-200', border: 'border-fuchsia-500/25' },
  violet:  { glow: 'bg-violet-500/30',  iconWrap: 'text-violet-200',  border: 'border-violet-500/25' },
};

function KpiCard({ icon: Icon, label, value, delta, accent = 'cyan', spark, live = false }) {
  const a = ACCENT[accent] || ACCENT.cyan;
  return (
    <motion.div
      layout
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="card card-rim p-5 relative overflow-hidden"
    >
      <div className={`absolute -right-10 -top-10 w-28 h-28 rounded-full blur-3xl opacity-80 ${a.glow}`} />
      <div className="absolute inset-x-0 top-0 h-px market-scanline opacity-80" />
      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <div className="eyebrow">{label}</div>
          <div className="num font-display text-2xl font-bold mt-1.5 gradient-text-subtle truncate">{value}</div>
          {delta !== undefined && <div className="mt-1.5"><ChangeBadge value={delta} /></div>}
        </div>
        <div className={`w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center ${a.iconWrap}`}>
          <Icon size={18} />
        </div>
      </div>

      {spark && spark.length > 1 && (
        <div className="relative mt-3">
          <Sparkline data={spark} width={300} height={36} />
        </div>
      )}

      {live && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1 text-[10px] text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" /> live
        </div>
      )}
    </motion.div>
  );
}

const TREND_ACCENT = {
  bull: { iconWrap: 'bg-bull-500/15 text-bull-300', dot: 'bg-bull-400' },
  bear: { iconWrap: 'bg-bear-500/15 text-bear-300', dot: 'bg-bear-400' },
  cyan: { iconWrap: 'bg-cyan-500/15 text-cyan-300', dot: 'bg-cyan-400' },
};

function TrendingPanel({ title, icon: Icon, accent, items, valueKey = 'changePercent', formatter }) {
  const a = TREND_ACCENT[accent] || TREND_ACCENT.cyan;
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <span className={`h-7 w-7 rounded-lg grid place-items-center ${a.iconWrap}`}>
            <Icon size={14} />
          </span>
          {title}
        </h3>
        <span className="pill">
          <span className={`h-1.5 w-1.5 rounded-full ${a.dot} animate-pulse`} />
          <span className="text-[10px] uppercase tracking-[0.18em]">Top {items.length || 5}</span>
        </span>
      </div>
      <div className="space-y-1.5">
        {items.length === 0 && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
        {items.map((s, idx) => (
          <Link to={`/trade/${s.symbol}`} key={s.symbol}
            className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white/5 transition group">
            <div className="flex items-center gap-3 min-w-0">
              <span className="num text-[10px] text-slate-600 w-4 text-right">{idx + 1}</span>
              <div className="min-w-0">
                <div className="font-semibold text-sm">{s.symbol}</div>
                <div className="text-[11px] text-slate-500 truncate max-w-[140px]">{s.name}</div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <PriceCell value={s.price} className="text-sm" />
              {valueKey === 'changePercent'
                ? <ChangeBadge value={s.changePercent} />
                : <span className="text-[11px] text-slate-400 num">{formatter ? formatter(s[valueKey]) : s[valueKey]}</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
