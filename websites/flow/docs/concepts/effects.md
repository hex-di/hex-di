---
sidebar_position: 3
title: Effects
---

# Effects

Effects in Flow are data descriptors that represent side effects to be executed. They are pure data structures, not imperative actions, making them testable, serializable, and composable.

## Effects as Data

Unlike traditional side effect implementations, Flow effects are data descriptors that describe what should happen, not how it happens:

```typescript
import { Effect } from "@hex-di/flow";

// Effects are data, not functions
const logEffect = Effect.log("Hello, world!");
// { _tag: 'log', message: 'Hello, world!' }

const delayEffect = Effect.delay(1000);
// { _tag: 'delay', ms: 1000 }

// Effects can be composed
const sequenceEffect = Effect.sequence([
  Effect.log("Starting..."),
  Effect.delay(1000),
  Effect.log("Done!"),
]);
```

## Effect Types

Flow provides 10 built-in effect types, each with a discriminator `_tag` property:

### 1. InvokeEffect

Call a port method with arguments:

```typescript
const effect = Effect.invoke("UserService", "fetchUser", { id: "123" });

// With compensation for rollback
const effectWithCompensation = Effect.invoke(
  "PaymentService",
  "charge",
  { amount: 100 },
  {
    compensate: Effect.invoke("PaymentService", "refund", { amount: 100 }),
  }
);
```

### 2. SpawnEffect

Start a long-running activity:

```typescript
const effect = Effect.spawn("dataSync", { interval: 5000 });

// With compensation to stop on rollback
const effectWithCompensation = Effect.spawn(
  "backgroundJob",
  { jobId: "abc" },
  {
    compensate: Effect.stop("backgroundJob"),
  }
);
```

### 3. StopEffect

Stop a running activity:

```typescript
const effect = Effect.stop("dataSync");
```

### 4. EmitEffect

Emit an event back to the machine:

```typescript
const effect = Effect.emit({ type: "RETRY", payload: { attempt: 1 } });

// With delayed emission
const delayedEmit = Effect.emit({ type: "TIMEOUT" }, { delay: 5000 });

// With compensation
const emitWithCompensation = Effect.emit(
  { type: "START_PROCESS" },
  {
    compensate: Effect.emit({ type: "CANCEL_PROCESS" }),
  }
);
```

### 5. DelayEffect

Wait for a specified duration:

```typescript
const effect = Effect.delay(3000); // Wait 3 seconds

// With compensation to cancel delay
const delayWithCompensation = Effect.delay(10000, {
  compensate: Effect.none(), // Cancels the delay
});
```

### 6. ParallelEffect

Run multiple effects concurrently:

```typescript
const effect = Effect.parallel([
  Effect.invoke("ServiceA", "method1"),
  Effect.invoke("ServiceB", "method2"),
  Effect.invoke("ServiceC", "method3"),
]);

// All effects run at the same time
```

### 7. SequenceEffect

Run effects sequentially, one after another:

```typescript
const effect = Effect.sequence([
  Effect.log("Step 1"),
  Effect.delay(1000),
  Effect.log("Step 2"),
  Effect.invoke("DataService", "save"),
  Effect.log("Step 3"),
]);

// Each effect waits for the previous to complete
```

### 8. NoneEffect

A no-op effect (useful for conditional logic):

```typescript
const effect = Effect.none();

// Useful in conditional branches
const conditionalEffect = shouldLog ? Effect.log("Event occurred") : Effect.none();
```

### 9. ChooseEffect

Conditional branching based on predicates:

```typescript
const effect = Effect.choose([
  {
    predicate: ctx => ctx.retryCount < 3,
    effect: Effect.sequence([Effect.log("Retrying..."), Effect.emit({ type: "RETRY" })]),
  },
  {
    predicate: ctx => ctx.retryCount >= 3,
    effect: Effect.sequence([Effect.log("Max retries reached"), Effect.emit({ type: "FAILURE" })]),
  },
]);
```

### 10. LogEffect

Logging for debugging and monitoring:

```typescript
const effect = Effect.log("State transition completed");

// Log with context interpolation
const effectWithContext = Effect.log(ctx => `User ${ctx.userId} logged in`);
```

## Effect Composition

Effects can be composed to create complex behaviors:

### Parallel Composition

Run multiple operations simultaneously:

```typescript
import { Effect } from "@hex-di/flow";

const parallelDataFetch = Effect.parallel([
  Effect.invoke("UserService", "fetchProfile", { id: userId }),
  Effect.invoke("PostService", "fetchPosts", { userId }),
  Effect.invoke("CommentService", "fetchComments", { userId }),
]);
```

### Sequential Composition

Chain operations that depend on order:

```typescript
const saveSequence = Effect.sequence([
  Effect.log("Validating data..."),
  Effect.invoke("ValidationService", "validate", data),
  Effect.log("Saving to database..."),
  Effect.invoke("DatabaseService", "save", data),
  Effect.log("Sending notification..."),
  Effect.invoke("NotificationService", "notify", { event: "data_saved" }),
  Effect.log("Save complete!"),
]);
```

### Nested Composition

Combine parallel and sequential patterns:

```typescript
const complexFlow = Effect.sequence([
  Effect.log("Starting complex operation"),
  Effect.parallel([
    Effect.invoke("CacheService", "warm"),
    Effect.sequence([
      Effect.invoke("AuthService", "verify"),
      Effect.invoke("PermissionService", "check"),
    ]),
  ]),
  Effect.log("Ready to process"),
  Effect.invoke("ProcessingService", "execute"),
]);
```

## Compensation Support

For GxP compliance (F8), effects support compensation for rollback scenarios:

```typescript
const transactionEffect = Effect.sequence([
  Effect.invoke(
    "AccountService",
    "debit",
    { account: "A", amount: 100 },
    { compensate: Effect.invoke("AccountService", "credit", { account: "A", amount: 100 }) }
  ),
  Effect.invoke(
    "AccountService",
    "credit",
    { account: "B", amount: 100 },
    { compensate: Effect.invoke("AccountService", "debit", { account: "B", amount: 100 }) }
  ),
]);
```

## Port Method Utilities

Flow provides utilities for extracting method information from ports:

```typescript
import { MethodNames, MethodParams, MethodReturn } from "@hex-di/flow";

interface UserService {
  fetchUser(id: string): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
}

// Extract method names
type Methods = MethodNames<UserService>;
// 'fetchUser' | 'updateUser' | 'deleteUser'

// Extract parameters for a method
type FetchParams = MethodParams<UserService, "fetchUser">;
// [id: string]

// Extract return type for a method
type FetchReturn = MethodReturn<UserService, "fetchUser">;
// Promise<User>
```

## Using Effects in Machines

Effects are typically used in transitions and state entry/exit:

```typescript
import { defineMachine, Effect } from "@hex-di/flow";

const machine = defineMachine({
  id: "order-processing",
  initial: "pending",
  context: { orderId: null, items: [] },
  states: {
    pending: {
      entry: [Effect.log("Order pending")],
      on: {
        PROCESS: {
          target: "processing",
          effects: [
            Effect.parallel([
              Effect.invoke("InventoryService", "reserve", { items: [] }),
              Effect.invoke("PaymentService", "authorize", { amount: 0 }),
            ]),
          ],
        },
      },
    },
    processing: {
      entry: [Effect.spawn("orderMonitor", { orderId: "123" })],
      exit: [Effect.stop("orderMonitor")],
      on: {
        SUCCESS: {
          target: "completed",
          effects: [
            Effect.sequence([
              Effect.invoke("PaymentService", "capture"),
              Effect.invoke("ShippingService", "schedule"),
              Effect.invoke("EmailService", "sendConfirmation"),
            ]),
          ],
        },
        FAILURE: {
          target: "failed",
          effects: [
            Effect.parallel([
              Effect.invoke("InventoryService", "release"),
              Effect.invoke("PaymentService", "void"),
              Effect.log("Order processing failed"),
            ]),
          ],
        },
      },
    },
    completed: {
      entry: [Effect.log("Order completed successfully")],
    },
    failed: {
      entry: [Effect.log("Order failed")],
    },
  },
});
```

## Best Practices

1. **Keep effects pure data**: Don't put functions or closures in effect descriptors
2. **Use composition**: Build complex effects from simple ones
3. **Add compensation**: For critical operations, always define rollback effects
4. **Log strategically**: Use log effects for debugging but remove in production
5. **Batch when possible**: Use parallel effects for independent operations
6. **Test effects separately**: Effects are data and can be easily tested
7. **Type your ports**: Ensure full type safety with properly typed port interfaces
