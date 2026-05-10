/**
 * Localised formatters for the Ethiopian market.
 *
 * Currency is **ETB (Ethiopian Birr)** — rendered as a "Br" suffix the way
 * Ethiopian banks and Telebirr display amounts (e.g. "1,250.00 Br").
 * Times are localised to Africa/Addis_Ababa (UTC+3, no DST).
 */
const ETB = 'ETB';
const TZ = 'Africa/Addis_Ababa';

export const fmt = {
  money(n, opts = {}) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    const formatted = Number(n).toLocaleString('en-ET', {
      minimumFractionDigits: opts.min ?? 2,
      maximumFractionDigits: opts.max ?? 2,
    });
    return opts.symbolFirst ? `Br ${formatted}` : `${formatted} Br`;
  },
  /** Compact Birr — e.g. 1.25M Br, 880K Br. Useful for cards / tooltips. */
  moneyCompact(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    const abs = Math.abs(n);
    let body;
    if (abs >= 1e12) body = (n / 1e12).toFixed(2) + 'T';
    else if (abs >= 1e9)  body = (n / 1e9 ).toFixed(2) + 'B';
    else if (abs >= 1e6)  body = (n / 1e6 ).toFixed(2) + 'M';
    else if (abs >= 1e3)  body = (n / 1e3 ).toFixed(2) + 'K';
    else body = Number(n).toFixed(0);
    return `${body} Br`;
  },
  pct(n, digits = 2) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    const s = n > 0 ? '+' : '';
    return `${s}${Number(n).toFixed(digits)}%`;
  },
  num(n, digits = 0) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return Number(n).toLocaleString('en-ET', { maximumFractionDigits: digits });
  },
  compact(n) {
    if (!n && n !== 0) return '—';
    const abs = Math.abs(n);
    if (abs >= 1e12) return (n / 1e12).toFixed(2) + 'T';
    if (abs >= 1e9)  return (n / 1e9 ).toFixed(2) + 'B';
    if (abs >= 1e6)  return (n / 1e6 ).toFixed(2) + 'M';
    if (abs >= 1e3)  return (n / 1e3 ).toFixed(2) + 'K';
    return Number(n).toFixed(0);
  },
  time(t) {
    const d = new Date(t);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: TZ });
  },
  date(t) {
    return new Date(t).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric', timeZone: TZ });
  },
  currency: ETB,
  timezone: TZ,
};
