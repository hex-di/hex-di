---
sidebar_position: 1
title: Patterns
---

# Patterns

Advanced composition patterns for building complex state machine systems with Flow.

## Actor Model

The actor model pattern allows machines to spawn child machines as activities:

### createMachineActivity

Transform a child machine into an activity:

```typescript
import { createMachineActivity } from "@hex-di/flow";

// Child machine for handling individual uploads
const uploadMachine = defineMachine({
  id: "upload",
  initial: "uploading",
  context: { file: null, progress: 0 },
  states: {
    uploading: {
      on: {
        PROGRESS: {
          target: "uploading",
          actions: [(ctx, event) => ({ progress: event.payload.percent })],
        },
        SUCCESS: { target: "complete" },
        ERROR: { target: "failed" },
      },
    },
    complete: { type: "final" },
    failed: { type: "final" },
  },
});

// Create activity from machine
const uploadActivity = createMachineActivity(uploadMachine, {
  mapInput: (file: File) => ({ file, progress: 0 }),
  mapOutput: context => ({ uploadedFile: context.file }),
  doneEventType: "UPLOAD_COMPLETE",
  errorEventType: "UPLOAD_FAILED",
});

// Parent machine that spawns upload activities
const uploaderMachine = defineMachine({
  id: "uploader",
  initial: "idle",
  context: { uploads: [] },
  states: {
    idle: {
      on: {
        START_UPLOAD: {
          target: "uploading",
          effects: [Effect.spawn("upload-1", uploadActivity.withInput(event.payload.file))],
        },
      },
    },
    uploading: {
      on: {
        UPLOAD_COMPLETE: {
          target: "idle",
          actions: [
            (ctx, event) => ({
              uploads: [...ctx.uploads, event.payload.uploadedFile],
            }),
          ],
        },
        UPLOAD_FAILED: {
          target: "idle",
          effects: [Effect.log("Upload failed")],
        },
      },
    },
  },
});
```

### Actor Hierarchies

Build hierarchies of actors:

```typescript
// Root coordinator machine
const coordinatorMachine = defineMachine({
  id: "coordinator",
  initial: "orchestrating",
  context: { workers: [] },
  states: {
    orchestrating: {
      entry: [
        // Spawn multiple worker actors
        Effect.parallel([
          Effect.spawn("worker-1", workerActivity),
          Effect.spawn("worker-2", workerActivity),
          Effect.spawn("worker-3", workerActivity),
        ]),
      ],
      on: {
        WORKER_DONE: {
          target: "orchestrating",
          actions: [
            (ctx, event) => ({
              workers: [...ctx.workers, event.payload.workerId],
            }),
          ],
          guard: ctx => ctx.workers.length < 2,
        },
        WORKER_DONE: {
          target: "complete",
          guard: ctx => ctx.workers.length === 2,
          effects: [
            // Stop all workers
            Effect.parallel([
              Effect.stop("worker-1"),
              Effect.stop("worker-2"),
              Effect.stop("worker-3"),
            ]),
          ],
        },
      },
    },
    complete: { type: "final" },
  },
});
```

## Event Bus Communication

Enable cross-machine communication via event bus:

```typescript
// Shared event definitions
const OrderEvents = defineEvents({
  ORDER_CREATED: (data: { orderId: string; items: Item[] }) => ({
    type: "ORDER_CREATED" as const,
    payload: data,
  }),
  PAYMENT_PROCESSED: (data: { orderId: string; amount: number }) => ({
    type: "PAYMENT_PROCESSED" as const,
    payload: data,
  }),
  SHIPMENT_DISPATCHED: (data: { orderId: string; trackingId: string }) => ({
    type: "SHIPMENT_DISPATCHED" as const,
    payload: data,
  }),
});

// Order machine publishes events
const orderMachine = defineMachine({
  id: "order",
  initial: "draft",
  states: {
    draft: {
      on: {
        SUBMIT: {
          target: "submitted",
          effects: [
            Effect.invoke("EventBus", "publish", {
              event: OrderEvents.ORDER_CREATED({
                orderId: "123",
                items: [],
              }),
            }),
          ],
        },
      },
    },
    submitted: {
      on: {
        PAYMENT_PROCESSED: { target: "paid" },
        SHIPMENT_DISPATCHED: { target: "shipped" },
      },
    },
    paid: {},
    shipped: {},
  },
});

// Payment machine subscribes to events
const paymentMachine = defineMachine({
  id: "payment",
  initial: "waiting",
  states: {
    waiting: {
      on: {
        ORDER_CREATED: {
          target: "processing",
          actions: [(ctx, event) => ({ orderId: event.payload.orderId })],
        },
      },
    },
    processing: {
      entry: [
        Effect.invoke("PaymentService", "charge"),
        Effect.invoke("EventBus", "publish", {
          event: OrderEvents.PAYMENT_PROCESSED({
            orderId: "123",
            amount: 100,
          }),
        }),
      ],
      on: {
        SUCCESS: { target: "complete" },
      },
    },
    complete: {},
  },
});
```

## Subscription Patterns

Create activities that subscribe to external data sources:

```typescript
import { createSubscriptionActivity } from "@hex-di/flow";

// WebSocket subscription
const websocketActivity = createSubscriptionActivity({
  id: "websocket",
  subscribe: (input: { url: string }) => {
    const ws = new WebSocket(input.url);

    return {
      next: callback => {
        ws.onmessage = event =>
          callback({
            type: "MESSAGE",
            payload: JSON.parse(event.data),
          });
      },
      error: callback => {
        ws.onerror = error =>
          callback({
            type: "ERROR",
            payload: { error },
          });
      },
      complete: callback => {
        ws.onclose = () => callback({ type: "DISCONNECTED" });
      },
      unsubscribe: () => {
        ws.close();
      },
    };
  },
});

// EventSource subscription
const eventSourceActivity = createSubscriptionActivity({
  id: "server-events",
  subscribe: (input: { url: string }) => {
    const source = new EventSource(input.url);

    return {
      next: callback => {
        source.onmessage = event =>
          callback({
            type: "SSE_EVENT",
            payload: { data: event.data },
          });
      },
      error: callback => {
        source.onerror = error =>
          callback({
            type: "SSE_ERROR",
            payload: { error },
          });
      },
      unsubscribe: () => {
        source.close();
      },
    };
  },
});

// Use in machine
const realtimeMachine = defineMachine({
  id: "realtime",
  initial: "disconnected",
  states: {
    disconnected: {
      on: {
        CONNECT: {
          target: "connected",
          effects: [Effect.spawn("websocket", { url: "wss://api.example.com" })],
        },
      },
    },
    connected: {
      on: {
        MESSAGE: {
          target: "connected",
          actions: [
            (ctx, event) => ({
              lastMessage: event.payload,
            }),
          ],
        },
        ERROR: { target: "reconnecting" },
        DISCONNECT: {
          target: "disconnected",
          effects: [Effect.stop("websocket")],
        },
      },
    },
    reconnecting: {
      entry: [Effect.delay(5000)],
      on: {
        RECONNECT: { target: "connected" },
      },
    },
  },
});
```

## Retry Patterns

Implement retry logic with exponential backoff:

```typescript
import { retryConfig } from "@hex-di/flow";

const retryMachine = defineMachine({
  id: "retry-flow",
  initial: "idle",
  context: {
    retryCount: 0,
    lastError: null,
  },
  states: {
    idle: {
      on: {
        START: { target: "attempting" },
      },
    },
    attempting: {
      entry: [Effect.invoke("ApiService", "fetchData")],
      on: {
        SUCCESS: {
          target: "success",
          actions: [ctx => ({ retryCount: 0, lastError: null })],
        },
        FAILURE: {
          target: "retrying",
          guard: ctx => ctx.retryCount < 3,
          actions: [
            (ctx, event) => ({
              retryCount: ctx.retryCount + 1,
              lastError: event.payload.error,
            }),
          ],
        },
        FAILURE: {
          target: "failed",
          guard: ctx => ctx.retryCount >= 3,
        },
      },
    },
    retrying: {
      entry: [
        // Exponential backoff
        Effect.delay(ctx => Math.pow(2, ctx.retryCount) * 1000),
      ],
      on: {
        RETRY: { target: "attempting" },
      },
    },
    success: { type: "final" },
    failed: { type: "final" },
  },
});

// Using retry helper
const retryActivity = retryConfig({
  maxAttempts: 3,
  backoff: "exponential",
  initialDelay: 1000,
  maxDelay: 10000,
  shouldRetry: error => error.code !== "FATAL",
  onRetry: (attempt, error) => {
    console.log(`Retry attempt ${attempt} after error:`, error);
  },
});
```

## Coordination Patterns

Coordinate multiple parallel activities:

```typescript
import { waitForAll, waitForAny } from "@hex-di/flow";

// Wait for all activities to complete
const parallelMachine = defineMachine({
  id: "parallel-coordinator",
  initial: "coordinating",
  context: {
    results: [],
  },
  states: {
    coordinating: {
      entry: [
        Effect.parallel([
          Effect.spawn("task-1", task1Activity),
          Effect.spawn("task-2", task2Activity),
          Effect.spawn("task-3", task3Activity),
        ]),
      ],
      invoke: {
        src: waitForAll(["task-1", "task-2", "task-3"]),
        onDone: {
          target: "complete",
          actions: [
            (ctx, event) => ({
              results: event.data,
            }),
          ],
        },
      },
    },
    complete: { type: "final" },
  },
});

// Race pattern - first to complete wins
const raceMachine = defineMachine({
  id: "race-coordinator",
  initial: "racing",
  states: {
    racing: {
      entry: [
        Effect.parallel([
          Effect.spawn("primary", primaryActivity),
          Effect.spawn("fallback", fallbackActivity),
        ]),
      ],
      invoke: {
        src: waitForAny(["primary", "fallback"]),
        onDone: {
          target: "complete",
          actions: [
            (ctx, event) => ({
              winner: event.data.activityId,
              result: event.data.result,
            }),
          ],
          effects: [
            // Cancel the other activity
            Effect.choose([
              {
                predicate: ctx => ctx.winner === "primary",
                effect: Effect.stop("fallback"),
              },
              {
                predicate: ctx => ctx.winner === "fallback",
                effect: Effect.stop("primary"),
              },
            ]),
          ],
        },
      },
    },
    complete: { type: "final" },
  },
});
```

## Saga Pattern

Implement distributed transactions with compensations:

```typescript
const sagaMachine = defineMachine({
  id: "booking-saga",
  initial: "booking",
  context: {
    flightId: null,
    hotelId: null,
    carId: null,
  },
  states: {
    booking: {
      initial: "flight",
      states: {
        flight: {
          entry: [
            Effect.invoke(
              "FlightService",
              "reserve",
              { flightId: "123" },
              {
                compensate: Effect.invoke("FlightService", "cancel", { flightId: "123" }),
              }
            ),
          ],
          on: {
            FLIGHT_RESERVED: {
              target: "hotel",
              actions: [(ctx, event) => ({ flightId: event.payload.reservationId })],
            },
            FLIGHT_FAILED: { target: "#booking-saga.failed" },
          },
        },
        hotel: {
          entry: [
            Effect.invoke(
              "HotelService",
              "reserve",
              { hotelId: "456" },
              {
                compensate: Effect.invoke("HotelService", "cancel", { hotelId: "456" }),
              }
            ),
          ],
          on: {
            HOTEL_RESERVED: {
              target: "car",
              actions: [(ctx, event) => ({ hotelId: event.payload.reservationId })],
            },
            HOTEL_FAILED: { target: "#booking-saga.compensating" },
          },
        },
        car: {
          entry: [
            Effect.invoke(
              "CarService",
              "reserve",
              { carId: "789" },
              {
                compensate: Effect.invoke("CarService", "cancel", { carId: "789" }),
              }
            ),
          ],
          on: {
            CAR_RESERVED: {
              target: "#booking-saga.complete",
              actions: [(ctx, event) => ({ carId: event.payload.reservationId })],
            },
            CAR_FAILED: { target: "#booking-saga.compensating" },
          },
        },
      },
    },
    compensating: {
      entry: [
        Effect.log("Starting compensation..."),
        // Compensations run in reverse order
        Effect.sequence([
          Effect.invoke("CarService", "cancel", { carId: "789" }),
          Effect.invoke("HotelService", "cancel", { hotelId: "456" }),
          Effect.invoke("FlightService", "cancel", { flightId: "123" }),
        ]),
      ],
      on: {
        COMPENSATION_COMPLETE: { target: "failed" },
      },
    },
    complete: { type: "final" },
    failed: { type: "final" },
  },
});
```

## Best Practices

1. **Use actors for isolation**: Each actor manages its own state
2. **Prefer message passing**: Communicate via events, not shared state
3. **Implement compensations**: Always define rollback for critical operations
4. **Use subscription activities**: For external data sources
5. **Apply retry strategically**: Not all failures should be retried
6. **Coordinate carefully**: Choose between all/any patterns based on requirements
7. **Test saga flows**: Ensure compensations work correctly
8. **Monitor actor health**: Track spawned activities and their status
