/**
 * Internal Container implementation.
 * @packageDocumentation
 */

import type { Port, InferService } from "@hex-di/ports";
import type { Graph, Adapter, Lifetime, FactoryKind } from "@hex-di/graph";
import type { ContainerOptions } from "../resolution/hooks.js";
import type { ResolutionHooks, ResolutionHookContext } from "../resolution/hooks.js";
import { MemoMap } from "../common/memo-map.js";
import { ResolutionContext } from "../resolution/context.js";
import { ScopeImpl } from "../scope/impl.js"; // Circular import
import {
  DisposedScopeError,
  ScopeRequiredError,
  FactoryError,
  AsyncFactoryError,
  AsyncInitializationRequiredError,
  ContainerError,
} from "../common/errors.js";
import type {
  AdapterInfo,
  ContainerInternalState,
  MemoMapSnapshot,
  MemoEntrySnapshot,
} from "../inspector/types.js";
import type { DisposableChild } from "../child-container/internal-types.js";

// Internal Types
type RuntimeAdapter = Adapter<
  Port<unknown, string>,
  Port<unknown, string> | never,
  Lifetime,
  FactoryKind
>;
type RuntimeAdapterFor<P extends Port<unknown, string>> = Adapter<
  P,
  Port<unknown, string> | never,
  Lifetime,
  FactoryKind
>;

function isAdapterForPort<P extends Port<unknown, string>>(
  adapter: RuntimeAdapter,
  port: P
): adapter is RuntimeAdapterFor<P> {
  return adapter.provides === port;
}

function _isAsyncAdapter<P extends Port<unknown, string>>(
  adapter: RuntimeAdapterFor<P>
): adapter is Adapter<P, Port<unknown, string> | never, Lifetime, "async"> {
  return adapter.factoryKind === "async";
}

function assertSyncAdapter<P extends Port<unknown, string>>(
  adapter: RuntimeAdapterFor<P>,
  portName: string
): asserts adapter is Adapter<P, Port<unknown, string> | never, Lifetime, "sync"> {
  if (adapter.factoryKind === "async") {
    throw new AsyncInitializationRequiredError(portName);
  }
}

interface ParentStackEntry {
  readonly port: Port<unknown, string>;
  readonly startTime: number;
}

interface HooksState {
  readonly hooks: ResolutionHooks;
  readonly parentStack: ParentStackEntry[];
}

/**
 * Internal Container implementation class.
 * @internal
 */
export class ContainerImpl<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
> {
  private readonly graph: Graph<TProvides, Port<unknown, string>>;
  private readonly singletonMemo: MemoMap;
  private disposed: boolean = false;
  private initialized: boolean = false;
  private readonly resolutionContext: ResolutionContext;
  private readonly adapterMap: Map<Port<unknown, string>, RuntimeAdapter>;
  private readonly asyncPorts: Set<Port<unknown, string>> = new Set();
  private readonly asyncAdapters: RuntimeAdapter[];
  private readonly pendingResolutions: Map<
    Port<unknown, string>,
    Map<string | null, Promise<unknown>>
  > = new Map();
  // Using array for LIFO disposal
  private readonly childScopes: Set<
    ScopeImpl<TProvides, TAsyncPorts, "uninitialized" | "initialized">
  > = new Set();
  private readonly childContainers: Array<{ dispose(): Promise<void>; isDisposed: boolean }> = [];
  private readonly hooksState: HooksState | undefined;
  private initializationPromise: Promise<void> | null = null;

  constructor(graph: Graph<TProvides, Port<unknown, string>>, options?: ContainerOptions) {
    this.graph = graph;
    this.singletonMemo = new MemoMap();
    this.resolutionContext = new ResolutionContext();

    this.adapterMap = new Map();
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
    asyncEntries.sort((a, b) => {
      const priorityA = a.adapter.initPriority ?? 100;
      const priorityB = b.adapter.initPriority ?? 100;
      const delta = priorityA - priorityB;
      return delta !== 0 ? delta : a.index - b.index;
    });
    this.asyncAdapters = asyncEntries.map(entry => entry.adapter);

    if (options?.hooks?.beforeResolve !== undefined || options?.hooks?.afterResolve !== undefined) {
      this.hooksState = {
        hooks: options.hooks,
        parentStack: [],
      };
    }
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  async initialize(): Promise<void> {
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
      for (const adapter of this.asyncAdapters) {
        await this.resolveAsyncInternal(adapter.provides, this.singletonMemo, null);
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
    return this.adapterMap.has(port);
  }

  getAdapter(port: Port<unknown, string>): RuntimeAdapter | undefined {
    return this.adapterMap.get(port);
  }

  has(port: Port<unknown, string>): port is TProvides {
    const adapter = this.adapterMap.get(port);
    if (adapter === undefined) {
      return false;
    }
    if (adapter.lifetime === "scoped") {
      return false;
    }
    return true;
  }

  resolve<P extends TProvides>(port: P): InferService<P> {
    const portName = port.__portName;

    if (this.disposed) {
      throw new DisposedScopeError(portName);
    }

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

  resolveInternal<P extends TProvides>(
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
    const adapter = this.adapterMap.get(port);
    if (adapter === undefined || !isAdapterForPort(adapter, port)) {
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

  async resolveAsync<P extends TProvides>(port: P): Promise<InferService<P>> {
    const portName = port.__portName;
    if (this.disposed) {
      throw new DisposedScopeError(portName);
    }
    const adapter = this.adapterMap.get(port);
    if (adapter === undefined || !isAdapterForPort(adapter, port)) {
      throw new Error(`No adapter registered for port '${portName}'`);
    }
    if (adapter.lifetime === "scoped") {
      throw new ScopeRequiredError(portName);
    }
    return this.resolveAsyncWithAdapter(port, adapter, this.singletonMemo, null);
  }

  resolveAsyncInternal<P extends TProvides>(
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
    const adapter = this.adapterMap.get(port);
    if (adapter === undefined || !isAdapterForPort(adapter, port)) {
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
        // Build deps object by resolving each required port
        const deps: Record<string, unknown> = {};
        for (const requiredPort of adapter.requires) {
          deps[requiredPort.__portName] = this.resolveInternal(requiredPort, scopedMemo, scopeId);
        }
        const instance = adapter.factory(deps);

        return instance;
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

  registerChildScope(
    scope: ScopeImpl<TProvides, TAsyncPorts, "uninitialized" | "initialized">
  ): void {
    this.childScopes.add(scope);
  }

  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }
    this.disposed = true;

    for (let i = this.childContainers.length - 1; i >= 0; i--) {
      const child = this.childContainers[i];
      if (child) {
        await child.dispose();
      }
    }
    this.childContainers.length = 0;

    for (const scope of this.childScopes) {
      await scope.dispose();
    }
    this.childScopes.clear();

    await this.singletonMemo.dispose();
  }

  getInternalState(): ContainerInternalState {
    if (this.disposed) {
      throw new DisposedScopeError("container");
    }

    const childScopeSnapshots = Array.from(this.childScopes)
      .map(scope => {
        try {
          return scope.getInternalState();
        } catch {
          return null;
        }
      })
      .filter(isNotNull);

    const snapshot: ContainerInternalState = {
      disposed: this.disposed,
      singletonMemo: createMemoMapSnapshot(this.singletonMemo),
      childScopes: Object.freeze(childScopeSnapshots),
      adapterMap: this.createAdapterMapSnapshot(),
    };
    return Object.freeze(snapshot);
  }

  private createAdapterMapSnapshot(): ReadonlyMap<Port<unknown, string>, AdapterInfo> {
    const map = new Map<Port<unknown, string>, AdapterInfo>();
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

  getSingletonMemo(): MemoMap {
    return this.singletonMemo;
  }
}

function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

function createMemoMapSnapshot(memo: MemoMap): MemoMapSnapshot {
  const entries: MemoEntrySnapshot[] = [];
  for (const [port, metadata] of memo.entries()) {
    entries.push(
      Object.freeze({
        port,
        portName: port.__portName,
        resolvedAt: metadata.resolvedAt,
        resolutionOrder: metadata.resolutionOrder,
      })
    );
  }
  return Object.freeze({
    size: entries.length,
    entries: Object.freeze(entries),
  });
}
