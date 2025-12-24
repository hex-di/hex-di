/**
 * Container implementation for both root and child containers.
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/ports";
import type { Lifetime } from "@hex-di/graph";
import type { ResolutionHookContext } from "../resolution/hooks.js";
import { MemoMap } from "../common/memo-map.js";
import { ResolutionContext } from "../resolution/context.js";
import { ScopeImpl } from "../scope/impl.js";
import {
  DisposedScopeError,
  ScopeRequiredError,
  FactoryError,
  AsyncFactoryError,
  AsyncInitializationRequiredError,
  ContainerError,
} from "../common/errors.js";
import type { ContainerInternalState, ScopeInternalState } from "../inspector/types.js";
import type { InheritanceMode } from "../types.js";
import type {
  RuntimeAdapter,
  RuntimeAdapterFor,
  ParentStackEntry,
  HooksState,
  ForkedEntry,
  DisposableChild,
  ParentContainerLike,
  RootContainerConfig,
  ChildContainerConfig,
  ContainerConfig,
} from "./internal-types.js";
import { isAdapterForPort, assertSyncAdapter, isForkedEntryForPort } from "./internal-types.js";
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
  private disposed: boolean = false;
  private readonly childScopes: Set<
    ScopeImpl<TProvides | TExtends, TAsyncPorts, "uninitialized" | "initialized">
  > = new Set();
  private readonly childContainers: Array<DisposableChild> = [];

  // Root-only state
  private readonly isRoot: boolean;
  private readonly asyncPorts: Set<Port<unknown, string>>;
  private readonly asyncAdapters: RuntimeAdapter[];
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private readonly hooksState: HooksState | undefined;
  private readonly pendingResolutions: Map<
    Port<unknown, string>,
    Map<string | null, Promise<unknown>>
  >;

  // Child-only state
  private readonly parentContainer: ParentContainerLike<TProvides, TAsyncPorts> | null;
  private readonly inheritanceModes: ReadonlyMap<string, InheritanceMode>;
  private readonly forkedInstances: Map<string, ForkedEntry<Port<unknown, string>>>;
  private readonly localPorts: Set<Port<unknown, string>>;
  private wrapper: unknown = null;

  constructor(config: ContainerConfig<TProvides, TAsyncPorts>) {
    this.singletonMemo = new MemoMap();
    this.resolutionContext = new ResolutionContext();
    this.adapterMap = new Map();
    this.asyncPorts = new Set();
    this.asyncAdapters = [];
    this.pendingResolutions = new Map();
    this.forkedInstances = new Map();
    this.localPorts = new Set();

    if (config.kind === "root") {
      this.isRoot = true;
      this.parentContainer = null;
      this.inheritanceModes = new Map();
      this.hooksState = this.initializeFromGraph(config);
    } else {
      this.isRoot = false;
      this.parentContainer = config.parent;
      this.inheritanceModes = config.inheritanceModes;
      this.hooksState = undefined;
      this.initializeFromParent(config);
    }
  }

  private initializeFromGraph(
    config: RootContainerConfig<TProvides, TAsyncPorts>
  ): HooksState | undefined {
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

    // Initialize hooks if provided
    if (options?.hooks?.beforeResolve !== undefined || options?.hooks?.afterResolve !== undefined) {
      return {
        hooks: options.hooks,
        parentStack: [],
      };
    }
    return undefined;
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
    return this.disposed;
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  async initialize(): Promise<void> {
    if (!this.isRoot) {
      throw new Error("Child containers cannot be initialized - they inherit state from parent");
    }

    if (this.disposed) {
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
    this.childContainers.push(child);
  }

  unregisterChildContainer(child: DisposableChild): void {
    const idx = this.childContainers.indexOf(child);
    if (idx !== -1) {
      this.childContainers.splice(idx, 1);
    }
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

    if (this.disposed) {
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
    const portName = port.__portName;
    const mode = this.inheritanceModes.get(portName) ?? "shared";

    if (this.parentContainer === null) {
      throw new Error(`Port ${portName} not found - no parent container.`);
    }

    switch (mode) {
      case "shared":
        // Type assertion needed because parent only knows about TProvides
        return this.parentContainer.resolveInternal(
          port as unknown as TProvides
        ) as InferService<P>;

      case "forked": {
        const cached = this.forkedInstances.get(portName);
        if (cached !== undefined && isForkedEntryForPort(cached, port)) {
          return cached.instance;
        }
        const parentInstance = this.parentContainer.resolveInternal(port as unknown as TProvides);
        const forkedInstance = this.shallowClone(parentInstance) as InferService<P>;
        const entry: ForkedEntry<P> = { port, instance: forkedInstance };
        this.forkedInstances.set(portName, entry as ForkedEntry<Port<unknown, string>>);
        return forkedInstance;
      }

      case "isolated":
        return this.singletonMemo.getOrElseMemoize(
          port,
          () => this.createIsolatedInstance(port),
          undefined
        );

      default:
        throw new Error(`Unknown inheritance mode: ${mode}`);
    }
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
      // For child containers, delegate to parent if not local
      if (!this.isRoot && this.parentContainer !== null && !this.localPorts.has(port)) {
        const mode = this.inheritanceModes.get(portName) ?? "shared";
        if (mode === "shared") {
          return this.parentContainer.resolveInternal(port as TProvides);
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
    if (this.hooksState === undefined) {
      return this.resolveWithAdapterCore(port, adapter, scopedMemo, scopeId);
    }

    const { hooks, parentStack } = this.hooksState;
    const isCacheHit = this.checkCacheHit(port, adapter, scopedMemo);
    const context = this.createResolutionContext(port, adapter, scopeId, isCacheHit, parentStack);

    if (hooks.beforeResolve !== undefined) {
      hooks.beforeResolve(context);
    }

    const startTime = Date.now();
    parentStack.push({ port, startTime });

    let error: Error | null = null;
    try {
      return this.resolveWithAdapterCore(port, adapter, scopedMemo, scopeId);
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
      throw e;
    } finally {
      this.emitAfterResolve(context, startTime, error, parentStack);
    }
  }

  private resolveWithAdapterCore<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null
  ): InferService<P> {
    switch (adapter.lifetime) {
      case "singleton":
        return this.singletonMemo.getOrElseMemoize(
          port,
          () => this.createInstance(port, adapter, scopedMemo, scopeId),
          adapter.finalizer
        );

      case "scoped":
        return scopedMemo.getOrElseMemoize(
          port,
          () => this.createInstance(port, adapter, scopedMemo, scopeId),
          adapter.finalizer
        );

      case "transient":
        return this.createInstance(port, adapter, scopedMemo, scopeId);

      default:
        throw new Error(`Unknown lifetime: ${adapter.lifetime}`);
    }
  }

  private createInstance<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null
  ): InferService<P> {
    const portName = port.__portName;

    this.resolutionContext.enter(portName);

    try {
      assertSyncAdapter(adapter, portName);

      try {
        const deps: Record<string, unknown> = {};
        for (const requiredPort of adapter.requires) {
          deps[requiredPort.__portName] = this.resolveInternal(requiredPort, scopedMemo, scopeId);
        }
        return adapter.factory(deps);
      } catch (e) {
        if (e instanceof ContainerError) {
          throw e;
        }
        throw new FactoryError(portName, e);
      }
    } finally {
      this.resolutionContext.exit(portName);
    }
  }

  private createResolutionContext(
    port: Port<unknown, string>,
    adapter: RuntimeAdapter,
    scopeId: string | null,
    isCacheHit: boolean,
    parentStack: readonly { port: Port<unknown, string>; startTime: number }[]
  ): ResolutionHookContext {
    const parentEntry = parentStack.length > 0 ? parentStack[parentStack.length - 1] : null;

    return {
      port,
      portName: port.__portName,
      lifetime: adapter.lifetime,
      scopeId,
      parentPort: parentEntry?.port ?? null,
      isCacheHit,
      depth: parentStack.length,
    };
  }

  private emitAfterResolve(
    context: ResolutionHookContext,
    startTime: number,
    error: Error | null,
    parentStack: ParentStackEntry[]
  ): void {
    parentStack.pop();
    const duration = Date.now() - startTime;
    if (this.hooksState?.hooks.afterResolve !== undefined) {
      this.hooksState.hooks.afterResolve({
        ...context,
        duration,
        error,
      });
    }
  }

  private checkCacheHit(
    port: Port<unknown, string>,
    adapter: RuntimeAdapter,
    scopedMemo: MemoMap
  ): boolean {
    switch (adapter.lifetime) {
      case "singleton":
        return this.singletonMemo.has(port);
      case "scoped":
        return scopedMemo.has(port);
      case "transient":
        return false;
      default:
        return false;
    }
  }

  // =============================================================================
  // Async Resolution
  // =============================================================================

  async resolveAsync<P extends TProvides | TExtends>(port: P): Promise<InferService<P>> {
    const portName = port.__portName;
    if (this.disposed) {
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

  private async resolveAsyncWithAdapter<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null
  ): Promise<InferService<P>> {
    if (this.hooksState === undefined) {
      return this.resolveAsyncWithAdapterCore(port, adapter, scopedMemo, scopeId);
    }

    const isCacheHit = this.checkCacheHit(port, adapter, scopedMemo);
    if (isCacheHit) {
      return this.runAsyncHooks(
        port,
        adapter,
        scopeId,
        true,
        () => this.resolveAsyncWithAdapterCore(port, adapter, scopedMemo, scopeId),
        this.hooksState
      );
    }

    return this.resolveAsyncWithAdapterCore(port, adapter, scopedMemo, scopeId);
  }

  private resolveAsyncWithAdapterCore<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null
  ): Promise<InferService<P>>;
  private resolveAsyncWithAdapterCore(
    port: Port<unknown, string>,
    adapter: RuntimeAdapter,
    scopedMemo: MemoMap,
    scopeId: string | null
  ): Promise<unknown>;
  private resolveAsyncWithAdapterCore(
    port: Port<unknown, string>,
    adapter: RuntimeAdapter,
    scopedMemo: MemoMap,
    scopeId: string | null
  ): Promise<unknown> {
    const memo = this.getMemoForLifetime(adapter.lifetime, scopedMemo);
    const cached = memo?.getIfPresent(port);
    if (cached !== undefined) {
      return Promise.resolve(cached);
    }

    let scopePending = this.pendingResolutions.get(port);
    if (scopePending === undefined) {
      scopePending = new Map();
      this.pendingResolutions.set(port, scopePending);
    }

    const pending = scopePending.get(scopeId);
    if (pending !== undefined) {
      return pending;
    }

    const promise = this.createPendingResolutionPromise(port, adapter, scopedMemo, scopeId, memo);
    scopePending.set(scopeId, promise);
    return promise;
  }

  private getMemoForLifetime(lifetime: Lifetime, scopedMemo: MemoMap): MemoMap | null {
    switch (lifetime) {
      case "singleton":
        return this.singletonMemo;
      case "scoped":
        return scopedMemo;
      default:
        return null;
    }
  }

  private createPendingResolutionPromise<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null,
    memo: MemoMap | null
  ): Promise<InferService<P>> {
    const resolution = () => this.executeAsyncResolution(port, adapter, scopedMemo, scopeId, memo);
    const hooksState = this.hooksState;
    const runner =
      hooksState !== undefined
        ? () => this.runAsyncHooks(port, adapter, scopeId, false, resolution, hooksState)
        : resolution;

    const promise = runner();
    promise.catch(() => {});
    const cleanupPromise = promise.finally(() => this.cleanupPending(port, scopeId));
    cleanupPromise.catch(() => {});
    return promise;
  }

  private executeAsyncResolution<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null,
    memo: MemoMap | null
  ): Promise<InferService<P>> {
    const factory = () => this.createInstanceAsync(port, adapter, scopedMemo, scopeId);
    if (memo !== null) {
      return memo.getOrElseMemoizeAsync(port, factory, adapter.finalizer);
    }
    return factory();
  }

  private runAsyncHooks<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopeId: string | null,
    isCacheHit: boolean,
    callback: () => Promise<InferService<P>>,
    hooksState: HooksState
  ): Promise<InferService<P>> {
    const { hooks, parentStack } = hooksState;
    const context = this.createResolutionContext(port, adapter, scopeId, isCacheHit, parentStack);

    if (hooks.beforeResolve !== undefined) {
      hooks.beforeResolve(context);
    }

    const startTime = Date.now();
    parentStack.push({ port, startTime });

    let error: Error | null = null;
    return callback()
      .catch(err => {
        error = err instanceof Error ? err : new Error(String(err));
        throw err;
      })
      .finally(() => {
        this.emitAfterResolve(context, startTime, error, parentStack);
      });
  }

  private cleanupPending(port: Port<unknown, string>, scopeId: string | null): void {
    const currentPending = this.pendingResolutions.get(port);
    if (currentPending) {
      currentPending.delete(scopeId);
      if (currentPending.size === 0) {
        this.pendingResolutions.delete(port);
      }
    }
  }

  private async createInstanceAsync<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null
  ): Promise<InferService<P>> {
    const portName = port.__portName;
    this.resolutionContext.enter(portName);

    try {
      const deps: Record<string, unknown> = {};
      for (const requiredPort of adapter.requires) {
        deps[requiredPort.__portName] = await this.resolveAsyncInternal(
          requiredPort,
          scopedMemo,
          scopeId
        );
      }
      const instance = await adapter.factory(deps);
      return instance;
    } catch (e) {
      if (e instanceof ContainerError) {
        throw e;
      }
      throw new AsyncFactoryError(portName, e);
    } finally {
      this.resolutionContext.exit(portName);
    }
  }

  // =============================================================================
  // Scope Management
  // =============================================================================

  registerChildScope(
    scope: ScopeImpl<TProvides | TExtends, TAsyncPorts, "uninitialized" | "initialized">
  ): void {
    this.childScopes.add(scope);
  }

  getSingletonMemo(): MemoMap {
    return this.singletonMemo;
  }

  // =============================================================================
  // Disposal
  // =============================================================================

  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }
    this.disposed = true;

    // Dispose child containers in LIFO order
    for (let i = this.childContainers.length - 1; i >= 0; i--) {
      const child = this.childContainers[i];
      if (child) {
        await child.dispose();
      }
    }
    this.childContainers.length = 0;

    // Dispose child scopes
    for (const scope of this.childScopes) {
      await scope.dispose();
    }
    this.childScopes.clear();

    // Dispose singleton memo
    await this.singletonMemo.dispose();

    // Unregister from parent if child container
    if (
      !this.isRoot &&
      this.parentContainer !== null &&
      this.wrapper !== null &&
      isDisposableChild(this.wrapper)
    ) {
      this.parentContainer.unregisterChildContainer(this.wrapper);
    }
  }

  // =============================================================================
  // Internal State (for DevTools)
  // =============================================================================

  getInternalState(): ContainerInternalState {
    if (this.disposed) {
      throw new DisposedScopeError(this.isRoot ? "container" : "child-container");
    }

    const childScopeSnapshots = Array.from(this.childScopes)
      .map(scope => {
        try {
          return scope.getInternalState();
        } catch {
          return null;
        }
      })
      .filter((s): s is ScopeInternalState => s !== null);

    const snapshot: ContainerInternalState = {
      disposed: this.disposed,
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
