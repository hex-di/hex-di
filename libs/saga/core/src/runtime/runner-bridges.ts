/**
 * Runner Bridge Functions
 *
 * Overloaded functions for type-safe boundaries in the saga runner.
 * Concentrates type-erased boundaries in documented bridge functions.
 *
 * @packageDocumentation
 */

import { ResultAsync } from "@hex-di/result";
import type { SagaSuccess, SagaError, ManagementError, SagaStatus } from "../errors/types.js";
import type { AnySagaDefinition, SagaNode } from "../saga/types.js";
import type { SagaRunner } from "./types.js";

// =============================================================================
// Port Invocation
// =============================================================================

/**
 * Type guard for objects that have an `execute` method.
 */
export function hasExecuteMethod(
  service: unknown
): service is { execute: (params: unknown) => unknown } {
  if (typeof service !== "object" || service === null || !("execute" in service)) {
    return false;
  }
  return typeof service.execute === "function";
}

/**
 * Type guard for branch selector callbacks stored as unknown.
 */
export function isBranchSelector(
  value: unknown
): value is (ctx: {
  input: unknown;
  results: unknown;
  stepIndex: number;
  executionId: string;
}) => string {
  return typeof value === "function";
}

/**
 * Type guard for input mapper callbacks stored as unknown.
 */
export function isInputMapper(
  value: unknown
): value is (ctx: {
  input: unknown;
  results: unknown;
  stepIndex: number;
  executionId: string;
}) => unknown {
  return typeof value === "function";
}

// =============================================================================
// Node Extraction
// =============================================================================

/**
 * Extracts execution nodes from a saga definition.
 * The builder stores _nodes on the frozen object for runtime traversal.
 */
function isSagaNodeArray(value: unknown): value is readonly SagaNode[] {
  return Array.isArray(value);
}

export function extractNodes(saga: AnySagaDefinition): readonly SagaNode[] {
  const descriptor = Object.getOwnPropertyDescriptor(saga, "_nodes");
  if (descriptor && isSagaNodeArray(descriptor.value)) {
    return descriptor.value;
  }
  return saga.steps.map(
    (step): SagaNode => ({
      _type: "step",
      step,
    })
  );
}

// =============================================================================
// ResultAsync Narrowing Bridges
// =============================================================================

/**
 * Narrows the execute return type from a runner.
 * Uses the overload pattern to bridge from the type-erased runner result
 * to the typed result expected by the public API.
 */
export function narrowRunnerExecute<TOutput, TError>(
  result: ReturnType<SagaRunner["execute"]>
): ResultAsync<SagaSuccess<TOutput>, SagaError<TError>>;
export function narrowRunnerExecute(
  result: ReturnType<SagaRunner["execute"]>
): ReturnType<SagaRunner["execute"]> {
  return result;
}

/**
 * Narrows the resume return type from a runner.
 */
export function narrowRunnerResume<TOutput, TError>(
  result: ReturnType<SagaRunner["resume"]>
): ResultAsync<SagaSuccess<TOutput>, SagaError<TError>>;
export function narrowRunnerResume(
  result: ReturnType<SagaRunner["resume"]>
): ReturnType<SagaRunner["resume"]> {
  return result;
}

/**
 * Creates a typed error ResultAsync for resume-not-implemented.
 */
export function createResumeNotImplemented(executionId: string): ReturnType<SagaRunner["resume"]> {
  const error: SagaError<unknown> = {
    _tag: "StepFailed",
    executionId,
    sagaName: "",
    stepName: "",
    stepIndex: -1,
    message: "Resume not implemented without persistence adapter",
    completedSteps: [],
    compensatedSteps: [],
    cause: new Error("Resume requires persistence adapter"),
  };
  return ResultAsync.err(error);
}

/**
 * Typed ok ResultAsync<void, ManagementError>.
 */
export function okVoidManagement(): ResultAsync<void, ManagementError> {
  return ResultAsync.ok(undefined);
}

/**
 * Typed err ResultAsync<void, ManagementError>.
 */
export function errVoidManagement(error: ManagementError): ResultAsync<void, ManagementError> {
  return ResultAsync.err(error);
}

/**
 * Typed ok ResultAsync<SagaStatus, ManagementError>.
 */
export function okStatusManagement(status: SagaStatus): ResultAsync<SagaStatus, ManagementError> {
  return ResultAsync.ok(status);
}

/**
 * Typed err ResultAsync<SagaStatus, ManagementError>.
 */
export function errStatusManagement(
  error: ManagementError
): ResultAsync<SagaStatus, ManagementError> {
  return ResultAsync.err(error);
}
