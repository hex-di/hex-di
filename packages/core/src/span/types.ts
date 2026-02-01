/**
 * Resolution span types for structured tracing.
 *
 * Provides a tree-structured representation of resolution traces,
 * enabling visualization of dependency hierarchies and timing analysis.
 *
 * @packageDocumentation
 */

import type { Lifetime } from "../adapters/types.js";

/**
 * A structured span representing a single resolution with its children.
 *
 * Unlike flat TraceEntry, ResolutionSpan includes nested children,
 * forming a tree structure that mirrors the dependency resolution graph.
 *
 * @example
 * ```typescript
 * const span: ResolutionSpan = {
 *   id: "trace-1",
 *   portName: "UserService",
 *   duration: 15,
 *   isCacheHit: false,
 *   lifetime: "singleton",
 *   children: [
 *     {
 *       id: "trace-2",
 *       portName: "Logger",
 *       duration: 5,
 *       isCacheHit: true,
 *       lifetime: "singleton",
 *       children: [],
 *     },
 *     {
 *       id: "trace-3",
 *       portName: "Database",
 *       duration: 10,
 *       isCacheHit: false,
 *       lifetime: "singleton",
 *       children: [],
 *     },
 *   ],
 * };
 * ```
 */
export interface ResolutionSpan {
  /** Unique identifier for this span */
  readonly id: string;
  /** Name of the port that was resolved */
  readonly portName: string;
  /** Duration of resolution in milliseconds (including children) */
  readonly duration: number;
  /** Whether the resolution was served from cache */
  readonly isCacheHit: boolean;
  /** Lifetime of the resolved service */
  readonly lifetime: Lifetime;
  /** Scope ID where resolution occurred, or null for container-level */
  readonly scopeId: string | null;
  /** High-resolution start time (Date.now()) */
  readonly startTime: number;
  /** Nested child spans (dependencies resolved during this resolution) */
  readonly children: readonly ResolutionSpan[];
}
