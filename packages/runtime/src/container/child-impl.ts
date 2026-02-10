/**
 * Child container implementation.
 *
 * @packageDocumentation
 * @internal
 */

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
  private readonly dynamicHookSources: ResolutionHooks[] = [];

  /**
   * Creates a HooksRunner with composed hooks for child container.
   * Called in constructor to enable dynamic hook installation via wrappers.
   */
  private static createDynamicHooksRunner(
    hookSources: ResolutionHooks[],
    containerMetadata: ContainerMetadata
  ): HooksRunner {
    // Create a composed hooks object that iterates through all hook sources
    const composedHooks: ResolutionHooks = {
      beforeResolve: ctx => {
        for (const source of hookSources) {
          source.beforeResolve?.(ctx);
        }
      },
      afterResolve: ctx => {
        // afterResolve in reverse order (middleware pattern)
        for (let i = hookSources.length - 1; i >= 0; i--) {
          hookSources[i].afterResolve?.(ctx);
        }
      },
    };
    return new HooksRunner(composedHooks, containerMetadata);
  }

  constructor(config: ChildContainerConfig<TProvides, TAsyncPorts>) {
    const adapterRegistry = new AdapterRegistry<TProvides, TAsyncPorts>(config.parent);

    // Create container metadata for hooks
    const containerMetadata: ContainerMetadata = {
      containerId: config.containerId,
      containerKind: "child",
      parentContainerId: config.parentContainerId,
    };

    // Pre-create the hook sources array (will be populated via installHooks)
    const dynamicHookSources: ResolutionHooks[] = [];

    // Create HooksRunner with composed hooks that reads from dynamicHookSources
    const hooksRunner = ChildContainerImpl.createDynamicHooksRunner(
      dynamicHookSources,
      containerMetadata
    );

    // Create MemoMap config for timestamp capture
    const memoMapConfig = {
      captureTimestamps: config.performance?.disableTimestamps !== true,
    };

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
    return this.containerName;
  }

  // ===========================================================================
  // Dynamic Hooks Installation
  // ===========================================================================

  /**
   * Installs hooks for dynamic hook support.
   * Called to add hooks to child containers after creation.
   */
  installHooks(hooks: ResolutionHooks): void {
    this.dynamicHookSources.push(hooks);
  }

  /**
   * Uninstalls previously installed hooks.
   * Called by wrapper cleanup to remove hooks from child containers.
   */
  uninstallHooks(hooks: ResolutionHooks): void {
    const idx = this.dynamicHookSources.indexOf(hooks);
    if (idx >= 0) {
      this.dynamicHookSources.splice(idx, 1);
    }
  }

  private initializeFromParent(config: ChildContainerConfig<TProvides, TAsyncPorts>): void {
    const { overrides, extensions } = config;

    // Add overrides (marked as local and as overrides)
    for (const [port, adapter] of overrides) {
      this.adapterRegistry.register(port, adapter, true);
      // Mark this port as an override (it replaces a parent adapter)
      this.adapterRegistry.markOverride(port.__portName);
    }

    // Add extensions (marked as local, but NOT as overrides - these are new ports)
    for (const [port, adapter] of extensions) {
      this.adapterRegistry.register(port, adapter, true);
      // Do NOT call markOverride for extensions - they're new ports, not overrides
    }

    // Child containers are considered initialized (inherit from parent)
    this.asyncInitializer.markInitialized();
  }

  // ===========================================================================
  // Abstract Method Implementations
  // ===========================================================================

  protected onWrapperSet(wrapper: unknown): void {
    if (isDisposableChild(wrapper)) {
      this.parentContainer.registerChildContainer(wrapper);
    }
  }

  getParent(): unknown {
    return this.parentContainer.originalParent;
  }

  initialize(): Promise<void> {
    return Promise.reject(
      new Error("Child containers cannot be initialized - they inherit state from parent")
    );
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
    // For inherited ports, delegate to inheritance resolver
    // This handles shared mode by calling parent.resolveInternal which returns cached value
    if (!this.adapterRegistry.isLocal(port)) {
      // Check adapter lifetime - scoped ports must be created locally (not delegated)
      const adapter = this.adapterRegistry.get(port);
      if (adapter !== undefined && adapter.lifetime === "scoped") {
        // Scoped ports: base class creates scoped instance in child's scope
        return super.resolveInternal(port, scopedMemo, scopeId, scopeName);
      }
      // Non-scoped inherited ports: delegate to fallback (respects inheritance mode)
      return this.resolveInternalFallback(port, port.__portName);
    }
    // Local ports resolve normally via base implementation
    return super.resolveInternal(port, scopedMemo, scopeId, scopeName);
  }

  protected getParentUnregisterCallback(): (() => void) | undefined {
    if (this.wrapper !== null && isDisposableChild(this.wrapper)) {
      const wrapper = this.wrapper as DisposableChild;
      return () => this.parentContainer.unregisterChildContainer(wrapper);
    }
    return undefined;
  }

  protected resolveWithInheritance<P extends TProvides | TExtends>(port: P): InferService<P> {
    if (this.parentContainer === null) {
      throw new Error(`Port ${port.__portName} not found - no parent container.`);
    }

    const portName = port.__portName;
    const mode = this.inheritanceResolver.getMode(portName);

    // Get adapter from parent for hook context
    const adapter = this.parentContainer[ADAPTER_ACCESS](port);

    // Wrap resolution with hooks if enabled
    if (this.hooksRunner !== null && adapter !== undefined) {
      // For inherited resolutions, isCacheHit is based on whether this is a shared resolution
      // (which reuses parent's singleton) or forked/isolated (which creates new instance)
      const isCacheHit = mode === "shared";

      return this.hooksRunner.runSync(
        port,
        adapter,
        null, // scopeId
        isCacheHit,
        mode, // inheritanceMode
        () => this.resolveWithInheritanceInternal(port, mode)
      );
    }

    return this.resolveWithInheritanceInternal(port, mode);
  }

  /**
   * Internal inheritance resolution logic.
   */
  private resolveWithInheritanceInternal<P extends TProvides | TExtends>(
    port: P,
    _mode: InheritanceMode
  ): InferService<P> {
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

  protected resolveInternalFallback(port: Port<unknown, string>, portName: string): unknown {
    // For child containers, delegate to parent based on inheritance mode
    if (!this.adapterRegistry.isLocal(port)) {
      const mode = this.inheritanceResolver.getMode(portName);
      if (mode === "shared") {
        return this.inheritanceResolver.resolveSharedInternal(port as TProvides);
      }
      // For forked/isolated modes, use resolveWithInheritance
      return this.resolveWithInheritance(port as TProvides | TExtends);
    }
    throw new Error(`No adapter registered for port '${portName}'`);
  }

  protected resolveAsyncInternalFallback(port: Port<unknown, string>): Promise<unknown> {
    if (!this.adapterRegistry.isLocal(port)) {
      return this.parentContainer.resolveAsyncInternal(port as TProvides);
    }
    return Promise.reject(new Error(`No adapter registered for port '${port.__portName}'`));
  }

  // ===========================================================================
  // Isolated Mode Support
  // ===========================================================================

  private createIsolatedWithAdapter<P extends TProvides>(
    port: P,
    adapter: RuntimeAdapterFor<P>
  ): InferService<P> {
    const portName = port.__portName;

    assertSyncAdapter(adapter, portName);

    return this.singletonMemo.getOrElseMemoize(
      port,
      () => {
        this.resolutionContext.enter(portName);
        try {
          const deps: Record<string, unknown> = {};
          for (const requiredPort of adapter.requires) {
            deps[requiredPort.__portName] = this.resolve(requiredPort as TProvides | TExtends);
          }
          try {
            return adapter.factory(deps);
          } catch (error) {
            throw new FactoryError(portName, error);
          }
        } finally {
          this.resolutionContext.exit(portName);
        }
      },
      undefined
    );
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
    // Get base internal state
    const baseState = super.getInternalState();

    // Create new state with child's containerId, containerName, and inheritanceModes
    const stateWithChild: ContainerInternalState = {
      ...baseState,
      containerId: this.containerId,
      containerName: this.containerName,
      inheritanceModes: this.inheritanceModes,
    };

    return Object.freeze(stateWithChild);
  }

  /**
   * Creates adapter map snapshot with only local adapters.
   *
   * Note: Only includes local (overrides/extensions) adapters to avoid
   * circular calls when parent iterates its child containers. The parent's
   * adapters are available in the parent's own snapshot.
   */
  protected override createAdapterMapSnapshot(): ReadonlyMap<Port<unknown, string>, AdapterInfo> {
    // Only include local adapters to avoid circular parent access
    return super.createAdapterMapSnapshot();
  }
}
