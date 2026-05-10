import { useEffect, useState } from 'react';
import { insights } from '../services/api';
import { Shield, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const RATING_STYLE = {
  'Well diversified': 'text-bull-300 bg-bull-500/15 border-bull-500/30',
  'Balanced':         'text-cyan-200 bg-cyan-500/15 border-cyan-500/30',
  'Narrow':           'text-amber-200 bg-amber-500/15 border-amber-500/30',
  'Concentrated':     'text-bear-300 bg-bear-500/15 border-bear-500/30',
  'Idle':             'text-slate-300 bg-white/10 border-white/15',
};

export default function RiskPanel() {
  const [risk, setRisk] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () => insights.risk().then(d => alive && setRisk(d.risk)).catch(() => {});
    load();
    const id = setInterval(load, 6000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!risk) return (
    <div className="card p-5">
      <h3 className="font-display font-semibold flex items-center gap-2 mb-3">
        <span className="h-7 w-7 rounded-lg bg-fuchsia-500/15 text-fuchsia-300 grid place-items-center"><Shield size={14} /></span>
        Risk Profile
      </h3>
      <div className="text-sm text-slate-500 text-center py-10">No positions yet.</div>
    </div>
  );

  const Ring = ({ value, label, color }) => {
    const r = 32, c = 2 * Math.PI * r;
    const dash = (Math.min(100, Math.max(0, value)) / 100) * c;
    return (
      <div className="text-center">
        <svg width="84" height="84" viewBox="0 0 80 80" className="mx-auto">
          <circle cx="40" cy="40" r={r} stroke="rgba(255,255,255,0.06)" strokeWidth="6" fill="none" />
          <motion.circle cx="40" cy="40" r={r} stroke={color} strokeWidth="6" fill="none"
            strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
            transform="rotate(-90 40 40)"
            initial={{ strokeDasharray: `0 ${c}` }}
            animate={{ strokeDasharray: `${dash} ${c}` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          <text x="40" y="46" textAnchor="middle" fontSize="14" fontWeight="700" fill="#e2e8f0" fontFamily="JetBrains Mono">
            {Math.round(value)}
          </text>
        </svg>
        <div className="eyebrow mt-1">{label}</div>
      </div>
    );
  };

  return (
    <div className="card card-rim p-5 relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-56 h-56 rounded-full bg-fuchsia-500/15 blur-3xl" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-fuchsia-500/15 text-fuchsia-300 grid place-items-center"><Shield size={14} /></span>
            Risk Profile
          </h3>
          <span className={`badge border ${RATING_STYLE[risk.rating] || 'bg-white/5 border-white/10'}`}>
            {risk.rating}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5">
          <Ring value={risk.diversification} label="Diversification" color="#22d3ee" />
          <Ring value={risk.concentrationScore} label="Top Sector %" color="#a855f7" />
          <Ring value={risk.cashRatio} label="Cash %" color="#ec4899" />
        </div>

        <div className="space-y-1.5">
          {risk.sectors.slice(0, 5).map(s => (
            <div key={s.sector}>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-slate-400">{s.sector}</span>
                <span className="num text-slate-300">{(s.weight * 100).toFixed(1)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(s.weight * 100).toFixed(1)}%` }}
                  transition={{ duration: 0.6 }}
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400" />
              </div>
            </div>
          ))}
        </div>

        {risk.concentrationScore > 70 && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <div>Over {risk.concentrationScore.toFixed(0)}% of your book is in one sector. Consider diversifying.</div>
          </div>
        )}
      </div>
    </div>
  );
}
