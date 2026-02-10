/**
 * HooksRunner - Encapsulates resolution hook execution.
 *
 * Manages beforeResolve/afterResolve hook invocation with parent stack
 * tracking for DevTools integration. When hooks are not provided, the
 * resolution path bypasses this class entirely for zero overhead.
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
import type { Port } from "@hex-di/core";
import type { Lifetime } from "@hex-di/core";
import type { ResolutionHooks, ResolutionHookContext, ContainerKind } from "./hooks.js";
import type { InheritanceMode } from "../types.js";
import type { MemoMap } from "../util/memo-map.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Minimal adapter info needed for hook context.
 * @internal
 */
interface AdapterInfo {
  readonly lifetime: Lifetime;
}

/**
 * Container metadata for resolution context.
 * Provides information about which container is resolving.
 * @internal
 */
export interface ContainerMetadata {
  /** Unique ID of the container (e.g., "root", "child-123") */
  readonly containerId: string;

  /** Kind of container: "root", "child", "lazy", or "scope" */
  readonly containerKind: ContainerKind;

  /** ID of parent container, null for root */
  readonly parentContainerId: string | null;
}

/**
 * Resolution metadata for inheritance tracking.
 * @internal
 */
export interface ResolutionMetadata {
  /** Inheritance mode for this port, null if not from parent */
  readonly inheritanceMode: InheritanceMode | null;
}

// =============================================================================
// Mutable context type used internally
// =============================================================================

/**
 * Internal mutable version of ResolutionHookContext.
 * The public interface is readonly, but we mutate in-place to avoid spreading.
 * @internal
 */
interface MutableHookContext {
  port: Port<unknown, string>;
  portName: string;
  lifetime: Lifetime;
  scopeId: string | null;
  scopeName: string | undefined;
  parentPort: Port<unknown, string> | null;
  isCacheHit: boolean;
  depth: number;
  containerId: string;
  containerKind: ContainerKind;
  inheritanceMode: InheritanceMode | null;
  parentContainerId: string | null;
  duration: number;
  error: Error | null;
  result?: unknown;
}

// =============================================================================
// HooksRunner Class
// =============================================================================

/**
 * Manages resolution hook execution with parent stack tracking.
 *
 * This class encapsulates all hook-related logic:
 * - Creating ResolutionHookContext from port/adapter/scope info
 * - Managing the parentStack for nested dependency tracking
 * - Timing resolutions and emitting afterResolve with duration/error
 *
 * @example
 * ```typescript
 * const runner = new HooksRunner(hooks);
 *
 * // Sync resolution with hooks
 * const result = runner.runSync(port, adapter, scopeId, isCacheHit, () => {
 *   return resolveCore(port, adapter);
 * });
 *
 * // Async resolution with hooks
 * const asyncResult = await runner.runAsync(port, adapter, scopeId, isCacheHit, async () => {
 *   return resolveAsyncCore(port, adapter);
 * });
 * ```
 *
 * @internal
 */
export class HooksRunner {
  /**
   * Parallel arrays for parent stack tracking.
   * Avoids allocating ParentStackEntry objects per resolution.
   */
  private readonly _parentPorts: Port<unknown, string>[] = stryMutAct_9fa48("1915")
    ? ["Stryker was here"]
    : (stryCov_9fa48("1915"), []);
  private readonly _parentStartTimes: number[] = stryMutAct_9fa48("1916")
    ? ["Stryker was here"]
    : (stryCov_9fa48("1916"), []);

  /**
   * Creates a new HooksRunner instance.
   *
   * @param hooks - Resolution hooks to invoke. Both beforeResolve and afterResolve are optional.
   * @param containerMetadata - Metadata about the container (id, kind, parentId)
   */
  constructor(
    private readonly hooks: ResolutionHooks,
    private readonly containerMetadata: ContainerMetadata
  ) {}

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Runs a synchronous action with hook invocation.
   *
   * Calls beforeResolve (if provided), executes the action, then calls
   * afterResolve (if provided) with timing and error info.
   *
   * @param port - The port being resolved
   * @param adapter - Adapter info (for lifetime)
   * @param scopeId - Scope ID or null for container-level
   * @param isCacheHit - Whether this resolution will be served from cache
   * @param inheritanceMode - Inheritance mode for this port (for child containers)
   * @param action - The actual resolution action to execute
   * @returns The result of the action
   */
  runSync<T>(
    port: Port<unknown, string>,
    adapter: AdapterInfo,
    scopeId: string | null,
    isCacheHit: boolean,
    inheritanceMode: InheritanceMode | null,
    action: () => T,
    scopeName?: string
  ): T {
    if (stryMutAct_9fa48("1917")) {
      {
      }
    } else {
      stryCov_9fa48("1917");
      const context = this._createContext(
        port,
        adapter,
        scopeId,
        isCacheHit,
        inheritanceMode,
        scopeName
      );
      if (
        stryMutAct_9fa48("1920")
          ? this.hooks.beforeResolve === undefined
          : stryMutAct_9fa48("1919")
            ? false
            : stryMutAct_9fa48("1918")
              ? true
              : (stryCov_9fa48("1918", "1919", "1920"), this.hooks.beforeResolve !== undefined)
      ) {
        if (stryMutAct_9fa48("1921")) {
          {
          }
        } else {
          stryCov_9fa48("1921");
          this.hooks.beforeResolve(context);
        }
      }
      const startTime = Date.now();
      this._parentPorts.push(port);
      this._parentStartTimes.push(startTime);
      let error: Error | null = null;
      try {
        if (stryMutAct_9fa48("1922")) {
          {
          }
        } else {
          stryCov_9fa48("1922");
          const result = action();
          context.result = result;
          return result;
        }
      } catch (e) {
        if (stryMutAct_9fa48("1923")) {
          {
          }
        } else {
          stryCov_9fa48("1923");
          error = e instanceof Error ? e : new Error(String(e));
          throw e;
        }
      } finally {
        if (stryMutAct_9fa48("1924")) {
          {
          }
        } else {
          stryCov_9fa48("1924");
          this._emitAfterResolve(context, startTime, error);
        }
      }
    }
  }

  /**
   * Runs an asynchronous action with hook invocation.
   *
   * Calls beforeResolve (if provided), executes the async action, then calls
   * afterResolve (if provided) with timing and error info.
   *
   * @param port - The port being resolved
   * @param adapter - Adapter info (for lifetime)
   * @param scopeId - Scope ID or null for container-level
   * @param isCacheHit - Whether this resolution will be served from cache
   * @param inheritanceMode - Inheritance mode for this port (for child containers)
   * @param action - The async resolution action to execute
   * @returns Promise resolving to the result of the action
   */
  runAsync<T>(
    port: Port<unknown, string>,
    adapter: AdapterInfo,
    scopeId: string | null,
    isCacheHit: boolean,
    inheritanceMode: InheritanceMode | null,
    action: () => Promise<T>,
    scopeName?: string
  ): Promise<T> {
    if (stryMutAct_9fa48("1925")) {
      {
      }
    } else {
      stryCov_9fa48("1925");
      const context = this._createContext(
        port,
        adapter,
        scopeId,
        isCacheHit,
        inheritanceMode,
        scopeName
      );
      if (
        stryMutAct_9fa48("1928")
          ? this.hooks.beforeResolve === undefined
          : stryMutAct_9fa48("1927")
            ? false
            : stryMutAct_9fa48("1926")
              ? true
              : (stryCov_9fa48("1926", "1927", "1928"), this.hooks.beforeResolve !== undefined)
      ) {
        if (stryMutAct_9fa48("1929")) {
          {
          }
        } else {
          stryCov_9fa48("1929");
          this.hooks.beforeResolve(context);
        }
      }
      const startTime = Date.now();
      this._parentPorts.push(port);
      this._parentStartTimes.push(startTime);
      let error: Error | null = null;
      return action()
        .then(result => {
          if (stryMutAct_9fa48("1930")) {
            {
            }
          } else {
            stryCov_9fa48("1930");
            context.result = result;
            return result;
          }
        })
        .catch(err => {
          if (stryMutAct_9fa48("1931")) {
            {
            }
          } else {
            stryCov_9fa48("1931");
            error = err instanceof Error ? err : new Error(String(err));
            throw err;
          }
        })
        .finally(() => {
          if (stryMutAct_9fa48("1932")) {
            {
            }
          } else {
            stryCov_9fa48("1932");
            this._emitAfterResolve(context, startTime, error);
          }
        });
    }
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /**
   * Creates the resolution hook context from current state.
   * Initializes duration=0 and error=null for later in-place mutation.
   */
  private _createContext(
    port: Port<unknown, string>,
    adapter: AdapterInfo,
    scopeId: string | null,
    isCacheHit: boolean,
    inheritanceMode: InheritanceMode | null,
    scopeName?: string
  ): MutableHookContext {
    if (stryMutAct_9fa48("1933")) {
      {
      }
    } else {
      stryCov_9fa48("1933");
      const len = this._parentPorts.length;
      const parentPort = (
        stryMutAct_9fa48("1937")
          ? len <= 0
          : stryMutAct_9fa48("1936")
            ? len >= 0
            : stryMutAct_9fa48("1935")
              ? false
              : stryMutAct_9fa48("1934")
                ? true
                : (stryCov_9fa48("1934", "1935", "1936", "1937"), len > 0)
      )
        ? this._parentPorts[stryMutAct_9fa48("1938") ? len + 1 : (stryCov_9fa48("1938"), len - 1)]
        : null;
      return stryMutAct_9fa48("1939")
        ? {}
        : (stryCov_9fa48("1939"),
          {
            port,
            portName: port.__portName,
            lifetime: adapter.lifetime,
            scopeId,
            scopeName,
            parentPort: stryMutAct_9fa48("1940")
              ? parentPort && null
              : (stryCov_9fa48("1940"), parentPort ?? null),
            isCacheHit,
            depth: len,
            containerId: this.containerMetadata.containerId,
            containerKind: this.containerMetadata.containerKind,
            inheritanceMode,
            parentContainerId: this.containerMetadata.parentContainerId,
            duration: 0,
            error: null,
          });
    }
  }

  /**
   * Emits the afterResolve hook by mutating context in-place (no spread).
   */
  private _emitAfterResolve(
    context: MutableHookContext,
    startTime: number,
    error: Error | null
  ): void {
    if (stryMutAct_9fa48("1941")) {
      {
      }
    } else {
      stryCov_9fa48("1941");
      this._parentPorts.pop();
      this._parentStartTimes.pop();
      if (
        stryMutAct_9fa48("1944")
          ? this.hooks.afterResolve === undefined
          : stryMutAct_9fa48("1943")
            ? false
            : stryMutAct_9fa48("1942")
              ? true
              : (stryCov_9fa48("1942", "1943", "1944"), this.hooks.afterResolve !== undefined)
      ) {
        if (stryMutAct_9fa48("1945")) {
          {
          }
        } else {
          stryCov_9fa48("1945");
          // Mutate in-place instead of creating new object via spread
          context.duration = stryMutAct_9fa48("1946")
            ? Date.now() + startTime
            : (stryCov_9fa48("1946"), Date.now() - startTime);
          context.error = error;
          this.hooks.afterResolve(context as ResolutionHookContext);
        }
      }
    }
  }
}

// =============================================================================
// Static Helpers
// =============================================================================

/**
 * Checks if a port's instance is already cached based on lifetime.
 *
 * @param port - The port to check
 * @param lifetime - The adapter's lifetime
 * @param singletonMemo - Container's singleton cache
 * @param scopedMemo - Current scope's cache
 * @returns true if the instance is already cached
 *
 * @internal
 */
export function checkCacheHit(
  port: Port<unknown, string>,
  lifetime: Lifetime,
  singletonMemo: MemoMap,
  scopedMemo: MemoMap
): boolean {
  if (stryMutAct_9fa48("1947")) {
    {
    }
  } else {
    stryCov_9fa48("1947");
    switch (lifetime) {
      case stryMutAct_9fa48("1949") ? "" : (stryCov_9fa48("1949"), "singleton"):
        if (stryMutAct_9fa48("1948")) {
        } else {
          stryCov_9fa48("1948");
          return singletonMemo.has(port);
        }
      case stryMutAct_9fa48("1951") ? "" : (stryCov_9fa48("1951"), "scoped"):
        if (stryMutAct_9fa48("1950")) {
        } else {
          stryCov_9fa48("1950");
          return scopedMemo.has(port);
        }
      case stryMutAct_9fa48("1953") ? "" : (stryCov_9fa48("1953"), "transient"):
        if (stryMutAct_9fa48("1952")) {
        } else {
          stryCov_9fa48("1952");
          return stryMutAct_9fa48("1954") ? true : (stryCov_9fa48("1954"), false);
        }
      default:
        if (stryMutAct_9fa48("1955")) {
        } else {
          stryCov_9fa48("1955");
          return stryMutAct_9fa48("1956") ? true : (stryCov_9fa48("1956"), false);
        }
    }
  }
}
