const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { state, getStock } = require('../services/store');
const { isDbReady } = require('../config/db');
const Watchlist = require('../models/Watchlist');

function getMem(userId) {
  const id = String(userId);
  if (!state.watchlists.has(id)) state.watchlists.set(id, new Set());
  return state.watchlists.get(id);
}
function getAlertsMem(userId) {
  const id = String(userId);
  if (!state.alerts.has(id)) state.alerts.set(id, []);
  return state.alerts.get(id);
}

const list = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  let symbols;
  if (isDbReady()) {
    const doc = await Watchlist.findOne({ user: userId }) || { symbols: [], alerts: [] };
    symbols = doc.symbols || [];
    return res.json({
      success: true,
      symbols,
      alerts: doc.alerts || [],
      details: symbols.map(getStock).filter(Boolean),
    });
  }
  symbols = [...getMem(userId)];
  res.json({
    success: true,
    symbols,
    alerts: getAlertsMem(userId),
    details: symbols.map(getStock).filter(Boolean),
  });
});

const add = asyncHandler(async (req, res) => {
  const symbol = String(req.params.symbol).toUpperCase();
  if (!getStock(symbol)) throw new ApiError(404, 'Unknown stock');
  const userId = req.user._id || req.user.id;
  if (isDbReady()) {
    await Watchlist.findOneAndUpdate(
      { user: userId },
      { $addToSet: { symbols: symbol } },
      { upsert: true, new: true },
    );
  } else {
    getMem(userId).add(symbol);
  }
  res.json({ success: true });
});

const remove = asyncHandler(async (req, res) => {
  const symbol = String(req.params.symbol).toUpperCase();
  const userId = req.user._id || req.user.id;
  if (isDbReady()) {
    await Watchlist.findOneAndUpdate({ user: userId }, { $pull: { symbols: symbol } });
  } else {
    getMem(userId).delete(symbol);
  }
  res.json({ success: true });
});

const addAlert = asyncHandler(async (req, res) => {
  const { symbol, price, direction } = req.body;
  if (!getStock(symbol)) throw new ApiError(404, 'Unknown stock');
  if (!['ABOVE', 'BELOW'].includes(direction)) throw new ApiError(400, 'Bad direction');
  const userId = req.user._id || req.user.id;
  const alert = {
    symbol: symbol.toUpperCase(),
    price: Number(price),
    direction,
    triggered: false,
    createdAt: new Date(),
  };
  if (isDbReady()) {
    await Watchlist.findOneAndUpdate(
      { user: userId },
      { $push: { alerts: alert } },
      { upsert: true, new: true },
    );
  } else {
    getAlertsMem(userId).push(alert);
  }
  res.status(201).json({ success: true, alert });
});

const removeAlert = asyncHandler(async (req, res) => {
  const { idx } = req.params;
  const userId = req.user._id || req.user.id;
  if (isDbReady()) {
    const doc = await Watchlist.findOne({ user: userId });
    if (doc) {
      doc.alerts.splice(Number(idx), 1);
      await doc.save();
    }
  } else {
    const arr = getAlertsMem(userId);
    arr.splice(Number(idx), 1);
  }
  res.json({ success: true });
});

module.exports = { list, add, remove, addAlert, removeAlert };
