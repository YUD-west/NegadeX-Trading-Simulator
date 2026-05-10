const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const engine = require('../services/engineSingleton');
const {
  getStock, getOrCreatePortfolio, recordTrade,
} = require('../services/store');
const { isDbReady } = require('../config/db');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');

/**
 * Place an order.
 * Body: { symbol, side, quantity, type='MARKET'|'LIMIT', price? }
 *
 * Flow:
 *   1. Validate stock exists.
 *   2. Pre-flight portfolio checks (cash for BUY, shares for SELL).
 *   3. Submit to MatchingEngine.
 *   4. For each fill, mutate the user's PortfolioManager and persist a Transaction.
 *   5. Persist resting Order if any quantity remains.
 */
const placeOrder = asyncHandler(async (req, res) => {
  const { symbol, side, quantity, type = 'MARKET', price } = req.body;
  const stock = getStock(symbol);
  if (!stock) throw new ApiError(404, 'Unknown stock');
  if (!['BUY', 'SELL'].includes(side)) throw new ApiError(400, 'Invalid side');
  const qty = Math.floor(Number(quantity));
  if (!qty || qty <= 0) throw new ApiError(400, 'Quantity must be > 0');
  if (type === 'LIMIT' && (!price || price <= 0)) {
    throw new ApiError(400, 'Limit orders require a positive price');
  }

  const portfolio = getOrCreatePortfolio(req.user._id || req.user.id, req.user.startingBalance);

  // Pre-flight balance / position checks (worst case)
  if (side === 'BUY') {
    const worstPx = type === 'LIMIT' ? price : stock.price * 1.05;
    if (portfolio.cash < worstPx * qty) {
      throw new ApiError(400, 'Insufficient funds');
    }
  } else {
    const h = portfolio.getHolding(stock.symbol);
    if (h.quantity < qty) throw new ApiError(400, 'Not enough shares to sell');
  }

  // Submit to matching engine
  const { order, fills } = engine.submit({
    userId: req.user._id || req.user.id,
    symbol: stock.symbol,
    side,
    type,
    quantity: qty,
    price: type === 'LIMIT' ? Number(price) : undefined,
    referencePrice: stock.price,
  });

  // Apply fills to portfolio + persist
  const txDocs = [];
  for (const f of fills) {
    try {
      let result;
      if (side === 'BUY') {
        result = portfolio.applyBuy(stock.symbol, f.quantity, f.price);
      } else {
        result = portfolio.applySell(stock.symbol, f.quantity, f.price);
      }
      recordTrade({
        symbol: stock.symbol,
        price: f.price,
        quantity: f.quantity,
        side,
        userId: String(req.user._id || req.user.id),
        executedAt: f.executedAt,
      });
      // Persist if DB connected
      if (isDbReady()) {
        const tx = await Transaction.create({
          user: req.user._id,
          symbol: stock.symbol,
          side,
          type,
          quantity: f.quantity,
          price: f.price,
          total: f.price * f.quantity,
          realisedPnL: result.tx.realisedPnL || 0,
          status: 'EXECUTED',
        });
        txDocs.push(tx);
      }
    } catch (err) {
      // Should be rare due to pre-flight checks
      console.error('[trade] fill apply failed:', err.message);
    }
  }

  // Persist resting order if any
  let restingOrder = null;
  if (isDbReady() && order.filled < order.quantity && order.type === 'LIMIT') {
    restingOrder = await Order.create({
      user: req.user._id,
      engineId: order.id,
      symbol: stock.symbol,
      side, type,
      quantity: order.quantity,
      filled: order.filled,
      price: order.price,
      status: order.status,
    });
  }

  res.status(201).json({
    success: true,
    order: {
      id: order.id,
      symbol: stock.symbol,
      side,
      type,
      quantity: order.quantity,
      filled: order.filled,
      price: type === 'MARKET' ? null : order.price,
      status: order.status,
    },
    fills,
    portfolio: portfolio.snapshot(globalPriceMap()),
    transactionIds: txDocs.map(t => t._id),
    restingOrderId: restingOrder?._id || null,
  });
});

const orderBook = asyncHandler(async (req, res) => {
  const symbol = String(req.params.symbol).toUpperCase();
  const stock = getStock(symbol);
  if (!stock) throw new ApiError(404, 'Stock not found');
  const depth = engine.getDepth(symbol, 12);
  res.json({ success: true, symbol, depth, lastPrice: stock.price });
});

const recentTrades = asyncHandler(async (_req, res) => {
  const { state } = require('../services/store');
  res.json({ success: true, trades: state.tradesFeed.slice(0, 25) });
});

const undoLast = asyncHandler(async (req, res) => {
  const portfolio = getOrCreatePortfolio(req.user._id || req.user.id, req.user.startingBalance);
  const undone = portfolio.undoLastTrade();
  if (!undone) throw new ApiError(400, 'No trades to undo');
  res.json({ success: true, undone, portfolio: portfolio.snapshot(globalPriceMap()) });
});

const cancelOrder = asyncHandler(async (req, res) => {
  const { engineId } = req.params;
  const removed = engine.cancel(engineId);
  if (!removed) throw new ApiError(404, 'Order not found or already filled');
  if (isDbReady()) {
    await Order.findOneAndUpdate({ engineId }, { status: 'CANCELLED' });
  }
  res.json({ success: true, order: removed });
});

function globalPriceMap() {
  const { listStocks } = require('../services/store');
  const m = new Map();
  for (const s of listStocks()) m.set(s.symbol, s.price);
  return m;
}

module.exports = { placeOrder, orderBook, recentTrades, undoLast, cancelOrder };
