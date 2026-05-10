import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { UserPlus, User, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';
import Logo from '../components/Logo';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const register = useAuthStore(s => s.register);
  const loading = useAuthStore(s => s.loading);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return toast.error('Name is too short');
    if (!/\S+@\S+\.\S+/.test(form.email)) return toast.error('Invalid email');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    if (form.password !== form.confirm) return toast.error('Passwords do not match');

    try {
      await register(form.name.trim(), form.email.trim(), form.password);
      toast.success('Welcome to NegadeX — 1,000,000 Br deposited');
      nav('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-[80vh] grid lg:grid-cols-2 gap-8 items-center">
      <div className="hidden lg:block relative">
        <div className="absolute -top-20 -left-10 w-72 h-72 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="absolute -bottom-10 right-10 w-72 h-72 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="relative">
          <div className="eyebrow text-fuchsia-300/80 mb-3 inline-flex items-center gap-2">
            <Sparkles size={12} /> Open in 30 seconds
          </div>
          <h2 className="font-display text-5xl xl:text-6xl font-bold leading-[1.05] tracking-tight">
            Start trading with<br />
            <span className="gradient-text">1,000,000 Birr.</span>
          </h2>
          <p className="text-slate-400 mt-5 max-w-md leading-relaxed">
            Brand-new accounts get one million Birr in virtual capital. Trade Ethiopia's biggest
            companies on a real heap-based matching engine — no money risked.
          </p>
          <ul className="mt-7 space-y-2 text-sm text-slate-400">
            {[
              'Live order book streamed via Socket.IO',
              'Stop-loss / take-profit, options & backtesting',
              'Achievements, leaderboard and social feed',
            ].map(t => (
              <li key={t} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-cyan-300 shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-auto card card-rim p-8 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="relative">
          <div className="lg:hidden mb-4"><Logo /></div>
          <h1 className="font-display text-2xl font-bold mb-1">Create your account</h1>
          <p className="text-slate-500 text-sm mb-6">Get 1,000,000 Br in virtual cash on signup.</p>

          <form onSubmit={submit} className="space-y-4">
            <Field label="Full name"        icon={User} value={form.name}    onChange={v => setForm({ ...form, name: v })} />
            <Field label="Email"            icon={Mail} type="email" autoComplete="email"
              value={form.email} onChange={v => setForm({ ...form, email: v })} />
            <Field label="Password"         icon={Lock} type="password" autoComplete="new-password"
              value={form.password} onChange={v => setForm({ ...form, password: v })} />
            <Field label="Confirm password" icon={Lock} type="password" autoComplete="new-password"
              value={form.confirm}  onChange={v => setForm({ ...form, confirm: v })} />

            <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
              <UserPlus size={16} /> {loading ? 'Creating…' : 'Create account'}
              <ArrowRight size={14} />
            </button>
          </form>

          <p className="text-sm text-slate-500 mt-6 text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-300 hover:text-cyan-200">Sign in</Link>
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
