import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMarketStore } from '../store/marketStore';
import { portfolio as portfolioApi } from '../services/api';
import { fmt } from '../utils/format';
import PriceCell from '../components/PriceCell';
import ChangeBadge from '../components/ChangeBadge';
import EquityCurve from '../components/EquityCurve';
import RiskPanel from '../components/RiskPanel';
import PageHeader from '../components/PageHeader';
import { Download, Wallet, Briefcase, ArrowRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const PIE_COLORS = ['#22d3ee', '#a855f7', '#f472b6', '#facc15', '#4ade80', '#f87171', '#60a5fa', '#fb923c', '#34d399', '#c084fc'];

export default function Portfolio() {
  const portfolio = useMarketStore(s => s.portfolio);
  const fetchPortfolio = useMarketStore(s => s.fetchPortfolio);
  const stocks = useMarketStore(s => s.stocks);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    fetchPortfolio();
    portfolioApi.transactions().then(d => setTransactions(d.items || []));
  }, [fetchPortfolio]);

  const exportCsv = async () => {
    try {
      const blob = await portfolioApi.exportCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'transactions.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Export failed'); }
  };

  // Recompute live values from latest prices
  const positions = useMemo(() => (portfolio?.positions || []).map(p => {
    const live = stocks[p.symbol]?.price ?? p.currentPrice;
    const value = live * p.quantity;
    const cost  = p.avgPrice * p.quantity;
    return {
      ...p,
      currentPrice: live,
      value,
      cost,
      unrealizedPnL: value - cost,
      unrealizedPnLPercent: cost === 0 ? 0 : ((value - cost) / cost) * 100,
    };
  }), [portfolio, stocks]);

  const positionsValue = positions.reduce((s, p) => s + p.value, 0);
  const cash = portfolio?.cash || 0;
  const totalValue = positionsValue + cash;
  const startingBal = portfolio?.startingBalance || 1000000;
  const totalPL = totalValue - startingBal;
  const realized = portfolio?.realizedPnL || 0;

  const pieData = useMemo(() => [
    ...positions.map(p => ({ name: p.symbol, value: p.value })),
    { name: 'Cash', value: cash },
  ].filter(d => d.value > 0), [positions, cash]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Account"
        title="Portfolio"
        subtitle="Live valuation, sector mix, equity curve and full transaction history."
        icon={Briefcase}
        accent="violet"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={exportCsv} className="btn-ghost text-sm">
              <Download size={14} /> Export CSV
            </button>
            <Link to="/trade" className="btn-primary text-sm">
              Trade <ArrowRight size={14} />
            </Link>
          </div>
        }
      />

      {/* Headline stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <Card label="Total Value"   value={fmt.money(totalValue)} accent="cyan" main />
        <Card label="Cash"          value={fmt.money(cash)} accent="violet" />
        <Card label="Realized P/L"  value={fmt.money(realized)}
              positive={realized > 0} negative={realized < 0} />
        <Card label="Total P/L"     value={fmt.money(totalPL)}
              delta={portfolio?.pnlPercent}
              positive={totalPL >= 0}
              negative={totalPL < 0} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <EquityCurve />
        </div>
        <RiskPanel />
      </div>

      {/* Pie + Holdings */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-1">
          <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-cyan-500/15 text-cyan-300 grid place-items-center"><Wallet size={14} /></span>
            Allocation
          </h3>
          {pieData.length === 0 ? (
            <p className="text-slate-500 text-sm py-12 text-center">No positions yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="value" outerRadius={92} innerRadius={62} paddingAngle={2} stroke="#0a0c14">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'rgba(13,16,24,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontFamily: 'JetBrains Mono' }}
                  formatter={(v) => fmt.money(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="space-y-1 mt-3 max-h-40 overflow-y-auto pr-1">
            {pieData.map((p, i) => (
              <div key={p.name} className="flex justify-between text-xs px-2 py-1">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length], boxShadow: `0 0 12px ${PIE_COLORS[i % PIE_COLORS.length]}55` }} />
                  {p.name}
                </span>
                <span className="num text-slate-400">{fmt.money(p.value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 lg:col-span-2 overflow-hidden">
          <h3 className="font-display font-semibold mb-4">Holdings</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[10px] uppercase tracking-[0.18em] text-slate-500 border-b border-white/5">
                <tr>
                  <th className="py-2.5">Symbol</th>
                  <th className="py-2.5 text-right">Qty</th>
                  <th className="py-2.5 text-right">Avg Cost</th>
                  <th className="py-2.5 text-right">Price</th>
                  <th className="py-2.5 text-right">Value</th>
                  <th className="py-2.5 text-right">P/L</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {positions.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-slate-500 py-10">
                      No positions. <Link to="/market" className="text-cyan-300">Find something to buy</Link>.
                    </td></tr>
                  )}
                  {positions.map(p => {
                    const up = p.unrealizedPnL >= 0;
                    return (
                      <motion.tr layout key={p.symbol}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="py-2.5">
                          <Link to={`/trade/${p.symbol}`} className="inline-flex items-center gap-2 group">
                            <span className={`w-7 h-7 rounded-lg grid place-items-center text-[10px] font-bold border
                              ${up ? 'border-bull-500/30 bg-bull-500/10 text-bull-300'
                                    : 'border-bear-500/30 bg-bear-500/10 text-bear-300'}`}>
                              {p.symbol.slice(0, 2)}
                            </span>
                            <span className="font-semibold group-hover:text-cyan-200 transition">{p.symbol}</span>
                          </Link>
                        </td>
                        <td className="py-2.5 text-right num">{fmt.num(p.quantity)}</td>
                        <td className="py-2.5 text-right num text-slate-400">{fmt.money(p.avgPrice)}</td>
                        <td className="py-2.5 text-right"><PriceCell value={p.currentPrice} className="text-sm" /></td>
                        <td className="py-2.5 text-right num">{fmt.money(p.value)}</td>
                        <td className="py-2.5 text-right">
                          <div className={up ? 'text-bull-300 num' : 'text-bear-300 num'}>
                            {fmt.money(p.unrealizedPnL)}
                          </div>
                          <ChangeBadge value={p.unrealizedPnLPercent} />
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">Transaction History</h3>
          <span className="pill text-[10px] uppercase tracking-[0.18em]">{transactions.length} entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[10px] uppercase tracking-[0.18em] text-slate-500 border-b border-white/5">
              <tr>
                <th className="py-2.5">Time</th>
                <th className="py-2.5">Symbol</th>
                <th className="py-2.5">Side</th>
                <th className="py-2.5 text-right">Qty</th>
                <th className="py-2.5 text-right">Price</th>
                <th className="py-2.5 text-right">Total</th>
                <th className="py-2.5 text-right">Realised P/L</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr><td colSpan={7} className="text-center text-slate-500 py-10">No transactions yet.</td></tr>
              )}
              {transactions.map((t, i) => (
                <tr key={t._id || i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-2.5 text-slate-400 text-xs">
                    {fmt.time(t.createdAt || t.timestamp)} <span className="text-slate-600">·</span> {fmt.date(t.createdAt || t.timestamp)}
                  </td>
                  <td className="py-2.5 font-semibold">
                    <Link to={`/trade/${t.symbol}`} className="hover:text-cyan-200">{t.symbol}</Link>
                  </td>
                  <td className="py-2.5">
                    <span className={`badge ${(t.side || t.type) === 'BUY'
                      ? 'bg-bull-500/15 text-bull-300 border border-bull-500/25'
                      : 'bg-bear-500/15 text-bear-300 border border-bear-500/25'}`}>
                      {t.side || t.type}
                    </span>
                  </td>
                  <td className="py-2.5 text-right num">{fmt.num(t.quantity)}</td>
                  <td className="py-2.5 text-right num text-slate-400">{fmt.money(t.price)}</td>
                  <td className="py-2.5 text-right num">{fmt.money(t.total ?? (t.price * t.quantity))}</td>
                  <td className="py-2.5 text-right num">
                    {t.realisedPnL
                      ? <span className={t.realisedPnL > 0 ? 'text-bull-300' : 'text-bear-300'}>{fmt.money(t.realisedPnL)}</span>
                      : <span className="text-slate-600">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, delta, positive, negative, accent, main }) {
  const accentMap = {
    cyan:    'from-cyan-500/30 to-transparent',
    violet:  'from-violet-500/30 to-transparent',
  };
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="card card-rim p-5 relative overflow-hidden">
      {accent && <div className={`absolute -right-10 -top-10 w-28 h-28 rounded-full blur-3xl bg-gradient-to-br ${accentMap[accent]}`} />}
      {main && <div className="absolute inset-x-0 top-0 h-px market-scanline" />}
      <div className="relative">
        <div className="eyebrow">{label}</div>
        <div className={`num font-display text-2xl font-bold mt-1 ${
          positive ? 'text-bull-300' : negative ? 'text-bear-300' : 'gradient-text-subtle'
        }`}>{value}</div>
        {delta !== undefined && <div className="mt-1.5"><ChangeBadge value={delta} /></div>}
      </div>
    </motion.div>
  );
}
