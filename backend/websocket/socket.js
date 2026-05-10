const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const engine = require('../services/engineSingleton');
const { state, getPriceMap } = require('../services/store');

const lastBroadcastPrice = new Map();

function compactTrade(trade) {
  return {
    symbol: trade.symbol,
    price: trade.price,
    quantity: trade.quantity,
    buyerId: trade.buyerId,
    sellerId: trade.sellerId,
    takerSide: trade.takerSide,
    executedAt: trade.executedAt,
    latencyMs: Math.max(0, Date.now() - (trade.executedAt || Date.now())),
  };
}

function depthPayload(symbol) {
  const stock = state.stocks.get(symbol);
  return {
    symbol,
    depth: engine.getDepth(symbol, 10),
    lastPrice: stock?.price || 0,
    ts: Date.now(),
  };
}

/**
 * Initialise Socket.IO and wire it to:
 *   - the matching engine  (push trades to interested rooms)
 *   - the market simulator (broadcast tick updates)
 *
 * Rooms used:
 *   stream:tick           → all clients subscribed to live ticks
 *   stream:trades         → public tape
 *   user:<id>             → per-user notifications (orders, alerts)
 *   stock:<SYMBOL>        → per-symbol updates (trades, depth)
 */
function initWebSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_ORIGIN || '*' },
    pingInterval: 25000,
    pingTimeout: 30000,
  });

  // Optional auth
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      socket.user = null;
      return next();
    }
    try {
      socket.user = verifyToken(token);
      socket.join(`user:${socket.user.id}`);
    } catch {
      socket.user = null;
    }
    next();
  });

  io.on('connection', (socket) => {
    socket.join('stream:tick');
    socket.join('stream:trades');

    socket.on('subscribe:stock', (symbol) => {
      if (typeof symbol === 'string') socket.join(`stock:${symbol.toUpperCase()}`);
    });
    socket.on('unsubscribe:stock', (symbol) => {
      if (typeof symbol === 'string') socket.leave(`stock:${symbol.toUpperCase()}`);
    });
  });

  // Pipe matching-engine events → sockets
  engine.on('trade', (trade) => {
    const compact = compactTrade(trade);
    io.to('stream:trades').emit('trade', compact);
    io.to(`stock:${trade.symbol}`).emit('stock:trade', compact);
    io.to(`stock:${trade.symbol}`).emit('orderbook:update', depthPayload(trade.symbol));
    if (trade.buyerId)  io.to(`user:${trade.buyerId}`).emit('order:fill',  { side: 'BUY',  ...compact });
    if (trade.sellerId) io.to(`user:${trade.sellerId}`).emit('order:fill', { side: 'SELL', ...compact });
  });
  engine.on('orderRested', (o) => {
    io.to(`user:${o.userId}`).emit('order:rested', o);
    io.to(`stock:${o.symbol}`).emit('orderbook:update', depthPayload(o.symbol));
  });
  engine.on('orderCancelled', (o) => {
    io.to(`user:${o.userId}`).emit('order:cancelled', o);
    io.to(`stock:${o.symbol}`).emit('orderbook:update', depthPayload(o.symbol));
  });

  /** Broadcast helpers consumed by simulator + alert-watcher. */
  return {
    io,
    broadcastTick(stocks, regime) {
      const ts = Date.now();
      // Send small payloads
      const compact = stocks.map(s => ({
        symbol: s.symbol,
        price: s.price,
        change: s.change,
        changePercent: s.changePercent,
        volume24h: s.volume24h,
        sector: s.sector,
        tickDirection: s.price > (lastBroadcastPrice.get(s.symbol) ?? s.open) ? 'up'
          : s.price < (lastBroadcastPrice.get(s.symbol) ?? s.open) ? 'down'
          : 'flat',
      }));
      stocks.forEach(s => lastBroadcastPrice.set(s.symbol, s.price));
      io.to('stream:tick').emit('tick', { regime, stocks: compact, ts });
      // Per-stock price-only stream (for chart subscribers)
      stocks.forEach(s => {
        io.to(`stock:${s.symbol}`).emit('stock:price', {
          symbol: s.symbol,
          price: s.price,
          change: s.change,
          changePercent: s.changePercent,
          ts,
        });
      });
    },
    broadcastNews(item) {
      io.emit('news', item);
    },
    broadcastRegime(regime, item = null) {
      io.emit('regime', { regime, item, ts: Date.now() });
    },
    notifyAlert(userId, alert) {
      io.to(`user:${userId}`).emit('alert', alert);
    },
  };
}

module.exports = initWebSocket;
