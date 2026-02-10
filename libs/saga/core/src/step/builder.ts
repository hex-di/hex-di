/**
 * Step Builder
 *
 * Fluent builder API for creating StepDefinition instances.
 * Uses progressive type narrowing through three stages:
 *   defineStep(name) -> .io() -> .invoke() -> [optional chain] -> .build()
 *
 * @packageDocumentation
 */

import type { Port } from "@hex-di/core";
import type {
  StepDefinition,
  StepContext,
  CompensationContext,
  RetryConfig,
  StepOptions,
} from "./types.js";
import {
  setInvokeMapper,
  setCompensateMapper,
  setConditionPredicate,
  widenDelayFn,
  widenRetryIfFn,
  buildStepDefinition,
} from "./builder-bridges.js";

// =============================================================================
// Builder Interfaces (for type safety documentation)
// =============================================================================

/** Stage 1: Name declared, awaiting I/O types */
interface StepBuilder<TName extends string> {
  io<TInput, TOutput, TError = never>(): StepBuilderWithIO<TName, TInput, TOutput, TError>;
}

/** Stage 2: I/O declared, awaiting port + mapper */
interface StepBuilderWithIO<TName extends string, TInput, TOutput, TError> {
  invoke<TPort extends Port<unknown, string>>(
    port: TPort,
    mapper: (ctx: StepContext<TInput, unknown>) => unknown
  ): StepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort>;
}

/** Stage 3: Port + mapper set, compensation and options available */
interface StepBuilderWithInvocation<
  TName extends string,
  TInput,
  TOutput,
  TError,
  TPort extends Port<unknown, string>,
> {
  compensate(
    mapper: (ctx: CompensationContext<TInput, unknown, TOutput, TError>) => unknown
  ): StepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort>;

  skipCompensation(): StepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort>;

  when(
    predicate: (ctx: StepContext<TInput, unknown>) => boolean
  ): StepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort>;

  retry(
    config: RetryConfig<TError>
  ): StepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort>;

  timeout(ms: number): StepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort>;

  options(
    opts: Partial<StepOptions<TError>>
  ): StepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort>;

  build(): StepDefinition<TName, TInput, unknown, TOutput, TError, TPort>;
}

// =============================================================================
// Internal State
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
// RetryConfig Widening
// =============================================================================

/**
 * Widen a RetryConfig<TError> to RetryConfig<unknown> by wrapping
 * the delay and retryIf callbacks. The wrappers forward the `unknown`
 * argument to the original callbacks -- the original callbacks already
 * accept a wider type at runtime (they only inspect their argument
 * via the user-supplied code), so this delegation is safe.
 */
function widenRetryConfig<TError>(config: RetryConfig<TError>): RetryConfig<unknown> {
  const delay = config.delay;
  const retryIf = config.retryIf;

  return {
    maxAttempts: config.maxAttempts,
    delay: typeof delay === "number" ? delay : widenDelayFn(delay),
    retryIf: retryIf ? widenRetryIfFn(retryIf) : undefined,
  };
}

// =============================================================================
// Stage 1 Implementation
// =============================================================================

function createStepBuilder<TName extends string>(name: TName): StepBuilder<TName> {
  const state: BuilderState<TName> = {
    name,
    port: null,
    invokeMapper: null,
    compensateMapper: null,
    conditionPredicate: null,
    optionsBag: {
      retry: undefined,
      timeout: undefined,
      skipCompensation: undefined,
      metadata: undefined,
    },
  };

  return {
    io<TInput, TOutput, TError = never>(): StepBuilderWithIO<TName, TInput, TOutput, TError> {
      return createStepBuilderWithIO<TName, TInput, TOutput, TError>(state);
    },
  };
}

// =============================================================================
// Stage 2 Implementation
// =============================================================================

function createStepBuilderWithIO<TName extends string, TInput, TOutput, TError>(
  state: BuilderState<TName>
): StepBuilderWithIO<TName, TInput, TOutput, TError> {
  return {
    invoke<TPort extends Port<unknown, string>>(
      port: TPort,
      mapper: (ctx: StepContext<TInput, unknown>) => unknown
    ): StepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort> {
      state.port = port;
      setInvokeMapper(state, mapper);
      return createStepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort>(state);
    },
  };
}

// =============================================================================
// Stage 3 Implementation
// =============================================================================

function createStepBuilderWithInvocation<
  TName extends string,
  TInput,
  TOutput,
  TError,
  TPort extends Port<unknown, string>,
>(state: BuilderState<TName>): StepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort> {
  const builder: StepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort> = {
    compensate(
      mapper: (ctx: CompensationContext<TInput, unknown, TOutput, TError>) => unknown
    ): StepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort> {
      setCompensateMapper(state, mapper);
      return builder;
    },

    skipCompensation(): StepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort> {
      state.compensateMapper = null;
      state.optionsBag = { ...state.optionsBag, skipCompensation: true };
      return builder;
    },

    when(
      predicate: (ctx: StepContext<TInput, unknown>) => boolean
    ): StepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort> {
      setConditionPredicate(state, predicate);
      return builder;
    },

    retry(
      config: RetryConfig<TError>
    ): StepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort> {
      state.optionsBag = {
        ...state.optionsBag,
        retry: widenRetryConfig(config),
      };
      return builder;
    },

    timeout(ms: number): StepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort> {
      state.optionsBag = { ...state.optionsBag, timeout: ms };
      return builder;
    },

    options(
      opts: Partial<StepOptions<TError>>
    ): StepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort> {
      if (opts.retry) {
        state.optionsBag = { ...state.optionsBag, retry: widenRetryConfig(opts.retry) };
      }
      if (opts.timeout !== undefined) {
        state.optionsBag = { ...state.optionsBag, timeout: opts.timeout };
      }
      if (opts.skipCompensation !== undefined) {
        state.optionsBag = { ...state.optionsBag, skipCompensation: opts.skipCompensation };
      }
      if (opts.metadata !== undefined) {
        state.optionsBag = { ...state.optionsBag, metadata: opts.metadata };
      }
      return builder;
    },

    build(): StepDefinition<TName, TInput, unknown, TOutput, TError, TPort> {
      return buildStepDefinition<TName, TInput, TOutput, TError, TPort>(state);
    },
  };

  return builder;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Entry point for creating step definitions.
 *
 * @param name - Unique step name, used as the key in accumulated results
 * @returns A StepBuilder for progressive configuration
 *
 * @example
 * ```typescript
 * const ReserveStockStep = defineStep("ReserveStock")
 *   .io<{ productId: string }, { reservationId: string }>()
 *   .invoke(InventoryPort, ctx => ({
 *     action: "reserve",
 *     productId: ctx.input.productId,
 *   }))
 *   .compensate(ctx => ({
 *     action: "release",
 *     reservationId: ctx.stepResult.reservationId,
 *   }))
 *   .build();
 * ```
 */
export function defineStep<TName extends string>(name: TName): StepBuilder<TName> {
  return createStepBuilder(name);
}
