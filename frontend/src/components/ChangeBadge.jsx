import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { fmt } from '../utils/format';

export default function ChangeBadge({ value, withIcon = true, size = 'sm' }) {
  const v = Number(value || 0);
  const positive = v > 0;
  const negative = v < 0;
  const cls = positive
    ? 'text-bull-300 bg-bull-500/10 border-bull-500/25 shadow-[0_0_14px_-6px_rgba(74,222,128,0.6)]'
    : negative
      ? 'text-bear-300 bg-bear-500/10 border-bear-500/25 shadow-[0_0_14px_-6px_rgba(248,113,113,0.6)]'
      : 'text-slate-300 bg-white/5 border-white/10';
  const Icon = positive ? TrendingUp : negative ? TrendingDown : Minus;
  const px = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';
  return (
    <span className={`badge num border ${cls} ${px}`}>
      {withIcon && <Icon size={size === 'lg' ? 14 : 12} strokeWidth={2.5} />}
      {fmt.pct(v)}
    </span>
  );
}
