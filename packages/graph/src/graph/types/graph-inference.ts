/**
 * Graph type inference utilities.
 *
 * This module provides type-level utilities for extracting type information
 * from Graph and GraphBuilder instances. These utilities enable type-safe
 * operations on graphs without knowing their exact type parameters.
 *
 * @packageDocumentation
 */

import type { Graph } from "./graph-types.js";

/**
 * Extracts the provided ports from a Graph or GraphBuilder.
 *
 * Uses phantom type properties for reliable inference across class types.
 *
 * @typeParam G - The Graph or GraphBuilder type to extract from
 * @returns The union of provided Port types, or never if none or not a valid type
 */
export type InferGraphProvides<TGraph> = TGraph extends { __provides: infer TProvides }
  ? TProvides
  : TGraph extends Graph<infer TProvides, infer _TAsync, infer _TOverrides>
    ? TProvides
    : never;

/**
 * Extracts the required ports from a GraphBuilder.
 *
 * Uses phantom type properties for reliable inference across class types.
 *
 * @typeParam G - The GraphBuilder type to extract from
 * @returns The union of required Port types, or never if none or not a valid type
 * @remarks Compiled Graphs do not track requirements as they are validated and satisfied.
 */
export type InferGraphRequires<TGraph> = TGraph extends { __requires: infer TRequires }
  ? TRequires
  : never;

/**
 * Extracts the async ports from a Graph or GraphBuilder.
 *
 * @typeParam G - The Graph or GraphBuilder type to extract from
 * @returns The union of async Port types, or never if none
 */
export type InferGraphAsyncPorts<TGraph> = TGraph extends { __asyncPorts: infer TAsync }
  ? TAsync
  : TGraph extends Graph<infer _TProvides, infer TAsync, infer _TOverrides>
    ? TAsync
    : never;

/**
 * Extracts the override ports from a Graph or GraphBuilder.
 *
 * Override ports are those added via `override()` method in child graphs.
 * They replace parent adapters rather than extending the container.
 *
 * @typeParam G - The Graph or GraphBuilder type to extract from
 * @returns The union of override Port types, or never if none
 */
export type InferGraphOverrides<TGraph> = TGraph extends { __overrides: infer TOverrides }
  ? TOverrides
  : TGraph extends Graph<infer _TProvides, infer _TAsync, infer TOverrides>
    ? TOverrides
    : never;

// =============================================================================
// Debug Inference Types
// =============================================================================
//
// These types mirror the inference types above but are wrapped in a diagnostic
// object for IDE tooltip inspection. Use these when debugging type inference
// issues to understand what types are being extracted.
//

/**
 * Debug version of InferGraphProvides for type inspection.
 *
 * Use this type to diagnose inference issues by hovering in your IDE.
 *
 * @example
 * ```typescript
 * const builder = GraphBuilder.create().provide(LoggerAdapter);
 * type Debug = DebugInferGraphProvides<typeof builder>;
 * // Hover to see: { extracted: LoggerPort; sourceType: "phantom" }
 * ```
 */
export type DebugInferGraphProvides<TGraph> = TGraph extends { __provides: infer TProvides }
  ? { readonly extracted: TProvides; readonly sourceType: "phantom" }
  : TGraph extends Graph<infer TProvides, infer _TAsync, infer _TOverrides>
    ? { readonly extracted: TProvides; readonly sourceType: "Graph" }
    : { readonly extracted: never; readonly sourceType: "unknown" };

/**
 * Debug version of InferGraphRequires for type inspection.
 *
 * @example
 * ```typescript
 * const builder = GraphBuilder.create().provide(UserServiceAdapter);
 * type Debug = DebugInferGraphRequires<typeof builder>;
 * // Hover to see: { extracted: DatabasePort | LoggerPort; sourceType: "phantom" }
 * ```
 */
export type DebugInferGraphRequires<TGraph> = TGraph extends { __requires: infer TRequires }
  ? { readonly extracted: TRequires; readonly sourceType: "phantom" }
  : { readonly extracted: never; readonly sourceType: "notGraphBuilder" };

/**
 * Debug version of InferGraphAsyncPorts for type inspection.
 *
 * @example
 * ```typescript
 * const builder = GraphBuilder.create().provideAsync(AsyncDbAdapter);
 * type Debug = DebugInferGraphAsyncPorts<typeof builder>;
 * // Hover to see: { extracted: DatabasePort; sourceType: "phantom" }
 * ```
 */
export type DebugInferGraphAsyncPorts<TGraph> = TGraph extends { __asyncPorts: infer TAsync }
  ? { readonly extracted: TAsync; readonly sourceType: "phantom" }
  : TGraph extends Graph<infer _TProvides, infer TAsync, infer _TOverrides>
    ? { readonly extracted: TAsync; readonly sourceType: "Graph" }
    : { readonly extracted: never; readonly sourceType: "unknown" };

/**
 * Debug version of InferGraphOverrides for type inspection.
 *
 * @example
 * ```typescript
 * const childBuilder = GraphBuilder.forParent(parent).override(MockLoggerAdapter);
 * type Debug = DebugInferGraphOverrides<typeof childBuilder>;
 * // Hover to see: { extracted: LoggerPort; sourceType: "phantom" }
 * ```
 */
export type DebugInferGraphOverrides<TGraph> = TGraph extends { __overrides: infer TOverrides }
  ? { readonly extracted: TOverrides; readonly sourceType: "phantom" }
  : TGraph extends Graph<infer _TProvides, infer _TAsync, infer TOverrides>
    ? { readonly extracted: TOverrides; readonly sourceType: "Graph" }
    : { readonly extracted: never; readonly sourceType: "unknown" };
