/**
 * Captive Dependency Prevention Types for @hex-di/runtime.
 *
 * Captive dependency is a DI anti-pattern where a longer-lived service
 * (e.g., singleton) depends on a shorter-lived service (e.g., scoped/transient).
 * This causes the shorter-lived service to be "captured" and held beyond
 * its intended lifetime, leading to stale data and memory leaks.
 *
 * These types provide compile-time validation to prevent captive dependencies
 * with zero runtime cost. All validation is performed at the type level.
 *
 * Lifetime hierarchy (lower level = longer lived):
 * - Singleton (1): lives for entire application lifetime
 * - Scoped (2): lives for duration of a scope
 * - Transient (3): created fresh for each resolution
 *
 * Rule: An adapter can only depend on adapters with the same or LOWER
 * (longer-lived) lifetime level. Depending on HIGHER (shorter-lived)
 * adapters creates a captive dependency.
 *
 * @packageDocumentation
 */
export {};
// =============================================================================
// Integration Documentation
// =============================================================================
/**
 * ## Integration with @hex-di/graph
 *
 * Captive dependency validation should ideally occur during graph construction
 * in the `GraphBuilder.provide()` method. This provides immediate feedback
 * when an invalid dependency is added.
 *
 * ### Option 1: Validation in @hex-di/graph (Recommended)
 *
 * The `GraphBuilder.provide()` method could be enhanced to check captive
 * dependencies. When a new adapter is added, validate its dependencies
 * against existing adapters in the graph:
 *
 * ```typescript
 * // In @hex-di/graph GraphBuilder
 * provide<A extends Adapter<...>>(adapter: A): ProvideResult<...> {
 *   // Existing duplicate check...
 *
 *   // NEW: Captive dependency check
 *   type CaptiveCheck = ValidateCaptiveDependenciesInGraph<A, ExistingAdapters>;
 *   // Return error type if captive dependency detected
 * }
 * ```
 *
 * ### Option 2: Validation in @hex-di/runtime
 *
 * Alternatively, captive dependency validation can be performed when
 * creating a container from a graph. This is less ideal as the error
 * appears later in the workflow:
 *
 * ```typescript
 * // In @hex-di/runtime createContainer
 * createContainer<TProvides>(graph: Graph<TProvides>): ValidatedContainer<TProvides> {
 *   // Validate all adapter dependencies...
 * }
 * ```
 *
 * ### Current Implementation Status
 *
 * This module provides the foundational types for captive dependency detection:
 * - `LifetimeLevel<L>` - Maps lifetime strings to numeric levels
 * - `ValidateCaptiveDependency<A, B>` - Validates a single dependency relationship
 * - `CaptiveDependencyError<M>` - Branded error type with descriptive message
 * - `ValidateAllDependencies<A, As>` - Validates multiple dependencies
 *
 * Integration with GraphBuilder requires modifications to @hex-di/graph.
 * The types are exported from @hex-di/runtime for use in either package.
 *
 * ### Limitation Note
 *
 * Full integration requires knowing WHICH adapter provides each required port.
 * The current Graph/GraphBuilder tracks ports but the adapter lookup for
 * lifetime checking requires additional type-level machinery or runtime support.
 *
 * A practical integration approach:
 * 1. Export these types from @hex-di/runtime
 * 2. @hex-di/graph can import and use them in GraphBuilder.provide()
 * 3. The provide() method would need to track adapters (not just ports) to
 *    enable lifetime comparison
 */
