/**
 * Container implementation for both root and child containers.
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/ports";
import { MemoMap } from "../common/memo-map.js";
import { ResolutionContext } from "../resolution/context.js";
import { ScopeImpl } from "../scope/impl.js";
import {
  DisposedScopeError,
  ScopeRequiredError,
  FactoryError,
  AsyncFactoryError,
  AsyncInitializationRequiredError,
} from "../common/errors.js";
import type { ContainerInternalState } from "../inspector/types.js";
import type { InheritanceMode } from "../types.js";
import type {
  RuntimeAdapter,
  RuntimeAdapterFor,
  DisposableChild,
  ParentContainerLike,
  RootContainerConfig,
  ChildContainerConfig,
  ContainerConfig,
} from "./internal-types.js";
import { isAdapterForPort, assertSyncAdapter } from "./internal-types.js";
import { HooksRunner } from "./hooks-runner.js";
import { LifecycleManager } from "./lifecycle-manager.js";
import { InheritanceResolver } from "./inheritance-resolver.js";
import { ResolutionEngine } from "./resolution-engine.js";
import { AsyncResolutionEngine } from "./async-resolution-engine.js";
import { isDisposableChild, createMemoMapSnapshot } from "./helpers.js";
import { ADAPTER_ACCESS } from "../inspector/symbols.js";

// Re-export types needed by other modules
export type {
  RuntimeAdapter,
  DisposableChild,
  ParentContainerLike,
  RootContainerConfig,
  ChildContainerConfig,
  ContainerConfig,
  ScopeContainerAccess,
} from "./internal-types.js";

/**
 * Internal Container implementation that handles both root and child containers.
 *
 * - Root containers (kind: "root") are created from a Graph and can be initialized
 * - Child containers (kind: "child") are created from a parent with overrides/extensions
 *
 * @internal
 */
export class ContainerImpl<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
> {
  // Core state (all containers)
  private readonly adapterMap: Map<Port<unknown, string>, RuntimeAdapter>;
  private readonly singletonMemo: MemoMap;
  private readonly resolutionContext: ResolutionContext;
  private readonly lifecycleManager: LifecycleManager;

  // Root-only state
  private readonly isRoot: boolean;
  private readonly asyncPorts: Set<Port<unknown, string>>;
  private readonly asyncAdapters: RuntimeAdapter[];
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private readonly hooksRunner: HooksRunner | null;
  private readonly resolutionEngine: ResolutionEngine;
  private readonly asyncResolutionEngine: AsyncResolutionEngine;

  // Child-only state
  private readonly parentContainer: ParentContainerLike<TProvides, TAsyncPorts> | null;
  private readonly inheritanceModes: ReadonlyMap<string, InheritanceMode>;
  private readonly inheritanceResolver: InheritanceResolver<TProvides, TAsyncPorts> | null;
  private readonly localPorts: Set<Port<unknown, string>>;
  private wrapper: unknown = null;

  constructor(config: ContainerConfig<TProvides, TAsyncPorts>) {
    this.singletonMemo = new MemoMap();
    this.resolutionContext = new ResolutionContext();
    this.lifecycleManager = new LifecycleManager();
    this.adapterMap = new Map();
    this.asyncPorts = new Set();
    this.asyncAdapters = [];
    this.localPorts = new Set();

    if (config.kind === "root") {
      this.isRoot = true;
      this.parentContainer = null;
      this.inheritanceModes = new Map();
      this.inheritanceResolver = null;
      this.hooksRunner = this.initializeFromGraph(config);
    } else {
      this.isRoot = false;
      this.parentContainer = config.parent;
      this.inheritanceModes = config.inheritanceModes;
      this.inheritanceResolver = new InheritanceResolver(config.parent, config.inheritanceModes);
      this.hooksRunner = null;
      this.initializeFromParent(config);
    }

    // Initialize resolution engines with dependency resolver callbacks
    this.resolutionEngine = new ResolutionEngine(
      this.singletonMemo,
      this.resolutionContext,
      this.hooksRunner,
      (port, scopedMemo, scopeId) => this.resolveInternal(port, scopedMemo, scopeId)
    );

    this.asyncResolutionEngine = new AsyncResolutionEngine(
      this.singletonMemo,
      this.resolutionContext,
      this.hooksRunner,
      (port, scopedMemo, scopeId) => this.resolveAsyncInternal(port, scopedMemo, scopeId)
    );
  }

  private initializeFromGraph(
    config: RootContainerConfig<TProvides, TAsyncPorts>
  ): HooksRunner | null {
    const { graph, options } = config;
    const asyncEntries: Array<{ adapter: RuntimeAdapter; index: number }> = [];
    let adapterIndex = 0;

    for (const adapter of graph.adapters) {
      this.adapterMap.set(adapter.provides, adapter);
      if (adapter.factoryKind === "async") {
        this.asyncPorts.add(adapter.provides);
        asyncEntries.push({ adapter, index: adapterIndex });
      }
      adapterIndex++;
    }

    // Sort async adapters by priority with stable ordering:
    // 1. Lower priority values are initialized first
    // 2. When priorities are equal, original insertion order is preserved
    // This ensures deterministic initialization order, even after merge operations
    asyncEntries.sort((a, b) => {
      const priorityA = a.adapter.initPriority ?? 100;
      const priorityB = b.adapter.initPriority ?? 100;
      const delta = priorityA - priorityB;
      return delta !== 0 ? delta : a.index - b.index;
    });
    this.asyncAdapters.push(...asyncEntries.map(entry => entry.adapter));

    // Create HooksRunner if hooks are provided
    if (options?.hooks?.beforeResolve !== undefined || options?.hooks?.afterResolve !== undefined) {
      return new HooksRunner(options.hooks);
    }
    return null;
  }

  private initializeFromParent(config: ChildContainerConfig<TProvides, TAsyncPorts>): void {
    const { overrides, extensions } = config;

    // Add overrides
    for (const [port, adapter] of overrides) {
      this.adapterMap.set(port, adapter);
      this.localPorts.add(port);
    }

    // Add extensions
    for (const [port, adapter] of extensions) {
      this.adapterMap.set(port, adapter);
      this.localPorts.add(port);
    }

    // Child containers are considered initialized (inherit from parent)
    this.initialized = true;
  }

  setWrapper(wrapper: unknown): void {
    this.wrapper = wrapper;
    if (this.parentContainer !== null && isDisposableChild(wrapper)) {
      this.parentContainer.registerChildContainer(wrapper);
    }
  }

  getWrapper(): unknown {
    return this.wrapper;
  }

  // =============================================================================
  // Public API
  // =============================================================================

  get isDisposed(): boolean {
    return this.lifecycleManager.isDisposed;
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  async initialize(): Promise<void> {
    if (!this.isRoot) {
      throw new Error("Child containers cannot be initialized - they inherit state from parent");
    }

    if (this.lifecycleManager.isDisposed) {
      throw new DisposedScopeError("container");
    }
    if (this.initialized) {
      return;
    }
    if (this.initializationPromise !== null) {
      await this.initializationPromise;
      return;
    }

    this.initializationPromise = (async () => {
      const totalAdapters = this.asyncAdapters.length;
      for (let i = 0; i < totalAdapters; i++) {
        const adapter = this.asyncAdapters[i];
        try {
          await this.resolveAsyncInternal(adapter.provides, this.singletonMemo, null);
        } catch (error) {
          // Enhance error with initialization context if not already an AsyncFactoryError
          if (error instanceof AsyncFactoryError) {
            throw error;
          }
          // Add initialization context to the error message
          const portName = adapter.provides.__portName;
          const contextMessage =
            error instanceof Error
              ? `${error.message} (initialization step ${i + 1}/${totalAdapters})`
              : String(error);
          throw new AsyncFactoryError(portName, new Error(contextMessage));
        }
      }
      this.initialized = true;
    })();

    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  registerChildContainer(child: DisposableChild): void {
    this.lifecycleManager.registerChildContainer(child);
  }

  unregisterChildContainer(child: DisposableChild): void {
    this.lifecycleManager.unregisterChildContainer(child);
  }

  hasAdapter(port: Port<unknown, string>): boolean {
    if (this.adapterMap.has(port)) return true;
    if (this.parentContainer !== null) {
      return this.parentContainer[ADAPTER_ACCESS](port) !== undefined;
    }
    return false;
  }

  getAdapter(port: Port<unknown, string>): RuntimeAdapter | undefined {
    const local = this.adapterMap.get(port);
    if (local !== undefined) return local;
    if (this.parentContainer !== null) {
      return this.parentContainer[ADAPTER_ACCESS](port);
    }
    return undefined;
  }

  has(port: Port<unknown, string>): boolean {
    const adapter = this.getAdapter(port);
    if (adapter === undefined) return false;
    if (adapter.lifetime === "scoped") return false;
    return true;
  }

  getParent(): unknown {
    return this.parentContainer?.originalParent;
  }

  // =============================================================================
  // Resolution
  // =============================================================================

  resolve<P extends TProvides | TExtends>(port: P): InferService<P> {
    const portName = port.__portName;

    if (this.lifecycleManager.isDisposed) {
      throw new DisposedScopeError(portName);
    }

    // Check local adapters (overrides + extensions for child, all for root)
    if (this.localPorts.has(port) || (this.isRoot && this.adapterMap.has(port))) {
      const adapter = this.adapterMap.get(port);
      if (adapter === undefined || !isAdapterForPort(adapter, port)) {
        throw new Error(`No adapter registered for port '${portName}'`);
      }

      if (adapter.lifetime === "scoped") {
        throw new ScopeRequiredError(portName);
      }

      if (!this.initialized && this.asyncPorts.has(port)) {
        throw new AsyncInitializationRequiredError(portName);
      }

      return this.resolveWithAdapter(port, adapter, this.singletonMemo, null);
    }

    // For child containers, check inheritance mode
    if (!this.isRoot && this.parentContainer !== null) {
      return this.resolveWithInheritanceMode(port);
    }

    throw new Error(`No adapter registered for port '${portName}'`);
  }

  private resolveWithInheritanceMode<P extends TProvides | TExtends>(port: P): InferService<P> {
    if (this.inheritanceResolver === null || this.parentContainer === null) {
      throw new Error(`Port ${port.__portName} not found - no parent container.`);
    }

    const result = this.inheritanceResolver.tryResolve(port as unknown as TProvides);
    if (result.resolved) {
      return result.value as InferService<P>;
    }

    // Handle isolated mode in container (requires full type context)
    return this.createIsolatedInstance(port);
  }

  private createIsolatedInstance<P extends TProvides | TExtends>(port: P): InferService<P> {
    const portName = port.__portName;

    if (this.parentContainer === null) {
      throw new Error(`Cannot create isolated instance for ${portName} - no parent container.`);
    }

    const adapter = this.parentContainer[ADAPTER_ACCESS](port);
    if (adapter === undefined) {
      // Fallback: clone parent instance
      const parentInstance = this.parentContainer.resolveInternal(port as unknown as TProvides);
      return this.shallowClone(parentInstance) as InferService<P>;
    }

    if (!isAdapterForPort(adapter, port)) {
      throw new Error(`Adapter mismatch for port ${portName}.`);
    }

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

  private shallowClone<T>(obj: T): T {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }
    const prototype: object | null = Reflect.getPrototypeOf(obj);
    const shell: Record<PropertyKey, never> = {};
    Reflect.setPrototypeOf(shell, prototype);
    return Object.assign(shell, obj);
  }

  resolveInternal<P extends TProvides | TExtends>(
    port: P,
    scopedMemo: MemoMap,
    scopeId?: string | null
  ): InferService<P>;
  resolveInternal(
    port: Port<unknown, string>,
    scopedMemo: MemoMap,
    scopeId?: string | null
  ): unknown;
  resolveInternal(
    port: Port<unknown, string>,
    scopedMemo: MemoMap,
    scopeId: string | null = null
  ): unknown {
    const portName = port.__portName;
    const adapter = this.getAdapter(port);

    if (adapter === undefined || !isAdapterForPort(adapter, port)) {
      // For child containers, delegate to parent if not local and mode is shared
      if (this.inheritanceResolver !== null && !this.localPorts.has(port)) {
        const mode = this.inheritanceResolver.getMode(portName);
        if (mode === "shared") {
          return this.inheritanceResolver.resolveSharedInternal(port as TProvides);
        }
      }
      throw new Error(`No adapter registered for port '${portName}'`);
    }

    return this.resolveWithAdapter(port, adapter, scopedMemo, scopeId);
  }

  private resolveWithAdapter<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null
  ): InferService<P> {
    return this.resolutionEngine.resolve(port, adapter, scopedMemo, scopeId);
  }

  // =============================================================================
  // Async Resolution
  // =============================================================================

  async resolveAsync<P extends TProvides | TExtends>(port: P): Promise<InferService<P>> {
    const portName = port.__portName;
    if (this.lifecycleManager.isDisposed) {
      throw new DisposedScopeError(portName);
    }

    // Check local adapters
    if (this.localPorts.has(port) || (this.isRoot && this.adapterMap.has(port))) {
      const adapter = this.adapterMap.get(port);
      if (adapter === undefined || !isAdapterForPort(adapter, port)) {
        throw new Error(`No adapter registered for port '${portName}'`);
      }
      if (adapter.lifetime === "scoped") {
        throw new ScopeRequiredError(portName);
      }
      return this.resolveAsyncWithAdapter(port, adapter, this.singletonMemo, null);
    }

    // For child containers, delegate to parent
    if (!this.isRoot && this.parentContainer !== null) {
      return this.parentContainer.resolveAsyncInternal(port as unknown as TProvides) as Promise<
        InferService<P>
      >;
    }

    throw new Error(`No adapter registered for port '${portName}'`);
  }

  resolveAsyncInternal<P extends TProvides | TExtends>(
    port: P,
    scopedMemo: MemoMap,
    scopeId?: string | null
  ): Promise<InferService<P>>;
  resolveAsyncInternal(
    port: Port<unknown, string>,
    scopedMemo: MemoMap,
    scopeId?: string | null
  ): Promise<unknown>;
  async resolveAsyncInternal(
    port: Port<unknown, string>,
    scopedMemo: MemoMap,
    scopeId: string | null = null
  ): Promise<unknown> {
    const portName = port.__portName;
    const adapter = this.getAdapter(port);

    if (adapter === undefined || !isAdapterForPort(adapter, port)) {
      if (!this.isRoot && this.parentContainer !== null && !this.localPorts.has(port)) {
        return this.parentContainer.resolveAsyncInternal(port as TProvides);
      }
      throw new Error(`No adapter registered for port '${portName}'`);
    }

    return this.resolveAsyncWithAdapter(port, adapter, scopedMemo, scopeId);
  }

  private resolveAsyncWithAdapter<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null
  ): Promise<InferService<P>> {
    return this.asyncResolutionEngine.resolve(port, adapter, scopedMemo, scopeId);
  }

  // =============================================================================
  // Scope Management
  // =============================================================================

  registerChildScope(
    scope: ScopeImpl<TProvides | TExtends, TAsyncPorts, "uninitialized" | "initialized">
  ): void {
    this.lifecycleManager.registerChildScope(scope);
  }

  getSingletonMemo(): MemoMap {
    return this.singletonMemo;
  }

  // =============================================================================
  // Disposal
  // =============================================================================

  async dispose(): Promise<void> {
    // Build parent unregister callback if applicable
    const parentUnregister =
      !this.isRoot &&
      this.parentContainer !== null &&
      this.wrapper !== null &&
      isDisposableChild(this.wrapper)
        ? () => this.parentContainer!.unregisterChildContainer(this.wrapper as DisposableChild)
        : undefined;

    await this.lifecycleManager.dispose(this.singletonMemo, parentUnregister);
  }

  // =============================================================================
  // Internal State (for DevTools)
  // =============================================================================

  getInternalState(): ContainerInternalState {
    if (this.lifecycleManager.isDisposed) {
      throw new DisposedScopeError(this.isRoot ? "container" : "child-container");
    }

    const childScopeSnapshots = this.lifecycleManager.getChildScopeSnapshots(scope => {
      // Cast needed because LifecycleManager stores generic Disposable
      const typedScope = scope as ScopeImpl<
        TProvides | TExtends,
        TAsyncPorts,
        "uninitialized" | "initialized"
      >;
      return typedScope.getInternalState();
    });

    const snapshot: ContainerInternalState = {
      disposed: this.lifecycleManager.isDisposed,
      singletonMemo: createMemoMapSnapshot(this.singletonMemo),
      childScopes: Object.freeze(childScopeSnapshots),
      adapterMap: this.createAdapterMapSnapshot(),
    };
    return Object.freeze(snapshot);
  }

  private createAdapterMapSnapshot(): ReadonlyMap<
    Port<unknown, string>,
    import("../inspector/types.js").AdapterInfo
  > {
    const map = new Map<Port<unknown, string>, import("../inspector/types.js").AdapterInfo>();
    for (const [port, adapter] of this.adapterMap) {
      map.set(port, {
        portName: port.__portName,
        lifetime: adapter.lifetime,
        dependencyCount: 0,
        dependencyNames: [],
      });
    }
    return map;
  }
}
