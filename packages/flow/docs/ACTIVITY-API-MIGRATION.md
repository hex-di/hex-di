# Activity API Migration Guide

This guide helps you migrate from the legacy Activity API to the new redesigned Activity API in `@hex-di/flow`. The new API eliminates the service locator anti-pattern by using explicit dependency declarations via ports.

## Table of Contents

- [Overview](#overview)
- [Why Migrate?](#why-migrate)
- [Quick Comparison](#quick-comparison)
- [Step-by-Step Migration](#step-by-step-migration)
- [API Reference](#api-reference)
- [Common Patterns](#common-patterns)
- [Testing Activities](#testing-activities)
- [Troubleshooting](#troubleshooting)
- [Backward Compatibility](#backward-compatibility)

---

## Overview

The new Activity API introduces:

- **ActivityPort**: Type-safe port tokens for activities with input/output types
- **defineEvents**: Type-safe event factories for activity emissions
- **activity()**: Factory function with explicit dependency declarations
- **TypedEventSink**: Hybrid emit patterns with full type safety
- **Testing utilities**: Composable test helpers for activities

---

## Why Migrate?

### Problems with the Legacy API

```typescript
// LEGACY: Service locator anti-pattern
const activity: Activity<Input, Output> = {
  async execute(input, sink, signal) {
    // Hidden dependencies - no way to know what this activity needs
    const api = container.resolve(ApiPort);
    const logger = container.resolve(LoggerPort);

    // Untyped event emission
    sink.emit({ type: "PROGRESS", payload: { percent: 50 } });

    return await api.fetch(input.id);
  },
};
```

Issues:

1. **Hidden dependencies**: Cannot determine requirements from the type signature
2. **Container coupling**: Activities depend on global container access
3. **Untyped events**: No compile-time validation of event types or payloads
4. **Testing difficulty**: Mocking requires container manipulation
5. **No cleanup guarantee**: Resource cleanup is ad-hoc

### Benefits of the New API

```typescript
// NEW: Explicit dependency injection
const TaskActivityPort = activityPort<Input, Output>()("TaskActivity");

const TaskEvents = defineEvents({
  PROGRESS: (percent: number) => ({ percent }),
  COMPLETED: (result: Output) => ({ result }),
});

const TaskActivity = activity(TaskActivityPort, {
  requires: [ApiPort, LoggerPort],
  emits: TaskEvents,
  timeout: 30_000,

  execute: async (input, { deps, sink, signal }) => {
    sink.emit(TaskEvents.PROGRESS(0));
    const result = await deps.Api.fetch(input.id);
    deps.Logger.info("Complete");
    sink.emit(TaskEvents.COMPLETED(result));
    return result;
  },

  cleanup: async (reason, { deps }) => {
    if (reason !== "completed") {
      deps.Logger.warn("Cleanup", { reason });
    }
  },
});
```

Benefits:

1. **Explicit dependencies**: `requires` array declares all dependencies
2. **Type-safe deps**: `deps.Api` has correct types inferred from ports
3. **Type-safe events**: `sink.emit()` validates event types and payloads
4. **Guaranteed cleanup**: Cleanup called exactly once with reason
5. **Testable**: Simple mock injection via test utilities

---

## Quick Comparison

| Aspect            | Legacy API                     | New API                           |
| ----------------- | ------------------------------ | --------------------------------- |
| Port definition   | None (inline `Activity<I, O>`) | `activityPort<I, O>()('Name')`    |
| Dependencies      | `container.resolve(Port)`      | `requires: [Port1, Port2]`        |
| Dependency access | Manual resolution              | `deps.PortName`                   |
| Event definition  | None (inline objects)          | `defineEvents({ ... })`           |
| Event emission    | `sink.emit({ type, payload })` | `sink.emit(Events.TYPE(...))`     |
| Execute signature | `(input, sink, signal)`        | `(input, { deps, sink, signal })` |
| Cleanup           | Not supported                  | `cleanup(reason, { deps })`       |
| Timeout           | Not supported                  | `timeout` property                |
| Testing           | Manual mocking                 | `testActivity()` harness          |

---

## Step-by-Step Migration

### Step 1: Create an ActivityPort

Replace inline `Activity<I, O>` type with a named port:

```typescript
// BEFORE
const fetchActivity: Activity<{ id: string }, User> = { ... };

// AFTER
const FetchUserPort = activityPort<{ id: string }, User>()('FetchUser');
```

The port carries:

- Input type: `{ id: string }`
- Output type: `User`
- Name: `'FetchUser'` (literal type for identification)

### Step 2: Define Events

Create an events definition for all events the activity can emit:

```typescript
// BEFORE
sink.emit({ type: "PROGRESS", payload: { percent: 50 } });
sink.emit({ type: "USER_LOADED", payload: { user } });
sink.emit({ type: "ERROR", payload: { message: "Failed" } });

// AFTER
const FetchUserEvents = defineEvents({
  PROGRESS: (percent: number) => ({ percent }),
  USER_LOADED: (user: User) => ({ user }),
  ERROR: (message: string) => ({ message }),
});

// Usage
sink.emit(FetchUserEvents.PROGRESS(50));
sink.emit(FetchUserEvents.USER_LOADED(user));
sink.emit(FetchUserEvents.ERROR("Failed"));

// Or with type + payload syntax
sink.emit("PROGRESS", { percent: 50 });
```

### Step 3: Extract Dependencies to requires

Identify all `container.resolve()` calls and add them to `requires`:

```typescript
// BEFORE
async execute(input, sink, signal) {
  const api = container.resolve(ApiPort);
  const logger = container.resolve(LoggerPort);
  const cache = container.resolve(CachePort);
  // ...
}

// AFTER (identify dependencies)
requires: [ApiPort, LoggerPort, CachePort],

execute: async (input, { deps, sink, signal }) => {
  // Access via deps object
  const result = await deps.Api.fetchUser(input.id);
  deps.Logger.info('Fetched user');
  deps.Cache.set(`user:${input.id}`, result);
  // ...
}
```

### Step 4: Wrap with activity() Factory

Combine port, events, and config into a single `activity()` call:

```typescript
// BEFORE
const fetchUserActivity: Activity<{ id: string }, User> = {
  async execute(input, sink, signal) {
    const api = container.resolve(ApiPort);
    sink.emit({ type: "START" });
    const user = await api.fetchUser(input.id, { signal });
    sink.emit({ type: "COMPLETE", payload: { user } });
    return user;
  },
};

// AFTER
const FetchUserPort = activityPort<{ id: string }, User>()("FetchUser");

const FetchUserEvents = defineEvents({
  START: () => ({}),
  COMPLETE: (user: User) => ({ user }),
});

const FetchUserActivity = activity(FetchUserPort, {
  requires: [ApiPort],
  emits: FetchUserEvents,

  execute: async (input, { deps, sink, signal }) => {
    sink.emit(FetchUserEvents.START());
    const user = await deps.Api.fetchUser(input.id, { signal });
    sink.emit(FetchUserEvents.COMPLETE(user));
    return user;
  },
});
```

### Step 5: Add Cleanup (Optional)

If your activity needs cleanup, add the `cleanup` function:

```typescript
const FetchUserActivity = activity(FetchUserPort, {
  requires: [ApiPort, LoggerPort],
  emits: FetchUserEvents,
  timeout: 30_000,

  execute: async (input, { deps, sink, signal }) => {
    // ... execution logic
  },

  cleanup: async (reason, { deps }) => {
    // reason is 'completed' | 'cancelled' | 'timeout' | 'error'
    if (reason !== "completed") {
      deps.Logger.warn("Activity cleanup", { reason });
    }
  },
});
```

Cleanup is guaranteed to be called exactly once, even if execute throws.

### Step 6: Register in FlowAdapter

Add the activity to your FlowAdapter's `activities` array:

```typescript
// BEFORE (if applicable)
const TaskFlowAdapter = createFlowAdapter({
  provides: TaskFlowPort,
  requires: [ApiPort, LoggerPort],
  machine: taskMachine,
});

// AFTER
const TaskFlowAdapter = createFlowAdapter({
  provides: TaskFlowPort,
  requires: [ApiPort, LoggerPort],
  activities: [FetchUserActivity], // Add activities here
  machine: taskMachine,
  defaultActivityTimeout: 60_000, // Optional default timeout
});
```

Type-level validation ensures:

- All activity requirements are satisfied by FlowAdapter's requires
- No duplicate activity ports in the array

### Step 7: Update Tests

Replace manual container mocking with test utilities:

```typescript
// BEFORE
test("fetches user", async () => {
  const mockApi = { fetchUser: vi.fn().mockResolvedValue(mockUser) };
  container.register(ApiPort, () => mockApi);

  const events: unknown[] = [];
  const sink = { emit: (e: unknown) => events.push(e) };

  const result = await fetchUserActivity.execute({ id: "123" }, sink, new AbortController().signal);

  expect(result).toEqual(mockUser);
});

// AFTER
import { testActivity } from "@hex-di/flow/testing";

test("fetches user", async () => {
  const mockApi = { fetchUser: vi.fn().mockResolvedValue(mockUser) };

  const { result, status, events } = await testActivity(FetchUserActivity, {
    input: { id: "123" },
    deps: { Api: mockApi },
  });

  expect(status).toBe("completed");
  expect(result).toEqual(mockUser);
  expect(events).toContainEqual({ type: "COMPLETE", user: mockUser });
});
```

---

## API Reference

### activityPort<TInput, TOutput>()

Creates a typed port token for an activity.

```typescript
function activityPort<TInput, TOutput>(): <const TName extends string>(
  name: TName
) => ActivityPort<TInput, TOutput, TName>;
```

**Example:**

```typescript
const FetchUserPort = activityPort<{ userId: string }, User>()("FetchUser");

// Extract types
type Input = ActivityInput<typeof FetchUserPort>; // { userId: string }
type Output = ActivityOutput<typeof FetchUserPort>; // User
```

### defineEvents(definition)

Creates type-safe event factories.

```typescript
function defineEvents<
  const TDef extends Record<string, (...args: never[]) => Record<string, unknown>>,
>(def: TDef): DefineEventsResult<TDef>;
```

**Example:**

```typescript
const TaskEvents = defineEvents({
  PROGRESS: (percent: number) => ({ percent }),
  COMPLETED: (result: TaskResult) => ({ result }),
  FAILED: (error: Error, retryable: boolean) => ({ error, retryable }),
  DONE: () => ({}), // No payload
});

// Each factory has a .type property
TaskEvents.PROGRESS.type === "PROGRESS";

// Calling factory returns frozen event object
TaskEvents.PROGRESS(50) === { type: "PROGRESS", percent: 50 };
```

### activity(port, config)

Creates a fully configured activity.

```typescript
function activity<
  TPort extends ActivityPort<unknown, unknown, string>,
  const TRequires extends readonly Port<unknown, string>[],
  TEvents,
>(
  port: TPort,
  config: ActivityConfig<TPort, TRequires, TEvents>
): ConfiguredActivity<TPort, TRequires, TEvents>;
```

**Config properties:**

- `requires`: Tuple of port dependencies
- `emits`: Events definition from `defineEvents()`
- `timeout?`: Optional timeout in milliseconds
- `execute`: Async function `(input, context) => Promise<output>`
- `cleanup?`: Optional cleanup `(reason, context) => void | Promise<void>`

**Context object:**

- `deps`: Resolved dependencies keyed by port name
- `sink`: TypedEventSink for emitting events
- `signal`: AbortSignal for cancellation

### TypedEventSink<TEvents>

Interface for emitting events with type safety.

```typescript
interface TypedEventSink<TEvents> {
  emit: TypedEmit<TEvents>;
}
```

**Usage patterns:**

```typescript
// Pattern 1: Pass event factory result
sink.emit(TaskEvents.PROGRESS(50));

// Pattern 2: Pass type string and payload
sink.emit("PROGRESS", { percent: 50 });

// Pattern 3: Events with no payload
sink.emit("DONE"); // No second argument needed
sink.emit("DONE", {}); // Also valid
```

---

## Common Patterns

### Activity with Progress Updates

```typescript
const UploadFilePort = activityPort<{ file: File }, UploadResult>()("UploadFile");

const UploadEvents = defineEvents({
  STARTED: () => ({}),
  PROGRESS: (bytesUploaded: number, totalBytes: number) => ({ bytesUploaded, totalBytes }),
  COMPLETED: (result: UploadResult) => ({ result }),
  FAILED: (error: Error) => ({ error }),
});

const UploadFileActivity = activity(UploadFilePort, {
  requires: [StoragePort, LoggerPort],
  emits: UploadEvents,
  timeout: 300_000, // 5 minutes

  execute: async (input, { deps, sink, signal }) => {
    sink.emit(UploadEvents.STARTED());

    const result = await deps.Storage.upload(input.file, {
      signal,
      onProgress: (bytesUploaded, totalBytes) => {
        sink.emit(UploadEvents.PROGRESS(bytesUploaded, totalBytes));
      },
    });

    sink.emit(UploadEvents.COMPLETED(result));
    return result;
  },
});
```

### Activity with Polling

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

### Activity with Resource Cleanup

```typescript
const WebSocketActivityPort = activityPort<{ url: string }, void>()("WebSocketActivity");

const WSEvents = defineEvents({
  CONNECTED: () => ({}),
  MESSAGE: (data: unknown) => ({ data }),
  DISCONNECTED: (reason: string) => ({ reason }),
});

const WebSocketActivity = activity(WebSocketActivityPort, {
  requires: [LoggerPort],
  emits: WSEvents,

  execute: async (input, { deps, sink, signal }) => {
    const ws = new WebSocket(input.url);

    // Store for cleanup
    let websocket: WebSocket | null = ws;

    return new Promise((resolve, reject) => {
      ws.onopen = () => sink.emit(WSEvents.CONNECTED());
      ws.onmessage = e => sink.emit(WSEvents.MESSAGE(e.data));
      ws.onclose = e => {
        sink.emit(WSEvents.DISCONNECTED(e.reason));
        resolve();
      };
      ws.onerror = () => reject(new Error("WebSocket error"));

      signal.addEventListener("abort", () => {
        websocket?.close();
        websocket = null;
      });
    });
  },

  cleanup: async (reason, { deps }) => {
    deps.Logger.info("WebSocket cleanup", { reason });
  },
});
```

---

## Testing Activities

### Using the testActivity Harness

The high-level harness handles setup and result tracking:

```typescript
import { testActivity } from "@hex-di/flow/testing";

describe("TaskActivity", () => {
  it("completes successfully", async () => {
    const mockApi = { fetch: vi.fn().mockResolvedValue({ data: "test" }) };
    const mockLogger = { info: vi.fn() };

    const { result, status, events, cleanupCalled } = await testActivity(TaskActivity, {
      input: { taskId: "123" },
      deps: { Api: mockApi, Logger: mockLogger },
    });

    expect(status).toBe("completed");
    expect(result).toMatchObject({ data: "test" });
    expect(events).toContainEqual({ type: "PROGRESS", percent: 0 });
    expect(cleanupCalled).toBe(true);
  });

  it("handles cancellation", async () => {
    const mockApi = { fetch: vi.fn().mockImplementation(() => new Promise(() => {})) };

    const { status, cleanupReason } = await testActivity(TaskActivity, {
      input: { taskId: "123" },
      deps: { Api: mockApi, Logger: { info: vi.fn() } },
      abortAfter: 100, // Cancel after 100ms
    });

    expect(status).toBe("cancelled");
    expect(cleanupReason).toBe("cancelled");
  });

  it("handles timeout", async () => {
    const mockApi = { fetch: vi.fn().mockImplementation(() => new Promise(() => {})) };

    const { status, cleanupReason } = await testActivity(TaskActivity, {
      input: { taskId: "123" },
      deps: { Api: mockApi, Logger: { info: vi.fn() } },
      timeout: 50, // Timeout after 50ms
    });

    expect(status).toBe("timeout");
    expect(cleanupReason).toBe("timeout");
  });
});
```

### Using Composable Utilities

For more control, use individual utilities:

```typescript
import { createTestEventSink, createTestSignal, createTestDeps } from "@hex-di/flow/testing";

it("handles custom scenarios", async () => {
  const sink = createTestEventSink<typeof TaskEvents>();
  const signal = createTestSignal();
  const deps = createTestDeps(TaskActivity.requires, {
    Api: mockApi,
    Logger: mockLogger,
  });

  // Execute directly
  await TaskActivity.execute({ taskId: "123" }, { deps, sink, signal });

  // Assert on events
  expect(sink.events).toHaveLength(2);
  expect(sink.events[0].type).toBe("PROGRESS");

  // Test abort
  signal.abort("User cancelled");
  expect(signal.aborted).toBe(true);
});
```

---

## Troubleshooting

### Type Error: Activity requires port not in FlowAdapter

```
Type error: Activity "TaskActivity" requires port(s) not available in FlowAdapter
```

**Cause:** The activity's `requires` includes a port not in the FlowAdapter's `requires`.

**Solution:** Add the missing port to FlowAdapter's requires:

```typescript
// Activity requires ApiPort and LoggerPort
const TaskActivity = activity(TaskPort, {
  requires: [ApiPort, LoggerPort],
  // ...
});

// FlowAdapter must include all required ports
const TaskFlowAdapter = createFlowAdapter({
  requires: [ApiPort, LoggerPort], // Include both!
  activities: [TaskActivity],
  // ...
});
```

### Type Error: Duplicate activity port

```
Type error: Duplicate activity port: "TaskActivity"
```

**Cause:** Two activities in the array have the same port name.

**Solution:** Ensure each activity has a unique port:

```typescript
const TaskActivityPort = activityPort<...>()('TaskActivity');
const OtherActivityPort = activityPort<...>()('OtherActivity');
// Port names must be unique
```

### Missing Mock Error

```
MissingMockError: Missing mock for required port 'Logger'.
```

**Cause:** The `deps` object in `testActivity` is missing a required mock.

**Solution:** Provide mocks for all ports in the activity's `requires`:

```typescript
const { result } = await testActivity(TaskActivity, {
  input: { taskId: "123" },
  deps: {
    Api: mockApi,
    Logger: mockLogger, // Don't forget any required deps!
  },
});
```

### Events Not Being Captured

**Cause:** Using the wrong emit pattern or incorrect event structure.

**Solution:** Use the event factories or correct type+payload format:

```typescript
// Correct patterns
sink.emit(TaskEvents.PROGRESS(50));
sink.emit("PROGRESS", { percent: 50 });

// Wrong patterns
sink.emit({ type: "PROGRESS", percent: 50 }); // Missing factory
sink.emit("PROGRESS", 50); // Payload must be object
```

---

## Backward Compatibility

### Legacy Activity Interface

The legacy `Activity<TInput, TOutput>` interface remains available:

```typescript
interface Activity<TInput, TOutput> {
  execute(input: TInput, sink: EventSink, signal: AbortSignal): Promise<TOutput>;
}
```

### ActivityManager Supports Both APIs

The ActivityManager's `spawn` method is overloaded:

```typescript
// New API
manager.spawn(activity, input, eventSink, deps, options);

// Legacy API (deprecated)
manager.spawn(id, legacyActivity, input, eventSink);
```

### Gradual Migration

You can migrate activities one at a time:

```typescript
// Old activities still work
const LegacyActivity: Activity<Input, Output> = {
  async execute(input, sink, signal) { ... }
};

// New activities alongside old ones
const NewActivity = activity(NewActivityPort, {
  requires: [ApiPort],
  emits: NewEvents,
  execute: async (input, { deps, sink, signal }) => { ... },
});

// FlowAdapter without activities property works for legacy
const LegacyFlowAdapter = createFlowAdapter({
  provides: LegacyFlowPort,
  requires: [ApiPort],
  machine: legacyMachine,
  // No activities property - legacy activities handled via machine
});

// FlowAdapter with activities for new API
const NewFlowAdapter = createFlowAdapter({
  provides: NewFlowPort,
  requires: [ApiPort],
  activities: [NewActivity],
  machine: newMachine,
});
```

### Migration Timeline

1. **Phase 1**: Create new activities with new API
2. **Phase 2**: Update FlowAdapters to include activities
3. **Phase 3**: Migrate existing activities one by one
4. **Phase 4**: Remove legacy container.resolve() calls
5. **Phase 5**: Update all tests to use testActivity harness

---

## Summary

The new Activity API provides:

- Explicit, type-safe dependency declarations
- Compile-time validation of event types and payloads
- Guaranteed cleanup with cleanup reason
- Three-layer timeout configuration
- First-class testing utilities
- DevTools visibility for activity metadata

Migrate incrementally - both APIs can coexist during transition.
