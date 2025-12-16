/**
 * Plugin and FeatureBundle type definitions for modular architecture.
 *
 * @packageDocumentation
 */

import type { Port } from "@hex-di/ports";
import type { Adapter, Lifetime, FactoryKind } from "@hex-di/graph";

// =============================================================================
// FeatureBundle Types
// =============================================================================

/**
 * A feature bundle encapsulates ports, adapters, and metadata for a pluggable feature.
 *
 * Features are self-contained units that can be added or removed from the application
 * by including or excluding them from graph composition.
 *
 * @typeParam TProvides - Union of port types this feature provides
 * @typeParam TRequires - Union of port types this feature requires from other features
 *
 * @example
 * ```typescript
 * const chatFeature: FeatureBundle = {
 *   name: "chat",
 *   description: "Real-time chat messaging",
 *   adapters: [ChatServiceAdapter],
 *   asyncAdapters: [MessageStoreAdapter],
 *   requires: [LoggerPort, UserSessionPort],
 * };
 * ```
 */
export interface FeatureBundle<
  TProvides extends Port<unknown, string> = Port<unknown, string>,
  TRequires extends Port<unknown, string> = Port<unknown, string>,
> {
  /** Unique identifier for the feature */
  readonly name: string;

  /** Human-readable description */
  readonly description?: string;

  /** Sync adapters to register with the graph */
  readonly adapters: readonly Adapter<
    Port<unknown, string>,
    Port<unknown, string> | never,
    Lifetime,
    "sync"
  >[];

  /** Async adapters that need provideAsync() */
  readonly asyncAdapters: readonly Adapter<
    Port<unknown, string>,
    Port<unknown, string> | never,
    Lifetime,
    "async"
  >[];

  /**
   * Ports this feature requires from other features.
   * Used for documentation and validation.
   */
  readonly requires?: readonly TRequires[];

  /** Phantom type for compile-time tracking */
  readonly __provides?: TProvides;
}

// =============================================================================
// Plugin Types
// =============================================================================

/**
 * A plugin definition that contributes ports and adapters to an application graph.
 *
 * Plugins are similar to features but designed for external packages that
 * want to extend the application's dependency graph.
 *
 * @typeParam TProvides - Union of ports this plugin provides
 * @typeParam TRequires - Union of ports this plugin requires from the host
 *
 * @example
 * ```typescript
 * const AnalyticsPlugin = createPlugin({
 *   id: "@myapp/analytics",
 *   displayName: "Analytics Plugin",
 *   adapters: [AnalyticsAdapter] as const,
 * });
 * ```
 */
export interface Plugin<
  TProvides extends Port<unknown, string> = Port<unknown, string>,
  TRequires extends Port<unknown, string> | never = never,
> {
  /** Unique identifier for this plugin (convention: "@scope/plugin-name") */
  readonly id: string;

  /** Human-readable name for DevTools display */
  readonly displayName?: string;

  /** Semantic version for compatibility checking */
  readonly version?: string;

  /** The adapters this plugin contributes */
  readonly adapters: readonly Adapter<
    Port<unknown, string>,
    Port<unknown, string> | never,
    Lifetime,
    FactoryKind
  >[];

  /** Phantom type for compile-time tracking of provided ports */
  readonly __provides?: TProvides;

  /** Phantom type for compile-time tracking of required ports */
  readonly __requires?: TRequires;
}

// =============================================================================
// Plugin Factory
// =============================================================================

/**
 * Creates a type-safe plugin definition.
 *
 * @param config - Plugin configuration
 * @returns A frozen Plugin object
 *
 * @example
 * ```typescript
 * export const AnalyticsPlugin = createPlugin({
 *   id: "analytics",
 *   displayName: "Analytics",
 *   adapters: [AnalyticsAdapter] as const,
 * });
 * ```
 */
export function createPlugin<
  const TAdapters extends readonly Adapter<
    Port<unknown, string>,
    Port<unknown, string> | never,
    Lifetime,
    FactoryKind
  >[],
>(config: {
  readonly id: string;
  readonly displayName?: string;
  readonly version?: string;
  readonly adapters: TAdapters;
}): Plugin {
  const result: Plugin = {
    id: config.id,
    adapters: Object.freeze([...config.adapters]),
  };

  // Only add optional properties if they are defined
  if (config.displayName !== undefined) {
    (result as { displayName?: string }).displayName = config.displayName;
  }
  if (config.version !== undefined) {
    (result as { version?: string }).version = config.version;
  }

  return Object.freeze(result);
}

/**
 * Creates a feature bundle definition.
 *
 * @param config - Feature configuration
 * @returns A frozen FeatureBundle object
 *
 * @example
 * ```typescript
 * export const chatFeature = createFeature({
 *   name: "chat",
 *   description: "Chat messaging feature",
 *   adapters: [ChatServiceAdapter],
 *   asyncAdapters: [MessageStoreAdapter],
 * });
 * ```
 */
export function createFeature<
  TProvides extends Port<unknown, string> = Port<unknown, string>,
  TRequires extends Port<unknown, string> = Port<unknown, string>,
>(config: {
  readonly name: string;
  readonly description?: string;
  readonly adapters?: readonly Adapter<
    Port<unknown, string>,
    Port<unknown, string> | never,
    Lifetime,
    "sync"
  >[];
  readonly asyncAdapters?: readonly Adapter<
    Port<unknown, string>,
    Port<unknown, string> | never,
    Lifetime,
    "async"
  >[];
  readonly requires?: readonly TRequires[];
}): FeatureBundle<TProvides, TRequires> {
  const result: FeatureBundle<TProvides, TRequires> = {
    name: config.name,
    adapters: Object.freeze([...(config.adapters ?? [])]),
    asyncAdapters: Object.freeze([...(config.asyncAdapters ?? [])]),
  };

  // Only add optional properties if they are defined
  if (config.description !== undefined) {
    (result as { description?: string }).description = config.description;
  }
  if (config.requires !== undefined) {
    (result as { requires?: readonly TRequires[] }).requires = config.requires;
  }

  return Object.freeze(result);
}
