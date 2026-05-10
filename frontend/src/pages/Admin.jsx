import { useEffect, useState } from 'react';
import { admin as adminApi } from '../services/api';
import { useMarketStore } from '../store/marketStore';
import { fmt } from '../utils/format';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import LiveBars from '../components/LiveBars';
import {
  Shield, Zap, AlertTriangle, Users, BarChart3, Activity, Cpu, RefreshCw,
} from 'lucide-react';
import { motion } from 'framer-motion';

const REGIME_TONE = {
  BULL:     { tag: 'bg-bull-500/15 text-bull-300 border-bull-500/30', desc: 'Risk-on · liquidity expansion' },
  BEAR:     { tag: 'bg-bear-500/15 text-bear-300 border-bear-500/30', desc: 'Risk-off · sellers in control' },
  NEUTRAL:  { tag: 'bg-white/10 text-slate-300 border-white/15',      desc: 'Range-bound · waiting on data' },
  VOLATILE: { tag: 'bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-500/30', desc: 'High variance · expect shocks' },
};

export default function Admin() {
  const stocks = useMarketStore(s => s.stocks);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [shockSym, setShockSym] = useState('CBE');
  const [shockStr, setShockStr] = useState(0.05);
  const [replaySeq, setReplaySeq] = useState('FLASH_CRASH');

  const load = async () => {
    try {
      const [s, u] = await Promise.all([adminApi.stats(), adminApi.users()]);
      setStats(s); setUsers(u.users || []);
    } catch {
      toast.error('Failed to load admin data');
    }
  };
  useEffect(() => { load(); const id = setInterval(load, 4000); return () => clearInterval(id); }, []);

  const setRegime = async (r) => {
    try { await adminApi.setRegime(r); toast.success(`Regime → ${r}`); }
    catch { toast.error('Failed'); }
  };
  const fireShock = async () => {
    try { await adminApi.shock({ symbol: shockSym, strength: Number(shockStr) });
          toast.success(`Shock fired on ${shockSym}`); }
    catch (e) { toast.error(e.response?.data?.message || 'Shock failed'); }
  };
  const toggleSuspend = async (u) => {
    try { await adminApi.suspend(u._id || u.id, !u.isSuspended);
          toast.success(`${u.email} ${!u.isSuspended ? 'suspended' : 'restored'}`);
          load(); }
    catch { toast.error('Failed'); }
  };
  const runReplay = async () => {
    try {
      await adminApi.replay(replaySeq);
      toast.success(`Replay started: ${replaySeq}`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Replay failed');
    }
  };

  const tone = REGIME_TONE[stats?.regime] || REGIME_TONE.NEUTRAL;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operator console"
        title="Admin"
        subtitle="Drive the simulation, manage users, and monitor the matching engine in real time."
        icon={Shield}
        accent="fuchsia"
        actions={
          <div className="flex items-center gap-2">
            <span className="pill"><LiveBars /><span className="text-[10px] uppercase tracking-[0.18em]">4s refresh</span></span>
            <button onClick={load} className="btn-ghost text-xs">
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
        <Stat icon={Users}     label="Users"          value={fmt.num(stats?.userCount || 0)} />
        <Stat icon={BarChart3} label="Symbols"        value={fmt.num(stats?.stockCount || 0)} />
        <Stat icon={Zap}       label="Active Orders"  value={fmt.num(stats?.activeOrders || 0)} />
        <Stat icon={Activity}  label="24h Volume"     value={fmt.compact(stats?.totalVolume || 0)} />
        <Stat icon={Cpu}       label="Uptime"         value={`${Math.floor((stats?.uptimeSec || 0) / 60)}m`} />
      </div>

      {/* Regime + Shock */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card card-rim p-5 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px market-scanline opacity-70" />
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="font-display font-semibold flex items-center gap-2">
              <span className="h-7 w-7 rounded-lg bg-cyan-500/15 text-cyan-300 grid place-items-center"><Activity size={14} /></span>
              Market Regime
            </h3>
            <span className={`badge border ${tone.tag} text-[11px]`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
              {stats?.regime || '...'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-3">{tone.desc}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {['BULL', 'BEAR', 'NEUTRAL', 'VOLATILE'].map(r => (
              <button key={r} onClick={() => setRegime(r)}
                className={`py-2 rounded-xl font-semibold text-sm transition border ${
                  stats?.regime === r
                    ? 'bg-cyan-500 text-ink-950 border-cyan-300 shadow-[0_0_22px_-6px_rgba(34,211,238,0.7)]'
                    : 'bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] border-white/10'
                }`}>{r}</button>
            ))}
          </div>
        </div>

        <div className="card card-rim p-5 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-amber-500/15 blur-3xl" />
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2 relative">
            <span className="h-7 w-7 rounded-lg bg-amber-500/15 text-amber-300 grid place-items-center"><AlertTriangle size={14} /></span>
            Inject Volatility
          </h3>
          <div className="grid grid-cols-2 gap-3 relative">
            <select className="input-sm" value={shockSym} onChange={e => setShockSym(e.target.value)}>
              {Object.keys(stocks).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input className="input-sm" type="number" step="0.01" value={shockStr}
              onChange={e => setShockStr(e.target.value)} placeholder="±0.05 = ±5%" />
          </div>
          <button onClick={fireShock} className="btn-primary mt-3 w-full">
            <Zap size={14} /> Fire Shock
          </button>
          <p className="text-[11px] text-slate-500 mt-2">Strength must be between -0.5 and +0.5.</p>
        </div>
      </div>

      <div className="card card-rim p-5 relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <h3 className="font-display font-semibold mb-3 flex items-center gap-2 relative">
          <span className="h-7 w-7 rounded-lg bg-fuchsia-500/15 text-fuchsia-300 grid place-items-center"><Zap size={14} /></span>
          Admin Replay Mode
        </h3>
        <p className="text-xs text-slate-500 mb-3 relative">
          Replay market events for demos: flash crash or bull run. This triggers multiple shocks
          and regime changes.
        </p>
        <div className="grid sm:grid-cols-[1fr_auto] gap-3 relative">
          <select className="input-sm" value={replaySeq} onChange={e => setReplaySeq(e.target.value)}>
            <option value="FLASH_CRASH">Flash Crash</option>
            <option value="BULL_RUN">Bull Run</option>
          </select>
          <button onClick={runReplay} className="btn-primary">Start Replay</button>
        </div>
      </div>

      {/* Users table */}
      <div className="card overflow-hidden">
        <div className="px-5 pt-5 pb-2 flex items-center justify-between">
          <h3 className="font-display font-semibold">Users</h3>
          <span className="pill text-[10px] uppercase tracking-[0.18em]">{users.length} accounts</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.025] border-b border-white/[0.06] text-left">
              <tr className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <motion.tr key={u._id || u.id} layout
                  className={`border-b border-white/[0.04] hover:bg-white/[0.025] ${u.isSuspended ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg grid place-items-center font-bold text-[11px] bg-gradient-to-br from-cyan-400 to-fuchsia-400 text-ink-950">
                        {(u.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${u.role === 'admin'
                      ? 'bg-fuchsia-500/15 text-fuchsia-200 border border-fuchsia-500/25'
                      : 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/25'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{fmt.date(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {u.role !== 'admin' && (
                      <button onClick={() => toggleSuspend(u)}
                        className={`text-xs px-3 py-1 rounded-lg transition border ${u.isSuspended
                          ? 'bg-bull-500/15 text-bull-300 hover:bg-bull-500/25 border-bull-500/25'
                          : 'bg-bear-500/15 text-bear-300 hover:bg-bear-500/25 border-bear-500/25'}`}>
                        {u.isSuspended ? 'Restore' : 'Suspend'}
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="text-center text-slate-500 py-10">No users registered yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="card card-rim p-4 relative overflow-hidden">
      <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-cyan-500/15 blur-2xl" />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="eyebrow">{label}</div>
          <div className="num font-display text-xl font-bold mt-1 gradient-text-subtle">{value}</div>
        </div>
        <Icon size={18} className="text-cyan-300" />
      </div>
    </motion.div>
  );
}
