/**
 * Plugin system type definitions for @hex-di/runtime.
 *
 * Provides type-safe plugin extensibility with:
 * - Symbol-based API access: `container[PLUGIN_SYMBOL]` with full type inference
 * - Plugin dependencies: Required and optional dependencies between plugins
 * - Lifecycle hooks: Resolution and scope lifecycle instrumentation
 * - Zero overhead: No plugin code runs when no plugins are registered
 *
 * @packageDocumentation
 */

import type { ResolutionHookContext, ResolutionResultContext } from "../resolution/hooks.js";
import type { InternalAccessible } from "../inspector/types.js";

// =============================================================================
// Plugin Dependency Types
// =============================================================================

/**
 * Describes a dependency on another plugin.
 *
 * Used with `requires()` and `optionallyRequires()` to declare plugin dependencies
 * in a type-safe, self-documenting manner.
 *
 * @typeParam TSymbol - The symbol used to access the dependency's API
 * @typeParam TApi - The API interface provided by the dependency
 * @typeParam TOptional - `true` for optional dependencies, `false` for required
 */
export interface PluginDependency<TSymbol extends symbol, TApi, TOptional extends boolean> {
  /** The symbol used to access this dependency's API */
  readonly symbol: TSymbol;

  /** Human-readable name for error messages */
  readonly name: string;

  /** Documents why this dependency is needed */
  readonly reason: string;

  /** Whether this dependency is optional */
  readonly optional: TOptional;

  /**
   * Phantom type for API inference.
   * @internal
   */
  readonly __api?: TApi;
}

// =============================================================================
// Scope Event Types
// =============================================================================

/**
 * Information about a scope lifecycle event.
 *
 * Used in plugin hooks for scope creation/disposal events.
 * For display-oriented scope information, see `ScopeInfo` in @hex-di/devtools-core.
 */
export interface ScopeEventInfo {
  /** Unique identifier for this scope */
  readonly id: string;

  /** ID of the parent scope, or null for top-level scopes */
  readonly parentId: string | null;

  /** Timestamp when the scope was created (Date.now()) */
  readonly createdAt: number;

  /** ID of the container that owns this scope */
  readonly containerId: string;
}

// =============================================================================
// Container Info Types
// =============================================================================

/**
 * Information about a child container, provided to lifecycle hooks.
 */
export interface ChildContainerInfo {
  /** Unique identifier for this child container */
  readonly id: string;

  /** ID of the parent container */
  readonly parentId: string;

  /** Kind of child container: "child" or "lazy" */
  readonly kind: "child" | "lazy";

  /** Timestamp when the child container was created (Date.now()) */
  readonly createdAt: number;
}

/**
 * Information about a container, provided to disposal hooks.
 */
export interface ContainerInfo {
  /** Unique identifier for this container */
  readonly id: string;

  /** Kind of container: "root", "child", or "lazy" */
  readonly kind: "root" | "child" | "lazy";

  /** ID of the parent container, or null for root containers */
  readonly parentId: string | null;
}

// =============================================================================
// Scope Event Emitter
// =============================================================================

/**
 * Allows plugins to subscribe to scope lifecycle events.
 *
 * Plugins receive this in their PluginContext to react when scopes
 * are created or disposed.
 */
export interface ScopeEventEmitter {
  /**
   * Subscribe to scope creation events.
   * @param listener - Called when a new scope is created
   * @returns Unsubscribe function
   */
  onScopeCreated(listener: (scope: ScopeEventInfo) => void): () => void;

  /**
   * Subscribe to scope disposal start events.
   * @param listener - Called when a scope starts disposing
   * @returns Unsubscribe function
   */
  onScopeDisposing(listener: (scope: ScopeEventInfo) => void): () => void;

  /**
   * Subscribe to scope disposal complete events.
   * @param listener - Called when a scope finishes disposing
   * @returns Unsubscribe function
   */
  onScopeDisposed(listener: (scope: ScopeEventInfo) => void): () => void;
}

// =============================================================================
// Plugin Context
// =============================================================================

/**
 * Infers the API type from a plugin dependency.
 * @internal
 */
export type InferDependencyApi<T> =
  T extends PluginDependency<infer _S, infer A, infer _O> ? A : never;

/**
 * Extracts all symbols from a tuple of plugin dependencies.
 * @internal
 */
export type ExtractDependencySymbols<
  T extends readonly PluginDependency<symbol, unknown, boolean>[],
> = T[number]["symbol"];

/**
 * Maps a symbol to its API type from a tuple of dependencies.
 * @internal
 */
export type ApiFromSymbol<
  TDeps extends readonly PluginDependency<symbol, unknown, boolean>[],
  TSymbol extends symbol,
> = TDeps extends readonly [infer First, ...infer Rest]
  ? First extends PluginDependency<TSymbol, infer A, boolean>
    ? A
    : Rest extends readonly PluginDependency<symbol, unknown, boolean>[]
      ? ApiFromSymbol<Rest, TSymbol>
      : never
  : never;

/**
 * Context provided to plugins during initialization.
 *
 * Provides controlled access to container internals and dependency APIs
 * without exposing implementation details or allowing state mutation.
 *
 * @typeParam TRequired - Tuple of required plugin dependencies
 * @typeParam TOptional - Tuple of optional plugin dependencies
 *
 * @example
 * ```typescript
 * const MetricsPlugin = definePlugin({
 *   name: "metrics",
 *   symbol: METRICS,
 *   requires: [
 *     requires<typeof TRACING, TracingAPI>({
 *       symbol: TRACING,
 *       name: "Tracing",
 *       reason: "Metrics aggregates data from tracing",
 *     }),
 *   ] as const,
 *
 *   createApi(context) {
 *     // Type-safe: tracing is TracingAPI (guaranteed to exist)
 *     const tracing = context.getDependency(TRACING);
 *     return { computeStats: () => aggregate(tracing.getTraces()) };
 *   },
 * });
 * ```
 */
export interface PluginContext<
  TRequired extends readonly PluginDependency<symbol, unknown, false>[] = readonly [],
  TOptional extends readonly PluginDependency<symbol, unknown, true>[] = readonly [],
> {
  /**
   * Get a required dependency's API.
   *
   * The dependency must be declared in the plugin's `requires` array.
   * Returns the API type inferred from the dependency declaration.
   *
   * @typeParam S - The symbol of the dependency (must be in TRequired)
   * @param symbol - The symbol used to access the dependency
   * @returns The dependency's API
   */
  getDependency<S extends ExtractDependencySymbols<TRequired>>(
    symbol: S
  ): ApiFromSymbol<TRequired, S>;

  /**
   * Get an optional dependency's API.
   *
   * The dependency must be declared in the plugin's `enhancedBy` array.
   * Returns undefined if the plugin is not registered.
   *
   * @typeParam S - The symbol of the dependency (must be in TOptional)
   * @param symbol - The symbol used to access the dependency
   * @returns The dependency's API or undefined
   */
  getOptionalDependency<S extends ExtractDependencySymbols<TOptional>>(
    symbol: S
  ): ApiFromSymbol<TOptional, S> | undefined;

  /**
   * Check if a plugin is registered.
   *
   * @param symbol - The symbol of the plugin to check
   * @returns true if the plugin is registered
   */
  hasPlugin(symbol: symbol): boolean;

  /**
   * Subscribe to scope lifecycle events.
   *
   * Use this to react when scopes are created or disposed,
   * for example to track per-scope metrics or cleanup resources.
   */
  readonly scopeEvents: ScopeEventEmitter;

  /**
   * Register a disposal callback.
   *
   * Callbacks are invoked in LIFO order during container disposal,
   * after all services but before the container is fully disposed.
   *
   * @param callback - Function to call during disposal
   */
  onDispose(callback: () => void | Promise<void>): void;

  /**
   * Access the container being augmented by this plugin.
   *
   * Returns a minimal interface for inspector access via the
   * INTERNAL_ACCESS symbol. This enables plugins to inspect
   * container state without requiring late-binding patterns.
   *
   * @returns A trait-like interface providing container inspection access
   */
  getContainer(): InternalAccessible;
}

// =============================================================================
// Plugin Hooks
// =============================================================================

/**
 * Lifecycle hooks that plugins can provide for instrumentation.
 *
 * Hook invocation order:
 * - `beforeResolve`: Called in registration order (first registered, first called)
 * - `afterResolve`: Called in REVERSE order (middleware pattern - last in, first out)
 * - `onScopeCreated/Disposing/Disposed`: Called in registration order
 *
 * @remarks
 * - Hooks should not throw; doing so may interrupt resolution
 * - Hooks should be fast to avoid impacting performance
 * - Hooks receive readonly context and cannot modify resolution
 */
export interface PluginHooks {
  /**
   * Called before each resolution attempt.
   *
   * Invoked after adapter lookup but before cache check and instance creation.
   * Called for both cache hits and misses.
   *
   * @param context - Information about the resolution being attempted
   */
  beforeResolve?(context: ResolutionHookContext): void;

  /**
   * Called after each resolution completes (success or failure).
   *
   * Called in REVERSE registration order (middleware pattern).
   * The error property indicates success (null) or failure (Error instance).
   *
   * @param context - Information about the completed resolution
   */
  afterResolve?(context: ResolutionResultContext): void;

  /**
   * Called when a new scope is created.
   *
   * @param scope - Information about the created scope
   */
  onScopeCreated?(scope: ScopeEventInfo): void;

  /**
   * Called when a scope starts disposing.
   *
   * @param scope - Information about the scope being disposed
   */
  onScopeDisposing?(scope: ScopeEventInfo): void;

  /**
   * Called when a scope finishes disposing.
   *
   * @param scope - Information about the disposed scope
   */
  onScopeDisposed?(scope: ScopeEventInfo): void;

  /**
   * Called when a child container is created.
   *
   * @param info - Information about the created child container
   */
  onChildCreated?(info: ChildContainerInfo): void;

  /**
   * Called when a container is disposed.
   *
   * @param info - Information about the disposed container
   */
  onContainerDisposed?(info: ContainerInfo): void;
}

// =============================================================================
// Plugin Interface
// =============================================================================

/**
 * A plugin that extends container functionality.
 *
 * Plugins expose APIs via unique symbols, enabling type-safe access:
 * `container[PLUGIN_SYMBOL]`. They can depend on other plugins (required or
 * optional) and provide lifecycle hooks for instrumentation.
 *
 * @typeParam TSymbol - The unique symbol for accessing this plugin's API
 * @typeParam TApi - The API interface this plugin exposes
 * @typeParam TRequired - Tuple of required plugin dependencies
 * @typeParam TOptional - Tuple of optional plugin dependencies
 *
 * @example Basic plugin
 * ```typescript
 * const LOGGING = Symbol.for("hex-di/logging");
 *
 * const LoggingPlugin = definePlugin({
 *   name: "logging",
 *   symbol: LOGGING,
 *
 *   createApi(context) {
 *     return {
 *       log: (msg: string) => console.log(msg),
 *     };
 *   },
 *
 *   hooks: {
 *     afterResolve(ctx) {
 *       console.log(`Resolved ${ctx.portName} in ${ctx.duration}ms`);
 *     },
 *   },
 * });
 * ```
 *
 * @example Plugin with dependencies
 * ```typescript
 * const DevToolsPlugin = definePlugin({
 *   name: "devtools",
 *   symbol: DEVTOOLS,
 *
 *   requires: [
 *     requires<typeof TRACING, TracingAPI>({
 *       symbol: TRACING,
 *       name: "Tracing",
 *       reason: "DevTools requires tracing for graph visualization",
 *     }),
 *   ] as const,
 *
 *   createApi(context) {
 *     const tracing = context.getDependency(TRACING);
 *     return { visualize: () => renderGraph(tracing.getTraces()) };
 *   },
 * });
 * ```
 */
export interface Plugin<
  TSymbol extends symbol,
  TApi,
  TRequired extends readonly PluginDependency<symbol, unknown, false>[] = readonly [],
  TOptional extends readonly PluginDependency<symbol, unknown, true>[] = readonly [],
> {
  /** Unique name for debugging and error messages */
  readonly name: string;

  /** Symbol used to access this plugin's API on the container */
  readonly symbol: TSymbol;

  /** Required dependencies - plugin fails without these */
  readonly requires: TRequired;

  /** Optional dependencies - enhanced functionality when present */
  readonly enhancedBy: TOptional;

  /**
   * Factory that creates the plugin's API.
   *
   * Called once during container creation, after dependencies are initialized.
   * The returned API is frozen and attached to the container via the symbol.
   *
   * @param context - Provides access to dependencies and lifecycle events
   * @returns The plugin's public API
   */
  readonly createApi: (context: PluginContext<TRequired, TOptional>) => TApi;

  /** Optional lifecycle hooks for resolution instrumentation */
  readonly hooks?: PluginHooks;

  /**
   * Optional disposal handler.
   *
   * Called during container disposal, after all services are disposed.
   * Plugins are disposed in reverse initialization order (LIFO).
   */
  readonly dispose?: () => void | Promise<void>;

  /**
   * Create a child-specific API instance.
   *
   * Called when a child container inherits this plugin. Returns an API
   * instance bound to the child container instead of the parent.
   *
   * If not provided, child containers share the parent's API (default behavior).
   * Use this when your plugin needs per-container state (e.g., InspectorPlugin).
   *
   * Note: Uses method syntax for bivariant parameter handling, allowing
   * specific Plugin types to be assignable to AnyPlugin.
   *
   * @param childContainer - The child container being created
   * @param parentApi - The parent's API instance (for delegation if needed)
   * @param parentContainer - The parent container
   * @returns A new API instance for the child
   */
  createApiForChild?(
    childContainer: InternalAccessible,
    parentApi: TApi,
    parentContainer: InternalAccessible
  ): TApi;
}

// =============================================================================
// Type Inference Utilities
// =============================================================================

/**
 * Extracts the symbol type from a Plugin.
 */
export type InferPluginSymbol<P> =
  P extends Plugin<infer S, unknown, readonly [], readonly []> ? S : never;

/**
 * Extracts the API type from a Plugin.
 */
export type InferPluginApi<P> =
  P extends Plugin<symbol, infer A, readonly [], readonly []> ? A : never;

/**
 * Extracts the required dependencies from a Plugin.
 */
export type InferPluginRequires<P> =
  P extends Plugin<symbol, unknown, infer R, readonly PluginDependency<symbol, unknown, true>[]>
    ? R
    : never;

/**
 * Extracts the optional dependencies from a Plugin.
 */
export type InferPluginEnhancedBy<P> =
  P extends Plugin<symbol, unknown, readonly PluginDependency<symbol, unknown, false>[], infer O>
    ? O
    : never;

/**
 * Generic Plugin type for collections.
 * Represents any plugin regardless of specific type parameters.
 */
export type AnyPlugin = Plugin<
  symbol,
  unknown,
  readonly PluginDependency<symbol, unknown, false>[],
  readonly PluginDependency<symbol, unknown, true>[]
>;

// =============================================================================
// Plugin API Map (moved here to avoid import cycles with types.ts)
// =============================================================================

/**
 * Empty object type used as the base case for PluginApiMap recursion.
 *
 * IMPORTANT: Using `object` (not `Record<symbol, never>`) because:
 * - `Record<symbol, never>` creates an index signature requiring all symbol
 *   properties to be `never`, which conflicts with container symbol properties
 *   like `[INTERNAL_ACCESS]` and `[ADAPTER_ACCESS]`
 * - `object` is a proper "empty constraint" that intersects cleanly
 *
 * @internal
 */
type EmptyPluginApiMap = object;

/**
 * Maps a tuple of plugins to an intersection of symbol -> API properties.
 *
 * Used to augment Container type with plugin APIs accessible via their symbols.
 *
 * @typeParam TPlugins - Readonly tuple of Plugin types
 * @returns Intersection type with `{ readonly [symbol]: API }` for each plugin
 *
 * @example
 * ```typescript
 * type Plugins = readonly [typeof TracingPlugin, typeof MetricsPlugin];
 * type ApiMap = PluginApiMap<Plugins>;
 * // { readonly [TRACING]: TracingAPI } & { readonly [METRICS]: MetricsAPI }
 * ```
 */
export type PluginApiMap<TPlugins extends readonly AnyPlugin[]> = TPlugins extends readonly [
  infer First,
  ...infer Rest,
]
  ? First extends Plugin<
      infer S,
      infer A,
      readonly PluginDependency<symbol, unknown, false>[],
      readonly PluginDependency<symbol, unknown, true>[]
    >
    ? { readonly [K in S]: A } & (Rest extends readonly AnyPlugin[]
        ? PluginApiMap<Rest>
        : EmptyPluginApiMap)
    : EmptyPluginApiMap
  : EmptyPluginApiMap;
