---
sidebar_position: 1
title: API Reference
---

# API Reference

Complete API reference for @hex-di/flow organized by category.

## Machine Definition

### defineMachine

Creates a state machine with full type inference.

```typescript
function defineMachine<TStateNames, TEventNames, TContext>(
  config: MachineConfig<TStateNames, TEventNames, TContext>
): Machine<TStateNames, TEventNames, TContext>;
```

**Parameters:**

- `config.id` - Unique machine identifier
- `config.initial` - Initial state (optional, inferred if unambiguous)
- `config.states` - Record of state configurations
- `config.context` - Initial context value

### createMachineBuilder

Fluent builder API for creating machines.

```typescript
function createMachineBuilder<TContext>(config: {
  id: string;
  context: TContext;
}): StatePhaseBuilder<TContext>;
```

**Builder Methods:**

- `.addState(name, config?)` - Add a state
- `.transitions()` - Switch to transition phase
- `.on(from, event, to, config?)` - Define transition
- `.build()` - Create the machine

## Types

### State

Branded state type with optional context.

```typescript
type State<TName extends string, TContext = void> = {
  readonly [StateBrandSymbol]: [TName, TContext];
};
```

### Event

Branded event type with optional payload.

```typescript
type Event<TName extends string, TPayload = void> = {
  readonly [EventBrandSymbol]: [TName, TPayload];
};
```

### Machine

Complete machine type with states, events, and context.

```typescript
type Machine<TStateNames, TEventNames, TContext> = {
  readonly [MachineBrandSymbol]: [TStateNames, TEventNames, TContext];
  readonly id: string;
  readonly initial: TStateNames;
  readonly states: Record<TStateNames, StateNode>;
  readonly context: TContext;
};
```

### Universal Types

- `StateAny` - Matches any state
- `EventAny` - Matches any event
- `MachineAny` - Matches any machine

## Effects

### Effect.invoke

Invoke a port method.

```typescript
Effect.invoke(
  port: string,
  method: string,
  args?: unknown,
  options?: { compensate?: EffectAny }
): InvokeEffect
```

### Effect.spawn

Start an activity.

```typescript
Effect.spawn(
  activityId: string,
  input: unknown,
  options?: { compensate?: EffectAny }
): SpawnEffect
```

### Effect.stop

Stop a running activity.

```typescript
Effect.stop(activityId: string): StopEffect
```

### Effect.emit

Emit an event to the machine.

```typescript
Effect.emit(
  event: EventAny,
  options?: { delay?: number; compensate?: EffectAny }
): EmitEffect
```

### Effect.delay

Wait for a duration.

```typescript
Effect.delay(
  ms: number,
  options?: { compensate?: EffectAny }
): DelayEffect
```

### Effect.parallel

Run effects concurrently.

```typescript
Effect.parallel(effects: EffectAny[]): ParallelEffect
```

### Effect.sequence

Run effects sequentially.

```typescript
Effect.sequence(effects: EffectAny[]): SequenceEffect
```

### Effect.none

No-op effect.

```typescript
Effect.none(): NoneEffect
```

### Effect.choose

Conditional effect branching.

```typescript
Effect.choose(branches: Array<{
  predicate: (context: any) => boolean;
  effect: EffectAny;
}>): ChooseEffect
```

### Effect.log

Log a message.

```typescript
Effect.log(
  message: string | ((context: any) => string)
): LogEffect
```

## Runner

### createMachineRunner

Create a machine runner instance.

```typescript
function createMachineRunner<TStateNames, TEventNames, TContext>(
  machine: Machine<TStateNames, TEventNames, TContext>,
  options?: MachineRunnerOptions
): MachineRunner<TStateNames, TEventNames, TContext>;
```

**Options:**

- `executor` - Effect executor
- `activityManager` - Activity manager
- `collector` - Transition collector
- `tracingHook` - Tracing hook
- `maxQueueSize` - Max event queue size
- `history` - History configuration
- `clock` - Custom clock
- `eventValidator` - Event validation function
- `enforcePureGuards` - Enforce guard purity

### createBasicExecutor

Create a basic effect executor.

```typescript
function createBasicExecutor(): EffectExecutor;
```

Handles: `delay`, `none`, `parallel`, `sequence`

### MachineRunner

Runner instance methods:

- `snapshot(): MachineSnapshot` - Get current snapshot
- `state(): TStateNames` - Get current state
- `context(): TContext` - Get current context
- `stateValue(): StateValue` - Get hierarchical state
- `send(event): boolean` - Send single event
- `sendBatch(events): void` - Send multiple events
- `sendAndExecute(event): Promise<Result>` - Send and await effects
- `subscribe(fn): Unsubscribe` - Subscribe to transitions
- `getActivityStatus(id): ActivityInstance | undefined` - Get activity status
- `getTransitionHistory(): TransitionHistoryEntry[]` - Get transitions
- `getEffectHistory(): EffectExecutionEntry[]` - Get effects
- `dispose(): void` - Clean up resources

### MachineSnapshot

Machine state snapshot:

```typescript
interface MachineSnapshot<TStateNames, TContext> {
  state: TStateNames;
  context: TContext;
  activities: Record<string, ActivityInstance>;
  pendingEvents: PendingEvent[];
  stateValue: StateValue;
  matches(path: string): boolean;
  can(event: EventAny): boolean;
}
```

## Activities

### createActivityManager

Create an activity manager.

```typescript
function createActivityManager(config?: ActivityManagerConfig): ActivityManager;
```

**Config:**

- `maxConcurrent` - Max concurrent activities
- `defaultTimeout` - Default timeout

### activityPort

Define an activity port.

```typescript
function activityPort<TInput, TOutput>()(
  name: string
): ActivityPort<TInput, TOutput>
```

### defineEvents

Define typed event factories.

```typescript
function defineEvents<T extends Record<string, EventFactory>>(events: T): T & EventTypes<T>;
```

### Activity Interface

```typescript
interface Activity<TInput, TOutput> {
  execute(input: TInput, sink: EventSink, signal: AbortSignal): Promise<TOutput>;
}
```

## Integration

### createFlowAdapter

Create a DI adapter for a machine.

```typescript
function createFlowAdapter<TProvides, TRequires>(
  config: FlowAdapterConfig<TProvides, TRequires>
): FlowAdapter;
```

**Config:**

- `provides` - Port this adapter provides
- `requires` - Required dependencies
- `lifetime` - Adapter lifetime
- `machine` - State machine
- `activities` - Activity definitions

### createDIEffectExecutor

Create a DI-aware effect executor.

```typescript
function createDIEffectExecutor(config: DIEffectExecutorConfig): DIEffectExecutor;
```

**Config:**

- `scopeResolver` - Resolve container scope
- `ports` - Port mappings
- `activities` - Activity port mappings
- `fallback` - Fallback handler

## Serialization

### serializeMachineState

Serialize machine state.

```typescript
function serializeMachineState(
  runner: MachineRunnerAny,
  machineId: string,
  options?: SerializeOptions
): Result<SerializedMachineState, SerializationError>;
```

**Options:**

- `clock` - Custom clock for timestamp
- `version` - Schema version
- `includeHash` - Include definition hash

### restoreMachineState

Restore machine from serialized state.

```typescript
function restoreMachineState(
  serialized: SerializedMachineState,
  machine: MachineAny,
  options?: RestoreOptions
): Result<MachineRunnerAny, RestoreError>;
```

**Options:**

- `contextValidator` - Validate context
- `migrationRegistry` - Version migrations

## Tracing

### FlowTransitionEvent

Transition event for tracing:

```typescript
interface FlowTransitionEvent {
  id: string;
  machineId: string;
  prevState: string;
  event: EventAny;
  nextState: string;
  effects: EffectAny[];
  timestamp: number;
  duration?: number;
  hash?: string;
}
```

### FlowCollector

Collector interface:

```typescript
interface FlowCollector {
  collect(event: FlowTransitionEvent): void;
  query(filter?: FlowTransitionFilter): FlowTransitionEvent[];
  subscribe(fn: FlowSubscriber): Unsubscribe;
  getStats(): FlowStats;
  clear(): void;
}
```

### FlowMemoryCollector

In-memory collector implementation:

```typescript
class FlowMemoryCollector implements FlowCollector {
  constructor(policy?: FlowRetentionPolicy);
}
```

### NoOpFlowCollector

Zero-overhead no-op collector:

```typescript
const noopFlowCollector: FlowCollector;
```

## Patterns

### createMachineActivity

Create an activity from a child machine.

```typescript
function createMachineActivity<TInput, TOutput>(
  childMachine: MachineAny,
  config?: MachineActivityConfig<TInput, TOutput>
): Activity<TInput, TOutput>;
```

**Config:**

- `mapInput` - Map input to context
- `mapOutput` - Map context to output
- `doneEventType` - Completion event
- `errorEventType` - Error event
