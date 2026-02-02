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
 * - **State Types**: EmptyDependencyGraph, EmptyLifetimeMap, BuilderInternals, etc.
 * - **Provide Types**: ProvideResult, CollectAdapterErrors, ProvideResultAllErrors
 * - **Merge Types**: MergeResult, MergeOptions, OverrideResult
 * - **Inspection Types**: ValidationState, InspectValidation, SimplifiedView, Debug*
 * - **Init Order Types**: AsyncInitSummary, IsAsyncPort, etc.
 *
 * @packageDocumentation
 */

// Re-export empty state brand symbols (for type-level usage)
export { __emptyDepGraphBrand, __emptyLifetimeMapBrand } from "./state.js";

// Re-export state types (empty state + internals)
export type {
  EmptyDependencyGraph,
  EmptyLifetimeMap,
  DirectAdapterLifetime,
  AnyBuilderInternals,
  BuilderInternals,
  DefaultInternals,
  GetDepGraph,
  GetLifetimeMap,
  GetParentProvides,
  GetMaxDepth,
  GetExtendedDepth,
  GetDepthExceededWarning,
  WithDepGraph,
  WithLifetimeMap,
  WithDepGraphAndLifetimeMap,
  WithParentProvides,
  WithMaxDepth,
  WithExtendedDepth,
  WithDepthExceededWarning,
  WithDepGraphLifetimeAndWarning,
  UnifiedMergeInternals,
} from "./state.js";

// Re-export builder signature for pattern matching without import cycles
export type { GraphBuilderSignature } from "./builder-signature.js";

// Re-export provide result types
export type {
  ProvideResult,
  ProvideResultSuccess,
  ProvideResultAllErrors,
  ProvideManyResult,
  ProvideManyResultAllErrors,
  CollectAdapterErrors,
  CollectBatchErrors,
  CheckDuplicate,
  CheckCycleDependency,
  CheckCaptiveDependency,
} from "./provide.js";

// Re-export merge and override result types
export type {
  MergeResult,
  MergeResultAllErrors,
  CollectMergeErrors,
  MergeOptions,
  OverrideResult,
  InvalidOverrideErrorMessage,
  InvalidOverrideErrorWithAvailable,
  IsValidOverride,
  OverridablePorts,
} from "./merge.js";

// Re-export inspection, debug, and summary types
export type {
  // Inspection types
  ValidationState,
  InspectValidation,
  SimplifiedView,
  InferBuilderProvides,
  InferBuilderUnsatisfied,
  PrettyBuilder,
  SimplifiedBuilder,
  InspectableBuilder,
  DebugBuilderState,
  DebugBuilderInternals,
  DebugSimplifiedView,
  DebugInspectableBuilder,
  // Debug types for validation tracing
  DebugProvideValidation,
  DebugAdapterInference,
  DebugProvideResult,
  DebugMergeValidation,
  DebugOverrideValidation,
  ProvideValidationTrace,
  // Summary types for IDE tooltips
  BuilderSummary,
  BuilderStatus,
  IsBuilderComplete,
  BuilderProvides,
  BuilderMissing,
} from "./inspection.js";

// Re-export initialization order types
export type {
  AsyncInitSummary,
  IsAsyncPort,
  AsyncPortNames,
  RequiresInitialization,
} from "./init-order-types.js";
