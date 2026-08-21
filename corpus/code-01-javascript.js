// A small LRU cache implementation backed by a Map, which preserves
// insertion order in JavaScript and lets us reuse that for recency tracking.

class LRUCache {
  #capacity;
  #store = new Map();

  constructor(capacity) {
    if (capacity <= 0) throw new RangeError("capacity must be positive");
    this.#capacity = capacity;
  }

  get(key) {
    if (!this.#store.has(key)) return undefined;
    const value = this.#store.get(key);
    this.#store.delete(key);
    this.#store.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.#store.has(key)) this.#store.delete(key);
    else if (this.#store.size >= this.#capacity) {
      const oldestKey = this.#store.keys().next().value;
      this.#store.delete(oldestKey);
    }
    this.#store.set(key, value);
  }

  has(key) {
    return this.#store.has(key);
  }

  get size() {
    return this.#store.size;
  }

  *entries() {
    yield* this.#store.entries();
  }
}

function memoize(fn, { capacity = 100, keyFn = JSON.stringify } = {}) {
  const cache = new LRUCache(capacity);
  return function memoized(...args) {
    const key = keyFn(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

export { LRUCache, memoize };
