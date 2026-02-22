/**
 * MemoMap - Internal instance caching for scope/container management.
 *
 * This internal class manages instance caching with:
 * - Port-keyed Map for O(1) lookup
 * - Creation order tracking for LIFO disposal
 * - Parent chain for singleton inheritance in scopes
 * - Finalizer support for resource cleanup
 *
 * @internal This class is not exported from the package - it's an implementation detail.
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/core";
import { monotonicNow } from "./monotonic-time.js";
import { FinalizerTimeoutError } from "../errors/index.js";
// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Configuration options for MemoMap behavior.
 * @internal
 */
export interface MemoMapConfig {
  /** Whether to capture timestamps (default: true) */
  readonly captureTimestamps?: boolean;
}

/**
 * Options for controlling disposal behavior.
 * @internal
 */
export interface DisposalOptions {
  /** Maximum time in ms to wait for each individual finalizer. Default: 30_000 */
  readonly finalizerTimeoutMs?: number;
  /** Callback invoked when a finalizer exceeds the timeout. */
  readonly onFinalizerTimeout?: (portName: string, timeoutMs: number) => void;
}

/**
 * Wraps a possibly-async finalizer result with a timeout.
 *
 * If the finalizer returns void (synchronous), resolves immediately.
 * If the finalizer returns a Promise that doesn't settle within timeoutMs,
 * rejects with FinalizerTimeoutError.
 *
 * @param maybePromise - The finalizer result (void or Promise<void>)
 * @param timeoutMs - Maximum wait time in milliseconds
 * @param portName - Port name for error reporting
 * @returns A promise that resolves when the finalizer completes or rejects on timeout
 * @internal
 */
/**
 * Access setTimeout/clearTimeout via globalThis to avoid requiring @types/node.
 */
const _timers = globalThis as unknown as {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (id: unknown) => void;
};

function withTimeout(
  maybePromise: void | Promise<void>,
  timeoutMs: number,
  portName: string
): Promise<void> {
  if (maybePromise === undefined || !(maybePromise instanceof Promise)) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    const timer = _timers.setTimeout(() => {
      reject(new FinalizerTimeoutError(portName, timeoutMs));
    }, timeoutMs);

    maybePromise.then(
      () => {
        _timers.clearTimeout(timer);
        resolve();
      },
      (err: unknown) => {
        _timers.clearTimeout(timer);
        reject(err);
      }
    );
  });
}

// =============================================================================
// Internal Types
// =============================================================================

/**
 * Type for memoization finalizers.
 * @internal
 */
type FinalizerFn<T> = {
  // Bivariant to allow storing typed finalizers in type-erased caches.
  bivarianceHack(instance: T): void | Promise<void>;
}["bivarianceHack"];

/**
 * Type for memoization finalizers.
 * @internal
 */
type Finalizer<T = unknown> = FinalizerFn<T> | undefined;

// =============================================================================
// Types
// =============================================================================

/**
 * Entry tracking creation order and optional finalizer for disposal.
 * @internal
 */
interface CacheEntry<P extends Port<string, unknown>> {
  /** The port used as cache key */
  readonly port: P;
  /** The cached instance for the port */
  readonly instance: InferService<P>;
  /** Optional cleanup function called during disposal */
  readonly finalizer: Finalizer<InferService<P>>;
  /** Timestamp when the instance was resolved (captured via Date.now()) */
  readonly resolvedAt: number;
  /** Sequential order in which this entry was resolved within this MemoMap */
  readonly resolutionOrder: number;
}

/**
 * Metadata about a cached entry for inspection purposes.
 * @internal
 */
export interface EntryMetadata {
  /** Timestamp when the instance was resolved (captured via Date.now()) */
  readonly resolvedAt: number;
  /** Sequential order in which this entry was resolved within this MemoMap */
  readonly resolutionOrder: number;
}

function isEntryForPort<P extends Port<string, unknown>>(
  entry: CacheEntry<Port<string, unknown>>,
  port: P
): entry is CacheEntry<P> {
  return entry.port === port;
}

// =============================================================================
// MemoMap Class
// =============================================================================

/**
 * Internal class for managing instance caching with LIFO disposal ordering.
 *
 * MemoMap provides:
 * - Lazy instantiation via getOrElseMemoize
 * - Parent chain lookup for singleton inheritance
 * - Creation order tracking for LIFO disposal
 * - Error aggregation during disposal
 *
 * @internal This class is an implementation detail and should not be exported.
 *
 * @example Internal usage (for container implementation)
 * ```typescript
 * const singletonMemo = new MemoMap();
 *
 * // Cache singleton instance
 * const logger = singletonMemo.getOrElseMemoize(
 *   LoggerPort,
 *   () => new ConsoleLogger(),
 *   (instance) => instance.flush()
 * );
 *
 * // Create child for scope
 * const scopedMemo = singletonMemo.fork();
 *
 * // Dispose in LIFO order
 * await scopedMemo.dispose();
 * await singletonMemo.dispose();
 * ```
 */
export class MemoMap {
  /**
   * Cache storing port -> instance mappings.
   * Uses port reference as key for O(1) lookup.
   */
  private readonly cache: Map<Port<string, unknown>, CacheEntry<Port<string, unknown>>> = new Map();

  /**
   * Tracks creation order for LIFO disposal.
   * Each entry contains the port and optional finalizer.
   */
  private readonly creationOrder: CacheEntry<Port<string, unknown>>[] = [];

  /**
   * Optional parent MemoMap for singleton inheritance.
   * When set, parent cache is checked before own cache during lookup.
   */
  private readonly parent: MemoMap | undefined;

  /**
   * Flag indicating whether this MemoMap has been disposed.
   * Once disposed, the cache is cleared and should not be used.
   */
  private disposed: boolean = false;

  /**
   * Counter for tracking resolution order.
   * Incremented on each successful memoization within this MemoMap.
   */
  private resolutionCounter: number = 0;

  /**
   * Configuration for MemoMap behavior.
   */
  private readonly config: MemoMapConfig;

  /**
   * Tracks in-flight async factory calls for deduplication.
   * Prevents double-factory-execution when two async resolution
   * paths converge before either completes.
   */
  private readonly pendingAsync: Map<Port<string, unknown>, Promise<unknown>> = new Map();

  /**
   * Creates a new MemoMap instance.
   *
   * @param parent - Optional parent MemoMap for singleton inheritance.
   *   When provided, parent cache is checked first during getOrElseMemoize.
   * @param config - Optional configuration for MemoMap behavior.
   */
  constructor(parent?: MemoMap, config?: MemoMapConfig) {
    this.parent = parent;
    this.config = config ?? {};
  }

  /**
   * Gets a cached instance or creates and caches a new one.
   *
   * Lookup order:
   * 1. Check parent cache (if parent exists) - for singleton inheritance
   * 2. Check own cache
   * 3. Call factory, cache result, and track creation order
   *
   * @typeParam T - The service type
   * @param port - The port to use as cache key
   * @param factory - Function to create the instance if not cached
   * @param finalizer - Optional cleanup function called during disposal
   * @returns The cached or newly created instance
   *
   * @example
   * ```typescript
   * const logger = memoMap.getOrElseMemoize(
   *   LoggerPort,
   *   () => new ConsoleLogger(),
   *   (instance) => instance.close()
   * );
   * ```
   */
  getOrElseMemoize<P extends Port<string, unknown>>(
    port: P,
    factory: () => InferService<P>,
    finalizer?: Finalizer<InferService<P>>
  ): InferService<P> {
    // Check parent cache first (for singleton inheritance)
    if (this.parent !== undefined && this.parent.has(port)) {
      return this.parent.getOrElseMemoize(port, factory, finalizer);
    }

    // Check own cache
    const cached = this.cache.get(port);
    if (cached !== undefined && isEntryForPort(cached, port)) {
      return cached.instance;
    }

    // Create new instance
    const instance = factory();

    // Cache the instance
    const entry: CacheEntry<P> = {
      port,
      instance,
      finalizer,
      resolvedAt: this.config.captureTimestamps !== false ? monotonicNow() : 0,
      resolutionOrder: this.resolutionCounter++,
    };
    this.cache.set(port, entry);
    this.creationOrder.push(entry);

    return instance;
  }

  /**
   * Memoizes in own cache only, ignoring parent cache entirely.
   *
   * This method is specifically for override contexts where we want to
   * cache override instances locally without checking or delegating to
   * the parent memo map. This ensures overrides work even when the
   * original service is already cached in the parent.
   *
   * @typeParam P - The port type being cached
   * @param port - The port to use as cache key
   * @param factory - Function to create the instance if not cached locally
   * @param finalizer - Optional cleanup function called during disposal
   * @returns The cached or newly created instance
   *
   * @example
   * ```typescript
   * // Cache a value locally without checking parent
   * const mockLogger = childMemo.memoizeOwn(
   *   LoggerPort,
   *   () => new MockLogger()
   * );
   * ```
   */
  memoizeOwn<P extends Port<string, unknown>>(
    port: P,
    factory: () => InferService<P>,
    finalizer?: Finalizer<InferService<P>>
  ): InferService<P> {
    // Check own cache only - do NOT check parent
    const cached = this.cache.get(port);
    if (cached !== undefined && isEntryForPort(cached, port)) {
      return cached.instance;
    }

    // Create new instance
    const instance = factory();

    // Cache the instance in own cache
    const entry: CacheEntry<P> = {
      port,
      instance,
      finalizer,
      resolvedAt: this.config.captureTimestamps !== false ? monotonicNow() : 0,
      resolutionOrder: this.resolutionCounter++,
    };
    this.cache.set(port, entry);
    this.creationOrder.push(entry);

    return instance;
  }

  /**
   * Gets a cached instance or asynchronously creates and caches a new one.
   *
   * Similar to getOrElseMemoize but supports async factory functions.
   * Lookup order:
   * 1. Check parent cache (if parent exists) - for singleton inheritance
   * 2. Check own cache
   * 3. Call async factory, cache result, and track creation order
   *
   * @typeParam T - The service type
   * @param port - The port to use as cache key
   * @param factory - Async function to create the instance if not cached
   * @param finalizer - Optional cleanup function called during disposal
   * @returns A promise that resolves to the cached or newly created instance
   *
   * @example
   * ```typescript
   * const database = await memoMap.getOrElseMemoizeAsync(
   *   DatabasePort,
   *   async () => await createPool(connectionString),
   *   async (instance) => await instance.close()
   * );
   * ```
   */
  async getOrElseMemoizeAsync<P extends Port<string, unknown>>(
    port: P,
    factory: () => Promise<InferService<P>>,
    finalizer?: Finalizer<InferService<P>>
  ): Promise<InferService<P>> {
    // Check parent cache first (for singleton inheritance)
    if (this.parent !== undefined && this.parent.has(port)) {
      return this.parent.getOrElseMemoizeAsync(port, factory, finalizer);
    }

    // Check own cache
    const cached = this.cache.get(port);
    if (cached !== undefined && isEntryForPort(cached, port)) {
      return cached.instance;
    }

    // Check pending (deduplication): reuse in-flight factory call
    const pending = this.pendingAsync.get(port);
    if (pending !== undefined) {
      return pending as Promise<InferService<P>>;
    }

    // Create and track the pending promise
    const promise = this._executeMemoizeAsync(port, factory, finalizer);
    this.pendingAsync.set(port, promise);

    try {
      return await promise;
    } finally {
      this.pendingAsync.delete(port);
    }
  }

  /**
   * Executes the async factory, caches the result, and returns the instance.
   * Separated from getOrElseMemoizeAsync to support deduplication.
   * @internal
   */
  private async _executeMemoizeAsync<P extends Port<string, unknown>>(
    port: P,
    factory: () => Promise<InferService<P>>,
    finalizer?: Finalizer<InferService<P>>
  ): Promise<InferService<P>> {
    const instance = await factory();

    const entry: CacheEntry<P> = {
      port,
      instance,
      finalizer,
      resolvedAt: this.config.captureTimestamps !== false ? monotonicNow() : 0,
      resolutionOrder: this.resolutionCounter++,
    };
    this.cache.set(port, entry);
    this.creationOrder.push(entry);

    return instance;
  }

  /**
   * Checks if a port has a cached instance.
   *
   * Checks both own cache and parent cache (if parent exists).
   *
   * @param port - The port to check
   * @returns True if the port has a cached instance
   *
   * @example
   * ```typescript
   * if (memoMap.has(LoggerPort)) {
   *   // Instance exists in cache
   * }
   * ```
   */
  has(port: Port<string, unknown>): boolean {
    // Check own cache first
    if (this.cache.has(port)) {
      return true;
    }

    // Check parent cache if exists
    if (this.parent !== undefined) {
      return this.parent.has(port);
    }

    return false;
  }

  /**
   * Returns a cached instance if it exists, without creating a new one.
   * Checks both this cache and the parent chain.
   *
   * @param port - The port to look up
   * @returns The cached instance or undefined if not present
   */
  getIfPresent<P extends Port<string, unknown>>(port: P): InferService<P> | undefined {
    const cached = this.cache.get(port);
    if (cached !== undefined && isEntryForPort(cached, port)) {
      return cached.instance;
    }

    if (this.parent !== undefined) {
      return this.parent.getIfPresent(port);
    }

    return undefined;
  }

  /**
   * Iterates all cached entries in this MemoMap with their metadata.
   *
   * Yields entries in creation order (not including parent entries).
   * Each entry includes the port and metadata about when/how it was resolved.
   *
   * @returns An iterable of [port, metadata] tuples
   *
   * @example
   * ```typescript
   * for (const [port, metadata] of memoMap.entries()) {
   *   console.log(`${port.name} resolved at ${metadata.resolvedAt}`);
   * }
   * ```
   */
  *entries(): Iterable<[Port<string, unknown>, EntryMetadata]> {
    for (const entry of this.creationOrder) {
      yield [
        entry.port,
        {
          resolvedAt: entry.resolvedAt,
          resolutionOrder: entry.resolutionOrder,
        },
      ];
    }
  }

  /**
   * Creates a child MemoMap with this instance as parent.
   *
   * The child:
   * - Has its own empty cache
   * - Can see parent's cached instances via getOrElseMemoize
   * - Tracks its own creation order independently
   * - Inherits the parent's configuration
   *
   * @returns A new MemoMap with this as parent
   *
   * @example
   * ```typescript
   * const parentMemo = new MemoMap();
   * const childMemo = parentMemo.fork();
   *
   * // Child inherits parent's singletons
   * // but tracks scoped instances separately
   * ```
   */
  fork(): MemoMap {
    return new MemoMap(this, this.config);
  }

  /**
   * Disposes all cached instances in LIFO order.
   *
   * Disposal process:
   * 1. Sets disposed flag
   * 2. Iterates creationOrder in reverse (LIFO)
   * 3. Calls each finalizer, catching and aggregating errors
   * 4. Clears the cache
   * 5. Throws AggregateError if any finalizers failed
   *
   * @returns Promise that resolves when disposal is complete
   * @throws {AggregateError} If one or more finalizers threw errors
   *
   * @example
   * ```typescript
   * try {
   *   await memoMap.dispose();
   * } catch (error) {
   *   if (error instanceof AggregateError) {
   *     console.log(`${error.errors.length} finalizers failed`);
   *   }
   * }
   * ```
   */
  async dispose(options?: DisposalOptions): Promise<void> {
    // Mark as disposed early to prevent new entries
    this.disposed = true;

    const errors: unknown[] = [];
    const timeoutMs = options?.finalizerTimeoutMs ?? 30_000;

    // Iterate in reverse order (LIFO - last created first disposed)
    for (let i = this.creationOrder.length - 1; i >= 0; i--) {
      const entry = this.creationOrder[i];

      // With noUncheckedIndexedAccess, entry can be undefined
      if (entry !== undefined && entry.finalizer !== undefined) {
        try {
          // Wrap with timeout to prevent indefinite blocking
          await withTimeout(entry.finalizer(entry.instance), timeoutMs, entry.port.__portName);
        } catch (error) {
          // Report timeout specifically if callback is configured
          if (error instanceof FinalizerTimeoutError) {
            options?.onFinalizerTimeout?.(entry.port.__portName, timeoutMs);
          }
          // Collect error but continue disposing
          errors.push(error);
        }
      }
    }

    // Clear cache after disposal
    this.cache.clear();

    // Throw aggregated errors if any
    if (errors.length > 0) {
      throw new AggregateError(errors, `${errors.length} finalizer(s) failed during disposal`);
    }
  }

  /**
   * Returns whether this MemoMap has been disposed.
   *
   * @returns True if dispose() has been called
   *
   * @example
   * ```typescript
   * if (memoMap.isDisposed) {
   *   throw new Error('Cannot use disposed MemoMap');
   * }
   * ```
   */
  get isDisposed(): boolean {
    return this.disposed;
  }
}
