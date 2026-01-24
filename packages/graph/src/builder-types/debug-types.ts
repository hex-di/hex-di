/**
 * Debug types for type-level validation tracing.
 *
 * These types help diagnose why a `provide()` call returns an error.
 * Hover over the debug type in your IDE to see step-by-step validation results.
 *
 * ## Usage
 *
 * When you get an unexpected error from `provide()`, use these debug types:
 *
 * ```typescript
 * import type { DebugProvideValidation } from "@hex-di/graph/internal";
 *
 * const builder = GraphBuilder.create().provide(AdapterA);
 * type Debug = DebugProvideValidation<typeof builder, typeof AdapterB>;
 * // Hover over Debug to see:
 * // {
 * //   step1_duplicate: false,
 * //   step2_cycle: false,
 * //   step3_captive: { found: true, port: "ScopedService", ... },
 * //   finalResult: "ERROR[HEX003]: Captive dependency..."
 * // }
 * ```
 *
 * ## AI ROUTING
 *
 * - For actual validation logic: See `./provide-types.ts`
 * - For error message format: See `../validation/errors.ts`
 * - For cycle detection internals: See `../validation/cycle-detection/`
 *
 * @packageDocumentation
 */

import type { AdapterAny, InferAdapterProvides, InferAdapterRequires } from "../adapter/index.js";
import type {
  HasOverlap,
  OverlappingPorts,
  WouldCreateCycle,
  AdapterProvidesName,
  AdapterRequiresNames,
  BuildCyclePath,
  AddEdge,
  LifetimeLevel,
  FindAnyCaptiveDependency,
  GetLifetimeLevel,
  LifetimeName,
} from "../validation/index.js";
import type { GraphBuilder } from "../graph/builder.js";
import type { DirectAdapterLifetime } from "./empty-state.js";
import type {
  AnyBuilderInternals,
  GetDepGraph,
  GetLifetimeMap,
  GetMaxDepth,
  GetParentProvides,
} from "./internals.js";
import type { ProvideResultAllErrors } from "./provide-types.js";

// =============================================================================
// Debug Types for Validation Tracing
// =============================================================================

/**
 * Step-by-step validation result for debugging.
 *
 * ## PRECONDITIONS
 *
 * - `TBuilder` must be a `GraphBuilder` instance type (use `typeof builder`)
 * - `TAdapter` must be an adapter type (use `typeof adapter`)
 *
 * ## POSTCONDITIONS
 *
 * Returns an object type with:
 * - `step1_duplicate`: `true` if adapter's port already exists, `false` otherwise
 * - `step2_cycle`: The cycle path if detected, `false` otherwise
 * - `step3_captive`: Captive dependency info if detected, `false` otherwise
 * - `adapterInfo`: Summary of the adapter being added
 * - `finalResult`: The actual result type from `provide()`
 *
 * @example
 * ```typescript
 * const builder = GraphBuilder.create().provide(LoggerAdapter);
 * type Debug = DebugProvideValidation<typeof builder, typeof DatabaseAdapter>;
 * // Hover to see validation step results
 * ```
 */
export type DebugProvideValidation<
  TBuilder extends GraphBuilder<unknown, unknown, unknown, unknown, AnyBuilderInternals>,
  TAdapter extends AdapterAny,
> =
  TBuilder extends GraphBuilder<
    infer TProvides,
    infer TRequires,
    infer TAsyncPorts,
    infer TOverrides,
    infer TInternalState extends AnyBuilderInternals
  >
    ? {
        /** Summary of the adapter being validated */
        readonly adapterInfo: {
          readonly provides: AdapterProvidesName<TAdapter>;
          readonly requires: AdapterRequiresNames<TAdapter>;
          readonly lifetime: DirectAdapterLifetime<TAdapter>;
          readonly lifetimeLevel: LifetimeLevel<DirectAdapterLifetime<TAdapter>>;
        };

        /** Step 1: Does the adapter's port already exist in the graph? */
        readonly step1_duplicate: HasOverlap<InferAdapterProvides<TAdapter>, TProvides> extends true
          ? {
              readonly found: true;
              readonly conflictingPort: OverlappingPorts<InferAdapterProvides<TAdapter>, TProvides>;
            }
          : false;

        /** Step 2: Would adding this adapter create a cycle? */
        readonly step2_cycle: WouldCreateCycle<
          GetDepGraph<TInternalState>,
          AdapterProvidesName<TAdapter>,
          AdapterRequiresNames<TAdapter>,
          GetMaxDepth<TInternalState>
        > extends true
          ? {
              readonly found: true;
              readonly cyclePath: BuildCyclePath<
                AddEdge<
                  GetDepGraph<TInternalState>,
                  AdapterProvidesName<TAdapter>,
                  AdapterRequiresNames<TAdapter>
                >,
                AdapterProvidesName<TAdapter>,
                AdapterRequiresNames<TAdapter>,
                GetMaxDepth<TInternalState>
              >;
            }
          : false;

        /** Step 3: Does the adapter have a captive dependency? */
        readonly step3_captive: FindAnyCaptiveDependency<
          GetLifetimeMap<TInternalState>,
          LifetimeLevel<DirectAdapterLifetime<TAdapter>>,
          AdapterRequiresNames<TAdapter>
        > extends infer CaptivePort
          ? CaptivePort extends string
            ? {
                readonly found: true;
                readonly port: CaptivePort;
                readonly adapterLifetime: LifetimeName<
                  LifetimeLevel<DirectAdapterLifetime<TAdapter>>
                >;
                readonly captiveLifetime: LifetimeName<
                  GetLifetimeLevel<GetLifetimeMap<TInternalState>, CaptivePort>
                >;
              }
            : false
          : false;

        /** The final result from ProvideResultAllErrors */
        readonly finalResult: ProvideResultAllErrors<
          TProvides,
          TRequires,
          TAsyncPorts,
          TOverrides,
          TInternalState,
          TAdapter
        >;
      }
    : never;

// Note: DebugBuilderState is already defined in ./inspection-types.ts
// and exported from the package. Use that for inspecting builder state.
// This file focuses on validation-specific debugging.

/**
 * Debug type for inspecting adapter type inference.
 *
 * Use this when you're unsure what types are being inferred from an adapter.
 *
 * @example
 * ```typescript
 * type Debug = DebugAdapterInference<typeof MyAdapter>;
 * // Hover to see: { provides: LoggerPort, requires: ConfigPort | DbPort, ... }
 * ```
 */
export type DebugAdapterInference<TAdapter extends AdapterAny> = {
  /** The inferred provides type */
  readonly provides: InferAdapterProvides<TAdapter>;
  /** The inferred requires type */
  readonly requires: InferAdapterRequires<TAdapter>;
  /** The port name string (extracted from provides) */
  readonly providesName: AdapterProvidesName<TAdapter>;
  /** The required port names (extracted from requires) */
  readonly requiresNames: AdapterRequiresNames<TAdapter>;
  /** The adapter's lifetime */
  readonly lifetime: DirectAdapterLifetime<TAdapter>;
  /** The numeric lifetime level (1=singleton, 2=scoped, 3=transient) */
  readonly lifetimeLevel: LifetimeLevel<DirectAdapterLifetime<TAdapter>>;
};

// =============================================================================
// Merge Validation Debug Types
// =============================================================================

/**
 * Debug type for merge() validation steps.
 *
 * Use this to diagnose why a `merge()` call returns an error.
 * Hover over the type to see step-by-step validation results.
 *
 * @example
 * ```typescript
 * import type { DebugMergeValidation } from "@hex-di/graph/internal";
 *
 * const builder1 = GraphBuilder.create().provide(LoggerAdapter);
 * const builder2 = GraphBuilder.create().provide(DatabaseAdapter);
 * type Debug = DebugMergeValidation<typeof builder1, typeof builder2>;
 * // Hover over Debug to see:
 * // {
 * //   step1_duplicateCheck: false,
 * //   step2_combinedProvides: LoggerPort | DatabasePort,
 * //   step3_combinedRequires: ...,
 * //   finalResult: GraphBuilder<...>
 * // }
 * ```
 */
export type DebugMergeValidation<
  TBuilder1 extends GraphBuilder<unknown, unknown, unknown, unknown, AnyBuilderInternals>,
  TBuilder2 extends GraphBuilder<unknown, unknown, unknown, unknown, AnyBuilderInternals>,
> =
  TBuilder1 extends GraphBuilder<
    infer TProvides1,
    infer TRequires1,
    infer TAsyncPorts1,
    infer TOverrides1,
    infer TInternals1 extends AnyBuilderInternals
  >
    ? TBuilder2 extends GraphBuilder<
        infer TProvides2,
        infer TRequires2,
        infer TAsyncPorts2,
        infer TOverrides2,
        infer _TInternals2 extends AnyBuilderInternals
      >
      ? {
          /** Graph 1's provided ports */
          readonly builder1Provides: TProvides1;
          /** Graph 2's provided ports */
          readonly builder2Provides: TProvides2;
          /** Step 1: Check for duplicate ports between graphs */
          readonly step1_duplicateCheck: HasOverlap<TProvides1, TProvides2> extends true
            ? {
                readonly found: true;
                readonly conflictingPorts: OverlappingPorts<TProvides1, TProvides2>;
              }
            : false;
          /** Step 2: Combined provides after merge */
          readonly step2_combinedProvides: TProvides1 | TProvides2;
          /** Step 3: Combined requires after merge */
          readonly step3_combinedRequires: TRequires1 | TRequires2;
          /** Step 4: Combined async ports after merge */
          readonly step4_combinedAsyncPorts: TAsyncPorts1 | TAsyncPorts2;
          /** Step 5: Combined overrides after merge */
          readonly step5_combinedOverrides: TOverrides1 | TOverrides2;
          /** The final result (GraphBuilder or error) */
          readonly finalResult: import("./merge-types.js").MergeResult<
            TProvides1,
            TRequires1,
            TAsyncPorts1,
            TOverrides1,
            TInternals1,
            TProvides2,
            TRequires2,
            TAsyncPorts2,
            TOverrides2,
            AnyBuilderInternals
          >;
        }
      : never
    : never;

// =============================================================================
// Comprehensive Debug Result Type
// =============================================================================

/**
 * Complete debug view of provide() validation for troubleshooting.
 *
 * This type expands ALL intermediate types for full visibility into the
 * validation pipeline. Use when you need to trace exactly why a provide()
 * call returns an error or unexpected result.
 *
 * ## Structure
 *
 * ```typescript
 * {
 *   input: {
 *     builderState: { provides, requires, asyncPorts, ... },
 *     adapterInfo: { provides, requires, lifetime, ... },
 *   },
 *   validation: {
 *     step1_duplicate: ...,
 *     step2_cycle: ...,
 *     step3_captive: ...,
 *   },
 *   result: {
 *     type: "success" | "error",
 *     value: GraphBuilder<...> | "ERROR[HEXxxx]: ...",
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * import type { DebugProvideResult } from "@hex-di/graph/internal";
 *
 * const builder = GraphBuilder.create().provide(LoggerAdapter);
 * type Debug = DebugProvideResult<typeof builder, typeof UserServiceAdapter>;
 * // Hover to see complete validation trace including builder state
 * ```
 *
 * @typeParam TBuilder - The GraphBuilder instance type
 * @typeParam TAdapter - The adapter being added
 *
 * @internal
 */
export type DebugProvideResult<
  TBuilder extends GraphBuilder<unknown, unknown, unknown, unknown, AnyBuilderInternals>,
  TAdapter extends AdapterAny,
> =
  TBuilder extends GraphBuilder<
    infer TProvides,
    infer TRequires,
    infer TAsyncPorts,
    infer TOverrides,
    infer TInternalState extends AnyBuilderInternals
  >
    ? import("../common/index.js").Prettify<{
        /** Input analysis: current state of builder and adapter being added */
        readonly input: {
          /** Current builder state before adding the adapter */
          readonly builderState: {
            readonly provides: TProvides;
            readonly requires: TRequires;
            readonly asyncPorts: TAsyncPorts;
            readonly overrides: TOverrides;
            readonly depGraph: GetDepGraph<TInternalState>;
            readonly lifetimeMap: GetLifetimeMap<TInternalState>;
            readonly parentProvides: GetParentProvides<TInternalState>;
            readonly maxDepth: GetMaxDepth<TInternalState>;
          };
          /** The adapter being validated */
          readonly adapterInfo: DebugAdapterInference<TAdapter>;
        };

        /** Step-by-step validation results */
        readonly validation: {
          /** Step 1: Duplicate port check result */
          readonly step1_duplicate: HasOverlap<
            InferAdapterProvides<TAdapter>,
            TProvides
          > extends true
            ? {
                readonly found: true;
                readonly conflictingPort: OverlappingPorts<
                  InferAdapterProvides<TAdapter>,
                  TProvides
                >;
              }
            : { readonly found: false };

          /** Step 2: Cycle detection result */
          readonly step2_cycle: WouldCreateCycle<
            GetDepGraph<TInternalState>,
            AdapterProvidesName<TAdapter>,
            AdapterRequiresNames<TAdapter>,
            GetMaxDepth<TInternalState>
          > extends true
            ? {
                readonly found: true;
                readonly cyclePath: BuildCyclePath<
                  AddEdge<
                    GetDepGraph<TInternalState>,
                    AdapterProvidesName<TAdapter>,
                    AdapterRequiresNames<TAdapter>
                  >,
                  AdapterProvidesName<TAdapter>,
                  AdapterRequiresNames<TAdapter>,
                  GetMaxDepth<TInternalState>
                >;
              }
            : { readonly found: false };

          /** Step 3: Captive dependency check result */
          readonly step3_captive: FindAnyCaptiveDependency<
            GetLifetimeMap<TInternalState>,
            LifetimeLevel<DirectAdapterLifetime<TAdapter>>,
            AdapterRequiresNames<TAdapter>
          > extends infer CaptivePort
            ? CaptivePort extends string
              ? {
                  readonly found: true;
                  readonly port: CaptivePort;
                  readonly adapterLifetime: LifetimeName<
                    LifetimeLevel<DirectAdapterLifetime<TAdapter>>
                  >;
                  readonly captiveLifetime: LifetimeName<
                    GetLifetimeLevel<GetLifetimeMap<TInternalState>, CaptivePort>
                  >;
                }
              : { readonly found: false }
            : { readonly found: false };
        };

        /** Final result of the provide() operation */
        readonly result: {
          /** The computed result type (GraphBuilder on success, error string on failure) */
          readonly value: ProvideResultAllErrors<
            TProvides,
            TRequires,
            TAsyncPorts,
            TOverrides,
            TInternalState,
            TAdapter
          >;
          /** Whether the result is a success (GraphBuilder) or error (string) */
          readonly isSuccess: ProvideResultAllErrors<
            TProvides,
            TRequires,
            TAsyncPorts,
            TOverrides,
            TInternalState,
            TAdapter
          > extends string
            ? false
            : true;
        };
      }>
    : never;

// =============================================================================
// Override Validation Debug Types
// =============================================================================

/**
 * Debug type for override() validation steps.
 *
 * Use this to diagnose why an `override()` call returns an error,
 * especially when using `forParent()` with compile-time parent validation.
 *
 * @example
 * ```typescript
 * import type { DebugOverrideValidation } from "@hex-di/graph/internal";
 *
 * const parentGraph = GraphBuilder.create().provide(LoggerAdapter).build();
 * const childBuilder = GraphBuilder.forParent(parentGraph);
 * type Debug = DebugOverrideValidation<typeof childBuilder, typeof MockLoggerAdapter>;
 * // Hover to see if the override is valid against the parent
 * ```
 */
export type DebugOverrideValidation<
  TBuilder extends GraphBuilder<unknown, unknown, unknown, unknown, AnyBuilderInternals>,
  TAdapter extends AdapterAny,
> =
  TBuilder extends GraphBuilder<
    infer TProvides,
    infer _TRequires,
    infer _TAsyncPorts,
    infer _TOverrides,
    infer TInternals extends AnyBuilderInternals
  >
    ? {
        /** The adapter being used for override */
        readonly adapterInfo: {
          readonly provides: AdapterProvidesName<TAdapter>;
          readonly requires: AdapterRequiresNames<TAdapter>;
          readonly lifetime: DirectAdapterLifetime<TAdapter>;
        };
        /** Current graph's provided ports */
        readonly builderProvides: TProvides;
        /** Parent's provided ports (if using forParent) */
        readonly parentProvides: GetParentProvides<TInternals>;
        /** Step 1: Check for duplicate in current graph */
        readonly step1_duplicateInCurrentGraph: HasOverlap<
          InferAdapterProvides<TAdapter>,
          TProvides
        > extends true
          ? {
              readonly found: true;
              readonly reason: "Port already exists in current graph";
            }
          : false;
        /** Step 2: Check if port exists in parent (only relevant with forParent) */
        readonly step2_existsInParent: GetParentProvides<TInternals> extends never
          ? "No parent validation (use forParent for compile-time parent checking)"
          : HasOverlap<InferAdapterProvides<TAdapter>, GetParentProvides<TInternals>> extends true
            ? { readonly found: true; readonly canOverride: true }
            : {
                readonly found: false;
                readonly reason: "Port not found in parent - cannot override";
              };
      }
    : never;
