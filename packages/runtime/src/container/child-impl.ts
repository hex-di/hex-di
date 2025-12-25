/**
 * Child container implementation.
 *
 * @packageDocumentation
 * @internal
 */

import type { Port, InferService } from "@hex-di/ports";
import type { InheritanceMode } from "../types.js";
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
import { isDisposableChild } from "./helpers.js";
import { HooksRunner, type ContainerMetadata } from "./hooks-runner.js";
import type { PluginManager } from "../plugin/plugin-manager.js";
import { ADAPTER_ACCESS } from "../inspector/symbols.js";

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

  constructor(config: ChildContainerConfig<TProvides, TAsyncPorts>) {
    const adapterRegistry = new AdapterRegistry<TProvides, TAsyncPorts>(config.parent);

    // Create HooksRunner from PluginManager if available
    const hooksRunner = ChildContainerImpl.createHooksRunner(config);

    super(adapterRegistry, hooksRunner);

    this.parentContainer = config.parent;
    this.inheritanceModes = config.inheritanceModes;
    this.inheritanceResolver = new InheritanceResolver(config.parent, config.inheritanceModes);
    this.containerId = config.containerId;
    this.parentContainerId = config.parentContainerId;

    this.initializeFromParent(config);
  }

  private static createHooksRunner<
    TProvides extends Port<unknown, string>,
    TAsyncPorts extends Port<unknown, string>,
  >(config: ChildContainerConfig<TProvides, TAsyncPorts>): HooksRunner | null {
    const { pluginManager, containerId, parentContainerId } = config;
    if (pluginManager === null) {
      return null;
    }

    const composedHooks = pluginManager.getComposedHooks();
    if (composedHooks === null) {
      return null;
    }

    const containerMetadata: ContainerMetadata = {
      containerId,
      containerKind: "child",
      parentContainerId,
    };

    return new HooksRunner(composedHooks, containerMetadata);
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
}
