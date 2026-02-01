/**
 * Feature and plugin composition utilities.
 *
 * @packageDocumentation
 */

import type { Port, Adapter, Lifetime, FactoryKind } from "@hex-di/core";
import { GraphBuilder } from "@hex-di/graph";
import type { FeatureBundle, Plugin } from "./types.js";

// =============================================================================
// Type Aliases
// =============================================================================

/**
 * Generic adapter type used for runtime composition.
 */
type RuntimeAdapter = Adapter<
  Port<unknown, string>,
  Port<unknown, string> | never,
  Lifetime,
  FactoryKind
>;

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Type guard to check if a result is a GraphBuilder.
 *
 * The DuplicateProviderError type is compile-time only - at runtime,
 * provideMany always returns a GraphBuilder. This guard satisfies
 * TypeScript while performing runtime composition.
 */
function isGraphBuilder<P, R, A>(value: unknown): value is GraphBuilder<P, R, A> {
  return value !== null && typeof value === "object" && "adapters" in value && "provide" in value;
}

/**
 * Ensures the result is a GraphBuilder, throwing if not.
 *
 * For runtime composition, this validates the builder chain.
 */
function assertGraphBuilder<P, R, A>(value: unknown, operation: string): GraphBuilder<P, R, A> {
  if (!isGraphBuilder<P, R, A>(value)) {
    throw new Error(`${operation} did not return a valid GraphBuilder`);
  }
  return value;
}

/**
 * Collects all adapters from features and plugins into categorized arrays.
 */
function collectAdapters(
  features: readonly FeatureBundle[],
  plugins: readonly Plugin[] = []
): { sync: RuntimeAdapter[]; async: RuntimeAdapter[] } {
  const sync: RuntimeAdapter[] = [];
  const async: RuntimeAdapter[] = [];

  // Collect from features
  for (const feature of features) {
    sync.push(...feature.adapters);
    async.push(...feature.asyncAdapters);
  }

  // Collect from plugins
  for (const plugin of plugins) {
    for (const adapter of plugin.adapters) {
      if (adapter.factoryKind === "async") {
        async.push(adapter);
      } else {
        sync.push(adapter);
      }
    }
  }

  return { sync, async };
}

// =============================================================================
// Composition Helpers
// =============================================================================

/**
 * Registers a feature bundle's adapters with a GraphBuilder.
 *
 * This function adds all sync and async adapters from the feature
 * to the graph builder using batch registration for type safety.
 *
 * @param builder - The GraphBuilder to extend
 * @param feature - The feature bundle to register
 * @returns A new GraphBuilder with the feature's adapters registered
 *
 * @example
 * ```typescript
 * const graph = withFeature(
 *   withFeature(GraphBuilder.create(), coreFeature),
 *   chatFeature
 * ).build();
 * ```
 */
export function withFeature(builder: GraphBuilder, feature: FeatureBundle): GraphBuilder {
  // Use provideMany for batch registration with runtime validation
  const withSync = assertGraphBuilder(
    builder.provideMany(feature.adapters),
    `withFeature(${feature.name}).sync`
  );
  return assertGraphBuilder(
    withSync.provideMany(feature.asyncAdapters),
    `withFeature(${feature.name}).async`
  );
}

/**
 * Installs a plugin's adapters into a GraphBuilder.
 *
 * Similar to withFeature, but for external plugin packages.
 * Plugins can contain both sync and async adapters.
 *
 * @param builder - The GraphBuilder to extend
 * @param plugin - The plugin to install
 * @returns A new GraphBuilder with the plugin's adapters registered
 *
 * @example
 * ```typescript
 * const graph = installPlugin(
 *   withFeature(GraphBuilder.create(), coreFeature),
 *   AnalyticsPlugin
 * ).build();
 * ```
 */
export function installPlugin(builder: GraphBuilder, plugin: Plugin): GraphBuilder {
  const sync: RuntimeAdapter[] = [];
  const async: RuntimeAdapter[] = [];

  for (const adapter of plugin.adapters) {
    if (adapter.factoryKind === "async") {
      async.push(adapter);
    } else {
      sync.push(adapter);
    }
  }

  const withSync = assertGraphBuilder(
    builder.provideMany(sync),
    `installPlugin(${plugin.id}).sync`
  );
  return assertGraphBuilder(withSync.provideMany(async), `installPlugin(${plugin.id}).async`);
}

/**
 * Composes multiple features into a graph.
 *
 * Convenience function for composing many features at once.
 *
 * @param features - Array of feature bundles to compose
 * @returns A built Graph ready for container creation
 *
 * @example
 * ```typescript
 * const graph = composeFeatures([
 *   coreFeature,
 *   userSessionFeature,
 *   chatFeature,
 *   notificationFeature,
 * ]);
 * ```
 */
export function composeFeatures(features: readonly FeatureBundle[]) {
  const { sync, async } = collectAdapters(features);
  const withSync = assertGraphBuilder(
    GraphBuilder.create().provideMany(sync),
    "composeFeatures.sync"
  );
  const withAsync = assertGraphBuilder(withSync.provideMany(async), "composeFeatures.async");
  return withAsync.build();
}

/**
 * Composes features and plugins into a graph.
 *
 * @param features - Array of feature bundles
 * @param plugins - Array of plugins to install
 * @returns A built Graph ready for container creation
 *
 * @example
 * ```typescript
 * const graph = composeFeaturesWithPlugins(
 *   [coreFeature, chatFeature],
 *   [AnalyticsPlugin, LoggingPlugin]
 * );
 * ```
 */
export function composeFeaturesWithPlugins(
  features: readonly FeatureBundle[],
  plugins: readonly Plugin[] = []
) {
  const { sync, async } = collectAdapters(features, plugins);
  const withSync = assertGraphBuilder(
    GraphBuilder.create().provideMany(sync),
    "composeFeaturesWithPlugins.sync"
  );
  const withAsync = assertGraphBuilder(
    withSync.provideMany(async),
    "composeFeaturesWithPlugins.async"
  );
  return withAsync.build();
}
