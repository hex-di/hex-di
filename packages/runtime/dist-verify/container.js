/**
 * Container implementation for @hex-di/runtime.
 *
 * Provides the createContainer factory function that creates immutable
 * containers from validated graphs. Containers provide type-safe service
 * resolution with lifetime management and circular dependency detection.
 *
 * @packageDocumentation
 */
import { ContainerBrand, ScopeBrand } from "./types.js";
import { createChildContainerBuilder } from "./child-container-builder.js";
import { MemoMap } from "./memo-map.js";
import { ResolutionContext } from "./resolution-context.js";
import { INTERNAL_ACCESS, ADAPTER_ACCESS } from "./inspector-symbols.js";
import { DisposedScopeError, ScopeRequiredError, FactoryError, AsyncFactoryError, AsyncInitializationRequiredError, } from "./errors.js";
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
function generateScopeId() {
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
class ScopeImpl {
    /**
     * Creates a new ScopeImpl instance.
     *
     * @param container - Reference to the root container for resolution logic
     * @param singletonMemo - The container's singleton memo (for forking)
     * @param parentScope - The parent scope (null for scopes created directly from container)
     */
    constructor(container, singletonMemo, parentScope = null) {
        /**
         * Flag indicating whether this scope has been disposed.
         */
        this.disposed = false;
        /**
         * Set of child scopes created from this scope.
         * Used for cascade disposal - children must be disposed before parent.
         */
        this.childScopes = new Set();
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
     * - transient: Creates new instance (no caching)
     *
     * @param port - The port to resolve
     * @returns The service instance
     * @throws DisposedScopeError if scope is disposed
     */
    resolve(port) {
        const portName = port.__portName;
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
     * - transient: Creates new instance (no caching)
     *
     * @param port - The port to resolve
     * @returns A promise that resolves to the service instance
     * @throws DisposedScopeError if scope is disposed
     */
    async resolveAsync(port) {
        const portName = port.__portName;
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
    createScope() {
        // Child scope forks from container's singleton memo, NOT this scope's scopedMemo
        // This ensures scoped instances are isolated per scope
        const child = new ScopeImpl(this.container, this.container.getSingletonMemo(), this);
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
    async dispose() {
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
    get isDisposed() {
        return this.disposed;
    }
    /**
     * Checks if this scope or its container provides an adapter for the given port.
     *
     * @param port - The port to check
     * @returns true if the port is resolvable
     */
    has(port) {
        // Check if container has it (using hasAdapter to include scoped services)
        // Scope can resolve anything the container has an adapter for
        return this.container.hasAdapter(port);
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
    getInternalState() {
        if (this.disposed) {
            throw new DisposedScopeError(`scope:${this.id}`);
        }
        // Build child scope snapshots recursively
        const childSnapshots = [];
        for (const child of this.childScopes) {
            try {
                childSnapshots.push(child.getInternalState());
            }
            catch {
                // Skip disposed children
            }
        }
        const state = {
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
function createMemoMapSnapshot(memo) {
    const entries = [];
    for (const [port, metadata] of memo.entries()) {
        entries.push(Object.freeze({
            port,
            portName: port.__portName,
            resolvedAt: metadata.resolvedAt,
            resolutionOrder: metadata.resolutionOrder,
        }));
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
function createScopeWrapper(impl) {
    const scope = {
        resolve: ((port) => impl.resolve(port)),
        resolveAsync: (port) => impl.resolveAsync(port),
        createScope: () => impl.createScope(),
        dispose: () => impl.dispose(),
        get isDisposed() {
            return impl.isDisposed;
        },
        has: (port) => impl.has(port),
        [INTERNAL_ACCESS]: () => impl.getInternalState(),
        get [ScopeBrand]() {
            // Phantom type property for nominal typing - value is never used at runtime.
            // The 'as never' cast is the standard pattern for phantom types.
            return undefined;
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
class ContainerImpl {
    /**
     * Whether the container has been disposed.
     *
     * After disposal, resolve() will throw DisposedScopeError.
     * This property can be used to check if the container is still usable.
     */
    get isDisposed() {
        return this.disposed;
    }
    /**
     * Internal check for adapter existence (ignoring lifetime restrictions).
     * Used by ScopeImpl to determine if it can resolve a service.
     * @internal
     */
    hasAdapter(port) {
        const portToken = this.graph !== undefined ? port : port; // Simplify: just cast
        // Use adapterMap directly
        return this.adapterMap.has(port);
    }
    /**
     * Checks if this container provides an adapter for the given port.
     *
     * @param port - The port to check
     * @returns true if the port is resolvable from this container
     */
    has(port) {
        const adapter = this.adapterMap.get(port);
        if (adapter === undefined) {
            return false;
        }
        // Root container cannot resolve scoped services
        if (adapter.lifetime === "scoped") {
            return false;
        }
        return true;
    }
    /**
     * Whether the container has been initialized.
     *
     * After initialization, all ports can be resolved synchronously.
     */
    get isInitialized() {
        return this.initialized;
    }
    constructor(graph, options) {
        /**
         * Flag indicating whether the container has been disposed.
         */
        this.disposed = false;
        /**
         * Flag indicating whether the container has been initialized.
         * After initialization, all ports (including async) can be resolved synchronously.
         */
        this.initialized = false;
        /**
         * Set of ports that have async factories.
         * Used to check if a port requires async resolution.
         */
        this.asyncPorts = new Set();
        /**
         * Map of pending async resolutions for concurrent resolution protection.
         * Ensures that concurrent calls to resolveAsync for the same port
         * share the same Promise instead of creating duplicate instances.
         */
        this.pendingResolutions = new Map();
        /**
         * Set of child scopes for disposal propagation.
         * The phase type parameter is not needed for disposal tracking since dispose()
         * works the same regardless of phase.
         */
        this.childScopes = new Set();
        /**
         * Array of child containers for disposal propagation.
         * Using array instead of Set to maintain insertion order for LIFO disposal.
         */
        this.childContainers = [];
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
    resolve(port) {
        const portName = port.__portName;
        // Check disposed flag
        if (this.disposed) {
            throw new DisposedScopeError(portName);
        }
        // Lookup adapter
        const adapter = this.adapterMap.get(port);
        if (adapter === undefined) {
            throw new Error(`No adapter registered for port '${portName}'`);
        }
        // Check for scoped lifetime - cannot resolve from root container
        if (adapter.lifetime === "scoped") {
            throw new ScopeRequiredError(portName);
        }
        // Check for async port before initialization
        if (!this.initialized && this.asyncPorts.has(port)) {
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
    resolveInternal(port, scopedMemo, scopeId = null) {
        const portName = port.__portName;
        // Lookup adapter
        const adapter = this.adapterMap.get(port);
        if (adapter === undefined) {
            throw new Error(`No adapter registered for port '${portName}'`);
        }
        return this.resolveWithAdapter(port, adapter, scopedMemo, scopeId);
    }
    /**
     * Core resolution logic with adapter and memo context.
     * Emits hooks if configured.
     */
    resolveWithAdapter(port, adapter, scopedMemo, scopeId) {
        // Zero overhead path - no hooks configured
        if (this.hooksState === undefined) {
            return this.resolveWithAdapterCore(port, adapter, scopedMemo, scopeId);
        }
        // With hooks: emit beforeResolve, resolve, emit afterResolve
        const { hooks, parentStack } = this.hooksState;
        const portName = port.__portName;
        // Determine parent from stack
        const parentEntry = parentStack.length > 0 ? parentStack[parentStack.length - 1] : null;
        const parentPort = parentEntry?.port ?? null;
        // Check if this resolution will be a cache hit
        const isCacheHit = this.checkCacheHit(port, adapter, scopedMemo);
        // Build hook context
        const context = {
            port: port,
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
        parentStack.push({ port: port, startTime });
        let error = null;
        let result;
        try {
            result = this.resolveWithAdapterCore(port, adapter, scopedMemo, scopeId);
        }
        catch (e) {
            error = e instanceof Error ? e : new Error(String(e));
            throw e;
        }
        finally {
            // Pop from parent stack
            parentStack.pop();
            const duration = Date.now() - startTime;
            // Call afterResolve hook
            if (hooks.afterResolve !== undefined) {
                const resultContext = {
                    ...context,
                    duration,
                    error,
                };
                hooks.afterResolve(resultContext);
            }
        }
        return result;
    }
    /**
     * Core resolution logic without hooks overhead.
     * @internal
     */
    resolveWithAdapterCore(port, adapter, scopedMemo, scopeId) {
        // Handle based on lifetime
        switch (adapter.lifetime) {
            case "singleton":
                return this.singletonMemo.getOrElseMemoize(port, () => this.createInstance(port, adapter, scopedMemo, scopeId), adapter.finalizer);
            case "scoped":
                return scopedMemo.getOrElseMemoize(port, () => this.createInstance(port, adapter, scopedMemo, scopeId), adapter.finalizer);
            case "transient":
                // Transient lifetime: always create new instance
                return this.createInstance(port, adapter, scopedMemo, scopeId);
            default:
                throw new Error(`Unknown lifetime: ${adapter.lifetime}`);
        }
    }
    /**
     * Checks if a resolution would be a cache hit.
     * @internal
     */
    checkCacheHit(port, adapter, scopedMemo) {
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
    async resolveAsync(port) {
        const portName = port.__portName;
        // Check disposed flag
        if (this.disposed) {
            throw new DisposedScopeError(portName);
        }
        // Lookup adapter
        const adapter = this.adapterMap.get(port);
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
    async resolveAsyncInternal(port, scopedMemo, scopeId = null) {
        const portName = port.__portName;
        // Lookup adapter
        const adapter = this.adapterMap.get(port);
        if (adapter === undefined) {
            throw new Error(`No adapter registered for port '${portName}'`);
        }
        return this.resolveAsyncWithAdapter(port, adapter, scopedMemo, scopeId);
    }
    /**
     * Core async resolution logic with adapter and memo context.
     * Handles both sync and async adapters with concurrent resolution protection.
     */
    async resolveAsyncWithAdapter(port, adapter, scopedMemo, scopeId) {
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
    async resolveAsyncAdapter(port, adapter, scopedMemo, scopeId) {
        // Check cache based on lifetime
        const cacheHit = this.checkAsyncCacheHit(port, adapter, scopedMemo);
        if (cacheHit !== undefined) {
            // Emit hooks for cache hits
            this.emitHooksForAsyncCacheHit(port, adapter, scopeId);
            return cacheHit;
        }
        // Check for pending resolution (concurrent protection)
        const pending = this.pendingResolutions.get(port);
        if (pending !== undefined) {
            return pending;
        }
        // Create new resolution promise
        const promise = this.createAsyncInstance(port, adapter, scopedMemo, scopeId);
        this.pendingResolutions.set(port, promise);
        try {
            const instance = await promise;
            return instance;
        }
        finally {
            // Clean up pending resolution
            this.pendingResolutions.delete(port);
        }
    }
    /**
     * Checks if an async resolution would hit a cached instance.
     * Returns the cached instance if found, undefined otherwise.
     */
    checkAsyncCacheHit(port, adapter, scopedMemo) {
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
            case "transient":
                // Transient lifetime never caches
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
    emitHooksForAsyncCacheHit(port, adapter, scopeId) {
        if (this.hooksState === undefined) {
            return;
        }
        const { hooks, parentStack } = this.hooksState;
        const portName = port.__portName;
        // Determine parent from stack
        const parentEntry = parentStack.length > 0 ? parentStack[parentStack.length - 1] : null;
        const parentPort = parentEntry?.port ?? null;
        // Build hook context for cache hit
        const context = {
            port: port,
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
        const resultContext = {
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
    async createAsyncInstance(port, adapter, scopedMemo, scopeId) {
        const portName = port.__portName;
        const startTime = Date.now();
        let error = null;
        // Build hook context if hooks are configured
        let context;
        if (this.hooksState !== undefined) {
            const { hooks, parentStack } = this.hooksState;
            // Determine parent from stack
            const parentEntry = parentStack.length > 0 ? parentStack[parentStack.length - 1] : null;
            const parentPort = parentEntry?.port ?? null;
            context = {
                port: port,
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
            parentStack.push({ port: port, startTime });
        }
        // Enter resolution context (circular check)
        this.resolutionContext.enter(portName);
        try {
            // Resolve dependencies (parallel for independent deps)
            const deps = await this.resolveDependenciesAsync(adapter, scopedMemo, scopeId);
            // Call async factory with resolved deps
            try {
                // Cast factory to async function since we know factoryKind is 'async'
                const asyncFactory = adapter.factory;
                const instance = await asyncFactory(deps);
                // Cache based on lifetime
                this.cacheAsyncInstance(port, instance, adapter, scopedMemo);
                return instance;
            }
            catch (err) {
                error = err instanceof Error ? err : new Error(String(err));
                throw new AsyncFactoryError(portName, err);
            }
        }
        finally {
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
                    const resultContext = {
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
    async resolveDependenciesAsync(adapter, scopedMemo, scopeId) {
        const deps = {};
        // Resolve all dependencies in parallel
        const entries = await Promise.all(adapter.requires.map(async (requiredPort) => {
            const requiredPortName = requiredPort.__portName;
            const requiredAdapter = this.adapterMap.get(requiredPort);
            if (requiredAdapter === undefined) {
                throw new Error(`No adapter registered for dependency port '${requiredPortName}'`);
            }
            const instance = await this.resolveAsyncWithAdapter(requiredPort, requiredAdapter, scopedMemo, scopeId);
            return [requiredPortName, instance];
        }));
        for (const [name, instance] of entries) {
            deps[name] = instance;
        }
        return deps;
    }
    /**
     * Caches an async instance based on its lifetime.
     */
    cacheAsyncInstance(port, instance, adapter, scopedMemo) {
        const finalizer = adapter.finalizer;
        switch (adapter.lifetime) {
            case "singleton":
                this.singletonMemo.getOrElseMemoize(port, () => instance, finalizer);
                break;
            case "scoped":
                scopedMemo.getOrElseMemoize(port, () => instance, finalizer);
                break;
            case "transient":
                // Transient lifetime doesn't cache
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
    async initialize() {
        if (this.disposed) {
            throw new DisposedScopeError("container");
        }
        if (this.initialized) {
            return this;
        }
        // Get singleton async adapters sorted by priority (lower first, default 100)
        // Only singleton adapters can be pre-initialized at the container level.
        // Scoped/transient adapters must be initialized within their respective scopes.
        const asyncAdapters = [];
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
            await this.resolveAsync(adapter.provides);
        }
        this.initialized = true;
        return this;
    }
    /**
     * Creates a new instance using the adapter's factory.
     * Handles resolution context entry/exit and dependency resolution.
     */
    createInstance(port, adapter, scopedMemo, scopeId) {
        const portName = port.__portName;
        // Enter resolution context (circular check)
        this.resolutionContext.enter(portName);
        try {
            // Resolve dependencies
            const deps = this.resolveDependencies(adapter, scopedMemo, scopeId);
            // Call factory with resolved deps
            try {
                const instance = adapter.factory(deps);
                return instance;
            }
            catch (error) {
                throw new FactoryError(portName, error);
            }
        }
        finally {
            // Exit resolution context
            this.resolutionContext.exit(portName);
        }
    }
    /**
     * Resolves all dependencies for an adapter.
     */
    resolveDependencies(adapter, scopedMemo, scopeId) {
        const deps = {};
        for (const requiredPort of adapter.requires) {
            const requiredPortName = requiredPort.__portName;
            const requiredAdapter = this.adapterMap.get(requiredPort);
            if (requiredAdapter === undefined) {
                throw new Error(`No adapter registered for dependency port '${requiredPortName}'`);
            }
            deps[requiredPortName] = this.resolveWithAdapter(requiredPort, requiredAdapter, scopedMemo, scopeId);
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
    getSingletonMemo() {
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
    createScope() {
        const scope = new ScopeImpl(this, this.singletonMemo, null);
        this.childScopes.add(scope);
        return createScopeWrapper(scope);
    }
    /**
     * Disposes the container and all singleton instances.
     *
     * Disposal order:
     * 1. Mark as disposed (prevents new resolutions)
     * 2. Dispose all child containers in LIFO order (last created first)
     * 3. Dispose all child scopes
     * 4. Dispose singleton instances
     */
    async dispose() {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        // Dispose all child containers first in LIFO order (last created first)
        // Iterate in reverse order
        for (let i = this.childContainers.length - 1; i >= 0; i--) {
            const child = this.childContainers[i];
            if (!child.isDisposed) {
                await child.dispose();
            }
        }
        this.childContainers.length = 0;
        // Dispose all child scopes
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
    getInternalState() {
        if (this.disposed) {
            throw new DisposedScopeError("container");
        }
        // Build child scope snapshots
        const childSnapshots = [];
        for (const child of this.childScopes) {
            try {
                childSnapshots.push(child.getInternalState());
            }
            catch {
                // Skip disposed children
            }
        }
        // Build adapter info map
        const adapterInfoMap = new Map();
        for (const [port, adapter] of this.adapterMap) {
            const dependencyNames = adapter.requires.map((p) => p.__portName);
            adapterInfoMap.set(port, Object.freeze({
                portName: port.__portName,
                lifetime: adapter.lifetime,
                dependencyCount: adapter.requires.length,
                dependencyNames: Object.freeze(dependencyNames),
            }));
        }
        const state = {
            disposed: this.disposed,
            singletonMemo: createMemoMapSnapshot(this.singletonMemo),
            childScopes: Object.freeze(childSnapshots),
            adapterMap: adapterInfoMap,
        };
        return Object.freeze(state);
    }
    /**
     * Returns the adapter for a given port.
     *
     * This method is used internally by child containers to support
     * isolated inheritance mode, where the child needs to call the
     * parent's adapter factory to create a fresh instance.
     *
     * @param port - The port to get the adapter for
     * @returns The adapter, or undefined if not found
     * @internal
     */
    getAdapter(port) {
        return this.adapterMap.get(port);
    }
    /**
     * Registers a child container for cascade disposal tracking.
     *
     * @param childContainer - The child container to track
     * @internal
     */
    registerChildContainer(childContainer) {
        this.childContainers.push(childContainer);
    }
    /**
     * Unregisters a child container from disposal tracking.
     * Called when a child container is disposed individually.
     *
     * @param childContainer - The child container to unregister
     * @internal
     */
    unregisterChildContainer(childContainer) {
        const index = this.childContainers.indexOf(childContainer);
        if (index !== -1) {
            this.childContainers.splice(index, 1);
        }
    }
}
// =============================================================================
// createContainer Function
// =============================================================================
/**
 * Creates an immutable container from a validated graph.
 *
 * The container provides type-safe service resolution with:
 * - Singleton, scoped, and transient lifetime management
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
export function createContainer(graph, options) {
    const impl = new ContainerImpl(graph, options);
    // Create the container object with the public API
    // Note: ADAPTER_ACCESS is an internal symbol not in the public type,
    // so we use a type assertion after creating the base object
    const containerBase = {
        resolve: ((port) => impl.resolve(port)),
        resolveAsync: (port) => impl.resolveAsync(port),
        initialize: async () => {
            await impl.initialize();
            // Return a new frozen object with updated initialization state
            // The impl tracks isInitialized internally, but we return a new wrapper
            // to support the type-state pattern (Container<..., 'initialized'>)
            return createInitializedContainer(impl);
        },
        get isInitialized() {
            return impl.isInitialized;
        },
        createScope: () => impl.createScope(),
        createChild: () => createChildContainerBuilder(container),
        dispose: () => impl.dispose(),
        get isDisposed() {
            return impl.isDisposed;
        },
        has: (port) => impl.has(port),
        [INTERNAL_ACCESS]: () => impl.getInternalState(),
        [ADAPTER_ACCESS]: (port) => impl.getAdapter(port),
        // Internal methods for child container disposal tracking
        registerChildContainer: (child) => impl.registerChildContainer(child),
        unregisterChildContainer: (child) => impl.unregisterChildContainer(child),
        get [ContainerBrand]() {
            // Phantom type property for nominal typing - value is never used at runtime.
            // The 'as never' cast is the standard pattern for phantom types.
            return undefined;
        },
    };
    // Cast to public type (ADAPTER_ACCESS is internal, not part of public API)
    const container = containerBase;
    // Freeze and return
    return Object.freeze(container);
}
/**
 * Creates an initialized container wrapper.
 * This is a separate function to support the type-state pattern.
 *
 * @internal
 */
function createInitializedContainer(impl) {
    // Note: ADAPTER_ACCESS is an internal symbol not in the public type
    const containerBase = {
        resolve: (port) => impl.resolve(port),
        resolveAsync: (port) => impl.resolveAsync(port),
        // initialize is 'never' on initialized container, but we still provide the method
        // for runtime compatibility. TypeScript will prevent calling it at compile time.
        initialize: undefined,
        get isInitialized() {
            return impl.isInitialized;
        },
        createScope: () => impl.createScope(),
        createChild: () => createChildContainerBuilder(container),
        dispose: () => impl.dispose(),
        get isDisposed() {
            return impl.isDisposed;
        },
        has: (port) => impl.has(port),
        [INTERNAL_ACCESS]: () => impl.getInternalState(),
        [ADAPTER_ACCESS]: (port) => impl.getAdapter(port),
        // Internal methods for child container disposal tracking
        registerChildContainer: (child) => impl.registerChildContainer(child),
        unregisterChildContainer: (child) => impl.unregisterChildContainer(child),
        get [ContainerBrand]() {
            return undefined;
        },
    };
    const container = containerBase;
    return Object.freeze(container);
}
