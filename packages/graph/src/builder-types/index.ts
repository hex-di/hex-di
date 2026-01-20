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
} from "./internals.js";

// Re-export provide result types
export type {
  ProvideResult,
  ProvideResultAllErrors,
  ProvideAsyncResult,
  ProvideManyResult,
} from "./provide-types.js";

// Re-export merge result types
export type { MergeResult } from "./merge-types.js";

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
} from "./inspection-types.js";
