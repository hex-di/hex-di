# 13 - Advanced Patterns

_Previous: [12 - Testing](./12-testing.md)_

---

## 18. Advanced Patterns

### 18.1 Long-Running Sagas

Sagas that span minutes, hours, or days require persistence and the ability to await external events. The `persistent: true` option combined with saga-level timeouts enables workflows that survive process restarts and wait for out-of-band signals like email verification or manual approval.

```typescript
const AwaitEmailVerificationStep = defineStep("AwaitEmailVerification")
  .io<{ email: string }, { verifiedAt: string }>()
  .invoke(VerificationPort, ctx => ({
    action: "awaitVerification" as const,
    email: ctx.input.email,
    userId: ctx.results.CreateAccount.userId,
    // Poll or webhook -- the adapter decides the mechanism
    callbackUrl: `/api/sagas/${ctx.executionId}/verify`,
  }))
  .compensate(ctx => ({
    action: "revokeVerification" as const,
    userId: ctx.results.CreateAccount.userId,
  }))
  .timeout(86400000) // 24 hours for this single step
  .build();

const OnboardingSaga = defineSaga("OnboardingSaga")
  .input<{ email: string; name: string; plan: "free" | "pro" }>()
  .step(CreateAccountStep)
  .step(SendVerificationEmailStep)
  .step(AwaitEmailVerificationStep)
  .step(CollectProfileInfoStep)
  .step(SetupPreferencesStep)
  .step(CompleteOnboardingStep)
  .output(results => ({
    userId: results.CreateAccount.userId,
    verifiedAt: results.AwaitEmailVerification.verifiedAt,
    onboardedAt: results.CompleteOnboarding.completedAt,
  }))
  .options({
    persistent: true,
    timeout: 604800000, // 7 days for the entire onboarding flow
    compensationStrategy: "sequential",
  })
  .build();
```

The `AwaitEmailVerification` adapter implementation decides the mechanism -- polling, webhooks, or event subscription. The saga runtime checkpoints state before entering the step and resumes when the adapter resolves. If the user never verifies, the step-level or saga-level timeout fires and compensation rolls back account creation and any other completed steps.

When the external signal arrives (e.g., via a webhook hitting `/api/sagas/:executionId/verify`), the application calls `sagaRunner.resume(executionId)` to continue from the checkpoint.

### 18.2 Idempotent Steps

Steps in persistent sagas may be re-executed after a crash between step completion and checkpoint persistence. Steps that produce side effects must be idempotent to prevent duplicate charges, double reservations, or repeated notifications.

The pattern: combine `ctx.executionId` with the step name to derive a unique idempotency key per step per execution.

```typescript
const ChargePaymentStep = defineStep("ChargePayment")
  .io<{ amount: number; currency: string }, { transactionId: string }>()
  .invoke(PaymentPort, ctx => ({
    action: "charge" as const,
    amount: ctx.input.amount,
    currency: ctx.input.currency,
    // Unique per execution + step: safe to retry
    idempotencyKey: `${ctx.executionId}:ChargePayment`,
  }))
  .compensate(ctx => ({
    action: "refund" as const,
    transactionId: ctx.stepResult.transactionId,
    // Separate idempotency key for the compensation call
    idempotencyKey: `${ctx.executionId}:ChargePayment:compensate`,
  }))
  .retry({
    maxAttempts: 3,
    delay: attempt => Math.min(1000 * Math.pow(2, attempt), 10000),
    retryIf: error => error._tag === "NetworkError",
  })
  .build();
```

Idempotency key composition:

| Component            | Purpose                                                      |
| -------------------- | ------------------------------------------------------------ |
| `ctx.executionId`    | Unique per saga execution, stable across retries and resumes |
| Step name            | Distinguishes between steps within the same execution        |
| `:compensate` suffix | Distinguishes forward invocation from compensation           |

The port adapter is responsible for honoring idempotency keys. When a duplicate key is received, the adapter returns the result of the original call without re-executing the operation. This contract must be documented in the port definition and tested in adapter tests.

### 18.3 Distributed Sagas

When a saga coordinates work across multiple services, steps publish events and await responses rather than making synchronous calls. The orchestration pattern is preferred over choreography: the saga runtime remains the single source of truth for execution state, while individual services respond to events.

```typescript
// Service A: the orchestrator
const ReserveInventoryStep = defineStep("ReserveInventory")
  .io<{ orderId: string; items: OrderItem[] }, { reservationId: string; reservedAt: string }>()
  .invoke(EventBusPort, ctx => ({
    topic: "inventory.reserve.request",
    payload: {
      orderId: ctx.input.orderId,
      items: ctx.input.items,
      sagaId: ctx.executionId, // Correlation ID for the response
    },
    replyTopic: "inventory.reserve.response",
    timeout: 30000,
  }))
  .compensate(ctx => ({
    topic: "inventory.release.request",
    payload: {
      reservationId: ctx.stepResult.reservationId,
      sagaId: ctx.executionId,
    },
  }))
  .timeout(60000)
  .build();

const ProcessPaymentStep = defineStep("ProcessPayment")
  .io<{ orderId: string; amount: number }, { transactionId: string }>()
  .invoke(EventBusPort, ctx => ({
    topic: "payment.charge.request",
    payload: {
      orderId: ctx.input.orderId,
      amount: ctx.input.amount,
      sagaId: ctx.executionId,
    },
    replyTopic: "payment.charge.response",
    timeout: 30000,
  }))
  .compensate(ctx => ({
    topic: "payment.refund.request",
    payload: {
      transactionId: ctx.stepResult.transactionId,
      sagaId: ctx.executionId,
    },
  }))
  .timeout(60000)
  .build();

const OrderCreationSaga = defineSaga("OrderCreationSaga")
  .input<{ orderId: string; items: OrderItem[]; amount: number }>()
  .step(ReserveInventoryStep) // Publishes to Service B (inventory)
  .step(ProcessPaymentStep) // Publishes to Service C (payment)
  .step(ConfirmOrderStep) // Local step in Service A
  .output(results => ({
    orderId: results.ConfirmOrder.orderId,
    reservationId: results.ReserveInventory.reservationId,
    transactionId: results.ProcessPayment.transactionId,
  }))
  .options({
    persistent: true,
    compensationStrategy: "sequential",
  })
  .build();
```

Key design decisions:

- **Correlation via `sagaId`** -- every event includes the saga execution ID so that responses can be routed back to the correct saga instance
- **Request/reply pattern** -- the `EventBusPort` adapter publishes a request event and subscribes to a reply topic, resolving when the correlated response arrives or the timeout expires
- **Compensation publishes cancellation events** -- downstream services handle cancellation events independently, maintaining their own consistency
- **Orchestration over choreography** -- the saga definition in Service A is the single source of truth for execution order, compensation logic, and timeout policy; downstream services are stateless responders

### 18.4 Saga Orchestration Patterns

#### 18.4.1 Sequential with Early Exit

When a saga performs progressive validation and any step can determine that execution should not continue, steps throw to abort early. Since validation steps do not modify state, compensation is skipped.

```typescript
const ValidateAddressStep = defineStep("ValidateAddress")
  .io<{ address: Address }, { normalized: Address; deliverable: boolean }>()
  .invoke(AddressValidationPort, ctx => ({ address: ctx.input.address }))
  .skipCompensation()
  .build();

const ValidateCreditStep = defineStep("ValidateCredit")
  .io<{ userId: string; amount: number }, { approved: boolean; creditLimit: number }>()
  .invoke(CreditCheckPort, ctx => ({
    userId: ctx.input.userId,
    requestedAmount: ctx.input.amount,
  }))
  .skipCompensation()
  .build();

const ValidateFraudStep = defineStep("ValidateFraud")
  .io<{ userId: string; amount: number }, { riskScore: number; approved: boolean }>()
  .invoke(FraudDetectionPort, ctx => ({
    userId: ctx.input.userId,
    amount: ctx.input.amount,
    address: ctx.results.ValidateAddress.normalized,
  }))
  .skipCompensation()
  .build();

const ValidationSaga = defineSaga("ValidationSaga")
  .input<{ userId: string; amount: number; address: Address }>()
  .step(ValidateAddressStep)
  .step(ValidateCreditStep)
  .step(ValidateFraudStep)
  .output(results => ({
    addressValid: results.ValidateAddress.deliverable,
    creditApproved: results.ValidateCredit.approved,
    fraudCleared: results.ValidateFraud.approved,
    riskScore: results.ValidateFraud.riskScore,
  }))
  .build();
```

Each validation step adapter throws a `ValidationError` if the check fails. Since every step uses `skipCompensation()`, no rollback is needed -- the saga terminates immediately and returns the error in the `Result<SagaSuccess<...>, SagaError<...>>`.

#### 18.4.2 Parallel with Aggregation

When multiple independent data sources must be queried and combined, use `.parallel()` to execute them concurrently, then a final step to aggregate. Internally, the saga runtime uses `ResultAsync.all` to execute the parallel steps, short-circuiting on the first failure. For use cases where all errors should be collected (e.g., parallel validation), the runtime can be configured with `parallelStrategy: "allSettled"` which uses `ResultAsync.allSettled` to gather all results before determining success or failure.

```typescript
const FetchUserProfileStep = defineStep("FetchUserProfile")
  .io<{ userId: string }, { name: string; email: string; avatar: string }>()
  .invoke(UserProfilePort, ctx => ({ userId: ctx.input.userId }))
  .skipCompensation()
  .build();

const FetchOrdersStep = defineStep("FetchOrders")
  .io<{ userId: string }, { orders: Order[]; totalSpent: number }>()
  .invoke(OrderHistoryPort, ctx => ({ userId: ctx.input.userId }))
  .skipCompensation()
  .build();

const FetchPreferencesStep = defineStep("FetchPreferences")
  .io<{ userId: string }, { theme: string; locale: string; notifications: boolean }>()
  .invoke(PreferencesPort, ctx => ({ userId: ctx.input.userId }))
  .skipCompensation()
  .build();

const FetchNotificationsStep = defineStep("FetchNotifications")
  .io<{ userId: string }, { unread: number; recent: Notification[] }>()
  .invoke(NotificationsPort, ctx => ({ userId: ctx.input.userId }))
  .skipCompensation()
  .build();

const AggregationSaga = defineSaga("AggregationSaga")
  .input<{ userId: string }>()
  .parallel([FetchUserProfileStep, FetchOrdersStep, FetchPreferencesStep, FetchNotificationsStep])
  .output(results => ({
    profile: results.FetchUserProfile,
    orders: results.FetchOrders.orders,
    totalSpent: results.FetchOrders.totalSpent,
    preferences: results.FetchPreferences,
    unreadNotifications: results.FetchNotifications.unread,
    recentNotifications: results.FetchNotifications.recent,
  }))
  .build();
```

All four fetch steps execute concurrently. If any step fails, the saga fails immediately -- no compensation is needed since all steps are read-only. The `output` mapper has access to all parallel step results and composes them into a single aggregated shape.

### 18.5 Circuit Breaker Integration

When saga steps call external services, a circuit breaker prevents cascading failures by short-circuiting calls to a service that is consistently failing. The circuit breaker wraps the port adapter rather than the step, keeping step definitions clean.

```typescript
const ResilientChargeStep = defineStep("ResilientCharge")
  .io<{ amount: number }, { transactionId: string }>()
  .invoke(PaymentPort, ctx => ({
    action: "charge" as const,
    amount: ctx.input.amount,
    idempotencyKey: `${ctx.executionId}:ResilientCharge`,
  }))
  .compensate(ctx => ({
    action: "refund" as const,
    transactionId: ctx.stepResult.transactionId,
    idempotencyKey: `${ctx.executionId}:ResilientCharge:compensate`,
  }))
  .retry({
    maxAttempts: 3,
    delay: attempt => Math.min(1000 * Math.pow(2, attempt), 10000),
    retryIf: error => {
      // Do not retry if the circuit is open -- fail fast
      if (error._tag === "CircuitOpen") return false;
      return error._tag === "NetworkError" || error._tag === "TimeoutError";
    },
  })
  .timeout(15000)
  .build();
```

The circuit breaker is implemented as an adapter wrapper:

```typescript
function withCircuitBreaker<TPort extends Port<unknown, string>>(
  adapter: Adapter<TPort>,
  config: CircuitBreakerConfig
): Adapter<TPort> {
  // The adapter factory wraps the real adapter's factory,
  // tracking failure counts and tripping the circuit when
  // the failure threshold is exceeded.
  //
  // States: CLOSED (normal) -> OPEN (failing) -> HALF_OPEN (probing)
  //
  // When OPEN, invocations immediately return Err with _tag "CircuitOpen"
  // instead of calling the underlying adapter.
}

interface CircuitBreakerConfig {
  /** Number of failures before the circuit opens */
  failureThreshold: number;
  /** Time in ms before the circuit transitions from OPEN to HALF_OPEN */
  resetTimeout: number;
  /** Number of successful probes in HALF_OPEN to close the circuit */
  successThreshold: number;
}
```

The circuit breaker sits at the adapter layer, not the step layer. This means the same circuit breaker state is shared across all steps and sagas that use the same adapter. The step's `retryIf` predicate checks for `_tag: "CircuitOpen"` to avoid wasting retry attempts when the circuit is tripped.

### 18.6 Saga Composition

Sagas can be composed by nesting one saga inside another using the `.saga()` builder method. This enables reuse of saga definitions across different workflows and provides nested compensation guarantees.

#### Sub-Saga via `.saga()`

```typescript
const CheckoutSaga = defineSaga("CheckoutSaga")
  .input<CheckoutInput>()
  .step(CreateOrderStep)
  .saga(PaymentSaga, ctx => ({
    amount: ctx.results.CreateOrder.total,
    method: ctx.input.paymentMethod,
  }))
  .saga(FulfillmentSaga, ctx => ({
    orderId: ctx.results.CreateOrder.orderId,
  }))
  .step(SendConfirmationStep)
  .output(results => ({
    orderId: results.CreateOrder.orderId,
    transactionId: results.PaymentSaga.transactionId,
    trackingNumber: results.FulfillmentSaga.trackingNumber,
  }))
  .build();
```

When `CheckoutSaga` executes, the runtime treats each `.saga()` call as a single step. The sub-saga's output becomes the step result keyed by the sub-saga's name (e.g., `results.PaymentSaga`).

#### Saga-as-Step for Reuse

The same saga definition can appear as a sub-saga in multiple parent sagas:

```typescript
// PaymentSaga is reused in both CheckoutSaga and SubscriptionRenewalSaga
const SubscriptionRenewalSaga = defineSaga("SubscriptionRenewalSaga")
  .input<{ subscriptionId: string; amount: number; method: PaymentMethod }>()
  .step(ValidateSubscriptionStep)
  .saga(PaymentSaga, ctx => ({
    amount: ctx.input.amount,
    method: ctx.input.method,
  }))
  .step(ExtendSubscriptionStep)
  .output(results => ({
    subscriptionId: results.ValidateSubscription.subscriptionId,
    transactionId: results.PaymentSaga.transactionId,
    newExpiryDate: results.ExtendSubscription.expiryDate,
  }))
  .build();
```

#### Nested Compensation

When a parent saga compensates, sub-sagas compensate as a unit. The sub-saga's own compensation chain runs in full before the parent continues compensating earlier steps:

```
Execute:  CreateOrder -> PaymentSaga -> FulfillmentSaga -> SendConfirmation (fails)
                                                               |
Compensate: CreateOrder <- PaymentSaga <- FulfillmentSaga <----+
                          (runs its own          (runs its own
                           internal               internal
                           compensation)           compensation)
```

If `SendConfirmation` fails:

1. `FulfillmentSaga` compensates internally (cancel shipment, etc.)
2. `PaymentSaga` compensates internally (refund payment)
3. `CreateOrder` compensates (cancel order)

Each sub-saga's compensation is atomic from the parent's perspective -- either all of its internal steps compensate or the sub-saga reports a compensation failure.

### 18.7 Saga Hooks (Cross-Cutting Concerns)

Saga hooks provide a mechanism for cross-cutting concerns that apply to every step execution without modifying individual step definitions. This pattern aligns with HexDI's existing **resolution hooks** (`beforeResolve` / `afterResolve` in `@hex-di/runtime`) rather than introducing a new middleware abstraction.

```typescript
interface SagaHooks {
  /** Called before each step or compensation invocation */
  beforeStep?: (ctx: StepHookContext) => void;
  /** Called after each step or compensation invocation (success or failure) */
  afterStep?: (ctx: StepHookResultContext) => void;
}

interface StepHookContext {
  /** Current step name */
  readonly stepName: string;
  /** Current step index */
  readonly stepIndex: number;
  /** Saga execution ID */
  readonly executionId: string;
  /** Saga name */
  readonly sagaName: string;
  /** Whether this is a compensation invocation */
  readonly isCompensation: boolean;
  /** Arbitrary metadata carried through the saga */
  readonly metadata: Record<string, unknown>;
}

interface StepHookResultContext extends StepHookContext {
  /** Duration of the step invocation in milliseconds */
  readonly durationMs: number;
  /** The error if the step failed, undefined on success */
  readonly error: unknown | undefined;
}
```

Hooks are registered on the saga definition via options:

```typescript
const OrderSaga = defineSaga("OrderSaga")
  .input<OrderInput>()
  .step(ValidateOrderStep)
  .step(ReserveStockStep)
  .step(ChargePaymentStep)
  .output(results => ({
    orderId: results.ValidateOrder.orderId,
  }))
  .options({
    hooks: { beforeStep: loggingBeforeHook, afterStep: loggingAfterHook },
  })
  .build();
```

#### Logging Hooks

```typescript
const loggingBeforeHook: SagaHooks["beforeStep"] = ctx => {
  const label = ctx.isCompensation ? "compensate" : "execute";
  console.log(`[${ctx.sagaName}] ${label} ${ctx.stepName} started`);
};

const loggingAfterHook: SagaHooks["afterStep"] = ctx => {
  const label = ctx.isCompensation ? "compensate" : "execute";
  if (ctx.error) {
    console.error(
      `[${ctx.sagaName}] ${label} ${ctx.stepName} failed after ${ctx.durationMs.toFixed(1)}ms`,
      ctx.error
    );
  } else {
    console.log(
      `[${ctx.sagaName}] ${label} ${ctx.stepName} completed in ${ctx.durationMs.toFixed(1)}ms`
    );
  }
};
```

#### Tracing via Container Hooks

Tracing does not need saga-level hooks at all. The existing `instrumentContainer` from `@hex-di/tracing` already instruments every `container.resolve()` call. Since each saga step resolves its port through the container, tracing spans are produced automatically with no saga-specific configuration:

```typescript
import { instrumentContainer } from "@hex-di/tracing";

// All saga step port resolutions produce tracing spans automatically
instrumentContainer(container, { tracer: container.resolve(TracerPort) });
```

For saga-level span grouping (parent span wrapping an entire saga execution), the saga runtime emits `saga:started` and `saga:completed` events that the tracing integration can subscribe to. See [14.4 Tracing Integration](./10-integration.md) for details.

#### Rate Limiting via Adapter Decorator

For per-step rate limiting, wrap the port adapter rather than adding saga-level interception:

```typescript
const RateLimitedPaymentAdapter = createAdapter(PaymentPort, {
  requires: [PaymentPort, RateLimiterPort],
  factory: deps => ({
    charge: async input => {
      await deps[RateLimiterPort].acquire("payment:charge");
      return deps[PaymentPort].charge(input);
    },
  }),
});
```

This approach keeps rate limiting at the adapter layer where it belongs, following HexDI's hexagonal architecture. The saga is unaware of the rate limiter -- it only sees the `PaymentPort` interface.

> **Why hooks instead of middleware?** HexDI uses hooks (`beforeResolve` / `afterResolve`) throughout the codebase for cross-cutting concerns. Introducing a `next()`-based middleware chain for sagas alone would create an inconsistent pattern. Hooks are simpler (no `next()` to forget to call), more predictable (no short-circuiting), and align with the existing resolution hooks, tracing hooks, and scope lifecycle events in `@hex-di/runtime` and `@hex-di/tracing`.

### 18.8 Multi-Tenancy

In multi-tenant applications, saga execution must be isolated per tenant. The HexDI scope model provides the foundation: each tenant request creates its own scope, and scoped adapters resolve tenant-specific instances.

#### Tenant Context Propagation

The recommended pattern is a scoped `TenantContextPort` that provides tenant identity to all services within the scope:

```typescript
const TenantContextPort = createPort<TenantContext>()({ name: "TenantContext" });

interface TenantContext {
  readonly tenantId: string;
  readonly tenantName: string;
  readonly databaseSchema: string;
}
```

Saga steps access tenant context through the container, not through the saga context. Because steps resolve ports from the scoped container, and `TenantContextPort` is scoped, each saga execution automatically receives the correct tenant context:

```typescript
// Per-tenant request handler
async function handleTenantRequest(tenantId: string, orderInput: OrderInput) {
  const scope = container.createScope(`tenant-${tenantId}`);

  // Scoped TenantContext adapter provides tenant-specific state
  // All port resolutions within this scope inherit tenant isolation
  const saga = scope.resolve(OrderSagaPort);
  const result = await saga.execute(orderInput);

  await scope.dispose();
  return result;
}
```

#### Persistence Isolation

When using a shared persistence backend across tenants, the persister adapter should partition data by tenant. This is the adapter's responsibility, not the saga runtime's:

```typescript
function createTenantAwarePersister(db: DatabasePort, tenantContext: TenantContext): SagaPersister {
  return {
    async save(state) {
      await db.query(`INSERT INTO ${tenantContext.databaseSchema}.saga_executions ...`, [
        state.executionId,
        JSON.stringify(state),
      ]);
    },
    async load(executionId) {
      // Query is scoped to the tenant's schema
      const result = await db.query(
        `SELECT state FROM ${tenantContext.databaseSchema}.saga_executions WHERE execution_id = $1`,
        [executionId]
      );
      return result.rows[0]?.state ?? null;
    },
    // ... remaining methods scoped to tenant schema
  };
}
```

Because the persister adapter is scoped and receives `TenantContext` via DI, each tenant's saga state is naturally isolated without saga-level awareness of tenancy.

#### Resumption in Multi-Tenant Context

When resuming a persisted saga in a multi-tenant application, the resume call must execute within the correct tenant's scope. The saga state itself does not carry tenant identity -- that context is provided by the scope:

```typescript
async function resumeTenantSagas(tenantId: string) {
  const scope = container.createScope(`tenant-${tenantId}-resume`);
  const management = scope.resolve(OrderSagaManagementPort);

  const pending = await management.listExecutions({ status: "running" });
  for (const exec of pending) {
    await management.resume(exec.executionId);
  }

  await scope.dispose();
}
```

### 18.9 Resource Cleanup Across Persistence Boundaries

Long-running persistent sagas introduce a resource management challenge: the original scope may be disposed long before the saga resumes. Resources held by completed steps (file handles, temporary storage, reservations) must be managed carefully.

**Design principles:**

1. **Step outputs must be self-contained** -- step results should contain identifiers (reservation IDs, transaction IDs), not live references (open connections, file handles). The persistence layer serializes step outputs, so only JSON-serializable values survive.

2. **External resources have their own TTL** -- reservations, temporary files, and similar resources should have independent expiration policies managed by their respective services. A saga that resumes after hours should not assume external resources are still valid.

3. **Compensation handles stale resources** -- when a saga resumes and a step's external resource has expired, the compensation handler should handle the "resource not found" case gracefully:

```typescript
.compensate(ctx => ({
  action: "release",
  reservationId: ctx.stepResult.reservationId,
  // The adapter should handle "reservation not found" gracefully
  // (e.g., it expired naturally) rather than throwing
}))
```

4. **Memory management for accumulated results** -- the runtime does not impose a limit on accumulated result size. For sagas with many steps or large step outputs, the accumulated results object grows proportionally. Applications that process large data volumes through saga steps should keep step outputs lean (return IDs and summaries, not full payloads) and fetch full data when needed.

### 18.10 Anti-Patterns

The following patterns should be avoided when using `@hex-di/saga`:

#### 18.10.1 Resolving SagaManagementPort in Domain Code

The `SagaManagementPort` is an **infrastructure port** for operational control. Domain code should only resolve `SagaPort`:

```typescript
// BAD: Domain code accessing management operations
function processOrder(container: Container) {
  const management = container.resolve(OrderSagaManagementPort);
  const status = await management.getStatus("exec-123"); // Infrastructure concern leaked into domain
}

// GOOD: Domain code uses the domain port
function processOrder(container: Container) {
  const saga = container.resolve(OrderSagaPort);
  const result = await saga.execute(orderInput); // Domain concern only
}
```

#### 18.10.2 Global Saga Registry

Avoid maintaining a global `Map<string, SagaDefinition>` for saga lookup. This creates hidden shared mutable state:

```typescript
// BAD: Global mutable registry
const sagaRegistry = new Map<string, AnySagaDefinition>();
sagaRegistry.set("OrderSaga", OrderSaga);

// GOOD: Container-scoped lookup via ports
// Each saga is registered as a port in the graph.
// The container handles lookup and lifecycle.
const saga = container.resolve(OrderSagaPort);
```

When saga definitions must be looked up by name (e.g., for resumption), use a port-based registry adapter that is registered in the container and scoped appropriately.

#### 18.10.3 Event Listeners Without Scope

Saga event listeners (`SagaEventListener`) should be scoped to the execution or request, not registered globally:

```typescript
// BAD: Global listener that accumulates across requests
runner.subscribe("*", event => {
  globalMetrics.push(event); // Unbounded growth, no cleanup
});

// GOOD: Scoped listener tied to execution lifecycle
const unsubscribe = runner.subscribe(executionId, event => {
  requestMetrics.record(event);
});
// Unsubscribe when the request completes
```

#### 18.10.4 Steps with Side Effects in Mappers

The `invoke` and `compensate` mapper functions should be **pure** -- they map context to port input. Side effects belong in port adapters:

```typescript
// BAD: Side effects in the mapper
.invoke(PaymentPort, ctx => {
  logger.info("Charging payment..."); // Side effect in mapper
  metrics.increment("payment.attempts"); // Side effect in mapper
  return { amount: ctx.input.amount };
})

// GOOD: Pure mapper, side effects in hooks or adapter
.invoke(PaymentPort, ctx => ({
  amount: ctx.input.amount,
  idempotencyKey: ctx.executionId,
}))
// Use saga hooks for logging/metrics (see 18.7)
```

#### 18.10.5 Mutable Step Outputs

Step outputs are stored in `AccumulatedResults` and may be serialized for persistence. They must be treated as immutable:

```typescript
// BAD: Mutating a previous step's result
.invoke(ShippingPort, ctx => {
  ctx.results.ReserveStock.quantity = 10; // Mutation!
  return { address: ctx.input.address };
})

// GOOD: Derive new values without mutation
.invoke(ShippingPort, ctx => ({
  reservationId: ctx.results.ReserveStock.reservationId,
  address: ctx.input.address,
}))
```

The `StepContext.results` type uses `readonly` modifiers to catch mutations at compile time.

### 18.11 Generator-Based Saga Flows with safeTry

The `safeTry` generator from `@hex-di/result` provides a natural way to compose saga step results with early-return semantics. While the saga runtime itself orchestrates step execution, compensation, and persistence, application code that consumes saga results or coordinates multiple saga executions can use `safeTry` to flatten deeply nested `Result` handling into linear, readable flows.

#### Consuming Saga Results with safeTry

When a saga returns `Result<SagaSuccess<TOutput>, SagaError<TErrors>>`, the consumer often needs to chain additional operations that each produce their own `Result`. Without `safeTry`, this requires nested `andThen` chains or manual `isOk()` checks:

```typescript
import { safeTry, ok, err } from "@hex-di/result";

// Without safeTry: nested and verbose
async function placeOrder(input: OrderInput): Promise<Result<OrderConfirmation, AppError>> {
  const sagaResult = await orderSaga.execute(input);
  if (sagaResult.isErr()) {
    return err(toAppError(sagaResult.error));
  }

  const enrichResult = await enrichOrder(sagaResult.value.output);
  if (enrichResult.isErr()) {
    return enrichResult;
  }

  const notifyResult = await notifyCustomer(enrichResult.value);
  if (notifyResult.isErr()) {
    return notifyResult;
  }

  return ok(notifyResult.value);
}

// With safeTry: linear and clean
async function placeOrder(input: OrderInput): Promise<Result<OrderConfirmation, AppError>> {
  return safeTry(async function* () {
    const sagaResult = yield* await orderSaga.execute(input).mapErr(toAppError);
    const enriched = yield* await enrichOrder(sagaResult.output);
    const confirmation = yield* await notifyCustomer(enriched);
    return ok(confirmation);
  });
}
```

Each `yield*` extracts the `Ok` value or early-returns the `Err`, mirroring Rust's `?` operator. The error types accumulate automatically in the generator's type -- TypeScript infers the full union without explicit annotation.

#### Coordinating Multiple Saga Executions

When a higher-level workflow composes multiple sagas sequentially, `safeTry` eliminates the error-handling boilerplate between each saga call:

```typescript
import { safeTry, ok } from "@hex-di/result";
import type { Result, SagaSuccess, SagaError } from "@hex-di/result";

async function fullCheckout(
  input: CheckoutInput
): Promise<
  Result<
    CheckoutConfirmation,
    | SagaError<InventoryError>
    | SagaError<PaymentError>
    | SagaError<ShippingError>
    | NotificationError
  >
> {
  return safeTry(async function* () {
    // Each yield* short-circuits on Err, skipping remaining steps
    const inventory = yield* await inventorySaga.execute({
      items: input.items,
    });

    const payment = yield* await paymentSaga.execute({
      amount: inventory.output.total,
      method: input.paymentMethod,
    });

    const shipping = yield* await shippingSaga.execute({
      orderId: payment.output.orderId,
      address: input.shippingAddress,
    });

    // Mix saga results with plain Result-returning functions
    const notification = yield* await sendConfirmation({
      email: input.email,
      trackingNumber: shipping.output.trackingNumber,
    });

    return ok({
      orderId: payment.output.orderId,
      trackingNumber: shipping.output.trackingNumber,
      notificationId: notification.id,
    });
  });
}
```

#### Error Mapping Between Saga and Application Layers

Saga errors carry full diagnostic context (`SagaError` with `executionId`, `stepName`, `completedSteps`, etc.) that is valuable for logging but too detailed for API responses. Use `mapErr` before `yield*` to convert saga errors to application-layer errors:

```typescript
import { safeTry, ok, err } from "@hex-di/result";

type AppError =
  | { readonly _tag: "OrderFailed"; readonly message: string; readonly executionId: string }
  | { readonly _tag: "PaymentFailed"; readonly message: string; readonly retryable: boolean }
  | { readonly _tag: "InternalError"; readonly message: string };

function toOrderError(sagaError: SagaError<OrderStepErrors>): AppError {
  switch (sagaError._tag) {
    case "StepFailed":
      return {
        _tag: "OrderFailed",
        message: `Failed at ${sagaError.stepName}`,
        executionId: sagaError.executionId,
      };
    case "Timeout":
      return {
        _tag: "OrderFailed",
        message: "Order timed out",
        executionId: sagaError.executionId,
      };
    case "CompensationFailed":
      return { _tag: "InternalError", message: "Order failed with partial rollback" };
    default:
      return { _tag: "InternalError", message: "Unexpected saga failure" };
  }
}

async function handleOrder(input: OrderInput): Promise<Result<OrderResponse, AppError>> {
  return safeTry(async function* () {
    const saga = yield* await orderSaga.execute(input).mapErr(toOrderError);

    return ok({ orderId: saga.output.orderId, status: "confirmed" });
  });
}
```

#### When to Use safeTry vs. Saga Composition

| Scenario                                                 | Recommended approach                                |
| -------------------------------------------------------- | --------------------------------------------------- |
| Steps share compensation and transaction boundaries      | Saga composition via `.saga()` (see 18.6)           |
| Steps are independent sagas with separate compensation   | `safeTry` to coordinate results                     |
| Post-saga processing (enrichment, notification, mapping) | `safeTry` to chain after saga execution             |
| Conditional branching between saga calls                 | `safeTry` with `if` / `switch` inside the generator |
| Linear chain of two operations                           | `andThen` chain (simpler for short chains)          |

The key distinction: saga composition (`.saga()`) provides **transactional guarantees** -- if a later step fails, earlier sub-sagas compensate. `safeTry` provides **flow control** -- it short-circuits on error but does not trigger compensation of previously successful saga executions. When compensation across saga boundaries is needed, use saga composition. When you are simply consuming and transforming saga results, use `safeTry`.

---

_Next: [14 - Introspection](./14-introspection.md)_
