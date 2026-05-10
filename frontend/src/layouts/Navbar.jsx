import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useMarketStore } from '../store/marketStore';
import Logo from '../components/Logo';
import NotificationBell from '../components/NotificationBell';
import LiveBars from '../components/LiveBars';
import { LogOut, User as UserIcon, Wifi, WifiOff, Search, Command, ChevronRight } from 'lucide-react';
import { fmt } from '../utils/format';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
  ['/dashboard',   'Dashboard'],
  ['/market',      'Market'],
  ['/trade',       'Trade'],
  ['/portfolio',   'Portfolio'],
  ['/leaderboard', 'Leaderboard'],
  ['/heatmap',     'Heatmap'],
  ['/compare',     'Compare'],
  ['/pro',         'Pro'],
];

const MOBILE_ITEMS = [
  ['/dashboard', 'Dash'],
  ['/market',    'Market'],
  ['/trade',     'Trade'],
  ['/portfolio', 'Portfolio'],
  ['/leaderboard', 'Ranks'],
  ['/heatmap',   'Heatmap'],
  ['/compare',   'Compare'],
  ['/pro',       'Pro'],
];

export default function Navbar() {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const portfolio = useMarketStore(s => s.portfolio);
  const connected = useMarketStore(s => s.connected);
  const regime = useMarketStore(s => s.regime);
  const recentRegimeEvent = useMarketStore(s => s.recentRegimeEvent);
  const tickLatencyMs = useMarketStore(s => s.tickLatencyMs);
  const [showRegimeFlash, setShowRegimeFlash] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();

  const onLanding = loc.pathname === '/';
  const navItems  = user?.role === 'admin' ? [...NAV_ITEMS, ['/admin', 'Admin']] : NAV_ITEMS;
  const mobileItems = user?.role === 'admin' ? [...MOBILE_ITEMS, ['/admin', 'Admin']] : MOBILE_ITEMS;

  useEffect(() => {
    if (!recentRegimeEvent) return;
    setShowRegimeFlash(true);
    const id = setTimeout(() => setShowRegimeFlash(false), 5500);
    return () => clearTimeout(id);
  }, [recentRegimeEvent]);

  const regimeStyle = {
    BULL:     'text-bull-300 bg-bull-500/10 border-bull-500/30 shadow-[0_0_22px_-6px_rgba(74,222,128,0.7)]',
    BEAR:     'text-bear-300 bg-bear-500/10 border-bear-500/30 shadow-[0_0_22px_-6px_rgba(248,113,113,0.7)]',
    NEUTRAL:  'text-slate-300 bg-white/5 border-white/10',
    VOLATILE: 'text-fuchsia-200 bg-fuchsia-500/10 border-fuchsia-500/30 shadow-[0_0_22px_-6px_rgba(236,72,153,0.7)]',
  }[regime] || 'text-slate-300 bg-white/5 border-white/10';

  return (
    <header className="sticky top-0 z-40 backdrop-blur-2xl bg-ink-950/75 border-b border-white/[0.06]">
      <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
      <div className="max-w-[1600px] mx-auto px-4 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link to={user ? '/dashboard' : '/'} className="hover-lift"><Logo /></Link>

        {!onLanding && (
          <nav className="hidden lg:flex items-center gap-0.5 text-sm">
            {navItems.map(([path, label]) => {
              const active = loc.pathname === path
                || (path !== '/' && loc.pathname.startsWith(path));
              return (
                <Link
                  key={path}
                  to={path}
                  className={`relative px-3 py-1.5 rounded-lg transition ${
                    active
                      ? 'text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                      className="absolute inset-0 rounded-lg bg-white/[0.07] border border-white/10 shadow-[0_0_18px_-6px_rgba(34,211,238,0.6)]"
                    />
                  )}
                  <span className="relative z-10">{label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-2.5">
          {!onLanding && (
            <motion.span
              key={regime}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${regimeStyle}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
              {regime}
            </motion.span>
          )}

          {!onLanding && (
            <span className="hidden md:inline-flex items-center gap-1.5 pill">
              {connected
                ? (<><LiveBars className="text-bull-400" /> <span className="text-bull-300">live</span></>)
                : (<><WifiOff size={12} className="text-bear-400"/> <span className="text-bear-300">offline</span></>)}
              {connected && tickLatencyMs != null && (
                <span className="num text-slate-500">{tickLatencyMs}ms</span>
              )}
            </span>
          )}

          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
                className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07] transition"
                title="Command palette (Ctrl+K)"
              >
                <Search size={14} className="text-slate-500" />
                <span className="text-slate-500 text-xs">Search…</span>
                <kbd className="hidden lg:inline-flex items-center gap-0.5"><Command size={10} />K</kbd>
              </button>
              <NotificationBell />
              {portfolio && (
                <Link to="/portfolio"
                  className="hidden lg:flex flex-col items-end px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-cyan-400/30 transition">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Net Worth</span>
                  <span className="num text-sm font-semibold gradient-text-subtle">{fmt.money(portfolio.totalValue)}</span>
                </Link>
              )}
              <Link to="/profile" className="btn-ghost px-2.5 py-1.5 text-sm">
                <span className="h-6 w-6 rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-400 text-ink-950 grid place-items-center font-bold text-[11px]">
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </span>
                <span className="hidden sm:inline">{user.name?.split(' ')[0]}</span>
              </Link>
              <button onClick={() => { logout(); nav('/'); }} className="btn-ghost px-2.5 py-1.5 text-sm" title="Sign out">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-ghost text-sm">Sign in</Link>
              <Link to="/register" className="btn-primary text-sm">Get started <ChevronRight size={14} /></Link>
            </div>
          )}
        </div>
      </div>

      {!onLanding && (
        <nav className="lg:hidden flex gap-1 overflow-x-auto no-scrollbar border-t border-white/5 px-3 py-2 text-sm">
          {mobileItems.map(([path, label]) => {
            const active = loc.pathname === path
              || (path !== '/' && loc.pathname.startsWith(path));
            return (
              <Link
                key={path}
                to={path}
                className={`shrink-0 rounded-lg px-3 py-1.5 transition ${
                  active
                    ? 'bg-white/10 text-white border border-white/15 shadow-[0_0_16px_-6px_rgba(34,211,238,0.6)]'
                    : 'text-slate-400 border border-transparent hover:bg-white/5'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      )}

      <AnimatePresence>
        {!onLanding && recentRegimeEvent && showRegimeFlash && (
          <motion.div
            key={recentRegimeEvent.at}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`border-t px-4 py-1.5 text-center text-xs ${
              regime === 'BULL' ? 'border-bull-500/20 bg-bull-500/10 text-bull-200'
              : regime === 'BEAR' ? 'border-bear-500/20 bg-bear-500/10 text-bear-200'
              : regime === 'VOLATILE' ? 'border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-200'
              : 'border-white/10 bg-white/[0.03] text-slate-300'
            }`}
          >
            <span className="font-semibold tracking-wide">Addis Exchange · regime → {regime}</span>
            {recentRegimeEvent.item?.text ? <span className="opacity-80"> · {recentRegimeEvent.item.text}</span> : null}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
