/**
 * Saga Builder
 *
 * Fluent builder API for creating SagaDefinition instances.
 * Uses progressive type narrowing through three stages:
 *   defineSaga(name) -> .input() -> .step()/.parallel()/.branch()/.saga() -> .output() -> .build()
 *
 * @packageDocumentation
 */

import type { Port } from "@hex-di/core";
import type {
  AnyStepDefinition,
  StepDefinition,
  StepContext,
  InferStepError,
  InferStepName,
} from "../step/types.js";
import type {
  SagaDefinition,
  AnySagaDefinition,
  SagaOptions,
  AccumulatedResults,
  AccumulatedErrors,
  SagaNode,
  InferSagaInput,
  InferSagaName,
  InferSagaOutput,
  InferSagaErrors,
  BranchAccumulatedResults,
  BranchAccumulatedErrors,
  HasStepName,
  StepNameAlreadyExistsError,
} from "./types.js";
import {
  widenStep,
  pushBranchNode,
  pushSubSagaNode,
  setOutputMapper,
  widenBranches,
  widenStepsArray,
  extractBranchSteps,
  buildSagaDefinition,
} from "./builder-bridges.js";

// =============================================================================
// Builder Interfaces
// =============================================================================

/** Stage 1: Name declared, awaiting input type */
interface SagaBuilder<TName extends string> {
  input<TInput>(): SagaBuilderWithInput<TName, TInput, [], never>;
}

/** Stage 2: Input declared, steps can be added */
interface SagaBuilderWithInput<
  TName extends string,
  TInput,
  TSteps extends readonly AnyStepDefinition[],
  TErrors,
> {
  step<S extends StepDefinition<string, TInput, unknown, unknown, unknown, Port<string, unknown>>>(
    ...args: HasStepName<TSteps, InferStepName<S>> extends true
      ? [step: StepNameAlreadyExistsError<InferStepName<S>>]
      : [step: S]
  ): SagaBuilderWithInput<TName, TInput, [...TSteps, S], TErrors | InferStepError<S>>;

  parallel<
    PSteps extends readonly StepDefinition<
      string,
      TInput,
      unknown,
      unknown,
      unknown,
      Port<string, unknown>
    >[],
  >(
    steps: PSteps
  ): SagaBuilderWithInput<
    TName,
    TInput,
    [...TSteps, ...PSteps],
    TErrors | AccumulatedErrors<PSteps>
  >;

  branch<
    TKey extends string,
    TBranches extends Record<
      TKey,
      readonly StepDefinition<string, TInput, unknown, unknown, unknown, Port<string, unknown>>[]
    >,
  >(
    selector: (ctx: StepContext<TInput, AccumulatedResults<TSteps>>) => TKey,
    branches: TBranches
  ): SagaBuilderWithInput<
    TName,
    TInput,
    [
      ...TSteps,
      StepDefinition<
        "__branch",
        TInput,
        unknown,
        BranchAccumulatedResults<TKey, TBranches>,
        BranchAccumulatedErrors<TKey, TBranches>,
        Port<string, unknown>
      >,
    ],
    TErrors | BranchAccumulatedErrors<TKey, TBranches>
  >;

  saga<TSaga extends AnySagaDefinition>(
    saga: TSaga,
    mapper: (ctx: StepContext<TInput, AccumulatedResults<TSteps>>) => InferSagaInput<TSaga>
  ): SagaBuilderWithInput<
    TName,
    TInput,
    [
      ...TSteps,
      StepDefinition<
        InferSagaName<TSaga> & string,
        TInput,
        unknown,
        InferSagaOutput<TSaga>,
        InferSagaErrors<TSaga>,
        Port<string, unknown>
      >,
    ],
    TErrors | InferSagaErrors<TSaga>
  >;

  output<TOutput>(
    mapper: (results: AccumulatedResults<TSteps>) => TOutput
  ): SagaBuilderWithOutput<TName, TInput, TOutput, TSteps, TErrors>;
}

/** Stage 3: Output mapper declared, awaiting options and build */
interface SagaBuilderWithOutput<
  TName extends string,
  TInput,
  TOutput,
  TSteps extends readonly AnyStepDefinition[],
  TErrors,
> {
  options(opts: SagaOptions): SagaBuilderWithOutput<TName, TInput, TOutput, TSteps, TErrors>;

  build(): SagaDefinition<TName, TInput, TOutput, TSteps, TErrors>;
}

// =============================================================================
// Internal State
// =============================================================================

interface SagaBuilderState<TName extends string> {
  readonly name: TName;
  readonly nodes: SagaNode[];
  readonly steps: AnyStepDefinition[];
  outputMapper: unknown;
  sagaOptions: SagaOptions;
}

// =============================================================================
// Builder Implementations
// =============================================================================

function createSagaBuilder<TName extends string>(name: TName): SagaBuilder<TName> {
  return {
    input<TInput>(): SagaBuilderWithInput<TName, TInput, [], never> {
      const state: SagaBuilderState<TName> = {
        name,
        nodes: [],
        steps: [],
        outputMapper: null,
        sagaOptions: { compensationStrategy: "sequential" },
      };
      return createSagaBuilderWithInput<TName, TInput, [], never>(state);
    },
  };
}

function createSagaBuilderWithInput<
  TName extends string,
  TInput,
  TSteps extends readonly AnyStepDefinition[],
  TErrors,
>(state: SagaBuilderState<TName>): SagaBuilderWithInput<TName, TInput, TSteps, TErrors> {
  return buildInputStage(state);
}

function buildInputStage<
  TName extends string,
  TInput,
  TSteps extends readonly AnyStepDefinition[],
  TErrors,
>(state: SagaBuilderState<TName>): SagaBuilderWithInput<TName, TInput, TSteps, TErrors>;
function buildInputStage<TName extends string>(state: SagaBuilderState<TName>): object {
  return {
    step(step: AnyStepDefinition) {
      const widened = widenStep(step);
      state.nodes.push({ _type: "step", step: widened });
      state.steps.push(widened);
      return buildInputStage(state);
    },

    parallel(steps: readonly AnyStepDefinition[]) {
      const stepsArr = widenStepsArray(steps);
      state.nodes.push({ _type: "parallel", steps: stepsArr });
      for (const s of stepsArr) {
        state.steps.push(s);
      }
      return buildInputStage(state);
    },

    branch(
      selector: (ctx: unknown) => string,
      branches: Record<string, readonly AnyStepDefinition[]>
    ) {
      pushBranchNode(state, selector, widenBranches(branches));
      for (const s of extractBranchSteps(branches)) {
        state.steps.push(s);
      }
      return buildInputStage(state);
    },

    saga(saga: AnySagaDefinition, mapper: (ctx: unknown) => unknown) {
      pushSubSagaNode(state, saga, mapper);
      return buildInputStage(state);
    },

    output(mapper: (results: unknown) => unknown) {
      setOutputMapper(state, mapper);
      return createSagaBuilderWithOutput(state);
    },
  };
}

function createSagaBuilderWithOutput<
  TName extends string,
  TInput,
  TOutput,
  TSteps extends readonly AnyStepDefinition[],
  TErrors,
>(state: SagaBuilderState<TName>): SagaBuilderWithOutput<TName, TInput, TOutput, TSteps, TErrors> {
  const builder: SagaBuilderWithOutput<TName, TInput, TOutput, TSteps, TErrors> = {
    options(opts: SagaOptions) {
      state.sagaOptions = { ...state.sagaOptions, ...opts };
      return builder;
    },

    build(): SagaDefinition<TName, TInput, TOutput, TSteps, TErrors> {
      return buildSagaDefinition<TName, TInput, TOutput, TSteps, TErrors>(state);
    },
  };

  return builder;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Entry point for creating saga definitions.
 *
 * @param name - Unique saga name, used for identification and tracing
 * @returns A SagaBuilder for progressive configuration
 *
 * @example
 * ```typescript
 * const OrderSaga = defineSaga("OrderSaga")
 *   .input<OrderInput>()
 *   .step(ValidateOrderStep)
 *   .step(ReserveStockStep)
 *   .step(ChargePaymentStep)
 *   .output(results => ({
 *     orderId: results.ValidateOrder.orderId,
 *     transactionId: results.ChargePayment.transactionId,
 *   }))
 *   .options({ compensationStrategy: "sequential" })
 *   .build();
 * ```
 */
export function defineSaga<TName extends string>(name: TName): SagaBuilder<TName> {
  return createSagaBuilder(name);
}
