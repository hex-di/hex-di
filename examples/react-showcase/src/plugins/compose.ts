/**
 * Feature and plugin composition utilities.
 *
 * @packageDocumentation
 */

import { GraphBuilder } from "@hex-di/graph";
import type { FeatureBundle, Plugin } from "./types.js";

// =============================================================================
// Composition Helpers
// =============================================================================

/**
 * Registers a feature bundle's adapters with a GraphBuilder.
 *
 * This function adds all sync and async adapters from the feature
 * to the graph builder, maintaining proper registration order.
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
export function withFeature<
  TBuilder extends GraphBuilder<any, any, any>,
>(
  builder: TBuilder,
  feature: FeatureBundle
): GraphBuilder<any, any, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any = builder;

  // Register sync adapters
  for (const adapter of feature.adapters) {
    result = result.provide(adapter);
  }

  // Register async adapters
  for (const asyncAdapter of feature.asyncAdapters) {
    result = result.provideAsync(asyncAdapter);
  }

  return result as GraphBuilder<any, any, any>;
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
export function installPlugin<
  TBuilder extends GraphBuilder<any, any, any>,
>(
  builder: TBuilder,
  plugin: Plugin
): GraphBuilder<any, any, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any = builder;

  for (const adapter of plugin.adapters) {
    if (adapter.factoryKind === "async") {
      result = result.provideAsync(adapter);
    } else {
      result = result.provide(adapter);
    }
  }

  return result as GraphBuilder<any, any, any>;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let builder: any = GraphBuilder.create();

  for (const feature of features) {
    builder = withFeature(builder, feature);
  }

  return builder.build();
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let builder: any = GraphBuilder.create();

  // Add all features
  for (const feature of features) {
    builder = withFeature(builder, feature);
  }

  // Install all plugins
  for (const plugin of plugins) {
    builder = installPlugin(builder, plugin);
  }

  return builder.build();
}
