/**
 * Generic binary Heap (priority queue).
 *
 * The heap is parameterised by a `comparator(a, b)` function:
 *   - return negative if `a` has higher priority than `b`
 *   - return positive if `b` has higher priority
 *   - return 0 if equal
 *
 * For a Max-Heap by price (BUY orders) use:
 *   new Heap((a, b) => b.price - a.price)
 *
 * For a Min-Heap by price (SELL orders) use:
 *   new Heap((a, b) => a.price - b.price)
 *
 * All operations are O(log n) except peek which is O(1).
 */
class Heap {
  constructor(comparator = (a, b) => a - b) {
    this._data = [];
    this._cmp = comparator;
  }

  size() {
    return this._data.length;
  }

  isEmpty() {
    return this._data.length === 0;
  }

  peek() {
    return this._data[0];
  }

  toArray() {
    // Returns a shallow copy preserving heap layout (NOT sorted).
    return [...this._data];
  }

  /** Insert item — O(log n). */
  push(item) {
    this._data.push(item);
    this._siftUp(this._data.length - 1);
    return this.size();
  }

  /** Remove and return the highest-priority element — O(log n). */
  pop() {
    if (this.isEmpty()) return undefined;
    const top = this._data[0];
    const last = this._data.pop();
    if (!this.isEmpty()) {
      this._data[0] = last;
      this._siftDown(0);
    }
    return top;
  }

  /**
   * Remove a specific item from the heap (used for order cancellation).
   * Linear search O(n), then O(log n) re-heapify.
   */
  remove(predicate) {
    const idx = this._data.findIndex(predicate);
    if (idx === -1) return undefined;
    const removed = this._data[idx];
    const last = this._data.pop();
    if (idx < this._data.length) {
      this._data[idx] = last;
      this._siftDown(idx);
      this._siftUp(idx);
    }
    return removed;
  }

  _parent(i) { return ((i - 1) >> 1); }
  _left(i)   { return (i << 1) + 1; }
  _right(i)  { return (i << 1) + 2; }

  _siftUp(i) {
    while (i > 0) {
      const p = this._parent(i);
      if (this._cmp(this._data[i], this._data[p]) < 0) {
        [this._data[i], this._data[p]] = [this._data[p], this._data[i]];
        i = p;
      } else break;
    }
  }

  _siftDown(i) {
    const n = this._data.length;
    while (true) {
      const l = this._left(i);
      const r = this._right(i);
      let best = i;
      if (l < n && this._cmp(this._data[l], this._data[best]) < 0) best = l;
      if (r < n && this._cmp(this._data[r], this._data[best]) < 0) best = r;
      if (best !== i) {
        [this._data[i], this._data[best]] = [this._data[best], this._data[i]];
        i = best;
      } else break;
    }
  }
}

class MaxHeap extends Heap {
  constructor(keyFn = (x) => x) {
    super((a, b) => keyFn(b) - keyFn(a));
  }
}

class MinHeap extends Heap {
  constructor(keyFn = (x) => x) {
    super((a, b) => keyFn(a) - keyFn(b));
  }
}

module.exports = { Heap, MaxHeap, MinHeap };
