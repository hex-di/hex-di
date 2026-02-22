/**
 * Step Definition Types
 *
 * Defines StepDefinition, StepContext, CompensationContext, RetryConfig,
 * and all type inference utilities for steps.
 *
 * @packageDocumentation
 */

import type { Port } from "@hex-di/core";

// =============================================================================
// Phantom Type Symbols
// =============================================================================

declare const __stepInput: unique symbol;
declare const __stepAccumulated: unique symbol;
declare const __stepOutput: unique symbol;
declare const __stepError: unique symbol;

// =============================================================================
// Context Types
// =============================================================================

/** Context provided to step invoke and condition mappers */
export interface StepContext<TInput, TAccumulated> {
  readonly input: TInput;
  readonly results: TAccumulated;
  readonly stepIndex: number;
  readonly executionId: string;
}

/** Context provided to compensation mappers */
export interface CompensationContext<TInput, TAccumulated, TStepOutput, TError> extends StepContext<
  TInput,
  TAccumulated
> {
  /** The successful output of this step that needs to be undone */
  readonly stepResult: TStepOutput;
  /** The typed error that triggered the compensation chain */
  readonly error: TError;
  /** Index (0-based) of the step whose failure triggered compensation */
  readonly failedStepIndex: number;
  /** Name of the step whose failure triggered compensation */
  readonly failedStepName: string;
}

// =============================================================================
// RetryConfig
// =============================================================================

export interface RetryConfig<TError = unknown> {
  /** Maximum number of retry attempts (default: 0, meaning no retries) */
  readonly maxAttempts: number;
  /** Delay between retries in ms, or a function for custom backoff strategies */
  readonly delay: number | ((attempt: number, error: TError) => number);
  /** Predicate to determine if an error is retryable; defaults to retrying all errors */
  readonly retryIf?: (error: TError) => boolean;
}

// =============================================================================
// StepOptions
// =============================================================================

export interface StepOptions<TError = unknown> {
  /** Retry configuration for transient failures */
  readonly retry?: RetryConfig<TError>;
  /** Timeout in milliseconds for the forward invocation */
  readonly timeout?: number;
  /** When true, this step is excluded from compensation on saga failure */
  readonly skipCompensation?: boolean;
  /** Custom metadata attached to tracing spans */
  readonly metadata?: Record<string, unknown>;
}

// =============================================================================
// StepDefinition
// =============================================================================

/**
 * A step definition carries phantom type parameters for TInput, TAccumulated,
 * TOutput, and TError. The runtime fields (invoke, compensate, condition) use
 * `unknown` parameters so that StepDefinition is covariant in all type params
 * and `StepDefinition<..., TInput, ...>` is assignable to `AnyStepDefinition`.
 *
 * Type safety is enforced by the builder at construction time.
 */
export interface StepDefinition<
  TName extends string,
  TInput,
  TAccumulated,
  TOutput,
  TError,
  TPort extends Port<string, unknown>,
> {
  /** Unique step name, used as the key in accumulated results */
  readonly name: TName;
  /** Port to invoke for the forward action */
  readonly port: TPort;
  /** Map saga context to port input for the forward invocation */
  readonly invoke: (ctx: StepContext<unknown, unknown>) => unknown;
  /** Map saga context to port input for the compensation invocation (optional) */
  readonly compensate:
    | ((ctx: CompensationContext<unknown, unknown, unknown, unknown>) => unknown)
    | null;
  /** Predicate controlling whether this step executes (optional) */
  readonly condition: ((ctx: StepContext<unknown, unknown>) => boolean) | null;
  /** Step configuration options */
  readonly options: StepOptions<unknown>;
  // Phantom fields for type inference
  readonly [__stepInput]?: TInput;
  readonly [__stepAccumulated]?: TAccumulated;
  readonly [__stepOutput]?: TOutput;
  readonly [__stepError]?: TError;
}

// =============================================================================
// AnyStepDefinition
// =============================================================================

/** Type alias erasing all type parameters for use in generic contexts */
export type AnyStepDefinition = StepDefinition<
  string,
  unknown,
  unknown,
  unknown,
  unknown,
  Port<string, unknown>
>;

// =============================================================================
// Type Inference Utilities
// =============================================================================

/** Structured error type for invalid StepDefinition inputs */
export type NotAStepDefinitionError<T> = {
  readonly __errorBrand: "NotAStepDefinitionError";
  readonly __message: "Expected a StepDefinition type created with defineStep().build()";
  readonly __received: T;
  readonly __hint: "Use InferStepOutput<typeof YourStep>, not InferStepOutput<YourStep>";
};

/** Extract the step name literal type */
export type InferStepName<S> =
  S extends StepDefinition<infer N, unknown, unknown, unknown, unknown, Port<string, unknown>>
    ? N
    : NotAStepDefinitionError<S>;

/** Extract the step output type */
export type InferStepOutput<S> =
  S extends StepDefinition<string, unknown, unknown, infer O, unknown, Port<string, unknown>>
    ? O
    : NotAStepDefinitionError<S>;

/** Extract the step input type */
export type InferStepInput<S> =
  S extends StepDefinition<string, infer I, unknown, unknown, unknown, Port<string, unknown>>
    ? I
    : NotAStepDefinitionError<S>;

/** Extract the step error type */
export type InferStepError<S> =
  S extends StepDefinition<string, unknown, unknown, unknown, infer E, Port<string, unknown>>
    ? E
    : NotAStepDefinitionError<S>;

/** Extract the port type used by the step */
export type InferStepPort<S> =
  S extends StepDefinition<string, unknown, unknown, unknown, unknown, infer P>
    ? P
    : NotAStepDefinitionError<S>;

// =============================================================================
// Compile-Time Port Collection
// =============================================================================

/** Recursively collect port types from a tuple of step definitions */
export type CollectStepPorts<TSteps extends readonly AnyStepDefinition[]> =
  TSteps extends readonly [
    infer Head extends AnyStepDefinition,
    ...infer Tail extends readonly AnyStepDefinition[],
  ]
    ? InferStepPort<Head> | CollectStepPorts<Tail>
    : never;

/** Structured error listing which step ports are missing from the graph */
export type MissingSagaStepPortsError<TMissing> = {
  readonly __errorBrand: "MissingSagaStepPortsError";
  readonly __message: "Ports required by saga steps are missing from the graph";
  readonly __received: TMissing;
  readonly __hint: "Register adapters for these ports in the GraphBuilder";
};

/** Validate that all ports required by saga steps are provided in the graph */
export type ValidateSagaPorts<
  TSteps extends readonly AnyStepDefinition[],
  TProvided extends Port<string, unknown>,
> =
  Exclude<CollectStepPorts<TSteps>, TProvided> extends never
    ? true
    : MissingSagaStepPortsError<Exclude<CollectStepPorts<TSteps>, TProvided>>;
