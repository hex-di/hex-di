/**
 * Child container implementation.
 *
 * @packageDocumentation
 * @internal
 */

import type { Port, InferService } from "@hex-di/ports";
import type { InheritanceMode } from "../types.js";
import type { ResolutionHooks } from "../resolution/hooks.js";
import { FactoryError } from "../common/errors.js";
import type {
  RuntimeAdapterFor,
  DisposableChild,
  ParentContainerLike,
  ChildContainerConfig,
} from "./internal-types.js";
import { assertSyncAdapter } from "./internal-types.js";
import { InheritanceResolver } from "./inheritance-resolver.js";
import { AdapterRegistry } from "./adapter-registry.js";
import { BaseContainerImpl } from "./base-impl.js";
import { HooksRunner, type ContainerMetadata } from "./hooks-runner.js";
import { isDisposableChild } from "./helpers.js";
import { ADAPTER_ACCESS, INTERNAL_ACCESS } from "../inspector/symbols.js";
import type { AdapterInfo, ContainerInternalState } from "../inspector/types.js";
import { isRecord } from "../common/type-guards.js";

/**
 * Child container created from a parent with overrides/extensions.
 *
 * Features:
 * - Inherits adapters from parent
 * - Supports inheritance modes (shared, forked, isolated)
 * - Can override and extend parent adapters
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
  private readonly parentContainerId: string;

  /**
   * Array of dynamically installed hook sources.
   * Hooks are installed via wrappers (withTracing, etc.) using installHooks().
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

    super(adapterRegistry, hooksRunner);

    // Store reference to hook sources for installHooks/uninstallHooks
    this.dynamicHookSources = dynamicHookSources;

    this.parentContainer = config.parent;
    this.inheritanceModes = config.inheritanceModes;
    this.inheritanceResolver = new InheritanceResolver(config.parent, config.inheritanceModes);
    this.containerId = config.containerId;
    this.parentContainerId = config.parentContainerId;

    this.initializeFromParent(config);
  }

  // ===========================================================================
  // Dynamic Hooks Installation (for wrapper pattern)
  // ===========================================================================

  /**
   * Installs hooks for dynamic plugin wrapper support.
   * Called by wrapper pattern (withTracing, etc.) to add hooks to child containers.
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

    // Add overrides (marked as local)
    for (const [port, adapter] of overrides) {
      this.adapterRegistry.register(port, adapter, true);
    }

    // Add extensions (marked as local)
    for (const [port, adapter] of extensions) {
      this.adapterRegistry.register(port, adapter, true);
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
    // For child containers, delegate to parent if not local and mode is shared
    if (!this.adapterRegistry.isLocal(port)) {
      const mode = this.inheritanceResolver.getMode(portName);
      if (mode === "shared") {
        return this.inheritanceResolver.resolveSharedInternal(port as TProvides);
      }
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
   * Returns internal state including parent state for inherited resolution tracking.
   *
   * Overrides base implementation to add `parentState` field, enabling the
   * inspector to check parent's singleton memo for shared inherited ports.
   */
  override getInternalState(): ContainerInternalState {
    // Get base internal state
    const baseState = super.getInternalState();

    // Add parent state for inherited resolution tracking
    const parentInternal = this.getParentInternalState();

    // Create new state with child's containerId (override base's "root")
    const stateWithChild: ContainerInternalState = {
      ...baseState,
      containerId: this.containerId,
      parentState: parentInternal ?? undefined,
    };

    return Object.freeze(stateWithChild);
  }

  /**
   * Creates adapter map snapshot that includes both local and inherited adapters.
   *
   * Child containers merge parent's adapter map with local overrides/extensions.
   * Local adapters take precedence over inherited ones.
   */
  protected override createAdapterMapSnapshot(): ReadonlyMap<Port<unknown, string>, AdapterInfo> {
    const map = new Map<Port<unknown, string>, AdapterInfo>();

    // First, get parent's adapter map via INTERNAL_ACCESS
    const parentInternal = this.getParentInternalState();
    if (parentInternal !== null) {
      for (const [port, adapterInfo] of parentInternal.adapterMap) {
        map.set(port, adapterInfo);
      }
    }

    // Then, add/override with local adapters
    for (const [port, adapter] of this.adapterRegistry.entries()) {
      map.set(port, {
        portName: port.__portName,
        lifetime: adapter.lifetime,
        factoryKind: adapter.factoryKind,
        dependencyCount: adapter.requires.length,
        dependencyNames: adapter.requires.map(p => p.__portName),
      });
    }

    return map;
  }

  /**
   * Safely accesses parent's internal state for adapter map inheritance.
   * @returns Parent's internal state or null if not accessible
   */
  private getParentInternalState(): ContainerInternalState | null {
    const parent = this.parentContainer.originalParent;
    if (!isRecord(parent)) {
      return null;
    }
    const accessor = parent[INTERNAL_ACCESS];
    if (typeof accessor !== "function") {
      return null;
    }
    try {
      return accessor();
    } catch {
      // Parent might be disposed
      return null;
    }
  }
}
