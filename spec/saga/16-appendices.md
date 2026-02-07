# 16 - Appendices

_Previous: [15 - API Reference](./15-api-reference.md)_

---

## Appendix A: Comparison with Other Libraries

### Feature Matrix

| Feature               | HexDI Saga                                              | Temporal                     | AWS Step Functions   | Redux-Saga               | Effect-TS                  | NestJS CQRS               | Azure Durable Functions      |
| --------------------- | ------------------------------------------------------- | ---------------------------- | -------------------- | ------------------------ | -------------------------- | ------------------------- | ---------------------------- |
| Language              | TypeScript-first                                        | Multi (Go, Java, TS, Python) | JSON (ASL)           | JavaScript/TypeScript    | TypeScript-first           | TypeScript                | Multi (C#, JS, Python, Java) |
| Type Safety           | Full (inferred context)                                 | Partial (typed activities)   | None (JSON schema)   | None (untyped effects)   | Full (three-channel)       | Partial (event types)     | Partial (input/output typed) |
| DI Integration        | Native (port-based)                                     | Custom (interceptors)        | None                 | None                     | Custom (layers)            | Native (NestJS providers) | None                         |
| Compensation          | Automatic (reverse order)                               | Manual (per activity)        | Manual (Catch/Retry) | None                     | None                       | None                      | None                         |
| Persistence           | Pluggable (port-based)                                  | Built-in (server)            | Built-in (AWS)       | None                     | None                       | None                      | Built-in (Azure Storage)     |
| Testing               | Simple harness                                          | Complex (replay, sandbox)    | Local emulator       | Simple (effects-as-data) | Simple (TestLayer)         | Standard NestJS testing   | Complex (replay)             |
| Infrastructure        | In-process                                              | Requires server              | Cloud-locked (AWS)   | In-process               | In-process                 | In-process                | Cloud-locked (Azure)         |
| Orchestration Pattern | Builder                                                 | Async/Await                  | State Machine (JSON) | Generator                | Async/Await (effect pipes) | Event-driven              | Async/Await (replay)         |
| Error Handling        | Typed `Result<T, SagaError<E>>` with error accumulation | Custom error types           | Catch states         | Try/catch in generators  | Typed error channel        | Exception filters         | Try/catch with retry         |
| Observability         | Tracing integration                                     | Built-in UI                  | CloudWatch           | Redux DevTools           | Fiber tracing              | NestJS logging            | Application Insights         |

### Library Summaries

**Temporal** -- Best for durable execution at scale. Workflows survive server restarts and scale horizontally across worker fleets. However, it requires deploying and operating an external Temporal server (or using Temporal Cloud), adding significant infrastructure complexity. Activities are typed but workflow context accumulation lacks the compile-time inference that HexDI Saga provides.

**AWS Step Functions** -- Good for AWS-native workflows with deep integration into Lambda, SQS, DynamoDB, and other AWS services. State machines are defined in Amazon States Language (JSON), which provides no type safety and poor developer ergonomics. Vendor-locked to AWS with no local-first development story beyond the Step Functions Local emulator.

**Redux-Saga** -- Proved the "effects-as-data" pattern: sagas yield declarative effect objects that are trivially testable without mocking. However, Redux-Saga has no compensation mechanism, no persistence, no TypeScript types for effects, and is tightly coupled to Redux stores. The generator-based API can be difficult to reason about for complex workflows.

**Effect-TS** -- Strongest type-level safety of any TypeScript effect system. The three-channel error type (`Effect<Success, Error, Requirements>`) provides compile-time guarantees about failure modes and dependencies. However, Effect-TS focuses on composable effects, not durable workflow orchestration -- there is no built-in compensation, persistence, or saga pattern. Workflows must be hand-rolled from primitives.

**NestJS CQRS** -- Good DI integration for command/query/event patterns within the NestJS ecosystem. However, the "saga" concept in NestJS CQRS is an event-to-command mapper (listening for events and dispatching new commands), not the compensating transaction pattern. There is no step orchestration, no compensation, and no persistence of workflow state.

**Azure Durable Functions** -- Checkpoint-based replay execution that survives process restarts and scales via Azure's infrastructure. The replay model (re-executing the orchestrator function from the start, skipping completed steps via replay) is powerful but introduces subtle constraints (orchestrator functions must be deterministic). Vendor-locked to Azure with weaker TypeScript type support compared to the C# SDK.

**HexDI Saga** -- Combines full compile-time type inference, automatic compensation, Result-based error handling with typed error accumulation, and deep DI integration into a single in-process package. No external infrastructure required. Step errors flow through `Result<SagaSuccess<TOutput>, SagaError<TErrors>>`, making every failure mode visible at compile time and composable with the standard Result combinator API.

### HexDI Saga's Unique Position

HexDI Saga combines the best ideas from each library into a single in-process package:

- **Effect-TS's type safety** -- full compile-time inference through the workflow context, where each step narrows the accumulated results type
- **Redux-Saga's testability** -- swap port adapters to test saga logic without external services, no infrastructure required
- **Temporal's compensation patterns** -- automatic reverse-order compensation with structured error reporting
- **Deep hex-di DI integration** -- steps invoke ports, dependencies are resolved through the container, and saga state feeds into introspection
- **Typed error accumulation** -- step error types are accumulated at compile time via `AccumulatedErrors<TSteps>`, making every possible failure mode visible in the `SagaError<TCause>` union without manual annotation

All of this runs in-process with zero infrastructure requirements. No external servers, no cloud services, no message queues. Persistence is available through a pluggable port when needed, but never forced.

---

## Appendix B: Glossary

| Term                        | Definition                                                                                                                                                                                                                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Step                        | A single unit of work in a saga that invokes a port. Each step has a name, a forward action, and an optional compensation action.                                                                                                                                                                        |
| Saga                        | An ordered sequence of steps with a declared input type and output type. Defines the complete workflow including compensation strategy.                                                                                                                                                                  |
| Compensation                | The action that undoes a step's effects when a downstream step fails. Runs automatically in reverse order of step completion.                                                                                                                                                                            |
| StepContext                 | Runtime context provided to a step's forward invocation, containing the saga input, accumulated results from prior steps, and the execution ID.                                                                                                                                                          |
| CompensationContext         | Runtime context provided to a step's compensation handler, extending StepContext with the step's original result and the error that triggered compensation.                                                                                                                                              |
| CompensationError           | Now a variant of `SagaError<TCause>` with `_tag: "CompensationFailed"` rather than a separate class. Carries the original step error, the list of steps that were successfully compensated, and the list of compensation failures. Produced when one or more compensation handlers fail during rollback. |
| SagaPort                    | A port created with `sagaPort` that exposes a saga executor. Resolved from the container like any other port.                                                                                                                                                                                            |
| SagaAdapter                 | Binds a saga definition to a port with its required dependencies. Created with `createSagaAdapter` and registered in the graph.                                                                                                                                                                          |
| Persister                   | A port adapter that stores saga execution state for resumption. Implements the `SagaPersister` interface with save, load, delete, list, and update operations.                                                                                                                                           |
| Execution ID                | A unique identifier assigned to each saga execution instance. Stable across retries and resumptions. Used as the basis for idempotency keys.                                                                                                                                                             |
| Idempotency Key             | A token derived from the execution ID ensuring a step or compensation operation executes at most once, even if retried after a crash.                                                                                                                                                                    |
| Accumulated Results         | A type-safe map from step names to their outputs, growing as each step completes. TypeScript inference ensures a step's result is only accessible after that step has executed.                                                                                                                          |
| Compensation Strategy       | Configuration controlling how compensation failures are handled: `sequential` (stop on first failure), `parallel` (run all at once), or `best-effort` (continue despite failures).                                                                                                                       |
| Checkpoint                  | Persisted state snapshot written after each step completes. Contains enough information to resume the saga from the last successful step.                                                                                                                                                                |
| Sub-Saga                    | A saga invoked as a step within another saga. The sub-saga's compensation is the compensation of the entire nested saga.                                                                                                                                                                                 |
| `SagaError<TCause>`         | A tagged union of seven error variants (`StepFailed`, `CompensationFailed`, `Timeout`, `Cancelled`, `ValidationFailed`, `PortNotFound`, `PersistenceFailed`) representing all saga failure modes. The `TCause` parameter carries the typed step error. Replaces the old `SagaError` class.               |
| `AccumulatedErrors<TSteps>` | A utility type that computes the union of all step error types from a tuple of step definitions. Used to type the `TCause` parameter of `SagaError`.                                                                                                                                                     |
| `SagaSuccess<TOutput>`      | A wrapper type carrying `output: TOutput` and `executionId: string`, used as the Ok variant in `Result<SagaSuccess<TOutput>, SagaError<TErrors>>`.                                                                                                                                                       |
| `ManagementError`           | A tagged union of errors specific to saga management operations (`ExecutionNotFound`, `InvalidOperation`, `PersistenceFailed`).                                                                                                                                                                          |

---

## Appendix C: Design Decisions

### C.1 Why Port-Based Steps?

Traditional saga implementations use arbitrary functions as steps. HexDI Saga requires every step to invoke a port. This is a deliberate architectural constraint with significant benefits:

- **Testability** -- swap the port's adapter to test saga logic in isolation without external services
- **Type safety** -- ports enforce input/output contracts at the type level; the saga context inherits these types automatically
- **Dependency injection** -- steps receive their dependencies through the container, not through closures or global state
- **Observability** -- every port invocation is a traceable boundary; the tracing system instruments steps automatically

```typescript
// Traditional: arbitrary function, hidden dependencies, untraceable
const steps = [
  async ctx => {
    const inventory = new InventoryService(config.inventoryUrl);
    return inventory.reserve(ctx.input.items);
  },
];

// HexDI Saga: port invocation, explicit dependencies, fully traceable
const ReserveStockStep = defineStep("ReserveStock")
  .io<ReserveStockInput, ReserveStockOutput>()
  .invoke(InventoryPort, ctx => ({ action: "reserve", items: ctx.input.items }))
  .compensate(ctx => ({ action: "release", reservationId: ctx.stepResult.reservationId }))
  .build();
```

The port-based constraint means that saga steps participate in the same dependency graph as the rest of the application. Container introspection reports which ports a saga depends on, and AI diagnostic tools can trace failures through the full resolution chain.

### C.2 Why Builder Pattern?

The `defineStep` and `defineSaga` builder APIs use a fluent, chainable pattern rather than configuration objects or decorators. This provides:

- **Type inference** -- each builder method narrows the accumulated type; `.step(ReserveStockStep)` adds `ReserveStock` to the results type, and subsequent steps see it
- **Validation** -- the builder enforces required fields at compile time; calling `.build()` without `.io()` and `.invoke()` is a type error, not a runtime error
- **Discoverability** -- IDEs show exactly which methods are available at each point in the chain, guiding developers through the API
- **Readability** -- the fluent chain reads like a declaration of intent, not a bag of configuration keys

```typescript
// Builder: type-safe, discoverable, reads like documentation
const OrderSaga = defineSaga("OrderProcessing")
  .input<OrderInput>()
  .step(ReserveStockStep) // results: { ReserveStock: ... }
  .step(ChargePaymentStep) // results: { ReserveStock: ..., ChargePayment: ... }
  .step(ShipOrderStep) // results: { ..., ShipOrder: ... }
  .output(results => ({ trackingNumber: results.ShipOrder.trackingNumber }))
  .build();

// Configuration object: no inference, no validation, no discoverability
const OrderSaga = createSaga({
  name: "OrderProcessing",
  steps: [ReserveStockStep, ChargePaymentStep, ShipOrderStep],
  output: results => ({ trackingNumber: results.ShipOrder.trackingNumber }),
  // TypeScript cannot infer that ShipOrder exists in results
});
```

### C.3 Why Automatic Compensation?

Manual compensation is error-prone. Developers must remember to undo every step, get the order right, handle compensation failures, and keep compensation logic in sync with forward logic as the workflow evolves. HexDI Saga automates this entirely:

- Compensation is defined alongside the step it undoes, keeping forward and reverse logic co-located
- The runtime executes compensations in reverse order automatically -- developers cannot get the order wrong
- Compensation failures are captured in the `CompensationFailed` variant of `SagaError<TCause>` with full context about what succeeded and what failed
- Adding or removing steps automatically adjusts the compensation chain

```typescript
// Manual: nested try/catch, easy to forget steps, wrong order, no structure
async function processOrder(order: Order) {
  const reservation = await inventoryService.reserve(order.items);
  try {
    const payment = await paymentService.charge(order.total);
    try {
      await shippingService.ship(order);
    } catch (e) {
      await paymentService.refund(payment.transactionId); // Must remember
      await inventoryService.release(reservation.id); // Must remember
      throw e;
    }
  } catch (e) {
    await inventoryService.release(reservation.id); // Easy to forget
    throw e;
  }
}

// Automatic: compensation defined with step, executed by runtime
const ReserveStockStep = defineStep("ReserveStock")
  .io<ReserveStockInput, ReserveStockOutput>()
  .invoke(InventoryPort, ctx => ({ action: "reserve", items: ctx.input.items }))
  .compensate(ctx => ({ action: "release", reservationId: ctx.stepResult.reservationId }))
  .build();
// Runtime handles reverse-order execution, error collection, and reporting
```

### C.4 Why In-Process (Not External Infrastructure)?

Unlike Temporal (requires deploying and operating a server cluster) or AWS Step Functions (requires an AWS account and cloud connectivity), HexDI Saga runs entirely in-process. This is a deliberate choice:

- **Zero infrastructure overhead** -- no servers to deploy, no cloud accounts to provision, no network hops for step execution
- **Works everywhere TypeScript runs** -- Node.js, Deno, Bun, edge functions, serverless, embedded
- **Full type safety end-to-end** -- no serialization boundary between the orchestrator and the steps; types flow through the entire workflow at compile time
- **Integrates with the existing DI container** -- sagas are resolved from the same container as every other dependency, sharing scopes, lifecycle, and introspection

**Tradeoff:** In-process execution means workflows do not survive process restarts without a persistence adapter. For workflows that require external durability guarantees (surviving crashes, deployments, or multi-node handoffs), a `SagaPersister` adapter backed by a durable store (PostgreSQL, Redis) must be configured. This is an explicit, opt-in decision rather than forced infrastructure.

### C.5 Why Pluggable Persistence?

Not all sagas need persistence. The persistence layer is designed as a port with pluggable adapters, making it optional and swappable:

- **Short-lived sagas** (sub-second, in-memory) -- a saga that reserves inventory, charges payment, and sends a notification in under 100ms gains nothing from persistence. The overhead of writing checkpoints exceeds the cost of re-executing on failure.
- **Long-running sagas** (minutes to days) -- a saga that waits for human approval, external callbacks, or scheduled retries must persist state to survive process restarts. The `SagaPersisterPort` enables this without changing the saga definition.
- **Testing** -- `InMemoryPersister` provides deterministic, fast persistence for tests without database setup
- **Production** -- `PostgresPersister`, `RedisPersister`, or custom adapters handle durable storage with the performance characteristics appropriate for the deployment environment

The saga definition itself is persistence-agnostic. The same `OrderSaga` runs with no persister (in-memory only), an `InMemoryPersister` (for tests), or a `PostgresPersister` (for production) -- selected at container configuration time, not at saga definition time.

```typescript
// No persistence: fast, in-memory only
const graph = new GraphBuilder().saga(OrderSaga).build();

// With persistence: durable, resumable
const graph = new GraphBuilder()
  .adapter(SagaPersisterPort, PostgresPersisterAdapter)
  .saga(OrderSaga, { persistent: true })
  .build();
```

### C.6 Why Result Instead of SagaResult?

The original design used a custom `SagaResult<TOutput>` discriminated union:

```typescript
// Old approach: custom discriminated union
type SagaResult<TOutput> =
  | { success: true; output: TOutput; executionId: string }
  | { success: false; error: SagaError; compensated: boolean };
```

This was replaced with `Result<SagaSuccess<TOutput>, SagaError<TErrors>>` from `@hex-di/result` for several reasons:

**Eliminates duplicated patterns.** The old `SagaResult` was a hand-rolled discriminated union that reimplemented matching, mapping, and chaining logic already provided by `@hex-di/result`. Every consumer had to write `if (result.success)` checks manually rather than using composable combinators.

**Rich combinator API.** `Result<T, E>` provides `.match()`, `.map()`, `.andThen()`, `.isOk()`, `.isErr()` -- a complete set of functional combinators for transforming and inspecting outcomes. `ResultAsync<T, E>` composes naturally with other async Result operations such as container resolution and external API calls.

**Compensation status is encoded in the error tag.** The old `compensated: boolean` field required consumers to check both `success` and `compensated` to determine the saga's state. With the tagged union approach, the `_tag` discriminant carries this information directly: `StepFailed` means the step failed and all compensations succeeded (fully compensated), while `CompensationFailed` means one or more compensations also failed (partially compensated). No separate boolean needed.

**Typed error accumulation.** `AccumulatedErrors<TSteps>` computes the union of all step error types from the saga's step tuple at compile time. This means `SagaError<TCause>` carries the exact set of errors that the saga's steps can produce -- not a generic `unknown` or `Error`. Consumers can exhaustively match on step errors without type assertions.

**JSON-friendly serialization.** Tagged union errors with a `_tag` string discriminant serialize to JSON naturally. Class-based errors (the old `SagaError` class) lose their prototype chain when serialized and deserialized, breaking `instanceof` checks and requiring custom reviver logic. Tagged unions survive round-trips through `JSON.parse(JSON.stringify(...))` without loss of discriminant information.

**Ecosystem alignment.** Using `Result<T, E>` for saga outcomes aligns with the same pattern used across the rest of HexDI -- port resolution, validation, and external service calls all return `Result` types. Consumers do not need to learn a saga-specific error handling pattern.

---

_End of Specification_
