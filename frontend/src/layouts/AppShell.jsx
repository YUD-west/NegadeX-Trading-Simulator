import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import FloatingTickerRibbon from '../components/FloatingTickerRibbon';
import AICoach from '../components/AICoach';

export default function AppShell() {
  const loc = useLocation();
  const onLanding = loc.pathname === '/';

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Ambient atmospheric orbs */}
      <div className="ambient-layer">
        <div className="ambient-orb a" />
        <div className="ambient-orb b" />
        <div className="ambient-orb c" />
      </div>

      <Navbar />
      {!onLanding && <FloatingTickerRibbon />}

      <main className="relative z-10 flex-1 max-w-[1600px] w-full mx-auto px-4 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={loc.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <AICoach />

      <footer className="relative z-10 mt-6 border-t border-white/5 bg-ink-950/60 backdrop-blur">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="live-dot" />
            <span>NegadeX · Addis Exchange Simulator · Powered by live algorithms</span>
          </div>
          <div className="flex items-center gap-3">
            <span>React · Vite · Tailwind · Socket.IO</span>
            <span className="hidden md:inline text-slate-700">·</span>
            <span className="hidden md:inline">© {new Date().getFullYear()} NegadeX</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
