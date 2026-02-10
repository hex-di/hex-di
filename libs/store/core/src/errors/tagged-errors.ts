/**
 * Tagged Union Error Types for @hex-di/store.
 *
 * All store errors are frozen plain objects with a `_tag` discriminant
 * for exhaustive pattern matching via `switch`/`match`.
 *
 * @packageDocumentation
 */

import { createError } from "@hex-di/result";

// =============================================================================
// Thrown Errors (programming / operational errors, thrown at call sites)
// =============================================================================

/**
 * Thrown when accessing state/value/actions/subscribe on a disposed service.
 */
const _DisposedStateAccess = createError("DisposedStateAccess");
export const DisposedStateAccess = (fields: {
  readonly portName: string;
  readonly containerName: string;
  readonly operation: "state" | "value" | "actions" | "subscribe" | "set" | "update" | "refresh";
}): DisposedStateAccess =>
  _DisposedStateAccess({
    ...fields,
    code: "DISPOSED_STATE_ACCESS" as const,
    isProgrammingError: true as const,
    message: `Cannot access '${fields.operation}' on port '${fields.portName}' from disposed container '${fields.containerName}'.`,
  });
export type DisposedStateAccess = Readonly<{
  _tag: "DisposedStateAccess";
  portName: string;
  containerName: string;
  operation: "state" | "value" | "actions" | "subscribe" | "set" | "update" | "refresh";
  code: "DISPOSED_STATE_ACCESS";
  isProgrammingError: true;
  message: string;
}>;

/**
 * Thrown when a derived adapter's select function throws during recomputation.
 */
const _DerivedComputationFailed = createError("DerivedComputationFailed");
export const DerivedComputationFailed = (fields: {
  readonly portName: string;
  readonly cause: unknown;
}): DerivedComputationFailed => {
  const causeMessage = fields.cause instanceof Error ? fields.cause.message : String(fields.cause);
  return _DerivedComputationFailed({
    ...fields,
    code: "DERIVED_COMPUTATION_FAILED" as const,
    isProgrammingError: false as const,
    message: `Derived computation for port '${fields.portName}' failed: ${causeMessage}`,
  });
};
export type DerivedComputationFailed = Readonly<{
  _tag: "DerivedComputationFailed";
  portName: string;
  cause: unknown;
  code: "DERIVED_COMPUTATION_FAILED";
  isProgrammingError: false;
  message: string;
}>;

/**
 * Thrown when async derived select throws (not returns Err) after all retries.
 * This is a programming error -- select should return ResultAsync.err().
 */
const _AsyncDerivedExhausted = createError("AsyncDerivedExhausted");
export const AsyncDerivedExhausted = (fields: {
  readonly portName: string;
  readonly attempts: number;
  readonly cause: unknown;
}): AsyncDerivedExhausted => {
  const causeMessage = fields.cause instanceof Error ? fields.cause.message : String(fields.cause);
  return _AsyncDerivedExhausted({
    ...fields,
    code: "ASYNC_DERIVED_EXHAUSTED" as const,
    isProgrammingError: true as const,
    message:
      `Async derived port '${fields.portName}' select function threw after ${fields.attempts} attempts` +
      ` (select should return ResultAsync.err(), not throw): ${causeMessage}`,
  });
};
export type AsyncDerivedExhausted = Readonly<{
  _tag: "AsyncDerivedExhausted";
  portName: string;
  attempts: number;
  cause: unknown;
  code: "ASYNC_DERIVED_EXHAUSTED";
  isProgrammingError: true;
  message: string;
}>;

/**
 * Thrown when a cycle is detected in the derived dependency graph at runtime.
 */
const _CircularDerivedDependency = createError("CircularDerivedDependency");
export const CircularDerivedDependency = (fields: {
  readonly dependencyChain: readonly string[];
}): CircularDerivedDependency => {
  const formattedChain = fields.dependencyChain.join(" -> ");
  return _CircularDerivedDependency({
    dependencyChain: Object.freeze([...fields.dependencyChain]),
    code: "CIRCULAR_DERIVED_DEPENDENCY" as const,
    isProgrammingError: true as const,
    message: `Circular derived dependency detected: ${formattedChain}`,
  });
};
export type CircularDerivedDependency = Readonly<{
  _tag: "CircularDerivedDependency";
  dependencyChain: readonly string[];
  code: "CIRCULAR_DERIVED_DEPENDENCY";
  isProgrammingError: true;
  message: string;
}>;

/**
 * Returned (as Result Err) when a batch() callback throws.
 * Deferred notifications are flushed before this error is returned.
 */
const _BatchExecutionFailed = createError("BatchExecutionFailed");
export const BatchExecutionFailed = (fields: { readonly cause: unknown }): BatchExecutionFailed => {
  const causeMessage = fields.cause instanceof Error ? fields.cause.message : String(fields.cause);
  return _BatchExecutionFailed({
    ...fields,
    code: "BATCH_EXECUTION_FAILED" as const,
    isProgrammingError: false as const,
    message: `Batch execution failed: ${causeMessage}. Deferred notifications flushed.`,
  });
};
export type BatchExecutionFailed = Readonly<{
  _tag: "BatchExecutionFailed";
  cause: unknown;
  code: "BATCH_EXECUTION_FAILED";
  isProgrammingError: false;
  message: string;
}>;

/**
 * Returned by the waitForState testing utility when the predicate
 * does not become true within the specified timeout.
 */
const _WaitForStateTimeout = createError("WaitForStateTimeout");
export const WaitForStateTimeout = (fields: {
  readonly portName: string;
  readonly timeoutMs: number;
}): WaitForStateTimeout =>
  _WaitForStateTimeout({
    ...fields,
    code: "WAIT_FOR_STATE_TIMEOUT" as const,
    isProgrammingError: false as const,
    message:
      `waitForState for port '${fields.portName}' timed out after ${fields.timeoutMs}ms. ` +
      `The predicate never returned true.`,
  });
export type WaitForStateTimeout = Readonly<{
  _tag: "WaitForStateTimeout";
  portName: string;
  timeoutMs: number;
  code: "WAIT_FOR_STATE_TIMEOUT";
  isProgrammingError: false;
  message: string;
}>;

/**
 * Thrown when a non-function value is passed to `computed()` as the getter.
 */
const _InvalidComputedGetter = createError("InvalidComputedGetter");
export const InvalidComputedGetter = (): InvalidComputedGetter =>
  _InvalidComputedGetter({
    code: "INVALID_COMPUTED_GETTER" as const,
    isProgrammingError: true as const,
    message: "getter must be a function",
  });
export type InvalidComputedGetter = Readonly<{
  _tag: "InvalidComputedGetter";
  code: "INVALID_COMPUTED_GETTER";
  isProgrammingError: true;
  message: string;
}>;

// =============================================================================
// Value-based Errors (not thrown, carried in Result/callbacks)
// =============================================================================

/**
 * Produced when a state adapter effect returns Err.
 * Wraps the original error with action context for diagnostics.
 */
export const EffectFailedError = createError("EffectFailed");
export type EffectFailedError = Readonly<{
  _tag: "EffectFailed";
  portName: string;
  actionName: string;
  cause: unknown;
}>;

/**
 * Produced when an async derived adapter's select returns Err after all retries.
 */
export const AsyncDerivedSelectError = createError("AsyncDerivedSelectFailed");
export type AsyncDerivedSelectError = Readonly<{
  _tag: "AsyncDerivedSelectFailed";
  portName: string;
  attempts: number;
  cause: unknown;
}>;

/**
 * Convention type for hydrator adapter implementations.
 * The store runtime does not produce this -- user-written hydrator adapters construct it.
 */
export const HydrationError = createError("HydrationFailed");
export type HydrationError = Readonly<{
  _tag: "HydrationFailed";
  portName: string;
  cause: unknown;
}>;

/**
 * Produced when an effect adapter's onAction callback throws.
 * Wraps the original error for diagnostics.
 */
export const EffectAdapterError = createError("EffectAdapterFailed");
export type EffectAdapterError = Readonly<{
  _tag: "EffectAdapterFailed";
  cause: unknown;
}>;

/**
 * Produced when an onEffectError handler itself throws.
 * Both the original effect error and the handler error are captured.
 */
export const EffectErrorHandlerError = createError("EffectErrorHandlerFailed");
export type EffectErrorHandlerError = Readonly<{
  _tag: "EffectErrorHandlerFailed";
  portName: string;
  actionName: string;
  originalError: EffectFailedError;
  handlerError: unknown;
}>;

// =============================================================================
// Union Types
// =============================================================================

/**
 * Union of all thrown store errors.
 */
export type StoreError =
  | DisposedStateAccess
  | DerivedComputationFailed
  | AsyncDerivedExhausted
  | CircularDerivedDependency
  | BatchExecutionFailed
  | WaitForStateTimeout
  | InvalidComputedGetter;

/**
 * Union of store errors where isProgrammingError is true.
 */
export type StoreProgrammingError =
  | DisposedStateAccess
  | AsyncDerivedExhausted
  | CircularDerivedDependency
  | InvalidComputedGetter;
