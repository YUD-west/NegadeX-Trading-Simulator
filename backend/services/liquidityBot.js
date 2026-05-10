const engine = require('./engineSingleton');
const { listStocks, state } = require('./store');

/**
 * Background liquidity provider.
 *
 * The trading simulator only has a handful of human users so the order
 * book would be empty most of the time. To make every BUY/SELL feel
 * responsive, this bot continuously seeds resting LIMIT orders around
 * the current mid-price for every symbol.
 *
 * It runs as a synthetic "market maker" with userId = MM-BOT.
 */

const BOT_USER = 'MM-BOT';

class LiquidityBot {
  constructor({ everyMs = 1500 } = {}) {
    this.everyMs = everyMs;
    this.timer = null;
    this.cursor = 0;
  }
  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this._tick(), this.everyMs);
    console.log('[bot] Liquidity bot started');
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
  _tick() {
    // Refresh a rotating slice plus a few high-activity names so depth feels alive
    // without cancelling/rebuilding every book on every tick.
    const stocks = listStocks();
    if (!stocks.length) return;

    const active = [...stocks]
      .sort((a, b) => Math.abs(b.changePercent || 0) + (b.volume24h || 0) / 1_000_000
        - (Math.abs(a.changePercent || 0) + (a.volume24h || 0) / 1_000_000))
      .slice(0, 4);
    const rotating = [];
    for (let i = 0; i < 6; i++) rotating.push(stocks[(this.cursor + i) % stocks.length]);
    this.cursor = (this.cursor + 6) % stocks.length;

    const targets = [...new Map([...active, ...rotating].map(s => [s.symbol, s])).values()];
    for (const s of targets) {
      if (!s) continue;
      // Cancel any of the bot's existing resting orders for this symbol
      engine.cancelAllForUser(`${BOT_USER}-${s.symbol}`);
      // Seed a dynamic bid/ask ladder: wider in volatile/bear regimes, tighter in bull markets.
      const regimeSpread = state.marketRegime === 'VOLATILE' ? 2.2 : state.marketRegime === 'BEAR' ? 1.45 : state.marketRegime === 'BULL' ? 0.82 : 1;
      const momentumSkew = Math.max(-0.35, Math.min(0.35, (s.changePercent || 0) / 100));
      const spread = Math.max(s.price * (0.00055 + (s.volatility || 0.012) * 0.045) * regimeSpread, 0.05);
      const baseQty = Math.max(8, Math.floor(15 + Math.sqrt(Math.max(s.volume24h || 0, 1)) / 42));
      const layers = state.marketRegime === 'VOLATILE' ? 5 : 4;
      for (let l = 1; l <= layers; l++) {
        const depthDecay = 1 + l * 0.42;
        const jitter = 0.78 + Math.random() * 0.54;
        const qty  = Math.max(1, Math.floor((baseQty * jitter) / depthDecay));
        const bid  = +(s.price - spread * l * (1 + Math.max(0, momentumSkew))).toFixed(2);
        const ask  = +(s.price + spread * l * (1 + Math.max(0, -momentumSkew))).toFixed(2);
        try {
          engine.submit({
            userId: `${BOT_USER}-${s.symbol}`,
            symbol: s.symbol,
            side: 'BUY',
            type: 'LIMIT',
            quantity: qty,
            price: bid,
          });
          engine.submit({
            userId: `${BOT_USER}-${s.symbol}`,
            symbol: s.symbol,
            side: 'SELL',
            type: 'LIMIT',
            quantity: qty,
            price: ask,
          });
        } catch (_) { /* swallow */ }
      }
    }
  }
}

module.exports = { LiquidityBot, BOT_USER };
