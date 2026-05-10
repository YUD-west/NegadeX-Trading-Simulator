import { create } from 'zustand';
import { stocks as stocksApi, portfolio as portfolioApi } from '../services/api';
import { getSocket } from '../services/socket';
import { fmt } from '../utils/format';
import toast from 'react-hot-toast';

/**
 * Live market store. Holds:
 *   - the latest snapshot of every stock
 *   - market regime / sentiment
 *   - latest trades tape
 *   - portfolio snapshot for the logged-in user
 *
 * We maintain a single Socket.IO connection that pumps tick / trade /
 * order events into the store, so any component can subscribe with
 * useMarketStore(s => s.stocks[symbol]) for granular re-renders.
 */
export const useMarketStore = create((set, get) => ({
  stocks: {},                  // symbol → stock
  regime: 'NEUTRAL',
  trades: [],                  // public tape
  portfolio: null,
  news: [],
  connected: false,
  lastTickAt: null,
  tickLatencyMs: null,
  recentRegimeEvent: null,

  async fetchInitial() {
    try {
      const [list, news] = await Promise.all([
        stocksApi.list({ limit: 200 }),
        stocksApi.news().catch(() => ({ news: [] })),
      ]);
      const map = {};
      list.items.forEach(s => { map[s.symbol] = s; });
      set({ stocks: map, regime: list.regime, news: news.news || [] });
    } catch (e) {
      toast.error('Failed to load market data');
    }
  },

  async fetchPortfolio() {
    try {
      const data = await portfolioApi.me();
      set({ portfolio: data.portfolio });
    } catch {
      // unauthorised — ignore
    }
  },

  applyTick({ stocks: ticked, regime, ts }) {
    const cur = get().stocks;
    const next = { ...cur };
    const now = Date.now();
    for (const t of ticked) {
      const prev = next[t.symbol];
      if (prev) {
        next[t.symbol] = {
          ...prev,
          price: t.price,
          change: t.change,
          changePercent: t.changePercent,
          volume24h: t.volume24h,
          tickDirection: t.tickDirection,
          _flash: t.price > prev.price ? 'up' : t.price < prev.price ? 'down' : null,
          _flashAt: now,
        };
      }
    }
    set({ stocks: next, regime, lastTickAt: now, tickLatencyMs: ts ? Math.max(0, now - ts) : null });
  },

  pushTrade(trade) {
    const trades = [trade, ...get().trades].slice(0, 40);
    set({ trades });
  },

  pushNews(item) {
    const news = [item, ...get().news].slice(0, 30);
    set({ news });
  },

  connect() {
    const s = getSocket();
    s.off('tick'); s.off('trade'); s.off('news');
    s.off('regime'); s.off('order:fill'); s.off('alert');
    let lastPortfolioRefresh = 0;

    s.on('connect',    () => set({ connected: true }));
    s.on('disconnect', () => set({ connected: false }));
    s.on('tick',  (p) => {
      get().applyTick(p);
      const now = Date.now();
      if (get().portfolio && now - lastPortfolioRefresh > 5000) {
        lastPortfolioRefresh = now;
        get().fetchPortfolio();
      }
    });
    s.on('trade', (t) => get().pushTrade(t));
    s.on('news',  (n) => get().pushNews(n));
    s.on('regime', ({ regime, item }) => {
      set({ regime, recentRegimeEvent: { regime, item, at: Date.now() } });
      toast(`Market regime switched to ${regime}`, { icon: regime === 'BULL' ? '▲' : regime === 'BEAR' ? '▼' : regime === 'VOLATILE' ? '!' : '•' });
    });

    s.on('order:fill', (f) => {
      toast.success(`${f.side} ${f.quantity} ${f.symbol} @ ${fmt.money(+f.price)}${f.latencyMs !== undefined ? ` · ${f.latencyMs}ms` : ''}`);
      get().fetchPortfolio();
    });

    s.on('alert', (a) => {
      toast(`Alert: ${a.symbol} crossed ${a.direction === 'ABOVE' ? '≥' : '≤'} ${a.price} Br`,
        { icon: '🔔', duration: 6000 });
    });
  },
}));
