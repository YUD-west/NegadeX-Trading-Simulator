const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { listStocks, state, getStock } = require('../services/store');
const { isDbReady } = require('../config/db');
const User = require('../models/User');
const memUsers = require('../utils/inMemoryUsers');
const { startReplay, replayEvents } = require('../services/proFeatures');

let simulator;
function bindSimulator(s) { simulator = s; }

const triggerShock = asyncHandler(async (req, res) => {
  const { symbol, strength } = req.body;
  const ok = simulator?.injectShock(symbol, Number(strength));
  if (!ok) throw new ApiError(400, 'Could not inject shock');
  res.json({ success: true });
});

const setRegime = asyncHandler(async (req, res) => {
  const { regime } = req.body;
  const ok = simulator?.setRegime(regime);
  if (!ok) throw new ApiError(400, 'Invalid regime');
  res.json({ success: true });
});

const allUsers = asyncHandler(async (_req, res) => {
  let users;
  if (isDbReady()) {
    const docs = await User.find({});
    users = docs.map(d => d.toSafeJSON());
  } else {
    users = (await memUsers.list()).map(u => memUsers.toSafe(u));
  }
  res.json({ success: true, users });
});

const suspendUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { suspended } = req.body;
  if (isDbReady()) {
    const u = await User.findByIdAndUpdate(id, { isSuspended: !!suspended }, { new: true });
    if (!u) throw new ApiError(404, 'User not found');
    return res.json({ success: true, user: u.toSafeJSON() });
  }
  const u = await memUsers.update(id, { isSuspended: !!suspended });
  if (!u) throw new ApiError(404, 'User not found');
  res.json({ success: true, user: memUsers.toSafe(u) });
});

const stats = asyncHandler(async (_req, res) => {
  const userCount = isDbReady()
    ? await User.countDocuments()
    : (await memUsers.list()).length;
  const stocks = listStocks();
  const totalVolume = stocks.reduce((s, x) => s + x.volume24h, 0);
  res.json({
    success: true,
    userCount,
    stockCount: stocks.length,
    totalVolume,
    regime: state.marketRegime,
    portfolios: state.portfolios.size,
    activeOrders: (() => {
      const engine = require('../services/engineSingleton');
      let n = 0;
      for (const b of engine.books.values()) {
        n += b.buyBook.size() + b.sellBook.size();
      }
      return n;
    })(),
    uptimeSec: Math.floor((Date.now() - state.startedAt) / 1000),
  });
});

const updateStock = asyncHandler(async (req, res) => {
  const stock = getStock(req.params.symbol);
  if (!stock) throw new ApiError(404, 'Stock not found');
  const allowed = ['volatility', 'drift', 'isSuspended', 'price'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) stock[key] = req.body[key];
  }
  res.json({ success: true, stock });
});

const replay = asyncHandler(async (req, res) => {
  const sequence = req.body.sequence || 'FLASH_CRASH';
  const shocks = startReplay(sequence);
  for (const s of shocks) {
    if (s.regime) simulator?.setRegime(s.regime);
    if (s.symbol) simulator?.injectShock(s.symbol, s.strength);
  }
  res.json({ success: true, sequence, shocks, history: replayEvents.slice(0, 10) });
});

module.exports = {
  bindSimulator,
  triggerShock,
  setRegime,
  allUsers,
  suspendUser,
  stats,
  updateStock,
  replay,
};
