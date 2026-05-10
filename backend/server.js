require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

const { connectDB } = require('./config/db');
const { bootstrapStocks } = require('./services/store');
const { MarketSimulator } = require('./services/marketSimulator');
const { LiquidityBot } = require('./services/liquidityBot');
const initWebSocket = require('./websocket/socket');
const AlertWatcher = require('./services/alertService');
const adminCtl = require('./controllers/adminController');

const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes        = require('./routes/authRoutes');
const stockRoutes       = require('./routes/stockRoutes');
const tradeRoutes       = require('./routes/tradeRoutes');
const portfolioRoutes   = require('./routes/portfolioRoutes');
const watchlistRoutes   = require('./routes/watchlistRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const adminRoutes       = require('./routes/adminRoutes');
const insightsRoutes    = require('./routes/insightsRoutes');
const proRoutes         = require('./routes/proRoutes');
const aiRoutes          = require('./routes/aiRoutes');
const portfolioHistory  = require('./services/portfolioHistory');
const { sweepAdvancedOrders } = require('./services/proFeatures');

async function bootstrap() {
  await connectDB();
  bootstrapStocks();

  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(mongoSanitize());
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  const origin = process.env.CLIENT_ORIGIN || true;
  app.use(cors({ origin, credentials: true }));

  // Per-IP rate limiter for the API surface
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', apiLimiter);

  // Tighter limiter for auth endpoints
  const authLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 30 });

  app.get('/api/health', (_req, res) => res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  app.use('/api/auth',        authLimiter, authRoutes);
  app.use('/api/stocks',      stockRoutes);
  app.use('/api/trade',       tradeRoutes);
  app.use('/api/portfolio',   portfolioRoutes);
  app.use('/api/watchlist',   watchlistRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/admin',       adminRoutes);
  app.use('/api/insights',    insightsRoutes);
  app.use('/api/pro',         proRoutes);
  app.use('/api/ai',          aiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  const server = http.createServer(app);
  const ws = initWebSocket(server);

  // Wire simulator → websocket broadcasts
  const tickMs = Number(process.env.SIM_TICK_MS) || 2500;
  const simulator = new MarketSimulator({
    tickMs,
    onNews: (item) => ws.broadcastNews(item),
    onRegimeChange: (regime, item) => ws.broadcastRegime(regime, item),
    onTick: (stocks, regime) => {
      ws.broadcastTick(stocks, regime);
      const fired = sweepAdvancedOrders();
      fired.forEach(order => ws.notifyAlert(order.userId, {
        symbol: order.symbol,
        direction: order.kind,
        price: order.triggerPrice,
        currentPrice: order.executionPrice,
        message: `${order.kind} ${order.side} triggered for ${order.quantity} ${order.symbol}`,
      }));
    },
  });
  simulator.start();
  adminCtl.bindSimulator(simulator);

  // Liquidity-bot keeps the order books filled
  const bot = new LiquidityBot({ everyMs: 1500 });
  bot.start();

  // Alert watcher
  const alerts = new AlertWatcher({ notify: ws.notifyAlert });
  alerts.start(2000);

  // Portfolio equity-curve sampler
  portfolioHistory.start();

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`\n🚀  Stock Trading Simulator API listening on http://localhost:${PORT}`);
    console.log(`   • REST  → /api/*`);
    console.log(`   • WS    → ws://localhost:${PORT}`);
    console.log(`   • Tick  → every ${tickMs}ms`);
  });

  process.on('SIGINT',  () => { simulator.stop(); bot.stop(); alerts.stop(); portfolioHistory.stop(); process.exit(0); });
  process.on('SIGTERM', () => { simulator.stop(); bot.stop(); alerts.stop(); portfolioHistory.stop(); process.exit(0); });
}

bootstrap().catch(err => {
  console.error('[boot] Fatal error:', err);
  process.exit(1);
});
