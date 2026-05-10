const { MaxHeap, MinHeap } = require('./heap');

/**
 * Ranking utilities — uses Heap-based selection in O(n log k)
 * to extract Top-K gainers/losers/most-traded without sorting
 * the entire universe.
 *
 * For very large universes (k << n) this is significantly faster
 * than Array.prototype.sort (which is O(n log n)).
 */

/** Generic Top-K by descending key. */
function topK(items, k, keyFn) {
  if (k <= 0 || items.length === 0) return [];
  // Use a Min-Heap of size k → root is the smallest of the top-k.
  // When iterating, replace the root if a larger item arrives.
  const heap = new MinHeap(keyFn);
  for (const it of items) {
    if (heap.size() < k) heap.push(it);
    else if (keyFn(it) > keyFn(heap.peek())) {
      heap.pop();
      heap.push(it);
    }
  }
  // Drain heap and reverse for descending order
  const result = [];
  while (!heap.isEmpty()) result.push(heap.pop());
  return result.reverse();
}

/** Generic Bottom-K by descending key (i.e. top losers). */
function bottomK(items, k, keyFn) {
  if (k <= 0 || items.length === 0) return [];
  const heap = new MaxHeap(keyFn);
  for (const it of items) {
    if (heap.size() < k) heap.push(it);
    else if (keyFn(it) < keyFn(heap.peek())) {
      heap.pop();
      heap.push(it);
    }
  }
  const result = [];
  while (!heap.isEmpty()) result.push(heap.pop());
  return result.reverse();
}

/** Top gainers by % change. */
function topGainers(stocks, k = 5) {
  return topK(stocks, k, (s) => s.changePercent ?? 0);
}

/** Top losers by % change. */
function topLosers(stocks, k = 5) {
  return bottomK(stocks, k, (s) => s.changePercent ?? 0);
}

/** Most-traded stocks by 24h volume. */
function mostTraded(stocks, k = 5) {
  return topK(stocks, k, (s) => s.volume24h ?? 0);
}

/**
 * Leaderboard ranking for users.
 * Computes ROI = (portfolioValue - startingBalance) / startingBalance.
 * Returns top K users sorted by ROI desc.
 */
function rankUsers(users, k = 50) {
  const enriched = users.map(u => {
    const start = u.startingBalance || Number(process.env.STARTING_BALANCE || 1000000);
    const roi = ((u.portfolioValue - start) / start) * 100;
    return { ...u, roi };
  });
  return topK(enriched, k, (u) => u.roi);
}

module.exports = {
  topK,
  bottomK,
  topGainers,
  topLosers,
  mostTraded,
  rankUsers,
};
