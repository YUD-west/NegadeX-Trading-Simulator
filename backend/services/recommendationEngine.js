const { state, listStocks } = require('./store');
const { topK } = require('../algorithms/ranking');

/**
 * AI-style stock recommendation engine.
 *
 * NO external ML model — instead we compute a transparent composite
 * score from real signals so users can see WHY a stock is recommended:
 *
 *   momentum    = average return over the last N candles  (trend-following)
 *   volSurge    = current 24h volume / median volume       (breakout signal)
 *   volatility  = stddev of returns                        (risk gauge)
 *   shortDip    = how far the price is below the 20-tick high (mean-reversion)
 *
 * Composite score:
 *   buy  = 0.55*momentum + 0.30*volSurge - 0.15*volatility
 *   dip  = 0.60*shortDip - 0.40*momentum                  (oversold pick)
 *
 * Each rec ships with a human-readable reason string and a confidence
 * percentile, so the UI can render an "Analyst-style" card.
 */

const HISTORY_WINDOW = 30;       // candles considered for momentum
const HIGH_LOOKBACK  = 20;
const MEDIAN_VOL     = 500_000;  // baseline used for surge ratio

function stddev(arr) {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((s, x) => s + (x - mean) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function returnsFromCandles(candles) {
  const out = [];
  for (let i = 1; i < candles.length; i++) {
    if (candles[i - 1].close <= 0) continue;
    out.push((candles[i].close - candles[i - 1].close) / candles[i - 1].close);
  }
  return out;
}

function scoreStock(stock) {
  const candles = (state.priceHistory.get(stock.symbol) || []).slice(-HISTORY_WINDOW);
  if (candles.length < 4) {
    return {
      symbol: stock.symbol,
      momentum: 0, volSurge: 0, volatility: 0, shortDip: 0,
      buyScore: 0, dipScore: 0,
    };
  }
  const rets = returnsFromCandles(candles);
  const momentum = rets.reduce((a, b) => a + b, 0) / Math.max(rets.length, 1);
  const volatility = stddev(rets);

  const recent20 = candles.slice(-HIGH_LOOKBACK);
  const high20  = Math.max(...recent20.map(c => c.high || c.close));
  const shortDip = high20 > 0 ? (high20 - stock.price) / high20 : 0;

  const volSurge = Math.min(stock.volume24h / MEDIAN_VOL, 4);

  const buyScore = 0.55 * momentum * 100 + 0.30 * volSurge - 0.15 * volatility * 100;
  const dipScore = 0.60 * shortDip - 0.40 * momentum;

  return {
    symbol: stock.symbol,
    name: stock.name,
    sector: stock.sector,
    price: stock.price,
    changePercent: stock.changePercent,
    momentum: +(momentum * 100).toFixed(3),
    volSurge: +volSurge.toFixed(2),
    volatility: +(volatility * 100).toFixed(3),
    shortDip: +(shortDip * 100).toFixed(2),
    buyScore: +buyScore.toFixed(3),
    dipScore: +dipScore.toFixed(3),
  };
}

function buildReason(s, kind) {
  const bits = [];
  if (kind === 'BUY') {
    if (s.momentum > 0.4) bits.push(`strong uptrend (+${s.momentum}% / tick)`);
    if (s.volSurge > 1.5) bits.push(`heavy volume (${s.volSurge.toFixed(1)}× avg)`);
    if (s.volatility < 1.5) bits.push('low volatility');
    if (!bits.length) bits.push('positive composite signals');
  } else {
    bits.push(`${s.shortDip.toFixed(1)}% off recent high`);
    if (s.momentum < 0) bits.push('mean-reversion candidate');
    if (s.volSurge > 1.2) bits.push('volume confirmation');
  }
  return bits.join(' · ');
}

function recommendations({ k = 5 } = {}) {
  const scored = listStocks().map(scoreStock);
  const buys = topK(scored, k, (x) => x.buyScore).map(s => ({
    ...s, kind: 'BUY', reason: buildReason(s, 'BUY'),
    confidence: Math.min(99, Math.max(15, Math.round(50 + s.buyScore * 4))),
  }));
  const dips = topK(scored, k, (x) => x.dipScore).map(s => ({
    ...s, kind: 'DIP', reason: buildReason(s, 'DIP'),
    confidence: Math.min(99, Math.max(15, Math.round(40 + s.dipScore * 200))),
  }));
  return { buys, dips, regime: state.marketRegime, generatedAt: Date.now() };
}

module.exports = { recommendations, scoreStock };
