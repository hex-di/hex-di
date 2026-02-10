/**
 * Saga Definition Types
 *
 * Defines SagaDefinition, SagaOptions, AccumulatedResults, AccumulatedErrors,
 * and type inference utilities for saga definitions.
 *
 * @packageDocumentation
 */

import type {
  AnyStepDefinition,
  InferStepName,
  InferStepOutput,
  InferStepError,
} from "../step/types.js";

// =============================================================================
// SagaHooks
// =============================================================================

export interface StepHookContext {
  readonly stepName: string;
  readonly stepIndex: number;
  readonly executionId: string;
  readonly sagaName: string;
  readonly isCompensation: boolean;
  readonly metadata: Record<string, unknown> | undefined;
}

export interface StepHookResultContext {
  readonly stepName: string;
  readonly stepIndex: number;
  readonly result: unknown;
  readonly error: unknown | undefined;
  readonly durationMs: number;
  readonly attemptCount: number;
  readonly executionId: string;
  readonly sagaName: string;
  readonly isCompensation: boolean;
  readonly metadata: Record<string, unknown> | undefined;
}

export interface CompensationHookContext {
  readonly failedStepName: string;
  readonly stepsToCompensate: number;
  readonly executionId: string;
  readonly sagaName: string;
  readonly metadata: Record<string, unknown> | undefined;
}

export interface CompensationResultHookContext {
  readonly compensatedSteps: readonly string[];
  readonly failedSteps: readonly string[];
  readonly executionId: string;
  readonly sagaName: string;
  readonly metadata: Record<string, unknown> | undefined;
}

export interface SagaHooks {
  /** Called before each step executes */
  readonly beforeStep?: (ctx: StepHookContext) => void;
  /** Called after each step completes (success or failure) */
  readonly afterStep?: (ctx: StepHookResultContext) => void;
  /** Called before compensation starts */
  readonly beforeCompensation?: (ctx: CompensationHookContext) => void;
  /** Called after compensation completes */
  readonly afterCompensation?: (ctx: CompensationResultHookContext) => void;
}

// =============================================================================
// SagaOptions
// =============================================================================

export interface SagaOptions {
  /** How to handle compensation failures: sequential, parallel, or best-effort */
  readonly compensationStrategy: "sequential" | "parallel" | "best-effort";
  /** Enable persistence for long-running saga resumption */
  readonly persistent?: boolean;
  /** Maximum concurrent steps (for parallel sections) */
  readonly maxConcurrency?: number;
  /** Global timeout for entire saga in ms */
  readonly timeout?: number;
  /** Cross-cutting hooks for step lifecycle events */
  readonly hooks?: SagaHooks;
  /** Custom metadata for tracing and diagnostics */
  readonly metadata?: Record<string, unknown>;
}

// =============================================================================
// AccumulatedResults / AccumulatedErrors
// =============================================================================

/** Recursive deep readonly utility (local to avoid cross-package dependency) */
type DeepReadonly<T> =
  T extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepReadonly<U>>
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

/** Compute accumulated results type from a tuple of step definitions */
export type AccumulatedResults<TSteps extends readonly AnyStepDefinition[]> = DeepReadonly<{
  [S in TSteps[number] as InferStepName<S>]: InferStepOutput<S>;
}>;

/** Compute the union of all step error types from step definitions */
export type AccumulatedErrors<TSteps> = TSteps extends readonly (infer S)[]
  ? InferStepError<S>
  : never;

// =============================================================================
// Phantom type symbols for SagaDefinition
// =============================================================================

declare const __sagaInput: unique symbol;
declare const __sagaErrors: unique symbol;

// =============================================================================
// SagaDefinition
// =============================================================================

export interface SagaDefinition<
  TName extends string,
  TInput,
  TOutput,
  TSteps extends readonly AnyStepDefinition[],
  TErrors,
> {
  /** Unique saga name */
  readonly name: TName;
  /** Ordered list of steps */
  readonly steps: TSteps;
  /** Map accumulated results to saga output */
  readonly outputMapper: (results: AccumulatedResults<TSteps>) => TOutput;
  /** Saga configuration options */
  readonly options: SagaOptions;
  /** @internal Phantom type carrier for TInput */
  readonly [__sagaInput]?: TInput;
  /** @internal Phantom type carrier for TErrors */
  readonly [__sagaErrors]?: TErrors;
}

/** Saga definition with all type parameters erased */
export type AnySagaDefinition = SagaDefinition<
  string,
  unknown,
  unknown,
  readonly AnyStepDefinition[],
  unknown
>;

// =============================================================================
// Branch Types
// =============================================================================

export type BranchAccumulatedResults<
  TKey extends string,
  TBranches extends Record<TKey, readonly AnyStepDefinition[]>,
> = {
  readonly __selectedBranch: TKey;
} & {
  [K in TBranches[TKey][number] as InferStepName<K>]?: InferStepOutput<K>;
};

export type BranchAccumulatedErrors<
  TKey extends string,
  TBranches extends Record<TKey, readonly AnyStepDefinition[]>,
> = AccumulatedErrors<TBranches[TKey]>;

// =============================================================================
// Branch Definitions (internal)
// =============================================================================

export interface BranchDefinition<
  TKey extends string,
  TBranches extends Record<TKey, readonly AnyStepDefinition[]>,
> {
  readonly _type: "branch";
  readonly selector: unknown;
  readonly branches: TBranches;
}

export interface ParallelDefinition {
  readonly _type: "parallel";
  readonly steps: readonly AnyStepDefinition[];
}

export interface SubSagaDefinition {
  readonly _type: "subSaga";
  readonly saga: AnySagaDefinition;
  readonly inputMapper: unknown;
}

/** Internal representation of a saga execution node */
export type SagaNode =
  | { readonly _type: "step"; readonly step: AnyStepDefinition }
  | ParallelDefinition
  | BranchDefinition<string, Record<string, readonly AnyStepDefinition[]>>
  | SubSagaDefinition;

// =============================================================================
// Type Inference Utilities
// =============================================================================

/** Structured error type for invalid SagaDefinition inputs */
export type NotASagaDefinitionError<T> = {
  readonly __errorBrand: "NotASagaDefinitionError";
  readonly __message: "Expected a SagaDefinition type created with defineSaga().build()";
  readonly __received: T;
  readonly __hint: "Use InferSagaInput<typeof YourSaga>, not InferSagaInput<YourSaga>";
};

/** Extract saga name literal type */
export type InferSagaName<S> =
  S extends SagaDefinition<infer N, unknown, unknown, readonly AnyStepDefinition[], unknown>
    ? N
    : NotASagaDefinitionError<S>;

/** Extract saga input type */
export type InferSagaInput<S> =
  S extends SagaDefinition<string, infer I, unknown, readonly AnyStepDefinition[], unknown>
    ? I
    : NotASagaDefinitionError<S>;

/** Extract saga output type */
export type InferSagaOutput<S> =
  S extends SagaDefinition<string, unknown, infer O, readonly AnyStepDefinition[], unknown>
    ? O
    : NotASagaDefinitionError<S>;

/** Extract saga steps tuple */
export type InferSagaSteps<S> =
  S extends SagaDefinition<string, unknown, unknown, infer Steps, unknown>
    ? Steps
    : NotASagaDefinitionError<S>;

/** Extract the accumulated error union from a saga definition */
export type InferSagaErrors<S> =
  S extends SagaDefinition<
    string,
    unknown,
    unknown,
    infer Steps extends readonly AnyStepDefinition[],
    unknown
  >
    ? AccumulatedErrors<Steps>
    : NotASagaDefinitionError<S>;

/** Extract a step's output type by step name from a saga */
export type InferStepOutputByName<TSaga extends AnySagaDefinition, TName extends string> =
  InferSagaSteps<TSaga> extends readonly (infer S extends AnyStepDefinition)[]
    ? S extends { readonly name: TName }
      ? InferStepOutput<S>
      : never
    : never;

// =============================================================================
// Duplicate Step Name Detection
// =============================================================================

/** Check whether a step name already exists in the accumulated steps */
export type HasStepName<TSteps extends readonly AnyStepDefinition[], TName extends string> =
  TName extends InferStepName<TSteps[number]> ? true : false;

/** Structured error returned when a duplicate step name is detected */
export type StepNameAlreadyExistsError<TName extends string> = {
  readonly __errorBrand: "StepNameAlreadyExistsError";
  readonly __message: "Duplicate step name detected. Each step must have a unique name.";
  readonly __received: TName;
  readonly __hint: "The accumulated results map uses step names as keys, so duplicates would silently overwrite earlier results.";
};
