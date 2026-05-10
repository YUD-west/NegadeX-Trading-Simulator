import { useEffect, useState } from 'react';
import { trade } from '../services/api';
import { fmt } from '../utils/format';
import { getSocket } from '../services/socket';
import { motion, AnimatePresence } from 'framer-motion';
import LiveBars from './LiveBars';

/**
 * Live order book visualisation.
 * Re-fetches every 1.5s while mounted as a polling fallback, but the
 * primary update path is the per-symbol `orderbook:update` socket event.
 */
export default function OrderBook({ symbol }) {
  const [depth, setDepth] = useState({ bids: [], asks: [] });
  const [last, setLast]   = useState(0);
  const [updatedAt, setUpdatedAt] = useState(Date.now());

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const data = await trade.orderbook(symbol);
        if (!alive) return;
        setDepth(data.depth);
        setLast(data.lastPrice);
        setUpdatedAt(Date.now());
      } catch {}
    };
    tick();
    const id = setInterval(tick, 1500);
    return () => { alive = false; clearInterval(id); };
  }, [symbol]);

  useEffect(() => {
    const s = getSocket();
    const handler = (payload) => {
      if (payload?.symbol !== symbol) return;
      setDepth(payload.depth);
      setLast(payload.lastPrice);
      setUpdatedAt(Date.now());
    };
    s.on('orderbook:update', handler);
    return () => s.off('orderbook:update', handler);
  }, [symbol]);

  const maxQty = Math.max(
    1,
    ...depth.bids.map(b => b.quantity),
    ...depth.asks.map(a => a.quantity),
  );
  const totalBid = depth.bids.reduce((s, x) => s + x.quantity, 0);
  const totalAsk = depth.asks.reduce((s, x) => s + x.quantity, 0);
  const imbalance = totalBid + totalAsk > 0 ? totalBid / (totalBid + totalAsk) : 0.5;

  const Row = ({ row, side }) => {
    const w = `${(row.quantity / maxQty) * 100}%`;
    const isBid = side === 'bid';
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: isBid ? 8 : -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        className="relative grid grid-cols-3 text-xs num py-1.5 px-3 rounded-md overflow-hidden">
        <div
          className={`absolute inset-y-0 ${isBid ? 'right-0 bg-gradient-to-l from-bull-500/30 to-bull-500/5' : 'left-0 bg-gradient-to-r from-bear-500/30 to-bear-500/5'}`}
          style={{ width: w }}
        />
        <span className={`relative ${isBid ? 'text-bull-300' : 'text-bear-300'} font-semibold`}>
          {fmt.money(row.price)}
        </span>
        <span className="relative text-right text-slate-200">{fmt.num(row.quantity)}</span>
        <span className="relative text-right text-slate-500">
          {fmt.compact(row.price * row.quantity)}
        </span>
      </motion.div>
    );
  };

  return (
    <div className="card p-4 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent" />

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-sm tracking-wide">Order Book</h3>
        <span className="pill">
          <LiveBars />
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
            {Math.max(0, Math.round((Date.now() - updatedAt) / 1000))}s
          </span>
        </span>
      </div>

      <div className="grid grid-cols-3 text-[10px] uppercase tracking-[0.18em] text-slate-500 px-3 mb-1">
        <span>Price</span><span className="text-right">Qty</span><span className="text-right">Total</span>
      </div>

      {/* Asks (highest first → flipped order) */}
      <div className="max-h-44 overflow-y-auto">
        <AnimatePresence initial={false}>
          {depth.asks.slice().reverse().map((a) => <Row key={`a-${a.price}`} row={a} side="ask" />)}
        </AnimatePresence>
        {depth.asks.length === 0 && (
          <div className="text-center text-[11px] text-slate-600 py-4">No asks</div>
        )}
      </div>

      <div className="my-2.5 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Last</span>
        <span className="num text-cyan-300 font-display text-sm font-bold">{fmt.money(last)}</span>
      </div>

      {/* Bids */}
      <div className="max-h-44 overflow-y-auto">
        <AnimatePresence initial={false}>
          {depth.bids.map((b) => <Row key={`b-${b.price}`} row={b} side="bid" />)}
        </AnimatePresence>
        {depth.bids.length === 0 && (
          <div className="text-center text-[11px] text-slate-600 py-4">No bids</div>
        )}
      </div>

      {/* Imbalance bar */}
      <div className="mt-3">
        <div className="flex justify-between text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-1">
          <span>Bid {fmt.compact(totalBid)}</span>
          <span>Ask {fmt.compact(totalAsk)}</span>
        </div>
        <div className="flex h-1.5 rounded-full overflow-hidden bg-white/[0.04]">
          <div className="bg-bull-500/70" style={{ width: `${(imbalance * 100).toFixed(1)}%` }} />
          <div className="bg-bear-500/70 flex-1" />
        </div>
      </div>
    </div>
  );
}
