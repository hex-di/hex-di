import type { Graph } from "./types.js";

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
