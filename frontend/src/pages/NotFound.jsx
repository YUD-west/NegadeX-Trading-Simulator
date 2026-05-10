import { Link } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center relative overflow-hidden">
      <div className="absolute -top-20 -left-10 w-80 h-80 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="absolute -bottom-20 -right-10 w-80 h-80 rounded-full bg-fuchsia-500/15 blur-3xl" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative">
        <div className="font-display text-[120px] lg:text-[180px] font-bold leading-none gradient-text gradient-pan">
          404
        </div>
        <p className="mt-2 text-slate-300 text-lg">This page wandered off to find alpha.</p>
        <p className="text-slate-500 text-sm mt-1">The route doesn't exist on the Addis Exchange.</p>
        <div className="mt-7 flex justify-center gap-3">
          <Link to="/" className="btn-primary px-6 py-3">
            <Home size={16} /> Go home
          </Link>
          <Link to="/dashboard" className="btn-ghost px-6 py-3">
            <ArrowLeft size={16} /> Dashboard
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
