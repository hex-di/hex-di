/**
 * hex-di - HexDI dependency injection framework
 *
 * Umbrella package re-exporting the full HexDI stack:
 *   - @hex-di/core    ports, adapters, errors, utilities
 *   - @hex-di/graph   dependency graph construction & compile-time validation
 *   - @hex-di/runtime container lifecycle & type-safe service resolution
 *
 * @packageDocumentation
 */

// =============================================================================
// Graph — no naming conflicts with core or runtime
// =============================================================================

export * from "@hex-di/graph";

// =============================================================================
// Core — ports, adapters, utilities
// Conflicts with @hex-di/runtime are resolved below (runtime wins).
// =============================================================================

export * from "@hex-di/core";

// =============================================================================
// Runtime — container, scopes, resolution
// Conflicts with @hex-di/core are resolved below (runtime wins).
// =============================================================================

export * from "@hex-di/runtime";

// =============================================================================
// Conflict resolution — runtime takes precedence over core for shared names.
//
// Both packages export these identifiers independently. Runtime holds the
// concrete implementations that users interact with at run-time, so those
// versions win. Explicit re-exports suppress the export * ambiguity errors.
// =============================================================================

// Error classes (runtime adds DisposalError, FinalizerTimeoutError, ScopeDepthExceededError)
export {
  ContainerError,
  CircularDependencyError,
  FactoryError,
  DisposedScopeError,
  ScopeRequiredError,
  AsyncFactoryError,
  AsyncInitializationRequiredError,
  NonClonableForkedError,
} from "@hex-di/runtime";

// Inspection & container types
export type {
  InheritanceMode,
  ContainerPhase,
  ContainerKind,
  SingletonEntry,
  ScopeTree,
  ContainerSnapshot,
  AdapterInfo,
  InspectorAPI,
  InspectorEvent,
  InspectorListener,
  VisualizableAdapter,
  ContainerGraphData,
  ResultStatistics,
} from "@hex-di/runtime";
