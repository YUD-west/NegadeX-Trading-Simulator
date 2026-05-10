import { useEffect, useState } from 'react';
import { insights } from '../services/api';
import { Award } from 'lucide-react';
import { motion } from 'framer-motion';

const TIER_CLR = {
  bronze: 'from-amber-700/30 to-amber-900/10 border-amber-700/40',
  silver: 'from-slate-300/20 to-slate-500/5 border-slate-300/30',
  gold:   'from-amber-300/30 to-amber-600/10 border-amber-400/50 shadow-[0_0_24px_rgba(251,191,36,0.15)]',
};

export default function AchievementsPanel() {
  const [data, setData] = useState({ badges: [], earned: 0, total: 0 });

  useEffect(() => {
    let alive = true;
    const load = () => insights.achievements().then(d => alive && setData(d)).catch(() => {});
    load();
    const id = setInterval(load, 8000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <Award size={18} className="text-amber-300" /> Achievements
        </h3>
        <span className="text-xs text-slate-400 num">
          {data.earned} / {data.total}
        </span>
      </div>

      <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-5">
        <div className="h-full bg-gradient-to-r from-amber-400 to-fuchsia-400 transition-all duration-700"
          style={{ width: `${data.total ? (data.earned / data.total) * 100 : 0}%` }} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {data.badges.map((b, i) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            className={`p-3 rounded-xl border bg-gradient-to-br text-center transition ${
              b.earned ? TIER_CLR[b.tier] : 'from-white/[0.02] to-transparent border-white/5 opacity-50 grayscale'
            }`}>
            <div className="text-3xl mb-1">{b.icon}</div>
            <div className="font-semibold text-sm">{b.name}</div>
            <div className="text-[10px] text-slate-400 mt-1 leading-tight">{b.description}</div>
            {b.earned && (
              <div className={`mt-2 text-[10px] uppercase tracking-wider font-bold ${
                b.tier === 'gold' ? 'text-amber-300' : b.tier === 'silver' ? 'text-slate-300' : 'text-amber-700'
              }`}>{b.tier}</div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
