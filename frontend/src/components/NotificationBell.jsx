import { useEffect, useRef } from 'react';
import { Bell, Trash2, Activity, AlertTriangle, Newspaper } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';
import { fmt } from '../utils/format';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const ICONS = { fill: Activity, alert: AlertTriangle, news: Newspaper };
const COLORS = {
  fill:  'text-bull-300 bg-bull-500/15 border border-bull-500/25',
  alert: 'text-amber-200 bg-amber-500/15 border border-amber-500/25',
  news:  'text-cyan-200  bg-cyan-500/15  border border-cyan-500/25',
};

export default function NotificationBell() {
  const { items, unread, open, setOpen, clear } = useNotificationStore();
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open, setOpen]);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className="relative btn-ghost p-2"
        aria-label="Notifications">
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-bear-500 text-white text-[10px] font-bold flex items-center justify-center shadow-[0_0_12px_rgba(248,113,113,0.6)]">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 mt-2 w-96 max-h-[70vh] glass-strong rounded-2xl overflow-hidden z-50 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.85)]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent" />
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="font-display font-semibold flex items-center gap-2">
                <Bell size={14} className="text-cyan-300" /> Notifications
                {unread > 0 && <span className="badge bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 text-[10px]">{unread} new</span>}
              </div>
              {items.length > 0 && (
                <button onClick={clear} className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1">
                  <Trash2 size={12} /> Clear
                </button>
              )}
            </div>
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-white/[0.04]">
              {items.length === 0 && (
                <div className="text-center text-slate-500 py-12 px-4 text-sm">
                  <div className="text-base font-display gradient-text-subtle mb-1">All caught up</div>
                  <div className="text-xs text-slate-600">Order fills and price alerts will appear here.</div>
                </div>
              )}
              {items.map(n => {
                const Icon = ICONS[n.kind] || Bell;
                const Wrapper = n.symbol ? Link : 'div';
                const wrapperProps = n.symbol
                  ? { to: `/trade/${n.symbol}`, onClick: () => setOpen(false) }
                  : {};
                return (
                  <Wrapper key={n.id} {...wrapperProps}
                    className="flex gap-3 p-3 hover:bg-white/5 transition cursor-pointer">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${COLORS[n.kind]}`}>
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">{n.title}</div>
                      <div className="text-xs text-slate-400 truncate">{n.body}</div>
                      <div className="text-[10px] text-slate-600 mt-1">{fmt.time(n.time)}</div>
                    </div>
                  </Wrapper>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
