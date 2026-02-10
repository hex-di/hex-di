/**
 * CircularBuffer - Generic O(1) Fixed-Capacity Buffer
 *
 * Pre-allocated array with modular arithmetic for wrap-around.
 * No splice operations — true O(1) push with FIFO eviction when full.
 *
 * @packageDocumentation
 */

// =============================================================================
// CircularBuffer Implementation
// =============================================================================

/**
 * Generic fixed-capacity circular buffer with O(1) push and FIFO eviction.
 *
 * @typeParam T - The element type stored in the buffer
 */
export class CircularBuffer<T> {
  private readonly buffer: Array<T | undefined>;
  private readonly cap: number;
  private head = 0;
  private size = 0;

  /**
   * Creates a new CircularBuffer with the given capacity.
   *
   * @param capacity - Maximum number of items the buffer can hold
   */
  constructor(capacity: number) {
    this.cap = capacity;
    this.buffer = new Array<T | undefined>(capacity).fill(undefined);
  }

  /**
   * The number of items currently in the buffer.
   */
  get length(): number {
    return this.size;
  }

  /**
   * Pushes an item into the buffer. If the buffer is full, the oldest item
   * is overwritten (FIFO eviction).
   *
   * @param item - The item to push
   */
  push(item: T): void {
    if (this.cap === 0) return;

    const writeIndex = (this.head + this.size) % this.cap;
    this.buffer[writeIndex] = item;

    if (this.size < this.cap) {
      this.size++;
    } else {
      // Buffer is full — overwrite oldest, advance head
      this.head = (this.head + 1) % this.cap;
    }
  }

  /**
   * Returns all items in insertion order as a new array.
   *
   * @returns Array of items from oldest to newest
   */
  toArray(): readonly T[] {
    const result: T[] = [];
    for (let i = 0; i < this.size; i++) {
      const index = (this.head + i) % this.cap;
      const item = this.buffer[index];
      if (item !== undefined) {
        result.push(item);
      }
    }
    return result;
  }

  /**
   * Removes all items from the buffer.
   */
  clear(): void {
    this.buffer.fill(undefined);
    this.head = 0;
    this.size = 0;
  }
}
