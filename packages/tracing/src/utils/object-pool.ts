/**
 * Generic object pool for reusing objects to reduce allocation overhead.
 *
 * Provides a simple array-based pool with configurable max size to prevent
 * unbounded growth. Objects are reset before being returned to the pool
 * to ensure clean state for reuse.
 *
 * @packageDocumentation
 */

/**
 * ObjectPool - Generic pool for reusable objects.
 *
 * Reduces GC pressure by reusing objects instead of creating new ones.
 * Useful for high-frequency allocations like span objects in tracing.
 *
 * **Features:**
 * - Configurable max pool size to prevent unbounded growth
 * - Reset callback ensures clean state before reuse
 * - Simple array-based implementation for minimal overhead
 *
 * **Usage:**
 * ```typescript
 * interface PooledSpan {
 *   name: string;
 *   attributes: Record<string, unknown>;
 * }
 *
 * const pool = new ObjectPool<PooledSpan>(
 *   () => ({ name: '', attributes: {} }),
 *   (span) => {
 *     span.name = '';
 *     span.attributes = {};
 *   },
 *   1000
 * );
 *
 * const span = pool.acquire();
 * span.name = 'operation';
 * // ... use span ...
 * pool.release(span);
 * ```
 *
 * @public
 */
export class ObjectPool<T> {
  /** Array of pooled objects */
  private readonly _pool: T[] = [];

  /** Maximum number of objects to retain in pool */
  private readonly _maxSize: number;

  /** Factory function for creating new objects */
  private readonly _create: () => T;

  /** Reset function for cleaning objects before reuse */
  private readonly _reset: (obj: T) => void;

  /**
   * Creates a new ObjectPool.
   *
   * @param create - Factory function for creating new objects
   * @param reset - Function to reset object state before reuse
   * @param maxSize - Maximum pool size (default: 1000)
   */
  constructor(create: () => T, reset: (obj: T) => void, maxSize = 1000) {
    this._create = create;
    this._reset = reset;
    this._maxSize = maxSize;
  }

  /**
   * Acquire an object from the pool.
   *
   * Returns a pooled object if available (after resetting it),
   * otherwise creates a new one via the factory function.
   *
   * @returns An object from the pool or newly created
   */
  acquire(): T {
    const obj = this._pool.pop();
    if (obj !== undefined) {
      this._reset(obj);
      return obj;
    }
    return this._create();
  }

  /**
   * Release an object back to the pool.
   *
   * If the pool is under max size, the object is returned to the pool
   * for future reuse. Otherwise it's discarded and will be garbage collected.
   *
   * @param obj - The object to return to the pool
   */
  release(obj: T): void {
    if (this._pool.length < this._maxSize) {
      this._pool.push(obj);
    }
    // If pool is full, discard the object (let GC handle it)
  }

  /**
   * Get the current number of pooled objects.
   *
   * @returns Number of objects currently in the pool
   */
  get size(): number {
    return this._pool.length;
  }

  /**
   * Clear all objects from the pool.
   *
   * Useful for testing or when resetting state.
   */
  clear(): void {
    this._pool.length = 0;
  }
}
