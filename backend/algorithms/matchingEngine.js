const { Heap } = require('./heap');

/**
 * ────────────────────────────────────────────────────────────────────────────
 *  ORDER MATCHING ENGINE  (price-time priority)
 * ────────────────────────────────────────────────────────────────────────────
 *
 *  Per stock symbol, we maintain TWO heaps:
 *    • buyBook  → MAX-HEAP keyed by (price desc, timestamp asc)
 *    • sellBook → MIN-HEAP keyed by (price asc, timestamp asc)
 *
 *  When a new order arrives we attempt to match it against the opposite book
 *  until either:
 *      – the new order is fully filled
 *      – the best opposing price no longer crosses
 *
 *  Each match runs in O(log n) per fill (heap pop + push of remainder).
 *
 *  The engine emits TRADE events that callers can subscribe to in order to
 *  persist transactions, update portfolios and broadcast over WebSockets.
 * ────────────────────────────────────────────────────────────────────────────
 */

const { EventEmitter } = require('events');

const SIDE = { BUY: 'BUY', SELL: 'SELL' };
const TYPE = { LIMIT: 'LIMIT', MARKET: 'MARKET' };

let _idSeq = 1;
const nextOrderId = () => `O${Date.now().toString(36)}${(_idSeq++).toString(36)}`;

class OrderBook {
  constructor(symbol) {
    this.symbol = symbol;

    // Max-heap on price (BUY = highest bid first), tie-break = oldest first
    this.buyBook = new Heap((a, b) => {
      if (b.price !== a.price) return b.price - a.price;
      return a.createdAt - b.createdAt;
    });

    // Min-heap on price (SELL = lowest ask first), tie-break = oldest first
    this.sellBook = new Heap((a, b) => {
      if (a.price !== b.price) return a.price - b.price;
      return a.createdAt - b.createdAt;
    });
  }

  bestBid() { return this.buyBook.peek();  }
  bestAsk() { return this.sellBook.peek(); }

  depth(levels = 10) {
    // Return aggregated price levels for visualization
    const aggregate = (heap, sortFn) => {
      const map = new Map();
      heap.toArray().forEach(o => {
        const remaining = o.quantity - o.filled;
        if (remaining <= 0) return;
        map.set(o.price, (map.get(o.price) || 0) + remaining);
      });
      return [...map.entries()]
        .map(([price, qty]) => ({ price, quantity: qty }))
        .sort(sortFn)
        .slice(0, levels);
    };

    return {
      bids: aggregate(this.buyBook,  (a, b) => b.price - a.price),
      asks: aggregate(this.sellBook, (a, b) => a.price - b.price),
    };
  }
}

class MatchingEngine extends EventEmitter {
  constructor() {
    super();
    /** @type {Map<string, OrderBook>} */
    this.books = new Map();
  }

  _getBook(symbol) {
    if (!this.books.has(symbol)) this.books.set(symbol, new OrderBook(symbol));
    return this.books.get(symbol);
  }

  getDepth(symbol, levels = 10) {
    return this._getBook(symbol).depth(levels);
  }

  /**
   * Submit a new order.
   * @returns {{order, fills: Array}}
   */
  submit({
    userId,
    symbol,
    side,
    quantity,
    price,
    type = TYPE.LIMIT,
    referencePrice = null,
  }) {
    if (!Object.values(SIDE).includes(side)) throw new Error('Invalid side');
    if (quantity <= 0) throw new Error('Quantity must be > 0');
    if (type === TYPE.LIMIT && (!price || price <= 0)) {
      throw new Error('Limit orders require a positive price');
    }

    const order = {
      id: nextOrderId(),
      userId: String(userId),
      symbol,
      side,
      type,
      // For market orders we use a sentinel price so they always cross.
      price: type === TYPE.MARKET
        ? (side === SIDE.BUY ? Number.POSITIVE_INFINITY : 0)
        : price,
      quantity,
      filled: 0,
      createdAt: Date.now(),
      status: 'OPEN',
    };

    const fills = this._match(order, referencePrice);
    this._restOrder(order);

    return { order, fills };
  }

  /**
   * Greedy match against the opposite book.
   * Returns an array of fill records.
   */
  _match(taker, referencePrice) {
    const book = this._getBook(taker.symbol);
    const oppBook = taker.side === SIDE.BUY ? book.sellBook : book.buyBook;
    const fills = [];

    while (taker.filled < taker.quantity && !oppBook.isEmpty()) {
      const maker = oppBook.peek();

      // Price-cross check
      const crosses = taker.side === SIDE.BUY
        ? taker.price >= maker.price
        : taker.price <= maker.price;
      if (!crosses) break;

      const remainingTaker = taker.quantity - taker.filled;
      const remainingMaker = maker.quantity - maker.filled;
      const tradeQty       = Math.min(remainingTaker, remainingMaker);

      // Trade price = maker's resting price (price-time priority)
      const tradePrice = maker.type === TYPE.MARKET
        ? (referencePrice || taker.price)
        : maker.price;

      taker.filled += tradeQty;
      maker.filled += tradeQty;

      const trade = {
        symbol: taker.symbol,
        price: tradePrice,
        quantity: tradeQty,
        buyOrderId:  taker.side === SIDE.BUY  ? taker.id : maker.id,
        sellOrderId: taker.side === SIDE.SELL ? taker.id : maker.id,
        buyerId:     taker.side === SIDE.BUY  ? taker.userId : maker.userId,
        sellerId:    taker.side === SIDE.SELL ? taker.userId : maker.userId,
        executedAt: Date.now(),
        takerSide: taker.side,
      };
      fills.push(trade);
      this.emit('trade', trade);

      if (maker.filled >= maker.quantity) {
        oppBook.pop();
        maker.status = 'FILLED';
        this.emit('orderFilled', maker);
      }
    }

    if (taker.filled >= taker.quantity) {
      taker.status = 'FILLED';
      this.emit('orderFilled', taker);
    } else if (taker.filled > 0) {
      taker.status = 'PARTIAL';
    }

    return fills;
  }

  /** Push remainder of an order onto its book if it's a resting LIMIT. */
  _restOrder(order) {
    if (order.filled >= order.quantity) return;
    if (order.type === TYPE.MARKET) {
      // Unfilled market orders are cancelled (no liquidity).
      order.status = order.filled > 0 ? 'PARTIAL_CANCELLED' : 'CANCELLED';
      this.emit('orderCancelled', order);
      return;
    }
    const book = this._getBook(order.symbol);
    const target = order.side === SIDE.BUY ? book.buyBook : book.sellBook;
    target.push(order);
    this.emit('orderRested', order);
  }

  cancel(orderId) {
    for (const book of this.books.values()) {
      const fromBuy  = book.buyBook.remove(o => o.id === orderId);
      const fromSell = book.sellBook.remove(o => o.id === orderId);
      const removed = fromBuy || fromSell;
      if (removed) {
        removed.status = 'CANCELLED';
        this.emit('orderCancelled', removed);
        return removed;
      }
    }
    return null;
  }

  /** Drop all resting orders for a user (e.g. on logout). */
  cancelAllForUser(userId) {
    const out = [];
    for (const book of this.books.values()) {
      let removed;
      do {
        removed = book.buyBook.remove(o => o.userId === String(userId));
        if (removed) out.push(removed);
      } while (removed);
      do {
        removed = book.sellBook.remove(o => o.userId === String(userId));
        if (removed) out.push(removed);
      } while (removed);
    }
    out.forEach(o => { o.status = 'CANCELLED'; this.emit('orderCancelled', o); });
    return out;
  }
}

module.exports = { MatchingEngine, SIDE, TYPE };
