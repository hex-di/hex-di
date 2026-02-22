# 03 - Step Definitions

[Previous: 02 - Core Concepts](./02-core-concepts.md) | [Next: 04 - Saga Definitions](./04-saga-definitions.md)

---

## 5. Step Definitions

A **StepDefinition** is the atomic building block of a saga. Each step declares which port to invoke, how to map the saga context into port input, how to compensate on failure, and optional execution policies like retry, timeout, and conditional gating.

### 5.1 Type Definition

```typescript
interface StepDefinition<
  TName extends string,
  TInput,
  TAccumulated,
  TOutput,
  TError,
  TPort extends Port<string, unknown>,
> {
  /** Unique step name, used as the key in accumulated results */
  readonly name: TName;

  /** Port to invoke for the forward action */
  readonly port: TPort;

  /** Map saga context to port input for the forward invocation */
  readonly invoke: (ctx: StepContext<TInput, TAccumulated>) => PortInput<TPort>;

  /** Map saga context to port input for the compensation invocation (optional) */
  readonly compensate?: (
    ctx: CompensationContext<TInput, TAccumulated, TOutput, TError>
  ) => PortInput<TPort>;

  /** Predicate controlling whether this step executes (optional) */
  readonly condition?: (ctx: StepContext<TInput, TAccumulated>) => boolean;

  /** Step configuration options */
  readonly options?: StepOptions<TError>;
}
```

```typescript
interface StepOptions<TError = unknown> {
  /** Retry configuration for transient failures */
  retry?: RetryConfig<TError>;

  /** Timeout in milliseconds for the forward invocation */
  timeout?: number;

  /** When true, this step is excluded from compensation on saga failure */
  skipCompensation?: boolean;

  /** Custom metadata attached to tracing spans */
  metadata?: Record<string, unknown>;
}
```

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

### 5.2 Builder API

The step builder uses a fluent interface with progressive type narrowing. Three required calls -- `io()`, `invoke()`, `build()` -- provide the minimum for a working step. Optional methods like `compensate()`, `when()`, `retry()`, and `timeout()` can be chained before `build()`.

**Entry point:**

```typescript
function defineStep<TName extends string>(name: TName): StepBuilder<TName>;
```

**Stage 1 -- StepBuilder** (name declared, awaiting I/O types):

```typescript
interface StepBuilder<TName extends string> {
  /** Declare input, output, and optional error types for this step */
  io<TInput, TOutput, TError = never>(): StepBuilderWithIO<TName, TInput, TOutput, TError>;
}
```

The `TError` parameter defaults to `never`, meaning steps that do not declare an error type contribute nothing to the saga's accumulated error union. This enables progressive adoption -- existing steps without explicit error types work unchanged.

**Stage 2 -- StepBuilderWithIO** (I/O declared, awaiting port + mapper):

```typescript
interface StepBuilderWithIO<TName extends string, TInput, TOutput, TError> {
  /** Specify which port to invoke and how to map context to port input */
  invoke<TPort extends Port<string, unknown>>(
    port: TPort,
    mapper: (ctx: StepContext<TInput, unknown>) => PortInput<TPort>
  ): StepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort>;
}
```

**Stage 3 -- StepBuilderWithInvocation** (port + mapper set, compensation and options available):

```typescript
interface StepBuilderWithInvocation<
  TName extends string,
  TInput,
  TOutput,
  TError,
  TPort extends Port<string, unknown>,
> {
  /** Define the compensation logic for rollback */
  compensate(
    mapper: (ctx: CompensationContext<TInput, unknown, TOutput, TError>) => PortInput<TPort>
  ): StepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort>;

  /** Mark this step as not requiring compensation */
  skipCompensation(): StepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort>;

  /** Add a condition predicate; step is skipped when predicate returns false */
  when(
    predicate: (ctx: StepContext<TInput, unknown>) => boolean
  ): StepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort>;

  /** Configure retry behavior for transient failures */
  retry(
    config: RetryConfig<TError>
  ): StepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort>;

  /** Set a timeout in milliseconds for the forward invocation */
  timeout(ms: number): StepBuilderWithInvocation<TName, TInput, TOutput, TError, TPort>;

  /** Build the final StepDefinition */
  build(): StepDefinition<TName, TInput, unknown, TOutput, TError, TPort>;
}
```

**Builder chain summary:**

```
defineStep(name)
  .io<TInput, TOutput, TError?>()  --> StepBuilder           -> StepBuilderWithIO
  .invoke(port, mapper)             --> StepBuilderWithIO      -> StepBuilderWithInvocation
  .compensate(mapper)               --> (chainable at stage 3)
    OR .skipCompensation()          --> (chainable at stage 3)
  .when(predicate)                  --> (chainable at stage 3)
  .retry(config)                    --> (chainable at stage 3)
  .timeout(ms)                      --> (chainable at stage 3)
  .build()                          --> StepDefinition
```

### 5.3 Examples

#### 5.3.1 Basic Step with Compensation

Reserve inventory and release it on rollback. This is the most common pattern: a forward action paired with a compensating action that undoes the effect.

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

#### 5.3.2 Step without Compensation

Send a notification. Notifications are fire-and-forget; there is no meaningful way to "unsend" one, so compensation is explicitly skipped.

```typescript
const NotifyUserStep = defineStep("NotifyUser")
  .io<{ userId: string; orderId: string }, { notificationId: string }>()
  .invoke(NotificationPort, ctx => ({
    userId: ctx.input.userId,
    template: "order_shipped",
    data: { trackingNumber: ctx.results.ShipOrder.trackingNumber },
  }))
  .skipCompensation() // Notifications don't need rollback
  .build();
```

#### 5.3.3 Conditional Step

Apply a discount only when the user provides a discount code. The `.when()` predicate gates execution; when it returns `false`, the step is skipped entirely and produces no output in the accumulated results.

```typescript
const ApplyDiscountStep = defineStep("ApplyDiscount")
  .io<{ discountCode?: string }, { discountAmount: number }>()
  .invoke(PricingPort, ctx => ({
    code: ctx.input.discountCode!,
    subtotal: ctx.results.CalculateTotal.subtotal,
  }))
  .when(ctx => ctx.input.discountCode !== undefined) // Only run if discount provided
  .compensate(ctx => ({
    action: "void",
    discountId: ctx.stepResult.discountId,
  }))
  .build();
```

#### 5.3.4 Step with Typed Error and Retry

Charge a payment with resilience against transient network failures. The error type `PaymentDeclinedError | PaymentTimeoutError` flows through the `RetryConfig`, enabling typed predicates in `retryIf`. Uses exponential backoff capped at 10 seconds, only retries timeout errors, and enforces a 30-second timeout. The `idempotencyKey` derived from `executionId` ensures that retries do not produce duplicate charges.

```typescript
const ChargePaymentStep = defineStep("ChargePayment")
  .io<
    { amount: number; paymentMethod: string },
    { transactionId: string },
    PaymentDeclinedError | PaymentTimeoutError
  >()
  .invoke(PaymentPort, ctx => ({
    amount: ctx.results.CalculateTotal.total,
    method: ctx.input.paymentMethod,
    idempotencyKey: ctx.executionId,
  }))
  .compensate(ctx => ({
    action: "refund",
    transactionId: ctx.stepResult.transactionId,
  }))
  .retry({
    maxAttempts: 3,
    delay: attempt => Math.min(1000 * Math.pow(2, attempt), 10000), // Exponential backoff
    retryIf: error => error._tag === "PaymentTimeout", // Only retry timeouts, not declines
  })
  .timeout(30000) // 30 second timeout
  .build();
```

#### 5.3.5 Step Using Previous Results

Ship an order by combining data from multiple earlier steps. The `ctx.results` map provides type-safe access to the outputs of all previously completed steps, keyed by step name.

```typescript
const ShipOrderStep = defineStep("ShipOrder")
  .io<{ shippingAddress: Address }, { trackingNumber: string; carrier: string }>()
  .invoke(ShippingPort, ctx => ({
    // Use results from previous steps
    reservationId: ctx.results.ReserveStock.reservationId,
    transactionId: ctx.results.ChargePayment.transactionId,
    address: ctx.input.shippingAddress,
  }))
  .compensate(ctx => ({
    action: "cancelShipment",
    trackingNumber: ctx.stepResult.trackingNumber,
  }))
  .build();
```

### 5.4 Type Inference Utilities

Utility types for extracting type information from a `StepDefinition`. These are used internally by the saga builder to compute accumulated result types, accumulated error types, and validate step compatibility.

Following the `NotAPortError<T>` pattern from `@hex-di/core`, all inference utilities return structured branded error objects instead of `never` when given an invalid input. The object shape (`__errorBrand`, `__message`, `__received`, `__hint`) produces readable IDE tooltips when the error propagates.

```typescript
/** Structured error type for invalid StepDefinition inputs */
type NotAStepDefinitionError<T> = {
  readonly __errorBrand: "NotAStepDefinitionError";
  readonly __message: "Expected a StepDefinition type created with defineStep().build()";
  readonly __received: T;
  readonly __hint: "Use InferStepOutput<typeof YourStep>, not InferStepOutput<YourStep>";
};

/** Extract the step name literal type */
type InferStepName<S> =
  S extends StepDefinition<infer N, unknown, unknown, unknown, unknown, unknown>
    ? N
    : NotAStepDefinitionError<S>;

/** Extract the step output type */
type InferStepOutput<S> =
  S extends StepDefinition<string, unknown, unknown, infer O, unknown, unknown>
    ? O
    : NotAStepDefinitionError<S>;

/** Extract the step input type */
type InferStepInput<S> =
  S extends StepDefinition<string, infer I, unknown, unknown, unknown, unknown>
    ? I
    : NotAStepDefinitionError<S>;

/** Extract the step error type */
type InferStepError<S> =
  S extends StepDefinition<string, unknown, unknown, unknown, infer E, unknown>
    ? E
    : NotAStepDefinitionError<S>;

/** Extract the port type used by the step */
type InferStepPort<S> =
  S extends StepDefinition<string, unknown, unknown, unknown, unknown, infer P>
    ? P
    : NotAStepDefinitionError<S>;
```

The `AnyStepDefinition` type alias erases all type parameters for use in generic contexts:

```typescript
type AnyStepDefinition = StepDefinition<
  string,
  unknown,
  unknown,
  unknown,
  unknown,
  Port<string, unknown>
>;
```

### 5.5 Compile-Time Port Collection

The type system collects all ports referenced by a tuple of step definitions. This enables the saga adapter to automatically discover its port dependencies and the `GraphBuilder` to validate that all required ports have adapters.

```typescript
/** Recursively collect port types from a tuple of step definitions */
type CollectStepPorts<TSteps extends readonly AnyStepDefinition[]> = TSteps extends readonly [
  infer Head extends AnyStepDefinition,
  ...infer Tail extends readonly AnyStepDefinition[],
]
  ? InferStepPort<Head> | CollectStepPorts<Tail>
  : never;

/** Validate that all ports required by saga steps are provided in the graph */
type ValidateSagaPorts<
  TSteps extends readonly AnyStepDefinition[],
  TProvided extends Port<unknown, string>,
> =
  Exclude<CollectStepPorts<TSteps>, TProvided> extends never
    ? true
    : MissingSagaStepPortsError<Exclude<CollectStepPorts<TSteps>, TProvided>>;

/** Structured error listing which step ports are missing from the graph */
type MissingSagaStepPortsError<TMissing> = {
  readonly __errorBrand: "MissingSagaStepPortsError";
  readonly __message: "Ports required by saga steps are missing from the graph";
  readonly __received: TMissing;
  readonly __hint: "Register adapters for these ports in the GraphBuilder";
};
```

Usage:

```typescript
// At graph build time, the type system checks:
type Check = ValidateSagaPorts<
  (typeof OrderSaga)["steps"],
  typeof InventoryPort | typeof PaymentPort | typeof ShippingPort | typeof NotificationPort
>;
// Check = true (all ports provided)

type CheckMissing = ValidateSagaPorts<
  (typeof OrderSaga)["steps"],
  typeof InventoryPort | typeof PaymentPort
>;
// CheckMissing = "ERROR: The following ports required by saga steps are missing
//                 from the graph: ShippingPort | NotificationPort. Register
//                 adapters for these ports in the GraphBuilder."
```

---

[Previous: 02 - Core Concepts](./02-core-concepts.md) | [Next: 04 - Saga Definitions](./04-saga-definitions.md)
