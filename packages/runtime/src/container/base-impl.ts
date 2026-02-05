/**
 * Base container implementation with shared logic.
 *
 * @packageDocumentation
 * @internal
 */

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

/**
 * Abstract base class for container implementations.
 *
 * Provides shared functionality for both root and child containers:
 * - Resolution delegation (via ResolutionEngine, AsyncResolutionEngine)
 * - Lifecycle management (disposal, child registration)
 * - DevTools state access
 *
 * @internal
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
      (port, scopedMemo, scopeId) => this.resolveInternal(port, scopedMemo, scopeId)
    );

    this.asyncResolutionEngine = new AsyncResolutionEngine(
      this.singletonMemo,
      this.resolutionContext,
      this.hooksRunner,
      (port, scopedMemo, scopeId) => this.resolveAsyncInternal(port, scopedMemo, scopeId)
    );
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
    this.wrapper = wrapper;
    this.onWrapperSet(wrapper);
  }

  getWrapper(): unknown {
    return this.wrapper;
  }

  get isDisposed(): boolean {
    return this.lifecycleManager.isDisposed;
  }

  get isInitialized(): boolean {
    return this.asyncInitializer.isInitialized;
  }

  registerChildContainer(child: DisposableChild): void {
    this.lifecycleManager.registerChildContainer(child);
  }

  unregisterChildContainer(child: DisposableChild): void {
    this.lifecycleManager.unregisterChildContainer(child);
  }

  hasAdapter(port: Port<unknown, string>): boolean {
    return this.adapterRegistry.has(port);
  }

  getAdapter(port: Port<unknown, string>): RuntimeAdapter | undefined {
    return this.adapterRegistry.get(port);
  }

  has(port: Port<unknown, string>): boolean {
    const adapter = this.getAdapter(port);
    if (adapter === undefined) return false;
    if (adapter.lifetime === "scoped") return false;
    return true;
  }

  // ===========================================================================
  // Resolution
  // ===========================================================================

  resolve<P extends TProvides | TExtends>(port: P): InferService<P> {
    const portName = port.__portName;

    if (this.lifecycleManager.isDisposed) {
      throw new DisposedScopeError(portName);
    }

    // Check if should resolve locally
    if (this.adapterRegistry.shouldResolveLocally(port, this.isRoot)) {
      const adapter = this.adapterRegistry.getLocal(port);
      if (adapter === undefined || !isAdapterForPort(adapter, port)) {
        throw new Error(`No adapter registered for port '${portName}'`);
      }

      if (adapter.lifetime === "scoped") {
        throw new ScopeRequiredError(portName);
      }

      if (!this.asyncInitializer.isInitialized && this.asyncInitializer.hasAsyncPort(port)) {
        throw new AsyncInitializationRequiredError(portName);
      }

      return this.resolveWithAdapter(port, adapter, this.singletonMemo, null);
    }

    // Delegate to inheritance handling (child) or throw (root)
    return this.resolveWithInheritance(port);
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
      return this.resolveInternalFallback(port, portName);
    }

    return this.resolveWithAdapter(port, adapter, scopedMemo, scopeId);
  }

  protected resolveWithAdapter<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null
  ): InferService<P> {
    return this.resolutionEngine.resolve(port, adapter, scopedMemo, scopeId);
  }

  // ===========================================================================
  // Async Resolution
  // ===========================================================================

  async resolveAsync<P extends TProvides | TExtends>(port: P): Promise<InferService<P>> {
    const portName = port.__portName;
    if (this.lifecycleManager.isDisposed) {
      throw new DisposedScopeError(portName);
    }

    // Check if should resolve locally
    if (this.adapterRegistry.shouldResolveLocally(port, this.isRoot)) {
      const adapter = this.adapterRegistry.getLocal(port);
      if (adapter === undefined || !isAdapterForPort(adapter, port)) {
        throw new Error(`No adapter registered for port '${portName}'`);
      }
      if (adapter.lifetime === "scoped") {
        throw new ScopeRequiredError(portName);
      }
      return this.resolveAsyncWithAdapter(port, adapter, this.singletonMemo, null);
    }

    // Delegate to async fallback
    return this.resolveAsyncInternalFallback(port) as Promise<InferService<P>>;
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
    const adapter = this.getAdapter(port);

    if (adapter === undefined || !isAdapterForPort(adapter, port)) {
      return this.resolveAsyncInternalFallback(port);
    }

    return this.resolveAsyncWithAdapter(port, adapter, scopedMemo, scopeId);
  }

  protected resolveAsyncWithAdapter<P extends Port<unknown, string>>(
    port: P,
    adapter: RuntimeAdapterFor<P>,
    scopedMemo: MemoMap,
    scopeId: string | null
  ): Promise<InferService<P>> {
    return this.asyncResolutionEngine.resolve(port, adapter, scopedMemo, scopeId);
  }

  // ===========================================================================
  // Scope Management
  // ===========================================================================

  registerChildScope(scope: DisposableChild): void {
    this.lifecycleManager.registerChildScope(scope);
  }

  unregisterChildScope(scope: DisposableChild): void {
    this.lifecycleManager.unregisterChildScope(scope);
  }

  getSingletonMemo(): MemoMap {
    return this.singletonMemo;
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
    await this.lifecycleManager.dispose(this.singletonMemo, this.getParentUnregisterCallback());
  }

  // ===========================================================================
  // Internal State (for DevTools)
  // ===========================================================================

  getInternalState(): ContainerInternalState {
    if (this.lifecycleManager.isDisposed) {
      throw new DisposedScopeError(this.isRoot ? "container" : "child-container");
    }

    const childScopeSnapshots = this.lifecycleManager.getChildScopeSnapshots(scope => {
      // SAFETY: Scope type widening for iteration. Child scopes stored in Set<> have
      // narrower type parameters but need wider type for generic iteration callback.
      // Sound because ScopeImpl's getInternalState() doesn't depend on type parameters.
      const typedScope = scope as ScopeImpl<
        TProvides | TExtends,
        TAsyncPorts,
        "uninitialized" | "initialized"
      >;
      return typedScope.getInternalState();
    });

    const childContainerSnapshots = this.lifecycleManager.getChildContainerSnapshots(container => {
      // Child containers are stored as wrapper objects, not impl instances.
      // Access internal state via INTERNAL_ACCESS symbol protocol.
      const accessible = asInternalAccessible(container, "getInternalState");
      const state = accessible[INTERNAL_ACCESS]();
      // Include wrapper reference so InspectorPlugin can access INSPECTOR API directly
      return { ...state, wrapper: container };
    });

    // Create the overridePorts set and isOverride function
    const overridePorts = this.adapterRegistry.overridePorts;
    const isOverride = (portName: string): boolean => this.adapterRegistry.isOverride(portName);

    const snapshot: ContainerInternalState = {
      disposed: this.lifecycleManager.isDisposed,
      singletonMemo: createMemoMapSnapshot(this.singletonMemo),
      childScopes: Object.freeze(childScopeSnapshots),
      childContainers: Object.freeze(childContainerSnapshots),
      adapterMap: this.createAdapterMapSnapshot(),
      containerId: "root",
      containerName: this.getContainerName(),
      overridePorts,
      isOverride,
    };
    return Object.freeze(snapshot);
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
    const map = new Map<
      Port<unknown, string>,
      import("../inspection/internal-state-types.js").AdapterInfo
    >();
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
}
