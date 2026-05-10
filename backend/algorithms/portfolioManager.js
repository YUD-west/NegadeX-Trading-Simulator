/**
 * ────────────────────────────────────────────────────────────────────────────
 *  PORTFOLIO MANAGER  (in-memory)
 * ────────────────────────────────────────────────────────────────────────────
 *
 *  Each user has their own PortfolioManager instance which uses:
 *
 *    • HASH MAP   (Map<symbol, holding>)  → O(1) holding lookup / update
 *    • STACK      (Array used as LIFO)    → O(1) "undo last trade"
 *    • QUEUE      (linked list)           → O(1) FIFO transaction stream
 *
 *  Holdings are stored as { quantity, avgPrice, totalCost }.
 *  Average buy price is recalculated incrementally on every BUY:
 *      newAvg = (oldAvg * oldQty + price * qty) / (oldQty + qty)
 *  On SELL we keep the existing avgPrice (FIFO realised P/L).
 *
 *  All public methods are pure-ish: they mutate the manager and return
 *  the resulting holding so callers can reflect the change in UI.
 * ────────────────────────────────────────────────────────────────────────────
 */

class LinkedQueueNode {
  constructor(value) { this.value = value; this.next = null; }
}

class Queue {
  constructor() { this.head = null; this.tail = null; this._size = 0; }
  enqueue(v) {
    const n = new LinkedQueueNode(v);
    if (!this.head) this.head = n; else this.tail.next = n;
    this.tail = n;
    this._size++;
  }
  dequeue() {
    if (!this.head) return undefined;
    const v = this.head.value;
    this.head = this.head.next;
    if (!this.head) this.tail = null;
    this._size--;
    return v;
  }
  size() { return this._size; }
  toArray() {
    const arr = []; let n = this.head;
    while (n) { arr.push(n.value); n = n.next; }
    return arr;
  }
}

class PortfolioManager {
  constructor({ startingBalance = 100000 } = {}) {
    /** @type {Map<string, {quantity:number, avgPrice:number, totalCost:number}>} */
    this.holdings = new Map();      // HASH MAP
    /** @type {Array} */
    this.tradeStack = [];           // STACK (for undo)
    this.txQueue   = new Queue();   // FIFO transaction processing queue
    this.cash      = startingBalance;
    this.startingBalance = startingBalance;
    this.realizedPnL = 0;
  }

  // O(1) lookup
  getHolding(symbol) {
    return this.holdings.get(symbol) || { quantity: 0, avgPrice: 0, totalCost: 0 };
  }

  /**
   * Apply a BUY trade — updates cash + holding (running average price).
   */
  applyBuy(symbol, quantity, price) {
    const cost = quantity * price;
    if (cost > this.cash) {
      throw new Error('Insufficient funds');
    }
    const cur = this.getHolding(symbol);
    const newQty = cur.quantity + quantity;
    const newCost = cur.totalCost + cost;
    const newAvg = newCost / newQty;
    const updated = { quantity: newQty, avgPrice: newAvg, totalCost: newCost };
    this.holdings.set(symbol, updated);
    this.cash -= cost;

    const tx = { type: 'BUY', symbol, quantity, price, cost, timestamp: Date.now() };
    this.tradeStack.push(tx);
    this.txQueue.enqueue(tx);
    return { holding: updated, tx };
  }

  /**
   * Apply a SELL trade — reduces holding, frees cash, books realised P/L.
   */
  applySell(symbol, quantity, price) {
    const cur = this.getHolding(symbol);
    if (cur.quantity < quantity) {
      throw new Error('Not enough shares');
    }
    const proceeds = quantity * price;
    const costBasis = cur.avgPrice * quantity;
    const realised  = proceeds - costBasis;

    const newQty = cur.quantity - quantity;
    const newCost = cur.totalCost - costBasis;
    const updated = newQty === 0
      ? { quantity: 0, avgPrice: 0, totalCost: 0 }
      : { quantity: newQty, avgPrice: cur.avgPrice, totalCost: newCost };

    if (newQty === 0) this.holdings.delete(symbol);
    else this.holdings.set(symbol, updated);

    this.cash += proceeds;
    this.realizedPnL += realised;

    const tx = {
      type: 'SELL', symbol, quantity, price,
      proceeds, realisedPnL: realised,
      timestamp: Date.now(),
    };
    this.tradeStack.push(tx);
    this.txQueue.enqueue(tx);
    return { holding: updated, tx };
  }

  /**
   * Undo the most recent trade (STACK pop).
   * Useful for "oops" buttons in demo / training mode.
   */
  undoLastTrade() {
    const tx = this.tradeStack.pop();
    if (!tx) return null;
    this._undoCount = (this._undoCount || 0) + 1;
    if (tx.type === 'BUY') {
      // Reverse a buy: remove qty, refund cash
      const cur = this.getHolding(tx.symbol);
      const newQty = cur.quantity - tx.quantity;
      if (newQty <= 0) this.holdings.delete(tx.symbol);
      else {
        const newCost = cur.totalCost - tx.cost;
        this.holdings.set(tx.symbol, {
          quantity: newQty,
          avgPrice: newCost / newQty,
          totalCost: newCost,
        });
      }
      this.cash += tx.cost;
    } else {
      // Reverse a sell: re-add qty at the original avg price
      const cur = this.getHolding(tx.symbol);
      const restoredQty = cur.quantity + tx.quantity;
      const restoredCost = cur.totalCost + tx.proceeds;
      this.holdings.set(tx.symbol, {
        quantity: restoredQty,
        avgPrice: restoredCost / restoredQty,
        totalCost: restoredCost,
      });
      this.cash -= tx.proceeds;
      this.realizedPnL -= tx.realisedPnL;
    }
    return { ...tx, undone: true };
  }

  /**
   * Compute total portfolio value at the given live prices.
   * priceMap: Map<symbol, currentPrice>
   */
  totalValue(priceMap) {
    let positions = 0;
    for (const [sym, h] of this.holdings.entries()) {
      const p = priceMap.get?.(sym) ?? priceMap[sym] ?? h.avgPrice;
      positions += h.quantity * p;
    }
    return positions + this.cash;
  }

  snapshot(priceMap) {
    const positions = [];
    for (const [sym, h] of this.holdings.entries()) {
      const p = priceMap.get?.(sym) ?? priceMap[sym] ?? h.avgPrice;
      const value = h.quantity * p;
      const cost  = h.avgPrice * h.quantity;
      positions.push({
        symbol: sym,
        quantity: h.quantity,
        avgPrice: h.avgPrice,
        currentPrice: p,
        value,
        cost,
        unrealizedPnL: value - cost,
        unrealizedPnLPercent: cost === 0 ? 0 : ((value - cost) / cost) * 100,
      });
    }
    const positionsValue = positions.reduce((s, p) => s + p.value, 0);
    return {
      cash: this.cash,
      startingBalance: this.startingBalance,
      realizedPnL: this.realizedPnL,
      positions,
      positionsValue,
      totalValue: positionsValue + this.cash,
      pnl: positionsValue + this.cash - this.startingBalance,
      pnlPercent: ((positionsValue + this.cash - this.startingBalance) / this.startingBalance) * 100,
    };
  }
}

module.exports = { PortfolioManager, Queue };
