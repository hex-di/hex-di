/**
 * Debug types that depend on merge.ts and provide.ts.
 *
 * This module is INTENTIONALLY separate from inspection.ts to break the circular
 * import chain: inspection.ts → merge.ts → builder.ts → inspection.ts
 *
 * By isolating types that depend on MergeResult and ProvideResultAllErrors,
 * we allow inspection.ts to remain free of cycle-inducing imports.
 *
 * @packageDocumentation
 */

import type { AdapterConstraint, InferAdapterProvides, Prettify } from "@hex-di/core";
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
} from "../../validation/types/index.js";
import type { GraphBuilderSignature } from "./builder-signature.js";
import type {
  DirectAdapterLifetime,
  AnyBuilderInternals,
  GetDepGraph,
  GetLifetimeMap,
  GetMaxDepth,
  GetParentProvides,
} from "./state.js";
import type { ProvideResultAllErrors } from "./provide.js";
import type { MergeResult } from "./merge.js";
import type { DebugAdapterInference } from "./inspection.js";

// =============================================================================
// Debug Types for Validation Tracing
// =============================================================================
// These types are moved here from inspection.ts because they depend on
// MergeResult and ProvideResultAllErrors, which create circular imports.

/**
 * Step-by-step validation result for debugging provide() calls.
 * @internal
 */
export type DebugProvideValidation<
  TBuilder extends GraphBuilderSignature<unknown, unknown, unknown, unknown, AnyBuilderInternals>,
  TAdapter extends AdapterConstraint,
> =
  TBuilder extends GraphBuilderSignature<
    infer TProvides,
    infer TRequires,
    infer TAsyncPorts,
    infer TOverrides,
    infer TInternalState extends AnyBuilderInternals
  >
    ? Prettify<{
        readonly adapterInfo: {
          readonly provides: AdapterProvidesName<TAdapter>;
          readonly requires: AdapterRequiresNames<TAdapter>;
          readonly lifetime: DirectAdapterLifetime<TAdapter>;
          readonly lifetimeLevel: LifetimeLevel<DirectAdapterLifetime<TAdapter>>;
        };
        readonly step1_duplicate: HasOverlap<InferAdapterProvides<TAdapter>, TProvides> extends true
          ? {
              readonly found: true;
              readonly conflictingPort: OverlappingPorts<InferAdapterProvides<TAdapter>, TProvides>;
            }
          : false;
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
        readonly finalResult: ProvideResultAllErrors<
          TProvides,
          TRequires,
          TAsyncPorts,
          TOverrides,
          TInternalState,
          TAdapter
        >;
      }>
    : never;

/**
 * Debug type for merge() validation steps.
 * @internal
 */
export type DebugMergeValidation<
  TBuilder1 extends GraphBuilderSignature<unknown, unknown, unknown, unknown, AnyBuilderInternals>,
  TBuilder2 extends GraphBuilderSignature<unknown, unknown, unknown, unknown, AnyBuilderInternals>,
> =
  TBuilder1 extends GraphBuilderSignature<
    infer TProvides1,
    infer TRequires1,
    infer TAsyncPorts1,
    infer TOverrides1,
    infer TInternals1 extends AnyBuilderInternals
  >
    ? TBuilder2 extends GraphBuilderSignature<
        infer TProvides2,
        infer TRequires2,
        infer TAsyncPorts2,
        infer TOverrides2,
        infer _TInternals2 extends AnyBuilderInternals
      >
      ? Prettify<{
          readonly builder1Provides: TProvides1;
          readonly builder2Provides: TProvides2;
          readonly step1_duplicateCheck: HasOverlap<TProvides1, TProvides2> extends true
            ? {
                readonly found: true;
                readonly conflictingPorts: OverlappingPorts<TProvides1, TProvides2>;
              }
            : false;
          readonly step2_combinedProvides: TProvides1 | TProvides2;
          readonly step3_combinedRequires: TRequires1 | TRequires2;
          readonly step4_combinedAsyncPorts: TAsyncPorts1 | TAsyncPorts2;
          readonly step5_combinedOverrides: TOverrides1 | TOverrides2;
          readonly finalResult: MergeResult<
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
        }>
      : never
    : never;

/**
 * Complete debug view of provide() validation for troubleshooting.
 * @internal
 */
export type DebugProvideResult<
  TBuilder extends GraphBuilderSignature<unknown, unknown, unknown, unknown, AnyBuilderInternals>,
  TAdapter extends AdapterConstraint,
> =
  TBuilder extends GraphBuilderSignature<
    infer TProvides,
    infer TRequires,
    infer TAsyncPorts,
    infer TOverrides,
    infer TInternalState extends AnyBuilderInternals
  >
    ? Prettify<{
        readonly input: {
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
          readonly adapterInfo: DebugAdapterInference<TAdapter>;
        };
        readonly validation: {
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
        readonly result: {
          readonly value: ProvideResultAllErrors<
            TProvides,
            TRequires,
            TAsyncPorts,
            TOverrides,
            TInternalState,
            TAdapter
          >;
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
