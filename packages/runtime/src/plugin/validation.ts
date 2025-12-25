/**
 * Type-level plugin validation for @hex-di/runtime.
 *
 * Provides compile-time validation for:
 * - Plugin dependency order (dependencies must come before dependents)
 * - Missing required dependencies
 * - Container type augmentation with plugin APIs
 *
 * @packageDocumentation
 */

import type { Port } from "@hex-di/ports";
import type { Plugin, PluginDependency, AnyPlugin } from "./types.js";
import type { Container, ContainerPhase } from "../types.js";

// =============================================================================
// Plugin API Map
// =============================================================================

/**
 * Empty record type used as the base case for PluginApiMap recursion.
 * This is semantically correct for "no plugin APIs" and avoids
 * the `@typescript-eslint/no-empty-object-type` ESLint rule.
 *
 * @internal
 */
type EmptyPluginApiMap = Record<symbol, never>;

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

// =============================================================================
// Plugin Augmented Container
// =============================================================================

/**
 * Container type augmented with plugin APIs.
 *
 * Creates an intersection of the base Container type and plugin API map,
 * enabling type-safe access via `container[PLUGIN_SYMBOL]`.
 *
 * @typeParam TProvides - Port union provided by the container
 * @typeParam TExtends - Port union extended by child containers
 * @typeParam TAsyncPorts - Port union with async factories
 * @typeParam TPhase - Container initialization phase
 * @typeParam TPlugins - Readonly tuple of registered plugins
 *
 * @example
 * ```typescript
 * const container = createContainer(graph, {
 *   plugins: [TracingPlugin, MetricsPlugin],
 * });
 *
 * // Type: PluginAugmentedContainer<..., [typeof TracingPlugin, typeof MetricsPlugin]>
 * const tracing = container[TRACING];
 * //    ^? TracingAPI
 * const metrics = container[METRICS];
 * //    ^? MetricsAPI
 * ```
 */
export type PluginAugmentedContainer<
  TProvides extends Port<unknown, string>,
  TExtends extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPhase extends ContainerPhase,
  TPlugins extends readonly AnyPlugin[],
> = Container<TProvides, TExtends, TAsyncPorts, TPhase> & PluginApiMap<TPlugins>;

// =============================================================================
// Plugin Dependency Validation Errors
// =============================================================================

/**
 * Error type surfaced when a required plugin dependency is missing.
 *
 * This type is returned by `ValidatePluginOrder` when validation fails,
 * providing actionable error information in IDE tooltips.
 */
export type MissingPluginDependencyError<TPlugin extends string, TMissingDep extends string> = {
  readonly __errorBrand: "MissingPluginDependencyError";
  readonly __message: `Plugin "${TPlugin}" requires "${TMissingDep}" but it is not registered or comes after it`;
  readonly __plugin: TPlugin;
  readonly __missingDependency: TMissingDep;
  readonly __hint: "Register the required plugin before this plugin in the plugins array";
};

/**
 * Error type surfaced when a circular dependency is detected.
 *
 * Circular dependencies are detected during topological sort at runtime,
 * but this type provides compile-time feedback when possible.
 */
export type CircularPluginDependencyError<TCycle extends string> = {
  readonly __errorBrand: "CircularPluginDependencyError";
  readonly __message: `Circular plugin dependency detected: ${TCycle}`;
  readonly __cycle: TCycle;
  readonly __hint: "Remove the circular dependency between plugins";
};

// =============================================================================
// Plugin Dependency Extraction
// =============================================================================

/**
 * Extracts all required dependency symbols from a Plugin's `requires` array.
 *
 * When extracting from an empty tuple `readonly []`, TypeScript infers the
 * element type as the constraint (`symbol`) rather than `never`. We must
 * explicitly check for empty tuples first to return `never` correctly.
 *
 * @internal
 */
type ExtractRequiredSymbols<P> =
  P extends Plugin<
    symbol,
    unknown,
    infer TRequired,
    readonly PluginDependency<symbol, unknown, true>[]
  >
    ? TRequired extends readonly []
      ? never // Empty requires array = no dependencies
      : TRequired extends readonly PluginDependency<infer S, unknown, false>[]
        ? S
        : never
    : never;

/**
 * Extracts the name from a Plugin.
 * @internal
 */
type ExtractPluginName<P> =
  P extends Plugin<
    symbol,
    unknown,
    readonly PluginDependency<symbol, unknown, false>[],
    readonly PluginDependency<symbol, unknown, true>[]
  >
    ? P["name"]
    : never;

/**
 * Extracts the symbol from a Plugin.
 * @internal
 */
type ExtractPluginSymbol<P> =
  P extends Plugin<
    infer S,
    unknown,
    readonly PluginDependency<symbol, unknown, false>[],
    readonly PluginDependency<symbol, unknown, true>[]
  >
    ? S
    : never;

/**
 * Collects all provided symbols from a plugins tuple.
 * Reserved for future validation enhancements.
 * @internal
 */
type _CollectProvidedSymbols<TPlugins extends readonly AnyPlugin[]> = TPlugins extends readonly [
  infer First,
  ...infer Rest,
]
  ?
      | ExtractPluginSymbol<First>
      | (Rest extends readonly AnyPlugin[] ? _CollectProvidedSymbols<Rest> : never)
  : never;

// =============================================================================
// Plugin Order Validation
// =============================================================================

/**
 * Validates that a single plugin's required dependencies are satisfied.
 *
 * Checks that all symbols in the plugin's `requires` array are present
 * in the accumulated symbols from previously registered plugins.
 *
 * Uses `Exclude<TRequired, TAccumulated>` to find missing symbols rather than
 * `TRequired extends TAccumulated`, because the latter distributes over unions
 * and returns `true` if ANY symbol is satisfied (not ALL).
 *
 * @typeParam TPlugin - The plugin to validate
 * @typeParam TAccumulated - Symbols from plugins registered before this one
 * @returns `true` if valid, `MissingPluginDependencyError` if not
 * @internal
 */
type ValidateSinglePlugin<TPlugin extends AnyPlugin, TAccumulated extends symbol> =
  ExtractRequiredSymbols<TPlugin> extends infer TRequired
    ? // Use [T] extends [never] to prevent distribution over never
      [TRequired] extends [never]
      ? true // No required dependencies
      : // Check if all required symbols are in accumulated by looking for missing ones
        [Exclude<TRequired, TAccumulated>] extends [never]
        ? true // All requirements are in accumulated (no missing symbols)
        : MissingPluginDependencyError<ExtractPluginName<TPlugin>, "a required plugin">
    : true;

/**
 * Validates plugin registration order.
 *
 * Recursively validates each plugin in the array, ensuring that all
 * required dependencies are registered before the dependent plugin.
 *
 * @typeParam TPlugins - Readonly tuple of plugins to validate
 * @typeParam TAccumulated - Symbols accumulated from previous plugins (starts as never)
 * @returns `true` if all plugins are valid, error type if not
 *
 * @example Valid order
 * ```typescript
 * // TracingPlugin has no dependencies
 * // MetricsPlugin requires TRACING
 * type Valid = ValidatePluginOrder<[typeof TracingPlugin, typeof MetricsPlugin]>;
 * // true
 * ```
 *
 * @example Invalid order
 * ```typescript
 * // Wrong order: MetricsPlugin requires TRACING but it comes first
 * type Invalid = ValidatePluginOrder<[typeof MetricsPlugin, typeof TracingPlugin]>;
 * // MissingPluginDependencyError<"metrics", "a required plugin">
 * ```
 *
 * @example Missing dependency
 * ```typescript
 * // MetricsPlugin requires TRACING but it's not in the array
 * type Missing = ValidatePluginOrder<[typeof MetricsPlugin]>;
 * // MissingPluginDependencyError<"metrics", "a required plugin">
 * ```
 */
export type ValidatePluginOrder<
  TPlugins extends readonly AnyPlugin[],
  TAccumulated extends symbol = never,
> = TPlugins extends readonly [infer First extends AnyPlugin, ...infer Rest]
  ? ValidateSinglePlugin<First, TAccumulated> extends true
    ? Rest extends readonly AnyPlugin[]
      ? ValidatePluginOrder<Rest, TAccumulated | ExtractPluginSymbol<First>>
      : true
    : ValidateSinglePlugin<First, TAccumulated> // Return the error
  : true;

// =============================================================================
// Container Options with Plugins
// =============================================================================

/**
 * Container creation options extended with plugin support.
 *
 * @typeParam TPlugins - Readonly tuple of plugins to register
 */
export interface ContainerOptionsWithPlugins<TPlugins extends readonly AnyPlugin[] = readonly []> {
  /**
   * Plugins to initialize with the container.
   *
   * Order matters: plugins can only depend on plugins that come before them
   * in the array. Dependencies are validated at compile-time via `ValidatePluginOrder`.
   *
   * @remarks
   * - Plugins are initialized in array order (topological sort at runtime for flexibility)
   * - Plugins are disposed in reverse order (LIFO)
   * - Each plugin's API is accessible via its symbol on the container
   * - Plugin hooks are composed across all plugins
   */
  readonly plugins?: TPlugins;
}

// =============================================================================
// Container Factory Return Type
// =============================================================================

/**
 * Computes the return type of createContainer with plugins.
 *
 * Returns `PluginAugmentedContainer` if validation passes,
 * otherwise returns the validation error type for compile-time feedback.
 *
 * @typeParam TProvides - Port union provided by the container
 * @typeParam TAsyncPorts - Port union with async factories
 * @typeParam TPlugins - Readonly tuple of plugins to register
 */
export type CreateContainerWithPluginsResult<
  TProvides extends Port<unknown, string>,
  TAsyncPorts extends Port<unknown, string>,
  TPlugins extends readonly AnyPlugin[],
> =
  ValidatePluginOrder<TPlugins> extends true
    ? PluginAugmentedContainer<TProvides, never, TAsyncPorts, "uninitialized", TPlugins>
    : ValidatePluginOrder<TPlugins>;

// =============================================================================
// Runtime Validation Helpers
// =============================================================================

/**
 * Extracts required dependency symbols from a plugin at runtime.
 *
 * @param plugin - The plugin to extract requirements from
 * @returns Array of required dependency symbols
 */
export function extractRequiredSymbols(plugin: AnyPlugin): symbol[] {
  return plugin.requires.map(dep => dep.symbol);
}

/**
 * Extracts optional dependency symbols from a plugin at runtime.
 *
 * @param plugin - The plugin to extract optional dependencies from
 * @returns Array of optional dependency symbols
 */
export function extractOptionalSymbols(plugin: AnyPlugin): symbol[] {
  return plugin.enhancedBy.map(dep => dep.symbol);
}

/**
 * Gets the name of a required dependency by its symbol.
 *
 * @param plugin - The plugin containing the dependency
 * @param symbol - The symbol to look up
 * @returns The dependency name, or undefined if not found
 */
export function getDependencyName(plugin: AnyPlugin, symbol: symbol): string | undefined {
  const req = plugin.requires.find(d => d.symbol === symbol);
  if (req) return req.name;
  const opt = plugin.enhancedBy.find(d => d.symbol === symbol);
  if (opt) return opt.name;
  return undefined;
}
