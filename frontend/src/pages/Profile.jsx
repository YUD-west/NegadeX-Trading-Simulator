import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { fmt } from '../utils/format';
import { useMarketStore } from '../store/marketStore';
import toast from 'react-hot-toast';
import { User, Save } from 'lucide-react';
import AchievementsPanel from '../components/AchievementsPanel';
import PageHeader from '../components/PageHeader';

export default function Profile() {
  const user = useAuthStore(s => s.user);
  const portfolio = useMarketStore(s => s.portfolio);
  const update = useAuthStore(s => s.updateProfile);

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio]   = useState(user?.bio || '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await update({ name, bio });
      toast.success('Profile updated');
    } catch { toast.error('Update failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <PageHeader
        eyebrow="Account"
        title="My Profile"
        subtitle="Personalize your trader identity, review your portfolio milestones and unlock achievements."
        icon={User}
        accent="cyan"
      />

      <div className="card card-rim p-6 grid sm:grid-cols-3 gap-6 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="text-center relative">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-cyan-400 via-violet-400 to-fuchsia-400 flex items-center justify-center text-3xl font-bold text-ink-950 shadow-[0_0_36px_-6px_rgba(34,211,238,0.6)]">
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="mt-3 text-xs text-slate-500">{user?.email}</div>
          <div className="mt-1 text-xs">
            <span className={`badge ${user?.role === 'admin'
              ? 'bg-fuchsia-500/15 text-fuchsia-200 border border-fuchsia-500/25'
              : 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/25'}`}>
              {user?.role?.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="sm:col-span-2 space-y-3 relative">
          <div>
            <label className="eyebrow mb-1 block">Name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="eyebrow mb-1 block">Bio</label>
            <textarea className="input" rows="3" value={bio} onChange={e => setBio(e.target.value)} />
          </div>
          <button onClick={save} disabled={busy} className="btn-primary">
            <Save size={16} /> {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-display font-semibold mb-3">Account Stats</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Starting"    value={fmt.money(user?.startingBalance || 1000000)} />
          <Stat label="Cash"        value={fmt.money(portfolio?.cash || 0)} />
          <Stat label="Net Worth"   value={fmt.money(portfolio?.totalValue || 0)} />
          <Stat label="Realised P/L" value={fmt.money(portfolio?.realizedPnL || 0)} />
        </div>
      </div>

      <AchievementsPanel />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="p-3 rounded-xl bg-white/[0.025] border border-white/5">
      <div className="eyebrow">{label}</div>
      <div className="num font-semibold mt-1 gradient-text-subtle">{value}</div>
    </div>
  );
}
