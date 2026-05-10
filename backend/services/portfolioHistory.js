const { state, getPriceMap } = require('./store');

/**
 * Periodically samples each user's portfolio total value and
 * stores a ring buffer in memory. Powers the equity-curve chart
 * on the Portfolio page.
 *
 *   sampleEveryMs : default 5000  (every 5s)
 *   maxPoints     : default 720   (≈ 1h at 5s)
 */
class PortfolioHistory {
  constructor({ sampleEveryMs = 5000, maxPoints = 720 } = {}) {
    this.sampleEveryMs = sampleEveryMs;
    this.maxPoints = maxPoints;
    this.timer = null;
    /** @type {Map<userId, Array<{time, value}>>} */
    this.series = new Map();
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this._sample(), this.sampleEveryMs);
    console.log('[history] Portfolio sampler started');
  }
  stop() { clearInterval(this.timer); }

  _sample() {
    const priceMap = getPriceMap();
    const t = Math.floor(Date.now() / 1000);
    for (const [userId, portfolio] of state.portfolios.entries()) {
      const value = +portfolio.totalValue(priceMap).toFixed(2);
      const arr = this.series.get(userId) || [];
      arr.push({ time: t, value });
      if (arr.length > this.maxPoints) arr.shift();
      this.series.set(userId, arr);
    }
  }

  get(userId) {
    return this.series.get(String(userId)) || [];
  }
}

const singleton = new PortfolioHistory();
module.exports = singleton;
