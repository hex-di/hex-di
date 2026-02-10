/**
 * Base container implementation with shared logic.
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
import { MemoMap, type MemoMapConfig } from "../util/memo-map.js";
import { ResolutionContext } from "../resolution/context.js";
import type { ScopeImpl } from "../scope/impl.js";
import {
  DisposedScopeError,
  ScopeRequiredError,
  AsyncInitializationRequiredError,
} from "../errors/index.js";
import type { ContainerInternalState } from "../inspection/internal-state-types.js";
import { INTERNAL_ACCESS } from "../inspection/symbols.js";
import type { RuntimeAdapter, RuntimeAdapterFor, DisposableChild } from "./internal-types.js";
import { isAdapterForPort, asInternalAccessible } from "./internal-types.js";
import { HooksRunner } from "../resolution/hooks-runner.js";
import { LifecycleManager } from "./internal/lifecycle-manager.js";
import { ResolutionEngine } from "../resolution/engine.js";
import { AsyncResolutionEngine } from "../resolution/async-engine.js";
import { AsyncInitializer } from "./internal/async-initializer.js";
import { AdapterRegistry } from "./internal/adapter-registry.js";
import { createMemoMapSnapshot } from "./helpers.js";
import { consumeLazyFlag } from "./lazy-impl.js";
import type { InspectorAPI } from "../inspection/types.js";

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Checks if an object has an inspector property with emit capability.
 * Uses structural checks with `in` operator — no type casts needed.
 * @internal
 */
interface HasInspector {
  readonly inspector: InspectorAPI;
}
function hasInspector(obj: unknown): obj is HasInspector {
  if (stryMutAct_9fa48("0")) {
    {
    }
  } else {
    stryCov_9fa48("0");
    if (
      stryMutAct_9fa48("3")
        ? (typeof obj !== "object" || obj === null) && !("inspector" in obj)
        : stryMutAct_9fa48("2")
          ? false
          : stryMutAct_9fa48("1")
            ? true
            : (stryCov_9fa48("1", "2", "3"),
              (stryMutAct_9fa48("5")
                ? typeof obj !== "object" && obj === null
                : stryMutAct_9fa48("4")
                  ? false
                  : (stryCov_9fa48("4", "5"),
                    (stryMutAct_9fa48("7")
                      ? typeof obj === "object"
                      : stryMutAct_9fa48("6")
                        ? false
                        : (stryCov_9fa48("6", "7"),
                          typeof obj !==
                            (stryMutAct_9fa48("8") ? "" : (stryCov_9fa48("8"), "object")))) ||
                      (stryMutAct_9fa48("10")
                        ? obj !== null
                        : stryMutAct_9fa48("9")
                          ? false
                          : (stryCov_9fa48("9", "10"), obj === null)))) ||
                (stryMutAct_9fa48("11")
                  ? "inspector" in obj
                  : (stryCov_9fa48("11"),
                    !((stryMutAct_9fa48("12") ? "" : (stryCov_9fa48("12"), "inspector")) in obj))))
    ) {
      if (stryMutAct_9fa48("13")) {
        {
        }
      } else {
        stryCov_9fa48("13");
        return stryMutAct_9fa48("14") ? true : (stryCov_9fa48("14"), false);
      }
    }
    const { inspector } = obj;
    return stryMutAct_9fa48("17")
      ? (typeof inspector === "object" && inspector !== null && "subscribe" in inspector) ||
          "emit" in inspector
      : stryMutAct_9fa48("16")
        ? false
        : stryMutAct_9fa48("15")
          ? true
          : (stryCov_9fa48("15", "16", "17"),
            (stryMutAct_9fa48("19")
              ? (typeof inspector === "object" && inspector !== null) || "subscribe" in inspector
              : stryMutAct_9fa48("18")
                ? true
                : (stryCov_9fa48("18", "19"),
                  (stryMutAct_9fa48("21")
                    ? typeof inspector === "object" || inspector !== null
                    : stryMutAct_9fa48("20")
                      ? true
                      : (stryCov_9fa48("20", "21"),
                        (stryMutAct_9fa48("23")
                          ? typeof inspector !== "object"
                          : stryMutAct_9fa48("22")
                            ? true
                            : (stryCov_9fa48("22", "23"),
                              typeof inspector ===
                                (stryMutAct_9fa48("24") ? "" : (stryCov_9fa48("24"), "object")))) &&
                          (stryMutAct_9fa48("26")
                            ? inspector === null
                            : stryMutAct_9fa48("25")
                              ? true
                              : (stryCov_9fa48("25", "26"), inspector !== null)))) &&
                    (stryMutAct_9fa48("27") ? "" : (stryCov_9fa48("27"), "subscribe")) in
                      inspector)) &&
              (stryMutAct_9fa48("28") ? "" : (stryCov_9fa48("28"), "emit")) in inspector);
  }
}

/**
 * Abstract base class for container implementations.
 *
 * Provides shared functionality for both root and child containers:
 * - Resolution delegation (via ResolutionEngine, AsyncResolutionEngine)
 * - Lifecycle management (disposal, child registration)
 * - DevTools state access
 *
 * @typeParam TProvides - Union of Port types available from the container's graph or parent.
 *   For root containers, this comes from the Graph type. For child containers, this is
 *   the effective provides union from the parent (`ParentProvides | ParentExtends`).
 *
 * @typeParam TExtends - Union of Port types added via child graph extensions.
 *   Always `never` for root containers. For child containers, this represents ports
 *   that were added by the child graph but were not present in the parent.
 *
 * @typeParam TAsyncPorts - Union of Port types that have async factory functions.
 *   Used to track which ports require async initialization before sync resolution.
 *
 * @remarks
 * **Implementation Architecture:**
 * - Subclasses: `RootContainerImpl` and `ChildContainerImpl`
 * - Resolution engines handle the actual factory execution and caching
 * - Lifecycle manager handles disposal and child/scope tracking
 * - Adapter registry provides port-to-adapter lookups with inheritance support
 *
 * **Protected Methods for Subclasses:**
 * - `onWrapperSet()`: Called when the public wrapper is assigned
 * - `resolveWithInheritance()`: Child containers implement parent delegation
 * - `resolveInternalFallback()`: Fallback resolution for ports not found locally
 * - `getParentUnregisterCallback()`: Cleanup callback for disposal
 *
 * @internal This class is not exported from the public API. Users interact with
 * the `Container` type, not this implementation class.
 */
export abstract class BaseContainerImpl<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
> {
  // Core state
  protected readonly adapterRegistry: AdapterRegistry<TProvides, TAsyncPorts>;
  protected readonly singletonMemo: MemoMap;
  protected readonly resolutionContext: ResolutionContext;
  protected readonly lifecycleManager: LifecycleManager;
  protected readonly asyncInitializer: AsyncInitializer;
  protected readonly resolutionEngine: ResolutionEngine;
  protected readonly asyncResolutionEngine: AsyncResolutionEngine;
  protected readonly hooksRunner: HooksRunner | null;
  protected wrapper: unknown = null;

  /**
   * Whether this is a root container (true) or child container (false).
   */
  protected abstract readonly isRoot: boolean;

  /**
   * Returns the human-readable container name for DevTools display.
   */
  protected abstract getContainerName(): string;
  protected constructor(
    adapterRegistry: AdapterRegistry<TProvides, TAsyncPorts>,
    hooksRunner: HooksRunner | null,
    memoMapConfig?: MemoMapConfig
  ) {
    if (stryMutAct_9fa48("29")) {
      {
      }
    } else {
      stryCov_9fa48("29");
      this.adapterRegistry = adapterRegistry;
      this.singletonMemo = new MemoMap(undefined, memoMapConfig);
      this.resolutionContext = new ResolutionContext();
      this.lifecycleManager = new LifecycleManager();
      this.asyncInitializer = new AsyncInitializer();
      this.hooksRunner = hooksRunner;

      // Initialize resolution engines with dependency resolver callbacks
      this.resolutionEngine = new ResolutionEngine(
        this.singletonMemo,
        this.resolutionContext,
        this.hooksRunner,
        stryMutAct_9fa48("30")
          ? () => undefined
          : (stryCov_9fa48("30"),
            (port, scopedMemo, scopeId, scopeName) =>
              this.resolveInternal(port, scopedMemo, scopeId, scopeName))
      );
      this.asyncResolutionEngine = new AsyncResolutionEngine(
        this.singletonMemo,
        this.resolutionContext,
        this.hooksRunner,
        stryMutAct_9fa48("31")
          ? () => undefined
          : (stryCov_9fa48("31"),
            (port, scopedMemo, scopeId, scopeName) =>
              this.resolveAsyncInternal(port, scopedMemo, scopeId, scopeName))
      );
    }
  }

  // ===========================================================================
  // Abstract Methods (implemented by Root/Child)
  // ===========================================================================

  /**
   * Called when setting the wrapper to handle parent registration.
   */
  protected abstract onWrapperSet(wrapper: unknown): void;

  /**
   * Resolves a port that should use inheritance (child containers only).
   * Root containers should throw.
   */
  protected abstract resolveWithInheritance<P extends TProvides | TExtends>(
    port: P
  ): InferService<P>;

  /**
   * Gets the original parent container (for getParent()).
   */
  abstract getParent(): unknown;

  /**
   * Initializes async adapters (root containers only).
   * Child containers should throw.
   */
  abstract initialize(): Promise<void>;

  /**
   * Handles unregistration from parent during disposal.
   */
  protected abstract getParentUnregisterCallback(): (() => void) | undefined;

  /**
   * Resolves internal for child containers when port not found locally.
   */
  protected abstract resolveInternalFallback(
    port: Port<unknown, string>,
    portName: string
  ): unknown;

  /**
   * Resolves async internal for child containers when port not found locally.
   */
  protected abstract resolveAsyncInternalFallback(port: Port<unknown, string>): Promise<unknown>;

  // ===========================================================================
  // Public API
  // ===========================================================================

  setWrapper(wrapper: unknown): void {
    if (stryMutAct_9fa48("32")) {
      {
      }
    } else {
      stryCov_9fa48("32");
      this.wrapper = wrapper;
      this.onWrapperSet(wrapper);
    }
  }
  getWrapper(): unknown {
    if (stryMutAct_9fa48("33")) {
      {
      }
    } else {
      stryCov_9fa48("33");
      return this.wrapper;
    }
  }
  get isDisposed(): boolean {
    if (stryMutAct_9fa48("34")) {
      {
      }
    } else {
      stryCov_9fa48("34");
      return this.lifecycleManager.isDisposed;
    }
  }
  get isInitialized(): boolean {
    if (stryMutAct_9fa48("35")) {
      {
      }
    } else {
      stryCov_9fa48("35");
      return this.asyncInitializer.isInitialized;
    }
  }
  registerChildContainer(child: DisposableChild): void {
    if (stryMutAct_9fa48("36")) {
      {
      }
    } else {
      stryCov_9fa48("36");
      // Extract child inspector if available
      const childInspector = hasInspector(child) ? child.inspector : undefined;

      // Register child and get assigned ID
      const childId = this.lifecycleManager.registerChildContainer(child, childInspector);

      // Emit child-created event from parent's inspector
      if (
        stryMutAct_9fa48("38")
          ? false
          : stryMutAct_9fa48("37")
            ? true
            : (stryCov_9fa48("37", "38"), hasInspector(this.wrapper))
      ) {
        if (stryMutAct_9fa48("39")) {
          {
          }
        } else {
          stryCov_9fa48("39");
          const { inspector: parentInspector } = this.wrapper;
          if (
            stryMutAct_9fa48("42")
              ? parentInspector.emit === undefined
              : stryMutAct_9fa48("41")
                ? false
                : stryMutAct_9fa48("40")
                  ? true
                  : (stryCov_9fa48("40", "41", "42"), parentInspector.emit !== undefined)
          ) {
            if (stryMutAct_9fa48("43")) {
              {
              }
            } else {
              stryCov_9fa48("43");
              const childKind: "child" | "lazy" = consumeLazyFlag()
                ? stryMutAct_9fa48("44")
                  ? ""
                  : (stryCov_9fa48("44"), "lazy")
                : stryMutAct_9fa48("45")
                  ? ""
                  : (stryCov_9fa48("45"), "child");
              parentInspector.emit(
                stryMutAct_9fa48("46")
                  ? {}
                  : (stryCov_9fa48("46"),
                    {
                      type: stryMutAct_9fa48("47") ? "" : (stryCov_9fa48("47"), "child-created"),
                      childId: String(childId),
                      childKind,
                    })
              );
            }
          }
        }
      }
    }
  }
  unregisterChildContainer(child: DisposableChild): void {
    if (stryMutAct_9fa48("48")) {
      {
      }
    } else {
      stryCov_9fa48("48");
      this.lifecycleManager.unregisterChildContainer(child);
    }
  }
  hasAdapter(port: Port<unknown, string>): boolean {
    if (stryMutAct_9fa48("49")) {
      {
      }
    } else {
      stryCov_9fa48("49");
      return this.adapterRegistry.has(port);
    }
  }
  getAdapter(port: Port<unknown, string>): RuntimeAdapter | undefined {
    if (stryMutAct_9fa48("50")) {
      {
      }
    } else {
      stryCov_9fa48("50");
      return this.adapterRegistry.get(port);
    }
  }
  has(port: Port<unknown, string>): boolean {
    if (stryMutAct_9fa48("51")) {
      {
      }
    } else {
      stryCov_9fa48("51");
      const adapter = this.getAdapter(port);
      if (
        stryMutAct_9fa48("54")
          ? adapter !== undefined
          : stryMutAct_9fa48("53")
            ? false
            : stryMutAct_9fa48("52")
              ? true
              : (stryCov_9fa48("52", "53", "54"), adapter === undefined)
      )
        return stryMutAct_9fa48("55") ? true : (stryCov_9fa48("55"), false);
      if (
        stryMutAct_9fa48("58")
          ? adapter.lifetime !== "scoped"
          : stryMutAct_9fa48("57")
            ? false
            : stryMutAct_9fa48("56")
              ? true
              : (stryCov_9fa48("56", "57", "58"),
                adapter.lifetime ===
                  (stryMutAct_9fa48("59") ? "" : (stryCov_9fa48("59"), "scoped")))
      )
        return stryMutAct_9fa48("60") ? true : (stryCov_9fa48("60"), false);
      return stryMutAct_9fa48("61") ? false : (stryCov_9fa48("61"), true);
    }
  }

  // ===========================================================================
  // Resolution
  // ===========================================================================

  resolve<P extends TProvides | TExtends>(port: P): InferService<P> {
    if (stryMutAct_9fa48("62")) {
      {
      }
    } else {
      stryCov_9fa48("62");
      const portName = port.__portName;
      if (
        stryMutAct_9fa48("64")
          ? false
          : stryMutAct_9fa48("63")
            ? true
            : (stryCov_9fa48("63", "64"), this.lifecycleManager.isDisposed)
      ) {
        if (stryMutAct_9fa48("65")) {
          {
          }
        } else {
          stryCov_9fa48("65");
          throw new DisposedScopeError(portName);
        }
      }

      // Check if should resolve locally
      if (
        stryMutAct_9fa48("67")
          ? false
          : stryMutAct_9fa48("66")
            ? true
            : (stryCov_9fa48("66", "67"),
              this.adapterRegistry.shouldResolveLocally(port, this.isRoot))
      ) {
        if (stryMutAct_9fa48("68")) {
          {
          }
        } else {
          stryCov_9fa48("68");
          const adapter = this.adapterRegistry.getLocal(port);
          if (
            stryMutAct_9fa48("71")
              ? adapter === undefined && !isAdapterForPort(adapter, port)
              : stryMutAct_9fa48("70")
                ? false
                : stryMutAct_9fa48("69")
                  ? true
                  : (stryCov_9fa48("69", "70", "71"),
                    (stryMutAct_9fa48("73")
                      ? adapter !== undefined
                      : stryMutAct_9fa48("72")
                        ? false
                        : (stryCov_9fa48("72", "73"), adapter === undefined)) ||
                      (stryMutAct_9fa48("74")
                        ? isAdapterForPort(adapter, port)
                        : (stryCov_9fa48("74"), !isAdapterForPort(adapter, port))))
          ) {
            if (stryMutAct_9fa48("75")) {
              {
              }
            } else {
              stryCov_9fa48("75");
              throw new Error(
                stryMutAct_9fa48("76")
                  ? ``
                  : (stryCov_9fa48("76"), `No adapter registered for port '${portName}'`)
              );
            }
          }
          if (
            stryMutAct_9fa48("79")
              ? adapter.lifetime !== "scoped"
              : stryMutAct_9fa48("78")
                ? false
                : stryMutAct_9fa48("77")
                  ? true
                  : (stryCov_9fa48("77", "78", "79"),
                    adapter.lifetime ===
                      (stryMutAct_9fa48("80") ? "" : (stryCov_9fa48("80"), "scoped")))
          ) {
            if (stryMutAct_9fa48("81")) {
              {
              }
            } else {
              stryCov_9fa48("81");
              throw new ScopeRequiredError(portName);
            }
          }
          if (
            stryMutAct_9fa48("84")
              ? !this.asyncInitializer.isInitialized || this.asyncInitializer.hasAsyncPort(port)
              : stryMutAct_9fa48("83")
                ? false
                : stryMutAct_9fa48("82")
                  ? true
                  : (stryCov_9fa48("82", "83", "84"),
                    (stryMutAct_9fa48("85")
                      ? this.asyncInitializer.isInitialized
                      : (stryCov_9fa48("85"), !this.asyncInitializer.isInitialized)) &&
                      this.asyncInitializer.hasAsyncPort(port))
          ) {
            if (stryMutAct_9fa48("86")) {
              {
              }
            } else {
              stryCov_9fa48("86");
              throw new AsyncInitializationRequiredError(portName);
            }
          }
          return this.resolveWithAdapter(port, adapter, this.singletonMemo, null);
        }
      }

      // Delegate to inheritance handling (child) or throw (root)
      return this.resolveWithInheritance(port);
    }
  }
  resolveInternal<P extends TProvides | TExtends>(
    port: P,
    scopedMemo: MemoMap,
    scopeId?: string | null,
    scopeName?: string
  ): InferService<P>;
  resolveInternal(
    port: Port<unknown, string>,
    scopedMemo: MemoMap,
    scopeId?: string | null,
    scopeName?: string
  ): unknown;
  resolveInternal(
    port: Port<unknown, string>,
    scopedMemo: MemoMap,
    scopeId: string | null = null,
    scopeName?: string
  ): unknown {
    if (stryMutAct_9fa48("87")) {
      {
      }
    } else {
      stryCov_9fa48("87");
      const portName = port.__portName;
      const adapter = this.getAdapter(port);
      if (
        stryMutAct_9fa48("90")
          ? adapter === undefined && !isAdapterForPort(adapter, port)
          : stryMutAct_9fa48("89")
            ? false
            : stryMutAct_9fa48("88")
              ? true
              : (stryCov_9fa48("88", "89", "90"),
                (stryMutAct_9fa48("92")
                  ? adapter !== undefined
                  : stryMutAct_9fa48("91")
                    ? false
                    : (stryCov_9fa48("91", "92"), adapter === undefined)) ||
                  (stryMutAct_9fa48("93")
                    ? isAdapterForPort(adapter, port)
                    : (stryCov_9fa48("93"), !isAdapterForPort(adapter, port))))
      ) {
        if (stryMutAct_9fa48("94")) {
          {
          }
        } else {
          stryCov_9fa48("94");
          return this.resolveInternalFallback(port, portName);
        }
      }
      return this.resolveWithAdapter(port, adapter, scopedMemo, scopeId, scopeName);
    }
  }
  protected resolveWithAdapter<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null,
    scopeName?: string
  ): InferService<P> {
    if (stryMutAct_9fa48("95")) {
      {
      }
    } else {
      stryCov_9fa48("95");
      return this.resolutionEngine.resolve(port, adapter, scopedMemo, scopeId, null, scopeName);
    }
  }

  // ===========================================================================
  // Async Resolution
  // ===========================================================================

  async resolveAsync<P extends TProvides | TExtends>(port: P): Promise<InferService<P>> {
    if (stryMutAct_9fa48("96")) {
      {
      }
    } else {
      stryCov_9fa48("96");
      const portName = port.__portName;
      if (
        stryMutAct_9fa48("98")
          ? false
          : stryMutAct_9fa48("97")
            ? true
            : (stryCov_9fa48("97", "98"), this.lifecycleManager.isDisposed)
      ) {
        if (stryMutAct_9fa48("99")) {
          {
          }
        } else {
          stryCov_9fa48("99");
          throw new DisposedScopeError(portName);
        }
      }

      // Check if should resolve locally
      if (
        stryMutAct_9fa48("101")
          ? false
          : stryMutAct_9fa48("100")
            ? true
            : (stryCov_9fa48("100", "101"),
              this.adapterRegistry.shouldResolveLocally(port, this.isRoot))
      ) {
        if (stryMutAct_9fa48("102")) {
          {
          }
        } else {
          stryCov_9fa48("102");
          const adapter = this.adapterRegistry.getLocal(port);
          if (
            stryMutAct_9fa48("105")
              ? adapter === undefined && !isAdapterForPort(adapter, port)
              : stryMutAct_9fa48("104")
                ? false
                : stryMutAct_9fa48("103")
                  ? true
                  : (stryCov_9fa48("103", "104", "105"),
                    (stryMutAct_9fa48("107")
                      ? adapter !== undefined
                      : stryMutAct_9fa48("106")
                        ? false
                        : (stryCov_9fa48("106", "107"), adapter === undefined)) ||
                      (stryMutAct_9fa48("108")
                        ? isAdapterForPort(adapter, port)
                        : (stryCov_9fa48("108"), !isAdapterForPort(adapter, port))))
          ) {
            if (stryMutAct_9fa48("109")) {
              {
              }
            } else {
              stryCov_9fa48("109");
              throw new Error(
                stryMutAct_9fa48("110")
                  ? ``
                  : (stryCov_9fa48("110"), `No adapter registered for port '${portName}'`)
              );
            }
          }
          if (
            stryMutAct_9fa48("113")
              ? adapter.lifetime !== "scoped"
              : stryMutAct_9fa48("112")
                ? false
                : stryMutAct_9fa48("111")
                  ? true
                  : (stryCov_9fa48("111", "112", "113"),
                    adapter.lifetime ===
                      (stryMutAct_9fa48("114") ? "" : (stryCov_9fa48("114"), "scoped")))
          ) {
            if (stryMutAct_9fa48("115")) {
              {
              }
            } else {
              stryCov_9fa48("115");
              throw new ScopeRequiredError(portName);
            }
          }
          return this.resolveAsyncWithAdapter(port, adapter, this.singletonMemo, null);
        }
      }

      // Delegate to async fallback
      return this.resolveAsyncInternalFallback(port) as Promise<InferService<P>>;
    }
  }
  resolveAsyncInternal<P extends TProvides | TExtends>(
    port: P,
    scopedMemo: MemoMap,
    scopeId?: string | null,
    scopeName?: string
  ): Promise<InferService<P>>;
  resolveAsyncInternal(
    port: Port<unknown, string>,
    scopedMemo: MemoMap,
    scopeId?: string | null,
    scopeName?: string
  ): Promise<unknown>;
  async resolveAsyncInternal(
    port: Port<unknown, string>,
    scopedMemo: MemoMap,
    scopeId: string | null = null,
    scopeName?: string
  ): Promise<unknown> {
    if (stryMutAct_9fa48("116")) {
      {
      }
    } else {
      stryCov_9fa48("116");
      const adapter = this.getAdapter(port);
      if (
        stryMutAct_9fa48("119")
          ? adapter === undefined && !isAdapterForPort(adapter, port)
          : stryMutAct_9fa48("118")
            ? false
            : stryMutAct_9fa48("117")
              ? true
              : (stryCov_9fa48("117", "118", "119"),
                (stryMutAct_9fa48("121")
                  ? adapter !== undefined
                  : stryMutAct_9fa48("120")
                    ? false
                    : (stryCov_9fa48("120", "121"), adapter === undefined)) ||
                  (stryMutAct_9fa48("122")
                    ? isAdapterForPort(adapter, port)
                    : (stryCov_9fa48("122"), !isAdapterForPort(adapter, port))))
      ) {
        if (stryMutAct_9fa48("123")) {
          {
          }
        } else {
          stryCov_9fa48("123");
          return this.resolveAsyncInternalFallback(port);
        }
      }
      return this.resolveAsyncWithAdapter(port, adapter, scopedMemo, scopeId, scopeName);
    }
  }
  protected resolveAsyncWithAdapter<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null,
    scopeName?: string
  ): Promise<InferService<P>> {
    if (stryMutAct_9fa48("124")) {
      {
      }
    } else {
      stryCov_9fa48("124");
      return this.asyncResolutionEngine.resolve(
        port,
        adapter,
        scopedMemo,
        scopeId,
        null,
        scopeName
      );
    }
  }

  // ===========================================================================
  // Scope Management
  // ===========================================================================

  registerChildScope(scope: DisposableChild): void {
    if (stryMutAct_9fa48("125")) {
      {
      }
    } else {
      stryCov_9fa48("125");
      this.lifecycleManager.registerChildScope(scope);
    }
  }
  unregisterChildScope(scope: DisposableChild): void {
    if (stryMutAct_9fa48("126")) {
      {
      }
    } else {
      stryCov_9fa48("126");
      this.lifecycleManager.unregisterChildScope(scope);
    }
  }
  getSingletonMemo(): MemoMap {
    if (stryMutAct_9fa48("127")) {
      {
      }
    } else {
      stryCov_9fa48("127");
      return this.singletonMemo;
    }
  }

  // ===========================================================================
  // Disposal
  // ===========================================================================

  /**
   * Disposes the container, all child scopes, and child containers.
   *
   * Disposal behavior (per RUN-02 requirements):
   * - **Idempotent**: Subsequent calls return immediately without effect
   * - **Cascade**: Child containers and scopes disposed before this container
   * - **LIFO Order**: Services disposed in reverse creation order
   * - **Async Support**: Async finalizers are properly awaited
   * - **Error Aggregation**: All finalizers called even if some throw
   *
   * Disposal order:
   * 1. Child containers (LIFO - last created first)
   * 2. Child scopes
   * 3. Singleton services (LIFO)
   * 4. Unregister from parent (for child containers)
   *
   * @returns Promise that resolves when disposal is complete
   * @throws {AggregateError} If one or more finalizers threw errors
   */
  async dispose(): Promise<void> {
    if (stryMutAct_9fa48("128")) {
      {
      }
    } else {
      stryCov_9fa48("128");
      await this.lifecycleManager.dispose(this.singletonMemo, this.getParentUnregisterCallback());
    }
  }

  // ===========================================================================
  // Internal State (for DevTools)
  // ===========================================================================

  getInternalState(): ContainerInternalState {
    if (stryMutAct_9fa48("129")) {
      {
      }
    } else {
      stryCov_9fa48("129");
      if (
        stryMutAct_9fa48("131")
          ? false
          : stryMutAct_9fa48("130")
            ? true
            : (stryCov_9fa48("130", "131"), this.lifecycleManager.isDisposed)
      ) {
        if (stryMutAct_9fa48("132")) {
          {
          }
        } else {
          stryCov_9fa48("132");
          throw new DisposedScopeError(
            this.isRoot
              ? stryMutAct_9fa48("133")
                ? ""
                : (stryCov_9fa48("133"), "container")
              : stryMutAct_9fa48("134")
                ? ""
                : (stryCov_9fa48("134"), "child-container")
          );
        }
      }
      const childScopeSnapshots = this.lifecycleManager.getChildScopeSnapshots(scope => {
        if (stryMutAct_9fa48("135")) {
          {
          }
        } else {
          stryCov_9fa48("135");
          // SAFETY: Scope type widening for iteration. Child scopes stored in Set<> have
          // narrower type parameters but need wider type for generic iteration callback.
          // Sound because ScopeImpl's getInternalState() doesn't depend on type parameters.
          const typedScope = scope as ScopeImpl<
            TProvides | TExtends,
            TAsyncPorts,
            "uninitialized" | "initialized"
          >;
          return typedScope.getInternalState();
        }
      });
      const childContainerSnapshots = this.lifecycleManager.getChildContainerSnapshots(
        container => {
          if (stryMutAct_9fa48("136")) {
            {
            }
          } else {
            stryCov_9fa48("136");
            // Child containers are stored as wrapper objects, not impl instances.
            // Access internal state via INTERNAL_ACCESS symbol protocol.
            const accessible = asInternalAccessible(
              container,
              stryMutAct_9fa48("137") ? "" : (stryCov_9fa48("137"), "getInternalState")
            );
            const state = accessible[INTERNAL_ACCESS]();
            // Include wrapper reference so InspectorPlugin can access INSPECTOR API directly
            return stryMutAct_9fa48("138")
              ? {}
              : (stryCov_9fa48("138"),
                {
                  ...state,
                  wrapper: container,
                });
          }
        }
      );

      // Create the overridePorts set and isOverride function
      const overridePorts = this.adapterRegistry.overridePorts;
      const isOverride = stryMutAct_9fa48("139")
        ? () => undefined
        : (stryCov_9fa48("139"),
          (() => {
            const isOverride = (portName: string): boolean =>
              this.adapterRegistry.isOverride(portName);
            return isOverride;
          })());
      const snapshot: ContainerInternalState = stryMutAct_9fa48("140")
        ? {}
        : (stryCov_9fa48("140"),
          {
            disposed: this.lifecycleManager.isDisposed,
            singletonMemo: createMemoMapSnapshot(this.singletonMemo),
            childScopes: Object.freeze(childScopeSnapshots),
            childContainers: Object.freeze(childContainerSnapshots),
            adapterMap: this.createAdapterMapSnapshot(),
            containerId: stryMutAct_9fa48("141") ? "" : (stryCov_9fa48("141"), "root"),
            containerName: this.getContainerName(),
            overridePorts,
            isOverride,
          });
      return Object.freeze(snapshot);
    }
  }

  /**
   * Creates a snapshot of adapters for DevTools inspection.
   *
   * Root containers return only local adapters.
   * Child containers should override this to include inherited adapters.
   *
   * @returns A readonly map of ports to adapter info
   */
  protected createAdapterMapSnapshot(): ReadonlyMap<
    Port<unknown, string>,
    import("../inspection/internal-state-types.js").AdapterInfo
  > {
    if (stryMutAct_9fa48("142")) {
      {
      }
    } else {
      stryCov_9fa48("142");
      const map = new Map<
        Port<unknown, string>,
        import("../inspection/internal-state-types.js").AdapterInfo
      >();
      for (const [port, adapter] of this.adapterRegistry.entries()) {
        if (stryMutAct_9fa48("143")) {
          {
          }
        } else {
          stryCov_9fa48("143");
          map.set(
            port,
            stryMutAct_9fa48("144")
              ? {}
              : (stryCov_9fa48("144"),
                {
                  portName: port.__portName,
                  lifetime: adapter.lifetime,
                  factoryKind: adapter.factoryKind,
                  dependencyCount: adapter.requires.length,
                  dependencyNames: adapter.requires.map(
                    stryMutAct_9fa48("145")
                      ? () => undefined
                      : (stryCov_9fa48("145"), p => p.__portName)
                  ),
                })
          );
        }
      }
      return map;
    }
  }
}
