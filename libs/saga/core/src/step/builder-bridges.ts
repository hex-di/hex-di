/**
 * Step Builder Bridge Functions
 *
 * Overloaded functions that bridge the type gap between typed builder API
 * and type-erased internal BuilderState. Each function concentrates the
 * unsafe boundary in a single documented function with a trivial body.
 *
 * Pattern reference: packages/core/src/ports/directed.ts:99-108
 *
 * @packageDocumentation
 */

import type { Port } from "@hex-di/core";
import type { StepDefinition, StepContext, CompensationContext, RetryConfig } from "./types.js";

// =============================================================================
// Internal State Types (duplicated from builder.ts for type references)
// =============================================================================

interface OptionsBag {
  retry: RetryConfig<unknown> | undefined;
  timeout: number | undefined;
  skipCompensation: boolean | undefined;
  metadata: Record<string, unknown> | undefined;
}

interface BuilderState<TName extends string> {
  readonly name: TName;
  port: Port<unknown, string> | null;
  invokeMapper: ((ctx: StepContext<unknown, unknown>) => unknown) | null;
  compensateMapper:
    | ((ctx: CompensationContext<unknown, unknown, unknown, unknown>) => unknown)
    | null;
  conditionPredicate: ((ctx: StepContext<unknown, unknown>) => boolean) | null;
  optionsBag: OptionsBag;
}

// =============================================================================
// Callback Widening Bridges
// =============================================================================

/**
 * Stores a typed invoke mapper into the type-erased state slot.
 * At runtime the mapper receives the same values it would have received
 * with the narrower type -- this delegation is safe because StepContext
 * fields are covariant (readonly).
 */
export function setInvokeMapper<TInput>(
  state: BuilderState<string>,
  mapper: (ctx: StepContext<TInput, unknown>) => unknown
): void;
export function setInvokeMapper(
  state: BuilderState<string>,
  mapper: (ctx: StepContext<unknown, unknown>) => unknown
): void {
  state.invokeMapper = mapper;
}

/**
 * Stores a typed compensate mapper into the type-erased state slot.
 */
export function setCompensateMapper<TInput, TOutput, TError>(
  state: BuilderState<string>,
  mapper: (ctx: CompensationContext<TInput, unknown, TOutput, TError>) => unknown
): void;
export function setCompensateMapper(
  state: BuilderState<string>,
  mapper: (ctx: CompensationContext<unknown, unknown, unknown, unknown>) => unknown
): void {
  state.compensateMapper = mapper;
}

/**
 * Stores a typed condition predicate into the type-erased state slot.
 */
export function setConditionPredicate<TInput>(
  state: BuilderState<string>,
  predicate: (ctx: StepContext<TInput, unknown>) => boolean
): void;
export function setConditionPredicate(
  state: BuilderState<string>,
  predicate: (ctx: StepContext<unknown, unknown>) => boolean
): void {
  state.conditionPredicate = predicate;
}

// =============================================================================
// RetryConfig Callback Bridges
// =============================================================================

/**
 * Widens a typed delay function to accept unknown error.
 * At runtime the error value is always the same object regardless of type,
 * so this identity conversion is safe.
 */
export function widenDelayFn<TError>(
  delay: (attempt: number, error: TError) => number
): (attempt: number, error: unknown) => number;
export function widenDelayFn(
  delay: (attempt: number, error: unknown) => number
): (attempt: number, error: unknown) => number {
  return delay;
}

/**
 * Widens a typed retryIf predicate to accept unknown error.
 */
export function widenRetryIfFn<TError>(
  retryIf: (error: TError) => boolean
): (error: unknown) => boolean;
export function widenRetryIfFn(retryIf: (error: unknown) => boolean): (error: unknown) => boolean {
  return retryIf;
}

// =============================================================================
// Port Recovery Bridge
// =============================================================================

/**
 * Recovers the typed port from the type-erased state.
 * The port stored in state is the same object that was passed to invoke(),
 * so recovering its original type is safe.
 */
export function getPort<TPort extends Port<unknown, string>>(state: BuilderState<string>): TPort;
export function getPort(state: BuilderState<string>): Port<unknown, string> | null {
  return state.port;
}

// =============================================================================
// Build Output Bridge
// =============================================================================

/**
 * Constructs a frozen StepDefinition with the full generic type signature.
 * The implementation signature uses the type-erased state fields directly.
 */
export function buildStepDefinition<
  TName extends string,
  TInput,
  TOutput,
  TError,
  TPort extends Port<unknown, string>,
>(state: BuilderState<TName>): StepDefinition<TName, TInput, unknown, TOutput, TError, TPort>;
export function buildStepDefinition<TName extends string>(state: BuilderState<TName>): object {
  return Object.freeze({
    name: state.name,
    port: state.port,
    invoke: state.invokeMapper,
    compensate: state.compensateMapper,
    condition: state.conditionPredicate,
    options: Object.freeze({ ...state.optionsBag }),
  });
}
