/**
 * Container implementation for @hex-di/runtime.
 *
 * Provides the createContainer factory function that creates immutable
 * containers from validated graphs. Containers provide type-safe service
 * resolution with lifetime management and circular dependency detection.
 *
 * @packageDocumentation
 */

import type { Port, InferService, InferPortName } from "@hex-di/ports";
import type { Graph, Adapter, Lifetime, FactoryKind } from "@hex-di/graph";
import { ContainerBrand, ScopeBrand } from "./types.js";
import type { Container, Scope } from "./types.js";
import type {
  ContainerInternalState,
  ScopeInternalState,
  MemoMapSnapshot,
  MemoEntrySnapshot,
  AdapterInfo,
} from "./inspector-types.js";
import { MemoMap } from "./memo-map.js";
import { ResolutionContext } from "./resolution-context.js";
import { INTERNAL_ACCESS } from "./inspector-symbols.js";
import {
  DisposedScopeError,
  ScopeRequiredError,
  FactoryError,
  AsyncFactoryError,
  AsyncInitializationRequiredError,
} from "./errors.js";
import type {
  ContainerOptions,
  ResolutionHooks,
  ResolutionHookContext,
  ResolutionResultContext,
} from "./resolution-hooks.js";

// =============================================================================
// Internal Types
// =============================================================================

/**
 * Internal adapter type with runtime-accessible properties.
 * @internal
 */
type RuntimeAdapter = Adapter<
  Port<unknown, string>,
  Port<unknown, string> | never,
  Lifetime,
  FactoryKind
>;

/**
 * Entry in the parent stack for tracking resolution hierarchy.
 * @internal
 */
interface ParentStackEntry {
  /** The port being resolved */
  readonly port: Port<unknown, string>;
  /** Start time of resolution for duration calculation */
  readonly startTime: number;
}

/**
 * Internal state for resolution hooks.
 * Only allocated when hooks are provided (zero overhead otherwise).
 * @internal
 */
interface HooksState {
  /** The hooks configuration */
  readonly hooks: ResolutionHooks;
  /** Stack of parent ports for tracking nested resolution hierarchy */
  readonly parentStack: ParentStackEntry[];
}

// =============================================================================
// Scope ID Generation
// =============================================================================

/**
 * Module-level counter for generating unique scope IDs.
 * Incremented on each scope creation to ensure uniqueness.
 * @internal
 */
let scopeIdCounter = 0;

/**
 * Generates a unique scope ID.
 * @returns A unique scope ID in the format "scope-{number}"
 * @internal
 */
function generateScopeId(): string {
  return `scope-${scopeIdCounter++}`;
}

// =============================================================================
// ScopeImpl Class (Task Group 8: Scope Hierarchy)
// =============================================================================

/**
 * Internal Scope implementation class.
 *
 * Manages scope-level service resolution with:
 * - Singleton inheritance from root container (shared reference)
 * - Scoped instance isolation (unique per scope, not shared with parent/siblings)
 * - Child scope tracking for cascade disposal
 * - LIFO disposal ordering via MemoMap
 *
 * @typeParam TProvides - Union of Port types that this scope can resolve
 * @typeParam TAsyncPorts - Union of Port types with async factories (phantom type)
 * @typeParam TPhase - The initialization phase (phantom type)
 *
 * @internal
 */
class ScopeImpl<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends "uninitialized" | "initialized" = "uninitialized",
> {
  /**
   * Unique identifier for this scope.
   * Generated at construction time using the module-level counter.
   */
  readonly id: string;

  /**
   * Reference to the root container for adapter lookup and singleton resolution.
   */
  private readonly container: ContainerImpl<TProvides, TAsyncPorts>;

  /**
   * MemoMap for caching scoped instances.
   * Forked from container's singleton memo to inherit singletons but not scoped.
   */
  private readonly scopedMemo: MemoMap;

  /**
   * Flag indicating whether this scope has been disposed.
   */
  private disposed: boolean = false;

  /**
   * Set of child scopes created from this scope.
   * Used for cascade disposal - children must be disposed before parent.
   */
  private readonly childScopes: Set<ScopeImpl<TProvides, TAsyncPorts, TPhase>> = new Set();

  /**
   * Reference to parent scope (if this is a nested scope).
   * Used to remove self from parent's childScopes on disposal.
   */
  private readonly parentScope: ScopeImpl<TProvides, TAsyncPorts, TPhase> | null;

  /**
   * Creates a new ScopeImpl instance.
   *
   * @param container - Reference to the root container for resolution logic
   * @param singletonMemo - The container's singleton memo (for forking)
   * @param parentScope - The parent scope (null for scopes created directly from container)
   */
  constructor(
    container: ContainerImpl<TProvides, TAsyncPorts>,
    singletonMemo: MemoMap,
    parentScope: ScopeImpl<TProvides, TAsyncPorts, TPhase> | null = null
  ) {
    this.id = generateScopeId();
    this.container = container;
    // Fork from singleton memo to inherit singletons but have fresh scoped cache
    // Note: Each scope forks from singleton memo, NOT from parent scope's memo
    // This ensures scoped instances are NOT shared between parent and child scopes
    this.scopedMemo = singletonMemo.fork();
    this.parentScope = parentScope;
  }

  /**
   * Resolves a service instance for the given port within this scope.
   *
   * Lifetime handling:
   * - singleton: Delegates to container's singleton memo (shared globally)
   * - scoped: Uses this scope's scopedMemo (unique to this scope)
   * - request: Creates new instance (no caching)
   *
   * @param port - The port to resolve
   * @returns The service instance
   * @throws DisposedScopeError if scope is disposed
   */
  resolve<P extends TProvides>(port: P): InferService<P> {
    const portName = (port as Port<unknown, string>).__portName;

    if (this.disposed) {
      throw new DisposedScopeError(portName);
    }

    return this.container.resolveInternal(port, this.scopedMemo, this.id);
  }

  /**
   * Resolves a service instance for the given port asynchronously within this scope.
   *
   * This method works for any port regardless of whether it has a sync or async factory.
   * For sync adapters, it wraps the sync resolution in a Promise.
   * For async adapters, it uses async resolution with concurrent protection.
   *
   * Lifetime handling:
   * - singleton: Delegates to container's singleton memo (shared globally)
   * - scoped: Uses this scope's scopedMemo (unique to this scope)
   * - request: Creates new instance (no caching)
   *
   * @param port - The port to resolve
   * @returns A promise that resolves to the service instance
   * @throws DisposedScopeError if scope is disposed
   */
  async resolveAsync<P extends TProvides>(port: P): Promise<InferService<P>> {
    const portName = (port as Port<unknown, string>).__portName;

    if (this.disposed) {
      throw new DisposedScopeError(portName);
    }

    return this.container.resolveAsyncInternal(port, this.scopedMemo, this.id);
  }

  /**
   * Creates a child scope from this scope.
   *
   * The child scope:
   * - Shares singletons with container (and all other scopes)
   * - Has its own scoped instance cache (NOT shared with this scope)
   * - Is tracked for cascade disposal
   *
   * @returns A frozen Scope interface wrapping the child ScopeImpl
   */
  createScope(): Scope<TProvides, TAsyncPorts, TPhase> {
    // Child scope forks from container's singleton memo, NOT this scope's scopedMemo
    // This ensures scoped instances are isolated per scope
    const child = new ScopeImpl<TProvides, TAsyncPorts, TPhase>(
      this.container,
      this.container.getSingletonMemo(),
      this
    );
    this.childScopes.add(child);
    return createScopeWrapper(child);
  }

  /**
   * Disposes this scope and all its resources.
   *
   * Disposal order:
   * 1. Mark as disposed (prevents new resolutions)
   * 2. Dispose all child scopes recursively (cascade)
   * 3. Dispose scopedMemo (LIFO finalizer calls)
   * 4. Remove self from parent's childScopes tracking
   *
   * @returns Promise that resolves when disposal is complete
   */
  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.disposed = true;

    // Dispose all child scopes first (cascade disposal)
    for (const child of this.childScopes) {
      await child.dispose();
    }
    this.childScopes.clear();

    // Dispose scoped instances in LIFO order
    await this.scopedMemo.dispose();

    // Remove self from parent's child tracking
    if (this.parentScope !== null) {
      this.parentScope.childScopes.delete(this);
    }
  }

  /**
   * Returns whether this scope has been disposed.
   */
  get isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Returns a frozen snapshot of the scope's internal state.
   *
   * This accessor is keyed by the INTERNAL_ACCESS Symbol and is used by
   * DevTools to inspect scope state without exposing mutable internals.
   *
   * @returns A frozen ScopeInternalState snapshot
   * @throws DisposedScopeError if scope has been disposed
   * @internal
   */
  getInternalState(): ScopeInternalState {
    if (this.disposed) {
      throw new DisposedScopeError(`scope:${this.id}`);
    }

    // Build child scope snapshots recursively
    const childSnapshots: ScopeInternalState[] = [];
    for (const child of this.childScopes) {
      try {
        childSnapshots.push(child.getInternalState());
      } catch {
        // Skip disposed children
      }
    }

    const state: ScopeInternalState = {
      id: this.id,
      disposed: this.disposed,
      scopedMemo: createMemoMapSnapshot(this.scopedMemo),
      childScopes: Object.freeze(childSnapshots),
    };

    return Object.freeze(state);
  }
}

/**
 * Creates a frozen snapshot of a MemoMap for inspection.
 *
 * @param memo - The MemoMap to snapshot
 * @returns A frozen MemoMapSnapshot
 * @internal
 */
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

/**
 * Creates a frozen Scope wrapper object around a ScopeImpl.
 *
 * This pattern separates the mutable internal state from the frozen public API,
 * allowing disposal to modify internal flags while the wrapper remains immutable.
 *
 * @param impl - The ScopeImpl to wrap
 * @returns A frozen Scope interface
 * @internal
 */
function createScopeWrapper<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends "uninitialized" | "initialized" = "uninitialized",
>(
  impl: ScopeImpl<TProvides, TAsyncPorts, TPhase>
): Scope<TProvides, TAsyncPorts, TPhase> {
  const scope: Scope<TProvides, TAsyncPorts, TPhase> = {
    resolve: (<P extends TProvides>(port: P): InferService<P> => impl.resolve(port)) as Scope<TProvides, TAsyncPorts, TPhase>["resolve"],
    resolveAsync: <P extends TProvides>(port: P): Promise<InferService<P>> => impl.resolveAsync(port),
    createScope: (): Scope<TProvides, TAsyncPorts, TPhase> => impl.createScope(),
    dispose: (): Promise<void> => impl.dispose(),
    get isDisposed(): boolean {
      return impl.isDisposed;
    },
    [INTERNAL_ACCESS]: (): ScopeInternalState => impl.getInternalState(),
    get [ScopeBrand](): { provides: TProvides } {
      // Phantom type property for nominal typing - value is never used at runtime.
      // The 'as never' cast is the standard pattern for phantom types.
      return undefined as never;
    },
  };
  return Object.freeze(scope);
}

// =============================================================================
// ContainerImpl Class
// =============================================================================

/**
 * Internal Container implementation class.
 *
 * Manages service resolution, lifetime handling, and circular dependency detection.
 * This class is internal and should not be exported from the package.
 *
 * @typeParam TProvides - Union of Port types that this container can resolve
 * @typeParam TAsyncPorts - Union of Port types with async factories (phantom type)
 *
 * @internal
 */
class ContainerImpl<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
> {
  /**
   * The validated graph containing all adapters.
   */
  private readonly graph: Graph<TProvides, Port<unknown, string>>;

  /**
   * MemoMap for caching singleton instances.
   */
  private readonly singletonMemo: MemoMap;

  /**
   * Flag indicating whether the container has been disposed.
   */
  private disposed: boolean = false;

  /**
   * Whether the container has been disposed.
   *
   * After disposal, resolve() will throw DisposedScopeError.
   * This property can be used to check if the container is still usable.
   */
  get isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Flag indicating whether the container has been initialized.
   * After initialization, all ports (including async) can be resolved synchronously.
   */
  private initialized: boolean = false;

  /**
   * Whether the container has been initialized.
   *
   * After initialization, all ports can be resolved synchronously.
   */
  get isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Resolution context for tracking resolution path and detecting circular dependencies.
   */
  private readonly resolutionContext: ResolutionContext;

  /**
   * Map for O(1) adapter lookup by port reference.
   */
  private readonly adapterMap: Map<Port<unknown, string>, RuntimeAdapter>;

  /**
   * Set of ports that have async factories.
   * Used to check if a port requires async resolution.
   */
  private readonly asyncPorts: Set<Port<unknown, string>> = new Set();

  /**
   * Map of pending async resolutions for concurrent resolution protection.
   * Ensures that concurrent calls to resolveAsync for the same port
   * share the same Promise instead of creating duplicate instances.
   */
  private readonly pendingResolutions: Map<Port<unknown, string>, Promise<unknown>> = new Map();

  /**
   * Set of child scopes for disposal propagation.
   * The phase type parameter is not needed for disposal tracking since dispose()
   * works the same regardless of phase.
   */
  private readonly childScopes: Set<ScopeImpl<TProvides, TAsyncPorts, "uninitialized" | "initialized">> = new Set();

  /**
   * Optional hooks state for resolution instrumentation.
   * Only allocated when hooks are provided (zero overhead otherwise).
   */
  private readonly hooksState: HooksState | undefined;

  constructor(graph: Graph<TProvides, Port<unknown, string>>, options?: ContainerOptions) {
    this.graph = graph;
    this.singletonMemo = new MemoMap();
    this.resolutionContext = new ResolutionContext();

    // Build adapter lookup map for O(1) access and track async ports
    this.adapterMap = new Map();
    for (const adapter of graph.adapters) {
      this.adapterMap.set(adapter.provides, adapter);
      // Track async ports for initialization and sync resolution checks
      if (adapter.factoryKind === "async") {
        this.asyncPorts.add(adapter.provides);
      }
    }

    // Only create hooks state if hooks are provided (zero overhead otherwise)
    if (options?.hooks?.beforeResolve !== undefined || options?.hooks?.afterResolve !== undefined) {
      this.hooksState = {
        hooks: options.hooks,
        parentStack: [],
      };
    }
  }

  /**
   * Resolves a service instance for the given port synchronously.
   *
   * @param port - The port to resolve
   * @returns The service instance
   * @throws DisposedScopeError if container is disposed
   * @throws ScopeRequiredError if resolving scoped port from root container
   * @throws AsyncInitializationRequiredError if resolving async port before initialization
   * @throws CircularDependencyError if circular dependency detected
   * @throws FactoryError if factory throws
   */
  resolve<P extends TProvides>(port: P): InferService<P> {
    const portName = (port as Port<unknown, string>).__portName;

    // Check disposed flag
    if (this.disposed) {
      throw new DisposedScopeError(portName);
    }

    // Lookup adapter
    const adapter = this.adapterMap.get(port as Port<unknown, string>);
    if (adapter === undefined) {
      throw new Error(`No adapter registered for port '${portName}'`);
    }

    // Check for scoped lifetime - cannot resolve from root container
    if (adapter.lifetime === "scoped") {
      throw new ScopeRequiredError(portName);
    }

    // Check for async port before initialization
    if (!this.initialized && this.asyncPorts.has(port as Port<unknown, string>)) {
      throw new AsyncInitializationRequiredError(portName);
    }

    return this.resolveWithAdapter(port, adapter, this.singletonMemo, null);
  }

  /**
   * Internal resolve method that can use a specific MemoMap.
   * Used by ScopeImpl for scoped resolution.
   *
   * @param port - The port to resolve
   * @param scopedMemo - The MemoMap for scoped instances
   * @param scopeId - The scope ID (null for container-level)
   * @internal
   */
  resolveInternal<P extends TProvides>(
    port: P,
    scopedMemo: MemoMap,
    scopeId: string | null = null
  ): InferService<P> {
    const portName = (port as Port<unknown, string>).__portName;

    // Lookup adapter
    const adapter = this.adapterMap.get(port as Port<unknown, string>);
    if (adapter === undefined) {
      throw new Error(`No adapter registered for port '${portName}'`);
    }

    return this.resolveWithAdapter(port, adapter, scopedMemo, scopeId);
  }

  /**
   * Core resolution logic with adapter and memo context.
   * Emits hooks if configured.
   */
  private resolveWithAdapter<P extends TProvides>(
    port: P,
    adapter: RuntimeAdapter,
    scopedMemo: MemoMap,
    scopeId: string | null
  ): InferService<P> {
    // Zero overhead path - no hooks configured
    if (this.hooksState === undefined) {
      return this.resolveWithAdapterCore(port, adapter, scopedMemo, scopeId);
    }

    // With hooks: emit beforeResolve, resolve, emit afterResolve
    const { hooks, parentStack } = this.hooksState;
    const portName = (port as Port<unknown, string>).__portName;

    // Determine parent from stack
    const parentEntry = parentStack.length > 0 ? parentStack[parentStack.length - 1] : null;
    const parentPort = parentEntry?.port ?? null;

    // Check if this resolution will be a cache hit
    const isCacheHit = this.checkCacheHit(port, adapter, scopedMemo);

    // Build hook context
    const context: ResolutionHookContext = {
      port: port as Port<unknown, string>,
      portName,
      lifetime: adapter.lifetime,
      scopeId,
      parentPort,
      isCacheHit,
      depth: parentStack.length,
    };

    // Call beforeResolve hook
    if (hooks.beforeResolve !== undefined) {
      hooks.beforeResolve(context);
    }

    const startTime = Date.now();

    // Push onto parent stack before resolution
    parentStack.push({ port: port as Port<unknown, string>, startTime });

    let error: Error | null = null;
    let result: InferService<P>;

    try {
      result = this.resolveWithAdapterCore(port, adapter, scopedMemo, scopeId);
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
      throw e;
    } finally {
      // Pop from parent stack
      parentStack.pop();

      const duration = Date.now() - startTime;

      // Call afterResolve hook
      if (hooks.afterResolve !== undefined) {
        const resultContext: ResolutionResultContext = {
          ...context,
          duration,
          error,
        };
        hooks.afterResolve(resultContext);
      }
    }

    return result!;
  }

  /**
   * Core resolution logic without hooks overhead.
   * @internal
   */
  private resolveWithAdapterCore<P extends TProvides>(
    port: P,
    adapter: RuntimeAdapter,
    scopedMemo: MemoMap,
    scopeId: string | null
  ): InferService<P> {
    // Handle based on lifetime
    switch (adapter.lifetime) {
      case "singleton":
        return this.singletonMemo.getOrElseMemoize(
          port as Port<unknown, string>,
          () => this.createInstance(port, adapter, scopedMemo, scopeId),
          adapter.finalizer as ((instance: unknown) => void | Promise<void>) | undefined
        ) as InferService<P>;

      case "scoped":
        return scopedMemo.getOrElseMemoize(
          port as Port<unknown, string>,
          () => this.createInstance(port, adapter, scopedMemo, scopeId),
          adapter.finalizer as ((instance: unknown) => void | Promise<void>) | undefined
        ) as InferService<P>;

      case "request":
        // Request lifetime: always create new instance
        return this.createInstance(port, adapter, scopedMemo, scopeId) as InferService<P>;

      default:
        throw new Error(`Unknown lifetime: ${adapter.lifetime}`);
    }
  }

  /**
   * Checks if a resolution would be a cache hit.
   * @internal
   */
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
      case "request":
        return false;
      default:
        return false;
    }
  }

  /**
   * Resolves a service instance for the given port asynchronously.
   *
   * This method works for any port regardless of whether it has a sync or async factory.
   * For sync adapters, it wraps the sync resolution in a Promise.
   * For async adapters, it uses async resolution with concurrent protection.
   *
   * @param port - The port to resolve
   * @returns A promise that resolves to the service instance
   * @throws DisposedScopeError if container is disposed
   * @throws ScopeRequiredError if resolving scoped port from root container
   * @throws CircularDependencyError if circular dependency detected
   * @throws AsyncFactoryError if async factory throws
   */
  async resolveAsync<P extends TProvides>(port: P): Promise<InferService<P>> {
    const portName = (port as Port<unknown, string>).__portName;

    // Check disposed flag
    if (this.disposed) {
      throw new DisposedScopeError(portName);
    }

    // Lookup adapter
    const adapter = this.adapterMap.get(port as Port<unknown, string>);
    if (adapter === undefined) {
      throw new Error(`No adapter registered for port '${portName}'`);
    }

    // Check for scoped lifetime - cannot resolve from root container
    if (adapter.lifetime === "scoped") {
      throw new ScopeRequiredError(portName);
    }

    return this.resolveAsyncWithAdapter(port, adapter, this.singletonMemo, null);
  }

  /**
   * Internal async resolve method that can use a specific MemoMap.
   * Used by ScopeImpl for async scoped resolution.
   *
   * @param port - The port to resolve
   * @param scopedMemo - The MemoMap for scoped instances
   * @param scopeId - The scope ID (null for container-level)
   * @internal
   */
  async resolveAsyncInternal<P extends TProvides>(
    port: P,
    scopedMemo: MemoMap,
    scopeId: string | null = null
  ): Promise<InferService<P>> {
    const portName = (port as Port<unknown, string>).__portName;

    // Lookup adapter
    const adapter = this.adapterMap.get(port as Port<unknown, string>);
    if (adapter === undefined) {
      throw new Error(`No adapter registered for port '${portName}'`);
    }

    return this.resolveAsyncWithAdapter(port, adapter, scopedMemo, scopeId);
  }

  /**
   * Core async resolution logic with adapter and memo context.
   * Handles both sync and async adapters with concurrent resolution protection.
   */
  private async resolveAsyncWithAdapter<P extends TProvides>(
    port: P,
    adapter: RuntimeAdapter,
    scopedMemo: MemoMap,
    scopeId: string | null
  ): Promise<InferService<P>> {
    // If adapter has sync factory, delegate to sync resolution
    if (adapter.factoryKind === "sync") {
      return this.resolveWithAdapter(port, adapter, scopedMemo, scopeId);
    }

    // Handle async adapter resolution
    return this.resolveAsyncAdapter(port, adapter, scopedMemo, scopeId);
  }

  /**
   * Resolves an async adapter with concurrent resolution protection.
   * Ensures that concurrent calls for the same port share the same Promise.
   */
  private async resolveAsyncAdapter<P extends TProvides>(
    port: P,
    adapter: RuntimeAdapter,
    scopedMemo: MemoMap,
    scopeId: string | null
  ): Promise<InferService<P>> {
    // Check cache based on lifetime
    const cacheHit = this.checkAsyncCacheHit(port as Port<unknown, string>, adapter, scopedMemo);
    if (cacheHit !== undefined) {
      // Emit hooks for cache hits
      this.emitHooksForAsyncCacheHit(port, adapter, scopeId);
      return cacheHit as InferService<P>;
    }

    // Check for pending resolution (concurrent protection)
    const pending = this.pendingResolutions.get(port as Port<unknown, string>);
    if (pending !== undefined) {
      return pending as Promise<InferService<P>>;
    }

    // Create new resolution promise
    const promise = this.createAsyncInstance(port, adapter, scopedMemo, scopeId);
    this.pendingResolutions.set(port as Port<unknown, string>, promise);

    try {
      const instance = await promise;
      return instance;
    } finally {
      // Clean up pending resolution
      this.pendingResolutions.delete(port as Port<unknown, string>);
    }
  }

  /**
   * Checks if an async resolution would hit a cached instance.
   * Returns the cached instance if found, undefined otherwise.
   */
  private checkAsyncCacheHit(
    port: Port<unknown, string>,
    adapter: RuntimeAdapter,
    scopedMemo: MemoMap
  ): unknown | undefined {
    switch (adapter.lifetime) {
      case "singleton":
        if (this.singletonMemo.has(port)) {
          return this.singletonMemo.getOrElseMemoize(port, () => {
            throw new Error("unreachable");
          });
        }
        return undefined;
      case "scoped":
        if (scopedMemo.has(port)) {
          return scopedMemo.getOrElseMemoize(port, () => {
            throw new Error("unreachable");
          });
        }
        return undefined;
      case "request":
        // Request lifetime never caches
        return undefined;
      default:
        return undefined;
    }
  }

  /**
   * Emits hooks for an async cache hit.
   * Called when an async adapter's instance is already cached.
   * @internal
   */
  private emitHooksForAsyncCacheHit<P extends TProvides>(
    port: P,
    adapter: RuntimeAdapter,
    scopeId: string | null
  ): void {
    if (this.hooksState === undefined) {
      return;
    }

    const { hooks, parentStack } = this.hooksState;
    const portName = (port as Port<unknown, string>).__portName;

    // Determine parent from stack
    const parentEntry = parentStack.length > 0 ? parentStack[parentStack.length - 1] : null;
    const parentPort = parentEntry?.port ?? null;

    // Build hook context for cache hit
    const context: ResolutionHookContext = {
      port: port as Port<unknown, string>,
      portName,
      lifetime: adapter.lifetime,
      scopeId,
      parentPort,
      isCacheHit: true,
      depth: parentStack.length,
    };

    // Call beforeResolve hook
    if (hooks.beforeResolve !== undefined) {
      hooks.beforeResolve(context);
    }

    // Cache hits have ~0 duration
    const resultContext: ResolutionResultContext = {
      ...context,
      duration: 0,
      error: null,
    };

    // Call afterResolve hook
    if (hooks.afterResolve !== undefined) {
      hooks.afterResolve(resultContext);
    }
  }

  /**
   * Creates a new instance using an async adapter's factory.
   * Handles resolution context entry/exit, async dependency resolution, and hooks.
   */
  private async createAsyncInstance<P extends TProvides>(
    port: P,
    adapter: RuntimeAdapter,
    scopedMemo: MemoMap,
    scopeId: string | null
  ): Promise<InferService<P>> {
    const portName = (port as Port<unknown, string>).__portName;
    const startTime = Date.now();
    let error: Error | null = null;

    // Build hook context if hooks are configured
    let context: ResolutionHookContext | undefined;
    if (this.hooksState !== undefined) {
      const { hooks, parentStack } = this.hooksState;

      // Determine parent from stack
      const parentEntry = parentStack.length > 0 ? parentStack[parentStack.length - 1] : null;
      const parentPort = parentEntry?.port ?? null;

      context = {
        port: port as Port<unknown, string>,
        portName,
        lifetime: adapter.lifetime,
        scopeId,
        parentPort,
        isCacheHit: false,
        depth: parentStack.length,
      };

      // Call beforeResolve hook
      if (hooks.beforeResolve !== undefined) {
        hooks.beforeResolve(context);
      }

      // Push onto parent stack before resolving dependencies
      parentStack.push({ port: port as Port<unknown, string>, startTime });
    }

    // Enter resolution context (circular check)
    this.resolutionContext.enter(portName);

    try {
      // Resolve dependencies (parallel for independent deps)
      const deps = await this.resolveDependenciesAsync(adapter, scopedMemo, scopeId);

      // Call async factory with resolved deps
      try {
        // Cast factory to async function since we know factoryKind is 'async'
        const asyncFactory = adapter.factory as (deps: Record<string, unknown>) => Promise<unknown>;
        const instance = await asyncFactory(deps);

        // Cache based on lifetime
        this.cacheAsyncInstance(port as Port<unknown, string>, instance, adapter, scopedMemo);

        return instance as InferService<P>;
      } catch (err) {
        error = err instanceof Error ? err : new Error(String(err));
        throw new AsyncFactoryError(portName, err);
      }
    } finally {
      // Exit resolution context
      this.resolutionContext.exit(portName);

      // Call afterResolve hook if configured
      if (this.hooksState !== undefined && context !== undefined) {
        const { hooks, parentStack } = this.hooksState;

        // Pop from parent stack
        parentStack.pop();

        const duration = Date.now() - startTime;

        // Call afterResolve hook
        if (hooks.afterResolve !== undefined) {
          const resultContext: ResolutionResultContext = {
            ...context,
            duration,
            error,
          };
          hooks.afterResolve(resultContext);
        }
      }
    }
  }

  /**
   * Resolves all dependencies for an async adapter.
   * Dependencies are resolved in parallel for performance.
   */
  private async resolveDependenciesAsync(
    adapter: RuntimeAdapter,
    scopedMemo: MemoMap,
    scopeId: string | null
  ): Promise<Record<string, unknown>> {
    const deps: Record<string, unknown> = {};

    // Resolve all dependencies in parallel
    const entries = await Promise.all(
      adapter.requires.map(async (requiredPort) => {
        const requiredPortName = (requiredPort as Port<unknown, string>).__portName;
        const requiredAdapter = this.adapterMap.get(requiredPort);

        if (requiredAdapter === undefined) {
          throw new Error(`No adapter registered for dependency port '${requiredPortName}'`);
        }

        const instance = await this.resolveAsyncWithAdapter(
          requiredPort as TProvides,
          requiredAdapter,
          scopedMemo,
          scopeId
        );

        return [requiredPortName, instance] as const;
      })
    );

    for (const [name, instance] of entries) {
      deps[name] = instance;
    }

    return deps;
  }

  /**
   * Caches an async instance based on its lifetime.
   */
  private cacheAsyncInstance(
    port: Port<unknown, string>,
    instance: unknown,
    adapter: RuntimeAdapter,
    scopedMemo: MemoMap
  ): void {
    const finalizer = adapter.finalizer as ((instance: unknown) => void | Promise<void>) | undefined;

    switch (adapter.lifetime) {
      case "singleton":
        this.singletonMemo.getOrElseMemoize(port, () => instance, finalizer);
        break;
      case "scoped":
        scopedMemo.getOrElseMemoize(port, () => instance, finalizer);
        break;
      case "request":
        // Request lifetime doesn't cache
        break;
    }
  }

  /**
   * Initializes all async ports in priority order.
   *
   * After initialization, all ports can be resolved synchronously.
   * Async adapters are initialized in order based on their initPriority
   * (lower values first), respecting dependencies.
   *
   * @returns This container (marked as initialized)
   * @throws DisposedScopeError if container is disposed
   * @throws AsyncFactoryError if any async factory throws
   */
  async initialize(): Promise<ContainerImpl<TProvides>> {
    if (this.disposed) {
      throw new DisposedScopeError("container");
    }

    if (this.initialized) {
      return this;
    }

    // Get singleton async adapters sorted by priority (lower first, default 100)
    // Only singleton adapters can be pre-initialized at the container level.
    // Scoped/request adapters must be initialized within their respective scopes.
    const asyncAdapters: RuntimeAdapter[] = [];
    for (const adapter of this.graph.adapters) {
      if (adapter.factoryKind === "async" && adapter.lifetime === "singleton") {
        asyncAdapters.push(adapter);
      }
    }

    // Sort by initPriority (lower = earlier, default = 100)
    asyncAdapters.sort((a, b) => {
      const priorityA = a.initPriority ?? 100;
      const priorityB = b.initPriority ?? 100;
      return priorityA - priorityB;
    });

    // Initialize each async adapter
    for (const adapter of asyncAdapters) {
      await this.resolveAsync(adapter.provides as TProvides);
    }

    this.initialized = true;
    return this;
  }

  /**
   * Creates a new instance using the adapter's factory.
   * Handles resolution context entry/exit and dependency resolution.
   */
  private createInstance<P extends TProvides>(
    port: P,
    adapter: RuntimeAdapter,
    scopedMemo: MemoMap,
    scopeId: string | null
  ): unknown {
    const portName = (port as Port<unknown, string>).__portName;

    // Enter resolution context (circular check)
    this.resolutionContext.enter(portName);

    try {
      // Resolve dependencies
      const deps = this.resolveDependencies(adapter, scopedMemo, scopeId);

      // Call factory with resolved deps
      try {
        const instance = adapter.factory(deps);
        return instance;
      } catch (error) {
        throw new FactoryError(portName, error);
      }
    } finally {
      // Exit resolution context
      this.resolutionContext.exit(portName);
    }
  }

  /**
   * Resolves all dependencies for an adapter.
   */
  private resolveDependencies(
    adapter: RuntimeAdapter,
    scopedMemo: MemoMap,
    scopeId: string | null
  ): Record<string, unknown> {
    const deps: Record<string, unknown> = {};

    for (const requiredPort of adapter.requires) {
      const requiredPortName = (requiredPort as Port<unknown, string>).__portName;
      const requiredAdapter = this.adapterMap.get(requiredPort);

      if (requiredAdapter === undefined) {
        throw new Error(`No adapter registered for dependency port '${requiredPortName}'`);
      }

      deps[requiredPortName] = this.resolveWithAdapter(
        requiredPort as TProvides,
        requiredAdapter,
        scopedMemo,
        scopeId
      );
    }

    return deps;
  }

  /**
   * Returns the singleton memo for child scopes to fork from.
   * This allows scopes to inherit singleton instances while having
   * their own scoped instance cache.
   *
   * @internal
   */
  getSingletonMemo(): MemoMap {
    return this.singletonMemo;
  }

  /**
   * Creates a child scope for managing scoped service lifetimes.
   *
   * The returned scope:
   * - Inherits singleton instances from this container (shared reference)
   * - Has its own scoped instance cache (not shared with other scopes)
   * - Is tracked for cascade disposal when container is disposed
   *
   * @typeParam TPhase - The initialization phase of the scope (matches container phase)
   * @returns A frozen Scope interface
   */
  createScope<TPhase extends "uninitialized" | "initialized">(): Scope<TProvides, TAsyncPorts, TPhase> {
    const scope = new ScopeImpl<TProvides, TAsyncPorts, TPhase>(this, this.singletonMemo, null);
    this.childScopes.add(scope);
    return createScopeWrapper(scope);
  }

  /**
   * Disposes the container and all singleton instances.
   */
  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.disposed = true;

    // Dispose all child scopes first
    for (const child of this.childScopes) {
      await child.dispose();
    }
    this.childScopes.clear();

    // Dispose singleton instances
    await this.singletonMemo.dispose();
  }

  /**
   * Returns a frozen snapshot of the container's internal state.
   *
   * This accessor is keyed by the INTERNAL_ACCESS Symbol and is used by
   * DevTools to inspect container state without exposing mutable internals.
   *
   * @returns A frozen ContainerInternalState snapshot
   * @throws DisposedScopeError if container has been disposed
   * @internal
   */
  getInternalState(): ContainerInternalState {
    if (this.disposed) {
      throw new DisposedScopeError("container");
    }

    // Build child scope snapshots
    const childSnapshots: ScopeInternalState[] = [];
    for (const child of this.childScopes) {
      try {
        childSnapshots.push(child.getInternalState());
      } catch {
        // Skip disposed children
      }
    }

    // Build adapter info map
    const adapterInfoMap = new Map<Port<unknown, string>, AdapterInfo>();
    for (const [port, adapter] of this.adapterMap) {
      const dependencyNames = adapter.requires.map(
        (p) => (p as Port<unknown, string>).__portName
      );
      adapterInfoMap.set(
        port,
        Object.freeze({
          portName: port.__portName,
          lifetime: adapter.lifetime,
          dependencyCount: adapter.requires.length,
          dependencyNames: Object.freeze(dependencyNames),
        })
      );
    }

    const state: ContainerInternalState = {
      disposed: this.disposed,
      singletonMemo: createMemoMapSnapshot(this.singletonMemo),
      childScopes: Object.freeze(childSnapshots),
      adapterMap: adapterInfoMap,
    };

    return Object.freeze(state);
  }
}

// =============================================================================
// createContainer Function
// =============================================================================

/**
 * Creates an immutable container from a validated graph.
 *
 * The container provides type-safe service resolution with:
 * - Singleton, scoped, and request lifetime management
 * - Circular dependency detection at resolution time
 * - LIFO disposal ordering with finalizer support
 * - Optional resolution hooks for instrumentation
 * - Async factory support with initialization
 *
 * @typeParam TProvides - Union of Port types that the container can resolve
 * @param graph - A validated Graph from @hex-di/graph
 * @param options - Optional configuration including resolution hooks
 * @returns A frozen Container instance
 *
 * @remarks
 * - The container is immutable (frozen) - no dynamic registration after creation
 * - Sync adapters use synchronous resolution
 * - Async adapters require resolveAsync() or initialize() before sync resolve
 * - Scoped ports cannot be resolved from the root container - use createScope()
 * - When hooks are not provided, there is zero overhead
 *
 * @example Basic usage
 * ```typescript
 * const graph = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .provide(DatabaseAdapter)
 *   .build();
 *
 * const container = createContainer(graph);
 *
 * const logger = container.resolve(LoggerPort);
 * logger.log('Hello, world!');
 *
 * // Don't forget to dispose when done
 * await container.dispose();
 * ```
 *
 * @example Using scopes
 * ```typescript
 * const container = createContainer(graph);
 *
 * // Create a scope for request-scoped services
 * const scope = container.createScope();
 *
 * try {
 *   const userContext = scope.resolve(UserContextPort);
 *   // ... handle request
 * } finally {
 *   await scope.dispose();
 * }
 * ```
 *
 * @example With async adapters
 * ```typescript
 * // Async resolution
 * const db = await container.resolveAsync(DatabasePort);
 *
 * // Or initialize all async adapters upfront
 * const initialized = await container.initialize();
 * const db2 = initialized.resolve(DatabasePort);  // Now sync works!
 * ```
 *
 * @example With resolution hooks
 * ```typescript
 * const container = createContainer(graph, {
 *   hooks: {
 *     beforeResolve: (ctx) => console.log(`Resolving ${ctx.portName}`),
 *     afterResolve: (ctx) => console.log(`Resolved in ${ctx.duration}ms`),
 *   },
 * });
 * ```
 */
export function createContainer<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
>(
  graph: Graph<TProvides, TAsyncPorts>,
  options?: ContainerOptions
): Container<TProvides, TAsyncPorts, "uninitialized"> {
  const impl = new ContainerImpl<TProvides, TAsyncPorts>(graph, options);

  // Create the container object with the public API
  const container: Container<TProvides, TAsyncPorts, "uninitialized"> = {
    resolve: (<P extends TProvides>(port: P): InferService<P> => impl.resolve(port)) as Container<TProvides, TAsyncPorts, "uninitialized">["resolve"],
    resolveAsync: <P extends TProvides>(port: P): Promise<InferService<P>> => impl.resolveAsync(port),
    initialize: async (): Promise<Container<TProvides, TAsyncPorts, "initialized">> => {
      await impl.initialize();
      // Return a new frozen object with updated initialization state
      // The impl tracks isInitialized internally, but we return a new wrapper
      // to support the type-state pattern (Container<..., 'initialized'>)
      return createInitializedContainer<TProvides, TAsyncPorts>(impl);
    },
    get isInitialized(): boolean {
      return impl.isInitialized;
    },
    createScope: (): Scope<TProvides, TAsyncPorts, "uninitialized"> => impl.createScope<"uninitialized">(),
    dispose: (): Promise<void> => impl.dispose(),
    get isDisposed(): boolean {
      return impl.isDisposed;
    },
    [INTERNAL_ACCESS]: (): ContainerInternalState => impl.getInternalState(),
    get [ContainerBrand](): { provides: TProvides } {
      // Phantom type property for nominal typing - value is never used at runtime.
      // The 'as never' cast is the standard pattern for phantom types.
      return undefined as never;
    },
  };

  // Freeze and return
  return Object.freeze(container);
}

/**
 * Creates an initialized container wrapper.
 * This is a separate function to support the type-state pattern.
 *
 * @internal
 */
function createInitializedContainer<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
>(
  impl: ContainerImpl<TProvides, TAsyncPorts>
): Container<TProvides, TAsyncPorts, "initialized"> {
  const container: Container<TProvides, TAsyncPorts, "initialized"> = {
    resolve: <P extends TProvides>(port: P): InferService<P> => impl.resolve(port),
    resolveAsync: <P extends TProvides>(port: P): Promise<InferService<P>> => impl.resolveAsync(port),
    // initialize is 'never' on initialized container, but we still provide the method
    // for runtime compatibility. TypeScript will prevent calling it at compile time.
    initialize: undefined as never,
    get isInitialized(): boolean {
      return impl.isInitialized;
    },
    createScope: (): Scope<TProvides, TAsyncPorts, "initialized"> => impl.createScope<"initialized">(),
    dispose: (): Promise<void> => impl.dispose(),
    get isDisposed(): boolean {
      return impl.isDisposed;
    },
    [INTERNAL_ACCESS]: (): ContainerInternalState => impl.getInternalState(),
    get [ContainerBrand](): { provides: TProvides } {
      return undefined as never;
    },
  };

  return Object.freeze(container);
}
