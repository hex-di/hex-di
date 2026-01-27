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
export { __emptyDepGraphBrand, __emptyLifetimeMapBrand } from "./state.js";
export type { EmptyDependencyGraph, EmptyLifetimeMap, DirectAdapterLifetime, AnyBuilderInternals, BuilderInternals, DefaultInternals, GetDepGraph, GetLifetimeMap, GetParentProvides, GetMaxDepth, GetUnsafeDepthOverride, GetDepthExceededWarning, WithDepGraph, WithLifetimeMap, WithDepGraphAndLifetimeMap, WithParentProvides, WithMaxDepth, WithUnsafeDepthOverride, WithDepthExceededWarning, WithDepGraphLifetimeAndWarning, UnifiedMergeInternals, } from "./state.js";
export type { GraphBuilderSignature } from "./builder-signature.js";
export type { ProvideResult, ProvideResultSuccess, ProvideResultAllErrors, ProvideAsyncResult, ProvideManyResult, ProvideManyResultAllErrors, ProvideUncheckedResult, CollectAdapterErrors, CollectBatchErrors, CheckDuplicate, CheckCycleDependency, CheckCaptiveDependency, } from "./provide.js";
export type { MergeResult, MergeResultAllErrors, CollectMergeErrors, MergeOptions, MergeMaxDepthOption, MergeWithResult, ResolveMaxDepth, OverrideResult, InvalidOverrideErrorMessage, InvalidOverrideErrorWithAvailable, IsValidOverride, OverridablePorts, } from "./merge.js";
export type { ValidationState, InspectValidation, SimplifiedView, InferBuilderProvides, InferBuilderUnsatisfied, PrettyBuilder, SimplifiedBuilder, InspectableBuilder, DebugBuilderState, DebugBuilderInternals, DebugSimplifiedView, DebugInspectableBuilder, DebugProvideValidation, DebugAdapterInference, DebugProvideResult, DebugMergeValidation, DebugOverrideValidation, ProvideValidationTrace, BuilderSummary, BuilderStatus, IsBuilderComplete, BuilderProvides, BuilderMissing, } from "./inspection.js";
export type { AsyncInitSummary, IsAsyncPort, AsyncPortNames, RequiresInitialization, } from "./init-order-types.js";
