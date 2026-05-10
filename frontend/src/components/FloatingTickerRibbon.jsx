import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMarketStore } from '../store/marketStore';
import { fmt } from '../utils/format';

export default function FloatingTickerRibbon() {
  const stocks = useMarketStore(s => s.stocks);
  const connected = useMarketStore(s => s.connected);
  const tickLatencyMs = useMarketStore(s => s.tickLatencyMs);

  const movers = Object.values(stocks)
    .filter(s => s && typeof s.changePercent === 'number')
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 18);

  if (!movers.length) return null;

  return (
    <div className="sticky top-16 z-30 border-b border-white/[0.05] bg-ink-950/65 backdrop-blur-xl">
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-ink-950 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-32 w-24 bg-gradient-to-l from-ink-950 to-transparent z-10 pointer-events-none" />

      <div className="max-w-[1600px] mx-auto flex items-center">
        <div className="overflow-hidden flex-1">
          <motion.div
            className="flex min-w-max items-center gap-2 py-2 pl-4 lg:pl-8"
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 56, ease: 'linear', repeat: Infinity }}
          >
            {[...movers, ...movers].map((s, idx) => {
              const up = (s.changePercent || 0) >= 0;
              const live = idx < movers.length;
              return (
                <Link
                  to={`/trade/${s.symbol}`}
                  key={`${s.symbol}-${idx}`}
                  className={`group flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition
                              ${up ? 'border-bull-500/15 hover:border-bull-400/40 bg-bull-500/[0.03]'
                                   : 'border-bear-500/15 hover:border-bear-400/40 bg-bear-500/[0.03]'}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${up ? 'bg-bull-400' : 'bg-bear-400'} ${live ? 'animate-pulse' : ''}`} />
                  <span className="font-semibold text-slate-100 tracking-wide">{s.symbol}</span>
                  <span className="num text-slate-500">{fmt.money(s.price, { min: 0, max: 0 })}</span>
                  <span className={`num font-semibold ${up ? 'text-bull-300' : 'text-bear-300'}`}>{fmt.pct(s.changePercent, 1)}</span>
                </Link>
              );
            })}
          </motion.div>
        </div>

        <div className="hidden md:flex items-center gap-2 pr-4 lg:pr-8 z-20">
          <span className="pill">
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-bull-400 animate-pulse' : 'bg-bear-400'}`} />
            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              {connected ? `live · ${tickLatencyMs ?? 0}ms` : 'offline'}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
