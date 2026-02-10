/**
 * Container configuration options and phase types.
 *
 * These types define the options for creating containers and the
 * initialization phase tracking for type-state enforcement.
 *
 * @packageDocumentation
 */
// @ts-nocheck

import type { Port } from "@hex-di/core";
import type { Graph } from "@hex-di/graph";
import type { InheritanceModeConfig } from "./inheritance.js";
import type { ResolutionHooks } from "../resolution/hooks.js";

// =============================================================================
// Container Phase Type
// =============================================================================

/**
 * Represents the initialization phase of a container.
 *
 * Used for type-state tracking to enforce that async ports cannot be resolved
 * synchronously before initialization.
 *
 * @remarks
 * **State Transitions:**
 * - `'uninitialized'`: Fresh container state after creation
 * - `'initialized'`: State after calling `container.initialize()`
 *
 * **Available Operations by Phase:**
 * - In `'uninitialized'` phase:
 *   - `resolve()`: Works only for non-async ports (ports without async factories)
 *   - `resolveAsync()`: Works for all ports
 *   - `initialize()`: Available on root containers to transition to 'initialized'
 * - In `'initialized'` phase:
 *   - `resolve()`: Works for all ports (async results are cached)
 *   - `resolveAsync()`: Works for all ports
 *   - `initialize()`: Not available (already initialized)
 *
 * **Inheritance in Child Containers:**
 * Child containers inherit the phase from their parent at creation time:
 * - Child created before parent initialization: `'uninitialized'`
 * - Child created after parent initialization: `'initialized'`
 * Child containers cannot call `initialize()` - they rely on the root container.
 *
 * @see {@link Container.initialize} - Transitions root containers to 'initialized' phase
 * @see {@link Container.resolve} - Type constrains based on phase
 * @see {@link Container.resolveAsync} - Always available regardless of phase
 */
export type ContainerPhase = "uninitialized" | "initialized";

// =============================================================================
// Container Naming Types
// =============================================================================

/**
 * The kind of container in the hierarchy.
 *
 * Used to distinguish between root containers (created from a graph) and child
 * containers (created from a parent container with optional overrides/extensions).
 *
 * @remarks
 * - `'root'`: The root container created by `createContainer()`. Has `initialize()` method.
 * - `'child'`: A child container created by `createChild()`. Has `parent` property.
 *
 * This distinction affects:
 * - **Initialization:** Only root containers can be initialized
 * - **Parent access:** Only child containers have a `parent` property
 * - **Inheritance:** Child containers can inherit singleton instances from parent
 * - **DevTools:** Hierarchy visualization in DevTools uses this kind
 *
 * @see {@link Container.kind} - Property that exposes this value
 */
export type ContainerKind = "root" | "child";

// =============================================================================
// DevTools Options
// =============================================================================

/**
 * DevTools-specific options for container visibility and display.
 *
 * These options control how the container appears in DevTools
 * without affecting runtime behavior.
 *
 * @example
 * ```typescript
 * const container = createContainer(graph, {
 *   name: "App",
 *   devtools: {
 *     discoverable: true,
 *     label: "Main Application Container",
 *   },
 * });
 * ```
 */
export interface ContainerDevToolsOptions {
  /**
   * Whether this container is discoverable by DevTools.
   *
   * When `false`, DevTools will not automatically discover or display
   * this container or its children. Useful for internal/infrastructure
   * containers that should not appear in the UI.
   *
   * @default true
   */
  readonly discoverable?: boolean;

  /**
   * Custom display label for DevTools.
   *
   * When provided, DevTools will use this label instead of the container name
   * for display purposes. The container name is still used for identification.
   *
   * @default undefined (uses container name)
   */
  readonly label?: string;
}

/**
 * Performance-related options for container runtime behavior.
 *
 * These options allow disabling certain features for production
 * builds where debugging information is not needed.
 *
 * @remarks
 * **When to Use:**
 * - Development: Keep defaults (timestamps enabled) for debugging
 * - Production: Consider disabling timestamps for high-throughput services
 * - Testing: Keep defaults to verify resolution timing
 *
 * **Performance Impact:**
 * - `disableTimestamps: false` (default): ~1-2% overhead from Date.now() calls
 * - `disableTimestamps: true`: Zero timestamp overhead, but loses resolution timing data
 *
 * The overhead is negligible for most applications but may matter in:
 * - Request handlers with 1000+ req/sec
 * - Hot loops that repeatedly resolve services
 * - Lambda cold starts where every microsecond counts
 *
 * @example Conditional performance settings
 * ```typescript
 * const container = createContainer({
 *   graph,
 *   name: "App",
 *   performance: {
 *     disableTimestamps: process.env.NODE_ENV === "production",
 *   },
 * });
 * ```
 *
 * @example High-throughput API server
 * ```typescript
 * // Disable timestamps for production API server
 * const container = createContainer({
 *   graph,
 *   name: "API Server",
 *   performance: { disableTimestamps: true },
 * });
 * // tracer.getTraces() will show resolvedAt: 0
 * ```
 */
export interface RuntimePerformanceOptions {
  /**
   * Disable timestamp capture for production builds.
   *
   * When `true`:
   * - No `Date.now()` calls during resolution
   * - `resolvedAt` property in traces will be `0`
   * - Resolution duration calculations will show `0`
   * - Tracing API still works, just without timing data
   *
   * When `false` (default):
   * - Timestamps captured for every resolution
   * - Full timing data available in traces
   * - Minimal overhead (~1-2% in high-throughput scenarios)
   *
   * @default false
   *
   * @remarks
   * This only affects timestamp capture, not the tracing system itself.
   * Traces are still recorded, hooks still fire, and the tracer API remains functional.
   * You lose timing information but retain the resolution event log.
   */
  readonly disableTimestamps?: boolean;
}

/**
 * Options for creating a root container.
 *
 * @remarks
 * Root containers are the top-level containers created from a Graph. They have:
 * - `initialize()` method for async initialization
 * - No `parent` property
 * - `kind: "root"`
 * - `parentName: null`
 *
 * @example Basic usage
 * ```typescript
 * const root = createContainer({ graph: graph, name: "Root Container"  });
 * root.name       // "Root Container"
 * root.parentName // null
 * root.kind       // "root"
 * ```
 *
 * @example With DevTools options
 * ```typescript
 * const root = createContainer({
 *   graph,
 *   name: "App",
 *   devtools: {
 *     label: "Main Application",
 *     discoverable: true,
 *   },
 * });
 * ```
 *
 * @example With performance optimization
 * ```typescript
 * const root = createContainer({
 *   graph,
 *   name: "Production API",
 *   performance: {
 *     disableTimestamps: process.env.NODE_ENV === "production",
 *   },
 * });
 * ```
 *
 * @see {@link CreateContainerConfig} - Unified config with hooks and graph
 */
export interface CreateContainerOptions {
  /**
   * Container name - serves as both identifier and display label.
   *
   * Used for:
   * - DevTools display
   * - Error messages
   * - Tracing output
   * - Child container parent name
   *
   * @example
   * ```typescript
   * const container = createContainer({ graph, name: "App" });
   * console.log(container.name); // "App"
   * ```
   */
  readonly name: string;

  /**
   * DevTools-specific options for visibility and display.
   *
   * @default { discoverable: true }
   *
   * @example Hide from DevTools
   * ```typescript
   * const internal = createContainer({
   *   graph,
   *   name: "Internal",
   *   devtools: { discoverable: false },
   * });
   * ```
   */
  readonly devtools?: ContainerDevToolsOptions;

  /**
   * Performance-related options.
   *
   * @default { disableTimestamps: false }
   *
   * @example Production optimization
   * ```typescript
   * const container = createContainer({
   *   graph,
   *   name: "API",
   *   performance: { disableTimestamps: true },
   * });
   * ```
   */
  readonly performance?: RuntimePerformanceOptions;
}

/**
 * Options for creating a child container.
 *
 * @typeParam TProvides - The parent container's effective provides union (`TProvides | TExtends`).
 *   Used to constrain the `inheritanceModes` configuration to only accept ports that
 *   actually exist in the parent container.
 *
 * @remarks
 * Child containers are created from a parent container using `createChild()`. They have:
 * - `parent` property referencing the parent container
 * - No `initialize()` method (inherit parent's initialization state)
 * - `kind: "child"`
 * - `parentName` derived from `parent.name`
 *
 * **Inheritance Modes:**
 * Child containers can configure how they inherit singleton instances from their parent:
 * - `"shared"` (default): Use parent's singleton instance directly
 * - `"forked"`: Create a new singleton instance for this child
 * - `"isolated"`: Create a new singleton instance per child, never share
 *
 * @example Basic child container
 * ```typescript
 * const child = root.createChild(childGraph, { name: "Auth Feature" });
 * child.name       // "Auth Feature"
 * child.parentName // "Root Container" (derived from parent.name)
 * child.kind       // "child"
 * child.parent     // root
 * ```
 *
 * @example With inheritance modes
 * ```typescript
 * const child = root.createChild(childGraph, {
 *   name: "Forked Feature",
 *   inheritanceModes: {
 *     Logger: "forked",      // This child gets its own Logger instance
 *     Database: "shared",    // This child shares parent's Database instance
 *   }
 * });
 * ```
 *
 * @example With DevTools options
 * ```typescript
 * const child = root.createChild(childGraph, {
 *   name: "Internal",
 *   devtools: { discoverable: false },
 * });
 * ```
 *
 * @see {@link InheritanceModeConfig} - Per-port inheritance mode configuration
 */
export interface CreateChildOptions<TProvides extends Port<unknown, string> = never> {
  /**
   * Container name - serves as both identifier and display label.
   *
   * Used for:
   * - DevTools display (hierarchy visualization)
   * - Error messages
   * - Tracing output (prefixed with parent name)
   * - Grandchild container parent name
   *
   * @example
   * ```typescript
   * const child = parent.createChild(graph, { name: "Feature" });
   * console.log(child.name);       // "Feature"
   * console.log(child.parentName); // "App" (from parent.name)
   * ```
   */
  readonly name: string;

  /**
   * Optional per-port inheritance mode configuration.
   *
   * Configures how this child container inherits singleton instances from its parent.
   * By default, all ports use "shared" mode (inherit parent's singletons).
   *
   * @default {} (all ports use "shared" mode)
   *
   * @example Fork specific services
   * ```typescript
   * const testChild = parent.createChild(graph, {
   *   name: "Test",
   *   inheritanceModes: {
   *     Logger: "forked",    // Get our own Logger instance
   *     // Database: default "shared", use parent's instance
   *   },
   * });
   * ```
   */
  readonly inheritanceModes?: InheritanceModeConfig<TProvides>;

  /**
   * DevTools-specific options for visibility and display.
   *
   * @default { discoverable: true }
   *
   * @example Hide internal child container
   * ```typescript
   * const internal = parent.createChild(graph, {
   *   name: "Internal",
   *   devtools: { discoverable: false },
   * });
   * ```
   */
  readonly devtools?: ContainerDevToolsOptions;

  /**
   * Performance-related options.
   *
   * @default { disableTimestamps: false }
   *
   * @example Optimize for production
   * ```typescript
   * const child = parent.createChild(graph, {
   *   name: "Feature",
   *   performance: { disableTimestamps: true },
   * });
   * ```
   */
  readonly performance?: RuntimePerformanceOptions;
}

// =============================================================================
// Unified Container Configuration
// =============================================================================

/**
 * Unified configuration for creating a root container.
 *
 * This interface combines all container creation options into a single object
 * for a cleaner, more extensible API. It's the primary way to create containers.
 *
 * @typeParam TProvides - Union of Port types provided by the graph.
 *   Automatically inferred from the `graph` parameter using `InferGraphProvides<TGraph>`.
 *   Determines which ports can be resolved from the container.
 *
 * @typeParam _TAsyncPorts - Union of Port types with async factories (internal, inferred).
 *   Prefixed with `_` because it's automatically inferred and rarely needed by users.
 *   Used internally for phase-dependent type narrowing of `resolve()`.
 *
 * @remarks
 * **Required Fields:**
 * - `graph`: The dependency graph built with GraphBuilder
 * - `name`: Human-readable identifier for the container
 *
 * **Optional Fields:**
 * - `hooks`: Resolution lifecycle hooks for tracing/monitoring
 * - `devtools`: DevTools visibility and display options
 * - `performance`: Performance optimization options
 *
 * **Type Inference:**
 * The returned container type is fully inferred from the graph:
 * ```typescript
 * const graph = GraphBuilder.create()
 *   .provide(LoggerAdapter)
 *   .provide(DatabaseAdapter)
 *   .build();
 * // graph type: Graph<LoggerPort | DatabasePort, DatabasePort>
 *
 * const container = createContainer({ graph, name: "App" });
 * // container type: Container<LoggerPort | DatabasePort, never, DatabasePort, 'uninitialized'>
 * ```
 *
 * @example Minimal configuration
 * ```typescript
 * const container = createContainer({
 *   graph: GraphBuilder.create().provide(LoggerAdapter).build(),
 *   name: "App",
 * });
 * ```
 *
 * @example With resolution hooks
 * ```typescript
 * const container = createContainer({
 *   graph,
 *   name: "App",
 *   hooks: {
 *     beforeResolve: (ctx) => console.log(`Resolving ${ctx.portName}`),
 *     afterResolve: (ctx) => console.log(`Resolved in ${ctx.duration}ms`),
 *   },
 * });
 * ```
 *
 * @example With DevTools configuration
 * ```typescript
 * const container = createContainer({
 *   graph,
 *   name: "App",
 *   devtools: {
 *     label: "Main Application Container",
 *     discoverable: true,
 *   },
 * });
 * ```
 *
 * @example Production-optimized configuration
 * ```typescript
 * const container = createContainer({
 *   graph,
 *   name: "API Server",
 *   performance: {
 *     disableTimestamps: process.env.NODE_ENV === "production",
 *   },
 * });
 * ```
 *
 * @example Complete configuration
 * ```typescript
 * const container = createContainer({
 *   graph: productionGraph,
 *   name: "Production API",
 *   hooks: {
 *     afterResolve: (ctx) => {
 *       if (ctx.error) {
 *         errorMonitor.captureException(ctx.error);
 *       }
 *     },
 *   },
 *   devtools: {
 *     label: "Production API Server",
 *     discoverable: false, // Hide from DevTools in production
 *   },
 *   performance: {
 *     disableTimestamps: true, // Optimize for high throughput
 *   },
 * });
 * ```
 *
 * @see {@link CreateContainerOptions} - Separate options interface (alternative API)
 * @see {@link ResolutionHooks} - Hook interface for lifecycle instrumentation
 */
export interface CreateContainerConfig<
  TProvides extends Port<unknown, string>,
  _TAsyncPorts extends Port<unknown, string> = never,
> {
  /**
   * The validated ServiceGraph containing all adapters.
   *
   * Built using GraphBuilder.create().provide(...).build().
   * The graph type determines the container's type parameters.
   *
   * @example
   * ```typescript
   * const graph = GraphBuilder.create()
   *   .provide(LoggerAdapter)
   *   .provide(DatabaseAdapter)
   *   .build();
   *
   * const container = createContainer({ graph, name: "App" });
   * ```
   */
  readonly graph: Graph<TProvides, Port<unknown, string>>;

  /**
   * Container name - serves as both identifier and display label.
   *
   * Used for:
   * - DevTools display
   * - Error messages (shows which container threw)
   * - Tracing output (prefixes all traces)
   * - Child container parent name
   *
   * @example
   * ```typescript
   * const container = createContainer({ graph, name: "App" });
   * console.log(container.name); // "App"
   * ```
   */
  readonly name: string;

  /**
   * Optional resolution lifecycle hooks.
   *
   * Hooks are called during service resolution for tracing, monitoring, or validation.
   * Both `beforeResolve` and `afterResolve` are optional.
   *
   * @default undefined (no hooks)
   *
   * @remarks
   * Use `@hex-di/tracing` instrumentContainer() for most observability needs.
   * Hooks are for custom integrations (APM tools, policy enforcement, etc.).
   *
   * @example
   * ```typescript
   * const container = createContainer({
   *   graph,
   *   name: "App",
   *   hooks: {
   *     afterResolve: (ctx) => {
   *       if (ctx.error === null) {
   *         metrics.histogram('resolution.duration', ctx.duration);
   *       }
   *     },
   *   },
   * });
   * ```
   *
   * @see {@link ResolutionHooks} - Full hook interface documentation
   */
  readonly hooks?: ResolutionHooks;

  /**
   * DevTools-specific options for visibility and display.
   *
   * @default { discoverable: true }
   *
   * @example Hide from DevTools
   * ```typescript
   * const container = createContainer({
   *   graph,
   *   name: "Internal",
   *   devtools: { discoverable: false },
   * });
   * ```
   */
  readonly devtools?: ContainerDevToolsOptions;

  /**
   * Performance-related options.
   *
   * @default { disableTimestamps: false }
   *
   * @example Production optimization
   * ```typescript
   * const container = createContainer({
   *   graph,
   *   name: "API",
   *   performance: { disableTimestamps: true },
   * });
   * ```
   */
  readonly performance?: RuntimePerformanceOptions;
}
