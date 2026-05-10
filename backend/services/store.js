const SEED = require('../config/stocksSeed');
const { PortfolioManager } = require('../algorithms/portfolioManager');

/**
 * Process-level in-memory store. This is the live "source of truth"
 * for the simulator regardless of whether MongoDB is connected.
 *
 *   stocks         : Map<symbol, StockState>
 *   priceHistory   : Map<symbol, Candle[]>  (sorted asc by time → binary-searchable)
 *   tradesFeed     : array of latest matched trades (capped)
 *   portfolios     : Map<userId, PortfolioManager>
 *   userMeta       : Map<userId, {name, email, isAdmin, lastValue}>
 *   watchlists     : Map<userId, Set<symbol>>
 *   alerts         : Map<userId, Array<{symbol, price, direction}>>
 *   news           : array of latest news events (capped)
 *
 * Mongoose models, when connected, mirror this structure so a server
 * restart can rebuild memory from the database (see seed.js).
 */

const HISTORY_LIMIT = 240;          // ≈ 10 minutes at 2.5s ticks
const TRADES_LIMIT  = 50;
const NEWS_LIMIT    = 30;

const state = {
  stocks: new Map(),
  priceHistory: new Map(),
  tradesFeed: [],
  portfolios: new Map(),
  userMeta: new Map(),
  watchlists: new Map(),
  alerts: new Map(),
  news: [],
  marketRegime: 'NEUTRAL',           // BULL / BEAR / NEUTRAL / VOLATILE
  startedAt: Date.now(),
};

function bootstrapStocks() {
  if (state.stocks.size > 0) return;
  const now = Math.floor(Date.now() / 1000);
  SEED.forEach(s => {
    const stock = {
      symbol: s.symbol,
      name: s.name,
      sector: s.sector,
      price: s.price,
      open: s.price,
      high: s.price,
      low: s.price,
      previousClose: s.price,
      change: 0,
      changePercent: 0,
      volatility: s.volatility,
      drift: s.drift,
      volume24h: Math.floor(50_000 + Math.random() * 950_000),
      marketCap: s.price * (50_000_000 + Math.random() * 5_000_000_000),
      updatedAt: Date.now(),
    };
    state.stocks.set(s.symbol, stock);
    // Seed an initial flat candle so charts have something to draw
    state.priceHistory.set(s.symbol, [
      { time: now - 1, open: s.price, high: s.price, low: s.price, close: s.price, volume: 0 },
      { time: now,     open: s.price, high: s.price, low: s.price, close: s.price, volume: 0 },
    ]);
  });
}

function getStock(symbol) {
  return state.stocks.get(symbol?.toUpperCase());
}

function listStocks() {
  return [...state.stocks.values()];
}

function getPriceMap() {
  const m = new Map();
  for (const s of state.stocks.values()) m.set(s.symbol, s.price);
  return m;
}

function getOrCreatePortfolio(userId, startingBalance = Number(process.env.STARTING_BALANCE || 1000000)) {
  const id = String(userId);
  if (!state.portfolios.has(id)) {
    state.portfolios.set(id, new PortfolioManager({ startingBalance }));
  }
  return state.portfolios.get(id);
}

function recordTrade(trade) {
  state.tradesFeed.unshift(trade);
  if (state.tradesFeed.length > TRADES_LIMIT) state.tradesFeed.length = TRADES_LIMIT;
}

function pushNews(item) {
  const newsItem = { ...item, id: `N${Date.now()}-${Math.random().toString(36).slice(2,7)}` };
  state.news.unshift(newsItem);
  if (state.news.length > NEWS_LIMIT) state.news.length = NEWS_LIMIT;
  return newsItem;
}

function pushCandle(symbol, candle) {
  const arr = state.priceHistory.get(symbol);
  if (!arr) return;
  // If this tick falls within the same second as the previous candle, update it.
  const last = arr[arr.length - 1];
  if (last && candle.time === last.time) {
    last.high   = Math.max(last.high, candle.high);
    last.low    = Math.min(last.low,  candle.low);
    last.close  = candle.close;
    last.volume = (last.volume || 0) + (candle.volume || 0);
  } else {
    arr.push(candle);
    if (arr.length > HISTORY_LIMIT) arr.shift();
  }
}

function setRegime(regime) {
  state.marketRegime = regime;
}

module.exports = {
  state,
  HISTORY_LIMIT,
  bootstrapStocks,
  getStock,
  listStocks,
  getPriceMap,
  getOrCreatePortfolio,
  recordTrade,
  pushNews,
  pushCandle,
  setRegime,
};
