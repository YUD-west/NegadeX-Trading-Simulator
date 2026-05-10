const test = require('node:test');
const assert = require('node:assert/strict');

const { Heap } = require('../algorithms/heap');
const { MatchingEngine } = require('../algorithms/matchingEngine');
const { PortfolioManager, Queue } = require('../algorithms/portfolioManager');
const { findClosestByTime, rangeBetween } = require('../algorithms/binarySearch');
const { topK, bottomK } = require('../algorithms/ranking');

test('Heap respects comparator priority', () => {
  const maxByPrice = new Heap((a, b) => b.price - a.price);
  maxByPrice.push({ price: 10 });
  maxByPrice.push({ price: 25 });
  maxByPrice.push({ price: 17 });
  assert.equal(maxByPrice.pop().price, 25);
  assert.equal(maxByPrice.pop().price, 17);
  assert.equal(maxByPrice.pop().price, 10);
});

test('Heap remove re-heapifies after cancellation', () => {
  const minByPrice = new Heap((a, b) => a.price - b.price);
  minByPrice.push({ id: 'cbe-1', price: 1820 });
  minByPrice.push({ id: 'cbe-2', price: 1810 });
  minByPrice.push({ id: 'cbe-3', price: 1830 });
  const removed = minByPrice.remove(o => o.id === 'cbe-2');
  assert.equal(removed.price, 1810);
  assert.equal(minByPrice.pop().price, 1820);
  assert.equal(minByPrice.pop().price, 1830);
});

test('MatchingEngine matches highest bid with lowest ask', () => {
  const engine = new MatchingEngine();
  engine.submit({ userId: 'seller', symbol: 'CBE', side: 'SELL', type: 'LIMIT', quantity: 5, price: 100 });
  engine.submit({ userId: 'seller2', symbol: 'CBE', side: 'SELL', type: 'LIMIT', quantity: 5, price: 101 });
  const res = engine.submit({ userId: 'buyer', symbol: 'CBE', side: 'BUY', type: 'LIMIT', quantity: 3, price: 102 });
  assert.equal(res.fills.length, 1);
  assert.equal(res.fills[0].price, 100);
  assert.equal(res.fills[0].quantity, 3);
  const depth = engine.getDepth('CBE');
  assert.equal(depth.asks[0].price, 100);
  assert.equal(depth.asks[0].quantity, 2);
});

test('MatchingEngine honours price-time priority at same price', () => {
  const engine = new MatchingEngine();
  engine.submit({ userId: 'seller-old', symbol: 'ETHA', side: 'SELL', type: 'LIMIT', quantity: 2, price: 3500 });
  engine.submit({ userId: 'seller-new', symbol: 'ETHA', side: 'SELL', type: 'LIMIT', quantity: 2, price: 3500 });
  const res = engine.submit({ userId: 'buyer', symbol: 'ETHA', side: 'BUY', type: 'LIMIT', quantity: 3, price: 3600 });
  assert.equal(res.fills.length, 2);
  assert.equal(res.fills[0].sellerId, 'seller-old');
  assert.equal(res.fills[1].sellerId, 'seller-new');
  assert.equal(res.fills[0].quantity, 2);
  assert.equal(res.fills[1].quantity, 1);
});

test('PortfolioManager uses O(1) holdings map and stack undo', () => {
  const p = new PortfolioManager({ startingBalance: 1000 });
  p.applyBuy('CBE', 5, 10);
  p.applyBuy('CBE', 5, 20);
  assert.equal(p.getHolding('CBE').quantity, 10);
  assert.equal(p.getHolding('CBE').avgPrice, 15);
  p.undoLastTrade();
  assert.equal(p.getHolding('CBE').quantity, 5);
  assert.equal(p.cash, 950);
});

test('Queue processes FIFO', () => {
  const q = new Queue();
  q.enqueue('first');
  q.enqueue('second');
  assert.equal(q.dequeue(), 'first');
  assert.equal(q.dequeue(), 'second');
});

test('Binary search finds nearest candle and ranges', () => {
  const candles = [
    { time: 10, close: 1 },
    { time: 20, close: 2 },
    { time: 30, close: 3 },
    { time: 40, close: 4 },
  ];
  assert.deepEqual(findClosestByTime(candles, 24), candles[1]);
  assert.deepEqual(rangeBetween(candles, 15, 35), [candles[1], candles[2]]);
});

test('Heap-based topK and bottomK return expected stocks', () => {
  const items = [
    { symbol: 'A', change: 2 },
    { symbol: 'B', change: -5 },
    { symbol: 'C', change: 10 },
    { symbol: 'D', change: 0 },
  ];
  assert.deepEqual(topK(items, 2, x => x.change).map(x => x.symbol), ['C', 'A']);
  assert.deepEqual(bottomK(items, 2, x => x.change).map(x => x.symbol), ['B', 'D']);
});
