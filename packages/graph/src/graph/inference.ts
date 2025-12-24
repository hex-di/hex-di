import type { Graph } from "./types";

/**
 * Extracts the provided ports from a Graph or GraphBuilder.
 *
 * Uses phantom type properties for reliable inference across class types.
 *
 * @typeParam G - The Graph or GraphBuilder type to extract from
 * @returns The union of provided Port types, or never if none or not a valid type
 */
export type InferGraphProvides<G> = G extends { __provides: infer P }
  ? P
  : G extends Graph<infer P, infer _A, infer _O>
    ? P
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
export type InferGraphRequires<G> = G extends { __requires: infer R } ? R : never;

/**
 * Extracts the async ports from a Graph or GraphBuilder.
 *
 * @typeParam G - The Graph or GraphBuilder type to extract from
 * @returns The union of async Port types, or never if none
 */
export type InferGraphAsyncPorts<G> = G extends { __asyncPorts: infer A }
  ? A
  : G extends Graph<infer _P, infer A, infer _O>
    ? A
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
export type InferGraphOverrides<G> = G extends { __overrides: infer O }
  ? O
  : G extends Graph<infer _P, infer _A, infer O>
    ? O
    : never;
