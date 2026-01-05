# Specification: HexDI Flow Activity API Redesign

## Goal

Redesign the Activity API in `@hex-di/flow` to eliminate the service locator anti-pattern by using explicit dependency declarations via ports, following the established HexDI patterns from `createAdapter()`.

## User Stories

- As a developer, I want to declare activity dependencies using ports so that my activities have explicit, type-checked contracts
- As a developer, I want to emit type-safe events from activities so that the state machine receives correctly-typed payloads

## Specific Requirements

**activityPort Factory Function**

- Create typed activity port tokens using `activityPort<Input, Output>()('Name')` pattern
- Follow the curried API from `port<T>()('Name')` in `@hex-di/ports` for partial type inference
- Return `ActivityPort<TInput, TOutput, TName>` which is a specialized `Port` type
- Port stores activity metadata: input type, output type, name
- Type utilities: `ActivityInput<P>` extracts input type, `ActivityOutput<P>` extracts output type
- Port is frozen and immutable like standard HexDI ports
- Uses `const` type parameter modifier for automatic literal type inference

**defineEvents Helper Function**

- Create type-safe event definitions: `defineEvents({ NAME: (args) => payload })`
- Event payloads inferred from factory function return types
- Each factory produces `{ type: 'NAME'; ...payload }` at runtime
- Return type preserves literal types for all event names
- Supports zero-argument factories: `DONE: () => ({})` produces `{ type: 'DONE' }`
- Type utility `EventTypes<TEvents>` extracts union of all event type strings
- Factory functions are called at emit time, not definition time

**TypedEventSink Interface**

- Hybrid emit API supporting both patterns with full type safety
- Pattern A: `sink.emit(EventFactory(...args))` - pass event object from factory
- Pattern B: `sink.emit('TYPE', payload)` - pass type string and payload separately
- Type-level validation ensures only declared event types can be emitted
- `PayloadOf<TEvents, TType>` utility extracts payload type for a given event type
- For events with empty payload, second argument is optional
- Sink is provided to execute function via context object

**activity Factory Function**

- Signature: `activity(port, { requires, emits, execute, cleanup?, timeout? })`
- `requires` is a tuple of port dependencies using `const` type parameter modifier
- `emits` is the event definition object from `defineEvents()`
- `execute` is async function: `(input, context) => Promise<output>`
- Context object contains: `{ deps, sink, signal }` for DI, events, and cancellation
- Dependencies accessed via name-keyed object: `deps.Api`, `deps.Logger`
- Returns frozen activity definition object with `ActivityAny` variance

**Dependency Injection in Activities**

- Dependencies resolved from FlowAdapter's container scope
- Name-keyed deps object mirrors port names: `deps.PortName`
- `ResolvedActivityDeps<TRequires>` type maps requires tuple to deps object type
- Type-level validation ensures all required ports exist in deps
- No runtime resolution via container - deps pre-resolved by manager
- Activity cannot access ports not declared in `requires`

**Cleanup Callback**

- Optional `cleanup` property on activity definition
- Signature: `cleanup(reason: CleanupReason) => void | Promise<void>`
- `CleanupReason` is `'completed' | 'cancelled' | 'timeout' | 'error'`
- ActivityManager guarantees cleanup is called exactly once
- Cleanup runs even if execute throws - enables resource release
- Cleanup has access to same deps object as execute (pre-resolved)

**Timeout Configuration**

- Three-layer timeout system with fallback chain
- Layer 1: ActivityManager default timeout (constructor option)
- Layer 2: Activity definition timeout (optional property)
- Layer 3: Spawn-time override (highest precedence)
- When timeout triggers, signal is aborted with timeout reason
- Timeout triggers cleanup with `'timeout'` reason
- Type: `timeout?: number` in milliseconds

**Error Handling**

- System errors (abort, timeout, uncaught) handled by ActivityManager
- Domain errors must be declared in `emits` and explicitly emitted
- Uncaught exceptions in execute transition activity to 'failed' status
- System errors do not require declaration - implicit infrastructure concern
- ActivityManager captures error for programmatic access
- Cleanup receives `'error'` reason for uncaught exceptions

**FlowAdapter Integration**

- Add `activities` property to FlowAdapterConfig: `activities?: TActivities[]`
- Type-level validation: activity `requires` must be subset of FlowAdapter's available ports
- Available ports = FlowAdapter's `requires` union (resolved dependencies)
- Runtime validation: no duplicate activity ports, all activities frozen
- DevTools receives activity metadata for visualization
- Activities resolved lazily on first spawn, not at adapter creation

## Visual Design

No visual assets provided - this is a type-level API design.

## Existing Code to Leverage

**`/Users/mohammadalmechkor/Projects/hex-di/packages/graph/src/adapter/factory.ts`**

- `createAdapter()` pattern with `const` type parameter modifier for tuple inference
- `AdapterConfig` interface structure with provides/requires/lifetime/factory
- Factory function pattern receiving `ResolvedDeps<TRequires>`
- Frozen return object pattern with `Object.freeze()`
- Finalizer callback pattern for cleanup

**`/Users/mohammadalmechkor/Projects/hex-di/packages/graph/src/adapter/types.ts`**

- `ResolvedDeps<TRequires>` type mapping ports to name-keyed object
- `AdapterAny` variance pattern using `never` for contravariant, `unknown` for covariant
- Brand symbol pattern for nominal typing
- `InferClonable<A>` style type utilities for extracting metadata

**`/Users/mohammadalmechkor/Projects/hex-di/packages/ports/src/index.ts`**

- `port<T>()('Name')` curried API for partial type inference
- `Port` type with phantom brand and `__portName` property
- `InferService<P>` and `InferPortName<P>` type utilities
- `NotAPortError<T>` descriptive error type for invalid inputs
- `unsafeCreatePort` internal helper pattern

**`/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/activities/manager.ts`**

- `ActivityManager` interface with spawn/stop/getStatus/getAll/dispose
- `MutableActivityState` internal tracking with controller and promise
- AbortController per activity pattern
- Status management: 'running' | 'completed' | 'failed' | 'cancelled'
- Dispose pattern that aborts all and awaits promises

**`/Users/mohammadalmechkor/Projects/hex-di/packages/flow/src/integration/adapter.ts`**

- `createFlowAdapter()` factory with FlowAdapterConfig interface
- ScopeResolver pattern for port resolution from deps
- DIEffectExecutor creation with scope and activityManager
- Finalizer that calls dispose on FlowService

## Out of Scope

- Activity retry logic (can be built on top by activity authors)
- Activity saga/orchestration patterns (complex workflow coordination)
- Distributed activities (cross-process or network activity execution)
- Activity persistence/replay (state serialization and recovery)
- Automatic event emission on completion (explicit emit required)
- Activity composition (nesting activities within activities)
- Activity scheduling/queuing (priority queues, rate limiting)
- Activity metrics collection (prometheus, opentelemetry integration)
- Activity caching (memoization of activity results)
- Activity authorization (access control on activity execution)

---

## API Design

### Port Creation

```typescript
// Type definition
type ActivityPort<TInput, TOutput, TName extends string> = Port<
  Activity<TInput, TOutput>,
  TName
> & {
  readonly __activityInput: TInput;
  readonly __activityOutput: TOutput;
};

// Factory function with curried API for partial type inference
function activityPort<TInput, TOutput>(): <const TName extends string>(
  name: TName
) => ActivityPort<TInput, TOutput, TName>;

// Usage
const TaskActivityPort = activityPort<TaskInput, TaskOutput>()("TaskActivity");

// Type extraction utilities
type ActivityInput<P> = P extends ActivityPort<infer I, infer _O, infer _N> ? I : never;
type ActivityOutput<P> = P extends ActivityPort<infer _I, infer O, infer _N> ? O : never;
```

### Event Definition

```typescript
// defineEvents creates type-safe event factories
type EventDefinition<TType extends string, TPayload> = {
  readonly type: TType;
} & TPayload;

type EventFactory<TType extends string, TArgs extends unknown[], TPayload> = {
  (...args: TArgs): EventDefinition<TType, TPayload>;
  readonly type: TType;
};

// Factory function
function defineEvents<
  const TDef extends Record<string, (...args: never[]) => Record<string, unknown>>,
>(
  def: TDef
): {
  [K in keyof TDef]: TDef[K] extends (...args: infer A) => infer R
    ? EventFactory<K & string, A, R>
    : never;
};

// Usage
const TaskEvents = defineEvents({
  PROGRESS: (percent: number) => ({ percent }),
  COMPLETED: (result: TaskResult) => ({ result }),
  FAILED: (error: Error, retryable: boolean) => ({ error, retryable }),
});

// TaskEvents.PROGRESS.type === 'PROGRESS'
// TaskEvents.PROGRESS(50) === { type: 'PROGRESS', percent: 50 }
```

### TypedEventSink Interface

```typescript
// Extract all event types from an events definition
type EventTypes<TEvents> =
  TEvents extends Record<string, EventFactory<infer T, never[], never>> ? T : never;

// Extract payload for a specific event type
type PayloadOf<TEvents, TType extends string> =
  TEvents extends Record<TType, EventFactory<TType, never[], infer P>> ? P : never;

// Extract the full event object type for an events definition
type EventOf<TEvents> = {
  [K in keyof TEvents]: TEvents[K] extends EventFactory<infer T, never[], infer P>
    ? EventDefinition<T, P>
    : never;
}[keyof TEvents];

// TypedEventSink with hybrid emit
interface TypedEventSink<TEvents> {
  // Emit via event factory result
  emit<E extends EventOf<TEvents>>(event: E): void;

  // Emit via type + payload (payload optional if empty)
  emit<T extends EventTypes<TEvents>>(
    type: T,
    ...payload: keyof PayloadOf<TEvents, T> extends never ? [] : [payload: PayloadOf<TEvents, T>]
  ): void;
}

// Usage - both work with full type safety
sink.emit(TaskEvents.PROGRESS(50));
sink.emit("PROGRESS", { percent: 50 });
sink.emit("DONE"); // No payload required if empty
```

### Activity Definition

```typescript
// Cleanup reason type
type CleanupReason = "completed" | "cancelled" | "timeout" | "error";

// Resolved deps type - maps port tuple to name-keyed object
type ResolvedActivityDeps<TRequires extends readonly Port<unknown, string>[]> = {
  [P in TRequires[number] as InferPortName<P>]: InferService<P>;
};

// Activity execution context
interface ActivityContext<TRequires extends readonly Port<unknown, string>[], TEvents> {
  readonly deps: ResolvedActivityDeps<TRequires>;
  readonly sink: TypedEventSink<TEvents>;
  readonly signal: AbortSignal;
}

// Activity configuration
interface ActivityConfig<
  TPort extends ActivityPort<unknown, unknown, string>,
  TRequires extends readonly Port<unknown, string>[],
  TEvents,
> {
  readonly requires: TRequires;
  readonly emits: TEvents;
  readonly timeout?: number;

  execute(
    input: ActivityInput<TPort>,
    context: ActivityContext<TRequires, TEvents>
  ): Promise<ActivityOutput<TPort>>;

  cleanup?(
    reason: CleanupReason,
    context: Pick<ActivityContext<TRequires, TEvents>, "deps">
  ): void | Promise<void>;
}

// Activity type (returned by activity factory)
interface Activity<
  TPort extends ActivityPort<unknown, unknown, string>,
  TRequires extends readonly Port<unknown, string>[],
  TEvents,
> {
  readonly port: TPort;
  readonly requires: TRequires;
  readonly emits: TEvents;
  readonly timeout: number | undefined;

  execute(
    input: ActivityInput<TPort>,
    context: ActivityContext<TRequires, TEvents>
  ): Promise<ActivityOutput<TPort>>;

  cleanup?(
    reason: CleanupReason,
    context: Pick<ActivityContext<TRequires, TEvents>, "deps">
  ): void | Promise<void>;
}

// ActivityAny for universal constraint
interface ActivityAny {
  readonly port: ActivityPort<unknown, unknown, string>;
  readonly requires: readonly Port<unknown, string>[];
  readonly emits: unknown;
  readonly timeout: number | undefined;
  execute(input: never, context: never): Promise<unknown>;
  cleanup?(reason: CleanupReason, context: never): void | Promise<void>;
}

// Factory function
function activity<
  TPort extends ActivityPort<unknown, unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
  TEvents,
>(
  port: TPort,
  config: ActivityConfig<TPort, TRequires, TEvents>
): Activity<TPort, TRequires, TEvents>;

// Usage
const TaskActivity = activity(TaskActivityPort, {
  requires: [ApiPort, LoggerPort],
  emits: TaskEvents,
  timeout: 30_000,

  execute: async (input, { deps, sink, signal }) => {
    sink.emit(TaskEvents.PROGRESS(0));

    const result = await deps.Api.fetchTask(input.taskId);
    deps.Logger.info("Task completed", { taskId: input.taskId });

    sink.emit(TaskEvents.COMPLETED(result));
    return result;
  },

  cleanup: async (reason, { deps }) => {
    if (reason !== "completed") {
      deps.Logger.warn("Task cleanup", { reason });
    }
  },
});
```

### ActivityManager Updates

```typescript
// Manager configuration
interface ActivityManagerConfig {
  readonly defaultTimeout?: number;
}

// Spawn options
interface SpawnOptions {
  readonly timeout?: number;
}

// Updated ActivityManager interface
interface ActivityManager {
  spawn<A extends ActivityAny>(
    activity: A,
    input: ActivityInput<A["port"]>,
    eventSink: TypedEventSink<A["emits"]>,
    deps: ResolvedActivityDeps<A["requires"]>,
    options?: SpawnOptions
  ): string; // Returns activity instance ID

  stop(id: string): void;
  getStatus(id: string): ActivityStatus | undefined;
  getResult<TOutput>(id: string): TOutput | undefined;
  getAll(): readonly ActivityInstance[];
  dispose(): Promise<void>;
}

// Factory with optional config
function createActivityManager(config?: ActivityManagerConfig): ActivityManager;
```

### FlowAdapter Integration

```typescript
// Type to validate activity requirements against available ports
type ValidateActivityRequirements<
  TActivity extends ActivityAny,
  TAvailablePorts extends Port<unknown, string>,
> = TActivity["requires"][number] extends TAvailablePorts
  ? TActivity
  : {
      __error: "ActivityRequiresUnavailablePort";
      __activity: TActivity["port"]["__portName"];
      __missing: Exclude<TActivity["requires"][number], TAvailablePorts>;
    };

// Updated FlowAdapterConfig
interface FlowAdapterConfig<
  TProvides extends FlowPort<string, string, unknown, string>,
  TRequires extends readonly Port<unknown, string>[],
  TActivities extends readonly ActivityAny[],
  TLifetime extends Lifetime = "scoped",
> {
  readonly provides: TProvides;
  readonly requires: TRequires;
  readonly lifetime?: TLifetime;
  readonly machine: Machine<string, string, unknown>;
  readonly activities?: TActivities & {
    [K in keyof TActivities]: ValidateActivityRequirements<
      TActivities[K] & ActivityAny,
      TRequires[number]
    >;
  };
  readonly defaultActivityTimeout?: number;
}

// Usage
const TaskFlowAdapter = createFlowAdapter({
  provides: TaskFlowPort,
  requires: [ApiPort, LoggerPort],
  activities: [TaskActivity, PollingActivity], // Type error if requirements unsatisfied
  machine: taskMachine,
  defaultActivityTimeout: 60_000,
});
```

---

## Type System

### Type-Level Validation

```typescript
// Ensure activity requirements are satisfied
type AssertActivityRequirements<
  TActivity extends ActivityAny,
  TAvailable extends Port<unknown, string>,
> = TActivity["requires"] extends readonly (infer R)[]
  ? R extends TAvailable
    ? true
    : {
        __error: `Activity "${TActivity["port"]["__portName"]}" requires port not available`;
        __missing: Exclude<R, TAvailable>;
      }
  : never;

// Ensure no duplicate activity ports
type AssertUniqueActivityPorts<TActivities extends readonly ActivityAny[]> =
  TActivities extends readonly [infer Head, ...infer Tail]
    ? Head extends ActivityAny
      ? Tail extends readonly ActivityAny[]
        ? Head["port"]["__portName"] extends Tail[number]["port"]["__portName"]
          ? { __error: `Duplicate activity port: ${Head["port"]["__portName"]}` }
          : AssertUniqueActivityPorts<Tail>
        : true
      : never
    : true;
```

### Inference Utilities

```typescript
// Extract activity input type from port
type ActivityInput<P> =
  P extends ActivityPort<infer I, infer _O, infer _N>
    ? I
    : P extends Activity<infer Port, infer _R, infer _E>
      ? ActivityInput<Port>
      : never;

// Extract activity output type from port
type ActivityOutput<P> =
  P extends ActivityPort<infer _I, infer O, infer _N>
    ? O
    : P extends Activity<infer Port, infer _R, infer _E>
      ? ActivityOutput<Port>
      : never;

// Extract event type union from events definition
type InferEventTypes<TEvents> =
  TEvents extends Record<string, EventFactory<infer T, never[], never>> ? T : never;

// Extract full event union from activity
type InferActivityEvents<A extends ActivityAny> = EventOf<A["emits"]>;
```

---

## Integration

### FlowAdapter Activity Resolution

```typescript
// Internal: Create activity context with resolved deps
function createActivityContext<TRequires extends readonly Port<unknown, string>[], TEvents>(
  requires: TRequires,
  allDeps: Record<string, unknown>,
  eventSink: TypedEventSink<TEvents>,
  signal: AbortSignal
): ActivityContext<TRequires, TEvents> {
  // Build deps object with only required ports
  const deps = {} as ResolvedActivityDeps<TRequires>;
  for (const port of requires) {
    const name = port.__portName as keyof typeof deps;
    deps[name] = allDeps[port.__portName] as (typeof deps)[typeof name];
  }

  return { deps, sink: eventSink, signal };
}
```

### DevTools Integration

```typescript
// Activity metadata for DevTools visualization
interface ActivityMetadata {
  readonly portName: string;
  readonly requires: readonly string[];
  readonly emits: readonly string[];
  readonly hasCleanup: boolean;
  readonly defaultTimeout: number | undefined;
}

// Extract metadata from activity definition
function getActivityMetadata(activity: ActivityAny): ActivityMetadata {
  return {
    portName: activity.port.__portName,
    requires: activity.requires.map(p => p.__portName),
    emits: Object.keys(activity.emits),
    hasCleanup: activity.cleanup !== undefined,
    defaultTimeout: activity.timeout,
  };
}
```

### Graph Dependency Visibility

Activities declared in FlowAdapter should be visible in the dependency graph:

- Activity port names shown as nested dependencies of FlowAdapter
- Activity requirements shown as edges to their required ports
- DevTools can expand FlowAdapter to show contained activities
- Activity status (running/completed/failed) visible in runtime DevTools

---

## Testing

### Test Harness

```typescript
// High-level test harness for common cases
interface TestActivityResult<TOutput, TEvents> {
  readonly result: TOutput | undefined;
  readonly error: Error | undefined;
  readonly events: readonly EventOf<TEvents>[];
  readonly status: "completed" | "failed" | "cancelled" | "timeout";
  readonly cleanupCalled: boolean;
  readonly cleanupReason: CleanupReason | undefined;
}

interface TestActivityOptions<TRequires extends readonly Port<unknown, string>[]> {
  readonly input: unknown;
  readonly deps: Partial<ResolvedActivityDeps<TRequires>>;
  readonly timeout?: number;
  readonly abortAfter?: number;
}

async function testActivity<A extends ActivityAny>(
  activity: A,
  options: TestActivityOptions<A["requires"]>
): Promise<TestActivityResult<ActivityOutput<A["port"]>, A["emits"]>>;

// Usage
const { result, events, status } = await testActivity(TaskActivity, {
  input: { taskId: "123" },
  deps: {
    Api: mockApi,
    Logger: mockLogger,
  },
});

expect(status).toBe("completed");
expect(events).toContainEqual({ type: "PROGRESS", percent: 0 });
expect(events).toContainEqual({ type: "COMPLETED", result: expect.any(Object) });
```

### Composable Utilities

```typescript
// Create test event sink that captures events
function createTestEventSink<TEvents>(): TypedEventSink<TEvents> & {
  readonly events: readonly EventOf<TEvents>[];
  clear(): void;
};

// Create controllable abort signal
function createTestSignal(): AbortSignal & {
  abort(reason?: string): void;
  timeout(ms: number): void;
};

// Create mock deps from port tuple
function createTestDeps<TRequires extends readonly Port<unknown, string>[]>(
  requires: TRequires,
  mocks: Partial<ResolvedActivityDeps<TRequires>>
): ResolvedActivityDeps<TRequires>;

// Usage for complex scenarios
const sink = createTestEventSink<typeof TaskEvents>();
const signal = createTestSignal();
const deps = createTestDeps([ApiPort, LoggerPort], {
  Api: mockApi,
  Logger: mockLogger,
});

await TaskActivity.execute({ taskId: "123" }, { deps, sink, signal });

signal.abort(); // Test cancellation
expect(sink.events).toHaveLength(2);
```

### Type Testing

```typescript
// Type tests using expect-type or similar
import { expectTypeOf } from "expect-type";

// Verify port type inference
const port = activityPort<{ id: string }, User>()("FetchUser");
expectTypeOf<ActivityInput<typeof port>>().toEqualTypeOf<{ id: string }>();
expectTypeOf<ActivityOutput<typeof port>>().toEqualTypeOf<User>();

// Verify event type inference
const events = defineEvents({
  DONE: () => ({}),
  ERROR: (msg: string) => ({ message: msg }),
});
expectTypeOf<EventTypes<typeof events>>().toEqualTypeOf<"DONE" | "ERROR">();

// Verify deps type inference
const act = activity(port, {
  requires: [ApiPort, LoggerPort],
  emits: events,
  execute: async (input, { deps }) => {
    expectTypeOf(deps.Api).toEqualTypeOf<ApiService>();
    expectTypeOf(deps.Logger).toEqualTypeOf<LoggerService>();
    return { id: input.id, name: "test" };
  },
});
```

---

## Migration

### From Current Activity Implementation

Current pattern (service locator):

```typescript
// OLD: Service locator pattern
const activity: Activity<Input, Output> = {
  async execute(input, sink, signal) {
    // Manual container resolution
    const api = container.resolve(ApiPort);
    const logger = container.resolve(LoggerPort);

    // ... execution
  },
};
```

New pattern (explicit dependencies):

```typescript
// NEW: Explicit dependency declaration
const TaskActivityPort = activityPort<Input, Output>()("TaskActivity");

const TaskEvents = defineEvents({
  PROGRESS: (percent: number) => ({ percent }),
  COMPLETED: (result: Output) => ({ result }),
});

const TaskActivity = activity(TaskActivityPort, {
  requires: [ApiPort, LoggerPort],
  emits: TaskEvents,

  execute: async (input, { deps, sink, signal }) => {
    // Dependencies injected via deps object
    const result = await deps.Api.fetch(input);
    deps.Logger.info("Complete");

    sink.emit(TaskEvents.COMPLETED(result));
    return result;
  },
});
```

### Migration Steps

1. **Create ActivityPort**: Replace inline `Activity<I, O>` with `activityPort<I, O>()('Name')`
2. **Define Events**: Create `defineEvents()` object for all emitted event types
3. **Wrap with activity()**: Convert activity object to `activity(port, config)` call
4. **Move dependencies to requires**: Extract all `container.resolve()` calls to `requires` array
5. **Update execute signature**: Change from `(input, sink, signal)` to `(input, { deps, sink, signal })`
6. **Add to FlowAdapter**: Include activity in FlowAdapter's `activities` array
7. **Update tests**: Use `testActivity()` harness or composable utilities

### Backward Compatibility

- Existing `Activity<I, O>` interface remains for gradual migration
- `ActivityManager.spawn()` supports both old and new activity formats
- Old activities without `requires` are treated as having no dependencies
- FlowAdapter without `activities` property continues to work
- New activities can coexist with old activities in same FlowAdapter

---

## Examples

### Complete Task Activity Example

```typescript
// 1. Define ports
const TaskActivityPort = activityPort<
  { taskId: string; priority: number },
  { result: TaskResult; duration: number }
>()("TaskActivity");

// 2. Define events
const TaskEvents = defineEvents({
  PROGRESS: (percent: number, stage: string) => ({ percent, stage }),
  COMPLETED: (result: TaskResult, duration: number) => ({ result, duration }),
  FAILED: (error: Error, retryable: boolean) => ({ error, retryable }),
});

// 3. Define activity
const TaskActivity = activity(TaskActivityPort, {
  requires: [ApiPort, LoggerPort, MetricsPort],
  emits: TaskEvents,
  timeout: 30_000,

  execute: async (input, { deps, sink, signal }) => {
    const startTime = Date.now();
    deps.Logger.info("Task started", { taskId: input.taskId });

    sink.emit(TaskEvents.PROGRESS(0, "initializing"));

    try {
      // Check abort signal
      if (signal.aborted) {
        throw new Error("Aborted");
      }

      sink.emit(TaskEvents.PROGRESS(25, "fetching"));
      const data = await deps.Api.fetchTask(input.taskId, { signal });

      sink.emit(TaskEvents.PROGRESS(75, "processing"));
      const result = processTask(data, input.priority);

      const duration = Date.now() - startTime;
      deps.Metrics.recordDuration("task_execution", duration);

      sink.emit(TaskEvents.COMPLETED(result, duration));
      return { result, duration };
    } catch (error) {
      if (error instanceof NetworkError) {
        sink.emit(TaskEvents.FAILED(error, true));
      }
      throw error;
    }
  },

  cleanup: async (reason, { deps }) => {
    deps.Logger.info("Task cleanup", { reason });
    if (reason === "cancelled" || reason === "timeout") {
      await deps.Api.cancelPendingRequests();
    }
  },
});

// 4. Register in FlowAdapter
const TaskFlowAdapter = createFlowAdapter({
  provides: TaskFlowPort,
  requires: [ApiPort, LoggerPort, MetricsPort],
  activities: [TaskActivity],
  machine: taskMachine,
  defaultActivityTimeout: 60_000,
});
```

### Polling Activity Example

```typescript
const PollingActivityPort = activityPort<{ interval: number; maxAttempts: number }, void>()(
  "PollingActivity"
);

const PollingEvents = defineEvents({
  POLL_RESULT: (data: PollData) => ({ data }),
  POLL_EXHAUSTED: () => ({}),
});

const PollingActivity = activity(PollingActivityPort, {
  requires: [ApiPort],
  emits: PollingEvents,

  execute: async (input, { deps, sink, signal }) => {
    let attempts = 0;

    while (attempts < input.maxAttempts && !signal.aborted) {
      const data = await deps.Api.poll();

      if (data.status === "ready") {
        sink.emit(PollingEvents.POLL_RESULT(data));
        return;
      }

      attempts++;
      await delay(input.interval, signal);
    }

    if (!signal.aborted) {
      sink.emit(PollingEvents.POLL_EXHAUSTED());
    }
  },
});
```

### Testing Example

```typescript
describe("TaskActivity", () => {
  it("should emit progress and completion events", async () => {
    const mockApi = {
      fetchTask: vi.fn().mockResolvedValue({ id: "123", data: "test" }),
      cancelPendingRequests: vi.fn(),
    };
    const mockLogger = { info: vi.fn(), warn: vi.fn() };
    const mockMetrics = { recordDuration: vi.fn() };

    const { result, events, status } = await testActivity(TaskActivity, {
      input: { taskId: "123", priority: 1 },
      deps: {
        Api: mockApi,
        Logger: mockLogger,
        Metrics: mockMetrics,
      },
    });

    expect(status).toBe("completed");
    expect(result).toMatchObject({ duration: expect.any(Number) });
    expect(events).toContainEqual({ type: "PROGRESS", percent: 0, stage: "initializing" });
    expect(events).toContainEqual({
      type: "COMPLETED",
      result: expect.any(Object),
      duration: expect.any(Number),
    });
    expect(mockMetrics.recordDuration).toHaveBeenCalled();
  });

  it("should handle cancellation", async () => {
    const mockApi = {
      fetchTask: vi.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
      cancelPendingRequests: vi.fn(),
    };

    const { status, cleanupCalled, cleanupReason } = await testActivity(TaskActivity, {
      input: { taskId: "123", priority: 1 },
      deps: { Api: mockApi, Logger: { info: vi.fn() }, Metrics: { recordDuration: vi.fn() } },
      abortAfter: 100,
    });

    expect(status).toBe("cancelled");
    expect(cleanupCalled).toBe(true);
    expect(cleanupReason).toBe("cancelled");
    expect(mockApi.cancelPendingRequests).toHaveBeenCalled();
  });
});
```
