/**
 * Container type definitions for @hex-di/runtime.
 *
 * The Container type is the primary interface for type-safe service resolution.
 * It uses branded types for nominal typing and supports both root and child containers.
 *
 * @packageDocumentation
 */

import type { Port, InferService, TracingAPI, InspectorAPI, AdapterConstraint } from "@hex-di/core";
import { OverrideBuilder } from "../container/override-builder.js";
import type { Graph, InferGraphProvides, InferGraphAsyncPorts } from "@hex-di/graph";
import { INTERNAL_ACCESS } from "../inspection/symbols.js";
import type { ContainerInternalState } from "../inspection/internal-state-types.js";
import type { ContainerPhase, ContainerKind, CreateChildOptions } from "./options.js";
import { ContainerBrand } from "./brands.js";
import type { LazyContainer } from "./lazy-container.js";
import type { Scope } from "./scope.js";
import type { ExtractPortNames } from "./inheritance.js";
import type { HookType, HookHandler } from "../resolution/hooks.js";

// =============================================================================
// Internal Utility Types
// =============================================================================

/**
 * Infers the service type from a port union by port name.
 *
 * Given a union of ports and a port name string, extracts the service type
 * of the port with that name. Used for type-safe override maps.
 *
 * @typeParam TPorts - Union of Port types to search
 * @typeParam TName - Port name string to match
 * @internal
 */
type InferServiceByName<TPorts extends Port<unknown, string>, TName extends string> =
  TPorts extends Port<infer TService, TName> ? TService : never;

// =============================================================================
// Container Type (Unified: Root + Child)
// =============================================================================

/**
 * A branded container type that provides type-safe service resolution.
 *
 * The Container type is unified to represent both root containers (created from a Graph)
 * and child containers (created via `.createChild().build()`). The `TExtends` type parameter
 * distinguishes between them:
 * - Root containers: `TExtends = never` (has `initialize()`, no `parent`)
 * - Child containers: `TExtends` is a port union (has `parent`, no `initialize()`)
 *
 * @typeParam TProvides - Union of Port types from graph (root) or parent (child).
 * @typeParam TExtends - Union of Port types added via `.extend()`. `never` for root containers.
 * @typeParam TAsyncPorts - Union of Port types that have async factories.
 * @typeParam TPhase - The initialization phase of the container.
 *
 * @remarks
 * - The brand property carries the TProvides and TExtends types for nominal typing
 * - The resolve method is generic to preserve the specific port type being resolved
 * - Resolution works on `TProvides | TExtends` (effective provides)
 * - Before initialization, sync resolve is limited to non-async ports
 * - After initialization, all ports can be resolved synchronously
 * - Child containers inherit initialization state from their parent
 *
 * @see {@link Scope} - Child scope type with identical resolution API but separate brand
 * @see {@link createContainer} - Factory function to create root container instances
 * @see {@link Container.createChild} - Creates child containers from a Graph
 *
 * @example Root container usage
 * ```typescript
 * // Root container type has TExtends = never
 * const container = createContainer(graph);
 * // Type: Container<LoggerPort | DatabasePort, never, AsyncPorts>
 *
 * const logger = container.resolve(LoggerPort);
 * await container.initialize(); // Only root containers have initialize()
 * ```
 *
 * @example Child container usage
 * ```typescript
 * const child = container.createChild()
 *   .override(MockLoggerAdapter)
 *   .extend(NewFeatureAdapter)
 *   .build();
 * // Type: Container<LoggerPort | DatabasePort, NewFeaturePort>
 *
 * child.parent; // Access parent container
 * // child.initialize() - Not available on child containers
 * ```
 */
export type Container<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string> = never,
  TAsyncPorts extends Port<unknown, string> = never,
  TPhase extends ContainerPhase = "uninitialized",
> = ContainerMembers<TProvides, TExtends, TAsyncPorts, TPhase>;

/**
 * Internal type containing Container method definitions.
 * Exported for use in factory.ts where container objects are created.
 * @internal
 */
export type ContainerMembers<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase,
> = {
  /**
   * Resolves a service instance for the given port synchronously.
   *
   * The port must be in `TProvides | TExtends` union, enforced at compile time.
   * The return type is inferred from the port's phantom service type.
   *
   * **Phase-dependent behavior:**
   * - Before initialization: Only non-async ports can be resolved
   * - After initialization: All ports can be resolved
   *
   * @typeParam P - The specific port type being resolved
   * @param port - The port token to resolve
   * @returns The service instance for the given port
   *
   * @throws {DisposedScopeError} If the container has been disposed
   * @throws {ScopeRequiredError} If resolving a scoped port from root container
   * @throws {CircularDependencyError} If a circular dependency is detected
   * @throws {FactoryError} If the adapter's factory function throws
   * @throws {AsyncInitializationRequiredError} If resolving an async port before initialization
   */
  resolve<
    P extends TPhase extends "initialized"
      ? TProvides | TExtends
      : Exclude<TProvides | TExtends, TAsyncPorts>,
  >(
    port: P
  ): InferService<P>;

  /**
   * Resolves a service instance for the given port asynchronously.
   *
   * The port must be in `TProvides | TExtends` union, enforced at compile time.
   * This method can resolve any port regardless of whether it has an async factory.
   *
   * @typeParam P - The specific port type being resolved
   * @param port - The port token to resolve
   * @returns A promise that resolves to the service instance
   *
   * @throws {DisposedScopeError} If the container has been disposed
   * @throws {ScopeRequiredError} If resolving a scoped port from root container
   * @throws {CircularDependencyError} If a circular dependency is detected
   * @throws {AsyncFactoryError} If the async factory function throws
   */
  resolveAsync<P extends TProvides | TExtends>(port: P): Promise<InferService<P>>;

  /**
   * Executes a function with temporary service overrides.
   *
   * Creates an isolated override context where specified ports resolve to
   * override adapters instead of the original implementations. The override
   * context has its own memoization map, ensuring instances created within
   * the override context are isolated from the parent container.
   *
   * @typeParam TOverrides - Map type of ports to override adapter factories
   * @typeParam R - Return type of the callback function
   * @param overrides - Map of port names to factory functions that create override instances
   * @param fn - Function to execute with overrides applied
   * @returns The result of the function execution
   *
   * @example
   * ```typescript
   * const result = container.withOverrides(
   *   { Logger: () => new MockLogger() },
   *   () => {
   *     const logger = container.resolve(LoggerPort); // Gets mock
   *     return someOperation(logger);
   *   }
   * );
   * ```
   */
  withOverrides<
    TOverrides extends {
      [K in ExtractPortNames<TProvides | TExtends>]?: () => InferServiceByName<
        TProvides | TExtends,
        K
      >;
    },
    R,
  >(
    overrides: TOverrides,
    fn: () => R
  ): R;

  /**
   * Initializes all async ports in priority order.
   *
   * **Only available on root containers** (when `TExtends extends never`).
   * Child containers inherit initialization state from their parent.
   *
   * This method resolves all ports with async factories, caching the results.
   * After initialization, sync resolve works for all ports including async ones.
   *
   * @returns A promise that resolves to an initialized container
   *
   * @throws {DisposedScopeError} If the container has been disposed
   * @throws {AsyncFactoryError} If any async factory throws
   */
  // NOTE: Using [T] extends [never] to prevent distribution over the never type.
  // Plain `T extends never` returns never when T=never due to conditional type distribution.
  initialize: [TExtends] extends [never]
    ? TPhase extends "uninitialized"
      ? () => Promise<Container<TProvides, never, TAsyncPorts, "initialized">>
      : never
    : never;

  /**
   * Whether the container has been initialized.
   *
   * After initialization, all ports can be resolved synchronously.
   * Child containers inherit this state from their root ancestor.
   */
  readonly isInitialized: boolean;

  /**
   * Creates a child scope for managing scoped service lifetimes.
   *
   * Scoped services are created once per scope and shared within that scope.
   * The returned scope has the effective provides (`TProvides | TExtends`).
   *
   * @param name - Optional custom name for the scope (for DevTools identification)
   * @returns A new Scope instance
   */
  createScope(name?: string): Scope<TProvides | TExtends, TAsyncPorts, TPhase>;

  /**
   * Creates a child container from a child graph.
   *
   * Child containers can:
   * - Override parent adapters using `GraphBuilder.override()`
   * - Add new adapters using `GraphBuilder.provide()`
   * - Configure singleton inheritance modes (shared, forked, isolated)
   *
   * @typeParam TChildGraph - The child graph type
   * @param childGraph - Graph built with GraphBuilder, using override() for replacements
   * @param inheritanceModes - Optional per-port inheritance mode configuration
   * @returns A new child Container instance
   *
   * @example
   * ```typescript
   * const childGraph = GraphBuilder.create()
   *   .override(MockLoggerAdapter)  // Override parent's Logger
   *   .provide(CacheAdapter)        // Add new Cache port
   *   .build();
   *
   * const child = container.createChild(childGraph, { name: "Feature" });
   * child.name       // "Feature"
   * child.parentName // parent's name (auto-derived)
   * child.kind       // "child"
   * ```
   */
  createChild<
    TChildGraph extends Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>,
  >(
    childGraph: TChildGraph,
    options: CreateChildOptions<TProvides | TExtends>
  ): Container<
    TProvides | TExtends,
    Exclude<InferGraphProvides<TChildGraph>, TProvides | TExtends>,
    TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
    "initialized"
  >;

  /**
   * Creates a child container asynchronously from a graph loader.
   *
   * Use this method when the child graph is loaded via dynamic import
   * for code-splitting. The returned Promise resolves to a normal Container
   * that can be used synchronously.
   *
   * @typeParam TChildGraph - The child graph type
   * @param graphLoader - Async function that returns the child graph
   * @param options - Container options including id, label, and optional inheritanceModes
   * @returns A Promise that resolves to the child container
   *
   * @example
   * ```typescript
   * const pluginContainer = await container.createChildAsync(
   *   () => import('./plugin-graph').then(m => m.PluginGraph),
   *   { name: "Plugin Container" }
   * );
   *
   * // Use like a normal container
   * const service = pluginContainer.resolve(PluginPort);
   * ```
   */
  createChildAsync<
    TChildGraph extends Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>,
  >(
    graphLoader: () => Promise<TChildGraph>,
    options: CreateChildOptions<TProvides | TExtends>
  ): Promise<
    Container<
      TProvides | TExtends,
      Exclude<InferGraphProvides<TChildGraph>, TProvides | TExtends>,
      TAsyncPorts | InferGraphAsyncPorts<TChildGraph>,
      "initialized"
    >
  >;

  /**
   * Creates a lazy-loading child container wrapper.
   *
   * The graph is not loaded until the first call to `resolve()` or `load()`.
   * Use this for optional features that may never be accessed, maximizing
   * code-splitting benefits.
   *
   * @typeParam TChildGraph - The child graph type
   * @param graphLoader - Async function that returns the child graph
   * @param options - Container options including id, label, and optional inheritanceModes
   * @returns A LazyContainer that loads on first use
   *
   * @example
   * ```typescript
   * const lazyPlugin = container.createLazyChild(
   *   () => import('./plugin-graph').then(m => m.PluginGraph),
   *   { name: "Plugin Container" }
   * );
   *
   * // Graph not loaded yet
   * console.log(lazyPlugin.isLoaded); // false
   *
   * // Graph loaded on first resolve
   * const service = await lazyPlugin.resolve(PluginPort);
   * console.log(lazyPlugin.isLoaded); // true
   * ```
   */
  createLazyChild<
    TChildGraph extends Graph<Port<unknown, string>, Port<unknown, string>, Port<unknown, string>>,
  >(
    graphLoader: () => Promise<TChildGraph>,
    options: CreateChildOptions<TProvides | TExtends>
  ): LazyContainer<
    TProvides | TExtends,
    Exclude<InferGraphProvides<TChildGraph>, TProvides | TExtends>,
    TAsyncPorts | InferGraphAsyncPorts<TChildGraph>
  >;

  /**
   * Disposes the container and all singleton instances.
   *
   * After disposal, the container cannot be used to resolve services.
   * Finalizers are called in LIFO order (last created first disposed).
   * Child containers and scopes are disposed first.
   *
   * @returns A promise that resolves when disposal is complete
   */
  dispose(): Promise<void>;

  /**
   * Whether the container has been disposed.
   *
   * After disposal, resolve() will throw DisposedScopeError.
   * This property can be used to check if the container is still usable.
   */
  readonly isDisposed: boolean;

  /**
   * Checks if the container can resolve the given port.
   *
   * @param port - The port token to check
   * @returns true if the port is provided by this container or its parent
   */
  has(port: Port<unknown, string>): boolean;

  /**
   * Container name - serves as both identifier and display label.
   *
   * Set via `createContainer(graph, { name })` or `createChild(graph, { name })`.
   */
  readonly name: string;

  /**
   * Parent container's name, null for root containers.
   *
   * For child containers, this is automatically derived from `parent.name`
   * at creation time.
   */
  readonly parentName: string | null;

  /**
   * Container kind - "root" for root containers, "child" for child containers.
   */
  readonly kind: ContainerKind;

  /**
   * Reference to the parent container.
   *
   * **Only available on child containers** (when `TExtends` is not `never`).
   * Root containers do not have a parent.
   */
  // NOTE: Using [T] extends [never] to prevent distribution over the never type.
  readonly parent: [TExtends] extends [never]
    ? never
    : Container<TProvides, Port<unknown, string>, TAsyncPorts, TPhase>;

  // =========================================================================
  // Built-in Plugin APIs (always present, zero ceremony access)
  // =========================================================================

  /**
   * Inspector API for container state inspection and DevTools integration.
   *
   * Provides pull-based queries for container state, scope trees, and port resolution status.
   * Always available on containers - no plugin configuration or symbol imports required.
   *
   * @example
   * ```typescript
   * const container = createContainer({ graph: graph, name: "App"  });
   *
   * // Direct property access - maximum discoverability
   * const snapshot = container.inspector.getSnapshot();
   * const ports = container.inspector.listPorts();
   * const kind = container.inspector.getContainerKind();
   * ```
   */
  readonly inspector: InspectorAPI;

  /**
   * Tracer API for resolution tracing and performance monitoring.
   *
   * Provides methods to retrieve traces, statistics, and subscribe to resolution events.
   * Always available on containers - no plugin configuration or symbol imports required.
   *
   * @example
   * ```typescript
   * const container = createContainer({ graph: graph, name: "App"  });
   *
   * // Direct property access - maximum discoverability
   * const traces = container.tracer.getTraces();
   * const stats = container.tracer.getStats();
   *
   * // Subscribe to real-time traces
   * container.tracer.subscribe((entry) => {
   *   console.log(`Resolved ${entry.portName} in ${entry.duration}ms`);
   * });
   * ```
   */
  readonly tracer: TracingAPI;

  // =========================================================================
  // Hook Management API
  // =========================================================================

  /**
   * Adds a resolution hook to this container.
   *
   * Hooks are called during service resolution:
   * - `beforeResolve`: Called before resolving, receives port name and lifetime
   * - `afterResolve`: Called after resolving, receives result and duration
   *
   * Multiple hooks can be installed. beforeResolve hooks fire in installation order,
   * afterResolve hooks fire in reverse order (middleware pattern).
   *
   * @param type - The hook type: 'beforeResolve' or 'afterResolve'
   * @param handler - The hook handler function
   *
   * @example
   * ```typescript
   * container.addHook('beforeResolve', (ctx) => {
   *   console.log(`Resolving ${ctx.portName}`);
   * });
   *
   * container.addHook('afterResolve', (ctx) => {
   *   console.log(`Resolved ${ctx.portName} in ${ctx.duration}ms`);
   * });
   * ```
   */
  addHook<T extends HookType>(type: T, handler: HookHandler<T>): void;

  /**
   * Removes a previously installed resolution hook.
   *
   * The handler must be the same function reference that was passed to addHook.
   * If the handler was not installed, this is a no-op.
   *
   * @param type - The hook type: 'beforeResolve' or 'afterResolve'
   * @param handler - The hook handler function to remove
   *
   * @example
   * ```typescript
   * const handler = (ctx) => console.log(ctx.portName);
   * container.addHook('beforeResolve', handler);
   * // Later...
   * container.removeHook('beforeResolve', handler);
   * ```
   */
  removeHook<T extends HookType>(type: T, handler: HookHandler<T>): void;

  // =========================================================================
  // Override API (Type-Safe Container Overrides)
  // =========================================================================

  /**
   * Creates an override builder for type-safe container overrides.
   *
   * The override builder provides a fluent API for creating child containers
   * with overridden adapters. Each `.override()` call is validated at compile
   * time to ensure:
   * 1. The adapter's port exists in this container's graph
   * 2. The adapter's dependencies are satisfied
   *
   * The `.build()` method creates a child container with the overrides applied.
   *
   * @typeParam A - The adapter type to override with
   * @param adapter - The adapter instance to use as an override
   * @returns An OverrideBuilder for chaining additional overrides
   *
   * @example
   * ```typescript
   * // Create a test container with mock services
   * const testContainer = container
   *   .override(MockLoggerAdapter)
   *   .override(MockDatabaseAdapter)
   *   .build();
   *
   * // The mock logger is now used instead of the real one
   * const logger = testContainer.resolve(LoggerPort);
   * ```
   *
   * @example
   * ```typescript
   * // Compile-time error if port doesn't exist
   * container.override(UnknownAdapter); // ERROR: Port 'Unknown' not found in graph
   *
   * // Compile-time error if dependencies missing
   * container.override(AdapterWithMissingDeps); // ERROR: Missing dependencies
   * ```
   */
  override<A extends AdapterConstraint>(
    adapter: A
  ): OverrideBuilder<TProvides | TExtends, never, TAsyncPorts, TPhase>;

  /**
   * Brand property for nominal typing.
   * Contains the TProvides and TExtends type parameters at the type level.
   * Value is undefined at runtime.
   */
  readonly [ContainerBrand]: { provides: TProvides; extends: TExtends };

  /**
   * Internal state accessor for DevTools inspection.
   * Returns a frozen snapshot of the container's internal state.
   *
   * @internal Use createInspector() for a higher-level inspection API
   */
  readonly [INTERNAL_ACCESS]: () => ContainerInternalState;
};
