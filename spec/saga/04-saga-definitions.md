# 04 - Saga Definitions

[Previous: 03 - Step Definitions](./03-step-definitions.md) | [Next: 05 - Ports & Adapters](./05-ports-and-adapters.md)

---

## 6. Saga Definitions

### 6.1 Type Definition

```typescript
interface SagaDefinition<
  TName extends string,
  TInput,
  TOutput,
  TSteps extends readonly AnyStepDefinition[],
  TErrors,
> {
  /** Unique saga name */
  readonly name: TName;

  /** Ordered list of steps */
  readonly steps: TSteps;

  /** Map accumulated results to saga output */
  readonly outputMapper: (results: AccumulatedResults<TSteps>) => TOutput;

  /** Saga configuration options */
  readonly options?: SagaOptions;
}

interface SagaOptions {
  /** How to handle compensation failures */
  compensationStrategy: "sequential" | "parallel" | "best-effort";

  /** Enable persistence for resumption */
  persistent?: boolean;

  /** Maximum concurrent steps (for parallel sections) */
  maxConcurrency?: number;

  /** Global timeout for entire saga in ms */
  timeout?: number;

  /** Cross-cutting hooks for step execution (see §18.7) */
  hooks?: SagaHooks;

  /** Custom metadata for tracing */
  metadata?: Record<string, unknown>;
}

/** Shorthand for a step definition with erased type parameters */
type AnyStepDefinition = StepDefinition<
  string,
  unknown,
  unknown,
  unknown,
  unknown,
  Port<string, unknown>
>;

/** Shorthand for a saga definition with erased type parameters */
type AnySagaDefinition = SagaDefinition<
  string,
  unknown,
  unknown,
  readonly AnyStepDefinition[],
  unknown
>;

/** Compute accumulated results type from steps */
type AccumulatedResults<TSteps extends readonly AnyStepDefinition[]> = {
  [S in TSteps[number] as InferStepName<S>]: InferStepOutput<S>;
};

/** Compute the union of all step error types from a tuple of step definitions.
 *  Steps that default TError to `never` contribute nothing to the union. */
type AccumulatedErrors<TSteps extends readonly AnyStepDefinition[]> = InferStepError<
  TSteps[number]
>;
```

#### Branch Type Safety

When a saga branches, only one branch executes at runtime. The type system must reflect this -- subsequent steps cannot assume any particular branch's results exist. Branch outcomes are wrapped in a `BranchStepDefinition` that produces optional results with a discriminant.

```typescript
/**
 * A synthetic step definition representing a branch outcome.
 * Only one branch executes at runtime, so each branch step's output
 * is `T | undefined`. The `selectedBranch` field tells which branch ran.
 *
 * The error type parameter unions all error types from every branch path,
 * since the runtime cannot statically know which branch will execute.
 */
type BranchStepDefinition<
  TKey extends string,
  TBranches extends Record<TKey, readonly AnyStepDefinition[]>,
> = StepDefinition<
  "__branch",
  unknown,
  unknown,
  BranchAccumulatedResults<TKey, TBranches>,
  BranchAccumulatedErrors<TKey, TBranches>,
  never
>;

/**
 * Accumulated results from a branch: every step from every branch
 * appears, but outputs are `T | undefined` since only one branch runs.
 * Includes `__selectedBranch: TKey` for runtime discrimination.
 */
type BranchAccumulatedResults<
  TKey extends string,
  TBranches extends Record<TKey, readonly AnyStepDefinition[]>,
> = {
  readonly __selectedBranch: TKey;
} & {
  [K in TBranches[TKey][number] as InferStepName<K>]?: InferStepOutput<K>;
};

/**
 * Union of all step error types across every branch path.
 * Since only one branch runs at runtime, the type must be wide enough
 * to capture whichever branch was selected.
 */
type BranchAccumulatedErrors<
  TKey extends string,
  TBranches extends Record<TKey, readonly AnyStepDefinition[]>,
> = AccumulatedErrors<TBranches[TKey]>;
```

### 6.2 Builder API

```typescript
function defineSaga<TName extends string>(name: TName): SagaBuilder<TName>;

interface SagaBuilder<TName extends string> {
  /** Declare saga input type */
  input<TInput>(): SagaBuilderWithInput<TName, TInput, [], never>;
}

interface SagaBuilderWithInput<
  TName extends string,
  TInput,
  TSteps extends readonly AnyStepDefinition[],
  TErrors,
> {
  /** Add a step to the saga.
   *  Appends the step to `TSteps` and unions its error type into `TErrors`:
   *  `AccumulatedErrors<[...TSteps, S]>` = `AccumulatedErrors<TSteps> | InferStepError<S>` */
  step<
    S extends StepDefinition<
      string,
      TInput,
      AccumulatedResults<TSteps>,
      unknown,
      unknown,
      Port<string, unknown>
    >,
  >(
    step: S
  ): SagaBuilderWithInput<TName, TInput, [...TSteps, S], TErrors | InferStepError<S>>;

  /** Add parallel steps (all execute concurrently).
   *  Spreads all parallel steps into `TSteps` at once and unions all their error types into `TErrors`. */
  parallel<
    PSteps extends readonly StepDefinition<
      string,
      TInput,
      AccumulatedResults<TSteps>,
      unknown,
      unknown,
      Port<string, unknown>
    >[],
  >(
    steps: PSteps
  ): SagaBuilderWithInput<
    TName,
    TInput,
    [...TSteps, ...PSteps],
    TErrors | AccumulatedErrors<PSteps>
  >;

  /** Add a branch based on condition.
   *  Unions error types from all branch paths into `TErrors`, since the
   *  runtime cannot statically know which branch will execute. */
  branch<
    TKey extends string,
    TBranches extends Record<
      TKey,
      readonly StepDefinition<
        string,
        TInput,
        AccumulatedResults<TSteps>,
        unknown,
        unknown,
        Port<string, unknown>
      >[]
    >,
  >(
    selector: (ctx: StepContext<TInput, AccumulatedResults<TSteps>>) => TKey,
    branches: TBranches
  ): SagaBuilderWithInput<
    TName,
    TInput,
    [...TSteps, BranchStepDefinition<TKey, TBranches>],
    TErrors | BranchAccumulatedErrors<TKey, TBranches>
  >;

  /** Invoke another saga as a step */
  saga<TSaga extends AnySagaDefinition>(
    saga: TSaga,
    mapper: (ctx: StepContext<TInput, AccumulatedResults<TSteps>>) => InferSagaInput<TSaga>
  ): SagaBuilderWithInput<
    TName,
    TInput,
    [
      ...TSteps,
      StepDefinition<
        InferSagaName<TSaga>,
        TInput,
        AccumulatedResults<TSteps>,
        InferSagaOutput<TSaga>,
        InferSagaErrors<TSaga>,
        SagaPort<string, unknown, unknown, unknown>
      >,
    ],
    TErrors | InferSagaErrors<TSaga>
  >;

  /** Define saga output from accumulated results.
   *  The mapper receives the fully typed `AccumulatedResults<TSteps>`.
   *  Error context is available via `TErrors` on the built `SagaDefinition`,
   *  enabling callers to handle all possible step errors in a typed manner
   *  (e.g., via `Result<SagaSuccess<TOutput>, SagaError<TErrors>>`). */
  output<TOutput>(
    mapper: (results: AccumulatedResults<TSteps>) => TOutput
  ): SagaBuilderWithOutput<TName, TInput, TOutput, TSteps, TErrors>;
}

interface SagaBuilderWithOutput<
  TName extends string,
  TInput,
  TOutput,
  TSteps extends readonly AnyStepDefinition[],
  TErrors,
> {
  /** Configure saga options */
  options(options: SagaOptions): SagaBuilderWithOutput<TName, TInput, TOutput, TSteps, TErrors>;

  /** Build the saga definition */
  build(): SagaDefinition<TName, TInput, TOutput, TSteps, TErrors>;
}
```

The key type-level mechanism is in the `.step()` method: it returns `SagaBuilderWithInput<TName, TInput, [...TSteps, S], TErrors | InferStepError<S>>`. Each call to `.step()` produces a new builder where `TSteps` is the previous tuple with the new step appended via variadic tuple spread, and `TErrors` grows by unioning the new step's error type. This is how the type system accumulates both step types and error types across the builder chain, ensuring `AccumulatedResults<TSteps>` and `AccumulatedErrors<TSteps>` grow with each step and that subsequent steps can reference previous step outputs in a fully type-safe manner.

The same tuple-spreading pattern applies to `.parallel()` (spreads all parallel steps at once and unions all their error types) and `.saga()` (appends a synthetic `StepDefinition` wrapping the sub-saga and unions the sub-saga's accumulated errors). For `.branch()`, a different strategy is used: all possible branch step outputs are collected into a single `BranchAccumulatedResults` type where every step result is `T | undefined`, and a `__selectedBranch` discriminant identifies which branch executed. Error types from all branch paths are unioned into `TErrors` because the runtime cannot statically know which branch will execute. This forces subsequent steps to narrow the branch before accessing results, preventing runtime access to non-existent outputs.

### 6.3 Examples

#### Linear Saga

```typescript
interface OrderInput {
  orderId: string;
  userId: string;
  items: Array<{ productId: string; quantity: number }>;
  paymentMethod: string;
  shippingAddress: Address;
}

interface OrderOutput {
  orderId: string;
  trackingNumber: string;
  transactionId: string;
}

const OrderSaga = defineSaga("OrderSaga")
  .input<OrderInput>()
  .step(ValidateOrderStep) // Step 1: Validate the order details
  .step(ReserveStockStep) // Step 2: Reserve inventory for each item
  .step(ChargePaymentStep) // Step 3: Charge the customer's payment method
  .step(ShipOrderStep) // Step 4: Create shipment and get tracking number
  .step(NotifyUserStep) // Step 5: Send order confirmation notification
  .output(results => ({
    // The output mapper receives fully typed AccumulatedResults.
    // The saga's TErrors parameter carries the union of all step error types,
    // so callers executing this saga get
    // Result<SagaSuccess<OrderOutput>, SagaError<TErrors>> where TErrors
    // includes every step's declared error type.
    orderId: results.ValidateOrder.orderId,
    trackingNumber: results.ShipOrder.trackingNumber,
    transactionId: results.ChargePayment.transactionId,
  }))
  .options({
    compensationStrategy: "sequential",
    persistent: true,
  })
  .build();

// Executing the saga returns a Result, not a SagaResult:
const result: Result<
  SagaSuccess<OrderOutput>,
  SagaError<InferSagaErrors<typeof OrderSaga>>
> = await sagaRuntime.execute(OrderSaga, orderInput);

result.match(
  success => console.log("Order placed:", success.output.trackingNumber),
  error => console.error("Order failed at step:", error.stepName)
);
```

#### Saga with Parallel Steps

```typescript
const FulfillmentSaga = defineSaga("FulfillmentSaga")
  .input<{ orderId: string }>()
  .step(GetOrderDetailsStep)
  // These three steps have no dependencies on each other, so they run concurrently.
  // All three steps' error types are unioned into the saga's accumulated errors.
  .parallel([PreparePackageStep, GenerateLabelStep, NotifyWarehouseStep])
  .step(DispatchStep)
  .output(results => ({
    dispatchId: results.Dispatch.dispatchId,
    trackingNumber: results.GenerateLabel.trackingNumber,
  }))
  .build();
```

#### Saga with Branching

```typescript
const PaymentSaga = defineSaga("PaymentSaga")
  .input<{ amount: number; method: "card" | "bank" | "crypto" }>()
  .step(ValidateAmountStep)
  // Error types from ALL branch paths are unioned into the saga's TErrors,
  // since the type system cannot know which branch will be selected at runtime.
  .branch(ctx => ctx.input.method, {
    card: [AuthorizeCardStep, CaptureCardStep],
    bank: [InitiateBankTransferStep, ConfirmBankTransferStep],
    crypto: [GenerateCryptoAddressStep, AwaitCryptoPaymentStep],
  })
  .step(RecordTransactionStep)
  .output(results => {
    // Branch results require narrowing -- only one branch executed
    const branch = results.__selectedBranch;
    const transactionRef =
      branch === "card"
        ? results.CaptureCard?.captureId
        : branch === "bank"
          ? results.ConfirmBankTransfer?.transferId
          : results.AwaitCryptoPayment?.txHash;

    return { transactionId: results.RecordTransaction.id, transactionRef };
  })
  .build();

// Executing returns Result<SagaSuccess<...>, SagaError<TErrors>> where TErrors
// unions errors from ValidateAmountStep, all card/bank/crypto branch steps,
// and RecordTransactionStep.
const result = await sagaRuntime.execute(PaymentSaga, { amount: 100, method: "card" });

if (result.isOk()) {
  console.log("Payment processed:", result.value.output.transactionId);
} else {
  // result.error is SagaError<AccumulatedErrors<typeof PaymentSaga["steps"]>>
  console.error("Payment failed:", result.error._tag);
}
```

#### Sub-Saga Composition

```typescript
const CheckoutSaga = defineSaga("CheckoutSaga")
  .input<CheckoutInput>()
  .step(CreateOrderStep)
  // Invoke PaymentSaga as a sub-saga step, mapping context to its input.
  // PaymentSaga's accumulated errors are unioned into CheckoutSaga's TErrors.
  .saga(PaymentSaga, ctx => ({
    amount: ctx.results.CreateOrder.total,
    method: ctx.input.paymentMethod,
  }))
  // Invoke FulfillmentSaga as a sub-saga step.
  // FulfillmentSaga's accumulated errors are also unioned into TErrors.
  .saga(FulfillmentSaga, ctx => ({
    orderId: ctx.results.CreateOrder.orderId,
  }))
  .step(SendConfirmationStep)
  .output(results => ({
    orderId: results.CreateOrder.orderId,
    confirmationNumber: results.SendConfirmation.confirmationNumber,
  }))
  .build();

// InferSagaErrors<typeof CheckoutSaga> includes errors from:
// CreateOrderStep, all PaymentSaga steps, all FulfillmentSaga steps, SendConfirmationStep
```

When a sub-saga is invoked via `.saga()`, the runtime executes the entire sub-saga as a single step. The sub-saga's output becomes the step result keyed by the sub-saga's name in `AccumulatedResults`. The sub-saga's accumulated errors are unioned into the parent saga's `TErrors`. If the parent saga needs to compensate, the sub-saga's own compensation chain is triggered as the compensation for that step.

### 6.4 Type Inference Utilities

Following the `NotAPortError<T>` pattern from `@hex-di/core`, saga inference utilities return structured error objects instead of `never`:

```typescript
/** Structured error type for invalid SagaDefinition inputs.
 *  Follows the NotAPortError<T> pattern: an object with branded fields
 *  that produce readable IDE tooltips when the error propagates. */
type NotASagaDefinitionError<T> = {
  readonly __errorBrand: "NotASagaDefinitionError";
  readonly __message: "Expected a SagaDefinition type created with defineSaga().build()";
  readonly __received: T;
  readonly __hint: "Use InferSagaInput<typeof YourSaga>, not InferSagaInput<YourSaga>";
};

/** Extract saga name */
type InferSagaName<S> =
  S extends SagaDefinition<infer N, unknown, unknown, unknown, unknown>
    ? N
    : NotASagaDefinitionError<S>;

/** Extract saga input type */
type InferSagaInput<S> =
  S extends SagaDefinition<string, infer I, unknown, unknown, unknown>
    ? I
    : NotASagaDefinitionError<S>;

/** Extract saga output type */
type InferSagaOutput<S> =
  S extends SagaDefinition<string, unknown, infer O, unknown, unknown>
    ? O
    : NotASagaDefinitionError<S>;

/** Extract saga steps */
type InferSagaSteps<S> =
  S extends SagaDefinition<string, unknown, unknown, infer Steps, unknown>
    ? Steps
    : NotASagaDefinitionError<S>;

/** Extract the accumulated error type from a saga definition */
type InferSagaErrors<S> =
  S extends SagaDefinition<string, unknown, unknown, infer Steps, unknown>
    ? AccumulatedErrors<Steps>
    : NotASagaDefinitionError<S>;
```

### 6.5 Compile-Time Step Access Validation

The saga builder validates at compile time that each step's `invoke` and `compensate` mappers only access results from steps that have already been added to the builder chain. This is enforced through the `TSteps` tuple parameter that grows with each `.step()` call.

The key constraint is in the `.step()` method signature:

```typescript
step<S extends StepDefinition<string, TInput, AccumulatedResults<TSteps>, unknown, unknown, Port<string, unknown>>>(
  step: S
): SagaBuilderWithInput<TName, TInput, [...TSteps, S], TErrors | InferStepError<S>>;
```

The step's `TAccumulated` parameter must match `AccumulatedResults<TSteps>`, where `TSteps` contains only the steps added so far. If a step's mapper references a result key that doesn't exist in `AccumulatedResults<TSteps>`, TypeScript produces a compile-time error. Additionally, the step's `TError` type is unioned into the builder's `TErrors` parameter, ensuring that the saga's accumulated error type grows as each step is added.

**Example of a caught invalid access:**

```typescript
const OrderSaga = defineSaga("OrderSaga")
  .input<OrderInput>()
  .step(ReserveStockStep)
  .step(ShipOrderStep) // ERROR: ShipOrderStep's invoke mapper references
  // ctx.results.ChargePayment, but ChargePayment
  // is not in AccumulatedResults<[ReserveStockStep]>
  .step(ChargePaymentStep)
  .build();
```

TypeScript reports:

```
Argument of type 'StepDefinition<"ShipOrder", ...>' is not assignable to
parameter of type 'StepDefinition<string, OrderInput, { ReserveStock: { reservationId: string } }, ...>'.
  Types of property 'invoke' are incompatible.
    Property 'ChargePayment' does not exist on type '{ ReserveStock: { reservationId: string } }'.
```

This ensures that step ordering errors are caught at compile time, not at runtime.

### 6.6 Duplicate Step Name Detection

The builder detects duplicate step names at the type level to prevent silent key collisions in `AccumulatedResults`:

```typescript
/** Check whether a step name already exists in the accumulated steps */
type StepNameAlreadyExistsError<TName extends string> = {
  readonly __errorBrand: "StepNameAlreadyExistsError";
  readonly __message: "Duplicate step name detected. Each step must have a unique name.";
  readonly __received: TName;
  readonly __hint: "The accumulated results map uses step names as keys, so duplicates would silently overwrite earlier results.";
};

type HasStepName<TSteps extends readonly AnyStepDefinition[], TName extends string> =
  TName extends InferStepName<TSteps[number]> ? true : false;
```

When a duplicate is detected, the builder returns the error type instead of proceeding, giving a clear message about the conflict.

---

[Previous: 03 - Step Definitions](./03-step-definitions.md) | [Next: 05 - Ports & Adapters](./05-ports-and-adapters.md)
