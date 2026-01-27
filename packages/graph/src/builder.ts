/**
 * @hex-di/graph/builder - GraphBuilder and Related Utilities
 *
 * This module exports the GraphBuilder class and all related types for
 * constructing dependency graphs with compile-time validation.
 *
 * @packageDocumentation
 */

// =============================================================================
// Core GraphBuilder
// =============================================================================

export { GraphBuilder, GRAPH_BUILDER_BRAND } from "./builder/builder.js";
export type { GraphBuilderFactory } from "./builder/builder.js";

// =============================================================================
// Type Guards
// =============================================================================

export { isGraphBuilder } from "./builder/guards.js";
export { isGraph } from "./graph/guards.js";

// =============================================================================
// Graph Type
// =============================================================================

export type { Graph } from "./graph/types/graph-types.js";

// =============================================================================
// Builder State Types
// =============================================================================

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
  WithDepGraph,
  WithLifetimeMap,
  WithDepGraphAndLifetimeMap,
  WithParentProvides,
  WithMaxDepth,
  UnifiedMergeInternals,
} from "./builder/types/index.js";

// =============================================================================
// Operation Result Types
// =============================================================================

export type {
  ProvideResult,
  ProvideResultAllErrors,
  ProvideAsyncResult,
  ProvideManyResult,
  ProvideUncheckedResult,
  MergeResult,
  MergeResultAllErrors,
  MergeOptions,
  MergeMaxDepthOption,
  MergeWithResult,
  ResolveMaxDepth,
  OverrideResult,
  InvalidOverrideErrorMessage,
  InvalidOverrideErrorWithAvailable,
  IsValidOverride,
  OverridablePorts,
} from "./builder/types/index.js";

// =============================================================================
// Inspection Types
// =============================================================================

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
  DebugBuilderInternals,
  DebugSimplifiedView,
  DebugInspectableBuilder,
} from "./builder/types/index.js";

// =============================================================================
// Debug Types
// =============================================================================

export type {
  DebugProvideValidation,
  DebugAdapterInference,
  DebugProvideResult,
  DebugMergeValidation,
  DebugOverrideValidation,
} from "./builder/types/index.js";

// =============================================================================
// Summary Types (for IDE tooltips)
// =============================================================================

export type {
  BuilderSummary,
  BuilderStatus,
  IsBuilderComplete,
  BuilderProvides,
  BuilderMissing,
} from "./builder/types/index.js";

// =============================================================================
// Initialization Order Types
// =============================================================================

export type {
  AsyncInitSummary,
  IsAsyncPort,
  AsyncPortNames,
  RequiresInitialization,
} from "./builder/types/index.js";

// =============================================================================
// Symbols
// =============================================================================

export type { __prettyViewSymbol } from "./symbols/index.js";
