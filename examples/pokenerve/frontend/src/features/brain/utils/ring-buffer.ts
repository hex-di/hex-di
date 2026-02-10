/**
 * Simple typed ring buffer with O(1) push and bounded capacity.
 *
 * Used by the Brain View panels to maintain fixed-size event histories
 * without unbounded memory growth.
 *
 * @packageDocumentation
 */

// ---------------------------------------------------------------------------
// Ring Buffer
// ---------------------------------------------------------------------------

class RingBuffer<T> {
  private readonly items: Array<T | undefined>;
  private head = 0;
  private count = 0;
  private readonly cap: number;

  constructor(capacity: number) {
    this.cap = Math.max(1, capacity);
    this.items = new Array<T | undefined>(this.cap);
  }

  get length(): number {
    return this.count;
  }

  get capacity(): number {
    return this.cap;
  }

  push(item: T): void {
    this.items[this.head] = item;
    this.head = (this.head + 1) % this.cap;
    if (this.count < this.cap) {
      this.count += 1;
    }
  }

  /**
   * Returns items in insertion order (oldest first).
   */
  toArray(): readonly T[] {
    if (this.count === 0) {
      return [];
    }

    const result: T[] = [];
    const start = this.count < this.cap ? 0 : this.head;

    for (let i = 0; i < this.count; i += 1) {
      const index = (start + i) % this.cap;
      const item = this.items[index];
      if (item !== undefined) {
        result.push(item);
      }
    }

    return result;
  }

  clear(): void {
    this.items.fill(undefined);
    this.head = 0;
    this.count = 0;
  }
}

export { RingBuffer };
