# 14 - API Reference

_Previous: [13 - Advanced Patterns](./13-advanced.md)_ | _Next: [15 - Appendices](./15-appendices.md)_

---

Consolidated type signatures for the entire `@hex-di/flow` surface area. See individual spec files for detailed explanations and examples.

## 32. API Reference

### 32.1 @hex-di/flow Exports

#### Machine Definition

```typescript
import { defineMachine, createMachine, state, event } from "@hex-di/flow";

import type {
  Machine,
  MachineAny,
  MachineConfig,
  MachineConfigAny,
  MachineStatesRecord,
  StateNode,
  StateNodeAny,
  StateNodeTransitions,
  TransitionConfig,
  TransitionConfigAny,
  TransitionConfigOrArray,
  State,
  StateAny,
  Event,
  EventAny,
} from "@hex-di/flow";
```

```typescript
function defineMachine<
  const TContext,
  const TStates extends MachineStatesRecord<Extract<keyof TStates, string>, string, TContext>,
>(
  config: MachineConfig<TContext, TStates>
): Machine<Extract<keyof TStates, string>, InferEventNames<TStates>, TContext>;

/** @alias defineMachine - preserved for backward compatibility */
function createMachine<
  const TContext,
  const TStates extends MachineStatesRecord<Extract<keyof TStates, string>, string, TContext>,
>(
  config: MachineConfig<TContext, TStates>
): Machine<Extract<keyof TStates, string>, InferEventNames<TStates>, TContext>;

interface MachineConfig<TContext, TStates> {
  readonly id: string;
  readonly context: TContext;
  readonly initial: Extract<keyof TStates, string>;
  readonly states: TStates;
}

type Machine<TStateNames extends string, TEventNames extends string, TContext> = {
  readonly [MachineBrandSymbol]: [TStateNames, TEventNames, TContext];
  readonly id: string;
  readonly initial: TStateNames;
  readonly states: { readonly [S in TStateNames]: StateNode<TStateNames, TEventNames, TContext> };
  readonly context: TContext;
};

interface StateNode<TAllStates extends string, TAllEventNames extends string, TContext> {
  readonly entry?: readonly EffectAny[];
  readonly exit?: readonly EffectAny[];
  readonly on: {
    readonly [K in TAllEventNames]?: TransitionConfigOrArray<TAllStates, K, TContext>;
  };
}

interface TransitionConfig<
  TAllStates extends string,
  TTarget extends TAllStates,
  TEvent extends EventAny,
  TContext,
> {
  readonly target: TTarget;
  readonly guard?: (context: TContext, event: TEvent) => boolean;
  readonly actions?: readonly ((context: TContext, event: TEvent) => TContext)[];
  readonly effects?: readonly EffectAny[];
}
```

_Defined in: [02 - Core Concepts](./02-core-concepts.md#41-machine), [03 - Machine Definition](./03-machine-definition.md#5-machine-definition). `defineMachine` is the primary API; `createMachine` is an alias._

#### State and Event Factories

```typescript
function state<TName extends string>(name: TName): State<TName>;
function state<TName extends string, TContext>(name: TName): State<TName, TContext>;

function event<TName extends string>(name: TName): Event<TName>;
function event<TName extends string, TPayload>(name: TName): Event<TName, TPayload>;

type State<TName extends string, TContext = void> = {
  readonly [StateBrandSymbol]: [TName, TContext];
  readonly name: TName;
};

type Event<TName extends string, TPayload = void> = {
  readonly [EventBrandSymbol]: [TName, TPayload];
  readonly type: TName;
} & (TPayload extends void ? {} : { readonly payload: TPayload });
```

_Defined in: [02 - Core Concepts](./02-core-concepts.md#42-state), [02 - Core Concepts](./02-core-concepts.md#43-event)_

#### Effect Constructors

```typescript
import { Effect } from "@hex-di/flow";

import type {
  InvokeEffect,
  SpawnEffect,
  StopEffect,
  EmitEffect,
  DelayEffect,
  ParallelEffect,
  SequenceEffect,
  NoneEffect,
  ChooseEffect,
  LogEffect,
  EffectAny,
} from "@hex-di/flow";
```

```typescript
namespace Effect {
  function invoke<TPort extends Port<unknown, string>>(
    port: TPort,
    method: MethodNames<PortType<TPort>>,
    args: MethodParams<PortType<TPort>, typeof method>
  ): InvokeEffect<TPort>;

  function spawn<TPort extends ActivityPort<unknown, unknown, string>>(
    port: TPort,
    input: ActivityInput<TPort>
  ): SpawnEffect<TPort>;

  function stop(activityId: string): StopEffect;

  function emit<E extends EventAny>(event: E): EmitEffect<E>;

  function delay(ms: number | ((ctx: unknown) => number), event: EventAny): DelayEffect;

  function parallel(effects: readonly EffectAny[]): ParallelEffect;

  function sequence(effects: readonly EffectAny[]): SequenceEffect;

  function none(): NoneEffect;

  function choose(
    branches: readonly {
      readonly guard?: (context: unknown, event: EventAny) => boolean;
      readonly effects: readonly EffectAny[];
    }[]
  ): ChooseEffect;

  function log(message: string | ((context: unknown, event: EventAny) => string)): LogEffect;
}

interface InvokeEffect<TPort extends Port<unknown, string>> {
  readonly _tag: "Invoke";
  readonly port: TPort;
  readonly method: string;
  readonly args: readonly unknown[];
}

interface SpawnEffect<TPort extends ActivityPort<unknown, unknown, string>> {
  readonly _tag: "Spawn";
  readonly port: TPort;
  readonly input: ActivityInput<TPort>;
}

interface StopEffect {
  readonly _tag: "Stop";
  readonly activityId: string;
}

interface EmitEffect<E extends EventAny> {
  readonly _tag: "Emit";
  readonly event: E;
}

interface DelayEffect {
  readonly _tag: "Delay";
  readonly ms: number | ((ctx: unknown) => number);
  readonly event: EventAny;
}

interface ParallelEffect {
  readonly _tag: "Parallel";
  readonly effects: readonly EffectAny[];
}

interface SequenceEffect {
  readonly _tag: "Sequence";
  readonly effects: readonly EffectAny[];
}

interface NoneEffect {
  readonly _tag: "None";
}

interface ChooseEffect {
  readonly _tag: "Choose";
  readonly branches: readonly {
    readonly guard?: (context: unknown, event: EventAny) => boolean;
    readonly effects: readonly EffectAny[];
  }[];
}

interface LogEffect {
  readonly _tag: "Log";
  readonly message: string | ((context: unknown, event: EventAny) => string);
}
```

_Defined in: [05 - Effect System](./05-effects.md#9-effect-architecture), [05 - Effect System](./05-effects.md#10-effect-descriptors)_

#### Activity System

```typescript
import { activityPort, defineEvents, activity, createActivityManager } from "@hex-di/flow";

import type {
  ActivityPort,
  ActivityInput,
  ActivityOutput,
  Activity,
  EventSink,
  ActivityInstance,
  ActivityStatus,
  ActivityConfig,
  ConfiguredActivity,
  ConfiguredActivityAny,
  ActivityManager,
  ActivityManagerConfig,
  SpawnOptions,
  ActivityContext,
  CleanupReason,
  ResolvedActivityDeps,
} from "@hex-di/flow";
```

```typescript
function activityPort<TInput, TOutput>(): <const TName extends string>(
  name: TName
) => ActivityPort<TInput, TOutput, TName>;

type ActivityPort<TInput, TOutput, TName extends string> = Port<
  Activity<TInput, TOutput>,
  TName
> & {
  readonly [ActivityPortBrand]: [TInput, TOutput];
};
```

_Defined in: [06 - Activities](./06-activities.md#13-activity-ports--configuration)_

```typescript
function defineEvents<
  const TDef extends Record<string, (...args: never[]) => Record<string, unknown>>,
>(
  def: TDef
): {
  [K in keyof TDef]: EventFactory<K & string, ReturnType<TDef[K]>>;
} & {
  _types: EventTypes<TDef>;
};

type EventFactory<TName extends string, TPayload> = (
  ...args: Parameters<(payload: TPayload) => TPayload>
) => Event<TName, TPayload>;
```

_Defined in: [06 - Activities](./06-activities.md#12-activity-system)_

```typescript
function activity<
  TPort extends ActivityPort<unknown, unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
  TEvents,
>(
  port: TPort,
  config: ActivityConfig<TPort, TRequires, TEvents>
): ConfiguredActivity<TPort, TRequires, TEvents>;

interface ActivityConfig<TPort extends ActivityPort<unknown, unknown, string>, TRequires, TEvents> {
  readonly requires?: TRequires;
  readonly events?: TEvents;
  readonly run: (
    ctx: ActivityContext<TPort, TRequires, TEvents>
  ) =>
    | Result<ActivityOutput<TPort>, unknown>
    | ResultAsync<ActivityOutput<TPort>, unknown>
    | Promise<ActivityOutput<TPort>>
    | void;
  readonly cleanup?: (reason: CleanupReason) => Result<void, CleanupError> | void;
}

interface ActivityContext<TPort, TRequires, TEvents> {
  readonly input: ActivityInput<TPort>;
  readonly signal: AbortSignal;
  readonly emit: TypedEventSink<TEvents>;
  readonly deps: ResolvedActivityDeps<TRequires>;
}

type CleanupReason = "completed" | "cancelled" | "timeout" | "error";
```

_Defined in: [06 - Activities](./06-activities.md#14-activity-lifecycle)_

```typescript
function createActivityManager(config: ActivityManagerConfig): ActivityManager;

interface ActivityManager {
  spawn<TPort extends ActivityPort<unknown, unknown, string>>(
    activity: ConfiguredActivity<TPort, readonly Port<unknown, string>[], unknown>,
    input: ActivityInput<TPort>,
    options?: SpawnOptions
  ): ActivityInstance;

  stop(activityId: string): void;
  stopAll(): void;
  get(activityId: string): ActivityInstance | undefined;
  getAll(): readonly ActivityInstance[];
  dispose(): ResultAsync<void, DisposeError>;
}

interface ActivityInstance {
  readonly id: string;
  readonly portName: string;
  readonly status: ActivityStatus;
  readonly startedAt: number;
  readonly completedAt: number | undefined;
  readonly error: EffectExecutionError | undefined;
}

type ActivityStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

interface SpawnOptions {
  readonly id?: string;
  readonly timeout?: number;
}
```

_Defined in: [06 - Activities](./06-activities.md#14-activity-lifecycle)_

#### Runner and Interpreter

```typescript
import { createMachineRunner, createBasicExecutor, transition } from "@hex-di/flow";

import type {
  MachineRunner,
  MachineRunnerAny,
  MachineRunnerOptions,
  MachineSnapshot,
  EffectExecutor,
  TransitionResult,
} from "@hex-di/flow";
```

```typescript
function transition<M extends MachineAny>(
  machine: M,
  snapshot: MachineSnapshot<InferMachineStateNames<M>, InferMachineContextType<M>>,
  event: InferMachineEvent<M>
): TransitionResult<M>;

interface TransitionResult<M extends MachineAny> {
  readonly state: InferMachineStateNames<M>;
  readonly context: InferMachineContextType<M>;
  readonly effects: readonly EffectAny[];
  readonly transitioned: boolean;
}
```

_Defined in: [08 - Runner & Interpreter](./08-runner.md#17-pure-interpreter)_

```typescript
function createMachineRunner<M extends MachineAny>(
  machine: M,
  options: MachineRunnerOptions<M>
): MachineRunner<M>;

interface MachineRunnerOptions<M extends MachineAny> {
  readonly executor: EffectExecutor;
  readonly activityManager?: ActivityManager;
  readonly collector?: FlowCollector;
}

interface MachineRunner<M extends MachineAny> {
  readonly snapshot: MachineSnapshot<InferMachineStateNames<M>, InferMachineContextType<M>>;
  send(event: InferMachineEvent<M>): Result<readonly EffectAny[], TransitionError>;
  sendAndExecute(
    event: InferMachineEvent<M>
  ): ResultAsync<void, TransitionError | EffectExecutionError>;
  sendBatch(
    events: readonly InferMachineEvent<M>[]
  ): Result<readonly TransitionResult<M>[], TransitionError>;
  subscribe(
    listener: (
      snapshot: MachineSnapshot<InferMachineStateNames<M>, InferMachineContextType<M>>
    ) => void
  ): Subscription;
  dispose(): ResultAsync<void, DisposeError>;
}

interface MachineSnapshot<TState extends string, TContext> {
  readonly state: TState;
  readonly context: TContext;
  readonly activities: readonly ActivityInstance[];
  readonly pendingEvents: readonly PendingEvent[];
}

interface PendingEvent {
  readonly type: string;
  readonly payload?: unknown;
  readonly source: "emit" | "delay" | "external";
  readonly enqueuedAt: number;
}

interface EffectExecutor {
  execute(
    effect: EffectAny,
    snapshot: MachineSnapshot<string, unknown>
  ): ResultAsync<void, EffectExecutionError>;
}

type Subscription = { unsubscribe(): void };
```

_Defined in: [08 - Runner & Interpreter](./08-runner.md#18-machine-runner), [08 - Runner & Interpreter](./08-runner.md#19-snapshots--subscriptions)_

#### HexDI Integration

```typescript
import {
  createFlowPort,
  createFlowAdapter,
  createDIEffectExecutor,
  createFlowEventBus,
} from "@hex-di/flow";

import type {
  FlowPort,
  FlowAdapter,
  FlowAdapterConfig,
  FlowService,
  FlowServiceAny,
  DIEffectExecutor,
  DIEffectExecutorConfig,
  FlowEventBus,
  ScopeResolver,
  EffectExecutionError,
  TransitionError,
  FlowAdapterError,
  DisposeError,
  SerializationError,
  RestoreError,
  CleanupError,
} from "@hex-di/flow";
```

```typescript
function createFlowPort<TService extends FlowServiceAny>(): <const TName extends string>(
  name: TName
) => FlowPort<TService, TName>;

type FlowPort<TService extends FlowServiceAny, TName extends string> = Port<TService, TName>;

interface FlowService<M extends MachineAny> {
  snapshot(): MachineSnapshot<InferMachineStateNames<M>, InferMachineContextType<M>>;
  state(): InferMachineStateNames<M>;
  context(): InferMachineContextType<M>;
  send(event: InferMachineEvent<M>): Result<readonly EffectAny[], TransitionError>;
  sendAndExecute(
    event: InferMachineEvent<M>
  ): ResultAsync<void, TransitionError | EffectExecutionError>;
  subscribe(
    listener: (
      snapshot: MachineSnapshot<InferMachineStateNames<M>, InferMachineContextType<M>>
    ) => void
  ): Subscription;
  getActivityStatus(activityId: string): ActivityStatus | undefined;
  dispose(): ResultAsync<void, DisposeError>;
  readonly isDisposed: boolean;
}
```

_Defined in: [07 - Ports & Adapters](./07-ports-and-adapters.md#15-flow-ports)_

```typescript
function createFlowAdapter<
  TPort extends FlowPort<FlowServiceAny, string>,
  const TRequires extends readonly Port<unknown, string>[],
  const TActivities extends readonly ConfiguredActivityAny[],
>(
  config: FlowAdapterConfig<TPort, TRequires, TActivities>
): Result<FlowAdapter<TPort, TRequires>, FlowAdapterError>;

interface FlowAdapterConfig<TPort, TRequires, TActivities> {
  readonly provides: TPort;
  readonly machine: InferFlowMachine<TPort>;
  readonly requires?: TRequires;
  readonly activities?: TActivities;
  readonly lifetime?: "singleton" | "scoped" | "transient";
  readonly defaultActivityTimeout?: number;
  readonly maxQueueSize?: number; // default: 1000
  readonly collector?: FlowCollector;
  readonly allowRemoteEvents?: boolean; // default: false, enables MCP flow.send_event
}

type FlowAdapter<TPort, TRequires> = Adapter<
  TPort,
  TupleToUnion<TRequires>,
  "scoped",
  "sync",
  false,
  TRequires
>;
```

_Defined in: [07 - Ports & Adapters](./07-ports-and-adapters.md#16-flow-adapters)_

```typescript
/** Mediator that decouples DIEffectExecutor from MachineRunner for EmitEffect routing */
function createFlowEventBus(): FlowEventBus;

interface FlowEventBus {
  emit(event: EventAny): void;
  subscribe(callback: (event: EventAny) => void): Unsubscribe;
}

function createDIEffectExecutor(config: DIEffectExecutorConfig): DIEffectExecutor;

interface DIEffectExecutorConfig {
  readonly scope: ScopeResolver;
  readonly activityManager: ActivityManager;
  readonly eventBus?: FlowEventBus;
  readonly activityRegistry?: ActivityRegistry;
  readonly activityDepsResolver?: ActivityDepsResolver;
  readonly tracingHook?: FlowTracingHook;
  readonly onError?: (error: EffectExecutionError, effect: EffectAny) => void;
}

interface ScopeResolver {
  resolve<P extends Port<unknown, string>>(port: P): InferService<P>;
  resolveResult<P extends Port<unknown, string>>(port: P): Result<InferService<P>, ResolutionError>;
}

interface DIEffectExecutor extends EffectExecutor {
  execute(
    effect: EffectAny,
    snapshot: MachineSnapshot<string, unknown>
  ): ResultAsync<void, EffectExecutionError>;
}
```

_Defined in: [07 - Ports & Adapters](./07-ports-and-adapters.md#16-flow-adapters)_

#### Tracing and DevTools

```typescript
import {
  NoOpFlowCollector,
  noopFlowCollector,
  FlowMemoryCollector,
  createTracingRunner,
  createTracingRunnerWithDuration,
  createFlowTracingHook,
  createFlowRegistry,
  createFlowInspector,
  computeFlowMetadata,
  getActivityMetadata,
  FlowRegistryPort,
} from "@hex-di/flow";

import type {
  FlowCollector,
  FlowTransitionEvent,
  FlowTransitionEventAny,
  FlowTransitionFilter,
  FlowStats,
  FlowRetentionPolicy,
  FlowSubscriber,
  Unsubscribe,
  TracingRunnerOptions,
  ActivityMetadata,
  FlowAdapterMetadata,
  FlowRegistry,
  FlowRegistryEntry,
  FlowRegistryEvent,
  FlowInspector,
  FlowTracingHook,
  FlowTracingHookOptions,
  MachineStateSnapshot,
  AllMachinesSnapshot,
  FlowContainerSnapshot,
  FlowHealthEvent,
  FlowErrorDetail,
  FlowDegradedDetail,
  FlowRecoveredDetail,
  ValidTransition,
  EffectHistoryEntry,
  MachineDefinitionExport,
  PendingEvent,
  ResultStatistics,
} from "@hex-di/flow";
```

```typescript
interface FlowCollector {
  record(event: FlowTransitionEventAny): void;
  subscribe(listener: FlowSubscriber): Unsubscribe;
  getHistory(filter?: FlowTransitionFilter): readonly FlowTransitionEventAny[];
  getStats(): FlowStats;
  clear(): void;
}

interface FlowTransitionEvent<TState extends string, TEventName extends string, TContext> {
  readonly machineId: string;
  readonly fromState: TState;
  readonly toState: TState;
  readonly eventType: TEventName;
  readonly context: TContext;
  readonly effects: readonly EffectAny[];
  readonly timestamp: number;
  readonly durationMs?: number;
}

interface FlowStats {
  readonly totalTransitions: number;
  readonly transitionsByState: Record<string, number>;
  readonly transitionsByEvent: Record<string, number>;
  readonly averageDurationMs: number;
  readonly errorCount: number;
}
```

_Defined in: [12 - Introspection & DevTools](./12-introspection.md#27-tracing--collectors), [12 - Introspection & DevTools](./12-introspection.md#28-devtools-integration)_

```typescript
function createTracingRunner<M extends MachineAny>(
  machine: M,
  options: TracingRunnerOptions<M>
): MachineRunner<M>;

interface TracingRunnerOptions<M extends MachineAny> extends MachineRunnerOptions<M> {
  readonly collector: FlowCollector;
}

function getActivityMetadata(activity: ConfiguredActivityAny): ActivityMetadata;

interface ActivityMetadata {
  readonly portName: string;
  readonly requires: readonly string[];
  readonly hasEvents: boolean;
  readonly hasCleanup: boolean;
}
```

_Defined in: [12 - Introspection & DevTools](./12-introspection.md#27-tracing--collectors)_

```typescript
function createFlowTracingHook(tracer: Tracer, options?: FlowTracingHookOptions): FlowTracingHook;

interface FlowTracingHookOptions {
  readonly filter?: (machineId: string) => boolean;
  readonly traceEffects?: boolean; // default: true
  readonly minTransitionDurationMs?: number; // default: 0
}

interface FlowTracingHook {
  onTransitionStart(machineId: string, event: EventAny, fromState: string): void;
  onTransitionEnd(
    machineId: string,
    toState: string,
    effects: readonly EffectAny[],
    result: Result<void, TransitionError>
  ): void;
  onEffectStart(machineId: string, effect: EffectAny): void;
  onEffectEnd(
    machineId: string,
    effect: EffectAny,
    result: Result<void, EffectExecutionError>
  ): void;
}
```

_Defined in: [12 - Introspection & DevTools](./12-introspection.md). Auto-wired by `createFlowAdapter` when `TracerPort` is available. Uses shared `pushSpan`/`popSpan` span stack from `@hex-di/tracing` for unified trace trees._

```typescript
interface FlowAdapterMetadata {
  readonly machineId: string;
  readonly stateNames: readonly string[];
  readonly eventNames: readonly string[];
  readonly initialState: string;
  readonly finalStates: readonly string[];
  readonly transitionsPerState: Record<
    string,
    readonly {
      readonly event: string;
      readonly target: string;
      readonly hasGuard: boolean;
      readonly hasEffects: boolean;
    }[]
  >;
  readonly activityPortNames: readonly string[];
  readonly stateCount: number;
  readonly eventCount: number;
}
```

_Defined in: [07 - Ports & Adapters](./07-ports-and-adapters.md). REQUIRED -- computed by `computeFlowMetadata()` and attached to adapter `metadata` property at creation time for Layer 1 structural queries._

```typescript
function createFlowRegistry(): FlowRegistry;

interface FlowRegistryEntry {
  readonly service: FlowServiceAny;
  readonly portName: string;
  readonly instanceId: string;
  readonly scopeId: string;
  readonly scopeName?: string;
  readonly registeredAt: number;
}

/** Per-scope registry: each container scope owns its own FlowRegistry instance (scoped lifetime) */
interface FlowRegistry {
  register(entry: FlowRegistryEntry): void;
  unregister(portName: string, instanceId: string): void;
  getAllMachines(portName: string): readonly FlowRegistryEntry[];
  getMachine(portName: string, instanceId: string): FlowRegistryEntry | undefined;
  getAllPortNames(): readonly string[];
  getTotalMachineCount(): number;
  getMachinesByState(stateName: string): readonly FlowRegistryEntry[];
  subscribe(listener: (event: FlowRegistryEvent) => void): Unsubscribe;
}

type FlowRegistryEvent =
  | { readonly type: "machine-registered"; readonly entry: FlowRegistryEntry }
  | { readonly type: "machine-unregistered"; readonly entry: FlowRegistryEntry };

function createFlowInspector(
  registry: FlowRegistry,
  collector?: FlowCollector,
  config?: FlowInspectorConfig
): FlowInspector;

interface FlowInspector {
  getMachineState(portName: string, instanceId?: string): MachineStateSnapshot;
  getValidTransitions(portName: string, instanceId?: string): readonly ValidTransition[];
  getRunningActivities(portName: string, instanceId?: string): readonly ActivityInstance[];
  getEventHistory(
    portName: string,
    options?: { limit?: number; since?: number; eventType?: string }
  ): readonly FlowTransitionEventAny[];
  getStateHistory(
    portName: string,
    instanceId?: string
  ): readonly { state: string; enteredAt: number; exitedAt: number | undefined }[];
  getEffectHistory(
    portName: string,
    options?: { limit?: number; since?: number }
  ): readonly EffectHistoryEntry[];
  getAllMachinesSnapshot(): AllMachinesSnapshot;
  getMachinesByState(stateName: string): readonly MachineStateSnapshot[];
  getHealthEvents(options?: {
    limit?: number;
    since?: number;
    type?: FlowHealthEvent["type"];
  }): readonly FlowHealthEvent[];
  getEffectResultStatistics(portName: string): ResultStatistics | undefined;
  getHighErrorRatePorts(threshold: number): readonly ResultStatistics[];
}

interface ValidTransition {
  readonly event: string;
  readonly target: string;
  readonly guardResult?: boolean;
}

interface EffectHistoryEntry {
  readonly machineId: string;
  readonly transitionId: string;
  readonly effect: EffectAny;
  readonly portName?: string;
  readonly method?: string;
  readonly durationMs: number;
  readonly success: boolean;
  readonly error?: EffectExecutionError;
  readonly timestamp: number;
}

interface MachineStateSnapshot {
  readonly portName: string;
  readonly instanceId: string;
  readonly scopeId: string;
  readonly state: string;
  readonly context: unknown;
  readonly validTransitions: readonly ValidTransition[];
  readonly runningActivities: readonly ActivityInstance[];
  readonly pendingEvents: readonly PendingEvent[];
  readonly isDisposed: boolean;
}

interface AllMachinesSnapshot {
  readonly timestamp: number;
  readonly machines: readonly MachineStateSnapshot[];
  readonly totalCount: number;
}

interface FlowContainerSnapshot {
  readonly totalMachines: number;
  readonly portNames: readonly string[];
  readonly machines: readonly MachineStateSnapshot[];
  readonly healthEvents: readonly FlowHealthEvent[];
}

interface FlowHealthEvent {
  readonly type: "flow-error" | "flow-degraded" | "flow-recovered";
  readonly machineId: string;
  readonly portName: string;
  readonly instanceId: string;
  readonly scopeId: string;
  readonly timestamp: number;
  readonly detail: FlowErrorDetail | FlowDegradedDetail | FlowRecoveredDetail;
}

interface FlowErrorDetail {
  readonly errorState: string;
  readonly lastEventType: string;
  readonly context: unknown;
}

interface FlowDegradedDetail {
  readonly failingPort: string;
  readonly effectType: string;
  readonly failureCount: number;
  readonly windowMs: number;
  readonly errorsByTag?: Record<string, number>;
}

interface FlowRecoveredDetail {
  readonly previousErrorState: string;
  readonly recoveredToState: string;
}

interface MachineDefinitionExport {
  readonly machineId: string;
  readonly states: readonly string[];
  readonly events: readonly string[];
  readonly initial: string;
  readonly finalStates: readonly string[];
  readonly transitions: Record<
    string,
    readonly { event: string; target: string; hasGuard: boolean; hasEffects: boolean }[]
  >;
  readonly activityPortNames: readonly string[];
}
```

_Defined in: [12 - Introspection & DevTools](./12-introspection.md)_

#### Error Types (Tagged Unions)

All error types use `_tag` discriminant per Result spec §49 convention. These replace the previous class-based exception hierarchy.

```typescript
import type {
  EffectExecutionError,
  TransitionError,
  FlowAdapterError,
  DisposeError,
  SerializationError,
  RestoreError,
  CleanupError,
} from "@hex-di/flow";
```

```typescript
/** Errors from effect execution (EffectExecutor.execute, sendAndExecute) */
type EffectExecutionError =
  | {
      readonly _tag: "InvokeError";
      readonly portName: string;
      readonly method: string;
      readonly cause: unknown;
    }
  | { readonly _tag: "SpawnError"; readonly activityPortName: string; readonly cause: unknown }
  | { readonly _tag: "StopError"; readonly activityId: string; readonly cause: unknown }
  | {
      readonly _tag: "ResolutionError";
      readonly portName: string;
      readonly resolution: ResolutionError;
    }
  | {
      readonly _tag: "SequenceAborted";
      readonly failedIndex: number;
      readonly cause: EffectExecutionError;
    }
  | { readonly _tag: "ParallelErrors"; readonly errors: readonly EffectExecutionError[] };

/** Errors from state transitions (send, sendAndExecute) */
type TransitionError =
  | {
      readonly _tag: "GuardThrew";
      readonly guardName?: string;
      readonly state: string;
      readonly cause: unknown;
    }
  | {
      readonly _tag: "ActionThrew";
      readonly actionIndex: number;
      readonly state: string;
      readonly cause: unknown;
    }
  | { readonly _tag: "Disposed" }
  | { readonly _tag: "QueueOverflow"; readonly queueSize: number; readonly maxQueueSize: number };

/** Errors from adapter creation (createFlowAdapter, computeFlowMetadata) */
type FlowAdapterError =
  | {
      readonly _tag: "MetadataInvalid";
      readonly reason: "NoStates" | "InvalidInitialState" | "EmptyMachineId";
      readonly detail: string;
    }
  | { readonly _tag: "DuplicateActivityPort"; readonly portName: string }
  | { readonly _tag: "ActivityNotFrozen"; readonly portName: string };

/** Errors from runner disposal */
type DisposeError = {
  readonly _tag: "ActivityCleanupFailed";
  readonly failures: readonly { activityId: string; cause: unknown }[];
};

/** Errors from machine state serialization */
type SerializationError =
  | { readonly _tag: "NonSerializableContext"; readonly path: string; readonly valueType: string }
  | { readonly _tag: "CircularReference"; readonly path: string };

/** Errors from machine state restoration */
type RestoreError =
  | {
      readonly _tag: "InvalidState";
      readonly state: string;
      readonly validStates: readonly string[];
    }
  | { readonly _tag: "MachineIdMismatch"; readonly expected: string; readonly received: string }
  | { readonly _tag: "SnapshotCorrupted"; readonly detail: string };

/** Errors from activity cleanup */
type CleanupError = {
  readonly _tag: "CleanupFailed";
  readonly activityId: string;
  readonly reason: CleanupReason;
  readonly cause: unknown;
};
```

_Defined in: [05 - Effect System](./05-effects.md) "Flow Error Types (Result Integration)". Cross-reference: `ResolutionError` from `@hex-di/result` (spec/result/12-hexdi-integration.md §53)._

#### Persistence & Recovery

```typescript
import { serializeMachineState, restoreMachineState } from "@hex-di/flow";

import type { SerializedMachineState } from "@hex-di/flow";
```

```typescript
function serializeMachineState<M extends MachineAny>(
  runner: MachineRunner<M>
): Result<SerializedMachineState, SerializationError>;

function restoreMachineState<M extends MachineAny>(
  machine: M,
  snapshot: SerializedMachineState
): Result<MachineRunner<M>, RestoreError>;

interface SerializedMachineState {
  readonly machineId: string;
  readonly state: string;
  readonly context: unknown;
  readonly timestamp: number;
}
```

_Defined in: [13 - Advanced Patterns](./13-advanced.md) "Persistence & Recovery"_

#### Type Utilities

```typescript
import type {
  // Machine inference
  InferMachineStateNames,
  InferMachineEventNames,
  InferMachineContextType,
  InferMachineState,
  InferMachineEvent,
  InferMachineContext,

  // State/Event inference
  InferStateName,
  InferStateContext,
  InferEventName,
  InferEventPayload,
  StateUnion,
  EventUnion,

  // Flow service inference
  InferFlowServiceState,
  InferFlowServiceEvent,
  InferFlowServiceContext,

  // Activity inference
  ActivityInput,
  ActivityOutput,

  // Port method extraction
  MethodNames,
  MethodParams,
  MethodReturn,

  // Utility
  DeepReadonly,
} from "@hex-di/flow";
```

```typescript
/** Extract state name union from a Machine */
type InferMachineStateNames<M> = M extends Machine<infer S, infer _E, infer _C> ? S : never;

/** Extract event name union from a Machine */
type InferMachineEventNames<M> = M extends Machine<infer _S, infer E, infer _C> ? E : never;

/** Extract context type from a Machine */
type InferMachineContextType<M> = M extends Machine<infer _S, infer _E, infer C> ? C : never;

/** Extract input type from an ActivityPort */
type ActivityInput<P> = P extends ActivityPort<infer I, infer _O, string> ? I : never;

/** Extract output type from an ActivityPort */
type ActivityOutput<P> = P extends ActivityPort<infer _I, infer O, string> ? O : never;

/** Extract method names from a port's service type */
type MethodNames<T> = {
  [K in keyof T]: T[K] extends (...args: never[]) => unknown ? K : never;
}[keyof T];

/** Extract method parameters for a specific method */
type MethodParams<T, M extends MethodNames<T>> = T[M] extends (...args: infer P) => unknown
  ? P
  : never;

/** Extract method return type for a specific method */
type MethodReturn<T, M extends MethodNames<T>> = T[M] extends (...args: never[]) => infer R
  ? R
  : never;

/** Recursively make all properties readonly */
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
```

_Defined in: [02 - Core Concepts](./02-core-concepts.md#4-core-concepts)_

---

### 32.2 @hex-di/flow/testing Exports

```typescript
import {
  createTestEventSink,
  createTestSignal,
  createTestDeps,
  testActivity,
  testMachine,
  testGuard,
  testTransition,
  testEffect,
  testFlowInContainer,
  serializeSnapshot,
  snapshotMachine,
  createVirtualClock,
  expectEvents,
  expectEventTypes,
  expectOkTransition,
  expectErrTransition,
  MissingMockError,
} from "@hex-di/flow/testing";

// Re-exports from @hex-di/result/testing for convenience
import { expectOk, expectErr, expectOkAsync, expectErrAsync } from "@hex-di/flow/testing";

import type {
  TestEventSink,
  TestSignal,
  TestActivityResult,
  TestActivityOptions,
  TestMachineResult,
  TestMachineOptions,
  ContainerTestOptions,
  VirtualClock,
  MocksFor,
} from "@hex-di/flow/testing";
```

```typescript
function testActivity<A extends ConfiguredActivityAny>(
  activity: A,
  options: TestActivityOptions<A>
): Promise<TestActivityResult<A>>;

interface TestActivityOptions<A extends ConfiguredActivityAny> {
  readonly input: InferActivityInput<A>;
  readonly mocks?: MocksFor<InferActivityRequires<A>>;
  readonly timeout?: number;
  readonly signal?: AbortSignal;
}

interface TestActivityResult<A extends ConfiguredActivityAny> {
  readonly output: InferActivityOutput<A>;
  readonly events: readonly EventAny[];
  readonly durationMs: number;
}
```

_Defined in: [11 - Testing](./11-testing.md#25-testing-patterns)_

```typescript
function createTestEventSink(): TestEventSink;

interface TestEventSink extends EventSink {
  readonly events: readonly EventAny[];
  readonly lastEvent: EventAny | undefined;
  readonly eventCount: number;
  clear(): void;
}
```

_Defined in: [11 - Testing](./11-testing.md#26-test-harnesses)_

```typescript
function createTestSignal(): TestSignal;

interface TestSignal {
  readonly signal: AbortSignal;
  abort(reason?: string): void;
  readonly aborted: boolean;
}
```

_Defined in: [11 - Testing](./11-testing.md#26-test-harnesses)_

```typescript
function createTestDeps<TRequires extends readonly Port<unknown, string>[]>(
  mocks: MocksFor<TRequires>
): ResolvedActivityDeps<TRequires>;

type MocksFor<TRequires extends readonly Port<unknown, string>[]> = {
  [K in TRequires[number] as K extends Port<unknown, infer N> ? N : never]: K extends Port<
    infer T,
    string
  >
    ? T
    : never;
};

class MissingMockError extends Error {
  readonly portName: string;
}
```

_Defined in: [11 - Testing](./11-testing.md#26-test-harnesses)_

```typescript
function testMachine<M extends MachineAny>(
  machine: M,
  options?: TestMachineOptions<M>
): TestMachineResult<M>;

interface TestMachineOptions<M extends MachineAny> {
  readonly context?: InferMachineContextType<M>;
  readonly mocks?: MocksFor<readonly Port<unknown, string>[]>;
}

interface TestMachineResult<M extends MachineAny> {
  readonly runner: MachineRunner<M>;
  snapshot(): MachineSnapshot<InferMachineStateNames<M>, InferMachineContextType<M>>;
  send(event: InferMachineEvent<M>): ResultAsync<void, TransitionError | EffectExecutionError>;
  waitForState(stateName: InferMachineStateNames<M>, timeout?: number): Promise<void>;
  waitForEvent(eventType: string, timeout?: number): Promise<InferMachineEvent<M>>;
  cleanup(): void;
}

function testGuard<TContext, TEvent extends EventAny>(
  guardFn: (context: TContext, event: TEvent) => boolean,
  options: { context: TContext; event: TEvent }
): boolean;

function testTransition<M extends MachineAny>(
  machine: M,
  currentState: InferMachineStateNames<M>,
  event: InferMachineEvent<M>
): Result<
  {
    readonly target: InferMachineStateNames<M> | undefined;
    readonly effects: readonly EffectAny[];
    readonly context: InferMachineContextType<M> | undefined;
    readonly transitioned: boolean;
  },
  TransitionError
>;

function testEffect(
  effect: EffectAny,
  options: { mocks: MocksFor<readonly Port<unknown, string>[]> }
): ResultAsync<unknown, EffectExecutionError>;

/** Asserts Ok and returns unwrapped transition result, failing the test on Err */
function expectOkTransition<M extends MachineAny>(
  result: Result<
    {
      target: InferMachineStateNames<M> | undefined;
      effects: readonly EffectAny[];
      context: InferMachineContextType<M> | undefined;
      transitioned: boolean;
    },
    TransitionError
  >
): {
  target: InferMachineStateNames<M> | undefined;
  effects: readonly EffectAny[];
  context: InferMachineContextType<M> | undefined;
};

/** Asserts Err with specific _tag, failing the test on Ok */
function expectErrTransition(
  result: Result<unknown, TransitionError>,
  tag: TransitionError["_tag"]
): TransitionError;

function serializeSnapshot<TState extends string, TContext>(
  snapshot: MachineSnapshot<TState, TContext>
): Record<string, unknown>;

function snapshotMachine<M extends MachineAny>(
  machine: M,
  events: readonly InferMachineEvent<M>[]
): readonly MachineSnapshot<InferMachineStateNames<M>, InferMachineContextType<M>>[];

function createVirtualClock(): VirtualClock;

interface VirtualClock {
  advance(ms: number): void;
  now(): number;
  install(): void;
  uninstall(): void;
}

function testFlowInContainer<TProvides>(
  options: ContainerTestOptions<TProvides>
): ResultAsync<
  { service: TProvides; container: Container; dispose: () => ResultAsync<void, DisposeError> },
  FlowAdapterError
>;

interface ContainerTestOptions<TProvides> {
  readonly adapter: FlowAdapter;
  readonly mocks?: Record<string, unknown>;
  readonly containerName?: string;
}

function expectEvents(events: readonly EventAny[], expected: readonly Partial<EventAny>[]): void;

function expectEventTypes(events: readonly EventAny[], types: readonly string[]): void;
```

_Defined in: [11 - Testing](./11-testing.md)_

---

### 32.3 @hex-di/flow-react Exports

#### Hooks

```typescript
import { useMachine, useSelector, useSend, shallowEqual } from "@hex-di/flow-react";

import type { UseMachineResult, EqualityFn } from "@hex-di/flow-react";
```

```typescript
function useMachine<TPort extends FlowPort<FlowServiceAny, string>>(
  port: TPort
): UseMachineResult<InferFlowServiceFromPort<TPort>>;

interface UseMachineResult<TService extends FlowServiceAny> {
  /** Current state name, typed to the machine's state union */
  readonly state: InferFlowServiceState<TService>;
  /** Current context value, deeply readonly */
  readonly context: DeepReadonly<InferFlowServiceContext<TService>>;
  /** Type-safe send function accepting only the machine's event union */
  readonly send: (event: InferFlowServiceEvent<TService>) => void;
  /** All tracked activity instances */
  readonly activities: readonly ActivityInstance[];
}
```

_Defined in: [10 - React Integration](./10-react-integration.md#23-react-hooks)_

```typescript
function useSelector<TPort extends FlowPort<FlowServiceAny, string>, TSelected>(
  port: TPort,
  selector: (
    snapshot: MachineSnapshot<
      InferFlowServiceState<InferFlowServiceFromPort<TPort>>,
      InferFlowServiceContext<InferFlowServiceFromPort<TPort>>
    >
  ) => TSelected,
  equalityFn?: EqualityFn<TSelected>
): TSelected;

type EqualityFn<T> = (a: T, b: T) => boolean;

function shallowEqual<T>(a: T, b: T): boolean;
```

_Defined in: [10 - React Integration](./10-react-integration.md#23-react-hooks)_

```typescript
function useSend<TPort extends FlowPort<FlowServiceAny, string>>(
  port: TPort
): (event: InferFlowServiceEvent<InferFlowServiceFromPort<TPort>>) => void;
```

_Defined in: [10 - React Integration](./10-react-integration.md#23-react-hooks)_

#### Provider

```typescript
import { FlowProvider, useFlowCollector } from "@hex-di/flow-react";

import type { FlowProviderProps } from "@hex-di/flow-react";
```

```typescript
function FlowProvider(props: FlowProviderProps): ReactNode;

interface FlowProviderProps {
  readonly children: ReactNode;
  readonly collector?: FlowCollector;
}

function useFlowCollector(): FlowCollector;
```

_Defined in: [10 - React Integration](./10-react-integration.md#24-react-patterns)_

---

_Previous: [13 - Advanced Patterns](./13-advanced.md)_ | _Next: [15 - Appendices](./15-appendices.md)_
