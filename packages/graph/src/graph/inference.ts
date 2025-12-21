
import type { Port } from "@hex-di/ports";
import type { GraphBuilder } from "./builder";
import type { Graph } from "./types";

/**
 * Extracts the provided ports from a Graph or GraphBuilder.
 * 
 * @typeParam G - The Graph or GraphBuilder type to extract from
 * @returns The union of provided Port types, or never if none or not a valid type
 */
export type InferGraphProvides<G> = G extends Graph<infer P, any>
  ? P
  : G extends GraphBuilder<infer P, any, any>
  ? P
  : never;

/**
 * Extracts the required ports from a GraphBuilder.
 * 
 * @typeParam G - The GraphBuilder type to extract from
 * @returns The union of required Port types, or never if none or not a valid type
 * @remarks Compiled Graphs do not track requirements as they are validated and satisfied.
 */
export type InferGraphRequires<G> = G extends GraphBuilder<any, infer R, any>
  ? R
  : never;
