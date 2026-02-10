/**
 * Child container implementation.
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
import type { InheritanceMode } from "../types.js";
import type { ResolutionHooks } from "../resolution/hooks.js";
import { FactoryError } from "../errors/index.js";
import type {
  RuntimeAdapterFor,
  DisposableChild,
  ParentContainerLike,
  ChildContainerConfig,
} from "./internal-types.js";
import { assertSyncAdapter } from "./internal-types.js";
import { InheritanceResolver } from "./internal/inheritance-resolver.js";
import { AdapterRegistry } from "./internal/adapter-registry.js";
import { BaseContainerImpl } from "./base-impl.js";
import type { MemoMap } from "../util/memo-map.js";
import { HooksRunner, type ContainerMetadata } from "../resolution/hooks-runner.js";
import { isDisposableChild } from "./helpers.js";
import { ADAPTER_ACCESS } from "../inspection/symbols.js";
import type { AdapterInfo, ContainerInternalState } from "../inspection/internal-state-types.js";

/**
 * Child container created from a parent with overrides/extensions.
 *
 * Features:
 * - Inherits adapters from parent
 * - Supports inheritance modes (shared, forked, isolated)
 * - Can override and extend parent adapters
 * - Tracks which ports are overrides for DevTools visualization
 *
 * @internal
 */
export class ChildContainerImpl<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
> extends BaseContainerImpl<TProvides, TExtends, TAsyncPorts> {
  protected readonly isRoot = false as const;
  private readonly parentContainer: ParentContainerLike<TProvides, TAsyncPorts>;
  private readonly inheritanceModes: ReadonlyMap<string, InheritanceMode>;
  private readonly inheritanceResolver: InheritanceResolver<TProvides, TAsyncPorts>;
  private readonly containerId: string;
  private readonly containerName: string;
  private readonly parentContainerId: string;

  /**
   * Array of dynamically installed hook sources.
   * Hooks are installed dynamically using installHooks().
   */
  private readonly dynamicHookSources: ResolutionHooks[] = stryMutAct_9fa48("146")
    ? ["Stryker was here"]
    : (stryCov_9fa48("146"), []);

  /**
   * Creates a HooksRunner with composed hooks for child container.
   * Called in constructor to enable dynamic hook installation via wrappers.
   */
  private static createDynamicHooksRunner(
    hookSources: ResolutionHooks[],
    containerMetadata: ContainerMetadata
  ): HooksRunner {
    if (stryMutAct_9fa48("147")) {
      {
      }
    } else {
      stryCov_9fa48("147");
      // Create a composed hooks object that iterates through all hook sources
      const composedHooks: ResolutionHooks = stryMutAct_9fa48("148")
        ? {}
        : (stryCov_9fa48("148"),
          {
            beforeResolve: ctx => {
              if (stryMutAct_9fa48("149")) {
                {
                }
              } else {
                stryCov_9fa48("149");
                for (const source of hookSources) {
                  if (stryMutAct_9fa48("150")) {
                    {
                    }
                  } else {
                    stryCov_9fa48("150");
                    stryMutAct_9fa48("151")
                      ? source.beforeResolve(ctx)
                      : (stryCov_9fa48("151"), source.beforeResolve?.(ctx));
                  }
                }
              }
            },
            afterResolve: ctx => {
              if (stryMutAct_9fa48("152")) {
                {
                }
              } else {
                stryCov_9fa48("152");
                // afterResolve in reverse order (middleware pattern)
                for (
                  let i = stryMutAct_9fa48("153")
                    ? hookSources.length + 1
                    : (stryCov_9fa48("153"), hookSources.length - 1);
                  stryMutAct_9fa48("156")
                    ? i < 0
                    : stryMutAct_9fa48("155")
                      ? i > 0
                      : stryMutAct_9fa48("154")
                        ? false
                        : (stryCov_9fa48("154", "155", "156"), i >= 0);
                  stryMutAct_9fa48("157") ? i++ : (stryCov_9fa48("157"), i--)
                ) {
                  if (stryMutAct_9fa48("158")) {
                    {
                    }
                  } else {
                    stryCov_9fa48("158");
                    stryMutAct_9fa48("159")
                      ? hookSources[i].afterResolve(ctx)
                      : (stryCov_9fa48("159"), hookSources[i].afterResolve?.(ctx));
                  }
                }
              }
            },
          });
      return new HooksRunner(composedHooks, containerMetadata);
    }
  }
  constructor(config: ChildContainerConfig<TProvides, TAsyncPorts>) {
    const adapterRegistry = new AdapterRegistry<TProvides, TAsyncPorts>(config.parent);

    // Create container metadata for hooks
    const containerMetadata: ContainerMetadata = stryMutAct_9fa48("160")
      ? {}
      : (stryCov_9fa48("160"),
        {
          containerId: config.containerId,
          containerKind: stryMutAct_9fa48("161") ? "" : (stryCov_9fa48("161"), "child"),
          parentContainerId: config.parentContainerId,
        });

    // Pre-create the hook sources array (will be populated via installHooks)
    const dynamicHookSources: ResolutionHooks[] = stryMutAct_9fa48("162")
      ? ["Stryker was here"]
      : (stryCov_9fa48("162"), []);

    // Create HooksRunner with composed hooks that reads from dynamicHookSources
    const hooksRunner = ChildContainerImpl.createDynamicHooksRunner(
      dynamicHookSources,
      containerMetadata
    );

    // Create MemoMap config for timestamp capture
    const memoMapConfig = stryMutAct_9fa48("163")
      ? {}
      : (stryCov_9fa48("163"),
        {
          captureTimestamps: stryMutAct_9fa48("166")
            ? config.performance?.disableTimestamps === true
            : stryMutAct_9fa48("165")
              ? false
              : stryMutAct_9fa48("164")
                ? true
                : (stryCov_9fa48("164", "165", "166"),
                  (stryMutAct_9fa48("167")
                    ? config.performance.disableTimestamps
                    : (stryCov_9fa48("167"), config.performance?.disableTimestamps)) !==
                    (stryMutAct_9fa48("168") ? false : (stryCov_9fa48("168"), true))),
        });
    super(adapterRegistry, hooksRunner, memoMapConfig);

    // Store reference to hook sources for installHooks/uninstallHooks
    this.dynamicHookSources = dynamicHookSources;
    this.parentContainer = config.parent;
    this.inheritanceModes = config.inheritanceModes;
    this.inheritanceResolver = new InheritanceResolver(config.parent, config.inheritanceModes);
    this.containerId = config.containerId;
    this.containerName = config.containerName;
    this.parentContainerId = config.parentContainerId;
    this.initializeFromParent(config);
  }
  protected getContainerName(): string {
    if (stryMutAct_9fa48("169")) {
      {
      }
    } else {
      stryCov_9fa48("169");
      return this.containerName;
    }
  }

  // ===========================================================================
  // Dynamic Hooks Installation
  // ===========================================================================

  /**
   * Installs hooks for dynamic hook support.
   * Called to add hooks to child containers after creation.
   */
  installHooks(hooks: ResolutionHooks): void {
    if (stryMutAct_9fa48("170")) {
      {
      }
    } else {
      stryCov_9fa48("170");
      this.dynamicHookSources.push(hooks);
    }
  }

  /**
   * Uninstalls previously installed hooks.
   * Called by wrapper cleanup to remove hooks from child containers.
   */
  uninstallHooks(hooks: ResolutionHooks): void {
    if (stryMutAct_9fa48("171")) {
      {
      }
    } else {
      stryCov_9fa48("171");
      const idx = this.dynamicHookSources.indexOf(hooks);
      if (
        stryMutAct_9fa48("175")
          ? idx < 0
          : stryMutAct_9fa48("174")
            ? idx > 0
            : stryMutAct_9fa48("173")
              ? false
              : stryMutAct_9fa48("172")
                ? true
                : (stryCov_9fa48("172", "173", "174", "175"), idx >= 0)
      ) {
        if (stryMutAct_9fa48("176")) {
          {
          }
        } else {
          stryCov_9fa48("176");
          this.dynamicHookSources.splice(idx, 1);
        }
      }
    }
  }
  private initializeFromParent(config: ChildContainerConfig<TProvides, TAsyncPorts>): void {
    if (stryMutAct_9fa48("177")) {
      {
      }
    } else {
      stryCov_9fa48("177");
      const { overrides, extensions } = config;

      // Add overrides (marked as local and as overrides)
      for (const [port, adapter] of overrides) {
        if (stryMutAct_9fa48("178")) {
          {
          }
        } else {
          stryCov_9fa48("178");
          this.adapterRegistry.register(
            port,
            adapter,
            stryMutAct_9fa48("179") ? false : (stryCov_9fa48("179"), true)
          );
          // Mark this port as an override (it replaces a parent adapter)
          this.adapterRegistry.markOverride(port.__portName);
        }
      }

      // Add extensions (marked as local, but NOT as overrides - these are new ports)
      for (const [port, adapter] of extensions) {
        if (stryMutAct_9fa48("180")) {
          {
          }
        } else {
          stryCov_9fa48("180");
          this.adapterRegistry.register(
            port,
            adapter,
            stryMutAct_9fa48("181") ? false : (stryCov_9fa48("181"), true)
          );
          // Do NOT call markOverride for extensions - they're new ports, not overrides
        }
      }

      // Child containers are considered initialized (inherit from parent)
      this.asyncInitializer.markInitialized();
    }
  }

  // ===========================================================================
  // Abstract Method Implementations
  // ===========================================================================

  protected onWrapperSet(wrapper: unknown): void {
    if (stryMutAct_9fa48("182")) {
      {
      }
    } else {
      stryCov_9fa48("182");
      if (
        stryMutAct_9fa48("184")
          ? false
          : stryMutAct_9fa48("183")
            ? true
            : (stryCov_9fa48("183", "184"), isDisposableChild(wrapper))
      ) {
        if (stryMutAct_9fa48("185")) {
          {
          }
        } else {
          stryCov_9fa48("185");
          this.parentContainer.registerChildContainer(wrapper);
        }
      }
    }
  }
  getParent(): unknown {
    if (stryMutAct_9fa48("186")) {
      {
      }
    } else {
      stryCov_9fa48("186");
      return this.parentContainer.originalParent;
    }
  }
  initialize(): Promise<void> {
    if (stryMutAct_9fa48("187")) {
      {
      }
    } else {
      stryCov_9fa48("187");
      return Promise.reject(
        new Error(
          stryMutAct_9fa48("188")
            ? ""
            : (stryCov_9fa48("188"),
              "Child containers cannot be initialized - they inherit state from parent")
        )
      );
    }
  }

  // ===========================================================================
  // Resolution Override - Delegate Inherited Ports to Parent
  // ===========================================================================

  /**
   * Override resolveInternal to delegate inherited (non-local) ports to parent.
   *
   * This ensures async ports inherited from parent are resolved via the parent's
   * cached value (already initialized) instead of trying to create a new instance
   * locally which would fail for async adapters.
   *
   * @param port - The port to resolve
   * @param scopedMemo - Memoization map for scoped instances
   * @param scopeId - Optional scope identifier
   * @returns The resolved service instance with full type inference
   */
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
    if (stryMutAct_9fa48("189")) {
      {
      }
    } else {
      stryCov_9fa48("189");
      // For inherited ports, delegate to inheritance resolver
      // This handles shared mode by calling parent.resolveInternal which returns cached value
      if (
        stryMutAct_9fa48("192")
          ? false
          : stryMutAct_9fa48("191")
            ? true
            : stryMutAct_9fa48("190")
              ? this.adapterRegistry.isLocal(port)
              : (stryCov_9fa48("190", "191", "192"), !this.adapterRegistry.isLocal(port))
      ) {
        if (stryMutAct_9fa48("193")) {
          {
          }
        } else {
          stryCov_9fa48("193");
          // Check adapter lifetime - scoped ports must be created locally (not delegated)
          const adapter = this.adapterRegistry.get(port);
          if (
            stryMutAct_9fa48("196")
              ? adapter !== undefined || adapter.lifetime === "scoped"
              : stryMutAct_9fa48("195")
                ? false
                : stryMutAct_9fa48("194")
                  ? true
                  : (stryCov_9fa48("194", "195", "196"),
                    (stryMutAct_9fa48("198")
                      ? adapter === undefined
                      : stryMutAct_9fa48("197")
                        ? true
                        : (stryCov_9fa48("197", "198"), adapter !== undefined)) &&
                      (stryMutAct_9fa48("200")
                        ? adapter.lifetime !== "scoped"
                        : stryMutAct_9fa48("199")
                          ? true
                          : (stryCov_9fa48("199", "200"),
                            adapter.lifetime ===
                              (stryMutAct_9fa48("201") ? "" : (stryCov_9fa48("201"), "scoped")))))
          ) {
            if (stryMutAct_9fa48("202")) {
              {
              }
            } else {
              stryCov_9fa48("202");
              // Scoped ports: base class creates scoped instance in child's scope
              return super.resolveInternal(port, scopedMemo, scopeId, scopeName);
            }
          }
          // Non-scoped inherited ports: delegate to fallback (respects inheritance mode)
          return this.resolveInternalFallback(port, port.__portName);
        }
      }
      // Local ports resolve normally via base implementation
      return super.resolveInternal(port, scopedMemo, scopeId, scopeName);
    }
  }
  protected getParentUnregisterCallback(): (() => void) | undefined {
    if (stryMutAct_9fa48("203")) {
      {
      }
    } else {
      stryCov_9fa48("203");
      if (
        stryMutAct_9fa48("206")
          ? this.wrapper !== null || isDisposableChild(this.wrapper)
          : stryMutAct_9fa48("205")
            ? false
            : stryMutAct_9fa48("204")
              ? true
              : (stryCov_9fa48("204", "205", "206"),
                (stryMutAct_9fa48("208")
                  ? this.wrapper === null
                  : stryMutAct_9fa48("207")
                    ? true
                    : (stryCov_9fa48("207", "208"), this.wrapper !== null)) &&
                  isDisposableChild(this.wrapper))
      ) {
        if (stryMutAct_9fa48("209")) {
          {
          }
        } else {
          stryCov_9fa48("209");
          const wrapper = this.wrapper as DisposableChild;
          return stryMutAct_9fa48("210")
            ? () => undefined
            : (stryCov_9fa48("210"), () => this.parentContainer.unregisterChildContainer(wrapper));
        }
      }
      return undefined;
    }
  }
  protected resolveWithInheritance<P extends TProvides | TExtends>(port: P): InferService<P> {
    if (stryMutAct_9fa48("211")) {
      {
      }
    } else {
      stryCov_9fa48("211");
      if (
        stryMutAct_9fa48("214")
          ? this.parentContainer !== null
          : stryMutAct_9fa48("213")
            ? false
            : stryMutAct_9fa48("212")
              ? true
              : (stryCov_9fa48("212", "213", "214"), this.parentContainer === null)
      ) {
        if (stryMutAct_9fa48("215")) {
          {
          }
        } else {
          stryCov_9fa48("215");
          throw new Error(
            stryMutAct_9fa48("216")
              ? ``
              : (stryCov_9fa48("216"), `Port ${port.__portName} not found - no parent container.`)
          );
        }
      }
      const portName = port.__portName;
      const mode = this.inheritanceResolver.getMode(portName);

      // Get adapter from parent for hook context
      const adapter = this.parentContainer[ADAPTER_ACCESS](port);

      // Wrap resolution with hooks if enabled
      if (
        stryMutAct_9fa48("219")
          ? this.hooksRunner !== null || adapter !== undefined
          : stryMutAct_9fa48("218")
            ? false
            : stryMutAct_9fa48("217")
              ? true
              : (stryCov_9fa48("217", "218", "219"),
                (stryMutAct_9fa48("221")
                  ? this.hooksRunner === null
                  : stryMutAct_9fa48("220")
                    ? true
                    : (stryCov_9fa48("220", "221"), this.hooksRunner !== null)) &&
                  (stryMutAct_9fa48("223")
                    ? adapter === undefined
                    : stryMutAct_9fa48("222")
                      ? true
                      : (stryCov_9fa48("222", "223"), adapter !== undefined)))
      ) {
        if (stryMutAct_9fa48("224")) {
          {
          }
        } else {
          stryCov_9fa48("224");
          // For inherited resolutions, isCacheHit is based on whether this is a shared resolution
          // (which reuses parent's singleton) or forked/isolated (which creates new instance)
          const isCacheHit = stryMutAct_9fa48("227")
            ? mode !== "shared"
            : stryMutAct_9fa48("226")
              ? false
              : stryMutAct_9fa48("225")
                ? true
                : (stryCov_9fa48("225", "226", "227"),
                  mode === (stryMutAct_9fa48("228") ? "" : (stryCov_9fa48("228"), "shared")));
          return this.hooksRunner.runSync(
            port,
            adapter,
            null,
            // scopeId
            isCacheHit,
            mode, // inheritanceMode
            stryMutAct_9fa48("229")
              ? () => undefined
              : (stryCov_9fa48("229"), () => this.resolveWithInheritanceInternal(port, mode))
          );
        }
      }
      return this.resolveWithInheritanceInternal(port, mode);
    }
  }

  /**
   * Internal inheritance resolution logic.
   */
  private resolveWithInheritanceInternal<P extends TProvides | TExtends>(
    port: P,
    _mode: InheritanceMode
  ): InferService<P> {
    if (stryMutAct_9fa48("230")) {
      {
      }
    } else {
      stryCov_9fa48("230");
      // SAFETY: Port type widening needed for variance - parent provides TExtends ports,
      // but resolveWithCallback expects TProvides. Cast is sound because:
      // 1. InheritanceResolver validates port membership before resolution
      // 2. Parent container is guaranteed to provide this port (checked by adapter registry)
      // 3. The return type InferService<P> correctly preserves the specific port's service type
      return this.inheritanceResolver.resolveWithCallback(
        port as unknown as TProvides,
        (p, adapter) => this.createIsolatedWithAdapter(p, adapter)
      ) as InferService<P>;
    }
  }
  protected resolveInternalFallback(port: Port<unknown, string>, portName: string): unknown {
    if (stryMutAct_9fa48("231")) {
      {
      }
    } else {
      stryCov_9fa48("231");
      // For child containers, delegate to parent based on inheritance mode
      if (
        stryMutAct_9fa48("234")
          ? false
          : stryMutAct_9fa48("233")
            ? true
            : stryMutAct_9fa48("232")
              ? this.adapterRegistry.isLocal(port)
              : (stryCov_9fa48("232", "233", "234"), !this.adapterRegistry.isLocal(port))
      ) {
        if (stryMutAct_9fa48("235")) {
          {
          }
        } else {
          stryCov_9fa48("235");
          const mode = this.inheritanceResolver.getMode(portName);
          if (
            stryMutAct_9fa48("238")
              ? mode !== "shared"
              : stryMutAct_9fa48("237")
                ? false
                : stryMutAct_9fa48("236")
                  ? true
                  : (stryCov_9fa48("236", "237", "238"),
                    mode === (stryMutAct_9fa48("239") ? "" : (stryCov_9fa48("239"), "shared")))
          ) {
            if (stryMutAct_9fa48("240")) {
              {
              }
            } else {
              stryCov_9fa48("240");
              return this.inheritanceResolver.resolveSharedInternal(port as TProvides);
            }
          }
          // For forked/isolated modes, use resolveWithInheritance
          return this.resolveWithInheritance(port as TProvides | TExtends);
        }
      }
      throw new Error(
        stryMutAct_9fa48("241")
          ? ``
          : (stryCov_9fa48("241"), `No adapter registered for port '${portName}'`)
      );
    }
  }
  protected resolveAsyncInternalFallback(port: Port<unknown, string>): Promise<unknown> {
    if (stryMutAct_9fa48("242")) {
      {
      }
    } else {
      stryCov_9fa48("242");
      if (
        stryMutAct_9fa48("245")
          ? false
          : stryMutAct_9fa48("244")
            ? true
            : stryMutAct_9fa48("243")
              ? this.adapterRegistry.isLocal(port)
              : (stryCov_9fa48("243", "244", "245"), !this.adapterRegistry.isLocal(port))
      ) {
        if (stryMutAct_9fa48("246")) {
          {
          }
        } else {
          stryCov_9fa48("246");
          return this.parentContainer.resolveAsyncInternal(port as TProvides);
        }
      }
      return Promise.reject(
        new Error(
          stryMutAct_9fa48("247")
            ? ``
            : (stryCov_9fa48("247"), `No adapter registered for port '${port.__portName}'`)
        )
      );
    }
  }

  // ===========================================================================
  // Isolated Mode Support
  // ===========================================================================

  private createIsolatedWithAdapter<P extends TProvides>(
    port: P,
    adapter: RuntimeAdapterFor<P>
  ): InferService<P> {
    if (stryMutAct_9fa48("248")) {
      {
      }
    } else {
      stryCov_9fa48("248");
      const portName = port.__portName;
      assertSyncAdapter(adapter, portName);
      return this.singletonMemo.getOrElseMemoize(
        port,
        () => {
          if (stryMutAct_9fa48("249")) {
            {
            }
          } else {
            stryCov_9fa48("249");
            this.resolutionContext.enter(portName);
            try {
              if (stryMutAct_9fa48("250")) {
                {
                }
              } else {
                stryCov_9fa48("250");
                const deps: Record<string, unknown> = {};
                for (const requiredPort of adapter.requires) {
                  if (stryMutAct_9fa48("251")) {
                    {
                    }
                  } else {
                    stryCov_9fa48("251");
                    deps[requiredPort.__portName] = this.resolve(
                      requiredPort as TProvides | TExtends
                    );
                  }
                }
                try {
                  if (stryMutAct_9fa48("252")) {
                    {
                    }
                  } else {
                    stryCov_9fa48("252");
                    return adapter.factory(deps);
                  }
                } catch (error) {
                  if (stryMutAct_9fa48("253")) {
                    {
                    }
                  } else {
                    stryCov_9fa48("253");
                    throw new FactoryError(portName, error);
                  }
                }
              }
            } finally {
              if (stryMutAct_9fa48("254")) {
                {
                }
              } else {
                stryCov_9fa48("254");
                this.resolutionContext.exit(portName);
              }
            }
          }
        },
        undefined
      );
    }
  }

  // ===========================================================================
  // DevTools State (includes inherited adapters)
  // ===========================================================================

  /**
   * Returns internal state for DevTools inspection.
   *
   * Overrides base implementation to set correct containerId and expose
   * per-port inheritance modes. Note: parentState is NOT included to avoid
   * circular calls when parent iterates its child containers. The inspector
   * can access parent state via the container hierarchy if needed.
   */
  override getInternalState(): ContainerInternalState {
    if (stryMutAct_9fa48("255")) {
      {
      }
    } else {
      stryCov_9fa48("255");
      // Get base internal state
      const baseState = super.getInternalState();

      // Create new state with child's containerId, containerName, and inheritanceModes
      const stateWithChild: ContainerInternalState = stryMutAct_9fa48("256")
        ? {}
        : (stryCov_9fa48("256"),
          {
            ...baseState,
            containerId: this.containerId,
            containerName: this.containerName,
            inheritanceModes: this.inheritanceModes,
          });
      return Object.freeze(stateWithChild);
    }
  }

  /**
   * Creates adapter map snapshot with only local adapters.
   *
   * Note: Only includes local (overrides/extensions) adapters to avoid
   * circular calls when parent iterates its child containers. The parent's
   * adapters are available in the parent's own snapshot.
   */
  protected override createAdapterMapSnapshot(): ReadonlyMap<Port<unknown, string>, AdapterInfo> {
    if (stryMutAct_9fa48("257")) {
      {
      }
    } else {
      stryCov_9fa48("257");
      // Only include local adapters to avoid circular parent access
      return super.createAdapterMapSnapshot();
    }
  }
}
