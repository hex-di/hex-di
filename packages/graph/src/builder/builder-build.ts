/**
 * Build Functions for GraphBuilder.
 *
 * This module provides standalone functions for finalizing buildable graphs
 * into frozen Graph objects. Functions return Result types for recoverable
 * error handling, with throwing wrappers for backward compatibility.
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

import type { AdapterConstraint } from "@hex-di/core";
import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { BuildableGraph } from "./builder-types.js";
import {
  inspectGraph,
  detectCycleAtRuntime,
  detectCaptiveAtRuntime,
  formatCycleError,
  formatCaptiveError,
} from "../graph/inspection/index.js";
import { CyclicDependencyBuild, CaptiveDependencyBuild } from "../errors/index.js";
import type { GraphBuildError } from "../errors/index.js";

/**
 * Validates a buildable graph at runtime, returning a Result.
 *
 * This function performs runtime validation that complements the type-level
 * validation. It is called by both `tryBuildGraph` and `tryBuildGraphFragment`
 * to ensure consistent validation behavior.
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
 * @pure No side effects.
 *
 * @param buildable - The graph state to validate
 * @returns `Ok(undefined)` if valid, `Err(GraphBuildError)` if invalid
 *
 * @internal
 */
export function validateBuildable(buildable: BuildableGraph): Result<void, GraphBuildError> {
  const inspection = inspectGraph(buildable);

  // Check for cycles only when depth limit was exceeded (type system handles normal cases)
  if (inspection.depthLimitExceeded) {
    const cycle = detectCycleAtRuntime(buildable.adapters);
    if (cycle) {
      return err(
        CyclicDependencyBuild({
          cyclePath: cycle,
          message: formatCycleError(cycle),
        })
      );
    }
  }

  // ALWAYS check for captive dependencies as defense-in-depth.
  // This catches forward reference scenarios that may bypass compile-time validation,
  // even when depth limit is not exceeded.
  const captive = detectCaptiveAtRuntime(buildable.adapters);
  if (captive) {
    return err(
      CaptiveDependencyBuild({
        dependentPort: captive.dependentPort,
        dependentLifetime: captive.dependentLifetime,
        captivePort: captive.captivePort,
        captiveLifetime: captive.captiveLifetime,
        message: formatCaptiveError(
          captive.dependentPort,
          captive.dependentLifetime,
          captive.captivePort,
          captive.captiveLifetime
        ),
      })
    );
  }

  return ok(undefined);
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

// =============================================================================
// Result-based Build Functions
// =============================================================================

/**
 * Builds a graph after validating dependencies at runtime, returning a Result.
 *
 * @pure Returns frozen Result. No side effects.
 *
 * @param buildable - The graph state to build
 * @returns `Ok(BuiltGraph)` if valid, `Err(GraphBuildError)` if invalid
 *
 * @internal
 */
export function tryBuildGraph(buildable: BuildableGraph): Result<BuiltGraph, GraphBuildError> {
  return validateBuildable(buildable).map(() =>
    Object.freeze({
      adapters: buildable.adapters,
      overridePortNames: buildable.overridePortNames,
    })
  );
}

/**
 * Builds a graph fragment after validating at runtime, returning a Result.
 *
 * Used for child containers where dependencies may be satisfied by the parent.
 * Still performs cycle and captive detection as a safety net.
 *
 * @pure Returns frozen Result. No side effects.
 *
 * @param buildable - The graph state to build
 * @returns `Ok(BuiltGraph)` if valid, `Err(GraphBuildError)` if invalid
 *
 * @internal
 */
export function tryBuildGraphFragment(
  buildable: BuildableGraph
): Result<BuiltGraph, GraphBuildError> {
  return validateBuildable(buildable).map(() =>
    Object.freeze({
      adapters: buildable.adapters,
      overridePortNames: buildable.overridePortNames,
    })
  );
}

// =============================================================================
// Throwing Build Functions (backward-compatible wrappers)
// =============================================================================

/**
 * Builds a graph after validating dependencies at runtime.
 *
 * @pure Returns frozen object. May throw for cycles or captive dependencies.
 *
 * @param buildable - The graph state to build
 * @returns A frozen graph object
 * @throws {Error} If a circular or captive dependency is detected at runtime
 *
 * @internal
 */
export function buildGraph(buildable: BuildableGraph): BuiltGraph {
  const result = tryBuildGraph(buildable);
  if (result.isErr()) {
    throw new Error(result.error.message);
  }
  return result.value;
}

/**
 * Builds a graph fragment without validating all dependencies are satisfied.
 *
 * Used for child containers where dependencies may be satisfied by the parent.
 * Still performs cycle and captive detection as a safety net.
 *
 * @pure Returns frozen object. May throw for cycles or captive dependencies.
 *
 * @param buildable - The graph state to build
 * @returns A frozen graph object
 * @throws {Error} If a circular or captive dependency is detected at runtime
 *
 * @internal
 */
export function buildGraphFragment(buildable: BuildableGraph): BuiltGraph {
  const result = tryBuildGraphFragment(buildable);
  if (result.isErr()) {
    throw new Error(result.error.message);
  }
  return result.value;
}
