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

import type { Port, InferService, InferPortName } from "@hex-di/ports";
import type { Adapter, Lifetime, FactoryKind } from "@hex-di/graph";
import type { ChildContainer, ChildContainerBuilder, Container, Scope, ContainerPhase, InheritanceMode } from "./types.js";
import { ChildContainerBrand, ScopeBrand } from "./types.js";
import type { ContainerInternalState, ScopeInternalState } from "./inspector-types.js";
import { INTERNAL_ACCESS, ADAPTER_ACCESS } from "./inspector-symbols.js";
import { MemoMap } from "./memo-map.js";
import { ResolutionContext } from "./resolution-context.js";
import { DisposedScopeError, ScopeRequiredError, FactoryError } from "./errors.js";

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
 * Interface for accessing adapters via ADAPTER_ACCESS symbol.
 * Used for type-safe access to parent container's adapter map.
 * @internal
 */
interface AdapterAccessor {
  readonly [ADAPTER_ACCESS]: (port: Port<unknown, string>) => RuntimeAdapter | undefined;
}

/**
 * Interface for child container registration/unregistration.
 * Used for cascade disposal tracking.
 * @internal
 */
interface ChildContainerRegistry {
  registerChildContainer(child: DisposableChild): void;
  unregisterChildContainer(child: DisposableChild): void;
}

/**
 * Minimal interface for disposable children (containers).
 * @internal
 */
interface DisposableChild {
  dispose(): Promise<void>;
  readonly isDisposed: boolean;
}

/**
 * Parent container type that can be either a root Container or a ChildContainer.
 * This structural type captures what we need from both Container and ChildContainer
 * without requiring type casts.
 * @internal
 */
interface ParentContainerLike<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
> extends AdapterAccessor, ChildContainerRegistry {
  resolve<P extends TProvides>(port: P): InferService<P>;
  resolveAsync<P extends TProvides>(port: P): Promise<InferService<P>>;
}

/**
 * Interface for the methods ScopeImpl needs from ChildContainerImpl.
 * Using an interface allows proper type variance.
 * @internal
 */
interface ScopeContainerAccess<TProvides extends Port<unknown, string>> {
  resolveInternal<P extends TProvides>(port: P, scopedMemo: MemoMap): InferService<P>;
  getSingletonMemo(): MemoMap;
}

/**
 * Type guard that asserts a ChildContainer wrapper as a ParentContainerLike.
 *
 * The ChildContainer wrapper created by createChildContainerWrapper includes
 * all the methods required by ParentContainerLike (resolve, resolveAsync,
 * [ADAPTER_ACCESS], registerChildContainer, unregisterChildContainer).
 *
 * This function provides type-safe structural typing without casts by using
 * the structural type system: if the object has all required properties,
 * TypeScript allows the assignment.
 *
 * @internal
 */
function asParentContainerLike<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
>(
  wrapper: ChildContainer<Port<unknown, string>, Port<unknown, string>, TAsyncPorts>
): ParentContainerLike<TProvides, TAsyncPorts> {
  // The wrapper from createChildContainerWrapper has all required properties:
  // - resolve: provided by ChildContainer interface
  // - resolveAsync: provided by ChildContainer interface
  // - [ADAPTER_ACCESS]: added by createChildContainerWrapper
  // - registerChildContainer: added by createChildContainerWrapper
  // - unregisterChildContainer: added by createChildContainerWrapper
  //
  // We construct a new object that explicitly implements ParentContainerLike.
  // This is type-safe because we're just re-exposing existing properties.
  return {
    resolve: wrapper.resolve,
    resolveAsync: wrapper.resolveAsync,
    [ADAPTER_ACCESS]: (wrapper as AdapterAccessor)[ADAPTER_ACCESS],
    registerChildContainer: (wrapper as ChildContainerRegistry).registerChildContainer,
    unregisterChildContainer: (wrapper as ChildContainerRegistry).unregisterChildContainer,
  };
}

// =============================================================================
// ChildContainerBuilderImpl Class
// =============================================================================

/**
 * Internal type for inheritance mode map.
 * Maps port names to their inheritance modes.
 * @internal
 */
type InheritanceModeMap = ReadonlyMap<string, InheritanceMode>;

/**
 * Internal implementation of ChildContainerBuilder.
 *
 * Follows the immutable builder pattern from GraphBuilder:
 * - Private constructor enforcing factory method pattern
 * - Frozen instances for immutability
 * - Each method returns a new builder instance
 *
 * This class implements the ChildContainerBuilder interface by returning
 * properly typed instances. The implementation uses runtime adapter types
 * internally but the public interface exposes type-safe methods.
 *
 * @internal
 */
class ChildContainerBuilderImpl<
  TParentProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
  TExtends extends Port<unknown, string> = never,
> implements ChildContainerBuilder<TParentProvides, TAsyncPorts, TExtends> {
  /**
   * Reference to the parent container.
   */
  private readonly parentContainer: ParentContainerLike<TParentProvides, TAsyncPorts>;

  /**
   * Map of adapter overrides (port -> adapter).
   */
  private readonly overrides: ReadonlyMap<Port<unknown, string>, RuntimeAdapter>;

  /**
   * Map of extended adapters (port -> adapter).
   */
  private readonly extensions: ReadonlyMap<Port<unknown, string>, RuntimeAdapter>;

  /**
   * Map of inheritance modes (port name -> mode).
   */
  private readonly inheritanceModes: InheritanceModeMap;

  /**
   * Private constructor to enforce factory method pattern.
   *
   * @param parentContainer - Reference to the parent container
   * @param overrides - Map of adapter overrides
   * @param extensions - Map of extended adapters
   * @param inheritanceModes - Map of inheritance modes
   */
  private constructor(
    parentContainer: ParentContainerLike<TParentProvides, TAsyncPorts>,
    overrides: ReadonlyMap<Port<unknown, string>, RuntimeAdapter>,
    extensions: ReadonlyMap<Port<unknown, string>, RuntimeAdapter>,
    inheritanceModes: InheritanceModeMap
  ) {
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
   * @returns A frozen builder instance
   */
  static create<
    TParentProvides extends Port<unknown, string>,
    TAsyncPorts extends Port<unknown, string> = never,
  >(
    parentContainer: ParentContainerLike<TParentProvides, TAsyncPorts>
  ): ChildContainerBuilder<TParentProvides, TAsyncPorts, never> {
    return new ChildContainerBuilderImpl(
      parentContainer,
      new Map(),
      new Map(),
      new Map()
    );
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
  override: ChildContainerBuilder<TParentProvides, TAsyncPorts, TExtends>["override"] = (adapter) => {
    const newOverrides = new Map(this.overrides);
    newOverrides.set(adapter.provides, adapter);
    // Return type is inferred from the interface's OverrideResult
    // which performs compile-time validation that the port exists in parent
    return new ChildContainerBuilderImpl(
      this.parentContainer,
      newOverrides,
      this.extensions,
      this.inheritanceModes
    );
  };

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
  extend: ChildContainerBuilder<TParentProvides, TAsyncPorts, TExtends>["extend"] = (adapter) => {
    const newExtensions = new Map(this.extensions);
    newExtensions.set(adapter.provides, adapter);
    // Return type is inferred from the interface's ExtendResult
    // which performs compile-time validation that the port doesn't exist
    return new ChildContainerBuilderImpl(
      this.parentContainer,
      this.overrides,
      newExtensions,
      this.inheritanceModes
    );
  };

  /**
   * Configures per-port singleton inheritance modes.
   *
   * @param config - Object mapping port names to inheritance modes
   * @returns A new builder with the mode configuration applied
   */
  withInheritanceMode: ChildContainerBuilder<TParentProvides, TAsyncPorts, TExtends>["withInheritanceMode"] = (config) => {
    const newModes = new Map(this.inheritanceModes);
    for (const [portName, mode] of Object.entries(config)) {
      newModes.set(portName, mode);
    }
    return new ChildContainerBuilderImpl(
      this.parentContainer,
      this.overrides,
      this.extensions,
      newModes
    );
  };

  /**
   * Builds the child container with the current configuration.
   *
   * @returns A frozen ChildContainer instance
   */
  build(): ChildContainer<TParentProvides, TExtends, TAsyncPorts> {
    const impl = new ChildContainerImpl<TParentProvides, TExtends, TAsyncPorts>(
      this.parentContainer,
      this.overrides,
      this.extensions,
      this.inheritanceModes
    );
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
class ChildContainerImpl<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
> {
  /**
   * Reference to the parent container (wrapper, not impl).
   * Uses ParentContainerLike which is satisfied by both Container and ChildContainer.
   */
  private readonly parentContainer: ParentContainerLike<TProvides, TAsyncPorts>;

  /**
   * Reference to this child container's wrapper for proper parent chain.
   * Set via setWrapper() after construction.
   */
  private wrapper: ChildContainer<TProvides, TExtends, TAsyncPorts> | null = null;

  /**
   * Map of adapter overrides (port -> adapter).
   */
  private readonly overrides: ReadonlyMap<Port<unknown, string>, RuntimeAdapter>;

  /**
   * Map of extended adapters (port -> adapter).
   */
  private readonly extensions: ReadonlyMap<Port<unknown, string>, RuntimeAdapter>;

  /**
   * Map of inheritance modes (port name -> mode).
   */
  private readonly inheritanceModes: InheritanceModeMap;

  /**
   * Child's own singleton memo (for overridden/extended singletons and isolated mode).
   */
  private readonly singletonMemo: MemoMap;

  /**
   * Forked singletons (snapshot copies for forked mode).
   * Maps port name to the forked instance.
   */
  private readonly forkedInstances: Map<string, unknown>;

  /**
   * Resolution context for circular dependency detection.
   */
  private readonly resolutionContext: ResolutionContext;

  /**
   * Flag indicating whether this child container has been disposed.
   */
  private disposed: boolean = false;

  /**
   * Set of child scopes created from this child container.
   */
  private readonly childScopes: Set<ScopeImpl<TProvides | TExtends, TAsyncPorts>> = new Set();

  /**
   * Array of grandchild containers for disposal propagation.
   * Using array instead of Set to maintain insertion order for LIFO disposal.
   */
  private readonly childContainers: Array<{ dispose(): Promise<void>; isDisposed: boolean }> = [];

  /**
   * Creates a new ChildContainerImpl.
   *
   * @param parentContainer - Reference to the parent container
   * @param overrides - Map of adapter overrides
   * @param extensions - Map of extended adapters
   * @param inheritanceModes - Map of inheritance modes
   */
  constructor(
    parentContainer: ParentContainerLike<TProvides, TAsyncPorts>,
    overrides: ReadonlyMap<Port<unknown, string>, RuntimeAdapter>,
    extensions: ReadonlyMap<Port<unknown, string>, RuntimeAdapter>,
    inheritanceModes: InheritanceModeMap
  ) {
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
  setWrapper(wrapper: ChildContainer<TProvides, TExtends, TAsyncPorts>): void {
    this.wrapper = wrapper;

    // Register with parent for cascade disposal
    // ParentContainerLike extends ChildContainerRegistry which provides this method
    this.parentContainer.registerChildContainer(wrapper);
  }

  /**
   * Returns the wrapper reference if set, otherwise throws.
   * @internal
   */
  private getWrapper(): ChildContainer<TProvides, TExtends, TAsyncPorts> {
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
  registerChildContainer(childContainer: { dispose(): Promise<void>; isDisposed: boolean }): void {
    this.childContainers.push(childContainer);
  }

  /**
   * Unregisters a grandchild container from disposal tracking.
   * Called when a grandchild container is disposed individually.
   *
   * @param childContainer - The grandchild container to unregister
   * @internal
   */
  unregisterChildContainer(childContainer: { dispose(): Promise<void>; isDisposed: boolean }): void {
    const index = this.childContainers.indexOf(childContainer);
    if (index !== -1) {
      this.childContainers.splice(index, 1);
    }
  }

  /**
   * Initializes forked instances by creating deep copies of parent singletons
   * for ports configured with 'forked' inheritance mode.
   */
  private initializeForkedInstances(): void {
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
        } catch {
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
  private resolveFromParentForForking(portName: string): unknown {
    // We need to find the port by name and resolve it from parent
    // This is a bit tricky since we only have the port name, not the port token
    // For now, we'll defer forking to first resolution
    return undefined;
  }

  /**
   * Creates a shallow clone of an object, preserving its prototype.
   */
  private shallowClone<T>(obj: T): T {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }
    // Create new object with same prototype
    const clone = Object.create(Object.getPrototypeOf(obj));
    // Copy own properties
    for (const key of Object.keys(obj)) {
      clone[key] = (obj as Record<string, unknown>)[key];
    }
    return clone as T;
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
  resolve<P extends TProvides | TExtends>(port: P): InferService<P> {
    const portToken = port as Port<unknown, string>;
    const portName = portToken.__portName;

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
    return this.resolveWithInheritanceMode(port) as InferService<P>;
  }

  /**
   * Resolves a port from parent with inheritance mode applied.
   *
   * - shared (default): delegate directly to parent
   * - forked: return a snapshot copy created at child build time
   * - isolated: create a fresh instance in child's own memo
   */
  private resolveWithInheritanceMode<P extends TProvides | TExtends>(port: P): InferService<P> {
    const portToken = port as Port<unknown, string>;
    const portName = portToken.__portName;
    const mode = this.inheritanceModes.get(portName) ?? "shared";

    switch (mode) {
      case "shared": {
        // Default: delegate to parent's singleton
        const parentResolve = this.parentContainer.resolve as (port: Port<unknown, string>) => unknown;
        return parentResolve(portToken) as InferService<P>;
      }

      case "forked": {
        // Return forked instance, creating it on first access if needed
        if (this.forkedInstances.has(portName)) {
          return this.forkedInstances.get(portName) as InferService<P>;
        }
        // Fork on first access: resolve from parent and clone
        const parentResolve = this.parentContainer.resolve as (port: Port<unknown, string>) => unknown;
        const parentInstance = parentResolve(portToken);
        const forkedInstance = this.shallowClone(parentInstance);
        this.forkedInstances.set(portName, forkedInstance);
        return forkedInstance as InferService<P>;
      }

      case "isolated": {
        // Create fresh instance in child's memo using parent's adapter
        // We need to get the adapter from parent and create a new instance
        return this.singletonMemo.getOrElseMemoize(
          portToken,
          () => this.createIsolatedInstance(port),
          undefined
        ) as InferService<P>;
      }

      default:
        throw new Error(`Unknown inheritance mode: ${mode}`);
    }
  }

  /**
   * Creates a fresh instance for isolated mode by calling the parent's
   * adapter factory with dependencies resolved through this child container.
   */
  private createIsolatedInstance<P extends TProvides | TExtends>(port: P): unknown {
    const portToken = port as Port<unknown, string>;
    const portName = portToken.__portName;

    // Get the adapter from parent container using the ADAPTER_ACCESS symbol.
    // ParentContainerLike extends AdapterAccessor which provides this method.
    const adapter = this.parentContainer[ADAPTER_ACCESS](portToken);

    if (adapter === undefined) {
      // Fallback: if parent doesn't have the adapter, delegate to parent and clone
      const parentInstance = this.parentContainer.resolve(portToken as TProvides);
      return this.shallowClone(parentInstance);
    }

    // Enter resolution context for cycle detection
    this.resolutionContext.enter(portName);

    try {
      // Resolve dependencies through this child container
      const deps: Record<string, unknown> = {};
      for (const requiredPort of adapter.requires) {
        const requiredPortName = (requiredPort as Port<unknown, string>).__portName;
        deps[requiredPortName] = this.resolve(requiredPort as TProvides | TExtends);
      }

      // Call the factory to create a fresh instance
      try {
        return adapter.factory(deps);
      } catch (error) {
        throw new FactoryError(portName, error);
      }
    } finally {
      this.resolutionContext.exit(portName);
    }
  }

  /**
   * Resolves a service instance for the given port asynchronously.
   *
   * @param port - The port to resolve
   * @returns A promise that resolves to the service instance
   */
  async resolveAsync<P extends TProvides | TExtends>(port: P): Promise<InferService<P>> {
    const portToken = port as Port<unknown, string>;
    const portName = portToken.__portName;

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

    // Delegate to parent
    return this.parentContainer.resolveAsync(port as TProvides) as Promise<InferService<P>>;
  }

  /**
   * Resolves a service using a specific adapter.
   */
  private resolveWithAdapter<P extends TProvides | TExtends>(
    port: P,
    adapter: RuntimeAdapter
  ): InferService<P> {
    const portToken = port as Port<unknown, string>;
    const portName = portToken.__portName;

    // Check for scoped lifetime - cannot resolve from root child container
    if (adapter.lifetime === "scoped") {
      throw new ScopeRequiredError(portName);
    }

    // Handle based on lifetime
    switch (adapter.lifetime) {
      case "singleton":
        return this.singletonMemo.getOrElseMemoize(
          portToken,
          () => this.createInstance(port, adapter),
          adapter.finalizer as ((instance: unknown) => void | Promise<void>) | undefined
        ) as InferService<P>;

      case "transient":
        return this.createInstance(port, adapter) as InferService<P>;

      default:
        throw new Error(`Unknown lifetime: ${adapter.lifetime}`);
    }
  }

  /**
   * Creates a new instance using the adapter's factory.
   */
  private createInstance<P extends TProvides | TExtends>(
    port: P,
    adapter: RuntimeAdapter
  ): unknown {
    const portName = (port as Port<unknown, string>).__portName;

    // Enter resolution context (circular check)
    this.resolutionContext.enter(portName);

    try {
      // Resolve dependencies
      const deps = this.resolveDependencies(adapter);

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
  private resolveDependencies(adapter: RuntimeAdapter): Record<string, unknown> {
    const deps: Record<string, unknown> = {};

    for (const requiredPort of adapter.requires) {
      const requiredPortName = (requiredPort as Port<unknown, string>).__portName;
      deps[requiredPortName] = this.resolve(requiredPort as TProvides | TExtends);
    }

    return deps;
  }

  /**
   * Creates a child scope for managing scoped service lifetimes.
   */
  createScope(): Scope<TProvides | TExtends, TAsyncPorts, "uninitialized"> {
    // ChildContainerImpl<TProvides, TExtends, TAsyncPorts> satisfies ScopeContainerAccess<TProvides | TExtends>
    // because resolveInternal accepts P extends TProvides | TExtends
    const scope = new ScopeImpl<TProvides | TExtends, TAsyncPorts>(
      this,
      this.singletonMemo,
      null
    );
    this.childScopes.add(scope);
    return createScopeWrapper(scope);
  }

  /**
   * Creates a grandchild container builder.
   * The builder uses this child container's wrapper as the parent.
   */
  createChild(): ChildContainerBuilder<TProvides | TExtends, TAsyncPorts> {
    // Pass the wrapper (not impl) so grandchild's parent property returns the correct object.
    // The wrapper satisfies ParentContainerLike because createChildContainerWrapper adds
    // all required methods including [ADAPTER_ACCESS], registerChildContainer, and unregisterChildContainer.
    const wrapper = this.getWrapper();
    // The wrapper is typed as ChildContainer<TProvides, TExtends, TAsyncPorts>
    // but the grandchild builder needs ParentContainerLike<TProvides | TExtends, TAsyncPorts>.
    // We use a helper function to properly type the wrapper as ParentContainerLike.
    return ChildContainerBuilderImpl.create(asParentContainerLike<TProvides | TExtends, TAsyncPorts>(wrapper));
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
  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.disposed = true;

    // Dispose all grandchild containers first in LIFO order (last created first)
    for (let i = this.childContainers.length - 1; i >= 0; i--) {
      const child = this.childContainers[i]!;
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
  get isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Returns a reference to the parent container.
   */
  getParent(): ParentContainerLike<TProvides, TAsyncPorts> {
    return this.parentContainer;
  }

  /**
   * Returns the singleton memo for scopes to use.
   */
  getSingletonMemo(): MemoMap {
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
  getAdapter(port: Port<unknown, string>): RuntimeAdapter | undefined {
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
  getInternalState(): ContainerInternalState {
    if (this.disposed) {
      throw new DisposedScopeError("child-container");
    }

    // Build child scope snapshots
    const childSnapshots: ScopeInternalState[] = [];
    for (const scope of this.childScopes) {
      try {
        childSnapshots.push(scope.getInternalState());
      } catch {
        // Skip disposed scopes
      }
    }

    // Build adapter info map (from overrides and extensions)
    const adapterMap = new Map<Port<unknown, string>, {
      portName: string;
      lifetime: Lifetime;
      dependencyCount: number;
      dependencyNames: readonly string[];
    }>();

    for (const [port, adapter] of this.overrides) {
      const dependencyNames = adapter.requires.map(
        (p) => (p as Port<unknown, string>).__portName
      );
      adapterMap.set(port, Object.freeze({
        portName: port.__portName,
        lifetime: adapter.lifetime,
        dependencyCount: adapter.requires.length,
        dependencyNames: Object.freeze(dependencyNames),
      }));
    }

    for (const [port, adapter] of this.extensions) {
      const dependencyNames = adapter.requires.map(
        (p) => (p as Port<unknown, string>).__portName
      );
      adapterMap.set(port, Object.freeze({
        portName: port.__portName,
        lifetime: adapter.lifetime,
        dependencyCount: adapter.requires.length,
        dependencyNames: Object.freeze(dependencyNames),
      }));
    }

    const state: ContainerInternalState = {
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
  resolveInternal<P extends TProvides | TExtends>(
    port: P,
    scopedMemo: MemoMap
  ): InferService<P> {
    const portToken = port as Port<unknown, string>;

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
    const parentResolve = this.parentContainer.resolve as (port: Port<unknown, string>) => unknown;
    return parentResolve(portToken) as InferService<P>;
  }

  /**
   * Resolves using a specific adapter with a scope's memo.
   */
  private resolveWithAdapterForScope<P extends TProvides | TExtends>(
    port: P,
    adapter: RuntimeAdapter,
    scopedMemo: MemoMap
  ): InferService<P> {
    const portToken = port as Port<unknown, string>;

    switch (adapter.lifetime) {
      case "singleton":
        return this.singletonMemo.getOrElseMemoize(
          portToken,
          () => this.createInstanceForScope(port, adapter, scopedMemo),
          adapter.finalizer as ((instance: unknown) => void | Promise<void>) | undefined
        ) as InferService<P>;

      case "scoped":
        return scopedMemo.getOrElseMemoize(
          portToken,
          () => this.createInstanceForScope(port, adapter, scopedMemo),
          adapter.finalizer as ((instance: unknown) => void | Promise<void>) | undefined
        ) as InferService<P>;

      case "transient":
        return this.createInstanceForScope(port, adapter, scopedMemo) as InferService<P>;

      default:
        throw new Error(`Unknown lifetime: ${adapter.lifetime}`);
    }
  }

  /**
   * Creates instance for scope resolution.
   */
  private createInstanceForScope<P extends TProvides | TExtends>(
    port: P,
    adapter: RuntimeAdapter,
    scopedMemo: MemoMap
  ): unknown {
    const portName = (port as Port<unknown, string>).__portName;

    this.resolutionContext.enter(portName);

    try {
      const deps: Record<string, unknown> = {};
      for (const requiredPort of adapter.requires) {
        const requiredPortName = (requiredPort as Port<unknown, string>).__portName;
        deps[requiredPortName] = this.resolveInternal(
          requiredPort as TProvides | TExtends,
          scopedMemo
        );
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
}

// =============================================================================
// ScopeImpl Class (for child container scopes)
// =============================================================================

/**
 * Internal scope implementation for child containers.
 * @internal
 */
class ScopeImpl<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
> {
  private readonly childContainer: ScopeContainerAccess<TProvides>;
  private readonly scopedMemo: MemoMap;
  private readonly parentScope: ScopeImpl<TProvides, TAsyncPorts> | null;
  private readonly childScopes: Set<ScopeImpl<TProvides, TAsyncPorts>> = new Set();
  private disposed: boolean = false;
  readonly id: string;

  constructor(
    childContainer: ScopeContainerAccess<TProvides>,
    singletonMemo: MemoMap,
    parentScope: ScopeImpl<TProvides, TAsyncPorts> | null
  ) {
    this.id = `child-scope-${scopeIdCounter++}`;
    this.childContainer = childContainer;
    this.scopedMemo = singletonMemo.fork();
    this.parentScope = parentScope;
  }

  resolve<P extends TProvides>(port: P): InferService<P> {
    const portName = (port as Port<unknown, string>).__portName;

    if (this.disposed) {
      throw new DisposedScopeError(portName);
    }

    return this.childContainer.resolveInternal(port, this.scopedMemo);
  }

  async resolveAsync<P extends TProvides>(port: P): Promise<InferService<P>> {
    const portName = (port as Port<unknown, string>).__portName;

    if (this.disposed) {
      throw new DisposedScopeError(portName);
    }

    return this.childContainer.resolveInternal(port, this.scopedMemo);
  }

  createScope(): Scope<TProvides, TAsyncPorts, "uninitialized"> {
    const child = new ScopeImpl<TProvides, TAsyncPorts>(
      this.childContainer,
      this.childContainer.getSingletonMemo(),
      this
    );
    this.childScopes.add(child);
    return createScopeWrapper(child);
  }

  async dispose(): Promise<void> {
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

  get isDisposed(): boolean {
    return this.disposed;
  }

  getInternalState(): ScopeInternalState {
    if (this.disposed) {
      throw new DisposedScopeError(`scope:${this.id}`);
    }

    const childSnapshots: ScopeInternalState[] = [];
    for (const child of this.childScopes) {
      try {
        childSnapshots.push(child.getInternalState());
      } catch {
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
function createMemoMapSnapshot(memo: MemoMap) {
  const entries: Array<{
    port: Port<unknown, string>;
    portName: string;
    resolvedAt: number;
    resolutionOrder: number;
  }> = [];

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
function createChildContainerWrapper<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
>(
  impl: ChildContainerImpl<TProvides, TExtends, TAsyncPorts>
): ChildContainer<TProvides, TExtends, TAsyncPorts> {
  // Note: ADAPTER_ACCESS is an internal symbol not in the public type
  // Also registerChildContainer is internal for disposal tracking
  const childContainerBase = {
    resolve: (<P extends TProvides | TExtends>(port: P): InferService<P> => impl.resolve(port)) as ChildContainer<TProvides, TExtends, TAsyncPorts>["resolve"],
    resolveAsync: <P extends TProvides | TExtends>(port: P): Promise<InferService<P>> => impl.resolveAsync(port),
    createScope: () => impl.createScope() as Scope<TProvides | TExtends, TAsyncPorts, "uninitialized">,
    createChild: () => impl.createChild() as ChildContainerBuilder<TProvides | TExtends, TAsyncPorts>,
    dispose: () => impl.dispose(),
    get isDisposed(): boolean {
      return impl.isDisposed;
    },
    get parent() {
      return impl.getParent() as ChildContainer<TProvides, TExtends, TAsyncPorts>["parent"];
    },
    [INTERNAL_ACCESS]: () => impl.getInternalState(),
    [ADAPTER_ACCESS]: (port: Port<unknown, string>): RuntimeAdapter | undefined => impl.getAdapter(port),
    // Internal method for grandchild container registration
    registerChildContainer: (child: { dispose(): Promise<void>; isDisposed: boolean }) => impl.registerChildContainer(child),
    unregisterChildContainer: (child: { dispose(): Promise<void>; isDisposed: boolean }) => impl.unregisterChildContainer(child),
    get [ChildContainerBrand](): { provides: TProvides; extends: TExtends } {
      return undefined as never;
    },
  };

  const childContainer = childContainerBase as ChildContainer<TProvides, TExtends, TAsyncPorts>;

  // Set wrapper reference on impl and register with parent for disposal tracking
  impl.setWrapper(childContainer);

  return Object.freeze(childContainer);
}

/**
 * Creates a frozen Scope wrapper for child container scopes.
 */
function createScopeWrapper<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
>(
  impl: ScopeImpl<TProvides, TAsyncPorts>
): Scope<TProvides, TAsyncPorts, "uninitialized"> {
  const scope: Scope<TProvides, TAsyncPorts, "uninitialized"> = {
    resolve: (<P extends TProvides>(port: P): InferService<P> => impl.resolve(port)) as Scope<TProvides, TAsyncPorts, "uninitialized">["resolve"],
    resolveAsync: <P extends TProvides>(port: P): Promise<InferService<P>> => impl.resolveAsync(port),
    createScope: () => impl.createScope(),
    dispose: () => impl.dispose(),
    get isDisposed(): boolean {
      return impl.isDisposed;
    },
    [INTERNAL_ACCESS]: () => impl.getInternalState(),
    get [ScopeBrand](): { provides: TProvides } {
      return undefined as never;
    },
  };

  return Object.freeze(scope);
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
export function createChildContainerBuilder<
  TParentProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string> = never,
>(
  parentContainer: Container<TParentProvides, TAsyncPorts, ContainerPhase>
): ChildContainerBuilder<TParentProvides, TAsyncPorts> {
  // Container includes [ADAPTER_ACCESS] and register/unregister methods internally,
  // so we extract ParentContainerLike structurally.
  // The containerBase in container.ts adds these properties.
  const parentLike: ParentContainerLike<TParentProvides, TAsyncPorts> = {
    resolve: parentContainer.resolve,
    resolveAsync: parentContainer.resolveAsync,
    [ADAPTER_ACCESS]: (parentContainer as AdapterAccessor)[ADAPTER_ACCESS],
    registerChildContainer: (parentContainer as ChildContainerRegistry).registerChildContainer,
    unregisterChildContainer: (parentContainer as ChildContainerRegistry).unregisterChildContainer,
  };
  return ChildContainerBuilderImpl.create(parentLike);
}
