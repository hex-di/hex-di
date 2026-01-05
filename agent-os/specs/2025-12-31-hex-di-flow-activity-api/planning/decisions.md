# HexDI Flow Activity API - Design Decisions

## Summary

This document captures the final design decisions for the Activity API redesign in `@hex-di/flow`.

---

## 1. Event Emission Typing

**Decision: Option E - `defineEvents` helper with type inference from functions**

```typescript
const TaskEvents = defineEvents({
  PROGRESS: (percent: number) => ({ percent }),
  COMPLETED: (result: TaskResult) => ({ result }),
  FAILED: (error: Error, retryable: boolean) => ({ error, retryable }),
});

// Type-safe usage:
sink.emit(TaskEvents.PROGRESS(50));
sink.emit(TaskEvents.COMPLETED({ id: "123", status: "done" }));
```

**Rationale:** Provides maximum type safety with minimal boilerplate. Event payloads are inferred from factory functions, and the pattern is familiar from action creators in Redux/XState.

---

## 2. TypedEventSink Design

**Decision: Option C - Hybrid emit(type) or emit(type, payload)**

```typescript
interface TypedEventSink<TEvents> {
  // For events created via defineEvents
  emit<E extends TEvents>(event: E): void;

  // For inline events (type-checked against declared emits)
  emit<T extends EventType<TEvents>>(type: T, payload?: PayloadOf<TEvents, T>): void;
}

// Both work:
sink.emit(TaskEvents.PROGRESS(50));
sink.emit("PROGRESS", { percent: 50 });
```

**Rationale:** Flexibility for different use cases while maintaining full type safety in both forms.

---

## 3. Dependency Injection

**Decision: Option A - Name-keyed object (deps.Api, deps.Logger)**

```typescript
activity(TaskActivityPort, {
  requires: [ApiPort, LoggerPort],
  emits: TaskEvents,
  execute: async (input, { deps, sink, signal }) => {
    const result = await deps.Api.fetchTask(input.taskId);
    deps.Logger.info("Task fetched", { taskId: input.taskId });
    sink.emit(TaskEvents.COMPLETED(result));
    return result;
  },
});
```

**Rationale:** Consistent with HexDI adapter pattern. Port names become property keys for intuitive access.

---

## 4. Activity Output Handling

**Decision: Option A - Captured, no auto-event (explicit control)**

- Activity `execute()` returns a value that is captured by the ActivityManager
- No automatic events are emitted for completion/failure
- Activity author explicitly emits events via TypedEventSink

```typescript
execute: async (input, { deps, sink, signal }) => {
  const result = await deps.Api.process(input);
  sink.emit(TaskEvents.COMPLETED(result)); // Explicit
  return result; // Captured for programmatic access
};
```

**Rationale:** Avoids magic behavior. Activity author has full control over what events are emitted and when.

---

## 5. Error Handling

**Decision: Option B - Implicit system errors + explicit domain errors**

- System errors (abort, timeout, uncaught exceptions) are handled by ActivityManager
- Domain errors must be explicitly declared in `emits` and emitted by the activity
- Activities can catch and handle errors, choosing to emit domain-specific error events

```typescript
const TaskEvents = defineEvents({
  COMPLETED: (result: TaskResult) => ({ result }),
  VALIDATION_FAILED: (errors: string[]) => ({ errors }),
  NETWORK_ERROR: (message: string, retryable: boolean) => ({ message, retryable }),
});

execute: async (input, { deps, sink, signal }) => {
  try {
    const result = await deps.Api.process(input);
    sink.emit(TaskEvents.COMPLETED(result));
    return result;
  } catch (error) {
    if (isNetworkError(error)) {
      sink.emit(TaskEvents.NETWORK_ERROR(error.message, true));
    }
    throw error; // Re-throw for system handling
  }
};
```

**Rationale:** Clean separation between infrastructure concerns (system handles) and business logic (activity handles).

---

## 6. Lifecycle Callbacks

**Decision: Option C - Hybrid (optional cleanup, manager orchestrates)**

- Optional `cleanup` callback on activity definition
- ActivityManager orchestrates lifecycle (start, abort, timeout)
- Cleanup receives reason for context-aware resource release

```typescript
activity(TaskActivityPort, {
  requires: [ApiPort],
  emits: TaskEvents,
  execute: async (input, ctx) => {
    /* ... */
  },
  cleanup: async reason => {
    // reason: 'completed' | 'cancelled' | 'timeout' | 'error'
    if (reason !== "completed") {
      await rollbackPartialWork();
    }
  },
});
```

**Rationale:** Activities define their cleanup logic, but the manager handles orchestration and guarantees cleanup is called.

---

## 7. Timeout Handling

**Decision: Option C - Layered defaults (manager -> activity -> spawn)**

```typescript
// Layer 1: Manager-level default
const manager = createActivityManager({ defaultTimeout: 60_000 });

// Layer 2: Activity-level default
activity(TaskActivityPort, {
  timeout: 30_000, // Override manager default
  execute: async (input, ctx) => {
    /* ... */
  },
});

// Layer 3: Spawn-time override
manager.spawn(TaskActivityPort, input, { timeout: 5_000 }); // Override all
```

**Rationale:** Flexibility at all levels with sensible fallback chain.

---

## 8. Port Boundaries

**Decision: ActivityPort type with clean API**

```typescript
// Create typed activity port token
const TaskActivityPort = activityPort<TaskInput, TaskOutput>()("TaskActivity");

// Type extracts
type Input = ActivityInput<typeof TaskActivityPort>; // TaskInput
type Output = ActivityOutput<typeof TaskActivityPort>; // TaskOutput
```

**Rationale:** Mirrors `createPort` pattern but specialized for activities with input/output generics.

---

## 9. Graph Validation

**Decision: Hybrid - Merge into FlowAdapter + DevTools visibility**

- FlowAdapter declares `activities` array
- Graph validation ensures activity `requires` ports are satisfied
- DevTools shows activities in dependency visualization

```typescript
const TaskFlowAdapter = createFlowAdapter({
  provides: TaskFlowPort,
  requires: [ApiPort, LoggerPort],
  activities: [TaskActivity, PollingActivity], // Type-checked
  // ...
});
```

**Rationale:** Compile-time validation catches missing dependencies. DevTools provides runtime visibility.

---

## 10. Activity Registration

**Decision: Explicit array with type-level + runtime validation**

- Activities explicitly listed in FlowAdapter's `activities` array
- Type-level: Validates all activity `requires` are subset of FlowAdapter's available ports
- Runtime: Validates activity ports are unique, no duplicates

```typescript
// Type error if PollingActivity requires a port not in FlowAdapter's scope
activities: [TaskActivity, PollingActivity],
```

**Rationale:** Explicit registration with dual validation for maximum safety.

---

## 11. Lifetime Management

**Decision: Clean API - definition is value, execution transient**

- Activity definition (`activity()` result) is a static value/singleton
- Activity execution is always transient (new instance per spawn)
- No "scoped" or "singleton" execution - each spawn is independent

**Rationale:** Simple mental model. Activities are templates; executions are instances.

---

## 12. Scope Resolution

**Decision: Option A - FlowAdapter's scope**

- Activities resolve dependencies from the FlowAdapter's container scope
- If FlowAdapter is scoped, activities get scoped instances
- Activities don't create their own scopes

**Rationale:** Consistent with how adapters work. FlowAdapter controls the resolution context.

---

## 13. Testing Patterns

**Decision: Option C - Both harness + composable utilities**

```typescript
// High-level harness for common cases
const { result, events, calls } = await testActivity(TaskActivity, {
  input: { taskId: "123" },
  deps: { Api: mockApi, Logger: mockLogger },
});

expect(events).toContainEqual(TaskEvents.COMPLETED(expect.any(Object)));
expect(calls.Api.fetchTask).toHaveBeenCalledWith("123");

// Low-level utilities for complex scenarios
const sink = createTestEventSink<typeof TaskEvents>();
const signal = createTestSignal();
const deps = createTestDeps(TaskActivity.requires, { Api: mockApi });

await TaskActivity.execute(input, { deps, sink, signal });

signal.abort(); // Test cancellation
expect(sink.events).toHaveLength(2);
```

**Rationale:** High-level harness for 80% of cases, low-level utilities for complex scenarios.

---

## Final API Summary

### Port Creation

```typescript
const TaskActivityPort = activityPort<TaskInput, TaskOutput>()("TaskActivity");
```

### Event Definition

```typescript
const TaskEvents = defineEvents({
  PROGRESS: (percent: number) => ({ percent }),
  COMPLETED: (result: TaskResult) => ({ result }),
  FAILED: (error: Error) => ({ error }),
});
```

### Activity Definition

```typescript
const TaskActivity = activity(TaskActivityPort, {
  requires: [ApiPort, LoggerPort],
  emits: TaskEvents,
  timeout: 30_000, // Optional

  execute: async (input, { deps, sink, signal }) => {
    sink.emit(TaskEvents.PROGRESS(0));

    const result = await deps.Api.fetchTask(input.taskId);
    deps.Logger.info("Task completed");

    sink.emit(TaskEvents.COMPLETED(result));
    return result;
  },

  cleanup: async reason => {
    // Optional
    if (reason !== "completed") {
      await rollbackWork();
    }
  },
});
```

### FlowAdapter Integration

```typescript
const TaskFlowAdapter = createFlowAdapter({
  provides: TaskFlowPort,
  requires: [ApiPort, LoggerPort],
  activities: [TaskActivity, PollingActivity],
  // ...
});
```

### Testing

```typescript
// Harness
const { result, events } = await testActivity(TaskActivity, {
  input: { taskId: "123" },
  deps: { Api: mockApi, Logger: mockLogger },
});

// Utilities
const sink = createTestEventSink<typeof TaskEvents>();
const signal = createTestSignal();
```

---

## Out of Scope

The following are explicitly out of scope for this redesign:

- Activity retry logic (can be built on top)
- Activity saga/orchestration patterns
- Distributed activities
- Activity persistence/replay
