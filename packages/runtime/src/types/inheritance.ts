/**
 * Inheritance mode types for child container singleton behavior.
 *
 * These types define how child containers inherit singleton instances
 * from their parent containers.
 *
 * @packageDocumentation
 */

import type { Port } from "@hex-di/core";

// =============================================================================
// Inheritance Mode Types
// =============================================================================

/**
 * Defines how a child container inherits singleton instances from its parent.
 *
 * Three modes are available:
 * - `'shared'`: Child sees parent's singleton instance (live reference, mutations visible)
 * - `'forked'`: Child gets a snapshot copy at child creation time (immutable from parent's perspective)
 * - `'isolated'`: Child creates its own fresh singleton instance (ignores parent entirely)
 *
 * @remarks
 * - Default mode is `'shared'` for backwards compatibility and performance
 * - `'forked'` mode snapshots the parent's instance at child creation time
 * - `'isolated'` mode is required for async adapter overrides
 * - Mode configuration only applies to non-overridden ports (overrides always create new instances)
 *
 * @example
 * ```typescript
 * const childContainer = container
 *   .createChild()
 *   .withInheritanceMode({
 *     Logger: 'shared',    // Share parent's logger
 *     Database: 'isolated' // Create fresh database connection
 *   })
 *   .build();
 * ```
 */
export type InheritanceMode = "shared" | "forked" | "isolated";

/**
 * Map of port names to their inheritance modes.
 *
 * @typeParam TPortNames - Union of valid port name strings
 */
export type InheritanceModeMap<TPortNames extends string> = {
  [K in TPortNames]?: InheritanceMode;
};

// =============================================================================
// Inheritance Mode Configuration
// =============================================================================

/**
 * Extracts port names from a union of Port types.
 * @internal
 */
export type ExtractPortNames<T extends Port<string, unknown>> =
  T extends Port<infer TName, infer _S> ? TName : never;

/**
 * Valid inheritance mode configuration map.
 * Keys are restricted to port names from TProvides.
 *
 * Used as the second parameter to `createChild()` to configure how
 * the child container inherits singleton instances from its parent.
 *
 * @example
 * ```typescript
 * const childGraph = GraphBuilder.create().build();
 * const child = container.createChild(childGraph, {
 *   Logger: 'shared',    // Share parent's instance (default)
 *   Database: 'isolated' // Create fresh instance
 * });
 * ```
 */
export type InheritanceModeConfig<TProvides extends Port<string, unknown>> = {
  [K in ExtractPortNames<TProvides>]?: InheritanceMode;
};
