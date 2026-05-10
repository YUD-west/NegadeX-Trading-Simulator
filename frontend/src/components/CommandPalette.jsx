import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarketStore } from '../store/marketStore';
import { useAuthStore } from '../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ArrowRight, BarChart3, Briefcase, Trophy, ShieldCheck,
  LayoutDashboard, GitCompare, Activity, Sparkles, Command,
} from 'lucide-react';
import { fmt } from '../utils/format';

const PAGE_ACTIONS = [
  { id: 'p:dashboard',   label: 'Dashboard',     icon: LayoutDashboard, href: '/dashboard'   },
  { id: 'p:market',      label: 'Market',        icon: BarChart3,       href: '/market'      },
  { id: 'p:portfolio',   label: 'Portfolio',     icon: Briefcase,       href: '/portfolio'   },
  { id: 'p:leaderboard', label: 'Leaderboard',   icon: Trophy,          href: '/leaderboard' },
  { id: 'p:heatmap',     label: 'Market Heatmap',icon: Activity,        href: '/heatmap'     },
  { id: 'p:compare',     label: 'Compare Stocks',icon: GitCompare,      href: '/compare'     },
  { id: 'p:pro',         label: 'Pro Suite',     icon: Sparkles,        href: '/pro'         },
  { id: 'p:profile',     label: 'My Profile',    icon: ShieldCheck,     href: '/profile'     },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);
  const stocks = useMarketStore(s => s.stocks);
  const isAdmin = useAuthStore(s => s.user?.role === 'admin');
  const nav = useNavigate();

  // Global hotkey: ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === 'Escape') {
        setOpen(false);
      } else if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
    if (!open) { setQuery(''); setActiveIdx(0); }
  }, [open]);

  const items = useMemo(() => {
    const pages = PAGE_ACTIONS;
    const allPages = isAdmin
      ? [...pages, { id: 'p:admin', label: 'Admin Console', icon: ShieldCheck, href: '/admin' }]
      : pages;

    const symbolItems = Object.values(stocks).map(s => ({
      id: `s:${s.symbol}`,
      kind: 'stock',
      label: `${s.symbol} · ${s.name}`,
      meta: { price: s.price, changePercent: s.changePercent },
      href: `/trade/${s.symbol}`,
    }));

    if (!query) return [...allPages.map(p => ({ ...p, kind: 'page' })), ...symbolItems.slice(0, 8)];

    const q = query.toLowerCase();
    const matchedPages = allPages
      .filter(p => p.label.toLowerCase().includes(q))
      .map(p => ({ ...p, kind: 'page' }));
    const matchedSymbols = symbolItems.filter(s => s.label.toLowerCase().includes(q));
    return [...matchedPages, ...matchedSymbols].slice(0, 14);
  }, [stocks, query, isAdmin]);

  useEffect(() => { if (activeIdx >= items.length) setActiveIdx(0); }, [items, activeIdx]);

  const choose = (item) => {
    if (!item) return;
    nav(item.href);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(items[activeIdx]); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          className="fixed inset-0 z-[100] bg-ink-950/80 backdrop-blur-md flex items-start justify-center pt-[12vh] px-4"
          onClick={() => setOpen(false)}>
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className="w-full max-w-xl glass-strong rounded-2xl overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] grad-border"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
              <Search size={16} className="text-cyan-300" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
                onKeyDown={onKeyDown}
                placeholder="Search stocks or jump to page…"
                className="bg-transparent flex-1 outline-none text-sm placeholder:text-slate-500"
              />
              <kbd>ESC</kbd>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-2">
              {items.length === 0 && (
                <div className="text-center text-slate-500 text-sm py-10">No matches.</div>
              )}
              {items.map((item, i) => {
                const Icon = item.icon || Activity;
                const active = i === activeIdx;
                return (
                  <button
                    key={item.id}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => choose(item)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition border ${
                      active ? 'bg-white/[0.07] border-white/10' : 'hover:bg-white/5 border-transparent'
                    }`}>
                    {item.kind === 'stock' ? (
                      <span className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-200 text-[10px] font-bold grid place-items-center border border-cyan-500/25">
                        {item.label.split(' · ')[0].slice(0, 2)}
                      </span>
                    ) : (
                      <span className="w-8 h-8 rounded-lg bg-fuchsia-500/15 text-fuchsia-200 grid place-items-center border border-fuchsia-500/25">
                        <Icon size={14} />
                      </span>
                    )}
                    <span className="text-sm flex-1 truncate">{item.label}</span>
                    {item.kind === 'stock' && item.meta && (
                      <span className={`text-xs num ${item.meta.changePercent >= 0 ? 'text-bull-300' : 'text-bear-300'}`}>
                        {fmt.pct(item.meta.changePercent, 1)}
                      </span>
                    )}
                    {active && <ArrowRight size={14} className="text-cyan-300" />}
                  </button>
                );
              })}
            </div>

            <div className="px-4 py-2.5 border-t border-white/10 text-[10px] text-slate-500 flex items-center gap-3">
              <span><kbd>↑↓</kbd> navigate</span>
              <span><kbd>↵</kbd> open</span>
              <span className="ml-auto inline-flex items-center gap-1">
                <Command size={10} /><kbd>K</kbd> toggle
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
