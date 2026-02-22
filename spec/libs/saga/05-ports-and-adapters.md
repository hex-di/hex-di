# 05 - Ports & Adapters

[Previous: 04 - Saga Definitions](./04-saga-definitions.md) | [Next: 06 - Compensation](./06-compensation.md)

---

## 7. Saga Ports

A **SagaPort** is a branded port that resolves to a `SagaExecutor` -- the domain interface through which the application starts saga executions. A separate **SagaManagementPort** resolves to a `SagaManagementExecutor` -- the infrastructure interface for resuming, cancelling, and querying executions. Both extend the base `Port` type from `@hex-di/core`, meaning saga ports participate in `GraphBuilder` validation, captive dependency checking, and all other compile-time guarantees.

> **Why the split?** The original `SagaExecutor` mixed a domain concern (`execute`) with infrastructure concerns (`resume`, `cancel`, `getStatus`, `listExecutions`). In hexagonal architecture, domain ports should expose only the capability that the domain needs -- starting a saga. Management operations (resumption, cancellation, status queries) are infrastructure concerns consumed by admin dashboards, CLI tools, and background workers. Separating them keeps each port focused on a single responsibility and lets the `GraphBuilder` enforce narrower dependency boundaries.

### 7.1 Type Definition

```typescript
declare const SagaPortSymbol: unique symbol;
declare const __sagaInputType: unique symbol;
declare const __sagaOutputType: unique symbol;
declare const __sagaErrorType: unique symbol;

interface SagaPort<TName extends string, TInput, TOutput, TError> extends Port<
  SagaExecutor<TInput, TOutput, TError>,
  TName
> {
  /** Runtime brand: identifies this as a SagaPort */
  readonly [SagaPortSymbol]: true;

  /**
   * Phantom: compile-time input type.
   * TOutput is recoverable from the Port base via InferService,
   * but TInput needs its own phantom slot because SagaExecutor<TInput, TOutput, TError>
   * only exposes TInput in the execute() parameter position (contravariant),
   * making it unreliable for conditional type extraction.
   */
  readonly [__sagaInputType]: TInput;

  /**
   * Phantom: compile-time output type.
   * Kept as a dedicated slot for symmetry and reliable extraction
   * via InferSagaPortOutput without unwrapping SagaSuccess.
   */
  readonly [__sagaOutputType]: TOutput;

  /**
   * Phantom: compile-time error type.
   * Allows reliable extraction via InferSagaPortError without
   * unwrapping the ResultAsync return type.
   */
  readonly [__sagaErrorType]: TError;
}
```

The `SagaManagementPort` carries only the output and error types (management operations do not accept new input -- they operate on existing executions identified by ID):

```typescript
declare const SagaManagementPortSymbol: unique symbol;

interface SagaManagementPort<TName extends string, TOutput, TError> extends Port<
  SagaManagementExecutor<TOutput, TError>,
  TName
> {
  /** Runtime brand: identifies this as a SagaManagementPort */
  readonly [SagaManagementPortSymbol]: true;

  /**
   * Phantom: compile-time output type.
   * Needed for reliable extraction via InferSagaManagementPortOutput
   * without unwrapping SagaSuccess from the resume() return type.
   */
  readonly [__sagaOutputType]: TOutput;

  /**
   * Phantom: compile-time error type.
   * Needed for reliable extraction via InferSagaManagementPortError.
   */
  readonly [__sagaErrorType]: TError;
}
```

The `SagaExecutor` is the **domain** service interface -- the only method it exposes is `execute`:

```typescript
interface SagaExecutor<TInput, TOutput, TError> {
  /** Start a new saga execution */
  execute(input: TInput): ResultAsync<SagaSuccess<TOutput>, SagaError<TError>>;
}
```

The `SagaManagementExecutor` is the **infrastructure** service interface for lifecycle management:

```typescript
interface SagaManagementExecutor<TOutput, TError> {
  /** Resume a previously persisted execution */
  resume(executionId: string): ResultAsync<SagaSuccess<TOutput>, SagaError<TError>>;

  /** Cancel a running execution and trigger compensation */
  cancel(executionId: string): ResultAsync<void, ManagementError>;

  /** Query the current status of an execution */
  getStatus(executionId: string): ResultAsync<SagaStatus, ManagementError>;

  /** List executions with optional filters */
  listExecutions(filters?: ExecutionFilters): ResultAsync<SagaExecutionSummary[], ManagementError>;
}
```

```typescript
/** Tagged union for management operation failures */
type ManagementError =
  | { readonly _tag: "ExecutionNotFound"; readonly executionId: string }
  | { readonly _tag: "InvalidOperation"; readonly message: string }
  | { readonly _tag: "PersistenceFailed"; readonly operation: string; readonly cause: unknown };
```

```typescript
type SagaStatusType = "pending" | "running" | "compensating" | "completed" | "failed" | "cancelled";

interface SagaStatus {
  readonly executionId: string;
  readonly status: SagaStatusType;
  readonly currentStep?: string;
  readonly completedSteps: readonly string[];
  readonly compensatedSteps: readonly string[];
  readonly startedAt: Date;
  readonly updatedAt: Date;
  readonly error?: SagaError<unknown>;
}

interface ExecutionFilters {
  readonly status?: SagaStatusType;
  readonly startedAfter?: Date;
  readonly startedBefore?: Date;
  readonly limit?: number;
}

interface SagaExecutionSummary {
  readonly executionId: string;
  readonly status: SagaStatusType;
  readonly startedAt: Date;
  readonly completedAt?: Date;
  readonly currentStep?: string;
}
```

### 7.1a Port Direction

Both `SagaPort` and `SagaManagementPort` use `"outbound"` direction. The application (domain layer) calls outward through these ports to trigger saga executions or manage them -- the saga runtime is an infrastructure concern invoked by the domain, making both ports outbound by convention.

- **`SagaPort`** -- `"outbound"`: the domain initiates a saga execution by calling `execute()` through the port
- **`SagaManagementPort`** -- `"outbound"`: infrastructure/admin code initiates management operations (`resume`, `cancel`, `getStatus`) through the port

This contrasts with `QueryPort` which uses `"inbound"` direction (the application receives data by calling a fetcher), and `FlowPort` which intentionally omits direction (bidirectional: events flow in, state flows out).

### 7.2 Factory Function

The `sagaPort` factory uses the curried generics pattern established by `createActivityPort` from
`@hex-di/flow` and the base `port()` factory from `@hex-di/core`. Type parameters that
TypeScript cannot infer (`TInput`, `TOutput`, `TError`) are explicit in the first call; the
configuration object is inferred in the second call.

```typescript
function sagaPort<TInput, TOutput, TError = never>(): <const TName extends string>(
  config: SagaPortConfig<TName>
) => SagaPort<TName, TInput, TOutput, TError>;

interface SagaPortConfig<TName extends string> {
  /** Unique port name -- becomes the identifier in the graph */
  readonly name: TName;

  /** Human-readable description for introspection */
  readonly description?: string;

  /** Custom metadata for tracing and diagnostics */
  readonly metadata?: Record<string, unknown>;
}
```

Why curried:

1. **First call** -- explicit type parameters: the saga input shape, output shape, and error shape
2. **Second call** -- inferred configuration: the name literal and optional metadata

```typescript
//        Stage 1: explicit types             Stage 2: inferred config
//        vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv  vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
const P = sagaPort<OrderIn, Out, OrderErr>()({ name: "OrderSaga", description: "..." });
//                                              ^^
//                                      curried boundary
```

The `sagaManagementPort` factory follows the same curried pattern, but only requires `TOutput` and `TError` since management operations do not accept new saga input:

```typescript
function sagaManagementPort<TOutput, TError = never>(): <const TName extends string>(
  config: SagaPortConfig<TName>
) => SagaManagementPort<TName, TOutput, TError>;
```

```typescript
//              Stage 1: explicit types       Stage 2: inferred config
//              vvvvvvvvvvvvvvvvvvvvvvvvvvvv  vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv
const M = sagaManagementPort<Out, OutErr>()({ name: "OrderSagaManagement", description: "..." });
//                                              ^^
//                                      curried boundary
```

### 7.3 Examples

```typescript
// Order processing saga port
const OrderSagaPort = sagaPort<OrderInput, OrderOutput, OrderError>()({
  name: "OrderSaga",
  description: "Processes customer orders through validation, payment, and fulfillment",
  metadata: { domain: "commerce", priority: "critical" },
});

// Payment saga port
const PaymentSagaPort = sagaPort<
  { amount: number; method: "card" | "bank" | "crypto" },
  { transactionId: string },
  PaymentError
>()({
  name: "PaymentSaga",
  description: "Handles payment processing across multiple payment providers",
});

// User onboarding saga port (no custom error -- defaults to never)
const OnboardingSagaPort = sagaPort<
  { email: string; plan: "free" | "pro" | "enterprise" },
  { userId: string; welcomeEmailSent: boolean }
>()({
  name: "OnboardingSaga",
  metadata: { domain: "identity", sla: "30s" },
});
```

Management ports for the same sagas:

```typescript
// Management port for the order saga
const OrderSagaManagementPort = sagaManagementPort<OrderOutput, OrderError>()({
  name: "OrderSagaManagement",
  description: "Admin operations for order saga executions",
});

// Management port for the payment saga
const PaymentSagaManagementPort = sagaManagementPort<{ transactionId: string }, PaymentError>()({
  name: "PaymentSagaManagement",
});
```

### 7.4 Type Inference Utilities

Following the `NotAPortError<T>` pattern from `@hex-di/core`, all inference utilities return structured branded error objects instead of `never` when given a non-SagaPort input. The object shape (`__errorBrand`, `__message`, `__received`, `__hint`) produces readable IDE tooltips when the error propagates.

```typescript
type NotASagaPortError<T> = {
  readonly __errorBrand: "NotASagaPortError";
  readonly __message: "Expected a SagaPort type created with sagaPort()";
  readonly __received: T;
  readonly __hint: "Use InferSagaPortInput<typeof YourPort>, not InferSagaPortInput<YourPort>";
};

/** Extract the input type from a SagaPort */
type InferSagaPortInput<T> = [T] extends [SagaPort<string, infer TInput, unknown, unknown>]
  ? TInput
  : NotASagaPortError<T>;

/** Extract the output type from a SagaPort */
type InferSagaPortOutput<T> = [T] extends [SagaPort<string, unknown, infer TOutput, unknown>]
  ? TOutput
  : NotASagaPortError<T>;

/** Extract the error type from a SagaPort */
type InferSagaPortError<T> = [T] extends [SagaPort<string, unknown, unknown, infer TError>]
  ? TError
  : NotASagaPortError<T>;

/** Extract the name literal type from a SagaPort */
type InferSagaPortName<T> = [T] extends [SagaPort<infer TName, unknown, unknown, unknown>]
  ? TName
  : NotASagaPortError<T>;
```

Usage:

```typescript
type Input = InferSagaPortInput<typeof OrderSagaPort>; // OrderInput
type Output = InferSagaPortOutput<typeof OrderSagaPort>; // OrderOutput
type Err = InferSagaPortError<typeof OrderSagaPort>; // OrderError
type Name = InferSagaPortName<typeof OrderSagaPort>; // "OrderSaga"
```

Type guard:

```typescript
function isSagaPort(value: unknown): value is SagaPort<string, unknown, unknown, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    SagaPortSymbol in value &&
    value[SagaPortSymbol] === true
  );
}
```

Inference utilities for `SagaManagementPort`:

```typescript
type NotASagaManagementPortError<T> = {
  readonly __errorBrand: "NotASagaManagementPortError";
  readonly __message: "Expected a SagaManagementPort type created with sagaManagementPort()";
  readonly __received: T;
  readonly __hint: "Use InferSagaManagementPortOutput<typeof YourPort>, not InferSagaManagementPortOutput<YourPort>";
};

/** Extract the output type from a SagaManagementPort */
type InferSagaManagementPortOutput<T> = [T] extends [
  SagaManagementPort<string, infer TOutput, unknown>,
]
  ? TOutput
  : NotASagaManagementPortError<T>;

/** Extract the error type from a SagaManagementPort */
type InferSagaManagementPortError<T> = [T] extends [
  SagaManagementPort<string, unknown, infer TError>,
]
  ? TError
  : NotASagaManagementPortError<T>;

/** Extract the name literal type from a SagaManagementPort */
type InferSagaManagementPortName<T> = [T] extends [
  SagaManagementPort<infer TName, unknown, unknown>,
]
  ? TName
  : NotASagaManagementPortError<T>;
```

Type guard:

```typescript
function isSagaManagementPort(
  value: unknown
): value is SagaManagementPort<string, unknown, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    SagaManagementPortSymbol in value &&
    value[SagaManagementPortSymbol] === true
  );
}
```

---

## 8. Saga Adapters

A **SagaAdapter** binds a `SagaDefinition` to a `SagaPort`, producing a standard HexDI `Adapter` that the `GraphBuilder` can validate and the container can resolve. A **SagaManagementAdapter** does the same for a `SagaManagementPort`. The adapter's factory wires the saga runtime, resolves step dependencies through the container, and optionally connects a persistence backend.

### 8.1 Type Definition

```typescript
declare const SagaAdapterSymbol: unique symbol;

interface SagaAdapter<P extends SagaPort<string, unknown, unknown, unknown>> extends Adapter<
  P,
  TupleToUnion<TRequires>,
  TLifetime,
  "sync",
  false,
  TRequires
> {
  /** Runtime brand: identifies this as a SagaAdapter */
  readonly [SagaAdapterSymbol]: true;

  /** The saga definition this adapter executes */
  readonly saga: SagaDefinition<
    string,
    InferSagaPortInput<P>,
    InferSagaPortOutput<P>,
    readonly StepDefinition<string, unknown, unknown, unknown, unknown, Port<string, unknown>>[],
    InferSagaPortError<P>
  >;
}
```

The `SagaAdapter` follows the same structural contract as `FlowAdapter` and `QueryAdapter`: it is a standard `Adapter` with additional metadata (the saga definition reference) for introspection and devtools.

### 8.2 Factory Function

```typescript
function createSagaAdapter<
  P extends SagaPort<string, unknown, unknown, unknown>,
  const TRequires extends readonly Port<unknown, string>[] = readonly [],
>(port: P, config: SagaAdapterConfig<P, TRequires>): SagaAdapter<P>;

interface SagaAdapterConfig<
  P extends SagaPort<string, unknown, unknown, unknown>,
  TRequires extends readonly Port<unknown, string>[],
> {
  /** The saga definition to execute when this port is resolved */
  readonly saga: SagaDefinition<
    string,
    InferSagaPortInput<P>,
    InferSagaPortOutput<P>,
    readonly StepDefinition<string, unknown, unknown, unknown, unknown, Port<string, unknown>>[],
    InferSagaPortError<P>
  >;

  /**
   * Additional ports required by the adapter beyond step dependencies.
   * Step dependencies (ports referenced by steps) are resolved automatically.
   * Use this for infrastructure ports like loggers, persisters, etc.
   *
   * When persistence is needed, include `SagaPersisterPort` in this array.
   * It is resolved as a normal dependency through the standard `deps` mechanism
   * and passed to the saga runtime for checkpointing -- no brand-symbol scanning
   * or special detection is involved.
   */
  readonly requires?: TRequires;

  /**
   * Lifetime scope. Default: "scoped".
   *
   * Scoped is the default because saga executors commonly depend on scoped
   * ports (request context, auth tokens, tenant IDs). The captive dependency
   * rule requires the adapter to be scoped or transient when any of its
   * dependencies are scoped; defaulting to scoped avoids a class of
   * runtime errors where a singleton executor captures a stale scoped
   * dependency.
   *
   * | Lifetime    | When to Use                                                  |
   * |-------------|--------------------------------------------------------------|
   * | "scoped"    | Default. One executor per scope; safe with scoped deps       |
   * | "singleton" | Stateless executor with no scoped dependencies               |
   * | "transient" | Rare. Each resolution creates a fresh executor instance      |
   */
  readonly lifetime?: Lifetime;
}
```

Design notes:

- The first argument is the port (not nested in config) to enable type inference of `P` without explicit annotation
- Step dependencies are discovered automatically by walking the saga definition's steps and collecting their ports; they do not need to be listed in `requires`
- Persistence is a standard port in `requires`, resolved through the same dependency mechanism as any other port. The saga adapter's factory receives the resolved `SagaPersister` instance in its `deps` object and passes it to the `SagaRunner`. No brand-symbol scanning or special-cased detection is used -- `SagaPersisterPort` is treated identically to `LoggerPort` or any other infrastructure dependency

### 8.3 Examples

#### Basic Adapter

```typescript
const OrderSagaAdapter = createSagaAdapter(OrderSagaPort, {
  saga: OrderSaga,
});
```

The adapter collects all ports referenced by `OrderSaga`'s steps (`InventoryPort`, `PaymentPort`, `ShippingPort`, `NotificationPort`) and includes them as implicit dependencies. The `GraphBuilder` validates that adapters for all of these ports are present in the graph.

#### Adapter with Persistence (Singleton Override)

```typescript
const OrderSagaAdapter = createSagaAdapter(OrderSagaPort, {
  saga: OrderSaga,
  requires: [SagaPersisterPort, LoggerPort],
  lifetime: "singleton", // Override: safe because all dependencies are also singletons
});
```

When `SagaPersisterPort` is included in `requires`, the runtime serializes saga state (current step, accumulated results, compensation history) after each step completes. On `resume()` (via the management port), it rehydrates state from the persister and continues from the last checkpoint. The explicit `lifetime: "singleton"` override is valid here because neither `SagaPersisterPort` nor `LoggerPort` are scoped -- the captive dependency rule is satisfied.

#### Scoped Adapter (Default)

```typescript
const OnboardingSagaAdapter = createSagaAdapter(OnboardingSagaPort, {
  saga: OnboardingSaga,
  requires: [RequestContextPort],
  // lifetime defaults to "scoped" -- no override needed
});
```

Because `"scoped"` is the default, adapters that depend on scoped ports like `RequestContextPort` (carrying authentication tokens, tenant IDs, or request-scoped state) do not need an explicit lifetime annotation. The captive dependency rule is automatically satisfied.

### 8.4 Graph Registration

Saga adapters compose in the `GraphBuilder` alongside infrastructure and domain adapters:

```typescript
// --- Infrastructure adapters ---
const HttpClientAdapter = createAdapter(HttpClientPort, {
  /* ... */
});
const PostgresPersisterAdapter = createAdapter(SagaPersisterPort, {
  /* ... */
});
const LoggerAdapter = createAdapter(LoggerPort, {
  /* ... */
});

// --- Domain adapters (used by saga steps) ---
const RestInventoryAdapter = createAdapter(InventoryPort, {
  /* ... */
});
const StripePaymentAdapter = createAdapter(PaymentPort, {
  /* ... */
});
const FedExShippingAdapter = createAdapter(ShippingPort, {
  /* ... */
});
const EmailNotificationAdapter = createAdapter(NotificationPort, {
  /* ... */
});

// --- Saga adapters (domain) ---
const OrderSagaAdapter = createSagaAdapter(OrderSagaPort, {
  saga: OrderSaga,
  requires: [SagaPersisterPort, LoggerPort],
});

const PaymentSagaAdapter = createSagaAdapter(PaymentSagaPort, {
  saga: PaymentSaga,
});

// --- Saga management adapters (infrastructure) ---
const OrderSagaManagementAdapter = createSagaAdapter(OrderSagaManagementPort, {
  saga: OrderSaga,
  requires: [SagaPersisterPort, LoggerPort],
});

// --- Build graph and container ---
const graph = GraphBuilder.create()
  // Infrastructure
  .provide(HttpClientAdapter)
  .provide(PostgresPersisterAdapter)
  .provide(LoggerAdapter)
  // Domain
  .provide(RestInventoryAdapter)
  .provide(StripePaymentAdapter)
  .provide(FedExShippingAdapter)
  .provide(EmailNotificationAdapter)
  // Sagas (domain)
  .provide(OrderSagaAdapter)
  .provide(PaymentSagaAdapter)
  // Sagas (management -- only needed if admin/CLI features are required)
  .provide(OrderSagaManagementAdapter)
  .build();

const container = createContainer(graph);

// --- Domain code: resolve and execute ---
const orderSaga = container.resolve(OrderSagaPort);

const result = await orderSaga.execute({
  orderId: "order-789",
  userId: "user-123",
  items: [{ productId: "widget-1", quantity: 2 }],
  paymentMethod: "card",
  shippingAddress: { street: "123 Main St", city: "Springfield" },
});

result.match(
  success => {
    console.log("Order placed:", success.output.trackingNumber);
  },
  error => {
    console.error("Order failed:", error._tag);
    if (error._tag === "StepFailed") {
      console.log("Compensated steps:", error.compensatedSteps.join(", "));
    }
  }
);

// --- Admin code: resolve management port for lifecycle operations ---
const orderSagaAdmin = container.resolve(OrderSagaManagementPort);

const statusResult = await orderSagaAdmin.getStatus("exec-abc-123");

statusResult.match(
  status => {
    console.log("Execution status:", status.status, "at step:", status.currentStep);
  },
  error => {
    switch (error._tag) {
      case "ExecutionNotFound":
        console.error("Execution not found:", error.executionId);
        break;
      case "InvalidOperation":
        console.error("Invalid operation:", error.message);
        break;
      case "PersistenceFailed":
        console.error("Persistence failed during:", error.operation, error.cause);
        break;
    }
  }
);

const listResult = await orderSagaAdmin.listExecutions({ status: "failed", limit: 10 });

listResult.match(
  executions => {
    for (const exec of executions) {
      orderSagaAdmin.resume(exec.executionId);
    }
  },
  error => {
    console.error("Failed to list executions:", error._tag);
  }
);
```

If any step adapter is missing from the graph, `GraphBuilder` reports a compile-time error -- the same validation that applies to all HexDI adapters. Saga adapters do not introduce any new graph validation rules; they compose using the existing infrastructure. Management ports are optional -- applications that do not need admin operations simply omit the management adapter from the graph.

---

[Previous: 04 - Saga Definitions](./04-saga-definitions.md) | [Next: 06 - Compensation](./06-compensation.md)
