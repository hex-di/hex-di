# 10 - Integration

_Previous: [09 - Error Handling](./09-error-handling.md)_

---

## 14. HexDI Integration

Sagas are first-class citizens in the HexDI container. They resolve their dependencies through the same `GraphBuilder` composition used by the rest of the application, benefit from scoped lifetimes for per-request isolation, and produce tracing spans through `@hex-di/tracing`.

At the DI boundary, the saga executor is split into two ports to separate domain concerns from operational management:

- **`SagaPort<TName, TInput, TOutput, TError>`** -- resolves to `SagaExecutor<TInput, TOutput, TError>`, exposing only `execute(input)`. This is the domain port that application code uses to trigger sagas.
- **`SagaManagementPort<TName, TOutput, TError>`** -- resolves to `SagaManagementExecutor<TOutput, TError>`, exposing `resume`, `cancel`, `getStatus`, and `listExecutions`. This is the management port for operational control (admin dashboards, recovery workflows, monitoring).

Application code resolves the narrow port it needs. A request handler that starts a saga resolves `SagaPort`. An admin API that cancels or queries saga executions resolves `SagaManagementPort`.

> **Tradeoff: dual-port registration cost.** The dual-port split means each saga requires registering two adapters (domain + management) in the `GraphBuilder`. This is a deliberate trade for interface segregation: domain consumers never see management methods, and management tooling doesn't pull in domain-specific input types. For applications where management features (resume, cancel, list) are not needed, the `SagaManagementPort` adapter can be omitted entirely -- the saga will function normally for forward-only execution via `SagaPort` alone. For applications with many sagas where the registration overhead is unwanted, a `provideSaga(saga)` convenience method on `GraphBuilder` can register both adapters in a single call.

### 14.1 Container Integration

A saga's steps invoke ports, and those ports must be wired to adapters via the container's dependency graph. The graph is assembled by providing infrastructure adapters, domain adapters, and saga adapters through `GraphBuilder.create().provide()`, then passed to `createContainer`.

```typescript
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";

// Infrastructure adapters
import { HttpInventoryAdapter } from "./infra/inventory.js";
import { StripePaymentAdapter } from "./infra/payment.js";
import { FedExShippingAdapter } from "./infra/shipping.js";
import { SmtpNotificationAdapter } from "./infra/notification.js";
import { PostgresPersisterAdapter } from "./infra/persister.js";

// Domain adapters
import { OrderValidationAdapter } from "./domain/validation.js";

// Saga adapter
import { OrderSagaAdapter } from "./saga/order-saga-adapter.js";

const graph = GraphBuilder.create()
  // Infrastructure layer
  .provide(HttpInventoryAdapter)
  .provide(StripePaymentAdapter)
  .provide(FedExShippingAdapter)
  .provide(SmtpNotificationAdapter)
  .provide(PostgresPersisterAdapter)
  // Domain layer
  .provide(OrderValidationAdapter)
  // Saga layer
  .provide(OrderSagaAdapter)
  .build();

const container = createContainer({ graph, name: "OrderService" });

// Resolve and execute the saga via the domain port
const orderSaga = container.resolve(OrderSagaPort);
const result = await orderSaga.execute({
  orderId: "order-123",
  userId: "user-456",
  items: [{ productId: "WIDGET-1", quantity: 2 }],
  paymentMethod: "card",
  shippingAddress: { street: "123 Main St", city: "Springfield", zip: "62701" },
});

// Handle the result with match
result.match(
  success => {
    console.log("Order placed:", success.output.trackingNumber);
  },
  error => {
    console.error(`Saga failed at step "${error.stepName}" [${error._tag}]`);
  }
);

// Management operations use the management port
const orderSagaManagement = container.resolve(OrderSagaManagementPort);
const status = await orderSagaManagement.getStatus("exec-abc-123");
await orderSagaManagement.cancel("exec-abc-123");
```

The saga adapter declares its port dependencies via `requires`, and the graph builder validates at compile time that every required port has a corresponding adapter. If `StripePaymentAdapter` is removed, TypeScript reports a missing dependency error at the `.build()` call site.

> **Default lifetime is scoped.** Saga adapters default to `"scoped"` lifetime because saga executors commonly depend on scoped ports (e.g., request context, auth tokens, tenant IDs). The captive dependency rule would reject a singleton executor that depends on scoped ports, so scoped is the safe default. Override to `"singleton"` explicitly if the executor has no scoped dependencies.

### 14.1.1 Result-Based Resolution with resolveResult

When resolution itself can fail (missing adapter, lifecycle mismatch), `resolveResult` returns a `Result<T, ResolutionError>` instead of throwing. This composes cleanly with saga execution using `safeTry`:

```typescript
import { safeTry, ok } from "@hex-di/result";
import type { ResultAsync } from "@hex-di/result";
import type { ResolutionError } from "@hex-di/result/integration";
import type { SagaSuccess, SagaError } from "@hex-di/saga";

function executeOrder(
  container: Container,
  input: OrderInput
): ResultAsync<SagaSuccess<OrderOutput>, ResolutionError | SagaError<OrderSagaErrors>> {
  return safeTry(async function* () {
    // Resolve the saga executor -- yields ResolutionError on failure
    const orderSaga = yield* container.resolveResult(OrderSagaPort);

    // Execute the saga -- yields SagaError on failure
    const sagaResult = yield* await orderSaga.execute(input);

    return ok(sagaResult);
  });
}

// Usage:
const result = await executeOrder(container, orderInput);

result.match(
  success => {
    console.log("Order placed:", success.output.trackingNumber);
  },
  error => {
    // error: ResolutionError | SagaError<OrderSagaErrors>
    if (error._tag === "MissingAdapter") {
      console.error(`Container misconfigured: no adapter for ${error.portName}`);
    } else if (error._tag === "StepFailed") {
      console.error(`Saga failed at step "${error.stepName}":`, error.cause._tag);
    } else if (error._tag === "CompensationFailed") {
      console.error(`Compensation failed at step "${error.stepName}"`);
    }
  }
);
```

This pattern unifies container resolution errors and saga execution errors into a single `Result`, enabling the caller to handle both failure modes with a single `match` or `switch`.

### 14.1.2 Composing Multiple Resolutions with safeTry

When a request handler needs multiple resolved services alongside saga execution, `safeTry` composes them into a single error channel:

```typescript
import { safeTry, ok } from "@hex-di/result";
import type { ResultAsync } from "@hex-di/result";

function handleCheckout(
  scope: Scope,
  input: CheckoutInput
): ResultAsync<CheckoutResponse, ResolutionError | SagaError<OrderSagaErrors> | AuthError> {
  return safeTry(async function* () {
    // Resolve services -- each yield* short-circuits on ResolutionError
    const authService = yield* scope.resolveResult(AuthServicePort);
    const orderSaga = yield* scope.resolveResult(OrderSagaPort);

    // Validate auth -- short-circuits on AuthError
    const user = yield* await authService.validateToken(input.token);

    // Execute saga -- short-circuits on SagaError
    const sagaResult = yield* await orderSaga.execute({
      orderId: input.orderId,
      userId: user.id,
      items: input.items,
      paymentMethod: input.paymentMethod,
      shippingAddress: input.shippingAddress,
    });

    return ok({
      status: "ok" as const,
      trackingNumber: sagaResult.output.trackingNumber,
      transactionId: sagaResult.output.transactionId,
    });
  });
}
```

### 14.2 Scoped Execution

For server applications, each inbound request should execute within its own scope. Scoped lifetimes ensure that request-specific state (e.g., request IDs, auth context) is isolated and that scoped resources are properly disposed after the request completes.

```typescript
import { createContainer } from "@hex-di/runtime";

const container = createContainer({ graph, name: "OrderService" });

// Per-request handler
async function handleOrderRequest(request: OrderRequest): Promise<OrderResponse> {
  const scope = container.createScope("order-request");
  try {
    const orderSaga = scope.resolve(OrderSagaPort);
    const result = await orderSaga.execute({
      orderId: request.orderId,
      userId: request.userId,
      items: request.items,
      paymentMethod: request.paymentMethod,
      shippingAddress: request.shippingAddress,
    });

    return result.match(
      success => ({ status: "ok", trackingNumber: success.output.trackingNumber }),
      error => ({
        status: "failed",
        errorTag: error._tag,
        stepName: error.stepName,
        compensated: error._tag === "StepFailed",
      })
    );
  } finally {
    await scope.dispose();
  }
}
```

- `container.createScope("order-request")` creates an isolated scope
- Scoped adapters (e.g., request ID, auth context) get fresh instances per scope
- Singleton adapters (e.g., database pools, HTTP clients) are shared across all scopes
- `scope.dispose()` in `finally` releases all scoped resources, preventing leaks

### 14.2.1 Scope Disposal and Saga Cancellation

When a container scope is disposed, any sagas still running within that scope should be gracefully cancelled. The runtime achieves this through the `AbortSignal` pattern documented in [07 - Runtime](./07-runtime.md): each scoped saga execution receives an `AbortSignal` tied to the scope's lifecycle. When `scope.dispose()` is called, the signal is aborted, which triggers cancellation and compensation for any in-progress saga steps.

This ensures that:

- No saga outlives its scope -- compensation completes before scope resources are released
- The saga `execute()` promise encompasses the full lifecycle (forward execution + compensation), so the calling code's `try/finally` block naturally sequences saga completion before scope disposal
- No changes to `@hex-di/runtime`'s synchronous `ScopeLifecycleEmitter` are required -- the cancellation flows through the standard `AbortSignal` mechanism

```typescript
import { createContainer } from "@hex-di/runtime";

const container = createContainer({ graph, name: "OrderService" });

async function handleOrderRequest(request: OrderRequest): Promise<OrderResponse> {
  const scope = container.createScope("order-request");
  try {
    const orderSaga = scope.resolve(OrderSagaPort);

    // The saga execution is automatically linked to this scope's AbortSignal.
    // If scope.dispose() is called while the saga is running (e.g., due to a
    // request timeout or client disconnect), the signal aborts and the saga
    // runtime triggers compensation for any completed steps.
    const result = await orderSaga.execute({
      orderId: request.orderId,
      userId: request.userId,
      items: request.items,
      paymentMethod: request.paymentMethod,
      shippingAddress: request.shippingAddress,
    });

    return result.match(
      success => ({ status: "ok", trackingNumber: success.output.trackingNumber }),
      error => ({
        status: "failed",
        errorTag: error._tag,
        stepName: error.stepName,
        compensated: error._tag === "StepFailed",
      })
    );
  } finally {
    // Disposing the scope aborts the signal, gracefully cancelling any
    // still-running saga and triggering compensation for completed steps.
    await scope.dispose();
  }
}
```

In server frameworks where request lifecycle is managed externally (e.g., Hono, Express), the scope disposal typically happens when the request ends. If the client disconnects mid-saga, the framework disposes the scope, which cancels the saga:

```typescript
// Hono middleware example
app.post("/orders", async c => {
  const scope = container.createScope("order-request");
  // Register cleanup for when the request ends (timeout, disconnect, etc.)
  c.req.raw.signal.addEventListener("abort", () => scope.dispose());

  try {
    const orderSaga = scope.resolve(OrderSagaPort);
    const result = await orderSaga.execute(await c.req.json());

    return result.match(
      success => c.json({ status: "ok", data: success.output }),
      error => c.json({ status: "failed", errorTag: error._tag, step: error.stepName }, 500)
    );
  } finally {
    await scope.dispose();
  }
});
```

### 14.2.2 Result-Based Scoped Resolution

Combining `resolveResult` with scoped execution avoids throwing on resolution failures while preserving scope isolation:

```typescript
import { safeTry, ok } from "@hex-di/result";

app.post("/orders", async c => {
  const scope = container.createScope("order-request");
  c.req.raw.signal.addEventListener("abort", () => scope.dispose());

  try {
    const result = await safeTry(async function* () {
      const orderSaga = yield* scope.resolveResult(OrderSagaPort);
      const sagaResult = yield* await orderSaga.execute(await c.req.json());
      return ok(sagaResult);
    });

    return result.match(
      success => c.json({ status: "ok", data: success.output }),
      error => {
        if (error._tag === "MissingAdapter" || error._tag === "LifetimeMismatch") {
          return c.json({ status: "error", errorTag: error._tag }, 500);
        }
        return c.json(
          {
            status: "failed",
            errorTag: error._tag,
            step: error.stepName,
          },
          422
        );
      }
    );
  } finally {
    await scope.dispose();
  }
});
```

### 14.3 Resolution Flow

When a saga executes, each step resolves its port from the container and invokes the resulting adapter. The runtime orchestrates this sequence, building the typed context as steps complete.

```
saga.execute(input)
|
+-- Step 1: "ReserveStock"
|   +-- Get port -----------------> InventoryPort
|   +-- Resolve adapter from container -> container.resolve(InventoryPort) -> HttpInventoryAdapter
|   +-- Build params -------------> invoke(ctx) -> { action: "reserve", productId, quantity }
|   +-- Execute adapter ----------> adapter.reserve({ ... })
|   +-- Store result -------------> ctx.results.ReserveStock = { reservationId: "res-789" }
|
+-- Step 2: "ChargePayment"
|   +-- Get port -----------------> PaymentPort
|   +-- Resolve adapter from container -> container.resolve(PaymentPort) -> StripePaymentAdapter
|   +-- Build params -------------> invoke(ctx) -> { amount, method, idempotencyKey }
|   |                                (can read ctx.results.ReserveStock.reservationId)
|   +-- Execute adapter ----------> adapter.charge({ ... })
|   +-- Store result -------------> ctx.results.ChargePayment = { transactionId: "txn-456" }
|
+-- Step 3: "ShipOrder"
|   +-- Get port -----------------> ShippingPort
|   +-- Resolve adapter from container -> container.resolve(ShippingPort) -> FedExShippingAdapter
|   +-- Build params -------------> invoke(ctx) -> { reservationId, transactionId, address }
|   |                                (can read ctx.results.ReserveStock and ctx.results.ChargePayment)
|   +-- Execute adapter ----------> adapter.ship({ ... })
|   +-- Store result -------------> ctx.results.ShipOrder = { trackingNumber: "FX-001" }
|
+-- Output mapper -----------------> { orderId, trackingNumber, transactionId }
```

Key properties of the resolution flow:

- Port resolution happens per step, not upfront, so scoped adapters get the correct scope context
- The `ctx.results` map grows after each step, and TypeScript enforces that a step can only access results from earlier steps
- If a step fails, the runtime reverses through completed steps and invokes each compensation handler, resolving the same port from the same container

### 14.4 Tracing Integration

Saga execution integrates with `@hex-di/tracing` to produce structured spans for observability. When tracing is enabled on the container, saga runs automatically emit spans with no additional configuration.

**Span hierarchy:**

```
[Span] saga:OrderSaga (execution_id: "exec-abc-123")
+-- [Span] saga:OrderSaga:step:ValidateOrder
+-- [Span] saga:OrderSaga:step:ReserveStock
+-- [Span] saga:OrderSaga:step:ChargePayment
|   +-- [Span] saga:OrderSaga:step:ChargePayment:retry(1)    (if retried)
+-- [Span] saga:OrderSaga:step:ShipOrder x (error)
+-- [Span] saga:OrderSaga:compensate:ChargePayment
+-- [Span] saga:OrderSaga:compensate:ReserveStock
+-- [Span] saga:OrderSaga:compensate:ValidateOrder (skipped: no compensation defined)
```

**Span attributes:**

| Attribute                      | Example Value                                | Description                                                 |
| ------------------------------ | -------------------------------------------- | ----------------------------------------------------------- |
| `hex-di.saga.name`             | `"OrderSaga"`                                | Saga definition name                                        |
| `hex-di.saga.execution_id`     | `"exec-abc-123"`                             | Unique execution identifier                                 |
| `hex-di.saga.step`             | `"ChargePayment"`                            | Current step name                                           |
| `hex-di.saga.step.index`       | `2`                                          | Step position (0-based)                                     |
| `hex-di.saga.phase`            | `"execute"` or `"compensate"`                | Whether the span covers forward execution or compensation   |
| `hex-di.saga.status`           | `"completed"` or `"failed"` or `"cancelled"` | Final saga outcome                                          |
| `hex-di.saga.error._tag`       | `"StepFailed"`                               | The `_tag` discriminant of the `SagaError` variant          |
| `hex-di.saga.error.cause._tag` | `"PaymentDeclined"`                          | The `_tag` discriminant of the typed cause (when available) |
| `hex-di.saga.error.step_name`  | `"ChargePayment"`                            | The step that triggered the failure                         |
| `hex-di.saga.error.step_index` | `2`                                          | Zero-based index of the failing step                        |

**Rules:**

- One parent span wraps the entire saga execution, from input to final result
- Each forward step gets a child span under the parent
- Each compensation step gets a child span under the parent, with `phase: "compensate"`
- Retries within a step produce nested child spans under that step's span
- Span attributes follow the `hex-di.saga.*` namespace prefix
- On error, `hex-di.saga.error._tag` is always set; `hex-di.saga.error.cause._tag` is set when the cause is a tagged error object
- W3C Trace Context (`traceparent` / `tracestate`) is propagated through the saga context, enabling distributed sagas where individual steps call external services to be correlated in a single distributed trace

**Example with tracing enabled:**

```typescript
import { instrumentContainer } from "@hex-di/tracing";

const container = createContainer({ graph, name: "OrderService" });

// Instrument the container -- saga spans are produced automatically
instrumentContainer(container, {
  tracer: container.resolve(TracerPort),
});

const orderSaga = container.resolve(OrderSagaPort);
const result: Result<
  SagaSuccess<OrderOutput>,
  SagaError<OrderSagaErrors>
> = await orderSaga.execute(orderInput);

// Spans for saga execution, each step, and any compensation are exported
// to the configured SpanExporter (Jaeger, Zipkin, OTLP, etc.)

// On error, tracing attributes include structured error context:
if (result.isErr()) {
  // The parent saga span already has these attributes set by the runtime:
  //   hex-di.saga.error._tag = "StepFailed"
  //   hex-di.saga.error.cause._tag = "PaymentDeclined"  (if cause has _tag)
  //   hex-di.saga.error.step_name = "ChargePayment"
  //   hex-di.saga.error.step_index = 2
  //   hex-di.saga.status = "failed"
  console.error(`Saga failed [${result.error._tag}] at step "${result.error.stepName}"`);
}
```

**Error span recording detail:**

When the saga runtime records an error on a span, it writes structured attributes rather than a serialized message string:

```typescript
// Inside the saga runtime tracing hook (conceptual):
function recordSagaError(span: Span, error: SagaError<unknown>): void {
  span.setStatus("error");
  span.setAttribute("hex-di.saga.error._tag", error._tag);
  span.setAttribute("hex-di.saga.error.step_name", error.stepName);
  span.setAttribute("hex-di.saga.error.step_index", error.stepIndex);

  // Record cause._tag when the cause is a tagged error
  if (error._tag === "StepFailed" || error._tag === "CompensationFailed") {
    const cause = error.cause;
    if (typeof cause === "object" && cause !== null && "_tag" in cause) {
      span.setAttribute("hex-di.saga.error.cause._tag", (cause as { readonly _tag: string })._tag);
    }
  }
}
```

### 14.5 Testing with Different Graphs

The same saga definition and saga adapter work with different dependency graphs. In production, the graph wires real infrastructure adapters. In tests, the graph wires mocks or in-memory implementations. The saga code does not change.

**Production graph:**

```typescript
const productionGraph = GraphBuilder.create()
  .provide(HttpInventoryAdapter) // Real HTTP calls to inventory service
  .provide(StripePaymentAdapter) // Real Stripe API
  .provide(FedExShippingAdapter) // Real FedEx API
  .provide(SmtpNotificationAdapter) // Real SMTP server
  .provide(PostgresPersisterAdapter) // Real Postgres for saga state
  .provide(OrderSagaAdapter)
  .build();

const container = createContainer({ graph: productionGraph, name: "Production" });
```

**Test graph:**

```typescript
const testGraph = GraphBuilder.create()
  .provide(InMemoryInventoryAdapter) // In-memory stub
  .provide(FakePaymentAdapter) // Always succeeds, records calls
  .provide(FakeShippingAdapter) // Returns fixed tracking number
  .provide(NoOpNotificationAdapter) // Discards notifications
  .provide(InMemorySagaPersisterAdapter) // In-memory saga state
  .provide(OrderSagaAdapter) // Same saga adapter as production
  .build();

const container = createContainer({ graph: testGraph, name: "Test" });
const saga = container.resolve(OrderSagaPort);
const result: Result<SagaSuccess<OrderOutput>, SagaError<OrderSagaErrors>> = await saga.execute(
  testInput
);

// Assert saga outcome using Result methods
expect(result.isOk()).toBe(true);

result.match(
  success => {
    expect(success.output.trackingNumber).toBe("TEST-TRACK-001");
  },
  error => {
    throw new Error(`Expected success but got ${error._tag} at step "${error.stepName}"`);
  }
);
```

The saga adapter is identical in both graphs. Only the infrastructure adapters differ. This is the core benefit of the hexagonal architecture pattern applied to workflow orchestration.

---

## 15. Flow Integration

> **Canonical source:** For complete integration patterns, code examples, and wiring guides, see [Integration: Flow + Saga](../integration/flow-saga.md). This section provides a summary and the shared contract types.

HexDI Saga and HexDI Flow address different concerns and operate at different levels of the application. They are complementary, not competing.

| Concern            | Flow                                      | Saga                                               |
| ------------------ | ----------------------------------------- | -------------------------------------------------- |
| Primary Use        | UI state machines                         | Multi-service transactions                         |
| Scope              | Single entity lifecycle                   | Cross-service workflows                            |
| Duration           | Session lifetime                          | Minutes to days                                    |
| State Model        | Finite states with typed transitions      | Step sequence with accumulated context             |
| Persistence        | Optional                                  | Essential for long-running                         |
| Compensation       | State rollback (return to previous state) | Business compensation (execute reverse operations) |
| Side Effects       | Effects as data descriptors               | Port invocations via container                     |
| Cancellation       | AbortSignal on activities                 | Compensation chain on failure                      |
| Container Lifetime | Scoped (per component/session)            | Scoped (per request/workflow)                      |

### 15.0 Shared Integration Contract Types

The following types define the contract between Flow machines and Saga executions. They enable Flow machines to observe saga progress for UI feedback and to invoke sagas through a typed port interface.

```typescript
/** Events emitted by a saga execution for UI feedback */
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

> **Note on `SagaPort`:** The canonical `SagaPort<TName, TInput, TOutput, TError>` is a branded port token created via `sagaPort<TInput, TOutput, TError>()({ name })` and defined in [05 - Ports & Adapters §7.1](./05-ports-and-adapters.md#71-type-definition). It resolves to a `SagaExecutor<TInput, TOutput, TError>` with an `execute(input: TInput): ResultAsync<SagaSuccess<TOutput>, SagaError<TError>>` method. The 3-parameter form shown in the Flow spec's `Effect.invoke(SagaPort, ...)` refers to this port token -- the type parameters visible to Flow are `TInput`, `TOutput`, and `TError` (the `TName` parameter is carried by the port token itself).

These types are defined in `@hex-di/saga` and consumed by `@hex-di/flow` adapters that bridge state machines with saga executions. `SagaProgressEvent` and `SagaCompensationEvent` are designed to be routed through the Flow activity `EventSink`, enabling machines to transition based on saga step progress (e.g., updating a progress bar or displaying compensation status to the user).

#### Error Mapping Through Flow's Effect Executor

When a Flow machine invokes a saga via `Effect.invoke(SagaPort, "execute", input)`, the saga's result is mapped through the Flow effect executor:

- **`Ok(SagaSuccess<TOutput>)`** → Flow receives a `done.invoke.{portName}` event with `SagaSuccess<TOutput>` as the payload. The machine transitions via `onDone` and can access `event.payload.output` for the saga output.

- **`Err(SagaError<TError>)`** → Flow receives an `error.invoke.{portName}` event with `EffectExecutionError { _tag: "InvokeError", portName, method: "execute", cause: SagaError<TError> }` as the payload.

Discriminating the error in a Flow machine's error handler:

```typescript
// In the machine's state config:
checkingOut: {
  on: {
    "done.invoke.OrderSaga": {
      target: "completed",
      // event.payload is SagaSuccess<OrderOutput>
      actions: (ctx, event) => ({
        ...ctx,
        trackingNumber: event.payload.output.trackingNumber,
      }),
    },
    "error.invoke.OrderSaga": {
      target: "failed",
      // event.payload is EffectExecutionError
      actions: (ctx, event) => {
        const sagaError = event.payload.cause; // SagaError<OrderErrors>
        switch (sagaError._tag) {
          case "StepFailed":
            return { ...ctx, errorMessage: `Step "${sagaError.stepName}" failed`, rolledBack: true };
          case "CompensationFailed":
            return { ...ctx, errorMessage: `Compensation failed at "${sagaError.stepName}"`, rolledBack: false };
          case "Timeout":
            return { ...ctx, errorMessage: `Saga timed out after ${sagaError.timeoutMs}ms` };
          default:
            return { ...ctx, errorMessage: `Saga error: ${sagaError._tag}` };
        }
      },
    },
  },
},
```

### 15.1 Flow Triggering Saga

A Flow state machine can trigger a saga as a side effect when entering a particular state or handling an event. The state machine manages the entity lifecycle (the order), while the saga manages the cross-service transaction (checkout).

```typescript
import { defineMachine, state, event, Effect } from "@hex-di/flow";

// States
const idle = state<"idle">("idle");
const cart = state<"cart", { items: Item[] }>("cart");
const checkingOut = state<"checkingOut", { sagaExecutionId: string }>("checkingOut");
const completed = state<"completed", { trackingNumber: string }>("completed");
const failed = state<"failed", { error: string }>("failed");

// Events
const addItem = event<"ADD_ITEM", { item: Item }>("ADD_ITEM");
const checkout = event<"CHECKOUT", { paymentMethod: string }>("CHECKOUT");
const sagaCompleted = event<"SAGA_COMPLETED", { trackingNumber: string }>("SAGA_COMPLETED");
const sagaFailed = event<"SAGA_FAILED", { error: string }>("SAGA_FAILED");

const OrderMachine = defineMachine({
  id: "order",
  initial: "idle",
  states: {
    idle: {
      on: { ADD_ITEM: { target: "cart" } },
    },
    cart: {
      on: {
        ADD_ITEM: { target: "cart" },
        CHECKOUT: {
          target: "checkingOut",
          // Trigger the saga via an InvokeEffect on the OrderSagaPort
          effects: (ctx, e) =>
            Effect.invoke(OrderSagaPort, "execute", {
              orderId: ctx.orderId,
              items: ctx.items,
              paymentMethod: e.payload.paymentMethod,
            }),
        },
      },
    },
    checkingOut: {
      on: {
        SAGA_COMPLETED: { target: "completed" },
        SAGA_FAILED: { target: "failed" },
      },
    },
    completed: { on: {} },
    failed: { on: {} },
  },
});
```

- The Flow state machine owns the order entity's lifecycle states
- The `CHECKOUT` event triggers an `Effect.invoke` on `OrderSagaPort`, delegating the multi-service transaction to the saga
- The saga runs asynchronously; its result is fed back to the machine as `SAGA_COMPLETED` or `SAGA_FAILED` events
- The machine remains in `checkingOut` until the saga completes, providing a clear loading state for the UI

### 15.2 Saga Step Using Flow

A saga step can invoke a Flow-backed port when a step requires a stateful sub-process, such as a human approval workflow. The saga step invokes the port, and the adapter behind that port runs a Flow state machine.

```typescript
import { defineStep } from "@hex-di/saga";

// ApprovalFlowPort is a port whose adapter runs an approval state machine
// The port's service interface: { start(input): Promise<ApprovalResult> }
const ApprovalStep = defineStep("ManagerApproval")
  .io<{ orderId: string; amount: number }, { approved: boolean; approverName: string }>()
  .invoke(ApprovalFlowPort, ctx => ({
    orderId: ctx.input.orderId,
    amount: ctx.results.ChargePayment.transactionAmount,
    requestedBy: ctx.input.userId,
  }))
  .compensate(ctx => ({
    action: "cancel",
    approvalId: ctx.stepResult.approvalId,
  }))
  .timeout(86400000) // 24-hour timeout for human approval
  .build();

const HighValueOrderSaga = defineSaga("HighValueOrder")
  .input<HighValueOrderInput>()
  .step(ValidateOrderStep)
  .step(ReserveStockStep)
  .step(ChargePaymentStep)
  .step(ApprovalStep) // This step runs a Flow state machine internally
  .step(ShipOrderStep)
  .step(NotifyUserStep)
  .output(results => ({
    orderId: results.ValidateOrder.orderId,
    approved: results.ManagerApproval.approved,
    trackingNumber: results.ShipOrder.trackingNumber,
  }))
  .options({ persistent: true }) // Persist because approval may take hours
  .build();
```

- The saga sees `ApprovalFlowPort` as an ordinary port -- it does not know or care that the adapter runs a state machine
- The adapter behind `ApprovalFlowPort` creates a `MachineRunner` for the approval state machine, waits for a human to approve or reject, and returns the result
- The saga's 24-hour timeout handles the case where no human responds in time
- If a later step fails, the saga compensates by cancelling the approval

---

_Next: [11 - React Integration](./11-react-integration.md)_
