const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { listStocks, getStock, state } = require('../services/store');
const { topGainers, topLosers, mostTraded } = require('../algorithms/ranking');
const { findClosestByTime, rangeBetween } = require('../algorithms/binarySearch');

const list = asyncHandler(async (req, res) => {
  const { search = '', sector = '', sort = '', limit = 100, page = 1 } = req.query;
  let items = listStocks();
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
  }
  if (sector) items = items.filter(s => s.sector === sector);
  if (sort === 'gainers')   items = [...items].sort((a, b) => b.changePercent - a.changePercent);
  if (sort === 'losers')    items = [...items].sort((a, b) => a.changePercent - b.changePercent);
  if (sort === 'price')     items = [...items].sort((a, b) => b.price - a.price);
  if (sort === 'volume')    items = [...items].sort((a, b) => b.volume24h - a.volume24h);

  const lim  = Math.min(Number(limit) || 100, 200);
  const pg   = Math.max(Number(page) || 1, 1);
  const start = (pg - 1) * lim;
  const paged = items.slice(start, start + lim);

  res.json({
    success: true,
    total: items.length,
    page: pg,
    limit: lim,
    regime: state.marketRegime,
    items: paged,
  });
});

const detail = asyncHandler(async (req, res) => {
  const stock = getStock(req.params.symbol);
  if (!stock) throw new ApiError(404, 'Stock not found');
  res.json({ success: true, stock });
});

const history = asyncHandler(async (req, res) => {
  const symbol = String(req.params.symbol).toUpperCase();
  const arr = state.priceHistory.get(symbol);
  if (!arr) throw new ApiError(404, 'Stock not found');
  const { from, to } = req.query;
  if (from || to) {
    const f = Number(from) || 0;
    const t = Number(to) || Math.floor(Date.now() / 1000);
    return res.json({ success: true, candles: rangeBetween(arr, f, t) });
  }
  res.json({ success: true, candles: arr });
});

const lookupAt = asyncHandler(async (req, res) => {
  const symbol = String(req.params.symbol).toUpperCase();
  const t = Number(req.query.time);
  if (!t) throw new ApiError(400, 'Pass ?time=<unix-seconds>');
  const arr = state.priceHistory.get(symbol);
  if (!arr) throw new ApiError(404, 'Stock not found');
  const candle = findClosestByTime(arr, t);
  res.json({ success: true, candle });
});

const trending = asyncHandler(async (_req, res) => {
  const all = listStocks();
  res.json({
    success: true,
    regime: state.marketRegime,
    gainers:    topGainers(all, 5),
    losers:     topLosers(all, 5),
    mostTraded: mostTraded(all, 5),
  });
});

const news = asyncHandler(async (_req, res) => {
  res.json({ success: true, news: state.news });
});

const sectors = asyncHandler(async (_req, res) => {
  const set = new Set(listStocks().map(s => s.sector));
  res.json({ success: true, sectors: [...set].sort() });
});

const marketSummary = asyncHandler(async (_req, res) => {
  const all = listStocks();
  const advancing = all.filter(s => s.changePercent > 0).length;
  const declining = all.filter(s => s.changePercent < 0).length;
  const avgChange = all.reduce((s, x) => s + x.changePercent, 0) / Math.max(all.length, 1);
  const sentiment = avgChange > 0.6 ? 'BULLISH'
                   : avgChange < -0.6 ? 'BEARISH'
                   : 'NEUTRAL';
  res.json({
    success: true,
    regime: state.marketRegime,
    sentiment,
    advancing,
    declining,
    unchanged: all.length - advancing - declining,
    averageChangePercent: +avgChange.toFixed(3),
    totalSymbols: all.length,
  });
});

module.exports = { list, detail, history, lookupAt, trending, news, sectors, marketSummary };
