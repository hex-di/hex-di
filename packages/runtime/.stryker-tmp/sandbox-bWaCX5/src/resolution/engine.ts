/**
 * ResolutionEngine - Handles synchronous service resolution with lifetime caching.
 *
 * Encapsulates the core resolution logic:
 * - Lifetime-based caching (singleton, scoped, transient)
 * - Hook invocation (beforeResolve/afterResolve)
 * - Instance creation with dependency injection
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
import { MemoMap } from "../util/memo-map.js";
import { ResolutionContext } from "./context.js";
import { FactoryError, ContainerError } from "../errors/index.js";
import type { RuntimeAdapterFor } from "../container/internal-types.js";
import { assertSyncAdapter } from "../container/internal-types.js";
import { HooksRunner, checkCacheHit } from "./hooks-runner.js";
import type { InheritanceMode } from "../types.js";
import { resolveWithMemo, buildDependencies } from "./core.js";

// Note: MemoMap is still needed as a parameter type

// =============================================================================
// Types
// =============================================================================

/**
 * Callback for resolving nested dependencies.
 *
 * Returns `unknown` because dependency values are stored in `Record<string, unknown>`
 * which is the factory's expected deps parameter type. The factory knows how to
 * extract the correct types from this record.
 *
 * This matches the container's `resolveInternal(port: Port<unknown, string>): unknown` overload.
 *
 * @internal
 */
export type SyncDependencyResolver = (
  port: Port<unknown, string>,
  scopedMemo: MemoMap,
  scopeId: string | null,
  scopeName?: string
) => unknown;

// =============================================================================
// ResolutionEngine Class
// =============================================================================

/**
 * Manages synchronous service resolution with lifetime-based caching.
 *
 * This class encapsulates the resolution algorithm:
 * 1. Check hooks configuration and invoke beforeResolve if enabled
 * 2. Check cache based on lifetime (singleton → singletonMemo, scoped → scopedMemo)
 * 3. Create instance if not cached, resolving dependencies recursively
 * 4. Store in appropriate cache if applicable
 * 5. Invoke afterResolve hook if enabled
 *
 * @example
 * ```typescript
 * const engine = new ResolutionEngine(
 *   singletonMemo,
 *   resolutionContext,
 *   hooksRunner,
 *   (port, scopedMemo, scopeId) => container.resolveInternal(port, scopedMemo, scopeId)
 * );
 *
 * const service = engine.resolve(port, adapter, scopedMemo, scopeId);
 * ```
 *
 * @internal
 */
export class ResolutionEngine {
  /**
   * Creates a new ResolutionEngine.
   *
   * @param singletonMemo - Cache for singleton-scoped instances
   * @param resolutionContext - Context for tracking resolution stack (cycle detection)
   * @param hooksRunner - Optional hooks runner for DevTools integration
   * @param resolveDependency - Callback to resolve nested dependencies
   */
  constructor(
    private readonly singletonMemo: MemoMap,
    private readonly resolutionContext: ResolutionContext,
    private readonly hooksRunner: HooksRunner | null,
    private readonly resolveDependency: SyncDependencyResolver
  ) {}

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Resolves a port to its service instance using the provided adapter.
   *
   * Handles lifetime-based caching and hook invocation.
   *
   * @typeParam P - The port type being resolved
   * @param port - The port to resolve
   * @param adapter - The adapter that provides the service
   * @param scopedMemo - The scoped cache for the current resolution context
   * @param scopeId - The scope ID or null for container-level resolution
   * @param inheritanceMode - Inheritance mode for child container resolutions
   * @returns The resolved service instance with full type inference
   */
  resolve<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null,
    inheritanceMode: InheritanceMode | null = null,
    scopeName?: string
  ): InferService<P> {
    if (stryMutAct_9fa48("1898")) {
      {
      }
    } else {
      stryCov_9fa48("1898");
      if (
        stryMutAct_9fa48("1901")
          ? this.hooksRunner !== null
          : stryMutAct_9fa48("1900")
            ? false
            : stryMutAct_9fa48("1899")
              ? true
              : (stryCov_9fa48("1899", "1900", "1901"), this.hooksRunner === null)
      ) {
        if (stryMutAct_9fa48("1902")) {
          {
          }
        } else {
          stryCov_9fa48("1902");
          return this.resolveCore(port, adapter, scopedMemo, scopeId, scopeName);
        }
      }
      const isCacheHit = checkCacheHit(port, adapter.lifetime, this.singletonMemo, scopedMemo);
      return this.hooksRunner.runSync(
        port,
        adapter,
        scopeId,
        isCacheHit,
        inheritanceMode,
        stryMutAct_9fa48("1903")
          ? () => undefined
          : (stryCov_9fa48("1903"),
            () => this.resolveCore(port, adapter, scopedMemo, scopeId, scopeName)),
        scopeName
      );
    }
  }

  // ===========================================================================
  // Private Resolution Methods
  // ===========================================================================

  /**
   * Core resolution logic with lifetime-based caching.
   *
   * Uses shared `resolveWithMemo` utility for consistent lifetime handling.
   */
  private resolveCore<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null,
    scopeName?: string
  ): InferService<P> {
    if (stryMutAct_9fa48("1904")) {
      {
      }
    } else {
      stryCov_9fa48("1904");
      return resolveWithMemo(
        port,
        adapter.lifetime,
        this.singletonMemo,
        scopedMemo,
        stryMutAct_9fa48("1905")
          ? () => undefined
          : (stryCov_9fa48("1905"),
            () => this.createInstance(port, adapter, scopedMemo, scopeId, scopeName)),
        adapter.finalizer
      );
    }
  }

  /**
   * Creates a new instance by resolving dependencies and calling the factory.
   *
   * Uses shared `buildDependencies` utility for consistent dependency resolution.
   */
  private createInstance<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null,
    scopeName?: string
  ): InferService<P> {
    if (stryMutAct_9fa48("1906")) {
      {
      }
    } else {
      stryCov_9fa48("1906");
      const portName = port.__portName;
      this.resolutionContext.enter(portName);
      try {
        if (stryMutAct_9fa48("1907")) {
          {
          }
        } else {
          stryCov_9fa48("1907");
          assertSyncAdapter(adapter, portName);
          try {
            if (stryMutAct_9fa48("1908")) {
              {
              }
            } else {
              stryCov_9fa48("1908");
              const deps = buildDependencies(
                adapter.requires,
                stryMutAct_9fa48("1909")
                  ? () => undefined
                  : (stryCov_9fa48("1909"),
                    requiredPort =>
                      this.resolveDependency(requiredPort, scopedMemo, scopeId, scopeName))
              );
              return adapter.factory(deps);
            }
          } catch (e) {
            if (stryMutAct_9fa48("1910")) {
              {
              }
            } else {
              stryCov_9fa48("1910");
              if (
                stryMutAct_9fa48("1912")
                  ? false
                  : stryMutAct_9fa48("1911")
                    ? true
                    : (stryCov_9fa48("1911", "1912"), e instanceof ContainerError)
              ) {
                if (stryMutAct_9fa48("1913")) {
                  {
                  }
                } else {
                  stryCov_9fa48("1913");
                  throw e;
                }
              }
              throw new FactoryError(portName, e);
            }
          }
        }
      } finally {
        if (stryMutAct_9fa48("1914")) {
          {
          }
        } else {
          stryCov_9fa48("1914");
          this.resolutionContext.exit(portName);
        }
      }
    }
  }
}
