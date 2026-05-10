# NegadeX — DSA-Powered Stock Trading Simulator

A production-grade, full-stack stock trading simulator built around real **data structures and algorithms** — not just CRUD. NegadeX models the **Ethiopian market** end-to-end: 32 major Ethiopian listings (Commercial Bank of Ethiopia, Ethiopian Airlines, Ethio Telecom, Tele-Birr, Safaricom Ethiopia, Awash Bank, Bank of Abyssinia, Oromia Bank, Siinqee Bank, Dashen Bank, Ethiopian Insurance Corp., GERD Hydropower, BGI/Habesha breweries, MIDROC, Yirgacheffe Coffee Union and more) priced in **Ethiopian Birr (ETB)**, a heap-based order matching engine, a random-walk market simulator with NBE-flavoured macro events, hash-map portfolios with stack/queue trade history, binary-search price lookups, JWT auth, an admin console, and a polished glassmorphism UI streaming over WebSockets.

> Frontend: **React + Vite + Tailwind + TradingView Lightweight Charts + Framer Motion + Zustand**
> Backend: **Node.js + Express + MongoDB + Mongoose + Socket.IO + JWT**
> Deploy: **Vercel (frontend)** + **Railway (backend)**

---

## Table of Contents

1. [Highlights](#highlights)
2. [Screenshots](#screenshots)
3. [Architecture](#architecture)
4. [DSA Implementation Guide](#dsa-implementation-guide)
5. [Project Structure](#project-structure)
6. [Setup — Local Development](#setup--local-development)
7. [Environment Variables](#environment-variables)
8. [API Reference](#api-reference)
9. [WebSocket Events](#websocket-events)
10. [Deployment](#deployment)
11. [Security](#security)
12. [Performance](#performance)

---

## Highlights

- **Real Order-Matching Engine** — Max-heap of bids vs. min-heap of asks, price–time priority, partial fills, market & limit orders, O(log n) per match.
- **Realistic Market Simulator** — Geometric Brownian Motion with bull / bear / volatile regimes, sector-specific behaviour, randomized Ethiopian macro shocks (NBE rates, ETB devaluation, GERD news), admin-injected events.
- **Liquidity Bot** — Auto-seeds the order books so user trades always feel live.
- **Hash-Map Portfolios** — O(1) holding lookup, stack-based undo, queue-based transaction stream.
- **Binary-Search History** — Find a price at any timestamp in O(log n).
- **Heap-Based Ranking** — Top-K gainers / losers / volume / leaderboard ROI in O(n log k).
- **Real-Time Sockets** — Tick stream, trade tape, fills, alerts, news, regime changes, leaderboard updates.
- **Pro Suite (10 modules)** — Paper-trading challenges, Black-Scholes options pricer, stop-loss / take-profit, social trading feed, MA-crossover backtester, advanced analytics, news sentiment scanner, admin replay mode, mobile PWA, DSA unit tests.
- **AI Trading Coach** — In-process deterministic assistant that reads your live portfolio + the market regime and adapts its replies between **Beginner**, **Active trader** and **Senior desk**. No external LLM, no cost, no rate limits, can never error.
- **Auth & Security** — JWT, bcrypt, helmet, per-IP rate limiting, mongo sanitization, CORS pinned to a single origin, express-validator on every body.
- **Modern UI/UX** — Dark fintech theme with glassmorphism, Framer Motion route transitions, animated price flashes, TradingView Lightweight Charts, premium skeleton loaders, fully responsive mobile-first layouts.
- **Admin Console** — Suspend users, switch market regime, inject volatility shocks, replay flash-crash / bull-run scenarios.
- **In-Memory Mode** — Runs without MongoDB so you can demo on a fresh machine in under a minute. Drop in `MONGO_URI` to gain persistence.
- **PWA** — Installable on desktop and mobile via Web App Manifest + service worker.

---

## Screenshots

> Replace these placeholders after running the app locally and capturing screenshots into `docs/screenshots/`.

| Page | Preview |
|---|---|
| Landing      | `docs/screenshots/landing.png`     |
| Dashboard    | `docs/screenshots/dashboard.png`   |
| Trade        | `docs/screenshots/trade.png`       |
| Portfolio    | `docs/screenshots/portfolio.png`   |
| Leaderboard  | `docs/screenshots/leaderboard.png` |
| Admin        | `docs/screenshots/admin.png`       |

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                          React (Vite)                              │
│  Pages (Landing, Dashboard, Trade, Market, Portfolio, …)           │
│  Zustand stores  ──►  REST (axios)  ──►  Express                   │
│        ▲             Socket.IO client ◄── WebSocket                │
└────────┼───────────────────────────────────────────────────────────┘
         │  state                          │ ticks/trades/alerts
┌────────┴──────────┐    REST     ┌────────┴────────────────────────┐
│  axios services   │ ──────────► │  Express middleware             │
│  socket.js        │             │  helmet · rate-limit · sanitize │
└───────────────────┘             │  JWT auth · validators          │
                                  ├─────────────────────────────────┤
                                  │  Controllers / Routes           │
                                  ├─────────────────────────────────┤
                                  │  ALGORITHMS LAYER               │
                                  │  • heap.js                      │
                                  │  • matchingEngine.js            │
                                  │  • portfolioManager.js          │
                                  │  • ranking.js                   │
                                  │  • binarySearch.js              │
                                  ├─────────────────────────────────┤
                                  │  Services                       │
                                  │  • marketSimulator (RW + news)  │
                                  │  • liquidityBot (market maker)  │
                                  │  • alertService                 │
                                  │  • store (in-mem source)        │
                                  ├─────────────────────────────────┤
                                  │  Models (Mongoose)              │
                                  │  User, Stock, Order, Tx,        │
                                  │  Portfolio, Watchlist           │
                                  └─────────────────────────────────┘
```

Every tick (default 2.5s) the simulator evolves prices, the liquidity bot refreshes resting quotes, the matching engine processes incoming orders and emits `trade` events, and the WebSocket layer fans those events out to all connected clients.

---

## DSA Implementation Guide

| Algorithm                  | File                                       | Where it's used                                         | Complexity |
|----------------------------|--------------------------------------------|---------------------------------------------------------|------------|
| Generic Binary Heap        | `backend/algorithms/heap.js`               | Order books, ranking                                    | push/pop O(log n) |
| Order Matching Engine      | `backend/algorithms/matchingEngine.js`     | `/api/trade/order` — matches bids/asks                  | O(log n) per fill |
| Hash-Map Portfolio         | `backend/algorithms/portfolioManager.js`   | All `/api/portfolio/*` lookups                          | O(1) get/update |
| Stack (undo)               | `portfolioManager.js · tradeStack`         | `/api/trade/undo`                                       | O(1) push/pop |
| Queue (FIFO tx stream)     | `portfolioManager.js · Queue`              | Internal transaction processing                         | O(1) enqueue/dequeue |
| Top-K (Min-Heap selection) | `backend/algorithms/ranking.js`            | Trending stocks, leaderboard                            | O(n log k) |
| Binary Search              | `backend/algorithms/binarySearch.js`       | `/api/stocks/:symbol/lookup?time=…`, range queries      | O(log n) lookup, O(log n + k) range |

### Order Matching Engine

The engine maintains, **per stock symbol**, two heaps:

- **`buyBook`** — max-heap keyed by `(price desc, time asc)` so the highest bid (oldest first) is always at the top.
- **`sellBook`** — min-heap keyed by `(price asc, time asc)` so the lowest ask (oldest first) is at the top.

When a new order arrives:

```
while (taker not fully filled AND opposing book has crossing prices):
    pop best opposing order
    fill = min(remaining_taker, remaining_maker)
    create trade @ maker.price (price-time priority)
    if maker fully filled → already popped
    else → push remainder back
if remaining taker > 0 AND order is LIMIT → push onto own book
```

Each fill emits a `trade` event consumed by the WebSocket layer, the portfolio manager, and (if MongoDB is connected) the `Transaction` model.

### Why Heaps?

Sorting an order book on every insert would be O(n log n). Heaps give us **O(log n) per insert and O(1) peek**, making the engine fast enough to handle thousands of orders per second on a single thread.

### Portfolio Manager

Every user gets a `PortfolioManager` instance:

- `holdings: Map<symbol, {quantity, avgPrice, totalCost}>` → O(1) lookup
- `tradeStack: Array` → LIFO for **undo last trade**
- `txQueue: LinkedList` → FIFO for transaction processing
- Average cost basis is updated incrementally on every BUY:
  `newAvg = (oldAvg * oldQty + price * qty) / (oldQty + qty)`
- SELLs realise P/L against the running average and free cash.

### Binary Search

Price history is appended monotonically (sorted by `time`), so we can use textbook binary search:

```js
findClosestByTime(history, t)   // O(log n)  – nearest candle to t
rangeBetween(history, from, to) // O(log n + k) – slice in range
```

---

## Project Structure

```
.
├── backend/
│   ├── algorithms/            ← DSA layer (heap, engine, portfolio, etc.)
│   ├── config/                ← DB connection, seed universe
│   ├── controllers/           ← Route handlers
│   ├── middleware/            ← auth, validate, errorHandler
│   ├── models/                ← Mongoose schemas
│   ├── routes/                ← Express routers
│   ├── services/              ← market sim, liquidity bot, alerts, in-mem store, engine singleton
│   ├── utils/                 ← jwt, asyncHandler, ApiError, in-mem user store, seed CLI
│   ├── websocket/socket.js    ← Socket.IO bridge
│   ├── server.js              ← Application bootstrap
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── public/
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   ├── index.css
    │   ├── charts/PriceChart.jsx     ← Lightweight Charts wrapper
    │   ├── components/               ← reusable UI: PriceCell, OrderBook, TradesTape, …
    │   ├── context/AuthContext.jsx
    │   ├── hooks/useStockTicker.js
    │   ├── layouts/                  ← Navbar, AppShell
    │   ├── pages/                    ← Landing, Login, Dashboard, Trade, …
    │   ├── services/                 ← api.js, socket.js
    │   ├── store/                    ← Zustand stores
    │   └── utils/format.js
    ├── index.html
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── vite.config.js
    └── package.json
```

---

## Setup — Local Development

### Prerequisites

- Node.js **18+**
- (Optional) MongoDB **6+**.  *If you don't install MongoDB, NegadeX runs in **in-memory mode** automatically.*

### 1) Clone

```bash
git clone <repo-url> negadex && cd negadex
```

### 2) Backend

```bash
cd backend
cp .env.example .env       # edit MONGO_URI / JWT_SECRET
npm install
npm run seed               # optional, only if MongoDB is connected
npm run dev                # nodemon, restart on change
```

The API starts on `http://localhost:5000` and immediately begins ticking:

```
🚀  Stock Trading Simulator API listening on http://localhost:5000
   • REST  → /api/*
   • WS    → ws://localhost:5000
   • Tick  → every 2500ms
[bot] Liquidity bot started
[sim] Market simulator started — tick every 2500ms
```

### 3) Frontend

```bash
cd ../frontend
cp .env.example .env       # set VITE_API_URL=http://localhost:5000
npm install
npm run dev                # http://localhost:5173
```

That's it — open `http://localhost:5173`, register a new account and you'll receive **1,000,000 Br** in virtual cash on the Ethiopian exchange.

### Default admin (when DB is connected)

After running `npm run seed`:
- email: `admin@market.io`
- password: `Admin@12345`

---

## Environment Variables

### `backend/.env`

| Key | Default | Description |
|---|---|---|
| `PORT`              | `5000`                              | API port |
| `NODE_ENV`          | `development`                       | `development` / `production` |
| `MONGO_URI`         | *(empty)*                           | MongoDB connection string. Leave empty for in-memory mode. |
| `JWT_SECRET`        | *required*                          | HMAC secret for JWT signing |
| `JWT_EXPIRES_IN`    | `7d`                                | Token lifetime |
| `CLIENT_ORIGIN`     | `http://localhost:5173`             | CORS allow-list |
| `SIM_TICK_MS`       | `2500`                              | Market simulator tick interval |
| `STARTING_BALANCE`  | `1000000`                           | Virtual capital (Birr) given on signup |
| `ADMIN_EMAIL`       | `admin@market.io`                   | Seeded admin account |
| `ADMIN_PASSWORD`    | `Admin@12345`                       | Seeded admin password |

### `frontend/.env`

| Key | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:5000` | Where to find the backend (REST + Socket.IO). Leave empty in dev to use the Vite proxy. |

---

## API Reference

All endpoints are prefixed with `/api`. Authenticated endpoints require `Authorization: Bearer <jwt>`.

### Auth

| Method | Path                | Auth | Body / Query                        |
|--------|---------------------|------|-------------------------------------|
| POST   | `/auth/register`    | –    | `{ name, email, password }`         |
| POST   | `/auth/login`       | –    | `{ email, password }`               |
| GET    | `/auth/me`          | ✅   | –                                   |
| PUT    | `/auth/me`          | ✅   | `{ name?, bio?, avatar? }`          |

### Stocks

| Method | Path                         | Notes                                                |
|--------|------------------------------|------------------------------------------------------|
| GET    | `/stocks`                    | `?search=&sector=&sort=&limit=&page=`                |
| GET    | `/stocks/:symbol`            |                                                      |
| GET    | `/stocks/:symbol/history`    | `?from=&to=` (unix seconds)                          |
| GET    | `/stocks/:symbol/lookup`     | `?time=<unix>` — binary-search nearest candle        |
| GET    | `/stocks/trending`           | Top gainers / losers / most-traded (heap selection)  |
| GET    | `/stocks/news`               | Recent simulated news                                |
| GET    | `/stocks/sectors`            |                                                      |
| GET    | `/stocks/summary`            | Sentiment, advancing/declining, regime               |

### Trade

| Method | Path                          | Auth | Body                                                       |
|--------|-------------------------------|------|------------------------------------------------------------|
| POST   | `/trade/order`                | ✅   | `{ symbol, side, quantity, type='MARKET'|'LIMIT', price? }` |
| DELETE | `/trade/order/:engineId`      | ✅   | Cancel a resting limit order                               |
| POST   | `/trade/undo`                 | ✅   | Pop the last trade off the stack                           |
| GET    | `/trade/orderbook/:symbol`    | –    | Aggregated depth (top 12 levels)                           |
| GET    | `/trade/recent`               | –    | Public tape (last 25 trades)                               |

### Portfolio

| Method | Path                         | Auth | Notes                                |
|--------|------------------------------|------|--------------------------------------|
| GET    | `/portfolio/me`              | ✅   | Live snapshot                        |
| GET    | `/portfolio/transactions`    | ✅   | Last 200 transactions                |
| GET    | `/portfolio/export`          | ✅   | Streams `transactions.csv`           |

### Watchlist

| Method | Path                         | Auth | Body                                  |
|--------|------------------------------|------|---------------------------------------|
| GET    | `/watchlist`                 | ✅   |                                       |
| POST   | `/watchlist/:symbol`         | ✅   |                                       |
| DELETE | `/watchlist/:symbol`         | ✅   |                                       |
| POST   | `/watchlist/alerts`          | ✅   | `{ symbol, price, direction }`        |
| DELETE | `/watchlist/alerts/:idx`     | ✅   |                                       |

### Leaderboard

| Method | Path             | Notes                              |
|--------|------------------|------------------------------------|
| GET    | `/leaderboard`   | Top 50 by ROI (heap-ranked)        |

### Insights (read-only analytics)

| Method | Path                                | Auth | Notes                                      |
|--------|-------------------------------------|------|--------------------------------------------|
| GET    | `/insights/recommendations`         | ✅   | Momentum + buy-the-dip ideas               |
| GET    | `/insights/heatmap`                 | ✅   | Sector heatmap data                        |
| GET    | `/insights/equity`                  | ✅   | Sampled equity-curve series                |
| GET    | `/insights/risk`                    | ✅   | Risk profile (concentration, sectors)      |
| GET    | `/insights/achievements`            | ✅   | Unlocked badges                            |

### Pro Suite (10 advanced modules)

| Method | Path                                | Auth | Body / Query                                              |
|--------|-------------------------------------|------|-----------------------------------------------------------|
| GET    | `/pro/challenges`                   | ✅   | Paper-trading challenges + progress                        |
| GET    | `/pro/options/quote`                | –    | `?symbol=&strike=&days=&type=CALL|PUT` Black-Scholes pricer |
| GET    | `/pro/advanced-orders`              | ✅   | Stop-loss / take-profit list                               |
| POST   | `/pro/advanced-orders`              | ✅   | `{ symbol, side, kind:'STOP_LOSS'|'TAKE_PROFIT', triggerPrice, quantity }` |
| GET    | `/pro/social`                       | ✅   | Social trading feed                                        |
| POST   | `/pro/social`                       | ✅   | `{ text, symbol?, sentiment? }`                            |
| POST   | `/pro/social/:id/like`              | ✅   |                                                            |
| GET    | `/pro/backtest`                     | ✅   | `?symbol=&fast=&slow=&capital=` MA-crossover backtest      |
| GET    | `/pro/analytics`                    | ✅   | Sharpe-like, win rate, drawdown, concentration             |
| GET    | `/pro/sentiment`                    | –    | News-sentiment scanner across symbols                      |

### AI Coach (in-process, deterministic — no external LLM)

| Method | Path                  | Auth | Body / Query                                |
|--------|-----------------------|------|---------------------------------------------|
| GET    | `/ai/suggestions`     | ✅   | Level-aware prompt chips                    |
| POST   | `/ai/chat`            | ✅   | `{ message, history?: [{role, text}] }`     |

The coach reads the live portfolio + market state and adapts its replies between
**Beginner mode**, **Active trader** and **Senior desk** depending on trade
history, position count and ROI.

### Admin (role=admin only)

| Method | Path                         | Body                                        |
|--------|------------------------------|---------------------------------------------|
| GET    | `/admin/stats`               |                                             |
| GET    | `/admin/users`               |                                             |
| PUT    | `/admin/users/:id/suspend`   | `{ suspended: bool }`                       |
| PUT    | `/admin/stocks/:symbol`      | `{ volatility?, drift?, isSuspended?, price? }` |
| POST   | `/admin/shock`               | `{ symbol, strength }` (e.g. ±0.05)         |
| POST   | `/admin/regime`              | `{ regime: 'BULL'|'BEAR'|'NEUTRAL'|'VOLATILE' }` |
| POST   | `/admin/replay`              | `{ sequence: 'FLASH_CRASH'|'BULL_RUN' }`    |

---

## WebSocket Events

Connect to `ws://<host>` with optional `auth.token` header.

### Server → Client

| Event             | Payload                                                                 |
|-------------------|-------------------------------------------------------------------------|
| `tick`            | `{ regime, ts, stocks: [{symbol, price, change, changePercent, volume24h}] }` |
| `trade`           | `{ symbol, price, quantity, takerSide, executedAt, ... }`               |
| `news`            | `{ symbol?, kind, text, impact?, time }`                                |
| `stock:price`     | `{ symbol, price, change, changePercent, ts }` (per-symbol room)        |
| `stock:trade`     | trade record (per-symbol room)                                          |
| `order:fill`      | trade record (per-user room)                                            |
| `order:rested`    | resting order info (per-user)                                           |
| `order:cancelled` | order info (per-user)                                                   |
| `alert`           | `{ symbol, price, direction, currentPrice }` (per-user)                 |

### Client → Server

| Event                | Payload         |
|----------------------|-----------------|
| `subscribe:stock`    | `'CBE'`         |
| `unsubscribe:stock`  | `'CBE'`         |

---

## Deployment

### Backend → Railway / Render / Fly.io

1. Push the repo to GitHub.
2. Create a new web service from the repo with **Root Directory** = `backend`.
3. Build command: `npm install`   Start command: `node server.js`
4. Add the following environment variables (copy `backend/.env.example` first):
   - `NODE_ENV=production`
   - `JWT_SECRET=<32+ random chars — generate with `openssl rand -hex 32`>`
   - `MONGO_URI=<your MongoDB Atlas connection string>` (or leave empty for in-memory)
   - `CLIENT_ORIGIN=https://<your-vercel-app>.vercel.app`
   - `STARTING_BALANCE=1000000`
   - `SIM_TICK_MS=2500`
5. Deploy and note the public HTTPS URL — you'll use it as `VITE_API_URL`.

> WebSockets: NegadeX uses Socket.IO. Railway, Render and Fly.io all support
> WebSockets out of the box. On serverless platforms (Vercel, Cloudflare Workers)
> you'll lose live ticks — keep the API on a long-running container host.

### Frontend → Vercel

1. **New Project** → import the repo.
2. Set the **Root Directory** to `frontend`.
3. Framework preset: **Vite**.   Build: `npm run build`   Output: `dist`.
4. Add env var `VITE_API_URL=https://<your-backend-host>` (no trailing slash).
5. Deploy.
6. **Important:** add the resulting Vercel URL to the backend's `CLIENT_ORIGIN`
   env var, then redeploy the backend so CORS accepts the new origin.

### Pre-deploy checklist

- [ ] `JWT_SECRET` replaced with a strong random value
- [ ] `CLIENT_ORIGIN` pinned to your real frontend URL (not `*`)
- [ ] `MONGO_URI` set if you want persistence between restarts
- [ ] `STARTING_BALANCE` confirmed in Birr
- [ ] Frontend `VITE_API_URL` points at the production backend
- [ ] `npm run build` in `frontend/` produces `dist/` without warnings
- [ ] `node --test tests/*.test.js` in `backend/` passes

---

## Security

- **Authentication** — JWT signed with HS256, 7-day expiry, stored client-side in `localStorage`.
- **Passwords** — bcrypt hashed with a 10-round salt; never returned by the API.
- **Helmet** — sensible default security headers.
- **Rate limiting** — 200 req/min per IP for `/api/*`, 30 req / 10 min for `/api/auth/*`.
- **Input validation** — `express-validator` on every body.
- **Mongo sanitization** — `express-mongo-sanitize` strips `$` operators from inputs.
- **CORS** — pinned to `CLIENT_ORIGIN`.
- **Compression** — gzip via the `compression` middleware.
- **Pre-flight checks** — Trade orders verify cash / share availability before being submitted to the engine.

---

## Performance

- **Heaps** for matching and ranking — sub-linear in the worst case.
- **Hash-map** portfolios — O(1) holding lookups even with thousands of symbols.
- **Binary search** for time-series — instant historical lookups.
- **Lazy-loaded routes** on the frontend — each page is a separate bundle.
- **Selective Zustand subscriptions** — components only re-render when their slice of state changes.
- **Compact tick payloads** — only `{symbol, price, change, changePercent, volume24h}` is broadcast.
- **In-memory store** for hot data; MongoDB used as durable persistence.
- **Liquidity-bot tick** runs every 1.5s and refreshes only ~6 random books at a time.

---

## Roadmap Ideas

- ✅ AI-style stock recommendations (trend × volume scoring)
- ✅ Pro Suite (10 advanced modules)
- ✅ AI Trading Coach (level-aware, in-process)
- ✅ Mobile PWA install
- ⏳ Margin trading & short selling
- ⏳ Server-rendered candlestick OHLC aggregation per minute / hour / day
- ⏳ Multi-region MongoDB cluster
- ⏳ E2E tests with Playwright

---

## License

MIT — feel free to use this as a portfolio piece. A backlink in the credits is appreciated but not required.
