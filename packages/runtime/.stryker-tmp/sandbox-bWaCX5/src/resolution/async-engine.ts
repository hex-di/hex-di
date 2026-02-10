/**
 * AsyncResolutionEngine - Handles asynchronous service resolution with deduplication.
 *
 * Encapsulates the async resolution logic:
 * - Lifetime-based caching (singleton, scoped, transient)
 * - Resolution deduplication (pending promise tracking)
 * - Hook invocation (beforeResolve/afterResolve)
 * - Async instance creation with dependency injection
 *
 * @packageDocumentation
 * @internal
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
import type { Lifetime } from "@hex-di/core";
import { MemoMap } from "../util/memo-map.js";
import { ResolutionContext } from "./context.js";
import { AsyncFactoryError, ContainerError } from "../errors/index.js";
import type { RuntimeAdapterFor } from "../container/internal-types.js";
import { HooksRunner, checkCacheHit } from "./hooks-runner.js";
import type { InheritanceMode } from "../types.js";
import { getMemoForLifetime, buildDependenciesAsync } from "./core.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Callback for resolving nested dependencies asynchronously.
 *
 * Returns `Promise<unknown>` because dependency values are stored in `Record<string, unknown>`
 * which is the factory's expected deps parameter type.
 *
 * @internal
 */
export type AsyncDependencyResolver = (
  port: Port<unknown, string>,
  scopedMemo: MemoMap,
  scopeId: string | null,
  scopeName?: string
) => Promise<unknown>;

// =============================================================================
// AsyncResolutionEngine Class
// =============================================================================

/**
 * Manages asynchronous service resolution with deduplication and lifetime caching.
 *
 * Key features:
 * - **Deduplication**: Concurrent resolutions for the same port/scope share a single promise
 * - **Lifetime caching**: Singleton and scoped instances are cached appropriately
 * - **Hook integration**: Supports beforeResolve/afterResolve hooks for DevTools
 *
 * @example
 * ```typescript
 * const engine = new AsyncResolutionEngine(
 *   singletonMemo,
 *   resolutionContext,
 *   hooksRunner,
 *   async (port, scopedMemo, scopeId) => container.resolveAsyncInternal(port, scopedMemo, scopeId)
 * );
 *
 * const service = await engine.resolve(port, adapter, scopedMemo, scopeId);
 * ```
 *
 * @internal
 */
export class AsyncResolutionEngine {
  /**
   * Tracks pending resolutions to deduplicate concurrent requests.
   * Outer map: port → inner map
   * Inner map: scopeId → promise
   */
  private readonly pendingResolutions: Map<
    Port<unknown, string>,
    Map<string | null, Promise<unknown>>
  > = new Map();

  /**
   * Creates a new AsyncResolutionEngine.
   *
   * @param singletonMemo - Cache for singleton-scoped instances
   * @param resolutionContext - Context for tracking resolution stack
   * @param hooksRunner - Optional hooks runner for DevTools integration
   * @param resolveDependency - Callback to resolve nested dependencies
   */
  constructor(
    private readonly singletonMemo: MemoMap,
    private readonly resolutionContext: ResolutionContext,
    private readonly hooksRunner: HooksRunner | null,
    private readonly resolveDependency: AsyncDependencyResolver
  ) {}

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Resolves a port to its service instance asynchronously.
   *
   * Handles:
   * - Cache hit detection and hook invocation
   * - Resolution deduplication for concurrent requests
   * - Lifetime-based caching
   *
   * @typeParam P - The port type being resolved
   * @param port - The port to resolve
   * @param adapter - The adapter that provides the service
   * @param scopedMemo - The scoped cache for the current resolution context
   * @param scopeId - The scope ID or null for container-level resolution
   * @param inheritanceMode - Inheritance mode for child container resolutions
   * @returns Promise resolving to the service instance with full type inference
   */
  resolve<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null,
    inheritanceMode: InheritanceMode | null = null,
    scopeName?: string
  ): Promise<InferService<P>> {
    if (stryMutAct_9fa48("1810")) {
      {
      }
    } else {
      stryCov_9fa48("1810");
      if (
        stryMutAct_9fa48("1813")
          ? this.hooksRunner !== null
          : stryMutAct_9fa48("1812")
            ? false
            : stryMutAct_9fa48("1811")
              ? true
              : (stryCov_9fa48("1811", "1812", "1813"), this.hooksRunner === null)
      ) {
        if (stryMutAct_9fa48("1814")) {
          {
          }
        } else {
          stryCov_9fa48("1814");
          return this.resolveCore(port, adapter, scopedMemo, scopeId, inheritanceMode, scopeName);
        }
      }
      const isCacheHit = checkCacheHit(port, adapter.lifetime, this.singletonMemo, scopedMemo);
      if (
        stryMutAct_9fa48("1816")
          ? false
          : stryMutAct_9fa48("1815")
            ? true
            : (stryCov_9fa48("1815", "1816"), isCacheHit)
      ) {
        if (stryMutAct_9fa48("1817")) {
          {
          }
        } else {
          stryCov_9fa48("1817");
          // For cache hits, run hooks around the cached resolution
          return this.hooksRunner.runAsync(
            port,
            adapter,
            scopeId,
            stryMutAct_9fa48("1818") ? false : (stryCov_9fa48("1818"), true),
            inheritanceMode,
            stryMutAct_9fa48("1819")
              ? () => undefined
              : (stryCov_9fa48("1819"),
                () =>
                  this.resolveCore(port, adapter, scopedMemo, scopeId, inheritanceMode, scopeName)),
            scopeName
          );
        }
      }

      // For non-cache hits, hooks are handled in createPendingResolutionPromise
      return this.resolveCore(port, adapter, scopedMemo, scopeId, inheritanceMode, scopeName);
    }
  }

  // ===========================================================================
  // Private Resolution Methods
  // ===========================================================================

  /**
   * Core async resolution with deduplication.
   */
  private resolveCore<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null,
    inheritanceMode: InheritanceMode | null,
    scopeName?: string
  ): Promise<InferService<P>> {
    if (stryMutAct_9fa48("1820")) {
      {
      }
    } else {
      stryCov_9fa48("1820");
      const memo = this.getMemoCached(adapter.lifetime, scopedMemo);
      const cached = stryMutAct_9fa48("1821")
        ? memo.getIfPresent(port)
        : (stryCov_9fa48("1821"), memo?.getIfPresent(port));
      if (
        stryMutAct_9fa48("1824")
          ? cached === undefined
          : stryMutAct_9fa48("1823")
            ? false
            : stryMutAct_9fa48("1822")
              ? true
              : (stryCov_9fa48("1822", "1823", "1824"), cached !== undefined)
      ) {
        if (stryMutAct_9fa48("1825")) {
          {
          }
        } else {
          stryCov_9fa48("1825");
          return Promise.resolve(cached as InferService<P>);
        }
      }

      // Check for pending resolution (deduplication)
      let scopePending = this.pendingResolutions.get(port);
      if (
        stryMutAct_9fa48("1828")
          ? scopePending !== undefined
          : stryMutAct_9fa48("1827")
            ? false
            : stryMutAct_9fa48("1826")
              ? true
              : (stryCov_9fa48("1826", "1827", "1828"), scopePending === undefined)
      ) {
        if (stryMutAct_9fa48("1829")) {
          {
          }
        } else {
          stryCov_9fa48("1829");
          scopePending = new Map();
          this.pendingResolutions.set(port, scopePending);
        }
      }
      const pending = scopePending.get(scopeId);
      if (
        stryMutAct_9fa48("1832")
          ? pending === undefined
          : stryMutAct_9fa48("1831")
            ? false
            : stryMutAct_9fa48("1830")
              ? true
              : (stryCov_9fa48("1830", "1831", "1832"), pending !== undefined)
      ) {
        if (stryMutAct_9fa48("1833")) {
          {
          }
        } else {
          stryCov_9fa48("1833");
          return pending as Promise<InferService<P>>;
        }
      }

      // Create new resolution promise
      const promise = this.createPendingResolutionPromise(
        port,
        adapter,
        scopedMemo,
        scopeId,
        memo,
        inheritanceMode,
        scopeName
      );
      scopePending.set(scopeId, promise);
      return promise;
    }
  }

  /**
   * Gets the appropriate memo for caching based on lifetime.
   *
   * Uses shared `getMemoForLifetime` utility for consistent lifetime handling.
   */
  private getMemoCached(lifetime: Lifetime, scopedMemo: MemoMap): MemoMap | null {
    if (stryMutAct_9fa48("1834")) {
      {
      }
    } else {
      stryCov_9fa48("1834");
      return getMemoForLifetime(lifetime, this.singletonMemo, scopedMemo);
    }
  }

  /**
   * Creates a pending resolution promise with hook wrapping and cleanup.
   */
  private createPendingResolutionPromise<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null,
    memo: MemoMap | null,
    inheritanceMode: InheritanceMode | null,
    scopeName?: string
  ): Promise<InferService<P>> {
    if (stryMutAct_9fa48("1835")) {
      {
      }
    } else {
      stryCov_9fa48("1835");
      const resolution = stryMutAct_9fa48("1836")
        ? () => undefined
        : (stryCov_9fa48("1836"),
          (() => {
            const resolution = () =>
              this.executeAsyncResolution(port, adapter, scopedMemo, scopeId, memo, scopeName);
            return resolution;
          })());

      // Wrap with hooks if enabled (isCacheHit=false for new resolutions)
      const promise = (
        stryMutAct_9fa48("1839")
          ? this.hooksRunner === null
          : stryMutAct_9fa48("1838")
            ? false
            : stryMutAct_9fa48("1837")
              ? true
              : (stryCov_9fa48("1837", "1838", "1839"), this.hooksRunner !== null)
      )
        ? this.hooksRunner.runAsync(
            port,
            adapter,
            scopeId,
            stryMutAct_9fa48("1840") ? true : (stryCov_9fa48("1840"), false),
            inheritanceMode,
            resolution,
            scopeName
          )
        : resolution();

      // Suppress unhandled rejection warnings
      promise.catch(() => {});

      // Setup cleanup on completion
      const cleanupPromise = promise.finally(
        stryMutAct_9fa48("1841")
          ? () => undefined
          : (stryCov_9fa48("1841"), () => this.cleanupPending(port, scopeId))
      );
      cleanupPromise.catch(() => {});
      return promise;
    }
  }

  /**
   * Executes the actual async resolution with optional memoization.
   */
  private executeAsyncResolution<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null,
    memo: MemoMap | null,
    scopeName?: string
  ): Promise<InferService<P>> {
    if (stryMutAct_9fa48("1842")) {
      {
      }
    } else {
      stryCov_9fa48("1842");
      const factory = stryMutAct_9fa48("1843")
        ? () => undefined
        : (stryCov_9fa48("1843"),
          (() => {
            const factory = () =>
              this.createInstanceAsync(port, adapter, scopedMemo, scopeId, scopeName);
            return factory;
          })());
      if (
        stryMutAct_9fa48("1846")
          ? memo === null
          : stryMutAct_9fa48("1845")
            ? false
            : stryMutAct_9fa48("1844")
              ? true
              : (stryCov_9fa48("1844", "1845", "1846"), memo !== null)
      ) {
        if (stryMutAct_9fa48("1847")) {
          {
          }
        } else {
          stryCov_9fa48("1847");
          return memo.getOrElseMemoizeAsync(port, factory, adapter.finalizer);
        }
      }
      return factory();
    }
  }

  /**
   * Cleans up pending resolution tracking after completion.
   */
  private cleanupPending(port: Port<unknown, string>, scopeId: string | null): void {
    if (stryMutAct_9fa48("1848")) {
      {
      }
    } else {
      stryCov_9fa48("1848");
      const currentPending = this.pendingResolutions.get(port);
      if (
        stryMutAct_9fa48("1850")
          ? false
          : stryMutAct_9fa48("1849")
            ? true
            : (stryCov_9fa48("1849", "1850"), currentPending)
      ) {
        if (stryMutAct_9fa48("1851")) {
          {
          }
        } else {
          stryCov_9fa48("1851");
          currentPending.delete(scopeId);
          if (
            stryMutAct_9fa48("1854")
              ? currentPending.size !== 0
              : stryMutAct_9fa48("1853")
                ? false
                : stryMutAct_9fa48("1852")
                  ? true
                  : (stryCov_9fa48("1852", "1853", "1854"), currentPending.size === 0)
          ) {
            if (stryMutAct_9fa48("1855")) {
              {
              }
            } else {
              stryCov_9fa48("1855");
              this.pendingResolutions.delete(port);
            }
          }
        }
      }
    }
  }

  /**
   * Creates a new instance asynchronously by resolving dependencies and calling the factory.
   *
   * Uses shared `buildDependenciesAsync` utility for consistent dependency resolution.
   * Dependencies are resolved concurrently for optimal performance.
   */
  private async createInstanceAsync<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null,
    scopeName?: string
  ): Promise<InferService<P>> {
    if (stryMutAct_9fa48("1856")) {
      {
      }
    } else {
      stryCov_9fa48("1856");
      const portName = port.__portName;
      this.resolutionContext.enter(portName);
      try {
        if (stryMutAct_9fa48("1857")) {
          {
          }
        } else {
          stryCov_9fa48("1857");
          const deps = await buildDependenciesAsync(
            adapter.requires,
            stryMutAct_9fa48("1858")
              ? () => undefined
              : (stryCov_9fa48("1858"),
                requiredPort =>
                  this.resolveDependency(requiredPort, scopedMemo, scopeId, scopeName))
          );
          const instance = await adapter.factory(deps);
          return instance;
        }
      } catch (e) {
        if (stryMutAct_9fa48("1859")) {
          {
          }
        } else {
          stryCov_9fa48("1859");
          if (
            stryMutAct_9fa48("1861")
              ? false
              : stryMutAct_9fa48("1860")
                ? true
                : (stryCov_9fa48("1860", "1861"), e instanceof ContainerError)
          ) {
            if (stryMutAct_9fa48("1862")) {
              {
              }
            } else {
              stryCov_9fa48("1862");
              throw e;
            }
          }
          throw new AsyncFactoryError(portName, e);
        }
      } finally {
        if (stryMutAct_9fa48("1863")) {
          {
          }
        } else {
          stryCov_9fa48("1863");
          this.resolutionContext.exit(portName);
        }
      }
    }
  }
}
