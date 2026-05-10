import { useMarketStore } from '../store/marketStore';
import { fmt } from '../utils/format';
import { motion, AnimatePresence } from 'framer-motion';
import LiveBars from './LiveBars';

export default function TradesTape({ symbol = null, max = 22 }) {
  const trades = useMarketStore(s => s.trades);
  const filtered = (symbol ? trades.filter(t => t.symbol === symbol) : trades).slice(0, max);

  return (
    <div className="card p-4 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent" />

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-sm">Recent Trades</h3>
        <span className="pill">
          <LiveBars />
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">tape</span>
        </span>
      </div>

      <div className="grid grid-cols-[1fr_minmax(0,1fr)_1fr_1fr] text-[10px] uppercase tracking-[0.18em] text-slate-500 px-2 mb-1">
        <span>Symbol</span>
        <span className="text-right">Price</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Time</span>
      </div>

      <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-8">
            <div className="font-display text-base mb-1">Waiting for trades…</div>
            <div className="text-[11px] text-slate-600">The matching engine will print here as orders fill.</div>
          </div>
        )}
        <AnimatePresence initial={false}>
          {filtered.map((t) => {
            const up = t.takerSide === 'BUY';
            const key = `${t.symbol}-${t.executedAt}-${t.price}-${t.quantity}-${t.takerSide}`;
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0 }}
                transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                className={`grid grid-cols-[1fr_minmax(0,1fr)_1fr_1fr] text-xs num px-2 py-1.5 rounded-lg border ${
                  up
                    ? 'bg-bull-500/[0.04] border-bull-500/15 hover:border-bull-500/30'
                    : 'bg-bear-500/[0.04] border-bear-500/15 hover:border-bear-500/30'
                } transition`}>
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${up ? 'bg-bull-400' : 'bg-bear-400'}`} />
                  {t.symbol}
                </span>
                <span className={`text-right ${up ? 'text-bull-300' : 'text-bear-300'} font-semibold`}>
                  {fmt.money(+t.price)}
                </span>
                <span className="text-right text-slate-300">{fmt.num(t.quantity)}</span>
                <span className="text-right text-slate-500" title={t.latencyMs !== undefined ? `${t.latencyMs}ms route latency` : ''}>
                  {fmt.time(t.executedAt)}
                  {t.latencyMs !== undefined && <span className="ml-1 text-slate-700">·{t.latencyMs}ms</span>}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
