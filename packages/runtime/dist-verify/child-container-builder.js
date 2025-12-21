/**
 * ChildContainerBuilder implementation for @hex-di/runtime.
 *
 * Provides an immutable builder pattern for creating child containers with:
 * - Adapter overrides (replace parent adapters for child scope)
 * - Adapter extensions (add new adapters not in parent)
 * - Inheritance mode configuration (shared, forked, isolated)
 *
 * @packageDocumentation
 */
import { ChildContainerBrand, ScopeBrand } from "./types.js";
import { INTERNAL_ACCESS, ADAPTER_ACCESS } from "./inspector-symbols.js";
import { MemoMap } from "./memo-map.js";
import { ResolutionContext } from "./resolution-context.js";
import { DisposedScopeError, ScopeRequiredError, FactoryError } from "./errors.js";
/**
 * Type guard to check if a value has internal container methods.
 *
 * This guard verifies the presence of internal symbol-accessed methods
 * that are added by createChildContainerWrapper but not exposed in the
 * public ChildContainer type.
 *
 * @internal
 */
function hasInternalMethods(value) {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    // Use 'in' operator for property checks - narrows type without casting
    return (ADAPTER_ACCESS in value &&
        typeof value[ADAPTER_ACCESS] === "function" &&
        "registerChildContainer" in value &&
        typeof value.registerChildContainer === "function" &&
        "unregisterChildContainer" in value &&
        typeof value.unregisterChildContainer === "function");
}
/**
 * Extracts a ParentContainerLike from a ChildContainer wrapper.
 *
 * The ChildContainer wrapper created by createChildContainerWrapper includes
 * all the methods required by ParentContainerLike (resolve, resolveAsync,
 * [ADAPTER_ACCESS], registerChildContainer, unregisterChildContainer).
 *
 * This function uses a type guard to safely access the internal methods,
 * avoiding unsafe casts by performing runtime verification.
 *
 * @internal
 */
function asParentContainerLike(wrapper) {
    // Verify the wrapper has internal methods via type guard
    if (!hasInternalMethods(wrapper)) {
        throw new Error("Invalid ChildContainer wrapper: missing internal methods. " +
            "This indicates a bug in createChildContainerWrapper.");
    }
    // TypeScript now knows wrapper satisfies AdapterAccessor & ChildContainerRegistry
    // thanks to the type guard narrowing
    return {
        resolve: wrapper.resolve,
        resolveAsync: wrapper.resolveAsync,
        [ADAPTER_ACCESS]: wrapper[ADAPTER_ACCESS],
        registerChildContainer: wrapper.registerChildContainer,
        unregisterChildContainer: wrapper.unregisterChildContainer,
        originalParent: wrapper,
    };
}
/**
 * Internal implementation of ChildContainerBuilder.
 *
 * Follows the immutable builder pattern from GraphBuilder:
 * - Private constructor enforcing factory method pattern
 * - Frozen instances for immutability
 * - Each method returns a new builder instance
 *
 * This class provides the runtime implementation for ChildContainerBuilder.
 * The public interface methods have complex generic signatures with conditional
 * return types (OverrideResult, ExtendResult) that TypeScript cannot verify at
 * implementation time. We therefore:
 * 1. Remove the `implements` clause from the class
 * 2. Use simple internal signatures for the methods
 * 3. Cast to the interface type at the factory method return point
 *
 * This is type-safe because the conditional return types are only different
 * at compile-time for error messages - at runtime, all valid calls return builders.
 *
 * @internal
 */
class ChildContainerBuilderImpl {
    /**
     * Private constructor to enforce factory method pattern.
     *
     * @param parentContainer - Reference to the parent container
     * @param overrides - Map of adapter overrides
     * @param extensions - Map of extended adapters
     * @param inheritanceModes - Map of inheritance modes
     */
    constructor(parentContainer, overrides, extensions, inheritanceModes) {
        this.parentContainer = parentContainer;
        this.overrides = overrides;
        this.extensions = extensions;
        this.inheritanceModes = inheritanceModes;
        Object.freeze(this);
    }
    /**
     * Creates a new ChildContainerBuilderImpl from a parent container.
     *
     * @param parentContainer - The parent container
     * @returns A frozen builder instance wrapped as the public interface type
     */
    static create(parentContainer) {
        const impl = new ChildContainerBuilderImpl(parentContainer, new Map(), new Map(), new Map());
        // Wrap the implementation in an interface-typed object.
        // This is necessary because the interface uses conditional return types
        // (OverrideResult, ExtendResult) that TypeScript cannot verify at implementation.
        // The wrapper delegates to impl while providing the interface's type signature.
        return wrapBuilderAsInterface(impl);
    }
    /**
     * Overrides a parent adapter with a new adapter for the child's scope.
     *
     * At runtime, this simply adds the adapter to the overrides map.
     * Type-level validation ensures the port exists in parent via the
     * OverrideResult return type in the interface declaration.
     *
     * The implementation uses RuntimeAdapter which accepts any adapter,
     * while the interface's override signature constrains the adapter
     * type and validates the return type.
     *
     * @param adapter - The adapter that provides a port in the parent
     * @returns A new builder with the override registered
     */
    override(adapter) {
        const newOverrides = new Map(this.overrides);
        newOverrides.set(adapter.provides, adapter);
        // Wrap via centralized wrapper function - see wrapBuilderAsInterface docs for type safety justification
        return wrapBuilderAsInterface(new ChildContainerBuilderImpl(this.parentContainer, newOverrides, this.extensions, this.inheritanceModes));
    }
    /**
     * Extends the child container with a new adapter not in the parent.
     *
     * At runtime, this simply adds the adapter to the extensions map.
     * Type-level validation ensures the port does NOT exist in parent
     * via the ExtendResult return type in the interface declaration.
     *
     * @param adapter - The adapter that provides a port not in parent
     * @returns A new builder with the extension registered
     */
    extend(adapter) {
        const newExtensions = new Map(this.extensions);
        newExtensions.set(adapter.provides, adapter);
        // Wrap via centralized wrapper function - see wrapBuilderAsInterface docs for type safety justification
        return wrapBuilderAsInterface(new ChildContainerBuilderImpl(this.parentContainer, this.overrides, newExtensions, this.inheritanceModes));
    }
    /**
     * Configures per-port singleton inheritance modes.
     *
     * @param config - Object mapping port names to inheritance modes
     * @returns A new builder with the mode configuration applied
     */
    withInheritanceMode(config) {
        const newModes = new Map(this.inheritanceModes);
        for (const [portName, mode] of Object.entries(config)) {
            newModes.set(portName, mode);
        }
        // Wrap via centralized wrapper function - see wrapBuilderAsInterface docs for type safety justification
        return wrapBuilderAsInterface(new ChildContainerBuilderImpl(this.parentContainer, this.overrides, this.extensions, newModes));
    }
    /**
     * Builds the child container with the current configuration.
     *
     * @returns A frozen ChildContainer instance
     */
    build() {
        const impl = new ChildContainerImpl(this.parentContainer, this.overrides, this.extensions, this.inheritanceModes);
        return createChildContainerWrapper(impl);
    }
}
// =============================================================================
// ChildContainerImpl Class
// =============================================================================
/**
 * Internal implementation of ChildContainer.
 *
 * Manages child container resolution with:
 * - Adapter override lookup
 * - Extension lookup
 * - Parent delegation for inherited adapters
 * - Configurable singleton inheritance modes (shared, forked, isolated)
 *
 * @internal
 */
class ChildContainerImpl {
    /**
     * Creates a new ChildContainerImpl.
     *
     * @param parentContainer - Reference to the parent container
     * @param overrides - Map of adapter overrides
     * @param extensions - Map of extended adapters
     * @param inheritanceModes - Map of inheritance modes
     */
    constructor(parentContainer, overrides, extensions, inheritanceModes) {
        /**
         * Reference to this child container's wrapper for proper parent chain.
         * Set via setWrapper() after construction.
         */
        this.wrapper = null;
        /**
         * Flag indicating whether this child container has been disposed.
         */
        this.disposed = false;
        /**
         * Set of child scopes created from this child container.
         */
        this.childScopes = new Set();
        /**
         * Array of grandchild containers for disposal propagation.
         * Using array instead of Set to maintain insertion order for LIFO disposal.
         */
        this.childContainers = [];
        this.parentContainer = parentContainer;
        this.overrides = overrides;
        this.extensions = extensions;
        this.inheritanceModes = inheritanceModes;
        // Child container has its own singleton memo for overridden/extended adapters
        // and for isolated mode instances
        this.singletonMemo = new MemoMap();
        this.resolutionContext = new ResolutionContext();
        // Initialize forked instances map and snapshot parent singletons for forked mode
        this.forkedInstances = new Map();
        this.initializeForkedInstances();
    }
    /**
     * Sets the wrapper reference for this child container.
     * Called by createChildContainerWrapper after construction.
     * Also registers this child container with its parent for cascade disposal.
     *
     * @param wrapper - The frozen wrapper object
     * @internal
     */
    setWrapper(wrapper) {
        this.wrapper = wrapper;
        // Register with parent for cascade disposal
        // ParentContainerLike extends ChildContainerRegistry which provides this method
        this.parentContainer.registerChildContainer(wrapper);
    }
    /**
     * Returns the wrapper reference if set, otherwise throws.
     * @internal
     */
    getWrapper() {
        if (this.wrapper === null) {
            throw new Error("Child container wrapper not initialized");
        }
        return this.wrapper;
    }
    /**
     * Registers a grandchild container for cascade disposal tracking.
     *
     * @param childContainer - The grandchild container to track
     * @internal
     */
    registerChildContainer(childContainer) {
        this.childContainers.push(childContainer);
    }
    /**
     * Unregisters a grandchild container from disposal tracking.
     * Called when a grandchild container is disposed individually.
     *
     * @param childContainer - The grandchild container to unregister
     * @internal
     */
    unregisterChildContainer(childContainer) {
        const index = this.childContainers.indexOf(childContainer);
        if (index !== -1) {
            this.childContainers.splice(index, 1);
        }
    }
    /**
     * Initializes forked instances by creating deep copies of parent singletons
     * for ports configured with 'forked' inheritance mode.
     */
    initializeForkedInstances() {
        for (const [portName, mode] of this.inheritanceModes) {
            if (mode === "forked") {
                // Get the parent instance if it exists
                // We need to resolve from parent to get the instance and create a copy
                // Note: We can't directly access parent's memo, so we resolve and clone
                try {
                    // This triggers parent resolution if not already resolved
                    const parentInstance = this.resolveFromParentForForking(portName);
                    if (parentInstance !== undefined) {
                        // Create a shallow copy of the instance
                        // For objects, we spread to create a new reference
                        // The instance retains the same prototype chain via Object.create
                        const forkedInstance = this.shallowClone(parentInstance);
                        this.forkedInstances.set(portName, forkedInstance);
                    }
                }
                catch {
                    // Parent may not have resolved this yet, which is fine
                    // Forking will happen on first access
                }
            }
        }
    }
    /**
     * Resolves a port from parent specifically for forking purposes.
     * Returns undefined if the parent doesn't have an adapter for this port.
     */
    resolveFromParentForForking(portName) {
        // We need to find the port by name and resolve it from parent
        // This is a bit tricky since we only have the port name, not the port token
        // For now, we'll defer forking to first resolution
        return undefined;
    }
    /**
     * Creates a shallow clone of an object, preserving its prototype.
     *
     * TypeScript cannot narrow generic type parameters through control flow,
     * so casts are required here. The casts are safe because:
     * 1. We verify obj is a non-null object before treating it as Record
     * 2. Object.create preserves the prototype chain
     * 3. Object.keys + property copy handles all enumerable own properties
     */
    shallowClone(obj) {
        if (obj === null || typeof obj !== "object") {
            return obj;
        }
        // Create new object with same prototype
        const clone = Object.create(Object.getPrototypeOf(obj));
        // Copy own enumerable properties
        for (const key of Object.keys(obj)) {
            clone[key] = obj[key];
        }
        return clone;
    }
    // ===========================================================================
    // Port Type Helpers (Consolidated Cast Boundary)
    // ===========================================================================
    /**
     * Extracts port name from a generic port parameter.
     *
     * Since TProvides and TExtends both extend Port<unknown, string>,
     * any P that extends their union is guaranteed to have __portName.
     * TypeScript can verify this without a cast.
     *
     * @internal
     */
    getPortName(port) {
        return port.__portName;
    }
    /**
     * Converts a generic port to the base Port type for internal operations.
     *
     * Required because internal data structures (Maps, etc.) store the
     * erased `Port<unknown, string>` type for runtime flexibility.
     * This uses a type-safe widening since P extends Port<unknown, string>.
     *
     * @internal
     */
    toPortToken(port) {
        // P extends TProvides | TExtends extends Port<unknown, string>
        // This widening is safe: we're going from a more specific to less specific type
        return port;
    }
    /**
     * Resolves a port from the parent container.
     *
     * This helper encapsulates the variance boundary where we need to call
     * parent's resolve with a widened port type. The parent stores resolve
     * as `(port: TProvides) => unknown` but at runtime accepts any port.
     *
     * @internal
     */
    resolveFromParent(port) {
        // ParentContainerLike.resolve is typed as (port: TProvides) => unknown
        // At runtime, it accepts any port that the parent can resolve.
        // This single cast centralizes the variance boundary.
        return this.parentContainer.resolve(port);
    }
    /**
     * Resolves a dependency port (from adapter.requires) through this container.
     *
     * adapter.requires returns Port<unknown, string>[], but resolve() expects
     * TProvides | TExtends. At runtime, all required ports must be resolvable
     * (graph validation ensures this), so this cast is safe.
     *
     * @internal
     */
    resolveDependencyPort(port) {
        // Cast is safe: graph validation ensures all required ports are resolvable
        return this.resolve(port);
    }
    /**
     * Resolves a dependency port through resolveInternal with a scope memo.
     *
     * Similar to resolveDependencyPort but uses the scope-aware resolution path.
     *
     * @internal
     */
    resolveDependencyPortInternal(port, scopedMemo) {
        // Cast is safe: graph validation ensures all required ports are resolvable
        return this.resolveInternal(port, scopedMemo);
    }
    /**
     * Resolves a service instance for the given port.
     *
     * Resolution order:
     * 1. Check child's override map
     * 2. Check child's extension map
     * 3. Apply inheritance mode and delegate to parent container
     *
     * @param port - The port to resolve
     * @returns The service instance
     */
    resolve(port) {
        const portToken = this.toPortToken(port);
        const portName = this.getPortName(port);
        if (this.disposed) {
            throw new DisposedScopeError(portName);
        }
        // Check for override
        const overrideAdapter = this.overrides.get(portToken);
        if (overrideAdapter !== undefined) {
            return this.resolveWithAdapter(port, overrideAdapter);
        }
        // Check for extension
        const extensionAdapter = this.extensions.get(portToken);
        if (extensionAdapter !== undefined) {
            return this.resolveWithAdapter(port, extensionAdapter);
        }
        // Non-overridden port: apply inheritance mode
        return this.resolveWithInheritanceMode(port);
    }
    /**
     * Resolves a port from parent with inheritance mode applied.
     *
     * - shared (default): delegate directly to parent
     * - forked: return a snapshot copy created at child build time
     * - isolated: create a fresh instance in child's own memo
     */
    resolveWithInheritanceMode(port) {
        const portToken = this.toPortToken(port);
        const portName = this.getPortName(port);
        const mode = this.inheritanceModes.get(portName) ?? "shared";
        switch (mode) {
            case "shared": {
                // Default: delegate to parent's singleton
                return this.resolveFromParent(portToken);
            }
            case "forked": {
                // Return forked instance, creating it on first access if needed
                if (this.forkedInstances.has(portName)) {
                    return this.forkedInstances.get(portName);
                }
                // Fork on first access: resolve from parent and clone
                const parentInstance = this.resolveFromParent(portToken);
                const forkedInstance = this.shallowClone(parentInstance);
                this.forkedInstances.set(portName, forkedInstance);
                return forkedInstance;
            }
            case "isolated": {
                // Create fresh instance in child's memo using parent's adapter
                // We need to get the adapter from parent and create a new instance
                return this.singletonMemo.getOrElseMemoize(portToken, () => this.createIsolatedInstance(port), undefined);
            }
            default:
                throw new Error(`Unknown inheritance mode: ${mode}`);
        }
    }
    /**
     * Creates a fresh instance for isolated mode by calling the parent's
     * adapter factory with dependencies resolved through this child container.
     */
    createIsolatedInstance(port) {
        const portToken = this.toPortToken(port);
        const portName = this.getPortName(port);
        // Get the adapter from parent container using the ADAPTER_ACCESS symbol.
        // ParentContainerLike extends AdapterAccessor which provides this method.
        const adapter = this.parentContainer[ADAPTER_ACCESS](portToken);
        if (adapter === undefined) {
            // Fallback: if parent doesn't have the adapter, delegate to parent and clone
            const parentInstance = this.resolveFromParent(portToken);
            return this.shallowClone(parentInstance);
        }
        // Enter resolution context for cycle detection
        this.resolutionContext.enter(portName);
        try {
            // Resolve dependencies through this child container
            const deps = {};
            for (const requiredPort of adapter.requires) {
                const requiredPortName = requiredPort.__portName;
                deps[requiredPortName] = this.resolveDependencyPort(requiredPort);
            }
            // Call the factory to create a fresh instance
            try {
                return adapter.factory(deps);
            }
            catch (error) {
                throw new FactoryError(portName, error);
            }
        }
        finally {
            this.resolutionContext.exit(portName);
        }
    }
    /**
     * Resolves a service instance for the given port asynchronously.
     *
     * @param port - The port to resolve
     * @returns A promise that resolves to the service instance
     */
    async resolveAsync(port) {
        const portToken = this.toPortToken(port);
        const portName = this.getPortName(port);
        if (this.disposed) {
            throw new DisposedScopeError(portName);
        }
        // Check for override
        const overrideAdapter = this.overrides.get(portToken);
        if (overrideAdapter !== undefined) {
            return this.resolveWithAdapter(port, overrideAdapter);
        }
        // Check for extension
        const extensionAdapter = this.extensions.get(portToken);
        if (extensionAdapter !== undefined) {
            return this.resolveWithAdapter(port, extensionAdapter);
        }
        // Non-overridden port: apply inheritance mode
        // We need to resolve from parent, but resolveFromParent returns Promise for async ports
        // This is complex because we need to know if parent resolution is async
        // For now, simpler approach: if it wasn't overridden/extended, delegate to parent's resolveAsync
        // Cast to any to bypass variance check - we know runtime behavior works
        return this.parentContainer.resolveAsync(port);
    }
    /**
     * Checks if this child container (or its parent) provides an adapter for the given port.
     *
     * @param port - The port to check
     * @returns true if the port is resolvable
     */
    has(port) {
        const portToken = this.toPortToken(port);
        const portName = this.getPortName(port);
        // Check overrides
        if (this.overrides.has(portToken)) {
            return true;
        }
        // Check extensions
        if (this.extensions.has(portToken)) {
            return true;
        }
        // Check parent
        // Need to cast to Container/ChildContainer to access has()
        // We know parentContainer has has() method because it's either Container or ChildContainer
        const parent = this.parentContainer;
        // Check inheritance mode
        const mode = this.inheritanceModes.get(portName) ?? "shared";
        if (mode === "isolated") {
            // In isolated mode, we still rely on parent for "has" check of the adapter source,
            // unless we want to strictly say "has" means "resolvable instance".
            // But isolated means we create a NEW instance using PARENT's adapter.
            // So if parent has it, we have it.
            return parent.has(portToken);
        }
        return parent.has(portToken);
    }
    /**
     * Checks if an adapter exists for the given port (ignoring lifetime).
     * @internal
     */
    hasAdapter(port) {
        const portToken = this.toPortToken(port);
        const portName = this.getPortName(port);
        if (this.overrides.has(portToken))
            return true;
        if (this.extensions.has(portToken))
            return true;
        // Check parent
        const parent = this.parentContainer;
        // If parent has "hasAdapter", use it. Otherwise fall back to "has".
        // Parent should be ContainerImpl or ChildContainerImpl, both of which now have hasAdapter.
        if (typeof parent.hasAdapter === 'function') {
            const mode = this.inheritanceModes.get(portName) ?? "shared";
            if (mode === "isolated") {
                return parent.hasAdapter(portToken);
            }
            return parent.hasAdapter(portToken);
        }
        return parent.has(portToken);
    }
    // ===========================================================================
    // Internal Helpers
    // ===========================================================================
    /**
     * Resolves a service using a specific adapter.
     */
    resolveWithAdapter(port, adapter) {
        const portToken = this.toPortToken(port);
        const portName = this.getPortName(port);
        // Check for scoped lifetime - cannot resolve from root child container
        if (adapter.lifetime === "scoped") {
            throw new ScopeRequiredError(portName);
        }
        // Handle based on lifetime
        switch (adapter.lifetime) {
            case "singleton":
                return this.singletonMemo.getOrElseMemoize(portToken, () => this.createInstance(port, adapter), adapter.finalizer);
            case "transient":
                return this.createInstance(port, adapter);
            default:
                throw new Error(`Unknown lifetime: ${adapter.lifetime}`);
        }
    }
    /**
     * Creates a new instance using the adapter's factory.
     */
    createInstance(port, adapter) {
        const portName = this.getPortName(port);
        // Enter resolution context (circular check)
        this.resolutionContext.enter(portName);
        try {
            // Resolve dependencies
            const deps = this.resolveDependencies(adapter);
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
    resolveDependencies(adapter) {
        const deps = {};
        for (const requiredPort of adapter.requires) {
            const requiredPortName = requiredPort.__portName;
            deps[requiredPortName] = this.resolveDependencyPort(requiredPort);
        }
        return deps;
    }
    /**
     * Creates a child scope for managing scoped service lifetimes.
     */
    createScope() {
        // ChildContainerImpl<TProvides, TExtends, TAsyncPorts> satisfies ScopeContainerAccess<TProvides | TExtends>
        // because resolveInternal accepts P extends TProvides | TExtends
        const scope = new ScopeImpl(this, this.singletonMemo, null);
        this.childScopes.add(scope);
        return createScopeWrapper(scope);
    }
    /**
     * Creates a grandchild container builder.
     * The builder uses this child container's wrapper as the parent.
     */
    createChild() {
        // Pass the wrapper (not impl) so grandchild's parent property returns the correct object.
        // The wrapper satisfies ParentContainerLike because createChildContainerWrapper adds
        // all required methods including [ADAPTER_ACCESS], registerChildContainer, and unregisterChildContainer.
        const wrapper = this.getWrapper();
        // asParentContainerLike now accepts the full ChildContainer type and returns
        // ParentContainerLike<TProvides | TExtends, TAsyncPorts>
        return ChildContainerBuilderImpl.create(asParentContainerLike(wrapper));
    }
    /**
     * Disposes this child container and all its resources.
     *
     * Disposal order:
     * 1. Mark as disposed (prevents new resolutions)
     * 2. Dispose all grandchild containers in LIFO order (last created first)
     * 3. Dispose all child scopes
     * 4. Dispose child's own singletons
     * 5. Unregister from parent's tracking
     */
    async dispose() {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        // Dispose all grandchild containers first in LIFO order (last created first)
        for (let i = this.childContainers.length - 1; i >= 0; i--) {
            const child = this.childContainers[i];
            if (!child.isDisposed) {
                await child.dispose();
            }
        }
        this.childContainers.length = 0;
        // Dispose all child scopes
        for (const scope of this.childScopes) {
            await scope.dispose();
        }
        this.childScopes.clear();
        // Dispose child's own singletons
        await this.singletonMemo.dispose();
        // Unregister from parent's tracking
        // ParentContainerLike extends ChildContainerRegistry which provides unregisterChildContainer
        if (this.wrapper !== null) {
            this.parentContainer.unregisterChildContainer(this.wrapper);
        }
    }
    /**
     * Returns whether this child container has been disposed.
     */
    get isDisposed() {
        return this.disposed;
    }
    /**
     * Returns a reference to the original parent container/wrapper.
     * This is the object users see when accessing child.parent.
     *
     * Returns `unknown` because the actual type depends on runtime context
     * (could be Container or ChildContainer). The caller knows the context.
     */
    getParent() {
        return this.parentContainer.originalParent;
    }
    /**
     * Returns the singleton memo for scopes to use.
     */
    getSingletonMemo() {
        return this.singletonMemo;
    }
    /**
     * Returns the adapter for a given port.
     *
     * First checks child's overrides and extensions, then delegates to parent.
     * Used internally by grandchild containers for isolated inheritance mode.
     *
     * @param port - The port to get the adapter for
     * @returns The adapter, or undefined if not found
     * @internal
     */
    getAdapter(port) {
        // Check child's overrides first
        const override = this.overrides.get(port);
        if (override !== undefined) {
            return override;
        }
        // Check child's extensions
        const extension = this.extensions.get(port);
        if (extension !== undefined) {
            return extension;
        }
        // Delegate to parent using ADAPTER_ACCESS from ParentContainerLike
        return this.parentContainer[ADAPTER_ACCESS](port);
    }
    /**
     * Returns a frozen snapshot of the internal state for inspection.
     */
    getInternalState() {
        if (this.disposed) {
            throw new DisposedScopeError("child-container");
        }
        // Build child scope snapshots
        const childSnapshots = [];
        for (const scope of this.childScopes) {
            try {
                childSnapshots.push(scope.getInternalState());
            }
            catch {
                // Skip disposed scopes
            }
        }
        // Build adapter info map (from overrides and extensions)
        const adapterMap = new Map();
        for (const [port, adapter] of this.overrides) {
            const dependencyNames = adapter.requires.map((p) => p.__portName);
            adapterMap.set(port, Object.freeze({
                portName: port.__portName,
                lifetime: adapter.lifetime,
                dependencyCount: adapter.requires.length,
                dependencyNames: Object.freeze(dependencyNames),
            }));
        }
        for (const [port, adapter] of this.extensions) {
            const dependencyNames = adapter.requires.map((p) => p.__portName);
            adapterMap.set(port, Object.freeze({
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
            adapterMap,
        };
        return Object.freeze(state);
    }
    /**
     * Internal resolve method for scopes.
     * Handles resolution with proper scope memo for scoped lifetime ports.
     */
    resolveInternal(port, scopedMemo) {
        const portToken = this.toPortToken(port);
        // Check for override
        const overrideAdapter = this.overrides.get(portToken);
        if (overrideAdapter !== undefined) {
            return this.resolveWithAdapterForScope(port, overrideAdapter, scopedMemo);
        }
        // Check for extension
        const extensionAdapter = this.extensions.get(portToken);
        if (extensionAdapter !== undefined) {
            return this.resolveWithAdapterForScope(port, extensionAdapter, scopedMemo);
        }
        // For non-overridden ports, we need to get the adapter from parent
        // and handle scoped ports properly (resolving with our scope's memo)
        const adapter = this.getAdapter(portToken);
        if (adapter !== undefined) {
            // Use our scope's memo for scoped ports
            return this.resolveWithAdapterForScope(port, adapter, scopedMemo);
        }
        // Fallback: delegate to parent (for singleton/transient only)
        // This should not be reached for properly configured containers
        return this.resolveFromParent(portToken);
    }
    /**
     * Resolves using a specific adapter with a scope's memo.
     */
    resolveWithAdapterForScope(port, adapter, scopedMemo) {
        const portToken = this.toPortToken(port);
        switch (adapter.lifetime) {
            case "singleton":
                return this.singletonMemo.getOrElseMemoize(portToken, () => this.createInstanceForScope(port, adapter, scopedMemo), adapter.finalizer);
            case "scoped":
                return scopedMemo.getOrElseMemoize(portToken, () => this.createInstanceForScope(port, adapter, scopedMemo), adapter.finalizer);
            case "transient":
                return this.createInstanceForScope(port, adapter, scopedMemo);
            default:
                throw new Error(`Unknown lifetime: ${adapter.lifetime}`);
        }
    }
    /**
     * Creates instance for scope resolution.
     */
    createInstanceForScope(port, adapter, scopedMemo) {
        const portName = this.getPortName(port);
        this.resolutionContext.enter(portName);
        try {
            const deps = {};
            for (const requiredPort of adapter.requires) {
                const requiredPortName = requiredPort.__portName;
                deps[requiredPortName] = this.resolveDependencyPortInternal(requiredPort, scopedMemo);
            }
            try {
                return adapter.factory(deps);
            }
            catch (error) {
                throw new FactoryError(portName, error);
            }
        }
        finally {
            this.resolutionContext.exit(portName);
        }
    }
}
// =============================================================================
// ScopeImpl Class (for child container scopes)
// =============================================================================
/**
 * Internal scope implementation for child containers.
 * @internal
 */
class ScopeImpl {
    constructor(childContainer, singletonMemo, parentScope) {
        this.childScopes = new Set();
        this.disposed = false;
        this.id = `child-scope-${scopeIdCounter++}`;
        this.childContainer = childContainer;
        this.scopedMemo = singletonMemo.fork();
        this.parentScope = parentScope;
    }
    /**
     * Extracts port name from a generic port parameter.
     * Since TProvides extends Port<unknown, string>, __portName is accessible.
     * @internal
     */
    getPortName(port) {
        return port.__portName;
    }
    resolve(port) {
        const portName = this.getPortName(port);
        if (this.disposed) {
            throw new DisposedScopeError(portName);
        }
        return this.childContainer.resolveInternal(port, this.scopedMemo);
    }
    async resolveAsync(port) {
        const portName = this.getPortName(port);
        if (this.disposed) {
            throw new DisposedScopeError(portName);
        }
        return this.childContainer.resolveInternal(port, this.scopedMemo);
    }
    has(port) {
        // A scope can resolve anything the container has an adapter for,
        // including scoped services which the root container's has() returns false for.
        return this.childContainer.hasAdapter(port);
    }
    createScope() {
        const child = new ScopeImpl(this.childContainer, this.childContainer.getSingletonMemo(), this);
        this.childScopes.add(child);
        return createScopeWrapper(child);
    }
    async dispose() {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        for (const child of this.childScopes) {
            await child.dispose();
        }
        this.childScopes.clear();
        await this.scopedMemo.dispose();
        if (this.parentScope !== null) {
            this.parentScope.childScopes.delete(this);
        }
    }
    get isDisposed() {
        return this.disposed;
    }
    getInternalState() {
        if (this.disposed) {
            throw new DisposedScopeError(`scope:${this.id}`);
        }
        const childSnapshots = [];
        for (const child of this.childScopes) {
            try {
                childSnapshots.push(child.getInternalState());
            }
            catch {
                // Skip disposed children
            }
        }
        return Object.freeze({
            id: this.id,
            disposed: this.disposed,
            scopedMemo: createMemoMapSnapshot(this.scopedMemo),
            childScopes: Object.freeze(childSnapshots),
        });
    }
}
// =============================================================================
// Helper Functions
// =============================================================================
let scopeIdCounter = 0;
/**
 * Creates a frozen snapshot of a MemoMap for inspection.
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
 * Creates a frozen ChildContainer wrapper.
 * Also registers the wrapper with the impl for proper parent chain and disposal tracking.
 */
function createChildContainerWrapper(impl) {
    // Note: ADAPTER_ACCESS is an internal symbol not in the public type
    // Also registerChildContainer is internal for disposal tracking
    const childContainerBase = {
        resolve: ((port) => impl.resolve(port)),
        resolveAsync: (port) => impl.resolveAsync(port),
        has: (port) => impl.has(port),
        createScope: () => impl.createScope(),
        createChild: () => impl.createChild(),
        dispose: () => impl.dispose(),
        get isDisposed() {
            return impl.isDisposed;
        },
        get parent() {
            // getParent() returns unknown because originalParent stores a type-erased reference.
            // The cast is safe: we know it's either a Container or ChildContainer from runtime.
            // This is an intentional trust boundary for variance compatibility.
            return impl.getParent();
        },
        [INTERNAL_ACCESS]: () => impl.getInternalState(),
        [ADAPTER_ACCESS]: (port) => impl.getAdapter(port),
        // Internal method for grandchild container registration
        registerChildContainer: (child) => impl.registerChildContainer(child),
        unregisterChildContainer: (child) => impl.unregisterChildContainer(child),
        get [ChildContainerBrand]() {
            return undefined;
        },
    };
    const childContainer = childContainerBase;
    // Set wrapper reference on impl and register with parent for disposal tracking
    impl.setWrapper(childContainer);
    return Object.freeze(childContainer);
}
/**
 * Creates a frozen Scope wrapper for child container scopes.
 */
function createScopeWrapper(impl) {
    const scope = {
        resolve: ((port) => impl.resolve(port)),
        resolveAsync: (port) => impl.resolveAsync(port),
        has: (port) => impl.has(port),
        createScope: () => impl.createScope(),
        dispose: () => impl.dispose(),
        get isDisposed() {
            return impl.isDisposed;
        },
        [INTERNAL_ACCESS]: () => impl.getInternalState(),
        get [ScopeBrand]() {
            return undefined;
        },
    };
    return Object.freeze(scope);
}
// =============================================================================
// Builder Interface Wrapper
// =============================================================================
/**
 * Type guard that verifies an object has the structure of ChildContainerBuilder.
 *
 * This guard performs runtime validation that the implementation has all required
 * methods with the correct shapes. After this guard succeeds, TypeScript treats
 * the value as ChildContainerBuilder, which has conditional return types on
 * its methods (OverrideResult, ExtendResult).
 *
 * **Type Safety Justification:**
 *
 * The type guard pattern is safe for bridging impl -> interface because:
 *
 * 1. **Runtime correctness**: The guard verifies all methods exist and are functions.
 *    At runtime, calling these methods always returns a builder instance.
 *
 * 2. **Compile-time safety**: After narrowing, TypeScript sees the interface's
 *    conditional return types (OverrideResult, ExtendResult). These conditionals
 *    are evaluated at each CALL SITE based on the adapter being passed:
 *    - Valid adapters: resolves to ChildContainerBuilder (matches runtime)
 *    - Invalid adapters: resolves to error type (compile-time error)
 *
 * 3. **No runtime assertions needed**: The conditional types are purely compile-time
 *    constructs. Invalid usage produces compile errors, not runtime exceptions.
 *
 * @internal
 */
function isChildContainerBuilder(value) {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    // Use 'in' operator for property checks - narrows type without casting
    return ("override" in value &&
        typeof value.override === "function" &&
        "extend" in value &&
        typeof value.extend === "function" &&
        "withInheritanceMode" in value &&
        typeof value.withInheritanceMode === "function" &&
        "build" in value &&
        typeof value.build === "function");
}
/**
 * Wraps a ChildContainerBuilderImpl as the ChildContainerBuilder interface.
 *
 * This function uses a type guard to bridge the internal implementation to the
 * public interface without type casts - purely through structural validation.
 *
 * The interface uses conditional return types (OverrideResult, ExtendResult)
 * that TypeScript cannot verify structurally at implementation time. The type
 * guard pattern safely narrows the implementation to the interface type after
 * performing runtime validation.
 *
 * @throws {Error} If the implementation does not satisfy the interface structure
 *   (indicates a bug in the implementation, never thrown in correct code)
 *
 * @internal
 */
function wrapBuilderAsInterface(impl) {
    // Use type guard to narrow impl to the interface type.
    // The guard verifies runtime structure; TypeScript then accepts the interface type.
    if (!isChildContainerBuilder(impl)) {
        throw new Error("ChildContainerBuilderImpl does not satisfy ChildContainerBuilder interface. " +
            "This indicates a bug in the implementation.");
    }
    // After the guard, TypeScript knows impl is ChildContainerBuilder<...>
    return impl;
}
// =============================================================================
// Factory Function Export
// =============================================================================
/**
 * Creates a ChildContainerBuilder from a parent container.
 *
 * This is the internal factory used by ContainerImpl.createChild().
 *
 * @param parentContainer - The parent container
 * @returns A frozen ChildContainerBuilder instance
 *
 * @internal
 */
export function createChildContainerBuilder(parentContainer) {
    // Container includes [ADAPTER_ACCESS] and register/unregister methods internally.
    // Use type guard to verify presence and narrow the type safely.
    if (!hasInternalMethods(parentContainer)) {
        throw new Error("Invalid Container: missing internal methods. " +
            "This indicates a bug in createContainer or container implementation.");
    }
    // TypeScript now knows parentContainer satisfies AdapterAccessor & ChildContainerRegistry
    const parentLike = {
        resolve: parentContainer.resolve,
        resolveAsync: parentContainer.resolveAsync,
        [ADAPTER_ACCESS]: parentContainer[ADAPTER_ACCESS],
        registerChildContainer: parentContainer.registerChildContainer,
        unregisterChildContainer: parentContainer.unregisterChildContainer,
        originalParent: parentContainer,
    };
    return ChildContainerBuilderImpl.create(parentLike);
}
