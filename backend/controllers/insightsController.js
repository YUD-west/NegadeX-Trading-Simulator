const asyncHandler = require('../utils/asyncHandler');
const { recommendations } = require('../services/recommendationEngine');
const { listStocks, getPriceMap } = require('../services/store');
const { state } = require('../services/store');
const portfolioHistory = require('../services/portfolioHistory');
const { summary: badgeSummary } = require('../services/achievements');

const recos = asyncHandler(async (_req, res) => {
  res.json({ success: true, ...recommendations({ k: 5 }) });
});

const heatmap = asyncHandler(async (_req, res) => {
  // Group stocks by sector with totals for treemap rendering
  const grouped = {};
  for (const s of listStocks()) {
    grouped[s.sector] = grouped[s.sector] || { sector: s.sector, totalCap: 0, items: [] };
    grouped[s.sector].totalCap += s.marketCap;
    grouped[s.sector].items.push({
      symbol: s.symbol,
      name: s.name,
      price: s.price,
      changePercent: s.changePercent,
      marketCap: s.marketCap,
      volume24h: s.volume24h,
    });
  }
  // Sort items inside each sector by market cap desc
  Object.values(grouped).forEach(g => {
    g.items.sort((a, b) => b.marketCap - a.marketCap);
  });
  const sectors = Object.values(grouped).sort((a, b) => b.totalCap - a.totalCap);
  res.json({ success: true, sectors });
});

const equityCurve = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  res.json({ success: true, points: portfolioHistory.get(userId) });
});

const portfolioRisk = asyncHandler(async (req, res) => {
  const userId = String(req.user._id || req.user.id);
  const portfolio = state.portfolios.get(userId);
  if (!portfolio) return res.json({ success: true, risk: null });
  const priceMap = getPriceMap();
  const sectorExposure = new Map();
  let positionsValue = 0;

  for (const [sym, h] of portfolio.holdings.entries()) {
    const stock = state.stocks.get(sym);
    if (!stock) continue;
    const v = h.quantity * (priceMap.get(sym) || h.avgPrice);
    positionsValue += v;
    sectorExposure.set(stock.sector, (sectorExposure.get(stock.sector) || 0) + v);
  }

  const sectors = [...sectorExposure.entries()].map(([sector, value]) => ({
    sector,
    value,
    weight: positionsValue > 0 ? value / positionsValue : 0,
  })).sort((a, b) => b.value - a.value);

  // Herfindahl-Hirschman concentration (0 = perfectly diversified, 1 = single sector)
  const hhi = sectors.reduce((s, x) => s + x.weight ** 2, 0);
  const diversification = +(100 * (1 - hhi)).toFixed(1);
  const concentrationScore = sectors[0]?.weight || 0;
  const cashRatio = portfolio.cash / Math.max(portfolio.cash + positionsValue, 1);

  let rating = 'Balanced';
  if (concentrationScore > 0.7) rating = 'Concentrated';
  else if (cashRatio > 0.85)    rating = 'Idle';
  else if (sectors.length >= 5 && diversification > 70) rating = 'Well diversified';
  else if (sectors.length <= 2 && positionsValue > 0)   rating = 'Narrow';

  res.json({
    success: true,
    risk: {
      diversification,
      concentrationScore: +(concentrationScore * 100).toFixed(1),
      cashRatio: +(cashRatio * 100).toFixed(1),
      sectors,
      rating,
      symbols: portfolio.holdings.size,
    },
  });
});

const achievements = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  res.json({ success: true, ...badgeSummary(userId) });
});

module.exports = { recos, heatmap, equityCurve, portfolioRisk, achievements };
