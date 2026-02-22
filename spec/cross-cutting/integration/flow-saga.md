# Integration: Flow + Saga

[<- store-query.md](./store-query.md) | [README](./README.md) | [store-flow.md ->](./store-flow.md)

---

## 1. Overview

Flow manages finite state machines for entity lifecycles; Saga orchestrates multi-step distributed transactions. Neither library imports the other -- integration happens through port composition in `GraphBuilder`.

| Concern      | Flow                                      | Saga                                               |
| ------------ | ----------------------------------------- | -------------------------------------------------- |
| Primary Use  | UI state machines                         | Multi-service transactions                         |
| Scope        | Single entity lifecycle                   | Cross-service workflows                            |
| Duration     | Session lifetime                          | Minutes to days                                    |
| State Model  | Finite states with typed transitions      | Step sequence with accumulated context             |
| Compensation | State rollback (return to previous state) | Business compensation (execute reverse operations) |
| Side Effects | Effects as data descriptors               | Port invocations via container                     |

Three integration patterns:

1. **Flow triggers Saga** -- machine delegates a transaction to a saga via `Effect.invoke`
2. **Saga step uses Flow** -- a saga step invokes a Flow-backed port for a stateful sub-process
3. **Saga progress feedback** -- progress events routed through a Flow activity for UI updates

---

## 2. Integration Architecture

```
+-----------------------+          +-----------------------+
|      @hex-di/flow     |          |      @hex-di/saga     |
|  Effect.invoke()      |          |  defineStep().invoke() |
+-----------+-----------+          +-----------+-----------+
            |    No direct imports             |
            +----------+     +-----------------+
                       v     v
              +--------------------+
              |   GraphBuilder     |
              |   .provide(...)    |
              +--------+-----------+
                       v
              +--------------------+
              |  createContainer() |
              +--------------------+
```

Flow machines invoke saga ports through `Effect.invoke(SagaPort, "execute", input)`. The `DIEffectExecutor` resolves the port from the container scope. Saga steps invoke Flow-backed ports through `defineStep(...).invoke(FlowPort, mapper)`.

---

## 3. Shared Types

Defined in `@hex-di/saga`, consumed by Flow adapters:

```typescript
type SagaProgressEvent =
  | { readonly _tag: "StepStarted"; readonly stepName: string; readonly stepIndex: number }
  | {
      readonly _tag: "StepCompleted";
      readonly stepName: string;
      readonly stepIndex: number;
      readonly totalSteps: number;
    }
  | { readonly _tag: "CompensationStarted"; readonly stepName: string }
  | { readonly _tag: "CompensationCompleted"; readonly stepName: string };

type SagaCompensationEvent =
  | {
      readonly _tag: "CompensationTriggered";
      readonly failedStepName: string;
      readonly stepsToCompensate: number;
    }
  | { readonly _tag: "CompensationStepFailed"; readonly stepName: string; readonly cause: unknown };
```

These types are routed through Flow's activity `EventSink`, enabling machines to update UI state (progress bars, compensation status) in response to saga lifecycle events.

---

## 4. Integration Patterns

### Pattern 1: Flow Triggers Saga

A machine triggers a saga via `Effect.invoke(SagaPort, "execute", input)`. The `DIEffectExecutor` maps results:

- **`Ok(SagaSuccess<TOutput>)`** -- `done.invoke.{portName}` event with `SagaSuccess<TOutput>` payload
- **`Err(SagaError<TError>)`** -- `error.invoke.{portName}` event with `EffectExecutionError { _tag: "InvokeError", portName, method: "execute", cause: SagaError<TError> }`

```typescript
import { defineMachine, Effect } from "@hex-di/flow";
import { sagaPort } from "@hex-di/saga";

const OrderSagaPort = sagaPort<OrderInput, OrderOutput, OrderErrors>()({
  name: "OrderSaga",
});

const CheckoutMachine = defineMachine({
  id: "checkout",
  initial: "cart",
  context: { orderId: "", items: [], trackingNumber: null, errorMessage: null, rolledBack: false },
  states: {
    cart: {
      on: {
        CHECKOUT: {
          target: "processing",
          effects: (ctx, event) =>
            Effect.invoke(OrderSagaPort, "execute", {
              orderId: ctx.orderId,
              items: ctx.items,
              paymentMethod: event.payload.paymentMethod,
            }),
        },
      },
    },
    processing: {
      on: {
        "done.invoke.OrderSaga": {
          target: "completed",
          actions: (ctx, event) => ({
            ...ctx,
            trackingNumber: event.payload.output.trackingNumber,
          }),
        },
        "error.invoke.OrderSaga": {
          target: "failed",
          actions: (ctx, event) => {
            const sagaError = event.payload.cause;
            switch (sagaError._tag) {
              case "StepFailed":
                return {
                  ...ctx,
                  errorMessage: `Step "${sagaError.stepName}" failed`,
                  rolledBack: true,
                };
              case "CompensationFailed":
                return {
                  ...ctx,
                  errorMessage: `Compensation failed at "${sagaError.stepName}"`,
                  rolledBack: false,
                };
              case "Timeout":
                return {
                  ...ctx,
                  errorMessage: `Saga timed out after ${sagaError.timeoutMs}ms`,
                  rolledBack: false,
                };
              default:
                return { ...ctx, errorMessage: `Saga error: ${sagaError._tag}` };
            }
          },
        },
      },
    },
    completed: { type: "final" },
    failed: { on: { RETRY: { target: "cart" } } },
  },
});
```

The machine remains in `processing` until the saga completes. The error handler discriminates on `sagaError._tag` to distinguish recoverable failures (with compensation) from unrecoverable ones.

### Pattern 2: Saga Step Uses Flow

A saga step invokes a Flow-backed port for a stateful sub-process such as human approval. The saga sees it as an ordinary port.

```typescript
import { defineStep, defineSaga } from "@hex-di/saga";

const ApprovalStep = defineStep("ManagerApproval")
  .io<
    { orderId: string; amount: number; requestedBy: string },
    { approved: boolean; approverName: string; approvalId: string }
  >()
  .invoke(ApprovalFlowPort, ctx => ({
    orderId: ctx.input.orderId,
    amount: ctx.results.ChargePayment.transactionAmount,
    requestedBy: ctx.input.userId,
  }))
  .compensate(ctx => ({
    action: "cancel" as const,
    approvalId: ctx.stepResult.approvalId,
  }))
  .timeout(86400000) // 24-hour timeout for human approval
  .build();

const HighValueOrderSaga = defineSaga("HighValueOrder")
  .input<HighValueOrderInput>()
  .step(ValidateOrderStep)
  .step(ReserveStockStep)
  .step(ChargePaymentStep)
  .step(ApprovalStep)
  .step(ShipOrderStep)
  .output(results => ({
    orderId: results.ValidateOrder.orderId,
    approved: results.ManagerApproval.approved,
    trackingNumber: results.ShipOrder.trackingNumber,
  }))
  .options({ persistent: true })
  .build();
```

The adapter behind `ApprovalFlowPort` runs a state machine internally. The 24-hour timeout handles unresponsive approvers. Compensation cancels the approval if a later step fails.

### Pattern 3: Saga Progress Feedback

Progress events are routed through a Flow activity `EventSink` for real-time UI feedback.

```typescript
import { activity, createActivityPort, defineEvents, Effect } from "@hex-di/flow";

const SagaProgressEvents = defineEvents({
  SAGA_STEP_COMPLETED: (stepName: string, stepIndex: number, totalSteps: number) => ({
    stepName,
    stepIndex,
    totalSteps,
  }),
  SAGA_COMPENSATION_TRIGGERED: (failedStepName: string, stepsToCompensate: number) => ({
    failedStepName,
    stepsToCompensate,
  }),
  SAGA_DONE: (output: unknown) => ({ output }),
  SAGA_FAILED: (error: unknown) => ({ error }),
});

const SagaProgressActivityPort = createActivityPort<{ input: OrderInput }, void>()(
  "SagaProgressActivity"
);

const SagaProgressActivity = activity(SagaProgressActivityPort, {
  requires: [OrderSagaPort],
  emits: SagaProgressEvents,
  execute: async (input, { deps, sink }) => {
    const result = await deps.OrderSaga.execute(input.input);
    result.match(
      success => sink.emit("SAGA_DONE", success.output),
      error => sink.emit("SAGA_FAILED", error)
    );
  },
});

const ProgressMachine = defineMachine({
  id: "orderProgress",
  initial: "idle",
  context: { currentStep: "", completedSteps: 0, totalSteps: 0, isCompensating: false },
  states: {
    idle: {
      on: {
        START: {
          target: "processing",
          effects: (_ctx, event) =>
            Effect.spawn(SagaProgressActivityPort, { input: event.payload.input }),
        },
      },
    },
    processing: {
      on: {
        SAGA_STEP_COMPLETED: {
          target: "processing",
          actions: (ctx, event) => ({
            ...ctx,
            completedSteps: event.payload.stepIndex + 1,
            totalSteps: event.payload.totalSteps,
          }),
        },
        SAGA_COMPENSATION_TRIGGERED: {
          target: "compensating",
          actions: ctx => ({ ...ctx, isCompensating: true }),
        },
        SAGA_DONE: { target: "completed" },
        SAGA_FAILED: { target: "failed" },
      },
    },
    compensating: {
      on: { SAGA_FAILED: { target: "failed" } },
    },
    completed: { type: "final" },
    failed: { on: { RETRY: { target: "idle" } } },
  },
});
```

The machine context tracks `completedSteps` and `totalSteps` for a progress indicator. When compensation begins, the machine transitions to `compensating` for visual feedback.

---

## 5. GraphBuilder Composition

```typescript
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { createFlowAdapter } from "@hex-di/flow";
import { createSagaAdapter } from "@hex-di/saga";

const OrderSagaAdapter = createSagaAdapter(OrderSagaPort, { saga: OrderSaga });

const CheckoutFlowAdapter = createFlowAdapter({
  provides: CheckoutFlowPort,
  requires: [OrderSagaPort],
  machine: CheckoutMachine,
  activities: [SagaProgressActivity],
  lifetime: "scoped",
});

const graph = GraphBuilder.create()
  .provide(HttpInventoryAdapter)
  .provide(StripePaymentAdapter)
  .provide(FedExShippingAdapter)
  .provide(SmtpNotificationAdapter)
  .provide(OrderSagaAdapter)
  .provide(CheckoutFlowAdapter)
  .build();

const container = createContainer({ graph, name: "CheckoutService" });
const scope = container.createScope("checkout-session");
const checkoutFlow = scope.resolve(CheckoutFlowPort);

await checkoutFlow.sendAndExecute({ type: "CHECKOUT", payload: { paymentMethod: "card" } });
```

The `GraphBuilder` validates at compile time that `CheckoutFlowAdapter`'s `requires: [OrderSagaPort]` is satisfied, that saga step dependencies are present, and that no captive dependency violations exist.

---

## 6. Error Handling

### EffectExecutionError Wrapping

When a Flow machine invokes a saga via `Effect.invoke`, saga errors are wrapped:

```typescript
interface EffectExecutionError {
  readonly _tag: "InvokeError";
  readonly portName: string;
  readonly method: string;
  readonly cause: unknown; // SagaError<TError>
}
```

### Composing with safeTry

```typescript
import { safeTry, ok } from "@hex-di/result";
import type { ResultAsync } from "@hex-di/result";

type CheckoutError = ResolutionError | SagaError<OrderErrors> | TransitionError;

function startCheckout(
  scope: Scope,
  input: CheckoutInput
): ResultAsync<SagaSuccess<OrderOutput>, CheckoutError> {
  return safeTry(async function* () {
    const checkoutFlow = yield* scope.resolveResult(CheckoutFlowPort);
    yield* await checkoutFlow.sendAndExecute({
      type: "CHECKOUT",
      payload: { paymentMethod: input.paymentMethod },
    });
    const orderSaga = yield* scope.resolveResult(OrderSagaPort);
    const sagaResult = yield* await orderSaga.execute({
      orderId: input.orderId,
      items: input.items,
      paymentMethod: input.paymentMethod,
    });
    return ok(sagaResult);
  });
}

const result = await startCheckout(scope, checkoutInput);
result.match(
  success => console.log("Order placed:", success.output.trackingNumber),
  error => {
    switch (error._tag) {
      case "MissingAdapter":
      case "LifetimeMismatch":
        console.error("Container misconfiguration:", error._tag);
        break;
      case "StepFailed":
        console.error(`Saga step "${error.stepName}" failed`);
        break;
      case "CompensationFailed":
        console.error(`Compensation failed at "${error.stepName}"`);
        break;
      case "InvalidTransition":
        console.error("Machine rejected the event");
        break;
    }
  }
);
```

Each `yield*` short-circuits on `Err`, composing `ResolutionError | SagaError | TransitionError` into a single discriminated union.

---

## 7. Testing

### Mock Saga Adapter for Flow Tests

```typescript
import { createAdapter } from "@hex-di/core";
import { ok, err, ResultAsync } from "@hex-di/result";

const MockOrderSagaAdapter = createAdapter(OrderSagaPort, {
  factory: () => ({
    execute: (input: OrderInput) =>
      ResultAsync.fromResult(
        ok({
          output: { trackingNumber: "TEST-TRACK-001", transactionId: "TEST-TXN-001" },
          executionId: "test-exec-001",
        })
      ),
  }),
  lifetime: "scoped",
});

const testGraph = GraphBuilder.create()
  .provide(MockOrderSagaAdapter)
  .provide(CheckoutFlowAdapter)
  .build();

const container = createContainer({ graph: testGraph, name: "Test" });
const checkoutFlow = container.createScope("test").resolve(CheckoutFlowPort);

await checkoutFlow.sendAndExecute({ type: "CHECKOUT", payload: { paymentMethod: "card" } });
expect(checkoutFlow.state()).toBe("completed");
expect(checkoutFlow.context().trackingNumber).toBe("TEST-TRACK-001");
```

### Mock Flow Adapter for Saga Tests

```typescript
const MockApprovalFlowAdapter = createAdapter(ApprovalFlowPort, {
  factory: () => ({
    start: (input: ApprovalInput) =>
      ResultAsync.fromResult(
        ok({
          approved: true,
          approverName: "Test Approver",
          approvalId: "approval-test-001",
        })
      ),
  }),
  lifetime: "scoped",
});

const sagaTestGraph = GraphBuilder.create()
  .provide(InMemoryInventoryAdapter)
  .provide(FakePaymentAdapter)
  .provide(MockApprovalFlowAdapter)
  .provide(FakeShippingAdapter)
  .provide(HighValueOrderSagaAdapter)
  .build();

const saga = createContainer({ graph: sagaTestGraph, name: "SagaTest" }).resolve(
  HighValueOrderSagaPort
);
const result = await saga.execute(testInput);
expect(result.isOk()).toBe(true);
```

---

## 8. Anti-Patterns

### 1. Tight Coupling via Direct Imports

**Wrong:** Importing saga internals directly into Flow machine code.

```typescript
// BAD: bypasses port boundary
import { SagaRunner } from "@hex-di/saga";
const runner = new SagaRunner(OrderSaga, container);
```

**Right:** `Effect.invoke(SagaPort, "execute", input)` -- the machine never knows it is talking to a saga.

### 2. Blocking Saga Step on Long-Running Machine

**Wrong:** No timeout on a human approval step -- saga blocks forever.

```typescript
// BAD: missing .timeout()
const ApprovalStep = defineStep("ManagerApproval")
  .invoke(ApprovalFlowPort, ctx => ({ ... }))
  .build();
```

**Right:** Always set a timeout: `.timeout(86400000)`.

### 3. Ignoring Compensation Events in UI

**Wrong:** Only handling `done.invoke.OrderSaga`, leaving the user on a spinner during compensation.

**Right:** Handle `error.invoke.OrderSaga` and route `SagaProgressEvent` through an activity for compensation visibility.

---

[<- store-query.md](./store-query.md) | [README](./README.md) | [store-flow.md ->](./store-flow.md)
