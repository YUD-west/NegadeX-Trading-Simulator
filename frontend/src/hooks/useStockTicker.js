import { useEffect, useState } from 'react';
import { getSocket } from '../services/socket';

/**
 * Subscribe to a single symbol's live price stream.
 * Returns { price, change, changePercent, ts }.
 */
export function useStockTicker(symbol) {
  const [tick, setTick] = useState(null);
  useEffect(() => {
    if (!symbol) return;
    const s = getSocket();
    s.emit('subscribe:stock', symbol);
    const handler = (p) => { if (p.symbol === symbol) setTick(p); };
    s.on('stock:price', handler);
    return () => {
      s.off('stock:price', handler);
      s.emit('unsubscribe:stock', symbol);
    };
  }, [symbol]);
  return tick;
}
