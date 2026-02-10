/**
 * Internal types for container implementation.
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
import type { Adapter, Lifetime, FactoryKind, AdapterConstraint } from "@hex-di/core";
import type { Graph } from "@hex-di/graph";
import type { ContainerOptions, ResolutionHooks } from "../resolution/hooks.js";
import type { MemoMap } from "../util/memo-map.js";
import type { InheritanceMode, RuntimePerformanceOptions } from "../types.js";
import { AsyncInitializationRequiredError } from "../errors/index.js";
import { ADAPTER_ACCESS } from "../inspection/symbols.js";

// =============================================================================
// Runtime Adapter Types
// =============================================================================

/**
 * Type alias for adapters at runtime.
 * Uses AdapterConstraint from @hex-di/graph for structural compatibility with Graph.adapters.
 */
export type RuntimeAdapter = AdapterConstraint;
export type RuntimeAdapterFor<P extends Port<unknown, string>> = Adapter<
  P,
  Port<unknown, string> | never,
  Lifetime,
  FactoryKind,
  boolean
>;

// =============================================================================
// Type Guards for Adapters
// =============================================================================

export function isAdapterForPort<P extends Port<unknown, string>>(
  adapter: RuntimeAdapter,
  port: P
): adapter is RuntimeAdapterFor<P> {
  if (stryMutAct_9fa48("735")) {
    {
    }
  } else {
    stryCov_9fa48("735");
    return stryMutAct_9fa48("738")
      ? adapter.provides !== port
      : stryMutAct_9fa48("737")
        ? false
        : stryMutAct_9fa48("736")
          ? true
          : (stryCov_9fa48("736", "737", "738"), adapter.provides === port);
  }
}
export function isAsyncAdapter<P extends Port<unknown, string>>(
  adapter: RuntimeAdapterFor<P>
): adapter is Adapter<P, Port<unknown, string> | never, Lifetime, "async"> {
  if (stryMutAct_9fa48("739")) {
    {
    }
  } else {
    stryCov_9fa48("739");
    return stryMutAct_9fa48("742")
      ? adapter.factoryKind !== "async"
      : stryMutAct_9fa48("741")
        ? false
        : stryMutAct_9fa48("740")
          ? true
          : (stryCov_9fa48("740", "741", "742"),
            adapter.factoryKind ===
              (stryMutAct_9fa48("743") ? "" : (stryCov_9fa48("743"), "async")));
  }
}
export function assertSyncAdapter<P extends Port<unknown, string>>(
  adapter: RuntimeAdapterFor<P>,
  portName: string
): asserts adapter is Adapter<P, Port<unknown, string> | never, Lifetime, "sync"> {
  if (stryMutAct_9fa48("744")) {
    {
    }
  } else {
    stryCov_9fa48("744");
    if (
      stryMutAct_9fa48("747")
        ? adapter.factoryKind !== "async"
        : stryMutAct_9fa48("746")
          ? false
          : stryMutAct_9fa48("745")
            ? true
            : (stryCov_9fa48("745", "746", "747"),
              adapter.factoryKind ===
                (stryMutAct_9fa48("748") ? "" : (stryCov_9fa48("748"), "async")))
    ) {
      if (stryMutAct_9fa48("749")) {
        {
        }
      } else {
        stryCov_9fa48("749");
        throw new AsyncInitializationRequiredError(portName);
      }
    }
  }
}

// =============================================================================
// Hooks State Types
// =============================================================================

export interface ParentStackEntry {
  readonly port: Port<unknown, string>;
  readonly startTime: number;
}
export interface HooksState {
  readonly hooks: ResolutionHooks;
  readonly parentStack: ParentStackEntry[];
}

// =============================================================================
// Forked Entry Types
// =============================================================================

export interface ForkedEntry<P extends Port<unknown, string>> {
  readonly port: P;
  readonly instance: InferService<P>;
}
export function isForkedEntryForPort<P extends Port<unknown, string>>(
  entry: ForkedEntry<Port<unknown, string>>,
  port: P
): entry is ForkedEntry<P> {
  if (stryMutAct_9fa48("750")) {
    {
    }
  } else {
    stryCov_9fa48("750");
    return stryMutAct_9fa48("753")
      ? entry.port !== port
      : stryMutAct_9fa48("752")
        ? false
        : stryMutAct_9fa48("751")
          ? true
          : (stryCov_9fa48("751", "752", "753"), entry.port === port);
  }
}

// =============================================================================
// Internal Access Type Guard
// =============================================================================

import type { InternalAccessible } from "../inspection/internal-state-types.js";
import { INTERNAL_ACCESS } from "../inspection/symbols.js";

/**
 * Type guard to check if a value is InternalAccessible.
 *
 * Used for runtime validation before type-safe casts when:
 * - Converting unknown containers to InternalAccessible in wrapper pattern
 * - Validating container types at runtime boundaries
 *
 * @param value - Value to check
 * @returns True if value has INTERNAL_ACCESS as a function
 *
 * @example
 * ```typescript
 * function getState(container: unknown): ContainerInternalState {
 *   if (!isInternalAccessible(container)) {
 *     throw new Error('Not a valid container');
 *   }
 *   return container[INTERNAL_ACCESS]();
 * }
 * ```
 */
export function isInternalAccessible(value: unknown): value is InternalAccessible {
  if (stryMutAct_9fa48("754")) {
    {
    }
  } else {
    stryCov_9fa48("754");
    return stryMutAct_9fa48("757")
      ? (value !== null && typeof value === "object" && INTERNAL_ACCESS in value) ||
          typeof (value as Record<symbol, unknown>)[INTERNAL_ACCESS] === "function"
      : stryMutAct_9fa48("756")
        ? false
        : stryMutAct_9fa48("755")
          ? true
          : (stryCov_9fa48("755", "756", "757"),
            (stryMutAct_9fa48("759")
              ? (value !== null && typeof value === "object") || INTERNAL_ACCESS in value
              : stryMutAct_9fa48("758")
                ? true
                : (stryCov_9fa48("758", "759"),
                  (stryMutAct_9fa48("761")
                    ? value !== null || typeof value === "object"
                    : stryMutAct_9fa48("760")
                      ? true
                      : (stryCov_9fa48("760", "761"),
                        (stryMutAct_9fa48("763")
                          ? value === null
                          : stryMutAct_9fa48("762")
                            ? true
                            : (stryCov_9fa48("762", "763"), value !== null)) &&
                          (stryMutAct_9fa48("765")
                            ? typeof value !== "object"
                            : stryMutAct_9fa48("764")
                              ? true
                              : (stryCov_9fa48("764", "765"),
                                typeof value ===
                                  (stryMutAct_9fa48("766")
                                    ? ""
                                    : (stryCov_9fa48("766"), "object")))))) &&
                    INTERNAL_ACCESS in value)) &&
              (stryMutAct_9fa48("768")
                ? typeof (value as Record<symbol, unknown>)[INTERNAL_ACCESS] !== "function"
                : stryMutAct_9fa48("767")
                  ? true
                  : (stryCov_9fa48("767", "768"),
                    typeof (value as Record<symbol, unknown>)[INTERNAL_ACCESS] ===
                      (stryMutAct_9fa48("769") ? "" : (stryCov_9fa48("769"), "function")))));
  }
}

/**
 * Safely casts a value to InternalAccessible after runtime validation.
 *
 * This consolidates the InternalAccessible cast pattern used in wrapper code.
 * Throws if the value is not a valid InternalAccessible container.
 *
 * @param value - Value to convert
 * @param context - Context string for error messages
 * @returns The value typed as InternalAccessible
 * @throws Error if value is not InternalAccessible
 */
export function asInternalAccessible(value: unknown, context: string): InternalAccessible {
  if (stryMutAct_9fa48("770")) {
    {
    }
  } else {
    stryCov_9fa48("770");
    if (
      stryMutAct_9fa48("773")
        ? false
        : stryMutAct_9fa48("772")
          ? true
          : stryMutAct_9fa48("771")
            ? isInternalAccessible(value)
            : (stryCov_9fa48("771", "772", "773"), !isInternalAccessible(value))
    ) {
      if (stryMutAct_9fa48("774")) {
        {
        }
      } else {
        stryCov_9fa48("774");
        throw new Error(
          stryMutAct_9fa48("775")
            ? ``
            : (stryCov_9fa48("775"), `${context}: Expected InternalAccessible container`)
        );
      }
    }
    return value;
  }
}

// =============================================================================
// Disposable Child Interface
// =============================================================================

export interface DisposableChild {
  dispose(): Promise<void>;
  readonly isDisposed: boolean;
}

// =============================================================================
// Parent Container Interface (for child containers)
// =============================================================================

export interface ParentContainerLike<
  TProvides extends Port<unknown, string>,
  _TAsyncPorts extends Port<unknown, string>,
> {
  resolveInternal: <P extends TProvides>(port: P) => InferService<P>;
  resolveAsyncInternal: <P extends TProvides>(port: P) => Promise<InferService<P>>;
  [ADAPTER_ACCESS]: (port: Port<unknown, string>) => RuntimeAdapter | undefined;
  registerChildContainer(child: DisposableChild): void;
  unregisterChildContainer(child: DisposableChild): void;
  originalParent: unknown;
  has(port: Port<unknown, string>): boolean;
  hasAdapter(port: Port<unknown, string>): boolean;
}

// =============================================================================
// Container Configuration Types
// =============================================================================

/**
 * Configuration for creating a root container from a Graph.
 */
export interface RootContainerConfig<
  TProvides extends Port<unknown, string>,
  _TAsyncPorts extends Port<unknown, string>,
> {
  kind: "root";
  graph: Graph<TProvides, Port<unknown, string>>;
  /**
   * Human-readable container name for DevTools display.
   */
  containerName: string;
  options?: ContainerOptions;
  /**
   * Performance-related options for runtime behavior.
   */
  performance?: RuntimePerformanceOptions;
}

/**
 * Configuration for creating a child container from a parent.
 */
export interface ChildContainerConfig<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
> {
  kind: "child";
  parent: ParentContainerLike<TProvides, TAsyncPorts>;
  overrides: ReadonlyMap<Port<unknown, string>, RuntimeAdapter>;
  extensions: ReadonlyMap<Port<unknown, string>, RuntimeAdapter>;
  inheritanceModes: ReadonlyMap<string, InheritanceMode>;
  /**
   * Unique identifier for this child container.
   * Used in hook context and DevTools tracking.
   */
  containerId: string;
  /**
   * Human-readable container name for DevTools display.
   */
  containerName: string;
  /**
   * Parent container's ID for hierarchy tracking.
   */
  parentContainerId: string;
  /**
   * Performance-related options for runtime behavior.
   */
  performance?: RuntimePerformanceOptions;
}
export type ContainerConfig<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
> = RootContainerConfig<TProvides, TAsyncPorts> | ChildContainerConfig<TProvides, TAsyncPorts>;

// =============================================================================
// Internal Container Methods Interface
// =============================================================================

/**
 * Internal methods shared by Container wrappers.
 * @internal
 */
export interface InternalContainerMethods<TProvides extends Port<unknown, string>> {
  resolveInternal: <P extends TProvides>(port: P) => InferService<P>;
  resolveAsyncInternal: <P extends TProvides>(port: P) => Promise<InferService<P>>;
  [ADAPTER_ACCESS]: (port: Port<unknown, string>) => RuntimeAdapter | undefined;
  registerChildContainer(child: DisposableChild): void;
  unregisterChildContainer(child: DisposableChild): void;
  hasAdapter(port: Port<unknown, string>): boolean;
}

/**
 * Interface for the methods ScopeImpl needs from Container implementations.
 * Using an interface allows proper type variance.
 * @internal
 */
export interface ScopeContainerAccess<TProvides extends Port<unknown, string>> {
  resolveInternal<P extends TProvides>(
    port: P,
    scopedMemo: MemoMap,
    scopeId?: string | null,
    scopeName?: string
  ): InferService<P>;
  resolveAsyncInternal<P extends TProvides>(
    port: P,
    scopedMemo: MemoMap,
    scopeId?: string | null,
    scopeName?: string
  ): Promise<InferService<P>>;
  getSingletonMemo(): MemoMap;
  has(port: Port<unknown, string>): boolean;
  hasAdapter(port: Port<unknown, string>): boolean;
}
