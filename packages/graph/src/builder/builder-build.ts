/**
 * Build Functions for GraphBuilder.
 *
 * This module provides standalone functions for finalizing buildable graphs
 * into frozen Graph objects. Functions return Result types for recoverable
 * error handling, with throwing wrappers that preserve structured error payloads.
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
import {
  CyclicDependencyBuild,
  CaptiveDependencyBuild,
  GraphBuildException,
} from "../errors/index.js";
import type { GraphBuildError } from "../errors/index.js";
import { emitAuditEvent } from "../audit/global-sink.js";
import { createCorrelationIdGenerator } from "../graph/inspection/correlation.js";

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
 * @param buildable - The graph state to validate
 * @returns `Ok(undefined)` if valid, `Err(GraphBuildError)` if invalid
 *
 * @internal
 */
export function validateBuildable(buildable: BuildableGraph): Result<void, GraphBuildError> {
  const inspection = inspectGraph(buildable);
  const auditGenerator = createCorrelationIdGenerator();
  const auditCorrelationId = auditGenerator();
  const timestamp = new Date().toISOString();

  // Check for cycles only when depth limit was exceeded (type system handles normal cases)
  if (inspection.depthLimitExceeded) {
    const cycle = detectCycleAtRuntime(buildable.adapters);

    // Emit depth fallback provenance event
    emitAuditEvent({
      type: "graph.depth.fallback",
      timestamp,
      correlationId: auditCorrelationId,
      maxChainDepth: inspection.maxChainDepth,
      depthLimit: 50,
      runtimeCycleDetected: cycle !== null,
    });

    if (cycle) {
      const buildError = CyclicDependencyBuild({
        cyclePath: cycle,
        message: formatCycleError(cycle),
      });

      emitAuditEvent({
        type: "graph.validation.decision",
        timestamp,
        correlationId: auditCorrelationId,
        validation: {
          result: "fail",
          errors: [
            { tag: buildError._tag, message: buildError.message, details: { cyclePath: cycle } },
          ],
        },
        cycleCheckPerformed: true,
        captiveCheckPerformed: false,
      });

      return err(buildError);
    }
  }

  // ALWAYS check for captive dependencies as defense-in-depth.
  // This catches forward reference scenarios that may bypass compile-time validation,
  // even when depth limit is not exceeded.
  const captive = detectCaptiveAtRuntime(buildable.adapters);
  if (captive) {
    const buildError = CaptiveDependencyBuild({
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
    });

    emitAuditEvent({
      type: "graph.validation.decision",
      timestamp,
      correlationId: auditCorrelationId,
      validation: {
        result: "fail",
        errors: [{ tag: buildError._tag, message: buildError.message, details: { ...captive } }],
      },
      cycleCheckPerformed: inspection.depthLimitExceeded,
      captiveCheckPerformed: true,
    });

    return err(buildError);
  }

  // Validation passed
  emitAuditEvent({
    type: "graph.validation.decision",
    timestamp,
    correlationId: auditCorrelationId,
    validation: { result: "pass" },
    cycleCheckPerformed: inspection.depthLimitExceeded,
    captiveCheckPerformed: true,
  });

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
// Throwing Build Functions
// =============================================================================

/**
 * Builds a graph after validating dependencies at runtime.
 *
 * @param buildable - The graph state to build
 * @returns A frozen graph object
 * @throws {GraphBuildException} If a circular or captive dependency is detected at runtime
 *
 * @internal
 */
export function buildGraph(buildable: BuildableGraph): BuiltGraph {
  const result = tryBuildGraph(buildable);
  if (result.isErr()) {
    const timestamp = new Date().toISOString();
    const generator = createCorrelationIdGenerator();
    const correlationId = generator();

    emitAuditEvent({
      type: "graph.build.attempt",
      timestamp,
      correlationId,
      adapterCount: buildable.adapters.length,
      outcome: "failure",
      error: {
        tag: result.error._tag,
        message: result.error.message,
        details: { ...result.error },
      },
    });

    throw new GraphBuildException(result.error);
  }

  emitAuditEvent({
    type: "graph.build.attempt",
    timestamp: new Date().toISOString(),
    correlationId: createCorrelationIdGenerator()(),
    adapterCount: buildable.adapters.length,
    outcome: "success",
  });

  return result.value;
}

/**
 * Builds a graph fragment without validating all dependencies are satisfied.
 *
 * Used for child containers where dependencies may be satisfied by the parent.
 * Still performs cycle and captive detection as a safety net.
 *
 * @param buildable - The graph state to build
 * @returns A frozen graph object
 * @throws {GraphBuildException} If a circular or captive dependency is detected at runtime
 *
 * @internal
 */
export function buildGraphFragment(buildable: BuildableGraph): BuiltGraph {
  const result = tryBuildGraphFragment(buildable);
  if (result.isErr()) {
    const timestamp = new Date().toISOString();
    const generator = createCorrelationIdGenerator();
    const correlationId = generator();

    emitAuditEvent({
      type: "graph.build.attempt",
      timestamp,
      correlationId,
      adapterCount: buildable.adapters.length,
      outcome: "failure",
      error: {
        tag: result.error._tag,
        message: result.error.message,
        details: { ...result.error },
      },
    });

    throw new GraphBuildException(result.error);
  }

  emitAuditEvent({
    type: "graph.build.attempt",
    timestamp: new Date().toISOString(),
    correlationId: createCorrelationIdGenerator()(),
    adapterCount: buildable.adapters.length,
    outcome: "success",
  });

  return result.value;
}
