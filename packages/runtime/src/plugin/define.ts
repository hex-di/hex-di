/**
 * Plugin definition factories for @hex-di/runtime.
 *
 * Provides factory functions for creating type-safe plugins:
 * - `definePlugin()`: Creates a plugin with full type inference
 * - `requires()`: Declares a required plugin dependency
 * - `optionallyRequires()`: Declares an optional plugin dependency
 *
 * @packageDocumentation
 */

import type { Plugin, PluginDependency, PluginContext, PluginHooks } from "./types.js";

// =============================================================================
// Dependency Declaration Factories
// =============================================================================

/**
 * Creates a required plugin dependency descriptor.
 *
 * Use this to declare that your plugin requires another plugin to function.
 * The dependency is validated at both compile-time and runtime.
 *
 * @typeParam TSymbol - The symbol type of the dependency (inferred from config.symbol)
 * @typeParam TApi - The API type provided by the dependency
 * @param config - Configuration for the dependency
 * @returns A PluginDependency descriptor for use in `requires` array
 *
 * @example
 * ```typescript
 * const TracingDependency = requires<typeof TRACING, TracingAPI>({
 *   symbol: TRACING,
 *   name: "Tracing",
 *   reason: "MetricsPlugin aggregates data from tracing spans",
 * });
 *
 * const MetricsPlugin = definePlugin({
 *   name: "metrics",
 *   symbol: METRICS,
 *   requires: [TracingDependency] as const,
 *   // ...
 * });
 * ```
 */
export function requires<TSymbol extends symbol, TApi>(config: {
  /** The symbol used to access the dependency's API */
  readonly symbol: TSymbol;
  /** Human-readable name for error messages */
  readonly name: string;
  /** Documents why this dependency is needed */
  readonly reason: string;
}): PluginDependency<TSymbol, TApi, false> {
  return Object.freeze({
    symbol: config.symbol,
    name: config.name,
    reason: config.reason,
    optional: false as const,
  });
}

/**
 * Creates an optional plugin dependency descriptor.
 *
 * Use this to declare that your plugin can be enhanced by another plugin
 * but will function without it.
 *
 * @typeParam TSymbol - The symbol type of the dependency (inferred from config.symbol)
 * @typeParam TApi - The API type provided by the dependency
 * @param config - Configuration for the dependency
 * @returns A PluginDependency descriptor for use in `enhancedBy` array
 *
 * @example
 * ```typescript
 * const MetricsDependency = optionallyRequires<typeof METRICS, MetricsAPI>({
 *   symbol: METRICS,
 *   name: "Metrics",
 *   reason: "Enables performance metrics panel when available",
 * });
 *
 * const DevToolsPlugin = definePlugin({
 *   name: "devtools",
 *   symbol: DEVTOOLS,
 *   enhancedBy: [MetricsDependency] as const,
 *
 *   createApi(context) {
 *     // metrics is MetricsAPI | undefined
 *     const metrics = context.getOptionalDependency(METRICS);
 *     if (metrics) {
 *       // Use enhanced metrics functionality
 *     }
 *   },
 * });
 * ```
 */
export function optionallyRequires<TSymbol extends symbol, TApi>(config: {
  /** The symbol used to access the dependency's API */
  readonly symbol: TSymbol;
  /** Human-readable name for error messages */
  readonly name: string;
  /** Documents why this dependency enhances functionality */
  readonly reason: string;
}): PluginDependency<TSymbol, TApi, true> {
  return Object.freeze({
    symbol: config.symbol,
    name: config.name,
    reason: config.reason,
    optional: true as const,
  });
}

// =============================================================================
// Plugin Definition Factory
// =============================================================================

/**
 * Configuration for defining a plugin.
 *
 * @typeParam TSymbol - The unique symbol for API access
 * @typeParam TApi - The API interface exposed by the plugin
 * @typeParam TRequired - Tuple of required dependencies
 * @typeParam TOptional - Tuple of optional dependencies
 */
export interface DefinePluginConfig<
  TSymbol extends symbol,
  TApi,
  TRequired extends readonly PluginDependency<symbol, unknown, false>[],
  TOptional extends readonly PluginDependency<symbol, unknown, true>[],
> {
  /** Unique name for debugging and error messages */
  readonly name: string;

  /** Symbol used to access this plugin's API on the container */
  readonly symbol: TSymbol;

  /** Required dependencies - plugin fails without these */
  readonly requires?: TRequired;

  /** Optional dependencies - enhanced functionality when present */
  readonly enhancedBy?: TOptional;

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
}

/**
 * Creates a type-safe plugin with full inference.
 *
 * Uses `const` type parameters for literal type preservation on symbols
 * and dependency arrays. The returned plugin is frozen and immutable.
 *
 * @typeParam TSymbol - The unique symbol for API access (inferred)
 * @typeParam TApi - The API interface exposed by the plugin (inferred from createApi return)
 * @typeParam TRequired - Tuple of required dependencies (inferred from requires)
 * @typeParam TOptional - Tuple of optional dependencies (inferred from enhancedBy)
 *
 * @param config - Plugin configuration
 * @returns A frozen Plugin instance
 *
 * @example Basic plugin
 * ```typescript
 * const LOGGING = Symbol.for("hex-di/logging");
 *
 * interface LoggingAPI {
 *   log(message: string): void;
 *   setLevel(level: "debug" | "info" | "warn" | "error"): void;
 * }
 *
 * const LoggingPlugin = definePlugin({
 *   name: "logging",
 *   symbol: LOGGING,
 *
 *   createApi() {
 *     let level: "debug" | "info" | "warn" | "error" = "info";
 *     return {
 *       log: (msg: string) => console.log(`[${level}] ${msg}`),
 *       setLevel: (l) => { level = l; },
 *     };
 *   },
 *
 *   hooks: {
 *     afterResolve(ctx) {
 *       console.log(`Resolved ${ctx.portName}`);
 *     },
 *   },
 * });
 *
 * // Usage
 * const container = createContainer(graph, {
 *   plugins: [LoggingPlugin],
 * });
 *
 * const logging = container[LOGGING];
 * //    ^? LoggingAPI
 * logging.log("Hello!");
 * ```
 *
 * @example Plugin with dependencies
 * ```typescript
 * const TRACING = Symbol.for("hex-di/tracing");
 * const DEVTOOLS = Symbol.for("hex-di/devtools");
 *
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
 *     return {
 *       visualize() {
 *         return renderGraph(tracing.getTraces());
 *       },
 *     };
 *   },
 * });
 * ```
 */
export function definePlugin<
  const TSymbol extends symbol,
  TApi,
  const TRequired extends readonly PluginDependency<symbol, unknown, false>[] = readonly [],
  const TOptional extends readonly PluginDependency<symbol, unknown, true>[] = readonly [],
>(
  config: DefinePluginConfig<TSymbol, TApi, TRequired, TOptional>
): Plugin<TSymbol, TApi, TRequired, TOptional> {
  const plugin: Plugin<TSymbol, TApi, TRequired, TOptional> = {
    name: config.name,
    symbol: config.symbol,
    requires: (config.requires ?? ([] as unknown as TRequired)) as TRequired,
    enhancedBy: (config.enhancedBy ?? ([] as unknown as TOptional)) as TOptional,
    createApi: config.createApi,
    hooks: config.hooks,
    dispose: config.dispose,
  };

  return Object.freeze(plugin);
}
