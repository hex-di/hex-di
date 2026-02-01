/**
 * Root container implementation.
 *
 * @packageDocumentation
 * @internal
 */

import type { Port, InferService } from "@hex-di/core";
import { DisposedScopeError } from "../errors/index.js";
import type { RootContainerConfig } from "./internal-types.js";
import { HooksRunner, type ContainerMetadata } from "../resolution/hooks-runner.js";
import { AdapterRegistry } from "./internal/adapter-registry.js";
import { BaseContainerImpl } from "./base-impl.js";

/**
 * Root container created from a Graph.
 *
 * Features:
 * - Async adapter initialization
 * - Resolution hooks support
 * - No parent container
 *
 * @internal
 */
export class RootContainerImpl<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
> extends BaseContainerImpl<TProvides, never, TAsyncPorts> {
  protected readonly isRoot = true as const;
  private readonly containerNameValue: string;

  constructor(config: RootContainerConfig<TProvides, TAsyncPorts>) {
    const adapterRegistry = new AdapterRegistry<TProvides, TAsyncPorts>(null);
    const hooksRunner = RootContainerImpl.createHooksRunner(config);

    super(adapterRegistry, hooksRunner);

    this.containerNameValue = config.containerName;
    this.initializeFromGraph(config);
  }

  protected getContainerName(): string {
    return this.containerNameValue;
  }

  private static createHooksRunner<
    TProvides extends Port<unknown, string>,
    TAsyncPorts extends Port<unknown, string>,
  >(config: RootContainerConfig<TProvides, TAsyncPorts>): HooksRunner | null {
    const { options } = config;
    if (options?.hooks?.beforeResolve !== undefined || options?.hooks?.afterResolve !== undefined) {
      const containerMetadata: ContainerMetadata = {
        containerId: "root",
        containerKind: "root",
        parentContainerId: null,
      };
      return new HooksRunner(options.hooks, containerMetadata);
    }
    return null;
  }

  private initializeFromGraph(config: RootContainerConfig<TProvides, TAsyncPorts>): void {
    const { graph } = config;

    for (const adapter of graph.adapters) {
      // Root containers don't use "local" tracking - all adapters are root-level
      this.adapterRegistry.register(adapter.provides, adapter, false);
      if (adapter.factoryKind === "async") {
        this.asyncInitializer.registerAdapter(adapter);
      }
    }

    // Finalize adapter registration (computes topological initialization levels)
    this.asyncInitializer.finalizeRegistration();
  }

  // ===========================================================================
  // Abstract Method Implementations
  // ===========================================================================

  protected onWrapperSet(_wrapper: unknown): void {
    // Root containers don't register with a parent
  }

  getParent(): unknown {
    return undefined;
  }

  async initialize(): Promise<void> {
    if (this.lifecycleManager.isDisposed) {
      throw new DisposedScopeError("container");
    }

    await this.asyncInitializer.initialize(port =>
      this.resolveAsyncInternal(port, this.singletonMemo, null)
    );
  }

  protected getParentUnregisterCallback(): undefined {
    return undefined;
  }

  protected resolveWithInheritance<P extends TProvides>(port: P): InferService<P> {
    // Root containers have no inheritance - all ports should be local
    throw new Error(`No adapter registered for port '${port.__portName}'`);
  }

  protected resolveInternalFallback(_port: Port<unknown, string>, portName: string): never {
    throw new Error(`No adapter registered for port '${portName}'`);
  }

  protected resolveAsyncInternalFallback(port: Port<unknown, string>): Promise<never> {
    return Promise.reject(new Error(`No adapter registered for port '${port.__portName}'`));
  }
}
