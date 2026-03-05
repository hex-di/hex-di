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
import { getPortMetadata } from "@hex-di/core";
import { ok, err } from "@hex-di/result";
import type { Result } from "@hex-di/result";
import type { BuildableGraph } from "./builder-types.js";
import {
  inspectGraph,
  detectCycleAtRuntime,
  detectCaptiveAtRuntime,
  formatCaptiveError,
  formatEnhancedCycleErrors,
} from "../graph/inspection/index.js";
import {
  CaptiveDependencyBuild,
  MissingOperationBuild,
  GraphBuildException,
} from "../errors/index.js";
import type { GraphBuildError, MissingOperationBuildError } from "../errors/index.js";
import { emitAuditEvent } from "../audit/global-sink.js";
import { createCorrelationIdGenerator } from "../graph/inspection/correlation.js";
import { checkOperationCompleteness } from "../validation/runtime/operation-check.js";

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
 *    - Produces enhanced errors with ASCII diagrams and refactoring suggestions
 *
 * 2. **Captive dependency detection** (always):
 *    - Checks that singletons don't depend on scoped/transient services
 *    - Run unconditionally as defense-in-depth against type system bypasses
 *
 * 3. **Operation completeness** (opt-in):
 *    - When ports declare `methods` metadata, verifies all method names are present
 *    - Runs a lightweight probe (instantiates factory with empty deps) to check keys
 *    - Skipped for ports without `methods` metadata
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
      // Use enhanced cycle error formatting with diagrams and suggestions
      const enhancedError = formatEnhancedCycleErrors(buildable.adapters);

      if (enhancedError) {
        emitAuditEvent({
          type: "graph.validation.decision",
          timestamp,
          correlationId: auditCorrelationId,
          validation: {
            result: "fail",
            errors: [
              { tag: enhancedError._tag, message: enhancedError.message, details: { cycle } },
            ],
          },
          cycleCheckPerformed: true,
          captiveCheckPerformed: false,
        });

        return err(enhancedError);
      }
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

  // Check operation completeness for adapters with method metadata (opt-in).
  // This uses the adapter's factory to produce a test instance, then verifies
  // all declared methods are present on the returned object.
  const operationError = checkAdapterOperationCompleteness(buildable.adapters);
  if (operationError) {
    emitAuditEvent({
      type: "graph.validation.decision",
      timestamp,
      correlationId: auditCorrelationId,
      validation: {
        result: "fail",
        errors: [
          {
            tag: operationError._tag,
            message: operationError.message,
            details: {
              portName: operationError.portName,
              missingMethods: operationError.missingMethods,
            },
          },
        ],
      },
      cycleCheckPerformed: inspection.depthLimitExceeded,
      captiveCheckPerformed: true,
    });

    return err(operationError);
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
 * Probes an adapter's factory with a no-op proxy to get a test instance.
 *
 * This is inherently an unsafe operation since the factory signature
 * expects specific dependency types. The proxy intercepts all property
 * access and returns no-op functions, which is sufficient for checking
 * whether method names exist on the return value.
 *
 * @param factory - The adapter factory to probe
 * @returns The factory return value, or undefined if probing failed
 */
function probeFactory(factory: (...args: never[]) => unknown): unknown {
  const emptyDeps = new Proxy(
    {},
    {
      get() {
        // Return a no-op proxy for any dependency access
        return new Proxy(() => {}, {
          get() {
            return () => {};
          },
          apply() {
            return undefined;
          },
        });
      },
    }
  );

  // The factory expects `never[]` args, but we pass the proxy as a single arg.
  // This works at runtime because JavaScript doesn't enforce parameter types.
  // We use Function.prototype.call to invoke without triggering TS parameter checks.
  return Function.prototype.call.call(factory, undefined, emptyDeps);
}

/**
 * Checks all adapters for operation completeness.
 *
 * For each adapter whose port declares `methods` metadata, instantiates
 * the factory with an empty deps object and verifies all methods are present.
 *
 * Only runs for adapters with sync factories since async factories
 * cannot be probed at build time.
 *
 * @param adapters - The adapters to check
 * @returns The first MissingOperationBuildError found, or undefined
 *
 * @internal
 */
function checkAdapterOperationCompleteness(
  adapters: readonly AdapterConstraint[]
): MissingOperationBuildError | undefined {
  for (const adapter of adapters) {
    const metadata = getPortMetadata(adapter.provides);

    // Skip if no methods metadata (opt-in)
    if (metadata?.methods === undefined || metadata.methods.length === 0) {
      continue;
    }

    // Only probe sync factories -- async factories cannot be checked at build time
    if (adapter.factoryKind === "async") {
      continue;
    }

    // Attempt to probe the factory with an empty deps proxy
    try {
      const instance = probeFactory(adapter.factory);
      const missing = checkOperationCompleteness(adapter, instance);

      if (missing.length > 0) {
        return MissingOperationBuild({
          portName: adapter.provides.__portName,
          missingMethods: missing,
          message:
            `Adapter for port '${adapter.provides.__portName}' is missing operations: ` +
            `${missing.join(", ")}. ` +
            `The port declares methods [${metadata.methods.join(", ")}] but the factory ` +
            `did not return an object implementing all of them.`,
        });
      }
    } catch {
      // If factory throws during probe, skip completeness check for this adapter.
      // The factory may require real dependencies to function.
      continue;
    }
  }

  return undefined;
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
