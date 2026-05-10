import { useEffect, useRef, useState } from 'react';

/**
 * Animated price cell. Briefly flashes green/red on change so the
 * user can see live price moves at a glance.
 */
export default function PriceCell({ value, decimals = 2, className = '', suffix = ' Br' }) {
  const [flash, setFlash] = useState(null);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current === undefined || prev.current === value) {
      prev.current = value;
      return;
    }
    setFlash(value > prev.current ? 'up' : 'down');
    prev.current = value;
    const t = setTimeout(() => setFlash(null), 700);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <span
      className={`relative num inline-block px-1 -mx-1 rounded transition-colors duration-300 ${
        flash === 'up'   ? 'ticker-up'   :
        flash === 'down' ? 'ticker-down' : ''
      } ${className}`}
      style={
        flash === 'up'   ? { background: 'linear-gradient(90deg, rgba(74,222,128,0.16), rgba(74,222,128,0))' } :
        flash === 'down' ? { background: 'linear-gradient(90deg, rgba(248,113,113,0.16), rgba(248,113,113,0))' } : undefined
      }
    >
      {Number(value || 0).toLocaleString('en-ET', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
    </span>
  );
}
