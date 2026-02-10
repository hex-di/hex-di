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
// @ts-nocheck
function stryNS_9fa48() {
  var g =
    (typeof globalThis === "object" && globalThis && globalThis.Math === Math && globalThis) ||
    new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (
    ns.activeMutant === undefined &&
    g.process &&
    g.process.env &&
    g.process.env.__STRYKER_ACTIVE_MUTANT__
  ) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov =
    ns.mutantCoverage ||
    (ns.mutantCoverage = {
      static: {},
      perTest: {},
    });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error("Stryker: Hit count limit reached (" + ns.hitCount + ")");
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import type { Port, InferService } from "@hex-di/core";
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
interface CacheEntry<P extends Port<unknown, string>> {
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
function isEntryForPort<P extends Port<unknown, string>>(
  entry: CacheEntry<Port<unknown, string>>,
  port: P
): entry is CacheEntry<P> {
  if (stryMutAct_9fa48("2061")) {
    {
    }
  } else {
    stryCov_9fa48("2061");
    return stryMutAct_9fa48("2064")
      ? entry.port !== port
      : stryMutAct_9fa48("2063")
        ? false
        : stryMutAct_9fa48("2062")
          ? true
          : (stryCov_9fa48("2062", "2063", "2064"), entry.port === port);
  }
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
  private readonly cache: Map<Port<unknown, string>, CacheEntry<Port<unknown, string>>> = new Map();

  /**
   * Tracks creation order for LIFO disposal.
   * Each entry contains the port and optional finalizer.
   */
  private readonly creationOrder: CacheEntry<Port<unknown, string>>[] = stryMutAct_9fa48("2065")
    ? ["Stryker was here"]
    : (stryCov_9fa48("2065"), []);

  /**
   * Optional parent MemoMap for singleton inheritance.
   * When set, parent cache is checked before own cache during lookup.
   */
  private readonly parent: MemoMap | undefined;

  /**
   * Flag indicating whether this MemoMap has been disposed.
   * Once disposed, the cache is cleared and should not be used.
   */
  private disposed: boolean = stryMutAct_9fa48("2066") ? true : (stryCov_9fa48("2066"), false);

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
   * Creates a new MemoMap instance.
   *
   * @param parent - Optional parent MemoMap for singleton inheritance.
   *   When provided, parent cache is checked first during getOrElseMemoize.
   * @param config - Optional configuration for MemoMap behavior.
   */
  constructor(parent?: MemoMap, config?: MemoMapConfig) {
    if (stryMutAct_9fa48("2067")) {
      {
      }
    } else {
      stryCov_9fa48("2067");
      this.parent = parent;
      this.config = stryMutAct_9fa48("2068") ? config && {} : (stryCov_9fa48("2068"), config ?? {});
    }
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
  getOrElseMemoize<P extends Port<unknown, string>>(
    port: P,
    factory: () => InferService<P>,
    finalizer?: Finalizer<InferService<P>>
  ): InferService<P> {
    if (stryMutAct_9fa48("2069")) {
      {
      }
    } else {
      stryCov_9fa48("2069");
      // Check parent cache first (for singleton inheritance)
      if (
        stryMutAct_9fa48("2072")
          ? this.parent !== undefined || this.parent.has(port)
          : stryMutAct_9fa48("2071")
            ? false
            : stryMutAct_9fa48("2070")
              ? true
              : (stryCov_9fa48("2070", "2071", "2072"),
                (stryMutAct_9fa48("2074")
                  ? this.parent === undefined
                  : stryMutAct_9fa48("2073")
                    ? true
                    : (stryCov_9fa48("2073", "2074"), this.parent !== undefined)) &&
                  this.parent.has(port))
      ) {
        if (stryMutAct_9fa48("2075")) {
          {
          }
        } else {
          stryCov_9fa48("2075");
          return this.parent.getOrElseMemoize(port, factory, finalizer);
        }
      }

      // Check own cache
      const cached = this.cache.get(port);
      if (
        stryMutAct_9fa48("2078")
          ? cached !== undefined || isEntryForPort(cached, port)
          : stryMutAct_9fa48("2077")
            ? false
            : stryMutAct_9fa48("2076")
              ? true
              : (stryCov_9fa48("2076", "2077", "2078"),
                (stryMutAct_9fa48("2080")
                  ? cached === undefined
                  : stryMutAct_9fa48("2079")
                    ? true
                    : (stryCov_9fa48("2079", "2080"), cached !== undefined)) &&
                  isEntryForPort(cached, port))
      ) {
        if (stryMutAct_9fa48("2081")) {
          {
          }
        } else {
          stryCov_9fa48("2081");
          return cached.instance;
        }
      }

      // Create new instance
      const instance = factory();

      // Cache the instance
      const entry: CacheEntry<P> = stryMutAct_9fa48("2082")
        ? {}
        : (stryCov_9fa48("2082"),
          {
            port,
            instance,
            finalizer,
            resolvedAt: (
              stryMutAct_9fa48("2085")
                ? this.config.captureTimestamps === false
                : stryMutAct_9fa48("2084")
                  ? false
                  : stryMutAct_9fa48("2083")
                    ? true
                    : (stryCov_9fa48("2083", "2084", "2085"),
                      this.config.captureTimestamps !==
                        (stryMutAct_9fa48("2086") ? true : (stryCov_9fa48("2086"), false)))
            )
              ? Date.now()
              : 0,
            resolutionOrder: stryMutAct_9fa48("2087")
              ? this.resolutionCounter--
              : (stryCov_9fa48("2087"), this.resolutionCounter++),
          });
      this.cache.set(port, entry);
      this.creationOrder.push(entry);
      return instance;
    }
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
  memoizeOwn<P extends Port<unknown, string>>(
    port: P,
    factory: () => InferService<P>,
    finalizer?: Finalizer<InferService<P>>
  ): InferService<P> {
    if (stryMutAct_9fa48("2088")) {
      {
      }
    } else {
      stryCov_9fa48("2088");
      // Check own cache only - do NOT check parent
      const cached = this.cache.get(port);
      if (
        stryMutAct_9fa48("2091")
          ? cached !== undefined || isEntryForPort(cached, port)
          : stryMutAct_9fa48("2090")
            ? false
            : stryMutAct_9fa48("2089")
              ? true
              : (stryCov_9fa48("2089", "2090", "2091"),
                (stryMutAct_9fa48("2093")
                  ? cached === undefined
                  : stryMutAct_9fa48("2092")
                    ? true
                    : (stryCov_9fa48("2092", "2093"), cached !== undefined)) &&
                  isEntryForPort(cached, port))
      ) {
        if (stryMutAct_9fa48("2094")) {
          {
          }
        } else {
          stryCov_9fa48("2094");
          return cached.instance;
        }
      }

      // Create new instance
      const instance = factory();

      // Cache the instance in own cache
      const entry: CacheEntry<P> = stryMutAct_9fa48("2095")
        ? {}
        : (stryCov_9fa48("2095"),
          {
            port,
            instance,
            finalizer,
            resolvedAt: (
              stryMutAct_9fa48("2098")
                ? this.config.captureTimestamps === false
                : stryMutAct_9fa48("2097")
                  ? false
                  : stryMutAct_9fa48("2096")
                    ? true
                    : (stryCov_9fa48("2096", "2097", "2098"),
                      this.config.captureTimestamps !==
                        (stryMutAct_9fa48("2099") ? true : (stryCov_9fa48("2099"), false)))
            )
              ? Date.now()
              : 0,
            resolutionOrder: stryMutAct_9fa48("2100")
              ? this.resolutionCounter--
              : (stryCov_9fa48("2100"), this.resolutionCounter++),
          });
      this.cache.set(port, entry);
      this.creationOrder.push(entry);
      return instance;
    }
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
  async getOrElseMemoizeAsync<P extends Port<unknown, string>>(
    port: P,
    factory: () => Promise<InferService<P>>,
    finalizer?: Finalizer<InferService<P>>
  ): Promise<InferService<P>> {
    if (stryMutAct_9fa48("2101")) {
      {
      }
    } else {
      stryCov_9fa48("2101");
      // Check parent cache first (for singleton inheritance)
      if (
        stryMutAct_9fa48("2104")
          ? this.parent !== undefined || this.parent.has(port)
          : stryMutAct_9fa48("2103")
            ? false
            : stryMutAct_9fa48("2102")
              ? true
              : (stryCov_9fa48("2102", "2103", "2104"),
                (stryMutAct_9fa48("2106")
                  ? this.parent === undefined
                  : stryMutAct_9fa48("2105")
                    ? true
                    : (stryCov_9fa48("2105", "2106"), this.parent !== undefined)) &&
                  this.parent.has(port))
      ) {
        if (stryMutAct_9fa48("2107")) {
          {
          }
        } else {
          stryCov_9fa48("2107");
          return this.parent.getOrElseMemoizeAsync(port, factory, finalizer);
        }
      }

      // Check own cache
      const cached = this.cache.get(port);
      if (
        stryMutAct_9fa48("2110")
          ? cached !== undefined || isEntryForPort(cached, port)
          : stryMutAct_9fa48("2109")
            ? false
            : stryMutAct_9fa48("2108")
              ? true
              : (stryCov_9fa48("2108", "2109", "2110"),
                (stryMutAct_9fa48("2112")
                  ? cached === undefined
                  : stryMutAct_9fa48("2111")
                    ? true
                    : (stryCov_9fa48("2111", "2112"), cached !== undefined)) &&
                  isEntryForPort(cached, port))
      ) {
        if (stryMutAct_9fa48("2113")) {
          {
          }
        } else {
          stryCov_9fa48("2113");
          return cached.instance;
        }
      }

      // Create new instance asynchronously
      const instance = await factory();

      // Cache the instance
      const entry: CacheEntry<P> = stryMutAct_9fa48("2114")
        ? {}
        : (stryCov_9fa48("2114"),
          {
            port,
            instance,
            finalizer,
            resolvedAt: (
              stryMutAct_9fa48("2117")
                ? this.config.captureTimestamps === false
                : stryMutAct_9fa48("2116")
                  ? false
                  : stryMutAct_9fa48("2115")
                    ? true
                    : (stryCov_9fa48("2115", "2116", "2117"),
                      this.config.captureTimestamps !==
                        (stryMutAct_9fa48("2118") ? true : (stryCov_9fa48("2118"), false)))
            )
              ? Date.now()
              : 0,
            resolutionOrder: stryMutAct_9fa48("2119")
              ? this.resolutionCounter--
              : (stryCov_9fa48("2119"), this.resolutionCounter++),
          });
      this.cache.set(port, entry);
      this.creationOrder.push(entry);
      return instance;
    }
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
  has(port: Port<unknown, string>): boolean {
    if (stryMutAct_9fa48("2120")) {
      {
      }
    } else {
      stryCov_9fa48("2120");
      // Check own cache first
      if (
        stryMutAct_9fa48("2122")
          ? false
          : stryMutAct_9fa48("2121")
            ? true
            : (stryCov_9fa48("2121", "2122"), this.cache.has(port))
      ) {
        if (stryMutAct_9fa48("2123")) {
          {
          }
        } else {
          stryCov_9fa48("2123");
          return stryMutAct_9fa48("2124") ? false : (stryCov_9fa48("2124"), true);
        }
      }

      // Check parent cache if exists
      if (
        stryMutAct_9fa48("2127")
          ? this.parent === undefined
          : stryMutAct_9fa48("2126")
            ? false
            : stryMutAct_9fa48("2125")
              ? true
              : (stryCov_9fa48("2125", "2126", "2127"), this.parent !== undefined)
      ) {
        if (stryMutAct_9fa48("2128")) {
          {
          }
        } else {
          stryCov_9fa48("2128");
          return this.parent.has(port);
        }
      }
      return stryMutAct_9fa48("2129") ? true : (stryCov_9fa48("2129"), false);
    }
  }

  /**
   * Returns a cached instance if it exists, without creating a new one.
   * Checks both this cache and the parent chain.
   *
   * @param port - The port to look up
   * @returns The cached instance or undefined if not present
   */
  getIfPresent<P extends Port<unknown, string>>(port: P): InferService<P> | undefined {
    if (stryMutAct_9fa48("2130")) {
      {
      }
    } else {
      stryCov_9fa48("2130");
      const cached = this.cache.get(port);
      if (
        stryMutAct_9fa48("2133")
          ? cached !== undefined || isEntryForPort(cached, port)
          : stryMutAct_9fa48("2132")
            ? false
            : stryMutAct_9fa48("2131")
              ? true
              : (stryCov_9fa48("2131", "2132", "2133"),
                (stryMutAct_9fa48("2135")
                  ? cached === undefined
                  : stryMutAct_9fa48("2134")
                    ? true
                    : (stryCov_9fa48("2134", "2135"), cached !== undefined)) &&
                  isEntryForPort(cached, port))
      ) {
        if (stryMutAct_9fa48("2136")) {
          {
          }
        } else {
          stryCov_9fa48("2136");
          return cached.instance;
        }
      }
      if (
        stryMutAct_9fa48("2139")
          ? this.parent === undefined
          : stryMutAct_9fa48("2138")
            ? false
            : stryMutAct_9fa48("2137")
              ? true
              : (stryCov_9fa48("2137", "2138", "2139"), this.parent !== undefined)
      ) {
        if (stryMutAct_9fa48("2140")) {
          {
          }
        } else {
          stryCov_9fa48("2140");
          return this.parent.getIfPresent(port);
        }
      }
      return undefined;
    }
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
  *entries(): Iterable<[Port<unknown, string>, EntryMetadata]> {
    if (stryMutAct_9fa48("2141")) {
      {
      }
    } else {
      stryCov_9fa48("2141");
      for (const entry of this.creationOrder) {
        if (stryMutAct_9fa48("2142")) {
          {
          }
        } else {
          stryCov_9fa48("2142");
          yield stryMutAct_9fa48("2143")
            ? []
            : (stryCov_9fa48("2143"),
              [
                entry.port,
                stryMutAct_9fa48("2144")
                  ? {}
                  : (stryCov_9fa48("2144"),
                    {
                      resolvedAt: entry.resolvedAt,
                      resolutionOrder: entry.resolutionOrder,
                    }),
              ]);
        }
      }
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
    if (stryMutAct_9fa48("2145")) {
      {
      }
    } else {
      stryCov_9fa48("2145");
      return new MemoMap(this, this.config);
    }
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
  async dispose(): Promise<void> {
    if (stryMutAct_9fa48("2146")) {
      {
      }
    } else {
      stryCov_9fa48("2146");
      // Mark as disposed early to prevent new entries
      this.disposed = stryMutAct_9fa48("2147") ? false : (stryCov_9fa48("2147"), true);
      const errors: unknown[] = stryMutAct_9fa48("2148")
        ? ["Stryker was here"]
        : (stryCov_9fa48("2148"), []);

      // Iterate in reverse order (LIFO - last created first disposed)
      for (
        let i = stryMutAct_9fa48("2149")
          ? this.creationOrder.length + 1
          : (stryCov_9fa48("2149"), this.creationOrder.length - 1);
        stryMutAct_9fa48("2152")
          ? i < 0
          : stryMutAct_9fa48("2151")
            ? i > 0
            : stryMutAct_9fa48("2150")
              ? false
              : (stryCov_9fa48("2150", "2151", "2152"), i >= 0);
        stryMutAct_9fa48("2153") ? i++ : (stryCov_9fa48("2153"), i--)
      ) {
        if (stryMutAct_9fa48("2154")) {
          {
          }
        } else {
          stryCov_9fa48("2154");
          const entry = this.creationOrder[i];

          // With noUncheckedIndexedAccess, entry can be undefined
          if (
            stryMutAct_9fa48("2157")
              ? entry !== undefined || entry.finalizer !== undefined
              : stryMutAct_9fa48("2156")
                ? false
                : stryMutAct_9fa48("2155")
                  ? true
                  : (stryCov_9fa48("2155", "2156", "2157"),
                    (stryMutAct_9fa48("2159")
                      ? entry === undefined
                      : stryMutAct_9fa48("2158")
                        ? true
                        : (stryCov_9fa48("2158", "2159"), entry !== undefined)) &&
                      (stryMutAct_9fa48("2161")
                        ? entry.finalizer === undefined
                        : stryMutAct_9fa48("2160")
                          ? true
                          : (stryCov_9fa48("2160", "2161"), entry.finalizer !== undefined)))
          ) {
            if (stryMutAct_9fa48("2162")) {
              {
              }
            } else {
              stryCov_9fa48("2162");
              try {
                if (stryMutAct_9fa48("2163")) {
                  {
                  }
                } else {
                  stryCov_9fa48("2163");
                  // Await the finalizer (handles both sync and async)
                  await entry.finalizer(entry.instance);
                }
              } catch (error) {
                if (stryMutAct_9fa48("2164")) {
                  {
                  }
                } else {
                  stryCov_9fa48("2164");
                  // Collect error but continue disposing
                  errors.push(error);
                }
              }
            }
          }
        }
      }

      // Clear cache after disposal
      this.cache.clear();

      // Throw aggregated errors if any
      if (
        stryMutAct_9fa48("2168")
          ? errors.length <= 0
          : stryMutAct_9fa48("2167")
            ? errors.length >= 0
            : stryMutAct_9fa48("2166")
              ? false
              : stryMutAct_9fa48("2165")
                ? true
                : (stryCov_9fa48("2165", "2166", "2167", "2168"), errors.length > 0)
      ) {
        if (stryMutAct_9fa48("2169")) {
          {
          }
        } else {
          stryCov_9fa48("2169");
          throw new AggregateError(
            errors,
            stryMutAct_9fa48("2170")
              ? ``
              : (stryCov_9fa48("2170"), `${errors.length} finalizer(s) failed during disposal`)
          );
        }
      }
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
    if (stryMutAct_9fa48("2171")) {
      {
      }
    } else {
      stryCov_9fa48("2171");
      return this.disposed;
    }
  }
}
