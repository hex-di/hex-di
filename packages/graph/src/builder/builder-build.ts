/**
 * Build Functions for GraphBuilder.
 *
 * This module provides standalone functions for finalizing buildable graphs
 * into frozen Graph objects. These functions are pure (except for throwing
 * on cycle detection) and return frozen objects.
 *
 * ## Design Pattern
 *
 * Following the pattern from `inspection/core.ts`:
 * - Functions operate on structural `BuildableGraph` interface
 * - Functions return frozen `BuiltGraph` objects
 * - GraphBuilder methods delegate to these functions
 * - This enables testing and composition without the class
 *
 * @packageDocumentation
 */

import type { AdapterConstraint } from "../adapter/index.js";
import type { BuildableGraph } from "./builder-types.js";
import {
  inspectGraph,
  detectCycleAtRuntime,
  detectCaptiveAtRuntime,
  formatCycleError,
  formatCaptiveError,
} from "../graph/inspection/index.js";

/**
 * Validates a buildable graph at runtime.
 *
 * This function performs runtime validation that complements the type-level
 * validation. It is called by both `buildGraph` and `buildGraphFragment` to
 * ensure consistent validation behavior.
 *
 * Validation performed:
 * 1. **Cycle detection** (when depth limit exceeded):
 *    - Type-level cycle detection has a depth limit
 *    - If exceeded, runtime detection catches cycles the type system missed
 *
 * 2. **Captive dependency detection** (always):
 *    - Checks that singletons don't depend on scoped/transient services
 *    - Run unconditionally as defense-in-depth against type system bypasses
 *
 * @pure No side effects, but may throw errors.
 *
 * @param buildable - The graph state to validate
 * @throws {Error} With HEX002 if circular dependency detected
 * @throws {Error} With HEX003 if captive dependency detected
 *
 * @internal
 */
export function validateBuildable(buildable: BuildableGraph): void {
  const inspection = inspectGraph(buildable);

  // Check for cycles only when depth limit was exceeded (type system handles normal cases)
  if (inspection.depthLimitExceeded) {
    const cycle = detectCycleAtRuntime(buildable.adapters);
    if (cycle) {
      // Use standardized error format (matches compile-time errors)
      throw new Error(formatCycleError(cycle));
    }
  }

  // ALWAYS check for captive dependencies as defense-in-depth.
  // This catches forward reference scenarios that may bypass compile-time validation,
  // even when depth limit is not exceeded.
  const captive = detectCaptiveAtRuntime(buildable.adapters);
  if (captive) {
    // Use standardized error format (matches compile-time errors)
    throw new Error(
      formatCaptiveError(
        captive.dependentPort,
        captive.dependentLifetime,
        captive.captivePort,
        captive.captiveLifetime
      )
    );
  }
}

/**
 * Structure of a built, frozen graph.
 *
 * This is the runtime shape of a Graph - a frozen object with adapters
 * and override port names. The phantom type parameters from the Graph
 * type (TProvides, TAsyncPorts, TOverrides) exist only at the type level.
 *
 * @internal
 */
export interface BuiltGraph {
  readonly adapters: readonly AdapterConstraint[];
  readonly overridePortNames: ReadonlySet<string>;
}

/**
 * Builds a graph after validating dependencies at runtime.
 *
 * This function performs the same runtime checks as GraphBuilder.build():
 * - Checks if depth limit was exceeded (type-level detection may have false negatives)
 * - Performs runtime cycle detection if depth limit was exceeded
 * - Throws if a cycle is detected
 *
 * Note: Most validation happens at the type level through GraphBuilder's
 * conditional return types. This function provides runtime safety net.
 *
 * @pure Returns frozen object. May throw for cycles.
 *
 * @param buildable - The graph state to build
 * @returns A frozen graph object
 * @throws {Error} If a circular dependency is detected at runtime
 *
 * @example
 * ```typescript
 * const graph = buildGraph({
 *   adapters: [LoggerAdapter, DatabaseAdapter],
 *   overridePortNames: new Set()
 * });
 * ```
 *
 * @internal
 */
export function buildGraph(buildable: BuildableGraph): BuiltGraph {
  // Validate using shared logic
  validateBuildable(buildable);

  return Object.freeze({
    adapters: buildable.adapters,
    overridePortNames: buildable.overridePortNames,
  });
}

/**
 * Builds a graph fragment without validating all dependencies are satisfied.
 *
 * This function is used for child containers where dependencies may be
 * satisfied by the parent. It still performs cycle detection as a safety net.
 *
 * @pure Returns frozen object. May throw for cycles.
 *
 * @param buildable - The graph state to build
 * @returns A frozen graph object
 * @throws {Error} If a circular dependency is detected at runtime
 *
 * @example
 * ```typescript
 * // Child graph - dependencies come from parent
 * const fragment = buildGraphFragment({
 *   adapters: [ConfigAdapter],  // Requires Logger from parent
 *   overridePortNames: new Set()
 * });
 * ```
 *
 * @internal
 */
export function buildGraphFragment(buildable: BuildableGraph): BuiltGraph {
  // Validate using shared logic
  validateBuildable(buildable);

  return Object.freeze({
    adapters: buildable.adapters,
    overridePortNames: buildable.overridePortNames,
  });
}
