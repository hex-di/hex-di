# 09 - Error Handling

[Previous: 08 - Persistence](./08-persistence.md) | [Next: 10 - Integration](./10-integration.md)

---

## 13. Error Handling

### 13.1 SagaError Tagged Union

All saga failures are represented as a `SagaError<TCause>` tagged union -- a discriminated union of plain objects carrying full diagnostic context about the failure. The `TCause` parameter carries the typed step error from the saga's accumulated error types.

Every variant shares a common base of diagnostic fields:

```typescript
interface SagaErrorBase {
  /** Unique execution ID for correlating with tracing spans and persistence records */
  readonly executionId: string;
  /** Name of the step that caused the failure */
  readonly stepName: string;
  /** Zero-based position of the failing step in the saga */
  readonly stepIndex: number;
  /** Names of steps that completed successfully before the failure */
  readonly completedSteps: readonly string[];
  /** Names of steps that were successfully compensated after the failure */
  readonly compensatedSteps: readonly string[];
}
```

The seven error variants cover every failure mode in saga execution:

```typescript
type SagaError<TCause = unknown> =
  | StepFailedError<TCause>
  | CompensationFailedError<TCause>
  | TimeoutError
  | CancelledError
  | ValidationFailedError
  | PortNotFoundError
  | PersistenceFailedError;

/** A forward step failed after retries exhausted; compensation succeeded fully */
interface StepFailedError<TCause = unknown> extends SagaErrorBase {
  readonly _tag: "StepFailed";
  readonly cause: TCause;
}

/** A compensation handler itself failed -- system is in an inconsistent state */
interface CompensationFailedError<TCause = unknown> extends SagaErrorBase {
  readonly _tag: "CompensationFailed";
  /** The original error that triggered the compensation chain */
  readonly cause: TCause;
  /** The error thrown by the compensation handler */
  readonly compensationCause: unknown;
  /** Steps whose compensation failed (includes the failing step) */
  readonly failedCompensationSteps: readonly string[];
}

/** A step or the entire saga exceeded its configured timeout */
interface TimeoutError extends SagaErrorBase {
  readonly _tag: "Timeout";
  /** The configured timeout in milliseconds that was exceeded */
  readonly timeoutMs: number;
}

/** The saga was explicitly cancelled via the runtime API */
interface CancelledError extends SagaErrorBase {
  readonly _tag: "Cancelled";
}

/** Input validation failed before any steps ran */
interface ValidationFailedError extends SagaErrorBase {
  readonly _tag: "ValidationFailed";
  /** Validation error details */
  readonly cause: unknown;
}

/** A step references a port not registered in the container */
interface PortNotFoundError extends SagaErrorBase {
  readonly _tag: "PortNotFound";
  /** The port name that was not found */
  readonly portName: string;
}

/** The persistence layer failed to save or load saga state */
interface PersistenceFailedError extends SagaErrorBase {
  readonly _tag: "PersistenceFailed";
  /** The persistence operation that failed */
  readonly operation: "save" | "load" | "delete" | "update";
  /** The underlying persistence error */
  readonly cause: unknown;
}
```

The `compensated: boolean` field from the old `SagaResult` is absorbed into the tag structure:

- `StepFailed` = compensation succeeded fully (all completed steps were rolled back)
- `CompensationFailed` = compensation was partial (some steps could not be undone)

### 13.2 SagaSuccess Wrapper

The success variant carries the execution ID alongside the output, since `Result` has no metadata slot:

```typescript
interface SagaSuccess<TOutput> {
  readonly output: TOutput;
  readonly executionId: string;
}
```

A saga execution returns `Result<SagaSuccess<TOutput>, SagaError<TAccumulatedErrors>>`, where `TAccumulatedErrors` is the union of all step error types in the saga.

### 13.3 Error Properties

| Property                  | Type                | Present On                         | Description                                      |
| ------------------------- | ------------------- | ---------------------------------- | ------------------------------------------------ |
| `_tag`                    | string literal      | All variants                       | Discriminant for exhaustive `switch` handling    |
| `executionId`             | `string`            | All variants                       | Unique execution ID for correlation              |
| `stepName`                | `string`            | All variants                       | Name of the step that caused the failure         |
| `stepIndex`               | `number`            | All variants                       | Zero-based position of the failing step          |
| `completedSteps`          | `readonly string[]` | All variants                       | Steps that completed before the failure          |
| `compensatedSteps`        | `readonly string[]` | All variants                       | Steps successfully compensated after the failure |
| `cause`                   | `TCause`            | `StepFailed`, `CompensationFailed` | The original typed error from the failing step   |
| `compensationCause`       | `unknown`           | `CompensationFailed`               | The error from the failing compensation handler  |
| `failedCompensationSteps` | `readonly string[]` | `CompensationFailed`               | Steps whose compensation failed                  |
| `timeoutMs`               | `number`            | `Timeout`                          | The configured timeout that was exceeded         |
| `portName`                | `string`            | `PortNotFound`                     | The port that was missing                        |
| `operation`               | `string`            | `PersistenceFailed`                | The persistence operation that failed            |

### 13.4 Handling Errors

The `_tag` field enables structured error handling with exhaustive branching via `result.match()` or manual discrimination:

```typescript
const result = await sagaRuntime.execute(OrderSaga, orderInput);

result.match(
  success => {
    console.log("Order placed:", success.output.trackingNumber);
  },
  error => {
    switch (error._tag) {
      case "StepFailed":
        // Forward step failed, but compensation succeeded fully
        console.log(`Saga rolled back cleanly at step "${error.stepName}"`);
        await notifyUser(orderInput.userId, "order_failed_rolled_back");
        break;

      case "CompensationFailed":
        // Compensation itself failed -- system is in an inconsistent state
        console.error(`CRITICAL: Compensation failed at step "${error.stepName}"`);
        console.error(`Completed: ${error.completedSteps.join(", ")}`);
        console.error(`Compensated: ${error.compensatedSteps.join(", ")}`);
        console.error(`Failed compensations: ${error.failedCompensationSteps.join(", ")}`);
        await alertOps({
          executionId: error.executionId,
          type: "compensation_failure",
          requiresManualIntervention: true,
        });
        break;

      case "Timeout":
        // Step or saga exceeded its timeout
        console.error(`Timeout at step "${error.stepName}" (${error.timeoutMs}ms exceeded)`);
        if (error.compensatedSteps.length > 0) {
          console.log(`Compensated: ${error.compensatedSteps.join(", ")}`);
        }
        break;

      case "Cancelled":
        // Saga was explicitly cancelled via sagaRuntime.cancel(executionId)
        console.log(`Saga cancelled. Compensated: ${error.compensatedSteps.join(", ")}`);
        break;

      case "ValidationFailed":
        // Input validation failed before any steps ran
        console.error(`Invalid saga input: ${String(error.cause)}`);
        break;

      case "PortNotFound":
        // A step references a port not registered in the container
        console.error(`Missing port "${error.portName}" for step "${error.stepName}"`);
        break;

      case "PersistenceFailed":
        // The persistence layer could not save or load state
        console.error(`Persistence ${error.operation} failed: ${String(error.cause)}`);
        break;
    }
  }
);
```

Alternative using `isOk()` / `isErr()`:

```typescript
const result = await sagaRuntime.execute(OrderSaga, orderInput);

if (result.isOk()) {
  console.log("Order placed:", result.value.output.trackingNumber);
} else {
  const error = result.error;
  // error is narrowed to SagaError<AccumulatedErrors<typeof OrderSaga>>
  if (error._tag === "StepFailed") {
    // error.cause is typed as the union of all step error types
  }
}
```

### 13.5 Retry Configuration

Steps can configure retry behavior for transient failures using `RetryConfig<TError>`. The generic parameter carries the step's error type, enabling typed predicates in `retryIf` and typed backoff functions in `delay`:

```typescript
interface RetryConfig<TError = unknown> {
  /** Maximum number of retry attempts (default: 0, meaning no retries) */
  maxAttempts: number;

  /** Delay between retries in ms, or a function for custom backoff strategies */
  delay: number | ((attempt: number, error: TError) => number);

  /** Predicate to determine if an error is retryable; defaults to retrying all errors */
  retryIf?: (error: TError) => boolean;
}
```

#### Exponential Backoff with Jitter

The recommended strategy for network-facing steps. Exponential backoff prevents thundering-herd retries, and jitter spreads retry timing across concurrent saga executions to avoid synchronized bursts.

```typescript
const retryConfig: RetryConfig<NetworkError | TimeoutError> = {
  maxAttempts: 5,
  delay: attempt => {
    const base = Math.min(1000 * Math.pow(2, attempt), 30000); // Cap at 30s
    const jitter = Math.random() * 1000; // Up to 1s jitter
    return base + jitter;
  },
  retryIf: error => error._tag === "NetworkError" || error._tag === "TimeoutError",
};
```

#### Fixed Delay

For internal service calls where backoff is unnecessary:

```typescript
const retryConfig: RetryConfig = {
  maxAttempts: 3,
  delay: 500, // Fixed 500ms between retries
};
```

#### Selective Retry

Only retry specific error types. Non-retryable errors (e.g., validation errors, 4xx responses) immediately trigger the compensation chain without wasting retry attempts:

```typescript
const retryConfig: RetryConfig<PaymentError> = {
  maxAttempts: 3,
  delay: attempt => 1000 * Math.pow(2, attempt),
  retryIf: error => {
    // Only retry transient infrastructure errors
    if (error._tag === "ValidationError") return false;
    if (error._tag === "AuthorizationError") return false;
    return true;
  },
};
```

### 13.6 Timeout Handling

Timeouts prevent steps and sagas from hanging indefinitely. Two levels of timeout are available:

#### Step-Level Timeout

A step-level timeout limits the execution time of a single step's forward invocation. When exceeded, the step is aborted and an `Err(TimeoutError)` is returned, triggering the compensation chain for previously completed steps.

```typescript
const ChargePaymentStep = defineStep("ChargePayment")
  .io<{ amount: number }, { transactionId: string }>()
  .invoke(PaymentPort, ctx => ({ amount: ctx.input.amount }))
  .compensate(ctx => ({ action: "refund", transactionId: ctx.stepResult.transactionId }))
  .timeout(30000) // 30 seconds for the payment call
  .build();
```

- The timeout applies only to the forward invocation, not to the compensation handler
- If the step has retries configured, each individual attempt has its own timeout window
- When a step times out mid-retry, remaining retry attempts are not executed

#### Saga-Level Timeout

A saga-level timeout limits the total execution time of the entire saga, including all steps and any retries. When exceeded, the currently executing step is aborted and compensation begins for all completed steps.

```typescript
const OrderSaga = defineSaga("OrderSaga")
  .input<OrderInput>()
  .step(ValidateOrderStep)
  .step(ReserveStockStep)
  .step(ChargePaymentStep)
  .step(ShipOrderStep)
  .output(results => ({
    orderId: results.ValidateOrder.orderId,
    trackingNumber: results.ShipOrder.trackingNumber,
  }))
  .options({
    timeout: 120000, // 2 minutes for the entire saga
    compensationStrategy: "sequential",
  })
  .build();
```

- The saga-level timeout encompasses all step execution time, retry delays, and inter-step overhead
- When the saga-level timeout fires, it overrides any remaining step-level timeouts
- Compensation itself is not subject to the saga-level timeout -- once triggered, compensation runs to completion (or failure)

### 13.7 Error Propagation

Errors flow through a defined pipeline within the saga runtime. Each stage either handles the error or escalates it to the next stage:

```
Step throws error
       |
       v
+-----------------+
| Retry if config |---- retryIf returns true ----> Re-execute step
|   exists        |     and attempts remain
+-------+---------+
        | retries exhausted or
        | retryIf returns false
        v
+-----------------+
| Trigger         |---- Compensate completed steps in reverse
| compensation    |
+-------+---------+
        |
        v
+-----------------+     +------------------------------------------+
| Compensation    |-Yes-| Err(StepFailedError { _tag: "StepFailed", |
| succeeds?       |     |   cause, completedSteps, compensatedSteps |
+-------+---------+     |   ... })                                  |
        | No            +------------------------------------------+
        v
+------------------------------------------+
| Err(CompensationFailedError {             |
|   _tag: "CompensationFailed",             |
|   cause, compensationCause,               |
|   failedCompensationSteps, ... })         |
+------------------------------------------+
```

1. **Step throws** -- the forward invocation raises an error
2. **Retry evaluation** -- if `RetryConfig` is present, the runtime checks `retryIf` (defaults to `true`) and whether `maxAttempts` has been reached; if retryable, the step is re-executed after the configured delay
3. **Retries exhausted** -- once all retry attempts fail (or the error is not retryable), the runtime begins the compensation phase
4. **Compensation phase** -- completed steps are compensated in reverse order according to the configured `compensationStrategy` (`sequential`, `parallel`, or `best-effort`)
5. **Compensation succeeds** -- an `Err(StepFailedError)` is returned with `_tag: "StepFailed"` and the typed `cause`
6. **Compensation fails** -- an `Err(CompensationFailedError)` is returned with `_tag: "CompensationFailed"`, containing both the original cause and the compensation error

The result is always returned via `Result`, never thrown. Consumers use `result.match()`, `result.isOk()`, or `result.isErr()` to determine the outcome and inspect the error for structured diagnostic information.

### 13.8 Error Type Accumulation

When a saga is composed of steps that each declare their own error type via `.io<TInput, TOutput, TError>()`, the saga's accumulated error type is the union of all step errors:

```typescript
// Each step declares its error type
const ReserveStockStep = defineStep("ReserveStock")
  .io<ReserveInput, ReserveOutput, InsufficientStockError>()
  // ...
  .build();

const ChargePaymentStep = defineStep("ChargePayment")
  .io<ChargeInput, ChargeOutput, PaymentDeclinedError | PaymentTimeoutError>()
  // ...
  .build();

const ShipOrderStep = defineStep("ShipOrder")
  .io<ShipInput, ShipOutput, ShippingUnavailableError>()
  // ...
  .build();

// The saga accumulates all step error types
const OrderSaga = defineSaga("OrderSaga")
  .input<OrderInput>()
  .step(ReserveStockStep)
  .step(ChargePaymentStep)
  .step(ShipOrderStep)
  .output(results => ({
    /* ... */
  }))
  .build();

// InferSagaErrors<typeof OrderSaga> =
//   InsufficientStockError | PaymentDeclinedError | PaymentTimeoutError | ShippingUnavailableError
```

The `SagaError<TCause>` wraps the accumulated error type:

```typescript
type OrderSagaResult = Result<
  SagaSuccess<OrderOutput>,
  SagaError<
    InsufficientStockError | PaymentDeclinedError | PaymentTimeoutError | ShippingUnavailableError
  >
>;
```

This enables exhaustive error handling at the saga level:

```typescript
const result = await orderSaga.execute(input);

if (result.isErr() && result.error._tag === "StepFailed") {
  const cause = result.error.cause;
  // cause: InsufficientStockError | PaymentDeclinedError | PaymentTimeoutError | ShippingUnavailableError

  switch (cause._tag) {
    case "InsufficientStock":
      // Handle out-of-stock scenario
      break;
    case "PaymentDeclined":
      // Prompt user to update payment method
      break;
    case "PaymentTimeout":
      // Suggest retry
      break;
    case "ShippingUnavailable":
      // Offer alternative shipping
      break;
  }
}
```

Steps that do not declare an error type default to `TError = never`, meaning they do not contribute to the accumulated error union. This enables progressive adoption -- existing steps without error types work unchanged.

### 13.9 Structured Error Context

`SagaError` is designed to provide complete diagnostic context in a single object, eliminating the need to correlate multiple log entries or trace spans to understand what happened:

- **What failed** -- `stepName` and `stepIndex` identify the exact step and its position in the saga
- **Why it failed** -- `cause` contains the original typed error from the failing step
- **What category** -- `_tag` classifies the failure for programmatic branching without string matching
- **What completed** -- `completedSteps` lists every step that ran successfully before the failure, in execution order
- **What was undone** -- `compensatedSteps` lists every step that was successfully compensated, in compensation order (reverse of execution)
- **What remains inconsistent** -- the difference between `completedSteps` and `compensatedSteps` reveals steps whose effects persist despite the saga failure (only possible with `CompensationFailed`)
- **How to correlate** -- `executionId` ties the error to the saga's tracing spans, persistence records, and any logs emitted during execution

This structured context enables automated error handling pipelines:

```typescript
const result = await sagaRuntime.execute(OrderSaga, orderInput);

if (result.isErr()) {
  const error = result.error;

  if (error._tag === "CompensationFailed") {
    const inconsistentSteps = error.completedSteps.filter(
      step => !error.compensatedSteps.includes(step)
    );

    if (inconsistentSteps.length > 0) {
      // These steps completed but were not compensated -- manual intervention required
      await alertOps({
        executionId: error.executionId,
        saga: "OrderSaga",
        inconsistentSteps,
        failedAt: { step: error.stepName, index: error.stepIndex },
        cause: error.cause,
        compensationCause: error.compensationCause,
      });
    }
  }
}
```

---

[Previous: 08 - Persistence](./08-persistence.md) | [Next: 10 - Integration](./10-integration.md)
