const asyncHandler = require('../utils/asyncHandler');
const { state, getPriceMap } = require('../services/store');
const { rankUsers } = require('../algorithms/ranking');
const { isDbReady } = require('../config/db');
const User = require('../models/User');
const memUsers = require('../utils/inMemoryUsers');

async function listAllUsers() {
  if (isDbReady()) {
    const docs = await User.find({}, '_id name email avatar startingBalance role');
    return docs.map(d => ({
      id: String(d._id),
      name: d.name,
      email: d.email,
      avatar: d.avatar,
      startingBalance: d.startingBalance || Number(process.env.STARTING_BALANCE || 1000000),
    }));
  }
  const arr = await memUsers.list();
  return arr.map(u => ({
    id: String(u._id),
    name: u.name,
    email: u.email,
    avatar: u.avatar || '',
    startingBalance: u.startingBalance,
  }));
}

const leaderboard = asyncHandler(async (_req, res) => {
  const users = await listAllUsers();
  const priceMap = getPriceMap();
  const enriched = users.map(u => {
    const portfolio = state.portfolios.get(u.id);
    if (!portfolio) {
      return {
        ...u,
        portfolioValue: u.startingBalance,
        cash: u.startingBalance,
        positions: 0,
        trades: 0,
      };
    }
    const snap = portfolio.snapshot(priceMap);
    return {
      ...u,
      portfolioValue: snap.totalValue,
      cash: snap.cash,
      positions: snap.positions.length,
      realizedPnL: snap.realizedPnL,
      trades: portfolio.tradeStack.length,
      // Win rate = # of profitable sells / total sells
      winRate: (() => {
        const sells = portfolio.tradeStack.filter(t => t.type === 'SELL');
        if (!sells.length) return 0;
        const wins = sells.filter(t => (t.realisedPnL || 0) > 0).length;
        return +((wins / sells.length) * 100).toFixed(1);
      })(),
    };
  });
  const ranked = rankUsers(enriched, 50).map((u, i) => ({ rank: i + 1, ...u }));
  res.json({ success: true, items: ranked });
});

module.exports = { leaderboard };
