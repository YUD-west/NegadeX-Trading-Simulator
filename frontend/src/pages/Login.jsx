import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, ArrowRight } from 'lucide-react';
import Logo from '../components/Logo';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const login = useAuthStore(s => s.login);
  const loading = useAuthStore(s => s.loading);
  const nav = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from || '/dashboard';

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      return toast.error('Email and password are required');
    }
    try {
      await login(form.email, form.password);
      toast.success('Welcome back');
      nav(from);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-[80vh] grid lg:grid-cols-2 gap-8 items-center">
      <div className="hidden lg:block relative">
        <div className="absolute -top-20 -left-10 w-72 h-72 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute -bottom-10 right-10 w-72 h-72 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="relative">
          <div className="eyebrow text-cyan-300/80 mb-3">Welcome back</div>
          <h2 className="font-display text-5xl xl:text-6xl font-bold leading-[1.05] tracking-tight">
            Continue trading<br />
            <span className="gradient-text">the Addis market.</span>
          </h2>
          <p className="text-slate-400 mt-5 max-w-md leading-relaxed">
            Pick up where you left off — your portfolio, watchlist, alerts and the live order book
            are right where you stopped.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
            {[
              ['Live', '32 symbols streaming'],
              ['Fast', 'Sub-200ms socket fan-out'],
              ['Real', 'O(log n) per heap match'],
            ].map(([k, v]) => (
              <div key={k} className="card p-3">
                <div className="font-display text-lg font-bold gradient-text">{k}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-auto card card-rim p-8 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative">
          <div className="lg:hidden mb-4"><Logo /></div>
          <h1 className="font-display text-2xl font-bold mb-1">Sign in</h1>
          <p className="text-slate-500 text-sm mb-6">Welcome back to NegadeX.</p>

          <form onSubmit={submit} className="space-y-4">
            <Field label="Email" icon={Mail} type="email" autoComplete="email"
              value={form.email} onChange={v => setForm({ ...form, email: v })} />
            <Field label="Password" icon={Lock} type="password" autoComplete="current-password"
              value={form.password} onChange={v => setForm({ ...form, password: v })} />
            <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
              <LogIn size={16} /> {loading ? 'Signing in…' : 'Sign in'}
              <ArrowRight size={14} />
            </button>
          </form>

          <p className="text-sm text-slate-500 mt-6 text-center">
            New here?{' '}
            <Link to="/register" className="text-cyan-300 hover:text-cyan-200">Create an account</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, icon: Icon, type = 'text', autoComplete, value, onChange }) {
  return (
    <div>
      <label className="eyebrow mb-1 block">{label}</label>
      <div className="relative">
        <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input className="input pl-10" type={type} autoComplete={autoComplete}
          value={value} onChange={e => onChange(e.target.value)} />
      </div>
    </div>
  );
}
