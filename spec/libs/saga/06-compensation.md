# 06 - Compensation

_Previous: [05 - Ports & Adapters](./05-ports-and-adapters.md)_

---

## 9. Compensation Architecture

### 9.1 Compensation Flow

When a step fails, the saga runtime triggers compensation for all previously completed steps **in reverse order**. Only steps that ran successfully and produced a result are compensated. The failing step itself is not compensated because it never completed.

```
Execute:  Step1 ──> Step2 ──> Step3 ──> Step4 x (fails)
                                           |
                                           v
Compensate: Comp1 <── Comp2 <── Comp3 <────┘
```

- Step4 fails with an error
- Step3, Step2, and Step1 are compensated in that order (reverse execution order)
- Each compensation receives the `CompensationContext` with the original step's output and the triggering error
- Steps that define no compensation handler are silently skipped during the compensation phase

### 9.2 Compensation Strategies

The saga definition accepts a `compensationStrategy` option that controls how compensations are executed:

```typescript
const OrderSaga = defineSaga("OrderSaga")
  .input<OrderInput>()
  .step(ValidateOrderStep)
  .step(ReserveStockStep)
  .step(ChargePaymentStep)
  .options({ compensationStrategy: "sequential" })
  .build();
```

| Strategy               | Execution                                                  | On Failure                                                 | Use When                                    |
| ---------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------- |
| `sequential` (default) | Compensate one at a time in reverse order                  | Stop on first compensation failure                         | Order matters between compensations         |
| `parallel`             | Compensate all at once, await all                          | Collect all errors into a single `CompensationFailedError` | Compensations are independent of each other |
| `best-effort`          | Compensate all in reverse order, continue despite failures | Log failures, report partial compensation                  | Partial rollback is acceptable              |

#### Mapping to Result Combinators

Each compensation strategy maps directly to a `Result` combinator, making the compensation phase composable within the `Result` pipeline:

| Strategy      | Result Combinator        | Rationale                                                                                            |
| ------------- | ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `sequential`  | `andThen` chain          | Each compensation feeds into the next; the chain short-circuits on the first `Err`                   |
| `parallel`    | `ResultAsync.allSettled` | All compensations run concurrently; errors are collected rather than short-circuited                 |
| `best-effort` | `andTee`                 | Side-effectful compensation that does not alter the result; failures are logged but do not propagate |

### 9.3 CompensationContext

The `CompensationContext` provides everything a compensation handler needs to undo a completed step:

```typescript
interface CompensationContext<TInput, TAccumulated, TStepOutput, TError> extends StepContext<
  TInput,
  TAccumulated
> {
  /** The successful output of this step that needs to be undone */
  readonly stepResult: TStepOutput;
  /** The typed error that triggered the compensation chain */
  readonly error: TError;
  /** Index (0-based) of the step whose failure triggered compensation */
  readonly failedStepIndex: number;
  /** Name of the step whose failure triggered compensation */
  readonly failedStepName: string;
}
```

- **stepResult** -- the output this step produced during its successful execution; use it to determine what to undo (e.g., a reservation ID to release)
- **error** -- the typed error from the failing step; useful for logging or conditional compensation logic. The type is `TError`, which is the accumulated error union of the saga's steps
- **failedStepIndex** -- the position of the step that failed; can be used to gauge how far execution progressed
- **failedStepName** -- human-readable name of the failing step; useful in logs and error messages

### 9.4 Compensation Examples

#### Basic Compensation

The most common pattern: a step's compensation directly reverses the step's action using the step result.

```typescript
const ReserveStockStep = defineStep("ReserveStock")
  .io<{ productId: string; quantity: number }, { reservationId: string }>()
  .invoke(InventoryPort, ctx => ({
    action: "reserve" as const,
    productId: ctx.input.productId,
    quantity: ctx.input.quantity,
  }))
  .compensate(ctx => ({
    action: "release" as const,
    reservationId: ctx.stepResult.reservationId,
  }))
  .build();
```

- The `compensate` handler receives `ctx.stepResult.reservationId` -- the output from the successful `invoke` call
- It calls the same port with a `"release"` action to undo the reservation

#### Conditional Compensation

When a step's compensation logic depends on the state of the step result:

```typescript
const ChargePaymentStep = defineStep("ChargePayment")
  .io<
    { amount: number; currency: string },
    { transactionId: string; status: "authorized" | "captured" }
  >()
  .invoke(PaymentPort, ctx => ({
    action: "charge" as const,
    amount: ctx.input.amount,
    currency: ctx.input.currency,
  }))
  .compensate(ctx => {
    if (ctx.stepResult.status === "captured") {
      return {
        action: "refund" as const,
        transactionId: ctx.stepResult.transactionId,
      };
    }
    return {
      action: "void" as const,
      transactionId: ctx.stepResult.transactionId,
    };
  })
  .build();
```

- If the payment was fully captured, issue a refund
- If the payment was only authorized, void the authorization
- The `stepResult.status` field drives the branching logic

#### No-Op Compensation

Steps that do not modify external state can skip compensation entirely using `skipCompensation`:

```typescript
const ValidateOrderStep = defineStep("ValidateOrder")
  .io<{ orderId: string }, { orderId: string; isValid: boolean }>()
  .invoke(ValidationPort, ctx => ({
    orderId: ctx.input.orderId,
  }))
  .skipCompensation()
  .build();
```

- Validation is a read-only operation -- there is nothing to undo
- `skipCompensation()` signals to the runtime that this step should be skipped during compensation
- This is clearer than providing a no-op compensation handler and allows the runtime to optimize the compensation phase

### 9.5 Compensation Failure Handling

When a compensation handler itself fails, the runtime produces a `CompensationFailedError` -- a variant of `SagaError<TCause>` with `_tag: "CompensationFailed"` (see [09 - Error Handling](./09-error-handling.md) for the full `SagaError` definition):

```typescript
interface CompensationFailedError<TCause = unknown> extends SagaErrorBase {
  readonly _tag: "CompensationFailed";
  /** The original typed error that triggered the compensation chain */
  readonly cause: TCause;
  /** The error thrown by the compensation handler */
  readonly compensationCause: unknown;
  /** Steps that were successfully compensated before this failure */
  readonly compensatedSteps: readonly string[];
  /** Steps whose compensation failed (includes the failing step) */
  readonly failedCompensationSteps: readonly string[];
}
```

Handling partial compensation failure:

```typescript
const result = await sagaRuntime.execute(OrderSaga, orderInput);

result.match(
  success => {
    console.log("Order placed:", success.output.orderId);
  },
  error => {
    if (error._tag === "CompensationFailed") {
      // Partial compensation -- some steps could not be rolled back
      console.error(`Saga failed at step: ${error.stepName}`);
      console.error(`Compensated steps: ${error.compensatedSteps.join(", ")}`);
      console.error(`Failed compensation steps: ${error.failedCompensationSteps.join(", ")}`);

      // Alert operations team for manual intervention
      await alertOps({
        sagaName: "OrderSaga",
        executionId: error.executionId,
        failedCompensations: error.failedCompensationSteps,
      });
    } else if (error._tag === "StepFailed") {
      // Full compensation succeeded -- all steps were rolled back
      console.error(`Saga failed but fully compensated at step "${error.stepName}"`);
    }
  }
);
```

- When `error._tag` is `"CompensationFailed"`, the system is in an inconsistent state requiring manual intervention
- `compensatedSteps` lists what was successfully undone
- `failedCompensationSteps` lists what remains in a potentially inconsistent state

### 9.6 Idempotent Compensation

Compensations may be retried (e.g., after a crash and resume). Compensation handlers must be designed to be **idempotent** -- running them multiple times must produce the same result as running them once.

Best practices:

```typescript
const ReserveStockStep = defineStep("ReserveStock")
  .io<{ productId: string; quantity: number }, { reservationId: string }>()
  .invoke(InventoryPort, ctx => ({
    action: "reserve" as const,
    productId: ctx.input.productId,
    quantity: ctx.input.quantity,
    idempotencyKey: ctx.executionId,
  }))
  .compensate(ctx => ({
    action: "release" as const,
    reservationId: ctx.stepResult.reservationId,
    idempotencyKey: `${ctx.executionId}-compensate`,
  }))
  .build();
```

- **Use execution ID as idempotency key** -- the `executionId` is unique per saga execution and stable across retries; append `-compensate` to distinguish from the forward call
- **Handle "already compensated" gracefully** -- the port adapter should treat a duplicate compensation as a no-op rather than an error (e.g., releasing a reservation that was already released returns success)
- **Design compensations to be safe to retry** -- never assume that compensation runs exactly once; crashes, timeouts, or network failures can cause re-execution

### 9.7 Compensation Design Guidelines

| Do                                                             | Don't                                               |
| -------------------------------------------------------------- | --------------------------------------------------- |
| Use idempotency keys derived from `executionId`                | Assume compensation runs only once                  |
| Handle "not found" gracefully (e.g., resource already deleted) | Throw on missing resources during compensation      |
| Log compensation actions and their results                     | Silently swallow errors                             |
| Keep compensations simple and focused on reversal              | Add complex business logic in compensation handlers |
| Test compensation paths with the same rigor as forward paths   | Only test happy paths                               |
| Use `skipCompensation()` for read-only steps                   | Provide empty no-op compensation handlers           |
| Consider compensation ordering dependencies                    | Assume compensations are always independent         |

---

_Next: [07 - Runtime](./07-runtime.md)_
