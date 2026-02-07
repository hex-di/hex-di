# 02 - Core Concepts

_Previous: [01 - Overview & Philosophy](./01-overview.md)_

---

## 4. Core Concepts

### 4.1 Step

A **Step** is a single unit of work in a saga. It defines:

- Which port to invoke
- How to map saga context to port input
- How to compensate (undo) the step if needed

```typescript
const ReserveStockStep = defineStep("ReserveStock")
  .io<{ productId: string; quantity: number }, { reservationId: string }>()
  .invoke(InventoryPort, ctx => ({
    action: "reserve",
    productId: ctx.input.productId,
    quantity: ctx.input.quantity,
  }))
  .compensate(ctx => ({
    action: "release",
    reservationId: ctx.stepResult.reservationId,
  }))
  .build();
```

### 4.2 Saga

A **Saga** is an ordered sequence of steps with a defined input and output:

```typescript
const OrderSaga = defineSaga("OrderSaga")
  .input<OrderInput>()
  .step(ValidateOrderStep)
  .step(ReserveStockStep)
  .step(ChargePaymentStep)
  .step(ShipOrderStep)
  .step(NotifyUserStep)
  .output(results => ({
    orderId: results.ValidateOrder.orderId,
    trackingNumber: results.ShipOrder.trackingNumber,
  }))
  .build();
```

### 4.3 StepContext

The **StepContext** provides access to saga input and accumulated results from completed steps:

```typescript
interface StepContext<TInput, TAccumulated> {
  /** Original saga input */
  readonly input: TInput;
  /** Results from completed steps */
  readonly results: TAccumulated;
  /** Current step index (0-based) */
  readonly stepIndex: number;
  /** Unique execution ID */
  readonly executionId: string;
}
```

Key properties:

- **input** -- the original saga input, immutable throughout execution
- **results** -- a mapped type that accumulates as steps complete; `results.StepName` gives that step's output
- **executionId** -- unique per execution, useful as idempotency keys

### 4.4 CompensationContext

The **CompensationContext** extends StepContext with the step's output and the typed error that triggered compensation:

```typescript
interface CompensationContext<TInput, TAccumulated, TStepOutput, TError> extends StepContext<
  TInput,
  TAccumulated
> {
  /** This step's output (what to compensate) */
  readonly stepResult: TStepOutput;
  /** The typed error that triggered compensation */
  readonly error: TError;
  /** Index of the step that failed (triggered compensation) */
  readonly failedStepIndex: number;
  /** Name of the step that failed */
  readonly failedStepName: string;
}
```

Key properties:

- **stepResult** -- contains the output of this particular step that needs undoing
- **error** -- the typed error that caused compensation (carries the step's `TError` type)
- **failedStepIndex** -- tells you which later step actually failed
- **failedStepName** -- the name of the step that triggered the compensation chain

### 4.5 SagaSuccess and SagaExecutionResult

Saga execution returns a `Result<SagaSuccess<TOutput>, SagaError<TAccumulatedErrors>>` from `@hex-di/result`. The `SagaSuccess` wrapper carries the execution ID alongside the output, since `Result` has no metadata slot:

```typescript
interface SagaSuccess<TOutput> {
  readonly output: TOutput;
  readonly executionId: string;
}
```

The `SagaError<TCause>` tagged union represents all failure modes. The `TCause` parameter carries the union of all step error types declared in the saga. See [09 - Error Handling](./09-error-handling.md) for the full definition and all seven error variants.

```typescript
type SagaError<TCause = unknown> =
  | StepFailedError<TCause>
  | CompensationFailedError<TCause>
  | TimeoutError
  | CancelledError
  | ValidationFailedError
  | PortNotFoundError
  | PersistenceFailedError;
```

The combined result type for saga execution:

```typescript
type SagaExecutionResult<TOutput, TErrors> = Result<SagaSuccess<TOutput>, SagaError<TErrors>>;
```

- **On success** -- `result.isOk()` returns `true`; `result.value` provides `SagaSuccess<TOutput>` with typed output and execution ID
- **On failure** -- `result.isErr()` returns `true`; `result.error` provides `SagaError<TAccumulatedErrors>` with a `_tag` discriminant for exhaustive matching
- **Compensation status** is encoded in the `_tag`: `"StepFailed"` means compensation succeeded fully; `"CompensationFailed"` means rollback was partial

Usage with `result.match()`:

```typescript
const result = await sagaRuntime.execute(OrderSaga, orderInput);

result.match(
  success => {
    console.log("Order placed:", success.output.trackingNumber);
  },
  error => {
    switch (error._tag) {
      case "StepFailed":
        console.log(`Rolled back cleanly at step "${error.stepName}"`);
        break;
      case "CompensationFailed":
        console.error(`CRITICAL: Compensation failed at step "${error.stepName}"`);
        break;
      // ... other _tag variants
    }
  }
);
```

Usage with `result.isOk()` / `result.isErr()`:

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

### 4.6 AccumulatedResults

The type system computes accumulated results from the step tuple:

```typescript
type AccumulatedResults<
  TSteps extends readonly StepDefinition<
    string,
    unknown,
    unknown,
    unknown,
    unknown,
    Port<string, unknown>
  >[],
> = {
  [S in TSteps[number] as InferStepName<S>]: InferStepOutput<S>;
};
```

This means:

- After step "ReserveStock" completes, `results.ReserveStock` has type `{ reservationId: string }`
- After step "ChargePayment" completes, `results.ChargePayment` has type `{ transactionId: string }`
- TypeScript enforces that you can only access results from steps that have already completed (steps earlier in the sequence)

### 4.7 Conceptual Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SAGA CONCEPTS                                   │
│                                                                         │
│  SagaDefinition                                                         │
│  ├── name: "OrderSaga"                                                  │
│  ├── input: OrderInput                                                  │
│  ├── steps: [Step1, Step2, Step3, ...]                                  │
│  ├── outputMapper: (AccumulatedResults) => OrderOutput                  │
│  └── options: SagaOptions                                               │
│                                                                         │
│  StepDefinition<TName, TInput, TAccumulated, TOutput, TError, TPort>   │
│  ├── name: "ReserveStock"                                               │
│  ├── port: InventoryPort                                                │
│  ├── invoke: (StepContext) => PortInput                                 │
│  ├── compensate?: (CompensationContext) => PortInput                    │
│  ├── condition?: (StepContext) => boolean                               │
│  └── options?: StepOptions { retry, timeout, metadata }                 │
│                                                                         │
│  StepContext                    CompensationContext                      │
│  ├── input: TInput             ├── ...StepContext                       │
│  ├── results: TAccumulated     ├── stepResult: TStepOutput              │
│  ├── stepIndex: number         ├── error: TError                        │
│  └── executionId: string       ├── failedStepIndex: number              │
│                                └── failedStepName: string               │
│                                                                         │
│  SagaExecutionResult<TOutput, TErrors>                                  │
│  = Result<SagaSuccess<TOutput>, SagaError<TErrors>>                     │
│  ├── Ok  --> SagaSuccess { output: TOutput, executionId }               │
│  └── Err --> SagaError { _tag: "StepFailed" | "CompensationFailed"      │
│              | "Timeout" | "Cancelled" | "ValidationFailed"             │
│              | "PortNotFound" | "PersistenceFailed", ... }              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

_Next: [03 - Step Definitions](./03-step-definitions.md)_
