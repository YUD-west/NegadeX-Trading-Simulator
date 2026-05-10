import { useEffect, useState } from 'react';
import { leaderboard as lbApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { fmt } from '../utils/format';
import ChangeBadge from '../components/ChangeBadge';
import PageHeader from '../components/PageHeader';
import LiveBars from '../components/LiveBars';
import { Trophy, Crown, Medal, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PODIUM = [
  { rank: 1, color: 'text-amber-200',  bg: 'from-amber-400/20 to-amber-600/0',  border: 'border-amber-400/40',  glow: 'shadow-[0_0_60px_-10px_rgba(251,191,36,0.55)]', icon: Crown },
  { rank: 2, color: 'text-slate-100',  bg: 'from-slate-300/15 to-slate-500/0',  border: 'border-slate-300/30',  glow: 'shadow-[0_0_45px_-12px_rgba(226,232,240,0.45)]', icon: Medal },
  { rank: 3, color: 'text-orange-300', bg: 'from-orange-700/20 to-orange-900/0',border: 'border-orange-600/40', glow: 'shadow-[0_0_45px_-12px_rgba(251,146,60,0.4)]',  icon: Award },
];

export default function Leaderboard() {
  const me = useAuthStore(s => s.user);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const d = await lbApi.list();
        if (!alive) return;
        setItems(d.items || []);
      } finally { setLoading(false); }
    };
    load();
    const id = setInterval(load, 5000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const podium = items.slice(0, 3);
  const rest = items.slice(3);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Live ranking"
        title="Leaderboard"
        subtitle="Top traders ranked by ROI · refreshes every 5 seconds"
        icon={Trophy}
        accent="amber"
        actions={<span className="pill"><LiveBars /><span className="text-[10px] uppercase tracking-[0.18em]">5s refresh</span></span>}
      />

      {/* Podium */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[1, 0, 2].map(idx => {
          const u = podium[idx];
          const meta = PODIUM[idx];
          if (!u) {
            return (
              <div key={idx} className="card p-5 h-44 grid place-items-center">
                <div className="text-center text-slate-600">
                  <meta.icon size={32} className="mx-auto opacity-50" />
                  <div className="text-xs mt-2 uppercase tracking-[0.2em]">Rank #{meta.rank}</div>
                </div>
              </div>
            );
          }
          const Icon = meta.icon;
          const top = idx === 0;
          return (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, type: 'spring', stiffness: 200, damping: 22 }}
              className={`relative card card-rim p-5 bg-gradient-to-br ${meta.bg} border ${meta.border} ${meta.glow} ${top ? 'sm:scale-[1.06] sm:-mt-2' : ''}`}>
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <div className="flex items-center justify-between mb-3">
                <span className={`font-display font-bold text-3xl ${meta.color}`}>#{u.rank}</span>
                <Icon className={meta.color} size={26} />
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className={`h-10 w-10 rounded-full grid place-items-center font-bold text-base
                                bg-gradient-to-br from-cyan-400 to-fuchsia-400 text-ink-950`}>
                  {(u.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-base truncate">{u.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{u.email}</div>
                </div>
              </div>
              <div className="num text-2xl font-display font-bold gradient-text-subtle">{fmt.money(u.portfolioValue)}</div>
              <div className="mt-1.5 flex items-center justify-between">
                <ChangeBadge value={u.roi} />
                <span className="text-[11px] text-slate-500">{u.trades || 0} trades</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.025] border-b border-white/[0.06] text-left">
              <tr className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                <th className="px-4 py-3 w-12">#</th>
                <th className="px-4 py-3">Trader</th>
                <th className="px-4 py-3 text-right">Portfolio</th>
                <th className="px-4 py-3 text-right">ROI</th>
                <th className="px-4 py-3 text-right">Win Rate</th>
                <th className="px-4 py-3 text-right">Positions</th>
                <th className="px-4 py-3 text-right">Trades</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-white/[0.04]">
                  <td colSpan={7} className="px-4 py-3"><div className="skeleton h-8" /></td>
                </tr>
              ))}
              <AnimatePresence initial={false}>
                {rest.map(u => {
                  const isMe = me && (String(u.id) === String(me.id) || u.email === me.email);
                  return (
                    <motion.tr
                      key={u.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`border-b border-white/[0.04] hover:bg-white/[0.025] ${isMe ? 'bg-cyan-500/[0.06]' : ''}`}
                    >
                      <td className="px-4 py-3 num text-slate-500">{u.rank}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-lg grid place-items-center font-bold text-[11px]
                                          bg-gradient-to-br from-cyan-400 to-fuchsia-400 text-ink-950">
                            {(u.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold">
                              {u.name} {isMe && <span className="text-cyan-300 text-xs">· you</span>}
                            </div>
                            <div className="text-[11px] text-slate-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right num font-semibold">{fmt.money(u.portfolioValue)}</td>
                      <td className="px-4 py-3 text-right"><ChangeBadge value={u.roi} /></td>
                      <td className="px-4 py-3 text-right num text-slate-400">{(u.winRate ?? 0).toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right num text-slate-400">{u.positions || 0}</td>
                      <td className="px-4 py-3 text-right num text-slate-400">{u.trades || 0}</td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
