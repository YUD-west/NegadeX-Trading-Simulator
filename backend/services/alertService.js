const { state, getStock } = require('./store');
const { isDbReady } = require('../config/db');
const Watchlist = require('../models/Watchlist');

/**
 * Watches all user alerts and fires once when crossed.
 * For DB-mode users we mark `triggered = true` via mongoose,
 * for in-memory users we mutate the array element directly.
 */
class AlertWatcher {
  constructor({ notify }) {
    this.notify = notify;        // (userId, alert) => void
  }
  start(intervalMs = 2000) {
    this.timer = setInterval(() => this._sweep(), intervalMs);
  }
  stop() { clearInterval(this.timer); }

  async _sweep() {
    // In-memory alerts
    for (const [userId, alerts] of state.alerts.entries()) {
      for (const a of alerts) {
        if (a.triggered) continue;
        const stock = getStock(a.symbol);
        if (!stock) continue;
        const crossed = a.direction === 'ABOVE' ? stock.price >= a.price : stock.price <= a.price;
        if (crossed) {
          a.triggered = true;
          this.notify(userId, { ...a, currentPrice: stock.price });
        }
      }
    }
    // DB alerts
    if (isDbReady()) {
      try {
        const docs = await Watchlist.find({ 'alerts.triggered': false });
        for (const w of docs) {
          let dirty = false;
          for (const a of w.alerts) {
            if (a.triggered) continue;
            const stock = getStock(a.symbol);
            if (!stock) continue;
            const crossed = a.direction === 'ABOVE' ? stock.price >= a.price : stock.price <= a.price;
            if (crossed) {
              a.triggered = true;
              dirty = true;
              this.notify(String(w.user), { ...a.toObject(), currentPrice: stock.price });
            }
          }
          if (dirty) await w.save();
        }
      } catch (e) {
        // ignore — DB might disconnect
      }
    }
  }
}

module.exports = AlertWatcher;
