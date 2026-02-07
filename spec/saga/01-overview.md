# 01 - Overview & Philosophy

## 1. Overview

HexDI Saga is a process orchestration library for managing complex, long-running workflows with automatic compensation (rollback) on failure. It brings the Saga pattern into the hex-di ecosystem, treating workflow steps as port invocations with full dependency injection support. Saga execution results are expressed as `Result<T, E>` values from `@hex-di/result` -- errors are typed, composable, and handled exhaustively at compile time.

- Each workflow step invokes a port, not an arbitrary function
- Every action defines its own compensation (undo) operation
- Full type safety through the entire workflow context
- Typed error accumulation -- step error types are visible at compile time and accumulate across the saga
- Dependencies are resolved through the HexDI container
- Workflows can be persisted and resumed after failures or restarts
- Saga state feeds into the HexDI nervous system (introspection, MCP, A2A)
- `@hex-di/result` is a dependency -- all saga outcomes are `Result` values, never thrown exceptions

### 1.1 What is the Saga Pattern?

The Saga pattern (originated by Hector Garcia-Molina and Kenneth Salem, 1987) manages distributed transactions by breaking them into a sequence of local transactions. If one step fails, compensating transactions are executed in reverse order to undo the work of preceding steps.

```
+---------------------------------------------------------------------------+
|                        Order Processing Saga                              |
|                                                                           |
|  +----------+    +----------+    +----------+    +----------+             |
|  | Reserve  |--->| Charge   |--->|  Ship    |--->|  Notify  |             |
|  | Stock    |    | Payment  |    |  Order   |    |  User    |             |
|  +----+-----+    +----+-----+    +----+-----+    +----------+             |
|       |               |               |                                   |
|       v               v               v                                   |
|  +----------+    +----------+    +----------+                             |
|  | Release  |<---| Refund   |<---|  Cancel  |     (Compensation)          |
|  | Stock    |    | Payment  |    | Shipment |                             |
|  +----------+    +----------+    +----------+                             |
+---------------------------------------------------------------------------+
```

If "Ship Order" fails, the saga automatically runs compensation in reverse: first "Cancel Shipment" (no-op since it failed), then "Refund Payment", then "Release Stock". Each compensating action undoes the effect of its corresponding forward step.

### 1.2 Goals

1. **Port-centric orchestration** -- Each step invokes a port, not arbitrary functions. This brings testability (swap adapters), explicit dependencies (injected via container), and type safety through the workflow
2. **Compensation-first design** -- Every action can define its undo operation. Compensation is automatic and runs in reverse order on failure
3. **Full type safety** -- Compile-time validation of workflow context, step inputs, step outputs, and compensation parameters
4. **Typed error accumulation** -- Each step declares its error type. As steps are composed into a saga, error types accumulate into a union visible at compile time. The final `Result` carries the full error union so callers can handle every failure mode exhaustively
5. **DI-integrated** -- Sagas resolve dependencies through the HexDI container, using the same `GraphBuilder` composition as the rest of the application
6. **Result-based outcomes** -- Saga execution returns `Result<SagaSuccess<TOutput>, SagaError<TErrors>>` from `@hex-di/result`. No thrown exceptions -- errors are values that can be mapped, chained, and pattern-matched
7. **Resumable workflows** -- Persist saga state to any storage backend and resume after failures, restarts, or deployments
8. **Framework agnostic core** -- `@hex-di/saga` has no React dependency; `@hex-di/saga-react` provides hooks and components
9. **Self-aware workflows** -- Saga execution state (active workflows, step progress, compensation history) feeds into the HexDI container's self-knowledge system for introspection, MCP, and A2A diagnostics

### 1.3 Non-Goals

1. **Not a distributed message queue** -- Use dedicated infrastructure (RabbitMQ, Kafka, SQS) for message routing and delivery guarantees
2. **Not a workflow engine with visual designers** -- No drag-and-drop UI or BPMN modeler
3. **Not event sourcing** -- Sagas are compatible with event-sourced systems but do not implement event stores or projections
4. **Not a replacement for simple async/await chains** -- If your workflow is a linear chain of awaited calls with no rollback needs, use plain async/await
5. **Not a BPMN engine** -- No support for BPMN XML, gateways, swim lanes, or process modeling standards

### 1.4 When to Use Sagas

| Use Saga                                          | Don't Use Saga                                 |
| ------------------------------------------------- | ---------------------------------------------- |
| Multi-service transactions requiring coordination | Single-service operations within one database  |
| Operations requiring rollback on partial failure  | Fire-and-forget operations with no undo        |
| Long-running processes (minutes to days)          | Sub-second operations that complete atomically |
| Complex business workflows with branching logic   | Simple CRUD operations                         |
| Coordinating multiple adapters across boundaries  | Single adapter calls with try/catch            |

### 1.5 Key Insight

Unlike Redux-Saga (generator-based side effects for Redux stores) or Temporal (requires external infrastructure and a workflow server), HexDI Saga treats each workflow step as a **port invocation**. This means:

- Steps are testable by swapping adapters -- no external services needed
- Dependencies are explicit and injected through the container
- Type safety flows through the entire workflow via TypeScript inference
- Step errors accumulate into a typed union -- callers see every possible failure at compile time
- The saga itself reports its state back to the central container

The saga becomes part of the application's self-knowledge. AI agents can query "What workflows are running?" and get structured, truthful answers through the same introspection system that reports on ports, adapters, and resolution graphs.

```
Traditional approach:
  Business logic  -->  Orchestrator SDK  -->  External server
  (tightly coupled, hard to test, infrastructure dependency)

HexDI Saga approach:
  Step definitions  -->  Port invocations  -->  Saga runtime  -->  Container
  (every step is swappable, every layer testable, no external infra required)
  (every outcome is a typed Result, every error is a value)
```

---

## 2. Philosophy

> "Workflows are graphs of port invocations with compensation strategies. Their outcomes are typed Result values -- never thrown exceptions."

### 2.1 Core Principles

**Principle 1: Steps are Port Invocations**

Every step invokes a port, not a raw function. This brings testability (swap adapters), explicit dependencies (injected via container), and type safety through the workflow.

```typescript
const ReserveStockStep = defineStep("ReserveStock")
  .invoke(InventoryPort, ctx => ({ action: "reserve", ...ctx.input }))
  .compensate(ctx => ({ action: "release", reservationId: ctx.stepResult.reservationId }))
  .build();
```

**Principle 2: Compensation is First-Class**

Every step that modifies state should define how to undo that modification. Compensation runs automatically in reverse order when a downstream step fails. Steps that only read data (like notifications) can omit compensation.

**Principle 3: Context Accumulates**

Each step's output is added to the saga context with full type inference, available to subsequent steps:

```typescript
ctx.results.ReserveStock.reservationId; // Available after ReserveStock completes
ctx.results.ChargePayment.transactionId; // Available after ChargePayment completes
```

TypeScript ensures you cannot access a step's result before it has executed. The context type grows as the saga progresses, providing compile-time guarantees about data availability.

**Principle 4: Errors are Typed Values**

Saga execution returns `Result<SagaSuccess<TOutput>, SagaError<TErrors>>`. Each step declares its own error type, and as steps compose into a saga the `TErrors` union grows to include every possible failure. Callers handle errors via `result.match()` -- never `try/catch`:

```typescript
const result = await saga.execute(input);

result.match(
  success => {
    // success.output contains the saga's typed output
    console.log("Order completed:", success.output.trackingNumber);
  },
  error => {
    // error._tag narrows the error variant exhaustively
    switch (error._tag) {
      case "StepFailed":
        console.error(`Step ${error.stepName} failed:`, error.cause);
        break;
      case "CompensationFailed":
        console.error("Compensation failed -- inconsistent state");
        break;
      case "Timeout":
        console.error(`Timed out after ${error.timeoutMs}ms`);
        break;
    }
  }
);
```

**Principle 5: The Nervous System Reports**

Saga execution state feeds into the HexDI container's self-knowledge system. Active workflows, step progress, compensation history, and error details are all queryable through the same introspection API used for ports and adapters. AI agents can ask structured questions about workflow health and get truthful, up-to-date answers.

### 2.2 Architecture Overview

```
+----------------------------------------------------------------------+
|                        APPLICATION LAYER                              |
|                                                                       |
|     const result = await saga.execute({ orderId, userId, items });    |
|     result.match(                                                     |
|       success => { /* use success.output */ },                        |
|       error => { /* handle error._tag */ },                           |
|     );                                                                |
|                                                                       |
+-------------------------------+--------------------------------------+
                                |
+-------------------------------v--------------------------------------+
|                        SAGA RUNTIME                                   |
|                                                                       |
|  +-------------+  +-------------+  +--------------+  +-------------+ |
|  |   Runner    |  |  Executor   |  | Compensator  |  |  Persister  | |
|  | (orchestrate|  | (run steps) |  | (undo steps) |  | (save state)| |
|  |  workflow)  |  |             |  |              |  |             | |
|  +------+------+  +------+------+  +------+-------+  +------+------+ |
|         |                |                |                  |        |
+---------|----------------|----------------|------------------+--------+
          |                |                |                  |
+---------|----------------|----------------|------------------+--------+
|         v                v                v                           |
|                    SAGA DEFINITION                                    |
|                                                                       |
|     defineSaga("OrderProcessing")                                     |
|       .step(ReserveStockStep)                                         |
|       .step(ChargePaymentStep)                                        |
|       .step(ShipOrderStep)                                            |
|       .step(NotifyUserStep)                                           |
|       .build()                                                        |
|                                                                       |
|     Returns: Result<SagaSuccess<TOutput>, SagaError<TErrors>>         |
|                                                                       |
+-------------------------------+--------------------------------------+
                                |
+-------------------------------v--------------------------------------+
|                     STEP DEFINITIONS                                  |
|                                                                       |
|     defineStep("ReserveStock")                                        |
|       .invoke(InventoryPort)                                          |
|       .compensate(...)                                                |
|       .build()                                                        |
|                                                                       |
+-------------------------------+--------------------------------------+
                                |
+-------------------------------v--------------------------------------+
|                     HEXDI CONTAINER                                   |
|                                                                       |
|  +-------------+     +-------------+     +-------------+              |
|  |    Port     |---->|   Adapter   |---->|   Service   |              |
|  | (inventory) |     | (http/mock) |     | (business)  |              |
|  +-------------+     +-------------+     +-------------+              |
|                                                                       |
+----------------------------------------------------------------------+
```

### 2.3 Benefits

| Benefit                  | Description                                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Testability              | Swap adapters to test saga logic without external services                                                                                                    |
| Observability            | Saga execution produces detailed traces for debugging                                                                                                         |
| Resilience               | Automatic compensation handles partial failures gracefully                                                                                                    |
| Type Safety              | Full TypeScript inference through the workflow context                                                                                                        |
| Typed Error Accumulation | Step error types are visible at compile time and accumulate across the saga into a union; callers handle every failure mode exhaustively via `result.match()` |
| Result-Based API         | All saga outcomes are `Result` values from `@hex-di/result` -- no thrown exceptions, composable error handling                                                |
| Consistency              | Same DI patterns as the rest of the application                                                                                                               |
| Self-Awareness           | Saga state visible to introspection and AI diagnostic tools                                                                                                   |

### 2.4 Before & After

**Before (manual compensation -- error-prone):**

```typescript
async function processOrder(order: Order) {
  const reservation = await inventoryService.reserve(order.items);
  try {
    const payment = await paymentService.charge(order.total);
    try {
      await shippingService.ship(order);
    } catch (shipError) {
      // Must remember to refund
      await paymentService.refund(payment.transactionId);
      // Must remember to release stock
      await inventoryService.release(reservation.reservationId);
      throw shipError;
    }
  } catch (payError) {
    // Must remember to release stock (easy to forget)
    await inventoryService.release(reservation.reservationId);
    throw payError;
  }
  // Problems: nested try/catch, easy to miss a step, wrong order,
  // no persistence, no observability, compensation errors swallowed
}
```

**After (HexDI Saga -- automatic compensation, Result-based):**

```typescript
const OrderSaga = defineSaga("OrderProcessing")
  .input<{ orderId: string; userId: string; items: Item[] }>()
  .step(ReserveStockStep)
  .step(ChargePaymentStep)
  .step(ShipOrderStep)
  .step(NotifyUserStep)
  .build();

// Compensation is defined with each step, executed automatically in reverse,
// persisted for resumability, and observable through introspection.
// The result is a typed Result -- never a thrown exception.
const result = await container.resolve(OrderSaga).execute({
  orderId: "order-123",
  userId: "user-456",
  items: [{ sku: "WIDGET-1", quantity: 2 }],
});

// Result<SagaSuccess<TOutput>, SagaError<TErrors>>
result.match(
  success => {
    // success.output is fully typed from the saga's output mapper
    console.log("Order shipped:", success.output.trackingNumber);
  },
  error => {
    // error._tag discriminates the failure mode exhaustively
    switch (error._tag) {
      case "StepFailed":
        console.error(`Step "${error.stepName}" failed:`, error.cause);
        break;
      case "CompensationFailed":
        console.error("Compensation failed -- manual intervention needed");
        break;
      case "Timeout":
        console.error(`Saga timed out after ${error.timeoutMs}ms`);
        break;
      case "Cancelled":
        console.log("Saga was cancelled");
        break;
      case "ValidationFailed":
        console.error("Input validation failed:", error.cause);
        break;
      case "PortNotFound":
        console.error(`Port not registered: ${error.portName}`);
        break;
      case "PersistenceFailed":
        console.error("Could not persist saga state");
        break;
    }
  }
);
```

---

## 3. Package Structure

```
saga/
+-- core/                        # @hex-di/saga
|   +-- src/
|   |   +-- definition/
|   |   |   +-- step.ts         # defineStep builder
|   |   |   +-- saga.ts         # defineSaga builder
|   |   |   +-- types.ts        # Definition types
|   |   +-- runtime/
|   |   |   +-- runner.ts       # Saga execution engine
|   |   |   +-- executor.ts     # Step executor
|   |   |   +-- compensator.ts  # Compensation logic
|   |   |   +-- scheduler.ts    # Retry/timeout handling
|   |   +-- ports/
|   |   |   +-- saga-port.ts    # sagaPort factory
|   |   |   +-- persister.ts    # SagaPersisterPort
|   |   +-- adapters/
|   |   |   +-- saga-adapter.ts # createSagaAdapter factory
|   |   +-- errors/
|   |   |   +-- saga-error.ts   # SagaError tagged union
|   |   |   +-- types.ts        # Error types (discriminated by _tag)
|   |   +-- types/
|   |   |   +-- context.ts      # StepContext, CompensationContext
|   |   |   +-- result.ts       # Re-exports from @hex-di/result, SagaSuccess
|   |   |   +-- utils.ts        # Utility types
|   |   +-- index.ts
|   +-- testing/
|   |   +-- harness.ts          # createSagaTestHarness
|   |   +-- mocks.ts            # mockStep, mockPort
|   |   +-- index.ts
|   +-- package.json
+-- react/                       # @hex-di/saga-react
|   +-- src/
|   |   +-- hooks/
|   |   |   +-- use-saga.ts
|   |   |   +-- use-saga-status.ts
|   |   |   +-- use-saga-history.ts
|   |   +-- components/
|   |   |   +-- saga-boundary.tsx
|   |   +-- index.ts
|   +-- package.json
+-- devtools/                    # @hex-di/saga-devtools (future)
```

### 3.1 Dependency Graph

```
@hex-di/saga-react -----> @hex-di/saga -----> @hex-di/core
       |                        |                    |
       v                        v                    v
  @hex-di/react            @hex-di/result       @hex-di/runtime
                           @hex-di/graph
                           @hex-di/tracing

@hex-di/saga-devtools ---> @hex-di/saga
```

### 3.2 Peer Dependencies

| Package                 | Dependencies                                        | Peer Dependencies |
| ----------------------- | --------------------------------------------------- | ----------------- |
| `@hex-di/saga`          | `@hex-di/core`, `@hex-di/runtime`, `@hex-di/result` | --                |
| `@hex-di/saga-react`    | `@hex-di/saga`, `@hex-di/react`                     | `react`           |
| `@hex-di/saga-devtools` | `@hex-di/saga`                                      | --                |

---

_Next: [02 - Core Concepts](./02-core-concepts.md)_
