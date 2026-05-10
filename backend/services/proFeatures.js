const { state, listStocks, getStock, getOrCreatePortfolio, getPriceMap, pushNews } = require('./store');
const { findClosestByTime } = require('../algorithms/binarySearch');

const socialPosts = [];
const advancedOrders = [];
const replayEvents = [];

function userIdOf(reqUser) {
  return String(reqUser._id || reqUser.id);
}

function userNameOf(reqUser) {
  return reqUser.name || reqUser.email || 'Trader';
}

function normalCdf(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (x > 0) p = 1 - p;
  return p;
}

function optionQuote({ symbol, strike, daysToExpiry = 30, type = 'CALL' }) {
  const stock = getStock(symbol);
  if (!stock) throw new Error('Unknown stock');
  const S = stock.price;
  const K = Number(strike);
  const T = Math.max(Number(daysToExpiry), 1) / 365;
  const r = 0.045;
  const sigma = Math.max(stock.volatility * Math.sqrt(252), 0.05);
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  const call = S * normalCdf(d1) - K * Math.exp(-r * T) * normalCdf(d2);
  const put = K * Math.exp(-r * T) * normalCdf(-d2) - S * normalCdf(-d1);
  const price = type === 'PUT' ? put : call;
  return {
    symbol: stock.symbol,
    type,
    underlyingPrice: S,
    strike: K,
    daysToExpiry: Number(daysToExpiry),
    impliedVolatility: +(sigma * 100).toFixed(2),
    premium: +Math.max(price, 0.01).toFixed(2),
    delta: +(type === 'PUT' ? normalCdf(d1) - 1 : normalCdf(d1)).toFixed(3),
    gamma: +(Math.exp(-d1 * d1 / 2) / (S * sigma * Math.sqrt(2 * Math.PI * T))).toFixed(5),
    theta: +(-((S * sigma * Math.exp(-d1 * d1 / 2)) / (2 * Math.sqrt(2 * Math.PI * T))) / 365).toFixed(3),
    breakeven: +(type === 'PUT' ? K - price : K + price).toFixed(2),
  };
}

function getChallenges(reqUser) {
  const userId = userIdOf(reqUser);
  const portfolio = getOrCreatePortfolio(userId, reqUser.startingBalance);
  const snap = portfolio.snapshot(getPriceMap());
  const trades = portfolio.tradeStack.length;
  const winners = portfolio.tradeStack.filter(t => t.type === 'SELL' && (t.realisedPnL || 0) > 0).length;
  const distinct = portfolio.holdings.size;
  const roi = snap.pnlPercent;
  const defs = [
    { id: 'first-trade', title: 'Place your first trade on the Addis exchange', reward: 2500,  progress: Math.min(trades, 1), goal: 1 },
    { id: 'five-trades', title: 'Complete 5 trades',                            reward: 7500,  progress: Math.min(trades, 5), goal: 5 },
    { id: 'diversify-3', title: 'Hold 3 different Ethiopian companies',         reward: 5000,  progress: Math.min(distinct, 3), goal: 3 },
    { id: 'green-day',   title: 'Reach +1% portfolio ROI',                      reward: 10000, progress: Math.max(0, Math.min(roi, 1)), goal: 1 },
    { id: 'winning-sells', title: 'Book 3 profitable sells',                    reward: 12500, progress: Math.min(winners, 3), goal: 3 },
  ];
  return defs.map(c => ({ ...c, completed: c.progress >= c.goal, progressPercent: Math.round((c.progress / c.goal) * 100) }));
}

function createAdvancedOrder(reqUser, payload) {
  const symbol = String(payload.symbol || '').toUpperCase();
  const stock = getStock(symbol);
  if (!stock) throw new Error('Unknown stock');
  const order = {
    id: `AO${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    userId: userIdOf(reqUser),
    userName: userNameOf(reqUser),
    symbol,
    side: payload.side === 'BUY' ? 'BUY' : 'SELL',
    kind: payload.kind === 'TAKE_PROFIT' ? 'TAKE_PROFIT' : 'STOP_LOSS',
    triggerPrice: Number(payload.triggerPrice),
    quantity: Math.max(1, Math.floor(Number(payload.quantity || 1))),
    status: 'ACTIVE',
    createdAt: Date.now(),
    triggeredAt: null,
  };
  advancedOrders.unshift(order);
  return order;
}

function listAdvancedOrders(userId) {
  return advancedOrders.filter(o => !userId || o.userId === String(userId));
}

function sweepAdvancedOrders() {
  const priceMap = getPriceMap();
  const fired = [];
  for (const order of advancedOrders) {
    if (order.status !== 'ACTIVE') continue;
    const price = priceMap.get(order.symbol);
    if (!price) continue;
    const crossed = order.kind === 'STOP_LOSS'
      ? (order.side === 'SELL' ? price <= order.triggerPrice : price >= order.triggerPrice)
      : (order.side === 'SELL' ? price >= order.triggerPrice : price <= order.triggerPrice);
    if (!crossed) continue;
    const portfolio = getOrCreatePortfolio(order.userId);
    try {
      if (order.side === 'BUY') portfolio.applyBuy(order.symbol, order.quantity, price);
      else portfolio.applySell(order.symbol, order.quantity, price);
      order.status = 'TRIGGERED';
      order.triggeredAt = Date.now();
      order.executionPrice = price;
      fired.push(order);
    } catch (err) {
      order.status = 'REJECTED';
      order.error = err.message;
    }
  }
  return fired;
}

function createPost(reqUser, body) {
  const post = {
    id: `P${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    userId: userIdOf(reqUser),
    userName: userNameOf(reqUser),
    symbol: body.symbol ? String(body.symbol).toUpperCase() : '',
    text: String(body.text || '').slice(0, 280),
    sentiment: body.sentiment || 'NEUTRAL',
    likes: 0,
    createdAt: Date.now(),
  };
  socialPosts.unshift(post);
  if (socialPosts.length > 100) socialPosts.length = 100;
  return post;
}

function likePost(id) {
  const post = socialPosts.find(p => p.id === id);
  if (post) post.likes += 1;
  return post;
}

function backtest({ symbol, fast = 5, slow = 15, capital = 10000 }) {
  const sym = String(symbol || '').toUpperCase();
  const history = state.priceHistory.get(sym) || [];
  const fastN = Number(fast);
  const slowN = Number(slow);
  const cap   = Number(capital);

  // Graceful warm-up: rather than 400-ing the request, return an empty result
  // with a hint so the UI can show a friendly "simulator warming up" message.
  if (history.length < slowN + 2) {
    return {
      symbol: sym,
      fast: fastN,
      slow: slowN,
      capital: cap,
      finalValue: cap,
      roi: 0,
      trades: [],
      equity: [],
      warming: true,
      message: 'Simulator is still warming up — wait a few ticks, or reduce the "slow" window.',
    };
  }
  const closes = history.map(c => c.close);
  const avg = (arr, i, n) => arr.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n;
  let cash = cap;
  let shares = 0;
  const trades = [];
  const equity = [];
  for (let i = slowN; i < closes.length; i++) {
    const f = avg(closes, i, fastN);
    const s = avg(closes, i, slowN);
    const price = closes[i];
    if (f > s && shares === 0) {
      shares = Math.floor(cash / price);
      cash -= shares * price;
      trades.push({ time: history[i].time, side: 'BUY', price, shares });
    } else if (f < s && shares > 0) {
      cash += shares * price;
      trades.push({ time: history[i].time, side: 'SELL', price, shares });
      shares = 0;
    }
    equity.push({ time: history[i].time, value: +(cash + shares * price).toFixed(2) });
  }
  const finalValue = equity[equity.length - 1]?.value || cap;
  const roi = ((finalValue - cap) / cap) * 100;
  return { symbol: sym, fast: fastN, slow: slowN, capital: cap, finalValue, roi: +roi.toFixed(2), trades, equity, warming: false };
}

function analytics(reqUser) {
  const portfolio = getOrCreatePortfolio(userIdOf(reqUser), reqUser.startingBalance);
  const snap = portfolio.snapshot(getPriceMap());
  const values = snap.positions.map(p => p.value);
  const largest = values.length ? Math.max(...values) : 0;
  const hhi = snap.positionsValue > 0 ? snap.positions.reduce((s, p) => s + (p.value / snap.positionsValue) ** 2, 0) : 0;
  const sells = portfolio.tradeStack.filter(t => t.type === 'SELL');
  const winRate = sells.length ? (sells.filter(t => (t.realisedPnL || 0) > 0).length / sells.length) * 100 : 0;
  const returns = portfolio.tradeStack.map(t => t.realisedPnL || 0).filter(Boolean);
  const avg = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const sd = returns.length > 1 ? Math.sqrt(returns.reduce((s, x) => s + (x - avg) ** 2, 0) / (returns.length - 1)) : 0;
  return {
    sharpeLike: sd ? +(avg / sd).toFixed(2) : 0,
    winRate: +winRate.toFixed(1),
    maxDrawdown: +(Math.min(0, snap.pnlPercent) * -1).toFixed(2),
    concentration: snap.positionsValue ? +((largest / snap.positionsValue) * 100).toFixed(1) : 0,
    diversificationScore: +(100 * (1 - hhi)).toFixed(1),
    turnover: portfolio.tradeStack.length,
    pnl: snap.pnl,
    pnlPercent: snap.pnlPercent,
  };
}

function sentimentScan() {
  const words = {
    positive: ['beat', 'upgrade', 'breakthrough', 'cheer', 'strong', 'cut', 'returns', 'record', 'surge', 'milestone', 'stabilises', 'tailwind', 'expands'],
    negative: ['probe', 'misses', 'selling', 'hotter', 'tensions', 'weighs', 'shortage', 'devaluation', 'jittery', 'subsidy'],
  };
  const scored = state.news.map(n => {
    const text = String(n.text || '').toLowerCase();
    const pos = words.positive.filter(w => text.includes(w)).length;
    const neg = words.negative.filter(w => text.includes(w)).length;
    const score = pos - neg + (n.impact ? Math.sign(n.impact) : 0);
    return { ...n, score, sentiment: score > 0 ? 'BULLISH' : score < 0 ? 'BEARISH' : 'NEUTRAL' };
  });
  const bySymbol = {};
  for (const n of scored) {
    if (!n.symbol) continue;
    bySymbol[n.symbol] = bySymbol[n.symbol] || { symbol: n.symbol, score: 0, count: 0 };
    bySymbol[n.symbol].score += n.score;
    bySymbol[n.symbol].count += 1;
  }
  return { items: scored, symbols: Object.values(bySymbol).sort((a, b) => Math.abs(b.score) - Math.abs(a.score)) };
}

function startReplay(sequence = 'FLASH_CRASH') {
  const shocks = sequence === 'BULL_RUN'
    ? [
        { regime: 'BULL' },
        { symbol: 'ETHA',   strength:  0.08 },   // Ethiopian Airlines surges on coffee-export tailwind
        { symbol: 'CBE',    strength:  0.04 },   // CBE benefits from rate-cut cycle
        { symbol: 'ETHTEL', strength:  0.03 },   // Ethio Telecom IPO momentum
      ]
    : [
        { regime: 'VOLATILE' },
        { symbol: 'TBIRR',  strength: -0.10 },   // Tele-Birr correction
        { symbol: 'NOC',    strength: -0.12 },   // Fuel subsidy shock
        { symbol: 'AWASH',  strength: -0.07 },   // Banking sell-off
      ];
  replayEvents.unshift({ id: `R${Date.now()}`, sequence, shocks, startedAt: Date.now() });
  pushNews({ kind: 'macro', text: `Replay started: ${sequence}`, time: Date.now() });
  return shocks;
}

module.exports = {
  optionQuote,
  getChallenges,
  createAdvancedOrder,
  listAdvancedOrders,
  sweepAdvancedOrders,
  createPost,
  likePost,
  socialPosts,
  backtest,
  analytics,
  sentimentScan,
  startReplay,
  replayEvents,
};
