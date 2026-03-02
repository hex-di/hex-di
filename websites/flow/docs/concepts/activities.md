---
sidebar_position: 4
title: Activities
---

# Activities

Activities are long-running processes that can emit events, be cancelled, and maintain their own lifecycle alongside state machines.

## Activity Interface

An activity implements the `Activity<TInput, TOutput>` interface:

```typescript
interface Activity<TInput, TOutput> {
  execute(input: TInput, sink: EventSink, signal: AbortSignal): Promise<TOutput>;
}
```

The three parameters provide:

- `input`: Initial configuration data
- `sink`: Mechanism to emit events back to the machine
- `signal`: Standard AbortSignal for cancellation

## Creating Activities

### Basic Activity

```typescript
import { Activity, EventSink } from "@hex-di/flow";

class DataPollingActivity implements Activity<{ interval: number }, void> {
  async execute(input: { interval: number }, sink: EventSink, signal: AbortSignal): Promise<void> {
    while (!signal.aborted) {
      try {
        const data = await this.fetchData();
        sink.emit({ type: "DATA_RECEIVED", payload: data });
        await this.delay(input.interval, signal);
      } catch (error) {
        sink.emit({ type: "POLL_ERROR", payload: { error } });
        break;
      }
    }
  }

  private async fetchData() {
    // Fetch implementation
    return { timestamp: Date.now(), value: Math.random() };
  }

  private delay(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, ms);
      signal.addEventListener("abort", () => {
        clearTimeout(timeout);
        reject(new Error("Aborted"));
      });
    });
  }
}
```

### Using the Activity Factory

Flow provides a convenient factory for creating activities:

```typescript
import { activity } from "@hex-di/flow";

const dataPollingActivity = activity<{ interval: number }, void>(
  "dataPoller",
  async (input, sink, signal) => {
    while (!signal.aborted) {
      const data = await fetchData();
      sink.emit({ type: "DATA_RECEIVED", payload: data });
      await delay(input.interval, signal);
    }
  }
);
```

## Activity Manager

The ActivityManager handles spawning, stopping, and tracking activities:

```typescript
import { createActivityManager } from "@hex-di/flow";

const manager = createActivityManager({
  maxConcurrent: 10,
  defaultTimeout: 30000,
});

// Spawn an activity
const result = await manager.spawn("poller-1", dataPollingActivity, { interval: 5000 });

// Check status
const status = manager.getStatus("poller-1");
console.log(status); // 'running' | 'completed' | 'failed' | 'cancelled'

// Get result (blocks until complete)
const output = await manager.getResult("poller-1");

// Stop an activity
await manager.stop("poller-1");

// Get all activities
const activities = manager.getAll();

// Clean up
manager.dispose();
```

## Activity Ports

For DI integration, use activity ports to define the contract:

```typescript
import { activityPort } from "@hex-di/flow";

// Curried API for type inference
export const DataPollerPort = activityPort<{ interval: number; url: string }, { lastSync: Date }>()(
  "DataPoller"
);

// The port can be used in effects
const effect = Effect.spawn("poller", { interval: 5000, url: "/api/data" });
```

## Typed Events

Define typed events for better type safety:

```typescript
import { defineEvents, TypedEventSink } from "@hex-di/flow";

// Define event schemas
const FileEvents = defineEvents({
  FILE_UPLOADED: (data: { filename: string; size: number }) => ({
    type: "FILE_UPLOADED" as const,
    payload: data,
  }),
  UPLOAD_PROGRESS: (data: { percent: number }) => ({
    type: "UPLOAD_PROGRESS" as const,
    payload: data,
  }),
  UPLOAD_ERROR: (data: { error: string }) => ({
    type: "UPLOAD_ERROR" as const,
    payload: data,
  }),
});

// Use in activity with typed sink
class FileUploadActivity implements Activity<File, string> {
  async execute(
    file: File,
    sink: TypedEventSink<typeof FileEvents>,
    signal: AbortSignal
  ): Promise<string> {
    sink.emit(
      FileEvents.FILE_UPLOADED({
        filename: file.name,
        size: file.size,
      })
    );

    // Upload logic with progress
    for (let percent = 0; percent <= 100; percent += 10) {
      if (signal.aborted) throw new Error("Upload cancelled");

      sink.emit(FileEvents.UPLOAD_PROGRESS({ percent }));
      await this.delay(100);
    }

    return "upload-id-123";
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Configured Activities

For advanced DI scenarios, use configured activities:

```typescript
import { ConfiguredActivity, ActivityContext } from "@hex-di/flow";

interface AnalyticsConfig {
  endpoint: string;
  apiKey: string;
}

const analyticsActivity: ConfiguredActivity<AnalyticsConfig> = {
  id: "analytics",
  config: {
    endpoint: "https://api.analytics.com",
    apiKey: process.env.ANALYTICS_KEY!,
  },
  execute: async (context: ActivityContext<AnalyticsConfig>) => {
    const { config, input, sink, signal } = context;

    // Use config for initialization
    const client = new AnalyticsClient(config.endpoint, config.apiKey);

    // Activity logic
    while (!signal.aborted) {
      const events = await client.fetchEvents();
      sink.emit({ type: "ANALYTICS_DATA", payload: events });
      await delay(60000); // Poll every minute
    }
  },
};
```

## Activity Instance Tracking

Track activity lifecycle and status:

```typescript
interface ActivityInstance {
  id: string;
  status: ActivityStatus;
  startTime: number;
  endTime?: number;
  error?: unknown;
  result?: unknown;
}

type ActivityStatus = "running" | "completed" | "failed" | "cancelled";

// In machine runner
const runner = createMachineRunner(machine);
const status = runner.getActivityStatus("my-activity");

if (status?.status === "running") {
  console.log(`Activity running for ${Date.now() - status.startTime}ms`);
}
```

## Integration with State Machines

Activities integrate seamlessly with state machines through effects:

```typescript
import { defineMachine, Effect } from "@hex-di/flow";

const machine = defineMachine({
  id: "file-processor",
  initial: "idle",
  context: { files: [], currentFile: null },
  states: {
    idle: {
      on: {
        START: {
          target: "processing",
          effects: [Effect.spawn("fileWatcher", { directory: "/uploads" })],
        },
      },
    },
    processing: {
      on: {
        FILE_DETECTED: {
          target: "uploading",
          actions: [
            (ctx, event) => ({
              currentFile: event.payload.file,
            }),
          ],
          effects: [Effect.spawn("uploader", { file: event.payload.file })],
        },
        STOP: {
          target: "idle",
          effects: [Effect.stop("fileWatcher"), Effect.stop("uploader")],
        },
      },
    },
    uploading: {
      on: {
        UPLOAD_COMPLETE: {
          target: "processing",
          actions: [
            (ctx, event) => ({
              files: [...ctx.files, event.payload.fileId],
              currentFile: null,
            }),
          ],
        },
        UPLOAD_ERROR: {
          target: "error",
          effects: [Effect.stop("uploader")],
        },
      },
    },
    error: {
      entry: [Effect.log("Processing error occurred")],
      on: {
        RETRY: { target: "processing" },
        STOP: { target: "idle" },
      },
    },
  },
});
```

## Testing Activities

Flow provides testing utilities for activities:

```typescript
import { createTestEventSink, createTestSignal, testActivity } from "@hex-di/flow";

describe("DataPollingActivity", () => {
  it("should emit data events", async () => {
    const sink = createTestEventSink();
    const signal = createTestSignal();

    const activity = new DataPollingActivity();

    // Run activity in background
    const promise = activity.execute({ interval: 100 }, sink, signal.signal);

    // Wait for some events
    await new Promise(resolve => setTimeout(resolve, 250));

    // Stop the activity
    signal.abort();

    // Check emitted events
    expect(sink.events).toHaveLength(2);
    expect(sink.events[0].type).toBe("DATA_RECEIVED");
  });

  it("should handle cancellation", async () => {
    const result = await testActivity(dataPollingActivity, {
      input: { interval: 1000 },
      timeout: 100, // Cancel after 100ms
    });

    expect(result.status).toBe("cancelled");
    expect(result.events).toHaveLength(0);
  });
});
```

## Best Practices

1. **Handle cancellation gracefully**: Always check the abort signal
2. **Emit events regularly**: Keep the machine informed of activity progress
3. **Clean up resources**: Use try/finally for cleanup on cancellation
4. **Type your events**: Use defineEvents for type safety
5. **Keep activities focused**: Each activity should have a single responsibility
6. **Test timeout scenarios**: Activities may run indefinitely, test boundaries
7. **Use activity ports**: Define clear contracts for DI integration
