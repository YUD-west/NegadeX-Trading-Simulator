export default function Logo({ size = 30, withWordmark = true }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="relative">
        <svg width={size} height={size} viewBox="0 0 64 64" className="drop-shadow-[0_4px_18px_rgba(34,211,238,0.35)]">
          <defs>
            <linearGradient id="negaStroke" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%"  stopColor="#22d3ee" />
              <stop offset="55%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
            <linearGradient id="negaGloss" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%"  stopColor="#10131e" />
              <stop offset="100%" stopColor="#05060a" />
            </linearGradient>
            <radialGradient id="negaGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%"  stopColor="rgba(34,211,238,0.55)" />
              <stop offset="100%" stopColor="rgba(34,211,238,0)" />
            </radialGradient>
          </defs>
          <rect width="64" height="64" rx="16" fill="url(#negaGloss)" stroke="rgba(255,255,255,0.06)" />
          <circle cx="48" cy="20" r="14" fill="url(#negaGlow)" />
          <path
            d="M10 46 L22 30 L30 38 L42 18 L54 34"
            stroke="url(#negaStroke)" strokeWidth="4.2" fill="none"
            strokeLinecap="round" strokeLinejoin="round"
          />
          <circle cx="54" cy="34" r="3.6" fill="#22d3ee" />
          <circle cx="54" cy="34" r="6" fill="rgba(34,211,238,0.35)">
            <animate attributeName="r" from="6" to="11" dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.5" to="0" dur="1.8s" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>
      {withWordmark && (
        <span className="font-display font-bold text-xl tracking-tight">
          <span className="bg-gradient-to-r from-cyan-200 via-violet-200 to-fuchsia-300 bg-clip-text text-transparent">Negade</span>
          <span className="text-white/95">X</span>
        </span>
      )}
    </div>
  );
}
