/** Animated equalizer-style indicator. Used as a "live" marker. */
export default function LiveBars({ className = '' }) {
  return (
    <span className={`live-bars ${className}`} aria-hidden>
      <span /><span /><span /><span />
    </span>
  );
}
