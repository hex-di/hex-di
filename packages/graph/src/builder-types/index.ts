/**
 * Type-level validation types for GraphBuilder.
 *
 * This module contains all compile-time validation types used by the GraphBuilder
 * class. Separating these from the class implementation improves maintainability
 * and reduces the cognitive load when working with the GraphBuilder class itself.
 *
 * ## Module Organization
 *
 * Types are grouped by the operation they support:
 * - **Empty State**: EmptyDependencyGraph, EmptyLifetimeMap, DirectAdapterLifetime
 * - **Internals**: BuilderInternals, extraction/update utilities
 * - **Provide Types**: ProvideResult, CollectAdapterErrors, ProvideResultAllErrors
 * - **Merge Types**: MergeResult
 * - **Override Types**: OverrideResult, InvalidOverrideErrorMessage
 * - **Inspection Types**: ValidationState, InspectValidation, SimplifiedView
 *
 * @packageDocumentation
 */

// Re-export empty state types
export type {
  EmptyDependencyGraph,
  EmptyLifetimeMap,
  DirectAdapterLifetime,
} from "./empty-state.js";

// Re-export internals types (grouped phantom parameters)
export type {
  AnyBuilderInternals,
  BuilderInternals,
  DefaultInternals,
  GetDepGraph,
  GetLifetimeMap,
  GetParentProvides,
  GetMaxDepth,
  WithDepGraph,
  WithLifetimeMap,
  WithDepGraphAndLifetimeMap,
  WithParentProvides,
  WithMaxDepth,
  MergeInternals,
  MergeInternalsWithOptions,
} from "./internals.js";

// Re-export provide result types
export type {
  ProvideResult,
  ProvideResultAllErrors,
  ProvideAsyncResult,
  ProvideManyResult,
  ProvideUncheckedResult,
} from "./provide-types.js";

// Re-export merge result types
export type {
  MergeResult,
  MergeResultAllErrors,
  MergeOptions,
  MergeMaxDepthOption,
  MergeWithResult,
  ResolveMaxDepth,
} from "./merge-types.js";

// Re-export override result types
export type { OverrideResult, InvalidOverrideErrorMessage } from "./override-types.js";

// Re-export inspection types
export type {
  ValidationState,
  InspectValidation,
  SimplifiedView,
  InferBuilderProvides,
  InferBuilderUnsatisfied,
  PrettyBuilder,
  SimplifiedBuilder,
  InspectableBuilder,
  DebugBuilderState,
  DebugSimplifiedView,
  DebugInspectableBuilder,
} from "./inspection-types.js";

// Re-export debug types for validation tracing
export type {
  DebugProvideValidation,
  DebugAdapterInference,
  DebugProvideResult,
  DebugMergeValidation,
  DebugOverrideValidation,
} from "./debug-types.js";

// Re-export summary types for IDE tooltips
export type {
  BuilderSummary,
  BuilderStatus,
  IsBuilderComplete,
  BuilderProvides,
  BuilderMissing,
} from "./summary-types.js";

// Re-export initialization order types
export type {
  AsyncInitSummary,
  IsAsyncPort,
  AsyncPortNames,
  RequiresInitialization,
} from "./init-order-types.js";
