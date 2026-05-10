const asyncHandler = require('../utils/asyncHandler');
const { getOrCreatePortfolio, getPriceMap } = require('../services/store');
const { isDbReady } = require('../config/db');
const Transaction = require('../models/Transaction');

const mySnapshot = asyncHandler(async (req, res) => {
  const portfolio = getOrCreatePortfolio(req.user._id || req.user.id, req.user.startingBalance);
  res.json({ success: true, portfolio: portfolio.snapshot(getPriceMap()) });
});

const myTransactions = asyncHandler(async (req, res) => {
  const userId = String(req.user._id || req.user.id);
  if (isDbReady()) {
    const items = await Transaction.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(200);
    return res.json({ success: true, items });
  }
  // In-memory fallback: derive from portfolio queue
  const portfolio = getOrCreatePortfolio(userId, req.user.startingBalance);
  res.json({ success: true, items: portfolio.txQueue.toArray().reverse() });
});

const exportTransactions = asyncHandler(async (req, res) => {
  const userId = String(req.user._id || req.user.id);
  let items;
  if (isDbReady()) {
    items = await Transaction.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
  } else {
    const portfolio = getOrCreatePortfolio(userId, req.user.startingBalance);
    items = portfolio.txQueue.toArray().reverse();
  }
  const headers = ['date,symbol,side,quantity,price,total,realisedPnL'];
  const rows = items.map(t => {
    const date = new Date(t.createdAt || t.timestamp || Date.now()).toISOString();
    const total = t.total ?? (t.price * t.quantity);
    const pnl   = t.realisedPnL ?? t.realisedPnL ?? 0;
    return [date, t.symbol, t.side || t.type, t.quantity, t.price, total, pnl].join(',');
  });
  const csv = [headers, ...rows].join('\n');
  res.header('Content-Type', 'text/csv');
  res.attachment('transactions.csv').send(csv);
});

module.exports = { mySnapshot, myTransactions, exportTransactions };
