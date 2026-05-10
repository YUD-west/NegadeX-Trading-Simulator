import { create } from 'zustand';
import { getSocket } from '../services/socket';

const MAX = 50;

let boundSocket = null;
let handlers = null;

export const useNotificationStore = create((set, get) => ({
  items: [],
  unread: 0,
  open: false,

  push(notification) {
    const item = {
      id: `n${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time: Date.now(),
      ...notification,
    };
    const items = [item, ...get().items].slice(0, MAX);
    set({ items, unread: get().open ? 0 : get().unread + 1 });
  },
  markAllRead() { set({ unread: 0 }); },
  setOpen(open) { set({ open, ...(open ? { unread: 0 } : {}) }); },
  clear() { set({ items: [], unread: 0 }); },

  bind() {
    const s = getSocket();
    if (boundSocket === s) return;

    if (boundSocket && handlers) {
      boundSocket.off('order:fill', handlers.fill);
      boundSocket.off('alert', handlers.alert);
      boundSocket.off('news', handlers.news);
    }

    handlers = {
      fill: (f) => get().push({
        kind: 'fill',
        title: `${f.side} ${f.quantity} ${f.symbol}`,
        body: `Filled at ${(+f.price).toFixed(2)} Br`,
        symbol: f.symbol,
      }),
      alert: (a) => get().push({
        kind: 'alert',
        title: `Price alert: ${a.symbol}`,
        body: `${a.direction === 'ABOVE' ? '≥' : '≤'} ${a.price} Br (now ${(+a.currentPrice).toFixed(2)} Br)`,
        symbol: a.symbol,
      }),
      news: (n) => {
        // Only major news goes into the bell to avoid spam
        if (n.kind === 'macro' || Math.abs(n.impact || 0) >= 0.018) {
          get().push({
            kind: 'news',
            title: n.symbol ? `News · ${n.symbol}` : 'Market update',
            body: n.text,
            symbol: n.symbol,
          });
        }
      },
    };

    s.on('order:fill', handlers.fill);
    s.on('alert', handlers.alert);
    s.on('news', handlers.news);
    boundSocket = s;
  },
}));
