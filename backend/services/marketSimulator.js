const { listStocks, pushCandle, state, pushNews, setRegime } = require('./store');

/**
 * ────────────────────────────────────────────────────────────────────────────
 *  MARKET SIMULATION ENGINE
 * ────────────────────────────────────────────────────────────────────────────
 *
 *  Each tick (default 2.5s) every stock is evolved using a *Geometric
 *  Brownian Motion*-flavoured random walk, modulated by:
 *      • per-stock drift  μ
 *      • per-stock vol    σ
 *      • market regime multiplier (BULL / BEAR / VOLATILE)
 *      • macro "news" shocks injected randomly or by the admin
 *      • residual trade impact (volume → micro pressure)
 *
 *      ΔP/P  =  (μ · regime.driftBias) + σ · regime.volMul · Z
 *
 *  where Z is a standard-normal sample (Box-Muller).
 *
 *  After each tick we push a 1-second candlestick to the history buffer
 *  so the frontend chart updates smoothly.
 * ────────────────────────────────────────────────────────────────────────────
 */

const REGIMES = {
  BULL:     { driftBias:  1.6, volMul: 0.9, liquidityBias:  0.10 },
  BEAR:     { driftBias: -1.4, volMul: 1.1, liquidityBias: -0.08 },
  NEUTRAL:  { driftBias:  1.0, volMul: 1.0, liquidityBias:  0.00 },
  VOLATILE: { driftBias:  1.0, volMul: 2.2, liquidityBias: -0.18 },
};

const SECTOR_BEHAVIOR = {
  Banking:       { volMul: 0.82, driftMul: 1.05, volumeMul: 1.35, beta: 0.65 },
  Telecom:       { volMul: 1.05, driftMul: 1.18, volumeMul: 1.25, beta: 0.95 },
  Fintech:       { volMul: 1.35, driftMul: 1.35, volumeMul: 1.50, beta: 1.25 },
  Aviation:      { volMul: 1.18, driftMul: 1.05, volumeMul: 1.20, beta: 1.15 },
  Logistics:     { volMul: 1.06, driftMul: 0.95, volumeMul: 0.95, beta: 0.95 },
  Transport:     { volMul: 1.00, driftMul: 0.90, volumeMul: 0.85, beta: 0.85 },
  Energy:        { volMul: 0.95, driftMul: 1.00, volumeMul: 1.10, beta: 0.75 },
  Beverages:     { volMul: 0.88, driftMul: 0.90, volumeMul: 0.90, beta: 0.70 },
  'Real Estate': { volMul: 1.10, driftMul: 0.92, volumeMul: 0.85, beta: 1.05 },
  Conglomerate:  { volMul: 1.00, driftMul: 1.00, volumeMul: 1.00, beta: 0.90 },
  Agriculture:   { volMul: 1.22, driftMul: 0.92, volumeMul: 1.15, beta: 1.10 },
  Manufacturing: { volMul: 1.15, driftMul: 0.88, volumeMul: 0.90, beta: 1.05 },
  Insurance:     { volMul: 0.78, driftMul: 0.88, volumeMul: 0.75, beta: 0.60 },
  Commodities:   { volMul: 1.32, driftMul: 1.12, volumeMul: 1.30, beta: 1.30 },
};

const DEFAULT_SECTOR = { volMul: 1, driftMul: 1, volumeMul: 1, beta: 1 };

function gaussian() {
  // Box-Muller transform → standard normal sample
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const NEWS_TEMPLATES = [
  { kind: 'positive', text: '{S} posts record half-year profit in Birr terms',             impact:  0.025 },
  { kind: 'positive', text: 'Analysts upgrade {S} to "Strong Buy" on AfCFTA tailwinds',    impact:  0.018 },
  { kind: 'positive', text: '{S} signs major contract with Ethiopian government',          impact:  0.022 },
  { kind: 'positive', text: '{S} expands operations into Djibouti and Kenya',              impact:  0.020 },
  { kind: 'negative', text: 'NBE opens regulatory probe into {S}',                         impact: -0.024 },
  { kind: 'negative', text: '{S} misses quarterly Birr revenue guidance',                  impact: -0.019 },
  { kind: 'negative', text: 'Foreign-currency shortage weighs on {S}',                     impact: -0.018 },
  { kind: 'negative', text: 'Insider selling spotted at {S}',                              impact: -0.014 },
  { kind: 'macro',    text: 'NBE cuts policy rate — Addis market cheers',                  impact:  0.0,  regime: 'BULL'     },
  { kind: 'macro',    text: 'ETB devaluation pressures importers',                         impact:  0.0,  regime: 'BEAR'     },
  { kind: 'macro',    text: 'Inflation print hotter than expected in Ethiopia',            impact:  0.0,  regime: 'BEAR'     },
  { kind: 'macro',    text: 'Coffee export prices surge — risk-on across Addis',           impact:  0.0,  regime: 'BULL'     },
  { kind: 'macro',    text: 'Regional security tensions inject volatility',                impact:  0.0,  regime: 'VOLATILE' },
  { kind: 'macro',    text: 'IMF disburses tranche — Birr stabilises',                     impact:  0.0,  regime: 'NEUTRAL'  },
  { kind: 'macro',    text: 'GERD reaches new generation milestone',                       impact:  0.0,  regime: 'BULL'     },
  { kind: 'macro',    text: 'Fuel subsidy cut announced — markets jittery',                impact:  0.0,  regime: 'VOLATILE' },
];

class MarketSimulator {
  constructor({ tickMs = 2500, onTick = null, onNews = null, onRegimeChange = null, onTrade = null } = {}) {
    this.tickMs = tickMs;
    this.timer = null;
    this.onTick = onTick;
    this.onNews = onNews;
    this.onRegimeChange = onRegimeChange;
    this.onTrade = onTrade;
    this.tickCount = 0;
    this.lastNewsTick = 0;
    this.marketPulse = 0;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this._tick(), this.tickMs);
    console.log(`[sim] Market simulator started — tick every ${this.tickMs}ms`);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * Apply a one-off shock to a single stock (admin can call this).
   *   strength is a fraction (e.g. 0.05 = +5% pop, -0.05 = -5% drop)
   */
  injectShock(symbol, strength) {
    const stock = listStocks().find(s => s.symbol === symbol);
    if (!stock) return false;
    stock.price = +(stock.price * (1 + strength)).toFixed(2);
    stock.change        = +(stock.price - stock.previousClose).toFixed(2);
    stock.changePercent = +(((stock.price - stock.previousClose) / stock.previousClose) * 100).toFixed(3);
    const eventVolume = Math.floor(30_000 + Math.random() * 120_000);
    stock.volume24h += eventVolume;
    this._sealCandle(stock, eventVolume);
    this._emitNews({
      symbol,
      kind: strength > 0 ? 'positive' : 'negative',
      text: `Market shock: ${symbol} ${strength > 0 ? '+' : ''}${(strength * 100).toFixed(2)}%`,
      impact: strength,
      time: Date.now(),
    });
    return true;
  }

  setRegime(regime) {
    if (!REGIMES[regime]) return false;
    setRegime(regime);
    const item = this._emitNews({ kind: 'macro', text: `Market regime -> ${regime}`, time: Date.now(), regime });
    if (this.onRegimeChange) this.onRegimeChange(regime, item);
    return true;
  }

  _tick() {
    this.tickCount++;
    const regime = REGIMES[state.marketRegime] || REGIMES.NEUTRAL;
    const updated = [];
    this.marketPulse = this.marketPulse * 0.86 + gaussian() * 0.0018;

    for (const stock of listStocks()) {
      const sector = SECTOR_BEHAVIOR[stock.sector] || DEFAULT_SECTOR;
      const z = gaussian();
      const sectorPulse = this._sectorPulse(stock.sector);
      const meanReversion = stock.open > 0 ? ((stock.open - stock.price) / stock.open) * 0.012 : 0;
      const drift = stock.drift * regime.driftBias * sector.driftMul;
      const vol   = stock.volatility * regime.volMul * sector.volMul;
      const ret   = drift + vol * z + (this.marketPulse * sector.beta) + sectorPulse + meanReversion;
      const newPrice = Math.max(0.01, +(stock.price * (1 + ret)).toFixed(2));

      stock.previousClose = stock.previousClose || stock.open;
      stock.price = newPrice;
      stock.high  = Math.max(stock.high, newPrice);
      stock.low   = Math.min(stock.low,  newPrice);
      stock.change        = +(newPrice - stock.previousClose).toFixed(2);
      stock.changePercent = +(((newPrice - stock.previousClose) / stock.previousClose) * 100).toFixed(3);

      // Volume follows realised volatility, sector activity, and headline-like bursts.
      const burstChance = state.marketRegime === 'VOLATILE' ? 0.09 : 0.04;
      const spike = Math.random() < burstChance ? Math.floor(Math.random() * 120_000 * sector.volumeMul) : 0;
      const activity = Math.floor((250 + Math.abs(ret) * 75_000) * sector.volumeMul * (1 + Math.max(0, regime.liquidityBias)));
      const candleVolume = activity + spike;
      stock.volume24h += candleVolume;
      stock.updatedAt = Date.now();

      this._sealCandle(stock, candleVolume);
      updated.push(stock);
    }

    // Random news injection ≈ once every ~12 ticks
    if (this.tickCount - this.lastNewsTick > 12 && Math.random() < 0.35) {
      this._fireRandomNews();
      this.lastNewsTick = this.tickCount;
    }

    // Random regime flip every ~150 ticks (~6 minutes at 2.5s)
    if (this.tickCount % 150 === 0) {
      const regimes = Object.keys(REGIMES);
      const next = regimes[Math.floor(Math.random() * regimes.length)];
      this.setRegime(next);
    }

    if (this.onTick) this.onTick(updated, state.marketRegime);
  }

  _sectorPulse(sector) {
    if (sector === 'Commodities' && Math.random() < 0.04) return 0.006 * (Math.random() > 0.35 ? 1 : -1);
    if (sector === 'Fintech' && Math.random() < 0.03) return 0.005 * (Math.random() > 0.45 ? 1 : -1);
    if (sector === 'Banking' && state.marketRegime === 'BEAR') return -0.0008;
    if (sector === 'Telecom' && state.marketRegime === 'BULL') return 0.0011;
    if (sector === 'Energy' && state.marketRegime === 'VOLATILE') return 0.0015 * (Math.random() > 0.5 ? 1 : -1);
    return 0;
  }

  _sealCandle(stock, volume = 0) {
    const t = Math.floor(Date.now() / 1000);
    pushCandle(stock.symbol, {
      time: t,
      open:  stock.price,
      high:  stock.price,
      low:   stock.price,
      close: stock.price,
      volume,
    });
  }

  _fireRandomNews() {
    const tmpl = NEWS_TEMPLATES[Math.floor(Math.random() * NEWS_TEMPLATES.length)];
    if (tmpl.kind === 'macro') {
      this.setRegime(tmpl.regime);
      return;
    }
    const stocks = listStocks();
    const target = stocks[Math.floor(Math.random() * stocks.length)];
    target.price = Math.max(0.01, +(target.price * (1 + tmpl.impact)).toFixed(2));
    const eventVolume = Math.floor(25_000 + Math.random() * 90_000);
    target.volume24h += eventVolume;
    this._sealCandle(target, eventVolume);
    this._emitNews({
      symbol: target.symbol,
      kind: tmpl.kind,
      text: tmpl.text.replace('{S}', target.symbol),
      impact: tmpl.impact,
      time: Date.now(),
    });
  }

  _emitNews(item) {
    const saved = pushNews(item);
    if (this.onNews) this.onNews(saved);
    return saved;
  }
}

module.exports = { MarketSimulator, REGIMES };
