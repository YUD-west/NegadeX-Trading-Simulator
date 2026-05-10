/**
 * Binary search helpers operating on time-series price arrays.
 * Each "candle" is { time: <unix-seconds>, open, high, low, close }.
 * We require the input array to be sorted ascending by `time` — which the
 * marketSimulator guarantees (it appends, never inserts in the middle).
 *
 *  • findClosestByTime(history, t)   → O(log n)
 *  • rangeBetween(history, from, to) → O(log n + k)
 *  • lowerBound / upperBound         → classic textbook variants
 */

function lowerBound(arr, t, key = (x) => x.time) {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (key(arr[mid]) < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function upperBound(arr, t, key = (x) => x.time) {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (key(arr[mid]) <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function findClosestByTime(arr, t) {
  if (!arr.length) return null;
  const i = lowerBound(arr, t);
  if (i === 0) return arr[0];
  if (i === arr.length) return arr[arr.length - 1];
  const before = arr[i - 1];
  const after  = arr[i];
  return Math.abs(after.time - t) < Math.abs(t - before.time) ? after : before;
}

function rangeBetween(arr, from, to) {
  const l = lowerBound(arr, from);
  const r = upperBound(arr, to);
  return arr.slice(l, r);
}

module.exports = { lowerBound, upperBound, findClosestByTime, rangeBetween };
