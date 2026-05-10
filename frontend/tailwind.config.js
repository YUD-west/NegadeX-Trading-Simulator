/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        ink: {
          975: '#03040a',
          950: '#05060a',
          925: '#070912',
          900: '#0a0c14',
          875: '#0c1019',
          850: '#0d1018',
          800: '#11151f',
          750: '#161a26',
          700: '#1a1f2c',
          650: '#1f2433',
          600: '#252b3b',
        },
        accent: {
          400: '#7df9ff',
          500: '#22d3ee',
          600: '#0891b2',
        },
        bull: { 500: '#22c55e', 400: '#4ade80', 600: '#16a34a', 300: '#86efac' },
        bear: { 500: '#ef4444', 400: '#f87171', 600: '#dc2626', 300: '#fca5a5' },
        neon: {
          cyan:    '#22d3ee',
          violet:  '#a855f7',
          fuchsia: '#ec4899',
          lime:    '#a3e635',
          amber:   '#fbbf24',
        },
      },
      backgroundImage: {
        'grid-fade':  'radial-gradient(circle at 50% 0%, rgba(34,211,238,0.08), transparent 60%)',
        'glass':      'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))',
        'glow-bull':  'radial-gradient(circle at 50% 50%, rgba(34,197,94,0.18), transparent 70%)',
        'glow-bear':  'radial-gradient(circle at 50% 50%, rgba(239,68,68,0.18), transparent 70%)',
        'mesh-aurora':
          'radial-gradient(900px 500px at 90% -10%, rgba(168,85,247,0.18), transparent 60%),' +
          'radial-gradient(800px 460px at -10% 5%,  rgba(34,211,238,0.14),  transparent 60%),' +
          'radial-gradient(700px 380px at 70% 105%, rgba(236,72,153,0.10), transparent 60%)',
        'rainbow-line':
          'linear-gradient(90deg, rgba(34,211,238,0), rgba(34,211,238,0.7), rgba(168,85,247,0.7), rgba(236,72,153,0.7), rgba(34,211,238,0))',
      },
      boxShadow: {
        glass:    '0 8px 32px 0 rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
        glow:     '0 0 24px rgba(34,211,238,0.35)',
        'glow-lg':'0 0 60px rgba(34,211,238,0.35), 0 0 32px rgba(168,85,247,0.18)',
        'glow-bull':'0 0 32px rgba(74,222,128,0.32)',
        'glow-bear':'0 0 32px rgba(248,113,113,0.32)',
        'inset-soft':'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.6)',
      },
      animation: {
        'pulse-slow':   'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'shimmer':      'shimmer 2.4s linear infinite',
        'float':        'float 6s ease-in-out infinite',
        'float-slow':   'float 12s ease-in-out infinite',
        'aurora':       'aurora 16s ease-in-out infinite',
        'gradient-pan': 'gradient-pan 8s ease infinite',
        'pulse-dot':    'pulseDot 1.6s ease-in-out infinite',
        'live-bar':     'liveBar 1.4s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
        aurora: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)', opacity: '0.85' },
          '50%':      { transform: 'translate3d(2%,-3%,0) scale(1.06)', opacity: '1' },
        },
        'gradient-pan': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
        pulseDot: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(34,211,238,0.55)', opacity: '1' },
          '50%':      { boxShadow: '0 0 0 6px rgba(34,211,238,0)',  opacity: '0.85' },
        },
        liveBar: {
          '0%, 100%': { transform: 'scaleY(0.4)' },
          '50%':      { transform: 'scaleY(1)' },
        },
      },
      transitionTimingFunction: {
        'fluid': 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [],
};
