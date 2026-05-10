const { state, getPriceMap } = require('./store');

/**
 * Lightweight achievements engine. Evaluated on demand (cheap) by
 * walking the user's portfolio + trade stack — both already O(1)/O(n)
 * in-memory structures so this stays fast.
 *
 * Each badge has:
 *   id, name, icon (emoji), description, tier ('bronze'|'silver'|'gold')
 *
 * Add new badges by appending to BADGES — `check(portfolio, ctx)` returns true to award.
 */

const BADGES = [
  {
    id: 'first-trade', name: 'First Steps', icon: '🚀', tier: 'bronze',
    description: 'Place your first trade.',
    check: (p) => p.tradeStack.length >= 1,
  },
  {
    id: 'sector-explorer', name: 'Sector Explorer', icon: '🧭', tier: 'silver',
    description: 'Hold positions in 4 different sectors at once.',
    check: (p, ctx) => {
      const sectors = new Set();
      for (const sym of p.holdings.keys()) {
        const stock = ctx.stocks.get(sym);
        if (stock) sectors.add(stock.sector);
      }
      return sectors.size >= 4;
    },
  },
  {
    id: 'diamond-hands', name: 'Diamond Hands', icon: '💎', tier: 'silver',
    description: 'Hold a position with +20% unrealized P/L.',
    check: (p, ctx) => {
      for (const [sym, h] of p.holdings.entries()) {
        const px = ctx.priceMap.get(sym) || 0;
        const cost = h.avgPrice * h.quantity;
        if (cost > 0) {
          const pl = (px * h.quantity - cost) / cost;
          if (pl >= 0.20) return true;
        }
      }
      return false;
    },
  },
  {
    id: 'paper-bull', name: 'Paper Bull', icon: '🐂', tier: 'gold',
    description: 'Grow your portfolio by 10% from starting balance.',
    check: (p, ctx) => p.totalValue(ctx.priceMap) >= p.startingBalance * 1.10,
  },
  {
    id: 'rainmaker', name: 'Rainmaker', icon: '☔', tier: 'gold',
    description: 'Realize $1,000 in profits.',
    check: (p) => p.realizedPnL >= 1000,
  },
  {
    id: 'high-roller', name: 'High Roller', icon: '🎰', tier: 'silver',
    description: 'Place 10 trades.',
    check: (p) => p.tradeStack.length >= 10,
  },
  {
    id: 'centurion', name: 'Centurion', icon: '🏛️', tier: 'gold',
    description: 'Place 100 trades.',
    check: (p) => p.tradeStack.length >= 100,
  },
  {
    id: 'sniper', name: 'Sniper', icon: '🎯', tier: 'silver',
    description: 'Win 5 sells in a row (positive realised P/L).',
    check: (p) => {
      const sells = p.tradeStack.filter(t => t.type === 'SELL').slice(-5);
      return sells.length === 5 && sells.every(t => (t.realisedPnL || 0) > 0);
    },
  },
  {
    id: 'diversifier', name: 'Diversifier', icon: '🌐', tier: 'silver',
    description: 'Hold 8 or more distinct symbols.',
    check: (p) => p.holdings.size >= 8,
  },
  {
    id: 'undo-master', name: 'Undo Master', icon: '↩️', tier: 'bronze',
    description: 'Use the stack-based undo at least once.',
    check: (p) => p.tradeStack.some(t => t.undone) || (p._undoCount > 0),
  },
];

/** Evaluate all badges for a single user. */
function evaluate(userId) {
  const portfolio = state.portfolios.get(String(userId));
  if (!portfolio) return [];
  const ctx = { stocks: state.stocks, priceMap: getPriceMap() };
  return BADGES.map(b => ({
    id: b.id,
    name: b.name,
    icon: b.icon,
    tier: b.tier,
    description: b.description,
    earned: !!b.check(portfolio, ctx),
  }));
}

function summary(userId) {
  const list = evaluate(userId);
  const earned = list.filter(b => b.earned).length;
  return { total: list.length, earned, badges: list };
}

module.exports = { evaluate, summary, BADGES };
