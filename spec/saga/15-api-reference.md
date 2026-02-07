# 15 - API Reference

_Previous: [14 - Introspection](./14-introspection.md)_ | _Next: [16 - Appendices](./16-appendices.md)_

---

## 20. API Reference

### 20.1 @hex-di/saga Exports

#### Definition

```typescript
import { defineStep, defineSaga } from "@hex-di/saga";

import type {
  StepDefinition,
  StepOptions,
  RetryConfig,
  SagaDefinition,
  SagaOptions,
} from "@hex-di/saga";

// Type aliases for erased type parameters (avoids 'any')
type AnyStepDefinition = StepDefinition<
  string,
  unknown,
  unknown,
  unknown,
  unknown,
  Port<string, unknown>
>;
type AnySagaDefinition = SagaDefinition<
  string,
  unknown,
  unknown,
  readonly AnyStepDefinition[],
  unknown
>;
```

```typescript
function defineStep<TName extends string>(name: TName): StepBuilder<TName>;

/** Stage 1: Name declared, awaiting IO types */
interface StepBuilder<TName extends string> {
  io<TInput, TOutput, TError = never>(): StepBuilderWithIO<TName, TInput, TOutput, TError>;
}

/** Stage 2: IO types declared, awaiting port invocation */
interface StepBuilderWithIO<TName extends string, TInput, TOutput, TError> {
  invoke<TPort extends Port<string, unknown>>(
    port: TPort,
    mapper: (ctx: StepContext<TInput, unknown>) => PortInput<TPort>
  ): StepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort>;
}

/** Stage 3: Port and mapper declared, optional configuration and build */
interface StepBuilderWithInvocation<
  TName extends string,
  TInput,
  TOutput,
  TError,
  TPort extends Port<string, unknown>,
> {
  compensate(
    mapper: (ctx: CompensationContext<TInput, unknown, TOutput, TError>) => PortInput<TPort>
  ): StepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort>;
  skipCompensation(): StepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort>;
  when(
    condition: (ctx: StepContext<TInput, unknown>) => boolean
  ): StepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort>;
  retry(
    config: RetryConfig<TError>
  ): StepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort>;
  timeout(ms: number): StepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort>;
  build(): StepDefinition<TName, TInput, unknown, TOutput, TError, TPort>;
}

interface StepDefinition<
  TName extends string,
  TInput,
  TAccumulated,
  TOutput,
  TError,
  TPort extends Port<string, unknown>,
> {
  readonly name: TName;
  readonly port: TPort;
  readonly invoke: (ctx: StepContext<TInput, TAccumulated>) => PortInput<TPort>;
  readonly compensate?: (
    ctx: CompensationContext<TInput, TAccumulated, TOutput, TError>
  ) => PortInput<TPort>;
  readonly condition?: (ctx: StepContext<TInput, TAccumulated>) => boolean;
  readonly options?: StepOptions<TError>;
}

interface StepOptions<TError = unknown> {
  retry?: RetryConfig<TError>;
  timeout?: number;
  skipCompensation?: boolean;
  metadata?: Record<string, unknown>;
}

interface RetryConfig<TError = unknown> {
  maxAttempts: number;
  delay: number | ((attempt: number, error: TError) => number);
  retryIf?: (error: TError) => boolean;
}
```

```typescript
function defineSaga<TName extends string>(name: TName): SagaBuilder<TName>;

interface SagaDefinition<
  TName extends string,
  TInput,
  TOutput,
  TSteps extends readonly AnyStepDefinition[],
  TErrors,
> {
  readonly name: TName;
  readonly steps: TSteps;
  readonly outputMapper: (results: AccumulatedResults<TSteps>) => TOutput;
  readonly options?: SagaOptions;
}

interface SagaOptions {
  compensationStrategy: "sequential" | "parallel" | "best-effort";
  persistent?: boolean;
  maxConcurrency?: number;
  timeout?: number;
  hooks?: SagaHooks;
  metadata?: Record<string, unknown>;
}
```

#### Ports

```typescript
import { sagaPort, sagaManagementPort, SagaPersisterPort } from "@hex-di/saga";

import type {
  SagaPort,
  SagaManagementPort,
  SagaExecutor,
  SagaManagementExecutor,
  SagaPersister,
  SagaExecutionState,
  SagaPortConfig,
} from "@hex-di/saga";
```

```typescript
function sagaPort<TInput, TOutput, TError = never>(): <const TName extends string>(
  config: SagaPortConfig<TName>
) => SagaPort<TName, TInput, TOutput, TError>;

function sagaManagementPort<TOutput, TError = never>(): <const TName extends string>(
  config: SagaPortConfig<TName>
) => SagaManagementPort<TName, TOutput, TError>;

interface SagaPort<TName extends string, TInput, TOutput, TError> extends Port<
  SagaExecutor<TInput, TOutput, TError>,
  TName
> {
  readonly [SagaPortSymbol]: true;
  readonly [__sagaInputType]: TInput;
  readonly [__sagaOutputType]: TOutput;
  readonly [__sagaErrorType]: TError;
}

interface SagaManagementPort<TName extends string, TOutput, TError> extends Port<
  SagaManagementExecutor<TOutput, TError>,
  TName
> {
  readonly [SagaManagementPortSymbol]: true;
  readonly [__sagaOutputType]: TOutput;
  readonly [__sagaErrorType]: TError;
}

interface SagaPortConfig<TName extends string> {
  /** Unique port name -- becomes the identifier in the graph */
  readonly name: TName;

  /** Human-readable description for introspection */
  readonly description?: string;

  /** Custom metadata for tracing and diagnostics */
  readonly metadata?: Record<string, unknown>;
}

/** Domain port -- trigger a saga execution */
interface SagaExecutor<TInput, TOutput, TError> {
  execute(input: TInput): ResultAsync<SagaSuccess<TOutput>, SagaError<TError>>;
}

/** Management/infrastructure port -- resume, cancel, query executions */
interface SagaManagementExecutor<TOutput, TError> {
  resume(executionId: string): ResultAsync<SagaSuccess<TOutput>, SagaError<TError>>;
  cancel(executionId: string): ResultAsync<void, ManagementError>;
  getStatus(executionId: string): ResultAsync<SagaStatus, ManagementError>;
  listExecutions(filters?: ExecutionFilters): ResultAsync<SagaExecutionSummary[], ManagementError>;
}

interface SagaPersister {
  save(state: SagaExecutionState): Promise<void>;
  load(executionId: string): Promise<SagaExecutionState | null>;
  delete(executionId: string): Promise<void>;
  list(filters?: PersisterFilters): Promise<SagaExecutionState[]>;
  update(executionId: string, updates: Partial<SagaExecutionState>): Promise<void>;
}

interface SagaExecutionState {
  readonly executionId: string;
  readonly sagaName: string;
  readonly input: unknown;
  currentStep: number;
  completedSteps: readonly CompletedStepState[];
  status: SagaStatusType;
  error: SerializedSagaError | null;
  compensation: CompensationState;
  timestamps: {
    readonly startedAt: string;
    updatedAt: string;
    completedAt: string | null;
  };
  metadata: Record<string, unknown>;
}
```

#### Adapters

```typescript
import { createSagaAdapter } from "@hex-di/saga";

import type { SagaAdapter } from "@hex-di/saga";
```

```typescript
function createSagaAdapter<
  P extends SagaPort<string, unknown, unknown, unknown>,
  const TRequires extends readonly Port<unknown, string>[] = readonly [],
>(port: P, config: SagaAdapterConfig<P, TRequires>): SagaAdapter<P>;

interface SagaAdapter<P extends SagaPort<string, unknown, unknown, unknown>> extends Adapter<
  P,
  TupleToUnion<TRequires>,
  TLifetime,
  "sync",
  false,
  TRequires
> {
  readonly [SagaAdapterSymbol]: true;
  readonly saga: SagaDefinition<
    string,
    InferSagaPortInput<P>,
    InferSagaPortOutput<P>,
    readonly StepDefinition<string, unknown, unknown, unknown, unknown, unknown>[],
    unknown
  >;
}
```

#### Runtime

```typescript
import { createSagaRunner } from "@hex-di/saga";

import type { SagaRunner, ExecuteOptions } from "@hex-di/saga";
```

```typescript
function createSagaRunner(container: Container): SagaRunner;

interface SagaRunner {
  execute<TSaga extends AnySagaDefinition>(
    saga: TSaga,
    input: InferSagaInput<TSaga>,
    options?: ExecuteOptions
  ): ResultAsync<SagaSuccess<InferSagaOutput<TSaga>>, SagaError<InferSagaErrors<TSaga>>>;

  resume(executionId: string): ResultAsync<SagaSuccess<unknown>, SagaError<unknown>>;
  cancel(executionId: string): ResultAsync<void, ManagementError>;
  getStatus(executionId: string): ResultAsync<SagaStatus, ManagementError>;
  subscribe(executionId: string, listener: SagaEventListener): Unsubscribe;
}

interface ExecuteOptions {
  executionId?: string;
  timeout?: number;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
}
```

#### Types

```typescript
import type {
  SagaSuccess,
  SagaError,
  SagaErrorBase,
  ManagementError,
  SagaStatus,
  SagaStatusType,
  SagaEvent,
  SagaEventListener,
  StepContext,
  CompensationContext,
  ExecutionTrace,
  StepTrace,
  CompensationTrace,
} from "@hex-di/saga";
```

```typescript
/** Successful saga execution result */
interface SagaSuccess<TOutput> {
  readonly output: TOutput;
  readonly executionId: string;
}

/** Base interface shared by all SagaError variants */
interface SagaErrorBase {
  readonly _tag: string;
  readonly message: string;
  readonly executionId: string;
}

/** Tagged union of all saga error variants */
type SagaError<TCause = unknown> =
  | {
      readonly _tag: "StepFailed";
      readonly message: string;
      readonly executionId: string;
      readonly stepName: string;
      readonly stepIndex: number;
      readonly cause: TCause;
      readonly completedSteps: readonly string[];
      readonly compensatedSteps: readonly string[];
      readonly compensated: boolean;
    }
  | {
      readonly _tag: "CompensationFailed";
      readonly message: string;
      readonly executionId: string;
      readonly stepName: string;
      readonly originalError: TCause;
      readonly compensationError: unknown;
      readonly compensatedSteps: readonly string[];
      readonly failedCompensationSteps: readonly string[];
    }
  | {
      readonly _tag: "Timeout";
      readonly message: string;
      readonly executionId: string;
      readonly timeoutMs: number;
      readonly lastStepName: string;
      readonly lastStepIndex: number;
    }
  | {
      readonly _tag: "Cancelled";
      readonly message: string;
      readonly executionId: string;
      readonly cancelledAtStepName: string;
      readonly compensated: boolean;
      readonly compensatedSteps: readonly string[];
    }
  | {
      readonly _tag: "ValidationFailed";
      readonly message: string;
      readonly executionId: string;
      readonly validationErrors: readonly string[];
    }
  | {
      readonly _tag: "PortNotFound";
      readonly message: string;
      readonly executionId: string;
      readonly portName: string;
      readonly stepName: string;
    }
  | {
      readonly _tag: "PersistenceFailed";
      readonly message: string;
      readonly executionId: string;
      readonly operation: string;
      readonly cause: unknown;
    };

/** Tagged union of management operation errors */
type ManagementError =
  | { readonly _tag: "ExecutionNotFound"; readonly message: string; readonly executionId: string }
  | {
      readonly _tag: "InvalidOperation";
      readonly message: string;
      readonly executionId: string;
      readonly currentState: SagaStatusType;
      readonly attemptedOperation: string;
    }
  | {
      readonly _tag: "PersistenceFailed";
      readonly message: string;
      readonly operation: string;
      readonly cause: unknown;
    };

type SagaStatusType = "pending" | "running" | "compensating" | "completed" | "failed" | "cancelled";

type SagaStatus =
  | { state: "pending"; executionId: string; sagaName: string; createdAt: number }
  | {
      state: "running";
      executionId: string;
      sagaName: string;
      currentStepIndex: number;
      currentStepName: string;
      completedSteps: ReadonlyArray<string>;
      startedAt: number;
    }
  | {
      state: "compensating";
      executionId: string;
      sagaName: string;
      failedStepName: string;
      failedStepIndex: number;
      compensatingStepIndex: number;
      compensatingStepName: string;
      compensatedSteps: ReadonlyArray<string>;
      startedAt: number;
      error: SagaError<unknown>;
    }
  | {
      state: "completed";
      executionId: string;
      sagaName: string;
      completedSteps: ReadonlyArray<string>;
      startedAt: number;
      completedAt: number;
      durationMs: number;
    }
  | {
      state: "failed";
      executionId: string;
      sagaName: string;
      error: SagaError<unknown>;
      failedStepName: string;
      compensated: boolean;
      compensatedSteps: ReadonlyArray<string>;
      startedAt: number;
      failedAt: number;
      durationMs: number;
    }
  | {
      state: "cancelled";
      executionId: string;
      sagaName: string;
      cancelledAtStepName: string;
      compensated: boolean;
      compensatedSteps: ReadonlyArray<string>;
      startedAt: number;
      cancelledAt: number;
    };

type SagaEvent =
  | SagaStartedEvent
  | StepStartedEvent
  | StepCompletedEvent
  | StepFailedEvent
  | StepSkippedEvent
  | CompensationStartedEvent
  | CompensationStepEvent
  | CompensationCompletedEvent
  | CompensationFailedEvent
  | SagaCompletedEvent
  | SagaFailedEvent
  | SagaCancelledEvent;

type SagaEventListener = (event: SagaEvent) => void;

interface StepContext<TInput, TAccumulated> {
  readonly input: TInput;
  readonly results: TAccumulated;
  readonly stepIndex: number;
  readonly executionId: string;
}

interface CompensationContext<TInput, TAccumulated, TStepOutput, TError> extends StepContext<
  TInput,
  TAccumulated
> {
  readonly stepResult: TStepOutput;
  readonly error: TError;
  readonly failedStepIndex: number;
  readonly failedStepName: string;
}

interface ExecutionTrace {
  readonly executionId: string;
  readonly sagaName: string;
  readonly input: unknown;
  readonly status: SagaStatus["state"];
  readonly steps: ReadonlyArray<StepTrace>;
  readonly compensation: CompensationTrace | undefined;
  readonly startedAt: number;
  readonly completedAt: number | undefined;
  readonly totalDurationMs: number | undefined;
  readonly metadata: Record<string, unknown> | undefined;
}

interface StepTrace {
  readonly stepName: string;
  readonly stepIndex: number;
  readonly status: "completed" | "failed" | "skipped";
  readonly startedAt: number | undefined;
  readonly completedAt: number | undefined;
  readonly durationMs: number | undefined;
  readonly attemptCount: number;
  readonly error: unknown | undefined;
  readonly skippedReason: string | undefined;
}

interface CompensationTrace {
  readonly triggeredBy: string;
  readonly triggeredByIndex: number;
  readonly steps: ReadonlyArray<CompensationStepTrace>;
  readonly status: "completed" | "failed";
  readonly startedAt: number;
  readonly completedAt: number;
  readonly totalDurationMs: number;
}
```

#### SagaEvent Interfaces

All error fields on saga event interfaces use `unknown` instead of `Error`:

```typescript
interface StepFailedEvent {
  readonly type: "step:failed";
  readonly executionId: string;
  readonly stepName: string;
  readonly stepIndex: number;
  readonly error: unknown;
  readonly attemptCount: number;
  readonly timestamp: number;
}

interface CompensationFailedEvent {
  readonly type: "compensation:failed";
  readonly executionId: string;
  readonly stepName: string;
  readonly originalError: unknown;
  readonly compensationError: unknown;
  readonly timestamp: number;
}

interface SagaFailedEvent {
  readonly type: "saga:failed";
  readonly executionId: string;
  readonly sagaName: string;
  readonly error: unknown;
  readonly compensated: boolean;
  readonly timestamp: number;
}
```

#### Step Hook Result Context

```typescript
interface StepHookResultContext {
  readonly stepName: string;
  readonly stepIndex: number;
  readonly result: unknown;
  readonly error: unknown | undefined;
  readonly durationMs: number;
  readonly attemptCount: number;
}
```

#### Type Inference Utilities

```typescript
import type {
  InferSagaInput,
  InferSagaOutput,
  InferSagaName,
  InferSagaSteps,
  InferSagaErrors,
  InferStepOutput,
  InferStepName,
  InferStepInput,
  InferStepPort,
  InferStepError,
  InferStepOutputByName,
  InferSagaPortInput,
  InferSagaPortOutput,
  InferSagaPortError,
  InferSagaPortName,
  InferSagaManagementPortOutput,
  InferSagaManagementPortError,
  InferSagaManagementPortName,
  AccumulatedResults,
  AccumulatedErrors,
} from "@hex-di/saga";
```

All inference utilities return descriptive branded error types instead of `never` when given an invalid input. See [Branded Error Types](#branded-error-types) below.

```typescript
/** Extract the input type from a SagaDefinition */
type InferSagaInput<S> =
  S extends SagaDefinition<string, infer I, unknown, unknown, unknown>
    ? I
    : NotASagaDefinitionError<S>;

/** Extract the output type from a SagaDefinition */
type InferSagaOutput<S> =
  S extends SagaDefinition<string, unknown, infer O, unknown, unknown>
    ? O
    : NotASagaDefinitionError<S>;

/** Extract the name literal type from a SagaDefinition */
type InferSagaName<S> =
  S extends SagaDefinition<infer N, unknown, unknown, unknown, unknown>
    ? N
    : NotASagaDefinitionError<S>;

/** Extract the steps tuple from a SagaDefinition */
type InferSagaSteps<S> =
  S extends SagaDefinition<string, unknown, unknown, infer Steps, unknown>
    ? Steps
    : NotASagaDefinitionError<S>;

/** Extract the accumulated error union from a SagaDefinition */
type InferSagaErrors<S> =
  S extends SagaDefinition<string, unknown, unknown, infer Steps, unknown>
    ? AccumulatedErrors<Steps>
    : NotASagaDefinitionError<S>;

/** Extract the output type from a StepDefinition */
type InferStepOutput<S> =
  S extends StepDefinition<string, unknown, unknown, infer O, unknown, unknown>
    ? O
    : NotAStepDefinitionError<S>;

/** Extract the name literal type from a StepDefinition */
type InferStepName<S> =
  S extends StepDefinition<infer N, unknown, unknown, unknown, unknown, unknown>
    ? N
    : NotAStepDefinitionError<S>;

/** Extract the input type from a StepDefinition */
type InferStepInput<S> =
  S extends StepDefinition<string, infer I, unknown, unknown, unknown, unknown>
    ? I
    : NotAStepDefinitionError<S>;

/** Extract the port type used by a StepDefinition */
type InferStepPort<S> =
  S extends StepDefinition<string, unknown, unknown, unknown, unknown, infer P>
    ? P
    : NotAStepDefinitionError<S>;

/** Extract the error type from a StepDefinition */
type InferStepError<S> =
  S extends StepDefinition<string, unknown, unknown, unknown, infer E, unknown>
    ? E
    : NotAStepDefinitionError<S>;

/** Extract a step's output type by step name from a saga */
type InferStepOutputByName<TSaga extends AnySagaDefinition, TName extends string> =
  InferSagaSteps<TSaga> extends readonly (infer S extends AnyStepDefinition)[]
    ? S extends StepDefinition<TName, unknown, unknown, infer O, unknown, unknown>
      ? O
      : never
    : never;

/** Extract the input type from a SagaPort */
type InferSagaPortInput<T> = [T] extends [SagaPort<string, infer TInput, unknown, unknown>]
  ? TInput
  : NotASagaPortError<T>;

/** Extract the output type from a SagaPort */
type InferSagaPortOutput<T> = [T] extends [SagaPort<string, unknown, infer TOutput, unknown>]
  ? TOutput
  : NotASagaPortError<T>;

/** Extract the error type from a SagaPort */
type InferSagaPortError<T> = [T] extends [SagaPort<string, unknown, unknown, infer TError>]
  ? TError
  : NotASagaPortError<T>;

/** Extract the name literal type from a SagaPort */
type InferSagaPortName<T> = [T] extends [SagaPort<infer TName, unknown, unknown, unknown>]
  ? TName
  : NotASagaPortError<T>;

/** Extract the output type from a SagaManagementPort */
type InferSagaManagementPortOutput<T> = [T] extends [
  SagaManagementPort<string, infer TOutput, unknown>,
]
  ? TOutput
  : NotASagaManagementPortError<T>;

/** Extract the error type from a SagaManagementPort */
type InferSagaManagementPortError<T> = [T] extends [
  SagaManagementPort<string, unknown, infer TError>,
]
  ? TError
  : NotASagaManagementPortError<T>;

/** Extract the name literal type from a SagaManagementPort */
type InferSagaManagementPortName<T> = [T] extends [
  SagaManagementPort<infer TName, unknown, unknown>,
]
  ? TName
  : NotASagaManagementPortError<T>;

/** Compute accumulated results type from a tuple of step definitions */
type AccumulatedResults<TSteps extends readonly AnyStepDefinition[]> = {
  [S in TSteps[number] as InferStepName<S>]: InferStepOutput<S>;
};

/** Compute the union of all step error types from a tuple of step definitions */
type AccumulatedErrors<TSteps> = TSteps extends readonly (infer S)[] ? InferStepError<S> : never;
```

#### Branded Error Types

```typescript
import type {
  NotAStepDefinitionError,
  NotASagaDefinitionError,
  NotASagaPortError,
  NotASagaManagementPortError,
} from "@hex-di/saga";
```

Following the `NotAPortError<T>` pattern from `@hex-di/core`, all inference utilities return structured branded error objects instead of `never` when given an invalid input. These produce readable IDE tooltips showing `__errorBrand`, `__message`, `__received`, and `__hint`:

```typescript
/** Error returned when a non-StepDefinition is passed to a step inference utility */
type NotAStepDefinitionError<T> = {
  readonly __errorBrand: "NotAStepDefinitionError";
  readonly __message: "Expected a StepDefinition type created with defineStep().build()";
  readonly __received: T;
  readonly __hint: "Use InferStepOutput<typeof YourStep>, not InferStepOutput<YourStep>";
};

/** Error returned when a non-SagaDefinition is passed to a saga inference utility */
type NotASagaDefinitionError<T> = {
  readonly __errorBrand: "NotASagaDefinitionError";
  readonly __message: "Expected a SagaDefinition type created with defineSaga().build()";
  readonly __received: T;
  readonly __hint: "Use InferSagaInput<typeof YourSaga>, not InferSagaInput<YourSaga>";
};

/** Error returned when a non-SagaPort is passed to a saga port inference utility */
type NotASagaPortError<T> = {
  readonly __errorBrand: "NotASagaPortError";
  readonly __message: "Expected a SagaPort type created with sagaPort()";
  readonly __received: T;
  readonly __hint: "Use InferSagaPortInput<typeof YourPort>, not InferSagaPortInput<YourPort>";
};

/** Error returned when a non-SagaManagementPort is passed */
type NotASagaManagementPortError<T> = {
  readonly __errorBrand: "NotASagaManagementPortError";
  readonly __message: "Expected a SagaManagementPort type created with sagaManagementPort()";
  readonly __received: T;
  readonly __hint: "Use InferSagaManagementPortOutput<typeof YourPort>, not InferSagaManagementPortOutput<YourPort>";
};
```

#### Compile-Time Validation Types

```typescript
import type {
  CollectStepPorts,
  ValidateSagaPorts,
  MissingSagaStepPortsError,
  HasStepName,
  StepNameAlreadyExistsError,
  CaptiveSagaDependencyError,
} from "@hex-di/saga";
```

These types enable compile-time validation of saga structure, preventing common configuration errors:

```typescript
/** Recursively collect port types from a tuple of step definitions */
type CollectStepPorts<TSteps extends readonly AnyStepDefinition[]> = TSteps extends readonly [
  infer Head extends AnyStepDefinition,
  ...infer Tail extends readonly AnyStepDefinition[],
]
  ? InferStepPort<Head> | CollectStepPorts<Tail>
  : never;

/** Validate that all ports required by saga steps are provided in the graph */
type ValidateSagaPorts<
  TSteps extends readonly AnyStepDefinition[],
  TProvided extends Port<unknown, string>,
> =
  Exclude<CollectStepPorts<TSteps>, TProvided> extends never
    ? true
    : MissingSagaStepPortsError<Exclude<CollectStepPorts<TSteps>, TProvided>>;

/** Structured error listing which step ports are missing from the graph */
type MissingSagaStepPortsError<TMissing> = {
  readonly __errorBrand: "MissingSagaStepPortsError";
  readonly __message: "Ports required by saga steps are missing from the graph";
  readonly __received: TMissing;
  readonly __hint: "Register adapters for these ports in the GraphBuilder";
};

/** Check whether a step name already exists in the accumulated steps */
type HasStepName<TSteps extends readonly AnyStepDefinition[], TName extends string> =
  TName extends InferStepName<TSteps[number]> ? true : false;

/** Structured error returned when a duplicate step name is detected */
type StepNameAlreadyExistsError<TName extends string> = {
  readonly __errorBrand: "StepNameAlreadyExistsError";
  readonly __message: "Duplicate step name detected. Each step must have a unique name.";
  readonly __received: TName;
  readonly __hint: "The accumulated results map uses step names as keys, so duplicates would silently overwrite earlier results.";
};

/** Structured error returned when a singleton saga adapter depends on a scoped port */
type CaptiveSagaDependencyError<TSagaName extends string, TPortName extends string> = {
  readonly __errorBrand: "CaptiveSagaDependencyError";
  readonly __message: "Saga is registered as singleton but depends on a scoped port";
  readonly __received: { sagaName: TSagaName; portName: TPortName };
  readonly __hint: "Either change the saga adapter to scoped lifetime or ensure all step ports are singleton or transient.";
};
```

---

### 20.2 @hex-di/saga/testing Exports

```typescript
import { createSagaTestHarness, createMockAdapter } from "@hex-di/saga/testing";

import type { SagaTestHarness, SagaTestConfig } from "@hex-di/saga/testing";
```

```typescript
function createSagaTestHarness<TSaga extends AnySagaDefinition, TGraph extends Graph>(
  saga: TSaga,
  config: SagaTestConfig<TSaga, TGraph>
): SagaTestHarness<TSaga>;

interface SagaTestConfig<TSaga extends AnySagaDefinition, TGraph extends Graph> {
  /** The production graph (or a pre-configured test graph) */
  graph: TGraph;

  /** Port overrides -- applied via TestGraphBuilder.override() internally */
  overrides?: ReadonlyArray<Adapter>;

  /** Enable execution trace capture */
  tracing?: boolean;
}

interface SagaTestHarness<TSaga extends AnySagaDefinition> {
  /** The test container (created from graph + overrides) */
  readonly container: Container;

  /** Run the saga within a fresh scope, returning the result */
  execute(
    input: InferSagaInput<TSaga>
  ): ResultAsync<SagaSuccess<InferSagaOutput<TSaga>>, SagaError<InferSagaErrors<TSaga>>>;

  /** Retrieve the execution trace (requires tracing: true in config) */
  getTrace(): ExecutionTrace;

  /** Dispose the container and all scopes */
  dispose(): Promise<void>;
}

function createMockAdapter<P extends Port<string, unknown>>(
  port: P,
  implementation: Partial<PortType<P>>
): Adapter<P>;
```

---

### 20.3 @hex-di/saga-react Exports

#### Hooks

```typescript
import { useSaga, useSagaStatus, useSagaHistory } from "@hex-di/saga-react";
```

```typescript
function useSaga<P extends SagaPort<string, unknown, unknown, unknown>>(port: P): UseSagaResult<P>;

interface UseSagaResult<P extends SagaPort<string, unknown, unknown, unknown>> {
  /** Current saga execution status */
  status: "idle" | "running" | "compensating" | "success" | "error";
  /** Trigger saga execution with the port's input type */
  execute: (
    input: InferSagaPortInput<P>
  ) => Result<SagaSuccess<InferSagaPortOutput<P>>, SagaError<InferSagaPortError<P>>>;
  /** Resume a previously persisted execution by ID */
  resume: (
    executionId: string
  ) => Result<SagaSuccess<InferSagaPortOutput<P>>, SagaError<InferSagaPortError<P>>>;
  /** Cancel the currently running execution and trigger compensation */
  cancel: () => Promise<void>;
  /** The saga output on success, undefined otherwise */
  data: InferSagaPortOutput<P> | undefined;
  /** The saga error on failure, null otherwise */
  error: SagaError<InferSagaPortError<P>> | null;
  /** Whether compensation completed successfully after a failure */
  compensated: boolean;
  /** Name of the step currently being executed or compensated */
  currentStep: string | undefined;
  /** Execution ID of the current or most recent execution */
  executionId: string | undefined;
  /** Reset the hook to idle state, clearing data, error, and status */
  reset: () => void;
}
```

```typescript
function useSagaStatus(executionId: string): SagaStatusResult;

interface SagaStatusResult {
  status: "pending" | "running" | "compensating" | "completed" | "failed" | "not-found";
  currentStep: string | undefined;
  completedSteps: readonly string[];
  compensated: boolean;
  error: SagaError<unknown> | null;
  updatedAt: Date | undefined;
  loading: boolean;
}
```

```typescript
function useSagaHistory(options?: SagaHistoryOptions): SagaHistoryResult;

interface SagaHistoryOptions {
  sagaName?: string;
  status?: "completed" | "failed" | "running";
  limit?: number;
  offset?: number;
}

interface SagaHistoryResult {
  entries: readonly SagaExecutionSummary[];
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  total: number;
}
```

#### Components

```typescript
import { SagaBoundary } from "@hex-di/saga-react";

import type { SagaBoundaryProps } from "@hex-di/saga-react";
```

```typescript
function SagaBoundary(props: SagaBoundaryProps): ReactNode;

interface SagaBoundaryProps {
  /** Content to render when no error has occurred */
  children: ReactNode;
  /** Custom fallback UI receiving error details and recovery actions */
  fallback: (props: SagaBoundaryFallbackProps) => ReactNode;
  /** Called when the boundary catches a saga error */
  onError?: (error: SagaError<unknown>, executionId: string | undefined) => void;
}

interface SagaBoundaryFallbackProps {
  /** The saga error that was caught */
  error: SagaError<unknown>;
  /** Execution ID of the failed saga, if available */
  executionId: string | undefined;
  /** Whether compensation succeeded */
  compensated: boolean;
  /** Reset the boundary and re-render children */
  reset: () => void;
  /** Retry the failed saga execution */
  retry: () => void;
}
```

#### Types

```typescript
import type { UseSagaResult, SagaBoundaryProps } from "@hex-di/saga-react";
```

---

_Previous: [14 - Introspection](./14-introspection.md)_ | _Next: [16 - Appendices](./16-appendices.md)_
