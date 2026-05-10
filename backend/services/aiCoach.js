/**
 * ────────────────────────────────────────────────────────────────────────────
 *  NEGADEX AI COACH
 * ────────────────────────────────────────────────────────────────────────────
 *
 *  A 100 % deterministic, in-process trading coach.  It never calls an
 *  external LLM, so it cannot fail with rate limits, timeouts or API errors.
 *  Every response is generated from:
 *
 *    1. A curated knowledge base of trading & DSA concepts.
 *    2. The user's live portfolio snapshot.
 *    3. The current Ethiopian market state (prices, regime, news).
 *    4. A keyword-scored intent classifier with safe fall-backs.
 *
 *  The same engine adapts depth & vocabulary to the trader's level
 *  (junior / intermediate / senior) so beginners get plain-language
 *  guidance and pros get nuanced, metric-rich answers.
 * ────────────────────────────────────────────────────────────────────────────
 */

const store = require('./store');

/* ───────────────────────────── helpers ───────────────────────────────── */

const fmtMoney = (n, digits = 2) => {
  if (n === null || n === undefined || Number.isNaN(n)) return '— Br';
  return Number(n).toLocaleString('en-ET', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }) + ' Br';
};
const fmtPct = (n, digits = 2) => {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const s = n > 0 ? '+' : '';
  return `${s}${Number(n).toFixed(digits)}%`;
};
const fmtCompact = (n) => {
  if (!n && n !== 0) return '—';
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (a >= 1e3) return (n / 1e3).toFixed(2) + 'K';
  return Number(n).toFixed(0);
};
const clean = (str) => String(str || '').toLowerCase().replace(/\s+/g, ' ').trim();
const includesAny = (txt, words) => words.some(w => txt.includes(w));

/* ────────────────────────── knowledge base ───────────────────────────── */
/** Each entry: keys = canonical id; .keywords trigger lookup; .junior, .senior
 *  blurbs let us tailor depth.  All replies are pure text (no emojis). */
const KB = {
  /* ---------- DSA ---------- */
  heap: {
    label: 'Heap-based matching engine',
    keywords: ['heap', 'matching engine', 'priority queue'],
    junior:
      'A heap is a tree-shaped data structure that always keeps the best item on top. NegadeX uses a max-heap for buy orders (highest price first) and a min-heap for sell orders (lowest price first), so trades match in the right order automatically.',
    senior:
      'NegadeX runs price-time priority on two binary heaps. Bids live in a max-heap keyed by (price, -timestamp); asks in a min-heap keyed by (price, timestamp). Push/pop are O(log n) per fill, and the engine resolves crosses iteratively until the spread re-opens. The same pattern is used to rank top-K leaderboard scores.',
  },
  hashmap: {
    label: 'Hash-map portfolio',
    keywords: ['hash map', 'hashmap', 'hash-map', 'dictionary', 'o(1)', 'lookup'],
    junior:
      'A hash map lets us look up any holding by its symbol instantly — like jumping straight to a name in a phone book. That is why your portfolio screen is fast no matter how many positions you hold.',
    senior:
      'Holdings, watchlists, alerts and per-user portfolio managers are all keyed by a JavaScript Map for O(1) average insertion and lookup. This avoids quadratic scans when the simulator broadcasts a tick to a thousand positions.',
  },
  stack: {
    label: 'Stack-based undo',
    keywords: ['stack', 'undo', 'lifo'],
    junior:
      'A stack works like a pile of plates — last in, first out. Every trade you place is pushed on top, and the Undo button pops the most recent one off, refunding cash or restoring shares.',
    senior:
      'Each PortfolioManager keeps a tradeStack array. undoLastTrade() pops the head, reverses cash + holding + realised P/L deltas, and decrements the holding map; pure O(1) and idempotent against snapshots.',
  },
  queue: {
    label: 'Queue transaction processing',
    keywords: ['queue', 'fifo', 'transaction'],
    junior:
      'A queue is first-in, first-out — like a line at a bank. Your transactions enter at the back and leave at the front, so the history never shuffles out of order.',
    senior:
      'Transactions enqueue into a singly-linked Queue (O(1) enqueue/dequeue, no array reflow). The same FIFO contract powers admin replay mode, which dequeues a recorded sequence at fixed cadence to reproduce a market scenario.',
  },
  binarysearch: {
    label: 'Binary-search history',
    keywords: ['binary search', 'history', 'lookup price', 'historical'],
    junior:
      'To find the price at a specific time we cut the candle list in half over and over until we land on the right one — that is binary search, and it is much faster than scanning every candle.',
    senior:
      'priceHistory is a time-sorted candle array per symbol; lookup uses the standard left-bisect to land on O(log n). It backs the /stocks/:s/lookup endpoint and the backtest engine when stepping the moving-average crossover.',
  },
  dsa: {
    label: 'DSA inside NegadeX',
    keywords: ['dsa', 'data structure', 'algorithm', 'algorithms'],
    junior:
      'NegadeX is built on classic computer-science tools you have probably seen in class: heaps for matching, hash maps for portfolios, stacks for undo, queues for transactions, and binary search for history. Every screen shows one of them in action.',
    senior:
      'Six data structures power the simulator: max/min heaps (matching), Map (portfolios + watchlists), Array as stack (undo), Linked Queue (transactions), sorted candle array + bisect (history) and a partial-sort top-K heap for the leaderboard. All are unit-tested under tests/dsa.test.js.',
  },

  /* ---------- TRADING CONCEPTS ---------- */
  marketorder: {
    label: 'Market order',
    keywords: ['market order', 'market buy', 'buy at market'],
    junior:
      'A market order says "fill me right now at whatever price the book has". It is fast but you might pay a little more (or sell a little lower) than the last printed price.',
    senior:
      'A market order walks the opposite side of the book until your quantity is filled, paying the spread plus any depth-impact. Use it when execution certainty matters more than price; otherwise prefer a marketable limit.',
  },
  limitorder: {
    label: 'Limit order',
    keywords: ['limit order', 'limit buy', 'limit sell'],
    junior:
      'A limit order says "only fill me at this price or better". You might wait, but you control exactly what you pay or receive.',
    senior:
      'Limit orders rest in the heap-based book until the opposite side crosses your price. They cap slippage but accept queue risk and partial fills. NegadeX matches resting orders by price-time priority.',
  },
  stoploss: {
    label: 'Stop-loss',
    keywords: ['stop loss', 'stop-loss', 'stoploss', 'cut losses'],
    junior:
      'A stop-loss is a safety net. You pick a price below where you bought; if the stock drops to it, the system sells automatically so you do not bleed further.',
    senior:
      'Stop-loss orders trigger a market sell once the last price prints at or below the threshold. In NegadeX they live in the Pro Suite advanced-orders sweeper, which fires on each tick. Pair with position-sizing so any single stop costs ≤1-2 % of equity.',
  },
  takeprofit: {
    label: 'Take-profit',
    keywords: ['take profit', 'take-profit', 'tp', 'lock in'],
    junior:
      'A take-profit is the opposite of a stop-loss. You pre-decide a price above your buy where you are happy to lock the gain, and the system sells for you.',
    senior:
      'Take-profits trigger a market sell at or above the threshold. Combine with stop-loss to define an asymmetric R:R; reject trades whose target is less than 1.5x your stop distance.',
  },
  options: {
    label: 'Options',
    keywords: ['option', 'options', 'call', 'put', 'strike', 'iv'],
    junior:
      'An option is a contract that lets you buy (call) or sell (put) a stock at a chosen price within a window of time. NegadeX has a simulator inside the Pro Suite where you can test option pricing safely.',
    senior:
      'The Pro Suite quotes European calls/puts via a Black-Scholes-style approximation: spot, strike, time-to-expiry, implied vol and a risk-free rate yield delta, gamma, theta and vega. Use it to learn convexity behaviour without writing real premium.',
  },
  spread: {
    label: 'Bid-ask spread',
    keywords: ['spread', 'bid ask', 'bid-ask'],
    junior:
      'The spread is the gap between the best price someone wants to buy at (the bid) and the best price someone wants to sell at (the ask). A tight spread means a healthier market.',
    senior:
      'Spread = best ask − best bid. Spreads widen with low liquidity, regime shocks or asymmetric news. The liquidity bot keeps NegadeX books posted at ±20-40 bps for major symbols so you always have something to trade against.',
  },
  slippage: {
    label: 'Slippage',
    keywords: ['slippage'],
    junior:
      'Slippage is when your fill price ends up worse than the price you expected because the market moved or your order ate into the book.',
    senior:
      'Slippage decomposes into spread cost and impact cost. NegadeX matches against a depth-limited book so large markets walk through several price levels — visible as the depth bars on the order-book widget.',
  },

  /* ---------- PORTFOLIO + RISK ---------- */
  diversification: {
    label: 'Diversification',
    keywords: ['diversif', 'spread risk', 'concentration'],
    junior:
      'Diversification means not putting all your Birr into one stock. If one company falls, the others can absorb the blow. Aim for 4-6 holdings across different sectors as a starter.',
    senior:
      'Reduce idiosyncratic risk by holding ≥6 names with low pairwise correlation across banking, telecom, aviation and energy. NegadeX flags concentration when any one sector exceeds 40 % of equity on the Risk Radar.',
  },
  sharpe: {
    label: 'Sharpe ratio',
    keywords: ['sharpe', 'risk adjusted'],
    junior:
      'Sharpe ratio answers "for the risk I am taking, am I being paid enough?" Higher is better; above 1 is solid, above 2 is excellent.',
    senior:
      'Sharpe = (mean return − risk-free rate) / stdev(returns), annualised. NegadeX computes it on the rolling 5-second equity curve. Watch for inflated Sharpe on short windows — always sanity-check with max drawdown.',
  },
  drawdown: {
    label: 'Drawdown',
    keywords: ['drawdown', 'max dd'],
    junior:
      'A drawdown is the drop from your highest portfolio value down to your lowest before you recover. The smaller the worst drawdown, the smoother the ride.',
    senior:
      'Maximum drawdown = max over time of (peak − trough) / peak. Use it together with Sharpe — a 2.0 Sharpe with 30 % MDD is far worse than a 1.5 Sharpe with 8 % MDD for capital preservation.',
  },
  positionsizing: {
    label: 'Position sizing',
    keywords: ['position size', 'sizing', 'how much to buy'],
    junior:
      'Position sizing is deciding how many shares to buy. A safe rule: never put more than 5-10 % of your cash in one trade until you find your edge.',
    senior:
      'Risk a fixed fraction (typically 0.5-2 %) of equity per stop. Shares = (risk_$ / stop_distance). Combine with Kelly-fraction halving to avoid over-betting your live equity curve.',
  },
  meanreversion: {
    label: 'Mean reversion',
    keywords: ['mean reversion', 'oversold', 'overbought', 'rsi'],
    junior:
      'Mean reversion is the idea that prices that move too far one way often snap back toward the average. NegadeX has a "buy the dip" recommender that looks for this pattern.',
    senior:
      'In a NEUTRAL or VOLATILE regime, NegadeX simulator applies a soft pull toward each symbol\'s 20-tick mean (drift component). The Pro Suite recommender ranks dips by z-score against this baseline.',
  },
  riskmanagement: {
    label: 'Risk management',
    keywords: ['risk management', 'risk', 'manage risk'],
    junior:
      'Risk management is making sure no single bad trade can take you out of the game. Use stops, size small, and never invest cash you would not be comfortable losing.',
    senior:
      'Three pillars: (1) per-trade stop with fixed-fractional sizing, (2) portfolio diversification across uncorrelated sectors, (3) regime awareness — cut size in BEAR/VOLATILE phases. NegadeX surfaces all three on the Risk Radar.',
  },
  beta: {
    label: 'Beta',
    keywords: ['beta', 'systematic risk'],
    junior:
      'Beta tells you how jumpy a stock is compared to the overall market. Beta of 1 moves with the market; above 1 swings more, below 1 swings less.',
    senior:
      'Beta = Cov(asset, market) / Var(market). High-beta names amplify regime shifts — useful in BULL but punishing in BEAR. The simulator differentiates names by configured volatility, which approximates beta.',
  },

  /* ---------- ETHIOPIAN MARKET ---------- */
  cbe: {
    label: 'Commercial Bank of Ethiopia (CBE)',
    keywords: ['cbe', 'commercial bank of ethiopia'],
    junior:
      'CBE is the largest bank in Ethiopia and one of the most-traded names on NegadeX. Banking stocks usually move with NBE rate decisions and lending growth.',
    senior:
      'CBE is a banking proxy with a moderate volatility profile and positive long-term drift. Sensitive to NBE policy rate cuts and ETB devaluation news; correlates with AWASH and ABYSN inside the banking sector model.',
  },
  ethiopianairlines: {
    label: 'Ethiopian Airlines (ETHA)',
    keywords: ['ethiopian airlines', 'etha', 'airline'],
    junior:
      'Ethiopian Airlines is the flagship aviation name on NegadeX. Its price reacts to fuel costs, cargo revenue and global travel demand.',
    senior:
      'ETHA carries a higher volatility tag, sensitive to oil shocks (NOC inverse correlation) and global travel sentiment. Cargo-revenue news is treated as a positive shock by the simulator.',
  },
  ethtel: {
    label: 'Ethio Telecom (ETHTEL) and Tele-Birr (TBIRR)',
    keywords: ['ethio telecom', 'ethtel', 'tele-birr', 'telebirr', 'tbirr', 'telecom'],
    junior:
      'Ethio Telecom and Tele-Birr cover the telecom and digital-payments sector. They tend to move on subscriber-growth and fintech-adoption news.',
    senior:
      'Telecom names are clustered with Safaricom Ethiopia (SAFCM). Tele-Birr is treated as a fintech-adoption proxy: subscriber-milestone news triggers a positive shock with elevated volume.',
  },
  nbe: {
    label: 'National Bank of Ethiopia (NBE)',
    keywords: ['nbe', 'national bank', 'central bank', 'policy rate'],
    junior:
      'The NBE is the central bank. When it cuts rates, banks usually rally; when it hikes, banks face pressure. NegadeX simulates NBE headlines as macro shocks.',
    senior:
      'NBE rate decisions trigger sector-wide shocks across banking and adjacent sectors. The market simulator broadcasts these as news items with kind=positive/negative depending on direction.',
  },
  etb: {
    label: 'Ethiopian Birr (ETB)',
    keywords: ['etb', 'birr', 'currency', 'devaluation'],
    junior:
      'The Birr is Ethiopia\'s currency. Every price on NegadeX is in Birr, written as "1,250.00 Br" the way local banks display amounts.',
    senior:
      'All cash, P/L, holdings and analytics are denominated in ETB and formatted with the Africa/Addis_Ababa locale. Devaluation events in the news stream apply a negative shock to import-heavy industrials and energy names.',
  },

  /* ---------- PLATFORM FEATURES ---------- */
  prosuite: {
    label: 'Pro Suite',
    keywords: ['pro suite', 'prosuite', 'pro features', 'advanced'],
    junior:
      'The Pro Suite holds the advanced tools: paper-trading challenges, an options pricer, stop-loss / take-profit orders, social feed, backtests, analytics, sentiment scanner and admin replay. Open it from the navigation.',
    senior:
      'Pro Suite consolidates ten institutional modules. Of immediate interest: the MA-crossover backtester (10/30 default), the advanced-orders sweeper for STOP_LOSS / TAKE_PROFIT, and the sector sentiment scanner driven by the live news stream.',
  },
  leaderboard: {
    label: 'Leaderboard',
    keywords: ['leaderboard', 'ranking', 'top traders'],
    junior:
      'The Leaderboard ranks every trader by total portfolio value. Climb by combining smart entries with disciplined risk management.',
    senior:
      'Rankings recompute via a top-K heap selection over each user\'s lastValue snapshot — O(n log k) instead of full sorts. The Prep handler also computes pnlPct for tie-breaking.',
  },
  achievements: {
    label: 'Achievements',
    keywords: ['achievement', 'badge', 'reward'],
    junior:
      'Achievements unlock as you trade — your first BUY, your first SELL, your first sector diversification, an Undo Master tier and many more. Find them on your portfolio page.',
    senior:
      'The achievements service inspects PortfolioManager state on each snapshot pull: trade counts, distinct sectors, undo invocations, realised P/L tiers. New badges are pushed to the notification bell in real time.',
  },

  /* ---------- META ---------- */
  whatcanyoudo: {
    label: 'What I can help with',
    keywords: ['what can you do', 'help me', 'how do you work', 'what do you know'],
    junior:
      'I can explain trading concepts in plain words, walk you through the platform, look at your portfolio and suggest your next move. Try asking "what is a stop-loss?" or "how am I doing?"',
    senior:
      'I read your live portfolio, the order book and the simulator regime, then answer with metric-rich analysis. Sample prompts: "evaluate my risk", "should I rotate sectors?", "explain heap matching", "analyse CBE".',
  },
};

const KB_LIST = Object.entries(KB).map(([id, v]) => ({ id, ...v }));

/* ───────────────────────── intent detection ──────────────────────────── */

const INTENTS = [
  {
    name: 'greeting',
    test: (t) => /^(hi|hello|hey|salam|selam|hola|yo)\b/.test(t),
  },
  {
    name: 'thanks',
    test: (t) => /\b(thanks|thank you|thx|appreciate|kudos)\b/.test(t),
  },
  {
    name: 'help_overview',
    test: (t) =>
      includesAny(t, ['what can you do', 'who are you', 'how do you work', 'what is this', 'help me']),
  },
  {
    name: 'portfolio_status',
    test: (t) =>
      includesAny(t, [
        'my portfolio', 'how am i doing', 'my balance', 'my holdings', 'my pnl',
        'my p/l', 'my profit', 'show portfolio', 'portfolio status',
      ]),
  },
  {
    name: 'risk_check',
    test: (t) =>
      includesAny(t, ['am i diversified', 'my risk', 'risk profile', 'concentration', 'am i safe', 'risk check']),
  },
  {
    name: 'recommend_buy',
    test: (t) =>
      includesAny(t, ['what should i buy', 'best stock', 'recommend', 'recommendation', 'top pick', 'what to buy', 'buy idea']),
  },
  {
    name: 'recommend_sell',
    test: (t) => includesAny(t, ['what should i sell', 'should i sell', 'what to sell', 'cut losers']),
  },
  {
    name: 'market_overview',
    test: (t) =>
      includesAny(t, ['how is the market', 'market overview', 'market regime', 'market today', 'what is happening']),
  },
  {
    name: 'compare_two',
    test: (t) => /\b(compare|vs|versus)\b/.test(t),
  },
  {
    name: 'how_to',
    test: (t) => /\b(how do i|how to|where do i|where can i)\b/.test(t),
  },
  {
    name: 'thanks_bye',
    test: (t) => /\b(bye|goodbye|see you|cya)\b/.test(t),
  },
];

/* ──────────────────────── level classification ───────────────────────── */

function detectLevel(snapshot, txCount) {
  if (!snapshot) return 'junior';
  const { positions = [], totalValue = 0, startingBalance = 0, pnlPercent = 0 } = snapshot;
  const distinctSectors = new Set(positions.map(p => p.sector).filter(Boolean)).size;
  const cashRatio = totalValue ? snapshot.cash / totalValue : 1;

  if (txCount >= 30 && positions.length >= 4 && pnlPercent > 0 && cashRatio < 0.6) return 'senior';
  if (txCount >= 5 && (positions.length >= 2 || distinctSectors >= 2)) return 'intermediate';
  return 'junior';
}

const LEVEL_INTRO = {
  junior:       'Beginner mode',
  intermediate: 'Active trader',
  senior:       'Senior desk',
};

/* ───────────────────── text → symbol resolution ──────────────────────── */

function extractSymbol(text, stocks, lastSymbol) {
  if (!text) return null;
  const upper = text.toUpperCase();
  // Direct ticker match (3-6 char tickers)
  const tickers = [...stocks.keys()];
  for (const t of tickers) {
    const re = new RegExp(`\\b${t}\\b`);
    if (re.test(upper)) return t;
  }
  // Company-name partial match
  const lower = text.toLowerCase();
  for (const s of stocks.values()) {
    if (!s.name) continue;
    const firstWord = s.name.split(' ')[0].toLowerCase();
    if (firstWord.length >= 4 && lower.includes(firstWord)) return s.symbol;
  }
  // Pronoun fallback ("it", "that one") -> last symbol from history
  if (/\b(it|that one|same one|this stock)\b/.test(lower)) return lastSymbol || null;
  return null;
}

/* ───────────────────── concept lookup (KB hit) ───────────────────────── */

function lookupConcept(text) {
  const lower = clean(text);
  let best = null;
  let bestScore = 0;
  for (const entry of KB_LIST) {
    let score = 0;
    for (const k of entry.keywords) {
      if (lower.includes(k)) score += k.length;       // longer keyword = stronger match
    }
    if (score > bestScore) { bestScore = score; best = entry; }
  }
  // Require at least 4 chars of keyword overlap to avoid spurious hits
  if (bestScore >= 4) return best;
  return null;
}

/* ───────────────────── builders for personalised replies ─────────────── */

function buildPortfolioStatus(snapshot, level) {
  if (!snapshot) {
    return {
      reply:
        'I cannot read a portfolio for you yet. Place your first trade from the Trade page and I will analyse it on your next message.',
      actions: [{ label: 'Open market', kind: 'link', to: '/market' }],
    };
  }
  const { cash, totalValue, pnl, pnlPercent, positions = [], realizedPnL = 0 } = snapshot;
  const winners = positions.filter(p => p.unrealizedPnL > 0);
  const losers  = positions.filter(p => p.unrealizedPnL < 0);
  const topWinner = [...winners].sort((a, b) => b.unrealizedPnL - a.unrealizedPnL)[0];
  const topLoser  = [...losers].sort((a, b) => a.unrealizedPnL - b.unrealizedPnL)[0];
  const cashRatio = totalValue ? (cash / totalValue) * 100 : 100;

  const lines = [
    `Total equity ${fmtMoney(totalValue)} (cash ${fmtMoney(cash)}, ${cashRatio.toFixed(0)} % free).`,
    `Open P/L ${fmtMoney(pnl)} (${fmtPct(pnlPercent)})  ·  realised ${fmtMoney(realizedPnL)}.`,
    `${positions.length} position${positions.length === 1 ? '' : 's'}  ·  ${winners.length} green, ${losers.length} red.`,
  ];
  if (topWinner) lines.push(`Best mover: ${topWinner.symbol} ${fmtPct(topWinner.unrealizedPnLPercent)}.`);
  if (topLoser)  lines.push(`Watch:      ${topLoser.symbol} ${fmtPct(topLoser.unrealizedPnLPercent)}.`);

  // Coaching nudge per level
  if (level === 'junior') {
    lines.push('');
    lines.push('Coach tip: aim for at least 3 positions in different sectors before you scale up size.');
  } else if (level === 'intermediate') {
    lines.push('');
    lines.push('Coach tip: protect winners with take-profits at +8 % to +12 % and cap any loser at -5 %.');
  } else {
    lines.push('');
    lines.push('Coach tip: rotate beta with the regime — trim high-vol names if the simulator flips to BEAR.');
  }

  const actions = [
    { label: 'Open portfolio', kind: 'link', to: '/portfolio' },
    { label: 'See risk radar',  kind: 'link', to: '/pro' },
  ];
  if (topLoser) actions.push({ label: `Trade ${topLoser.symbol}`, kind: 'link', to: `/trade/${topLoser.symbol}` });

  return { reply: lines.join('\n'), actions };
}

function buildRiskCheck(snapshot, level) {
  if (!snapshot || snapshot.positions?.length === 0) {
    return {
      reply:
        'No risk to evaluate yet — your portfolio is all cash. Open one or two starter positions across different sectors and ask me again.',
      actions: [{ label: 'Browse market', kind: 'link', to: '/market' }],
    };
  }
  const { positions, totalValue, cash } = snapshot;
  const sectorMap = new Map();
  for (const p of positions) {
    const sec = p.sector || 'Other';
    sectorMap.set(sec, (sectorMap.get(sec) || 0) + p.value);
  }
  const sectorCount = sectorMap.size;
  const top = [...sectorMap.entries()].sort((a, b) => b[1] - a[1])[0];
  const topSectorShare = top ? (top[1] / Math.max(1, totalValue - cash)) * 100 : 0;
  const cashRatio = (cash / totalValue) * 100;

  const verdict =
    sectorCount >= 4 && topSectorShare < 40 ? 'BALANCED' :
    sectorCount >= 2 && topSectorShare < 60 ? 'CONCENTRATED' :
    'HEAVILY CONCENTRATED';

  const lines = [
    `Risk verdict: ${verdict}.`,
    `Sectors held: ${sectorCount}.   Cash buffer: ${cashRatio.toFixed(0)} %.`,
    top ? `Largest cluster: ${top[0]} at ${topSectorShare.toFixed(0)} % of invested capital.` : '',
  ].filter(Boolean);

  if (level === 'junior') {
    lines.push('');
    lines.push('Coach tip: a healthy starter portfolio holds 3-5 sectors with no sector above 40 % of equity.');
  } else if (level === 'intermediate') {
    lines.push('');
    lines.push('Coach tip: trim any single name above 20 % of equity, and any single sector above 40 %.');
  } else {
    lines.push('');
    lines.push('Coach tip: blend sectors with low pairwise correlation and keep a 10-15 % dry-powder reserve.');
  }

  return {
    reply: lines.join('\n'),
    actions: [
      { label: 'Open Pro Suite', kind: 'link', to: '/pro' },
      { label: 'Open heatmap',   kind: 'link', to: '/heatmap' },
    ],
  };
}

function buildBuyIdeas(level) {
  const stocks = [...store.state.stocks.values()];
  if (!stocks.length) {
    return { reply: 'Market data is loading. Try again in a couple of seconds.' };
  }
  // Junior  -> low volatility, positive drift  (safer first picks)
  // Intermediate -> moderate change, decent volume
  // Senior  -> top dip-buy candidates by recent decline + sector spread
  let candidates;
  if (level === 'junior') {
    candidates = [...stocks]
      .filter(s => s.volatility < 0.025 && s.drift >= 0)
      .sort((a, b) => (b.drift - a.drift))
      .slice(0, 3);
  } else if (level === 'intermediate') {
    candidates = [...stocks]
      .sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0))
      .slice(0, 8)
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 3);
  } else {
    candidates = [...stocks]
      .filter(s => s.changePercent < -1)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 3);
    if (candidates.length < 3) {
      candidates = [...stocks]
        .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
        .slice(0, 3);
    }
  }
  const headline =
    level === 'junior'      ? 'Three steady starter ideas (low volatility, healthy drift):'
  : level === 'intermediate'? 'Three high-conviction movers from today\'s tape:'
  :                            'Three contrarian dip candidates worth a look:';
  const lines = [headline, ''];
  for (const c of candidates) {
    lines.push(`• ${c.symbol} (${c.sector || 'mixed'})  ${fmtMoney(c.price)}  ${fmtPct(c.changePercent)}`);
  }
  lines.push('');
  lines.push('These are not financial advice — NegadeX is a simulator. Always pair entries with a stop-loss.');

  const actions = candidates.slice(0, 3).map(c => ({
    label: `Trade ${c.symbol}`, kind: 'link', to: `/trade/${c.symbol}`,
  }));
  return { reply: lines.join('\n'), actions };
}

function buildSellIdeas(snapshot) {
  if (!snapshot || !snapshot.positions?.length) {
    return { reply: 'You hold no positions yet — nothing to sell. Want me to suggest something to buy instead? Just ask.' };
  }
  const losers = snapshot.positions.filter(p => p.unrealizedPnLPercent < -5).sort((a, b) => a.unrealizedPnLPercent - b.unrealizedPnLPercent);
  const winners = snapshot.positions.filter(p => p.unrealizedPnLPercent > 8).sort((a, b) => b.unrealizedPnLPercent - a.unrealizedPnLPercent);
  const lines = [];
  if (losers.length) {
    lines.push('Names that hit your -5 % cut-loss line:');
    losers.slice(0, 3).forEach(l => lines.push(`• ${l.symbol}  ${fmtPct(l.unrealizedPnLPercent)}  →  trim or set a stop`));
  }
  if (winners.length) {
    if (lines.length) lines.push('');
    lines.push('Winners worth taking partial profit on:');
    winners.slice(0, 3).forEach(w => lines.push(`• ${w.symbol}  ${fmtPct(w.unrealizedPnLPercent)}  →  scale out 1/3 to lock gains`));
  }
  if (!lines.length) {
    return { reply: 'No screaming sells right now. Every position is within ±5 % of cost — keep your discipline and let the thesis play out.' };
  }
  return {
    reply: lines.join('\n'),
    actions: [{ label: 'Open portfolio', kind: 'link', to: '/portfolio' }],
  };
}

function buildMarketOverview() {
  const stocks = [...store.state.stocks.values()];
  const regime = store.state.marketRegime || 'NEUTRAL';
  const gainers = stocks.filter(s => s.changePercent > 0).length;
  const decliners = stocks.filter(s => s.changePercent < 0).length;
  const avg = stocks.reduce((s, x) => s + (x.changePercent || 0), 0) / Math.max(1, stocks.length);
  const top = [...stocks].sort((a, b) => b.changePercent - a.changePercent)[0];
  const bottom = [...stocks].sort((a, b) => a.changePercent - b.changePercent)[0];

  const tone =
    regime === 'BULL'    ? 'Risk-on. Banks and telecom usually lead in this regime.' :
    regime === 'BEAR'    ? 'Risk-off. Tighten stops and avoid adding to high-beta names.' :
    regime === 'VOLATILE'? 'Two-sided action. Smaller size and wider stops.' :
                           'Quiet drift. Good window to position for the next regime shift.';

  const lines = [
    `Regime: ${regime}.   ${tone}`,
    `Breadth: ${gainers} up, ${decliners} down  ·  average move ${fmtPct(avg)}.`,
    top    ? `Strongest: ${top.symbol} ${fmtPct(top.changePercent)} (${top.sector || 'mixed'}).` : '',
    bottom ? `Weakest:   ${bottom.symbol} ${fmtPct(bottom.changePercent)} (${bottom.sector || 'mixed'}).` : '',
  ].filter(Boolean);

  return {
    reply: lines.join('\n'),
    actions: [
      { label: 'Open heatmap', kind: 'link', to: '/heatmap' },
      { label: 'Open market',  kind: 'link', to: '/market' },
    ],
  };
}

function buildStockAnalysis(symbol, snapshot, level) {
  const s = store.getStock(symbol);
  if (!s) return null;
  const holding = snapshot?.positions?.find(p => p.symbol === symbol);
  const tone =
    s.changePercent > 2  ? 'strong up move'  :
    s.changePercent > 0  ? 'mild green'      :
    s.changePercent > -2 ? 'mild red'        :
                           'sharp drop';
  const lines = [
    `${s.symbol} — ${s.name || s.symbol}`,
    `Last ${fmtMoney(s.price)}  ·  ${fmtPct(s.changePercent)}  ·  ${tone}.`,
    `Sector ${s.sector || '—'}  ·  vol24h ${fmtCompact(s.volume24h)}  ·  vol score ${(s.volatility * 100).toFixed(1)} %.`,
  ];
  if (holding) {
    lines.push('');
    lines.push(`You hold ${holding.quantity} share${holding.quantity === 1 ? '' : 's'} at avg ${fmtMoney(holding.avgPrice)}  →  open P/L ${fmtMoney(holding.unrealizedPnL)} (${fmtPct(holding.unrealizedPnLPercent)}).`);
  }
  lines.push('');
  if (level === 'junior') {
    lines.push(`Plain-words view: ${s.changePercent >= 0 ? 'today this name is up — wait for a small dip before adding.' : 'today this name is down — could be a discount, but use a small starter size and a stop just below the day low.'}`);
  } else if (level === 'intermediate') {
    lines.push('Plan idea: scale in 1/3 here, 1/3 on a 2 % retrace, 1/3 on confirmation. Stop 4-5 % below entry, target ≥1.5x risk.');
  } else {
    lines.push('Senior read: size against vol score; tighter stops on high-vol names. Watch the order-book imbalance widget for short-term flow.');
  }
  return {
    reply: lines.join('\n'),
    actions: [
      { label: `Trade ${s.symbol}`, kind: 'link', to: `/trade/${s.symbol}` },
      { label: 'Compare names',     kind: 'link', to: '/compare' },
    ],
  };
}

function buildHowTo(text) {
  const t = clean(text);
  if (includesAny(t, ['set a stop', 'stop loss', 'stop-loss'])) {
    return {
      reply: 'Open the Pro Suite tab and pick "Stop / TP". Choose the symbol, side (BUY or SELL), trigger price and quantity. The advanced-orders sweeper checks each tick and fires a market order when your trigger is crossed.',
      actions: [{ label: 'Open Pro Suite', kind: 'link', to: '/pro' }],
    };
  }
  if (includesAny(t, ['undo', 'revert'])) {
    return {
      reply: 'Every trade is pushed onto a stack. On the Trade page click "Undo last trade" — the system pops the last entry and refunds cash or restores shares.',
      actions: [{ label: 'Open trade page', kind: 'link', to: '/trade' }],
    };
  }
  if (includesAny(t, ['watchlist', 'follow stock'])) {
    return {
      reply: 'Click the star icon next to any symbol on the Market page. Watchlists live in your account and drive the alert system on the bell icon.',
      actions: [{ label: 'Open market', kind: 'link', to: '/market' }],
    };
  }
  if (includesAny(t, ['install', 'pwa', 'mobile app', 'phone'])) {
    return {
      reply: 'NegadeX ships as a Progressive Web App. In Chrome / Edge use "Install app" from the address bar; on iOS Safari use Share → Add to Home Screen.',
    };
  }
  return null; // fall through to fallback
}

function buildCompare(text) {
  const stocks = store.state.stocks;
  const tickers = [...stocks.keys()];
  const found = [];
  const upper = text.toUpperCase();
  for (const t of tickers) {
    if (new RegExp(`\\b${t}\\b`).test(upper) && !found.includes(t)) found.push(t);
    if (found.length >= 2) break;
  }
  if (found.length < 2) {
    return {
      reply: 'Tell me which two symbols to compare, e.g. "compare CBE and AWASH". I can also open the Compare page for you.',
      actions: [{ label: 'Open compare', kind: 'link', to: '/compare' }],
    };
  }
  const [aSym, bSym] = found;
  const a = stocks.get(aSym);
  const b = stocks.get(bSym);
  const winner = a.changePercent >= b.changePercent ? a : b;
  return {
    reply:
      `${a.symbol}  ${fmtMoney(a.price)}  ${fmtPct(a.changePercent)}  (vol ${fmtCompact(a.volume24h)})\n` +
      `${b.symbol}  ${fmtMoney(b.price)}  ${fmtPct(b.changePercent)}  (vol ${fmtCompact(b.volume24h)})\n\n` +
      `Today's winner on % move: ${winner.symbol}.`,
    actions: [{ label: `Open compare`, kind: 'link', to: `/compare?a=${aSym}&b=${bSym}` }],
  };
}

/* ─────────────────────────── main entry point ────────────────────────── */

function suggestionsForLevel(level) {
  if (level === 'junior') {
    return [
      'How am I doing?',
      'What is a stop-loss?',
      'Recommend a starter stock',
      'How does the matching engine work?',
    ];
  }
  if (level === 'intermediate') {
    return [
      'Evaluate my risk',
      'Should I sell anything?',
      'Best mover today',
      'Explain Sharpe ratio',
    ];
  }
  return [
    'Sector rotation idea',
    'Compare CBE and AWASH',
    'Analyse ETHA',
    'Heap matching internals',
  ];
}

function pickIntent(text) {
  for (const i of INTENTS) {
    if (i.test(text)) return i.name;
  }
  return null;
}

/**
 * Main response builder.  Always returns a structured object — never throws.
 *
 * @param {object}   opts
 * @param {string}   opts.message    raw user input
 * @param {object}   opts.user       user document (id, name)
 * @param {Array}    opts.history    [{ role:'user'|'assistant', text }]
 * @returns {{reply:string, intent:string, level:string, actions:Array, related:Array}}
 */
function respond({ message, user, history = [] }) {
  // Defensive cleanup ────────────────────────────────────────────────────
  let text = String(message || '').slice(0, 1000);
  if (!text.trim()) {
    return {
      reply: 'I am here. Ask me anything — about your portfolio, the market, or how NegadeX works under the hood.',
      intent: 'empty', level: 'junior', actions: [], related: suggestionsForLevel('junior'),
    };
  }

  // Snapshot context ─────────────────────────────────────────────────────
  let snapshot = null;
  let txCount = 0;
  try {
    if (user?.id || user?._id) {
      const pm = store.getOrCreatePortfolio(user.id || user._id);
      snapshot = pm.snapshot(store.getPriceMap());
      txCount = pm.tradeStack?.length || 0;
      // Decorate snapshot with sector
      snapshot.positions = snapshot.positions.map(p => {
        const meta = store.getStock(p.symbol);
        return { ...p, sector: meta?.sector };
      });
    }
  } catch { snapshot = null; }

  const level = detectLevel(snapshot, txCount);
  const lower = clean(text);

  // Pull the most recent symbol mentioned in history (for "it" / "that one")
  let lastSymbol = null;
  for (let i = history.length - 1; i >= 0; i--) {
    const sym = extractSymbol(history[i]?.text || '', store.state.stocks, null);
    if (sym) { lastSymbol = sym; break; }
  }

  const intent = pickIntent(lower);
  const symbol = extractSymbol(text, store.state.stocks, lastSymbol);
  let result;

  try {
    /* GREETING --------------------------------------------------------- */
    if (intent === 'greeting') {
      const name = user?.name?.split(' ')[0] || 'trader';
      result = {
        reply:
          `Hi ${name}, I am the NegadeX coach. ${LEVEL_INTRO[level]}.\n` +
          `I can read your portfolio, look at the live market, and answer trading or DSA questions in plain words.\n\n` +
          `Try: "${suggestionsForLevel(level)[0]}".`,
      };
    }
    /* THANKS ----------------------------------------------------------- */
    else if (intent === 'thanks') {
      result = { reply: 'Anytime. Ping me again when the next setup appears.' };
    }
    else if (intent === 'thanks_bye') {
      result = { reply: 'Trade safe. The market will still be here when you come back.' };
    }
    /* HELP OVERVIEW ---------------------------------------------------- */
    else if (intent === 'help_overview') {
      const k = KB.whatcanyoudo;
      result = { reply: level === 'senior' ? k.senior : k.junior };
    }
    /* PORTFOLIO -------------------------------------------------------- */
    else if (intent === 'portfolio_status') {
      result = buildPortfolioStatus(snapshot, level);
    }
    /* RISK ------------------------------------------------------------- */
    else if (intent === 'risk_check') {
      result = buildRiskCheck(snapshot, level);
    }
    /* RECOMMEND BUY ---------------------------------------------------- */
    else if (intent === 'recommend_buy') {
      result = buildBuyIdeas(level);
    }
    /* RECOMMEND SELL --------------------------------------------------- */
    else if (intent === 'recommend_sell') {
      result = buildSellIdeas(snapshot);
    }
    /* MARKET OVERVIEW -------------------------------------------------- */
    else if (intent === 'market_overview') {
      result = buildMarketOverview();
    }
    /* COMPARE ---------------------------------------------------------- */
    else if (intent === 'compare_two') {
      result = buildCompare(text);
    }
    /* HOW-TO ----------------------------------------------------------- */
    else if (intent === 'how_to') {
      result = buildHowTo(text);
    }

    /* SYMBOL-SPECIFIC ANALYSIS (if a ticker was mentioned)
       Only if no other intent already wrote a richer reply.            */
    if (!result && symbol) {
      result = buildStockAnalysis(symbol, snapshot, level);
    }
    if (!result && symbol && /\b(buy|sell|hold|should i|analy[sz]e)\b/.test(lower)) {
      result = buildStockAnalysis(symbol, snapshot, level);
    }

    /* CONCEPT (KB) ----------------------------------------------------- */
    if (!result) {
      const concept = lookupConcept(text);
      if (concept) {
        result = {
          reply: level === 'senior' ? concept.senior : concept.junior,
          actions: [],
          conceptId: concept.id,
        };
      }
    }
  } catch {
    result = null;
  }

  /* FALL-BACK -------------------------------------------------------- */
  if (!result) {
    result = {
      reply:
        'I did not catch a clear topic. Try one of these patterns:\n' +
        '• "How am I doing?"  — portfolio status\n' +
        '• "What is a heap?"  — concept explanation\n' +
        '• "Analyse CBE"      — stock analysis\n' +
        '• "Recommend a buy"  — level-aware idea',
    };
  }

  return {
    reply: result.reply,
    intent: intent || (result.conceptId ? `concept:${result.conceptId}` : symbol ? 'stock_analysis' : 'fallback'),
    level,
    actions: result.actions || [],
    related: suggestionsForLevel(level),
    symbol: symbol || null,
  };
}

module.exports = {
  respond,
  detectLevel,
  suggestionsForLevel,
  KB,
};
