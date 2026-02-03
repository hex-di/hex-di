/**
 * Inspection, debug, and summary types for GraphBuilder.
 *
 * This module consolidates all types for inspecting, debugging, and summarizing
 * GraphBuilder state:
 *
 * - **Inspection types**: ValidationState, InspectValidation, SimplifiedView, etc.
 * - **Debug types**: DebugProvideValidation, DebugMergeValidation, etc.
 * - **Summary types**: BuilderSummary, BuilderStatus, IsBuilderComplete, etc.
 *
 * @packageDocumentation
 */

import type { AdapterConstraint, InferAdapterProvides, InferAdapterRequires } from "@hex-di/core";
import type {
  HasOverlap,
  AdapterProvidesName,
  AdapterRequiresNames,
  LifetimeLevel,
  UnsatisfiedDependencies,
  ExtractPortNames,
} from "../../validation/types/index.js";
import type { GraphBuilderSignature } from "./builder-signature.js";
import type { IsNever, Prettify } from "@hex-di/core";
import type {
  DirectAdapterLifetime,
  AnyBuilderInternals,
  BuilderInternals,
  GetDepGraph,
  GetLifetimeMap,
  GetMaxDepth,
  GetParentProvides,
  GetExtendedDepth,
} from "./state.js";
// NOTE: MergeResult and ProvideResultAllErrors imports are intentionally avoided here
// to break the circular import: inspection.ts → merge.ts → builder.ts → inspection.ts
// Debug types that need these imports are in inspection-debug.ts instead.

// =============================================================================
// Validation Inspection Types
// =============================================================================

/**
 * Detailed validation state for a GraphBuilder.
 *
 * @example
 * ```typescript
 * type State = InspectValidation<typeof builder>;
 * // { hasDuplicates: false, hasCycles: false, hasCaptiveDeps: false, unsatisfiedDeps: DatabasePort }
 * ```
 *
 * @internal
 */
export type ValidationState<TProvides, TRequires, TDepGraph, TLifetimeMap> = Prettify<{
  readonly hasDuplicates: false;
  readonly hasCycles: false;
  readonly hasCaptiveDeps: false;
  readonly unsatisfiedDeps: UnsatisfiedDependencies<TProvides, TRequires>;
  readonly depGraph: TDepGraph;
  readonly lifetimeMap: TLifetimeMap;
}>;

/**
 * Extracts validation state from a GraphBuilder for debugging purposes.
 * @internal
 */
export type InspectValidation<B> =
  B extends GraphBuilderSignature<
    infer TProvides,
    infer TRequires,
    infer _TAsyncPorts,
    infer _TOverrides,
    infer TInternalState extends BuilderInternals
  >
    ? ValidationState<
        TProvides,
        TRequires,
        GetDepGraph<TInternalState>,
        GetLifetimeMap<TInternalState>
      >
    : never;

// =============================================================================
// Simplified Type Utilities
// =============================================================================

/**
 * Extracts a simplified view of a GraphBuilder for inspection.
 * Hides internal phantom types and shows only user-relevant information.
 * @internal
 */
export type SimplifiedView<B> =
  B extends GraphBuilderSignature<
    infer TProvides,
    infer TRequires,
    infer TAsync,
    infer TOverrides,
    infer _TInternalState extends BuilderInternals
  >
    ? Prettify<{
        readonly provides: TProvides;
        readonly unsatisfied: UnsatisfiedDependencies<TProvides, TRequires>;
        readonly asyncPorts: TAsync;
        readonly overrides: TOverrides;
      }>
    : never;

/**
 * Extracts the TProvides type parameter from a GraphBuilder.
 * @internal
 */
export type InferBuilderProvides<B> =
  B extends GraphBuilderSignature<
    infer TProvides,
    infer _TRequires,
    infer _TAsync,
    infer _TOverrides,
    infer _TInternalState extends BuilderInternals
  >
    ? TProvides
    : never;

/**
 * Extracts the unsatisfied dependencies from a GraphBuilder.
 * @internal
 */
export type InferBuilderUnsatisfied<B> =
  B extends GraphBuilderSignature<
    infer TProvides,
    infer TRequires,
    infer _TAsync,
    infer _TOverrides,
    infer _TInternalState extends BuilderInternals
  >
    ? UnsatisfiedDependencies<TProvides, TRequires>
    : never;

/**
 * Simplified view of GraphBuilder for IDE tooltips.
 * @internal
 */
export type PrettyBuilder<B> =
  B extends GraphBuilderSignature<
    infer TProvides,
    infer TRequires,
    infer TAsyncPorts,
    infer TOverrides,
    infer _TInternalState extends BuilderInternals
  >
    ? {
        readonly provides: TProvides;
        readonly unsatisfied: UnsatisfiedDependencies<TProvides, TRequires>;
        readonly asyncPorts: TAsyncPorts;
        readonly overrides: TOverrides;
      }
    : never;

/**
 * A simplified GraphBuilder type that hides internal parameters.
 * @internal
 */
export type SimplifiedBuilder<
  TProvides = never,
  TAsyncPorts = never,
  TOverrides = never,
> = GraphBuilderSignature<
  TProvides,
  TProvides,
  TAsyncPorts,
  TOverrides,
  BuilderInternals<Record<string, string>, Record<string, number>, unknown, number, boolean>
>;

/**
 * Extracts a clean, inspectable view of a GraphBuilder's type parameters.
 * @internal
 */
export type InspectableBuilder<B> =
  B extends GraphBuilderSignature<
    infer TProvides,
    infer TRequires,
    infer TAsyncPorts,
    infer TOverrides,
    infer _TInternalState extends AnyBuilderInternals
  >
    ? Prettify<{
        readonly provides: TProvides;
        readonly requires: TRequires;
        readonly asyncPorts: TAsyncPorts;
        readonly overrides: TOverrides;
      }>
    : never;

/**
 * Comprehensive debug view of GraphBuilder state for advanced debugging.
 * @internal
 */
export type DebugBuilderState<B> =
  B extends GraphBuilderSignature<
    infer TProvides,
    infer TRequires,
    infer TAsyncPorts,
    infer TOverrides,
    infer TInternalState extends BuilderInternals
  >
    ? Prettify<{
        readonly provides: TProvides;
        readonly unsatisfied: UnsatisfiedDependencies<TProvides, TRequires>;
        readonly asyncPorts: TAsyncPorts;
        readonly overrides: TOverrides;
        readonly depGraph: GetDepGraph<TInternalState>;
        readonly lifetimeMap: GetLifetimeMap<TInternalState>;
        readonly parentProvides: GetParentProvides<TInternalState>;
        readonly maxDepth: GetMaxDepth<TInternalState>;
        readonly unsafeDepthOverride: GetExtendedDepth<TInternalState>;
        readonly isComplete: [UnsatisfiedDependencies<TProvides, TRequires>] extends [never]
          ? true
          : false;
      }>
    : never;

/**
 * Direct view of GraphBuilder's internal state parameters.
 *
 * Unlike `DebugBuilderState` which combines user-facing and internal state,
 * this type exposes ONLY the `BuilderInternals` fields for inspection:
 *
 * - `depGraph`: Type-level dependency map for cycle detection
 * - `lifetimeMap`: Type-level lifetime map for captive detection
 * - `parentProvides`: Parent graph's provided ports (unknown if no parent)
 * - `maxDepth`: Maximum cycle detection depth
 * - `unsafeDepthOverride`: When true, depth-exceeded is a WARNING not ERROR
 *
 * ## Use Case
 *
 * Use this when debugging type-level validation issues to see exactly
 * what internal state the validation logic is operating on.
 *
 * @example
 * ```typescript
 * import type { DebugBuilderInternals } from "@hex-di/graph";
 *
 * const builder = GraphBuilder.create()
 *   .provide(LoggerAdapter);
 *
 * type Internals = DebugBuilderInternals<typeof builder>;
 * // {
 * //   depGraph: { Logger: never }
 * //   lifetimeMap: { Logger: 1 }
 * //   parentProvides: unknown
 * //   maxDepth: 50
 * //   unsafeDepthOverride: false
 * // }
 * ```
 *
 * @internal
 */
export type DebugBuilderInternals<B> =
  B extends GraphBuilderSignature<
    infer _TProvides,
    infer _TRequires,
    infer _TAsyncPorts,
    infer _TOverrides,
    infer TInternalState extends BuilderInternals
  >
    ? Prettify<{
        readonly depGraph: GetDepGraph<TInternalState>;
        readonly lifetimeMap: GetLifetimeMap<TInternalState>;
        readonly parentProvides: GetParentProvides<TInternalState>;
        readonly maxDepth: GetMaxDepth<TInternalState>;
        readonly unsafeDepthOverride: GetExtendedDepth<TInternalState>;
      }>
    : never;

/**
 * Debug version of SimplifiedView for type inspection.
 */
export type DebugSimplifiedView<B> =
  B extends GraphBuilderSignature<
    infer TProvides,
    infer TRequires,
    infer TAsync,
    infer TOverrides,
    infer _TInternalState extends BuilderInternals
  >
    ? Prettify<{
        readonly success: true;
        readonly result: {
          readonly provides: TProvides;
          readonly unsatisfied: UnsatisfiedDependencies<TProvides, TRequires>;
          readonly asyncPorts: TAsync;
          readonly overrides: TOverrides;
        };
        readonly raw: {
          readonly TProvides: TProvides;
          readonly TRequires: TRequires;
          readonly TAsync: TAsync;
          readonly TOverrides: TOverrides;
        };
      }>
    : Prettify<{
        readonly success: false;
        readonly error: "Input is not a GraphBuilder type";
        readonly inputType: B;
      }>;

/**
 * Debug version of InspectableBuilder for type inspection.
 */
export type DebugInspectableBuilder<B> =
  B extends GraphBuilderSignature<
    infer TProvides,
    infer TRequires,
    infer TAsyncPorts,
    infer TOverrides,
    infer _TInternalState extends AnyBuilderInternals
  >
    ? Prettify<{
        readonly success: true;
        readonly result: {
          readonly provides: TProvides;
          readonly requires: TRequires;
          readonly asyncPorts: TAsyncPorts;
          readonly overrides: TOverrides;
        };
        readonly satisfaction: {
          readonly unsatisfied: UnsatisfiedDependencies<TProvides, TRequires>;
          readonly isComplete: [UnsatisfiedDependencies<TProvides, TRequires>] extends [never]
            ? true
            : false;
        };
      }>
    : Prettify<{
        readonly success: false;
        readonly error: "Input is not a GraphBuilder type";
        readonly inputType: B;
      }>;

// =============================================================================
// Debug Types for Validation Tracing
// =============================================================================
// NOTE: DebugProvideValidation, DebugMergeValidation, and DebugProvideResult
// have been moved to inspection-debug.ts to break circular imports.
// They depend on MergeResult/ProvideResultAllErrors which import GraphBuilder.

/**
 * Debug type for inspecting adapter type inference.
 * @internal
 */
export type DebugAdapterInference<TAdapter extends AdapterConstraint> = Prettify<{
  readonly provides: InferAdapterProvides<TAdapter>;
  readonly requires: InferAdapterRequires<TAdapter>;
  readonly providesName: AdapterProvidesName<TAdapter>;
  readonly requiresNames: AdapterRequiresNames<TAdapter>;
  readonly lifetime: DirectAdapterLifetime<TAdapter>;
  readonly lifetimeLevel: LifetimeLevel<DirectAdapterLifetime<TAdapter>>;
}>;

/**
 * Debug type for override() validation steps.
 * @internal
 */
export type DebugOverrideValidation<
  TBuilder extends GraphBuilderSignature<unknown, unknown, unknown, unknown, AnyBuilderInternals>,
  TAdapter extends AdapterConstraint,
> =
  TBuilder extends GraphBuilderSignature<
    infer TProvides,
    infer _TRequires,
    infer _TAsyncPorts,
    infer _TOverrides,
    infer TInternals extends AnyBuilderInternals
  >
    ? Prettify<{
        readonly adapterInfo: {
          readonly provides: AdapterProvidesName<TAdapter>;
          readonly requires: AdapterRequiresNames<TAdapter>;
          readonly lifetime: DirectAdapterLifetime<TAdapter>;
        };
        readonly builderProvides: TProvides;
        readonly parentProvides: GetParentProvides<TInternals>;
        readonly step1_duplicateInCurrentGraph: HasOverlap<
          InferAdapterProvides<TAdapter>,
          TProvides
        > extends true
          ? {
              readonly found: true;
              readonly reason: "Port already exists in current graph";
            }
          : false;
        readonly step2_existsInParent: GetParentProvides<TInternals> extends never
          ? "No parent validation (use forParent for compile-time parent checking)"
          : HasOverlap<InferAdapterProvides<TAdapter>, GetParentProvides<TInternals>> extends true
            ? { readonly found: true; readonly canOverride: true }
            : {
                readonly found: false;
                readonly reason: "Port not found in parent - cannot override";
              };
      }>
    : never;

/**
 * Complete trace of the validation pipeline's internal state.
 * @internal
 */
export type ProvideValidationTrace<
  TBuilder extends GraphBuilderSignature<unknown, unknown, unknown, unknown, AnyBuilderInternals>,
  TAdapter extends AdapterConstraint,
> =
  TBuilder extends GraphBuilderSignature<
    infer TProvides,
    infer TRequires,
    infer _TAsyncPorts,
    infer _TOverrides,
    infer TInternalState extends AnyBuilderInternals
  >
    ? Prettify<{
        readonly beforeState: Prettify<{
          readonly provides: TProvides;
          readonly requires: TRequires;
          readonly depGraph: GetDepGraph<TInternalState>;
          readonly lifetimeMap: GetLifetimeMap<TInternalState>;
          readonly maxDepth: GetMaxDepth<TInternalState>;
        }>;
        readonly adapterContribution: Prettify<{
          readonly providesPort: AdapterProvidesName<TAdapter>;
          readonly requiresPorts: AdapterRequiresNames<TAdapter>;
          readonly lifetime: DirectAdapterLifetime<TAdapter>;
          readonly lifetimeLevel: LifetimeLevel<DirectAdapterLifetime<TAdapter>>;
        }>;
        readonly validationInputs: Prettify<{
          readonly step1_duplicate: Prettify<{
            readonly currentProvides: TProvides;
            readonly adapterProvides: InferAdapterProvides<TAdapter>;
            readonly hasOverlap: HasOverlap<InferAdapterProvides<TAdapter>, TProvides>;
          }>;
          readonly step2_cycle: Prettify<{
            readonly currentDepGraph: GetDepGraph<TInternalState>;
            readonly adapterProvidesName: AdapterProvidesName<TAdapter>;
            readonly adapterRequiresNames: AdapterRequiresNames<TAdapter>;
            readonly maxDepth: GetMaxDepth<TInternalState>;
          }>;
          readonly step3_captive: Prettify<{
            readonly currentLifetimeMap: GetLifetimeMap<TInternalState>;
            readonly adapterLifetimeLevel: LifetimeLevel<DirectAdapterLifetime<TAdapter>>;
            readonly adapterRequiresNames: AdapterRequiresNames<TAdapter>;
          }>;
        }>;
      }>
    : never;

// =============================================================================
// Builder Summary Types
// =============================================================================

/**
 * Compact summary of GraphBuilder state using port names (strings).
 */
export type BuilderSummary<B> =
  B extends GraphBuilderSignature<
    infer TProvides,
    infer TRequires,
    infer TAsyncPorts,
    infer TOverrides,
    infer _TInternalState extends AnyBuilderInternals
  >
    ? Prettify<{
        readonly provides: ExtractPortNames<TProvides>;
        readonly unsatisfied: ExtractPortNames<UnsatisfiedDependencies<TProvides, TRequires>>;
        readonly isComplete: IsNever<UnsatisfiedDependencies<TProvides, TRequires>> extends true
          ? true
          : false;
        readonly asyncPorts: ExtractPortNames<TAsyncPorts>;
        readonly overrides: ExtractPortNames<TOverrides>;
      }>
    : never;

/**
 * Minimal summary showing only completeness status.
 */
export type BuilderStatus<B> =
  B extends GraphBuilderSignature<
    infer TProvides,
    infer TRequires,
    infer _TAsyncPorts,
    infer _TOverrides,
    infer _TInternalState extends AnyBuilderInternals
  >
    ? IsNever<UnsatisfiedDependencies<TProvides, TRequires>> extends true
      ? { readonly isComplete: true }
      : {
          readonly isComplete: false;
          readonly missing: ExtractPortNames<UnsatisfiedDependencies<TProvides, TRequires>>;
        }
    : never;

/**
 * Quick check if a GraphBuilder is complete (all dependencies satisfied).
 */
export type IsBuilderComplete<B> =
  B extends GraphBuilderSignature<
    infer TProvides,
    infer TRequires,
    infer _TAsyncPorts,
    infer _TOverrides,
    infer _TInternalState extends AnyBuilderInternals
  >
    ? IsNever<UnsatisfiedDependencies<TProvides, TRequires>> extends true
      ? true
      : false
    : never;

/**
 * Extracts just the provided port names from a GraphBuilder.
 */
export type BuilderProvides<B> =
  B extends GraphBuilderSignature<
    infer TProvides,
    infer _TRequires,
    infer _TAsyncPorts,
    infer _TOverrides,
    infer _TInternalState extends AnyBuilderInternals
  >
    ? ExtractPortNames<TProvides>
    : never;

/**
 * Extracts just the unsatisfied port names from a GraphBuilder.
 */
export type BuilderMissing<B> =
  B extends GraphBuilderSignature<
    infer TProvides,
    infer TRequires,
    infer _TAsyncPorts,
    infer _TOverrides,
    infer _TInternalState extends AnyBuilderInternals
  >
    ? ExtractPortNames<UnsatisfiedDependencies<TProvides, TRequires>>
    : never;
