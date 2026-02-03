# HexDI Saga Specification

**Version:** 0.1.0
**Status:** Draft
**Created:** 2026-02-01
**Last Updated:** 2026-02-01

---

## Table of Contents

1. [Overview](#1-overview)
2. [Philosophy](#2-philosophy)
3. [Package Structure](#3-package-structure)
4. [Core Concepts](#4-core-concepts)
5. [Step Definitions](#5-step-definitions)
6. [Saga Definitions](#6-saga-definitions)
7. [Saga Ports](#7-saga-ports)
8. [Saga Adapters](#8-saga-adapters)
9. [Compensation Architecture](#9-compensation-architecture)
10. [Saga Runtime](#10-saga-runtime)
11. [Execution Lifecycle](#11-execution-lifecycle)
12. [Error Handling](#12-error-handling)
13. [Persistence & Resumption](#13-persistence--resumption)
14. [HexDI Integration](#14-hexdi-integration)
15. [React Integration](#15-react-integration)
16. [Testing Patterns](#16-testing-patterns)
17. [Advanced Patterns](#17-advanced-patterns)
18. [API Reference](#18-api-reference)
19. [Integration with Flow](#19-integration-with-flow)

---

## 1. Overview

HexDI Saga is a process orchestration library for managing complex, long-running workflows with automatic compensation (rollback) on failure. It brings the Saga pattern into the hex-di ecosystem, treating workflow steps as port invocations with full dependency injection support.

### 1.1 What is the Saga Pattern?

The Saga pattern manages distributed transactions by breaking them into a sequence of local transactions. If one step fails, compensating transactions are executed in reverse order to undo the work of preceding steps.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Order Processing Saga                             │
│                                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │ Reserve  │───▶│ Charge   │───▶│  Ship    │───▶│  Notify  │          │
│  │ Stock    │    │ Payment  │    │  Order   │    │  User    │          │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘    └──────────┘          │
│       │               │               │                                  │
│       ▼               ▼               ▼                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                          │
│  │ Release  │◀───│  Refund  │◀───│  Cancel  │     (Compensation)       │
│  │ Stock    │    │ Payment  │    │ Shipment │                          │
│  └──────────┘    └──────────┘    └──────────┘                          │
└─────────────────────────────────────────────────────────────────────────┘

If "Ship Order" fails:
  1. Cancel Shipment (no-op, nothing to cancel)
  2. Refund Payment ✓
  3. Release Stock ✓
```

### 1.2 Goals

1. **Port-centric orchestration** - Each step invokes a port, not arbitrary functions
2. **Compensation-first design** - Every action can define its undo operation
3. **Full type safety** - Compile-time validation of workflow context and step outputs
4. **DI-integrated** - Sagas resolve dependencies through the HexDI container
5. **Resumable workflows** - Persist and resume after failures or restarts
6. **Framework agnostic core** - React/Vue bindings as separate packages

### 1.3 Non-Goals

1. Not a distributed message queue (use dedicated infrastructure)
2. Not a workflow engine with visual designers
3. Not event sourcing (though compatible with it)
4. Not a replacement for simple async/await chains

### 1.4 When to Use Sagas

| Use Saga                                 | Don't Use Saga             |
| ---------------------------------------- | -------------------------- |
| Multi-service transactions               | Single-service operations  |
| Operations requiring rollback            | Fire-and-forget operations |
| Long-running processes (minutes to days) | Sub-second operations      |
| Complex business workflows               | Simple CRUD operations     |
| Coordinating multiple adapters           | Single adapter calls       |

---

## 2. Philosophy

### 2.1 Core Principles

```
"Workflows are graphs of port invocations with compensation strategies."
```

**Principle 1: Steps are Port Invocations**

Unlike Redux-saga (generator-based side effects) or simple orchestrators, every step in a HexDI Saga invokes a port. This means:

- Steps are testable by swapping adapters
- Dependencies are explicit and injected
- Type safety flows through the entire workflow

**Principle 2: Compensation is First-Class**

Every step that modifies state should define how to undo that modification:

```typescript
const ReserveStockStep = defineStep("ReserveStock")
  .invoke(InventoryPort)
  .withParams(ctx => ({ action: "reserve", ...ctx.input }))
  .compensate(ctx => ({ action: "release", reservationId: ctx.stepResult.reservationId }))
  .build();
```

**Principle 3: Context Accumulates**

Each step's output is added to the saga context, available to subsequent steps:

```typescript
// After ReserveStock completes:
ctx.results.ReserveStock.reservationId; // Available to later steps

// After ChargePayment completes:
ctx.results.ChargePayment.transactionId; // Available to later steps
```

### 2.2 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              APPLICATION                                     │
│                                                                             │
│    await sagaRunner.execute(OrderSaga, { orderId, items, payment });       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SAGA RUNTIME                                    │
│                                                                             │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│   │   Runner    │  │  Executor   │  │ Compensator │  │  Persister  │      │
│   │             │  │             │  │             │  │  (optional) │      │
│   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SAGA DEFINITION                                 │
│                                                                             │
│   defineSaga('OrderSaga')                                                   │
│     .step(ValidateOrderStep)                                                │
│     .step(ReserveStockStep)                                                 │
│     .step(ChargePaymentStep)                                                │
│     .step(ShipOrderStep)                                                    │
│     .step(NotifyUserStep)                                                   │
│     .build()                                                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              STEP DEFINITIONS                                │
│                                                                             │
│   defineStep('ReserveStock')                                                │
│     .input<{ productId: string; quantity: number }>()                       │
│     .output<{ reservationId: string }>()                                    │
│     .invoke(InventoryPort)                                                  │
│     .withParams((ctx) => ({ ... }))                                        │
│     .compensate((ctx) => ({ ... }))                                        │
│     .build()                                                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HEXDI CONTAINER                                 │
│                                                                             │
│   InventoryPort ──▶ InventoryAdapter ──▶ Inventory Service                  │
│   PaymentPort   ──▶ PaymentAdapter   ──▶ Stripe/PayPal                     │
│   ShippingPort  ──▶ ShippingAdapter  ──▶ Shipping Provider                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Benefits

| Benefit           | Description                                                |
| ----------------- | ---------------------------------------------------------- |
| **Testability**   | Swap adapters to test saga logic without external services |
| **Observability** | Saga execution produces detailed traces for debugging      |
| **Resilience**    | Automatic compensation handles partial failures            |
| **Type Safety**   | Full TypeScript inference through the workflow             |
| **Consistency**   | Same DI patterns as rest of application                    |

---

## 3. Package Structure

```
saga/
├── core/                        # @hex-di/saga
│   ├── src/
│   │   ├── definition/
│   │   │   ├── step.ts         # defineStep builder
│   │   │   ├── saga.ts         # defineSaga builder
│   │   │   └── types.ts        # Definition types
│   │   │
│   │   ├── runtime/
│   │   │   ├── runner.ts       # Saga execution engine
│   │   │   ├── executor.ts     # Step executor
│   │   │   ├── compensator.ts  # Compensation logic
│   │   │   └── scheduler.ts    # Retry/timeout handling
│   │   │
│   │   ├── ports/
│   │   │   ├── saga-port.ts    # createSagaPort factory
│   │   │   └── persister.ts    # SagaPersisterPort
│   │   │
│   │   ├── adapters/
│   │   │   └── saga-adapter.ts # createSagaAdapter factory
│   │   │
│   │   ├── errors/
│   │   │   ├── saga-error.ts   # SagaError class
│   │   │   └── types.ts        # Error types
│   │   │
│   │   ├── types/
│   │   │   ├── context.ts      # StepContext, CompensationContext
│   │   │   ├── result.ts       # SagaResult, SagaStatus
│   │   │   └── utils.ts        # Utility types (Infer*, etc.)
│   │   │
│   │   └── index.ts
│   │
│   ├── testing/
│   │   ├── harness.ts          # createSagaTestHarness
│   │   ├── mocks.ts            # mockStep, mockPort
│   │   └── index.ts
│   │
│   └── package.json
│
├── react/                       # @hex-di/saga-react
│   ├── src/
│   │   ├── hooks/
│   │   │   ├── use-saga.ts     # useSaga hook
│   │   │   ├── use-saga-status.ts # useSagaStatus hook
│   │   │   └── use-saga-history.ts # useSagaHistory hook
│   │   │
│   │   ├── components/
│   │   │   └── saga-boundary.tsx # SagaBoundary error boundary
│   │   │
│   │   └── index.ts
│   │
│   └── package.json
│
├── vue/                         # @hex-di/saga-vue (future)
│   └── ...
│
└── devtools/                    # @hex-di/saga-devtools (future)
    ├── src/
    │   ├── timeline/            # Visual saga execution timeline
    │   ├── inspector/           # Step-by-step debugger
    │   └── index.ts
    └── package.json
```

### 3.1 Dependency Graph

```
                    @hex-di/core
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    @hex-di/graph   @hex-di/runtime  @hex-di/react
          │              │              │
          └──────────────┼──────────────┘
                         │
                         ▼
                  @hex-di/saga
                         │
              ┌──────────┼──────────┐
              ▼          │          ▼
    @hex-di/saga-react   │   @hex-di/saga-vue
                         │
                         ▼
              @hex-di/saga-devtools
```

### 3.2 Package Dependencies

| Package                 | Dependencies                      | Peer Dependencies |
| ----------------------- | --------------------------------- | ----------------- |
| `@hex-di/saga`          | `@hex-di/core`, `@hex-di/runtime` | -                 |
| `@hex-di/saga-react`    | `@hex-di/saga`, `@hex-di/react`   | `react`           |
| `@hex-di/saga-vue`      | `@hex-di/saga`                    | `vue`             |
| `@hex-di/saga-devtools` | `@hex-di/saga`                    | -                 |

---

## 4. Core Concepts

### 4.1 Step

A **Step** is a single unit of work in a saga. It defines:

- Which port to invoke
- How to map saga context to port input
- How to compensate (undo) the step if needed

```typescript
const ReserveStockStep = defineStep("ReserveStock")
  .input<{ productId: string; quantity: number }>()
  .output<{ reservationId: string }>()
  .invoke(InventoryPort)
  .withParams(ctx => ({
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

The **StepContext** provides access to saga input and accumulated results:

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

### 4.4 CompensationContext

The **CompensationContext** extends StepContext with the step's output and the triggering error:

```typescript
interface CompensationContext<TInput, TAccumulated, TStepOutput> extends StepContext<
  TInput,
  TAccumulated
> {
  /** This step's output (what to compensate) */
  readonly stepResult: TStepOutput;
  /** The error that triggered compensation */
  readonly error: Error;
}
```

### 4.5 SagaResult

The result of executing a saga:

```typescript
type SagaResult<TOutput> =
  | { success: true; output: TOutput; executionId: string }
  | { success: false; error: SagaError; compensated: boolean; executionId: string };
```

---

## 5. Step Definitions

### 5.1 Type Definition

```typescript
interface StepDefinition<
  TName extends string,
  TInput,
  TAccumulated,
  TOutput,
  TPort extends Port<string, unknown>,
> {
  /** Unique step name */
  readonly name: TName;

  /** Port to invoke */
  readonly port: TPort;

  /** Map context to port input */
  readonly invoke: (ctx: StepContext<TInput, TAccumulated>) => PortInput<TPort>;

  /** Map context to compensation port input (optional) */
  readonly compensate?: (
    ctx: CompensationContext<TInput, TAccumulated, TOutput>
  ) => PortInput<TPort>;

  /** Condition for executing this step (optional) */
  readonly condition?: (ctx: StepContext<TInput, TAccumulated>) => boolean;

  /** Step configuration options */
  readonly options?: StepOptions;
}

interface StepOptions {
  /** Retry configuration */
  retry?: RetryConfig;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Skip compensation for this step */
  skipCompensation?: boolean;

  /** Custom metadata for tracing */
  metadata?: Record<string, unknown>;
}

interface RetryConfig {
  /** Maximum retry attempts (default: 0) */
  maxAttempts: number;

  /** Delay between retries in ms, or function for custom backoff */
  delay: number | ((attempt: number, error: Error) => number);

  /** Predicate to determine if error is retryable */
  retryIf?: (error: Error) => boolean;
}
```

### 5.2 Builder API

```typescript
function defineStep<TName extends string>(name: TName): StepBuilder<TName>;

interface StepBuilder<TName extends string> {
  /** Declare expected input shape from saga context */
  input<TInput>(): StepBuilderWithInput<TName, TInput>;
}

interface StepBuilderWithInput<TName extends string, TInput> {
  /** Declare step output shape */
  output<TOutput>(): StepBuilderWithIO<TName, TInput, TOutput>;
}

interface StepBuilderWithIO<TName extends string, TInput, TOutput> {
  /** Specify which port to invoke */
  invoke<TPort extends Port<string, unknown>>(
    port: TPort
  ): StepBuilderWithPort<TName, TInput, TOutput, TPort>;
}

interface StepBuilderWithPort<
  TName extends string,
  TInput,
  TOutput,
  TPort extends Port<string, unknown>,
> {
  /** Map saga context to port input */
  withParams(
    mapper: (ctx: StepContext<TInput, unknown>) => PortInput<TPort>
  ): StepBuilderWithParams<TName, TInput, TOutput, TPort>;
}

interface StepBuilderWithParams<
  TName extends string,
  TInput,
  TOutput,
  TPort extends Port<string, unknown>,
> {
  /** Define compensation logic */
  compensate(
    mapper: (ctx: CompensationContext<TInput, unknown, TOutput>) => PortInput<TPort>
  ): StepBuilderWithCompensation<TName, TInput, TOutput, TPort>;

  /** Skip compensation for this step */
  skipCompensation(): StepBuilderWithCompensation<TName, TInput, TOutput, TPort>;

  /** Add condition for step execution */
  when(
    predicate: (ctx: StepContext<TInput, unknown>) => boolean
  ): StepBuilderWithParams<TName, TInput, TOutput, TPort>;

  /** Configure retry behavior */
  retry(config: RetryConfig): StepBuilderWithParams<TName, TInput, TOutput, TPort>;

  /** Set timeout in milliseconds */
  timeout(ms: number): StepBuilderWithParams<TName, TInput, TOutput, TPort>;

  /** Build the step definition */
  build(): StepDefinition<TName, TInput, unknown, TOutput, TPort>;
}

interface StepBuilderWithCompensation<
  TName extends string,
  TInput,
  TOutput,
  TPort extends Port<string, unknown>,
> {
  /** Add condition for step execution */
  when(
    predicate: (ctx: StepContext<TInput, unknown>) => boolean
  ): StepBuilderWithCompensation<TName, TInput, TOutput, TPort>;

  /** Configure retry behavior */
  retry(config: RetryConfig): StepBuilderWithCompensation<TName, TInput, TOutput, TPort>;

  /** Set timeout in milliseconds */
  timeout(ms: number): StepBuilderWithCompensation<TName, TInput, TOutput, TPort>;

  /** Build the step definition */
  build(): StepDefinition<TName, TInput, unknown, TOutput, TPort>;
}
```

### 5.3 Examples

#### Basic Step with Compensation

```typescript
const ReserveStockStep = defineStep("ReserveStock")
  .input<{ productId: string; quantity: number }>()
  .output<{ reservationId: string }>()
  .invoke(InventoryPort)
  .withParams(ctx => ({
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

#### Step without Compensation

```typescript
const NotifyUserStep = defineStep("NotifyUser")
  .input<{ userId: string; orderId: string }>()
  .output<{ notificationId: string }>()
  .invoke(NotificationPort)
  .withParams(ctx => ({
    userId: ctx.input.userId,
    template: "order_shipped",
    data: { trackingNumber: ctx.results.ShipOrder.trackingNumber },
  }))
  .skipCompensation() // Notifications don't need rollback
  .build();
```

#### Conditional Step

```typescript
const ApplyDiscountStep = defineStep("ApplyDiscount")
  .input<{ discountCode?: string }>()
  .output<{ discountAmount: number }>()
  .invoke(PricingPort)
  .withParams(ctx => ({
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

#### Step with Retry

```typescript
const ChargePaymentStep = defineStep("ChargePayment")
  .input<{ amount: number; paymentMethod: string }>()
  .output<{ transactionId: string }>()
  .invoke(PaymentPort)
  .withParams(ctx => ({
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
    retryIf: error => error.name === "NetworkError",
  })
  .timeout(30000) // 30 second timeout
  .build();
```

#### Step Using Previous Results

```typescript
const ShipOrderStep = defineStep("ShipOrder")
  .input<{ shippingAddress: Address }>()
  .output<{ trackingNumber: string; carrier: string }>()
  .invoke(ShippingPort)
  .withParams(ctx => ({
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

```typescript
/** Extract step name */
type InferStepName<S> = S extends StepDefinition<infer N, any, any, any, any> ? N : never;

/** Extract step output type */
type InferStepOutput<S> = S extends StepDefinition<any, any, any, infer O, any> ? O : never;

/** Extract step port type */
type InferStepPort<S> = S extends StepDefinition<any, any, any, any, infer P> ? P : never;
```

---

## 6. Saga Definitions

### 6.1 Type Definition

```typescript
interface SagaDefinition<
  TName extends string,
  TInput,
  TOutput,
  TSteps extends readonly StepDefinition<string, any, any, any, any>[],
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

  /** Custom metadata for tracing */
  metadata?: Record<string, unknown>;
}

/** Compute accumulated results type from steps */
type AccumulatedResults<TSteps extends readonly StepDefinition<string, any, any, any, any>[]> = {
  [S in TSteps[number] as InferStepName<S>]: InferStepOutput<S>;
};
```

### 6.2 Builder API

```typescript
function defineSaga<TName extends string>(name: TName): SagaBuilder<TName>;

interface SagaBuilder<TName extends string> {
  /** Declare saga input type */
  input<TInput>(): SagaBuilderWithInput<TName, TInput, []>;
}

interface SagaBuilderWithInput<
  TName extends string,
  TInput,
  TSteps extends readonly StepDefinition<string, any, any, any, any>[],
> {
  /** Add a step to the saga */
  step<S extends StepDefinition<string, TInput, AccumulatedResults<TSteps>, any, any>>(
    step: S
  ): SagaBuilderWithInput<TName, TInput, [...TSteps, S]>;

  /** Add parallel steps (all execute concurrently) */
  parallel<
    PSteps extends readonly StepDefinition<string, TInput, AccumulatedResults<TSteps>, any, any>[],
  >(
    steps: PSteps
  ): SagaBuilderWithInput<TName, TInput, [...TSteps, ...PSteps]>;

  /** Add a branch based on condition */
  branch<
    TKey extends string,
    TBranches extends Record<
      TKey,
      readonly StepDefinition<string, TInput, AccumulatedResults<TSteps>, any, any>[]
    >,
  >(
    selector: (ctx: StepContext<TInput, AccumulatedResults<TSteps>>) => TKey,
    branches: TBranches
  ): SagaBuilderWithInput<TName, TInput, [...TSteps, ...TBranches[TKey]]>;

  /** Invoke another saga as a step */
  saga<TSaga extends SagaDefinition<string, any, any, any>>(
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
        SagaPort<any, any, any>
      >,
    ]
  >;

  /** Define saga output from accumulated results */
  output<TOutput>(
    mapper: (results: AccumulatedResults<TSteps>) => TOutput
  ): SagaBuilderWithOutput<TName, TInput, TOutput, TSteps>;
}

interface SagaBuilderWithOutput<
  TName extends string,
  TInput,
  TOutput,
  TSteps extends readonly StepDefinition<string, any, any, any, any>[],
> {
  /** Configure saga options */
  options(options: SagaOptions): SagaBuilderWithOutput<TName, TInput, TOutput, TSteps>;

  /** Build the saga definition */
  build(): SagaDefinition<TName, TInput, TOutput, TSteps>;
}
```

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
  .step(ValidateOrderStep)
  .step(ReserveStockStep)
  .step(ChargePaymentStep)
  .step(ShipOrderStep)
  .step(NotifyUserStep)
  .output(results => ({
    orderId: results.ValidateOrder.orderId,
    trackingNumber: results.ShipOrder.trackingNumber,
    transactionId: results.ChargePayment.transactionId,
  }))
  .options({
    compensationStrategy: "sequential",
    persistent: true,
  })
  .build();
```

#### Saga with Parallel Steps

```typescript
const FulfillmentSaga = defineSaga("FulfillmentSaga")
  .input<{ orderId: string }>()
  .step(GetOrderDetailsStep)
  // These steps run in parallel
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
  // Branch based on payment method
  .branch(ctx => ctx.input.method, {
    card: [AuthorizeCardStep, CaptureCardStep],
    bank: [InitiateBankTransferStep, ConfirmBankTransferStep],
    crypto: [GenerateCryptoAddressStep, AwaitCryptoPaymentStep],
  })
  .step(RecordTransactionStep)
  .output(results => ({
    transactionId: results.RecordTransaction.id,
  }))
  .build();
```

#### Sub-Saga Composition

```typescript
const CheckoutSaga = defineSaga("CheckoutSaga")
  .input<CheckoutInput>()
  .step(CreateOrderStep)
  // Invoke PaymentSaga as a step
  .saga(PaymentSaga, ctx => ({
    amount: ctx.results.CreateOrder.total,
    method: ctx.input.paymentMethod,
  }))
  // Invoke FulfillmentSaga as a step
  .saga(FulfillmentSaga, ctx => ({
    orderId: ctx.results.CreateOrder.orderId,
  }))
  .step(SendConfirmationStep)
  .output(results => ({
    orderId: results.CreateOrder.orderId,
    confirmationNumber: results.SendConfirmation.confirmationNumber,
  }))
  .build();
```

### 6.4 Type Inference Utilities

```typescript
/** Extract saga name */
type InferSagaName<S> = S extends SagaDefinition<infer N, any, any, any> ? N : never;

/** Extract saga input type */
type InferSagaInput<S> = S extends SagaDefinition<any, infer I, any, any> ? I : never;

/** Extract saga output type */
type InferSagaOutput<S> = S extends SagaDefinition<any, any, infer O, any> ? O : never;

/** Extract saga steps */
type InferSagaSteps<S> = S extends SagaDefinition<any, any, any, infer Steps> ? Steps : never;
```

---

## 7. Saga Ports

### 7.1 Type Definition

A SagaPort declares a saga as a service that can be resolved from the DI container:

```typescript
interface SagaPort<TName extends string, TInput, TOutput> extends Port<
  TName,
  SagaExecutor<TInput, TOutput>
> {
  readonly _sagaTag: "SagaPort";
}

/** The executor interface exposed by saga adapters */
interface SagaExecutor<TInput, TOutput> {
  /** Execute the saga with given input */
  execute(input: TInput): Promise<SagaResult<TOutput>>;

  /** Resume a previously started saga */
  resume(executionId: string): Promise<SagaResult<TOutput>>;

  /** Cancel a running saga */
  cancel(executionId: string): Promise<void>;

  /** Get status of a saga execution */
  getStatus(executionId: string): Promise<SagaStatus>;

  /** List all executions (with optional filters) */
  listExecutions(filters?: ExecutionFilters): Promise<SagaExecutionSummary[]>;
}

interface ExecutionFilters {
  status?: SagaStatusType;
  startedAfter?: Date;
  startedBefore?: Date;
  limit?: number;
}

interface SagaExecutionSummary {
  executionId: string;
  status: SagaStatusType;
  startedAt: Date;
  completedAt?: Date;
  currentStep?: string;
}
```

### 7.2 Factory Function

```typescript
function createSagaPort<TName extends string, TInput, TOutput>(config: {
  name: TName;
  description?: string;
  metadata?: Record<string, unknown>;
}): SagaPort<TName, TInput, TOutput>;
```

### 7.3 Examples

```typescript
// Order processing saga port
const OrderSagaPort = createSagaPort<"OrderSaga", OrderInput, OrderOutput>({
  name: "OrderSaga",
  description: "Processes customer orders through validation, payment, and fulfillment",
});

// Payment saga port
const PaymentSagaPort = createSagaPort<"PaymentSaga", PaymentInput, PaymentOutput>({
  name: "PaymentSaga",
  description: "Handles payment processing across multiple providers",
});

// Onboarding saga port
const OnboardingSagaPort = createSagaPort<"OnboardingSaga", OnboardingInput, OnboardingOutput>({
  name: "OnboardingSaga",
  description: "Manages user onboarding workflow",
  metadata: {
    category: "user-lifecycle",
    version: "2.0",
  },
});
```

### 7.4 Type Inference Utilities

```typescript
/** Extract saga port input type */
type InferSagaPortInput<P> = P extends SagaPort<any, infer I, any> ? I : never;

/** Extract saga port output type */
type InferSagaPortOutput<P> = P extends SagaPort<any, any, infer O> ? O : never;

/** Extract saga port name */
type InferSagaPortName<P> = P extends SagaPort<infer N, any, any> ? N : never;
```

---

## 8. Saga Adapters

### 8.1 Type Definition

A SagaAdapter binds a saga definition to a port and declares its dependencies:

```typescript
interface SagaAdapter<P extends SagaPort<string, unknown, unknown>> extends Adapter<
  P,
  SagaExecutor<InferSagaPortInput<P>, InferSagaPortOutput<P>>
> {
  readonly _sagaAdapterTag: "SagaAdapter";
  readonly saga: SagaDefinition<any, InferSagaPortInput<P>, InferSagaPortOutput<P>, any>;
}
```

### 8.2 Factory Function

```typescript
function createSagaAdapter<
  P extends SagaPort<string, unknown, unknown>,
  TDeps extends Record<string, Port<string, unknown>> = Record<string, never>,
>(
  port: P,
  config: {
    /** The saga definition to execute */
    saga: SagaDefinition<any, InferSagaPortInput<P>, InferSagaPortOutput<P>, any>;

    /** Ports required by the saga's steps */
    requires?: PortsTuple<TDeps>;

    /** Optional persister for resumable sagas */
    persister?: Port<string, SagaPersister>;

    /** Adapter lifetime (default: singleton) */
    lifetime?: "singleton" | "scoped" | "transient";
  }
): SagaAdapter<P>;
```

### 8.3 Examples

```typescript
// Basic saga adapter
const OrderSagaAdapter = createSagaAdapter(OrderSagaPort, {
  saga: OrderSaga,
  requires: [InventoryPort, PaymentPort, ShippingPort, NotificationPort],
});

// Saga adapter with persistence
const OrderSagaAdapter = createSagaAdapter(OrderSagaPort, {
  saga: OrderSaga,
  requires: [InventoryPort, PaymentPort, ShippingPort, NotificationPort],
  persister: SagaPersisterPort,
});

// Scoped saga adapter (new executor per scope)
const SessionSagaAdapter = createSagaAdapter(SessionSagaPort, {
  saga: SessionSaga,
  requires: [AuthPort, SessionPort],
  lifetime: "scoped",
});
```

### 8.4 Graph Registration

```typescript
const graph = createGraph()
  // Register infrastructure adapters
  .provide(HttpClientAdapter)
  .provide(DatabaseAdapter)

  // Register step dependency adapters
  .provide(InventoryAdapter)
  .provide(PaymentAdapter)
  .provide(ShippingAdapter)
  .provide(NotificationAdapter)

  // Register saga adapter
  .provide(OrderSagaAdapter)

  .build();

// Resolve and execute
const container = createContainer(graph);
const orderSaga = container.resolve(OrderSagaPort);

const result = await orderSaga.execute({
  orderId: "order-123",
  userId: "user-456",
  items: [{ productId: "prod-1", quantity: 2 }],
  paymentMethod: "card",
  shippingAddress: {
    /* ... */
  },
});
```

---

## 9. Compensation Architecture

### 9.1 Compensation Flow

When a step fails, compensation runs in reverse order for all completed steps:

```
Execute:  Step1 ──▶ Step2 ──▶ Step3 ──▶ Step4 ✗ (fails)
                                           │
                                           ▼
Compensate: Comp1 ◀── Comp2 ◀── Comp3 ◀────┘
            (last)              (first to compensate)
```

### 9.2 Compensation Strategies

```typescript
type CompensationStrategy = "sequential" | "parallel" | "best-effort";
```

| Strategy      | Behavior                                        | Use When                                |
| ------------- | ----------------------------------------------- | --------------------------------------- |
| `sequential`  | Compensate one at a time, stop on first failure | Order matters, need guaranteed rollback |
| `parallel`    | Compensate all at once, collect all errors      | Independent compensations, need speed   |
| `best-effort` | Compensate all, continue despite failures       | Partial rollback acceptable             |

### 9.3 Compensation Context

```typescript
interface CompensationContext<TInput, TAccumulated, TStepOutput> extends StepContext<
  TInput,
  TAccumulated
> {
  /** The output from the step being compensated */
  readonly stepResult: TStepOutput;

  /** The error that triggered compensation */
  readonly error: Error;

  /** Index of the step that failed (triggered compensation) */
  readonly failedStepIndex: number;

  /** Name of the step that failed */
  readonly failedStepName: string;
}
```

### 9.4 Compensation Examples

#### Basic Compensation

```typescript
const ReserveStockStep = defineStep("ReserveStock")
  .input<{ productId: string; quantity: number }>()
  .output<{ reservationId: string }>()
  .invoke(InventoryPort)
  .withParams(ctx => ({
    action: "reserve",
    productId: ctx.input.productId,
    quantity: ctx.input.quantity,
  }))
  .compensate(ctx => ({
    action: "release",
    // Use stepResult to know what to release
    reservationId: ctx.stepResult.reservationId,
  }))
  .build();
```

#### Conditional Compensation

```typescript
const ChargePaymentStep = defineStep("ChargePayment")
  .input<{ amount: number }>()
  .output<{ transactionId: string; status: "captured" | "authorized" }>()
  .invoke(PaymentPort)
  .withParams(ctx => ({
    action: "charge",
    amount: ctx.input.amount,
  }))
  .compensate(ctx => {
    // Only refund if payment was captured
    if (ctx.stepResult.status === "captured") {
      return {
        action: "refund",
        transactionId: ctx.stepResult.transactionId,
      };
    }
    // If only authorized, void the authorization
    return {
      action: "void",
      transactionId: ctx.stepResult.transactionId,
    };
  })
  .build();
```

#### No-Op Compensation

```typescript
const ValidateOrderStep = defineStep("ValidateOrder")
  .input<{ orderId: string }>()
  .output<{ isValid: boolean; orderId: string }>()
  .invoke(ValidationPort)
  .withParams(ctx => ({
    type: "order",
    id: ctx.input.orderId,
  }))
  // Validation doesn't modify state, no compensation needed
  .skipCompensation()
  .build();
```

### 9.5 Compensation Failure Handling

```typescript
interface CompensationError extends Error {
  /** The step that failed to compensate */
  readonly stepName: string;

  /** The original error that triggered compensation */
  readonly originalError: Error;

  /** The error from the failed compensation */
  readonly compensationError: Error;

  /** Steps that were successfully compensated */
  readonly compensatedSteps: string[];

  /** Steps that failed to compensate */
  readonly failedCompensationSteps: string[];
}
```

When compensation itself fails:

```typescript
const result = await saga.execute(input);

if (!result.success) {
  if (result.compensated) {
    // All compensations succeeded
    console.log("Rolled back successfully");
  } else {
    // Some compensations failed
    console.error("Partial rollback:", result.error.failedCompensationSteps);
    // Manual intervention may be needed
  }
}
```

---

## 10. Saga Runtime

### 10.1 SagaRunner

The SagaRunner is the central orchestrator that executes sagas:

```typescript
interface SagaRunner {
  /** Execute a saga */
  execute<TSaga extends SagaDefinition<string, any, any, any>>(
    saga: TSaga,
    input: InferSagaInput<TSaga>,
    options?: ExecuteOptions
  ): Promise<SagaResult<InferSagaOutput<TSaga>>>;

  /** Resume a paused/failed saga */
  resume(executionId: string): Promise<SagaResult<unknown>>;

  /** Cancel a running saga */
  cancel(executionId: string): Promise<void>;

  /** Get execution status */
  getStatus(executionId: string): Promise<SagaStatus>;

  /** Subscribe to execution events */
  subscribe(executionId: string, listener: SagaEventListener): Unsubscribe;
}

interface ExecuteOptions {
  /** Custom execution ID (default: auto-generated UUID) */
  executionId?: string;

  /** Timeout for entire saga in ms */
  timeout?: number;

  /** Custom metadata to attach to execution */
  metadata?: Record<string, unknown>;
}
```

### 10.2 SagaStatus

```typescript
type SagaStatus =
  | { state: "pending"; currentStep: number; stepName: string }
  | { state: "running"; currentStep: number; stepName: string; startedAt: Date }
  | { state: "compensating"; fromStep: number; currentStep: number; stepName: string }
  | { state: "completed"; output: unknown; completedAt: Date }
  | { state: "failed"; error: SagaError; compensated: boolean; failedAt: Date }
  | { state: "cancelled"; cancelledAt: Date; completedSteps: string[] };

type SagaStatusType = SagaStatus["state"];
```

### 10.3 Saga Events

```typescript
type SagaEvent =
  | { type: "saga:started"; executionId: string; sagaName: string; input: unknown }
  | { type: "step:started"; executionId: string; stepName: string; stepIndex: number }
  | { type: "step:completed"; executionId: string; stepName: string; output: unknown }
  | { type: "step:failed"; executionId: string; stepName: string; error: Error }
  | { type: "step:skipped"; executionId: string; stepName: string; reason: string }
  | { type: "compensation:started"; executionId: string; fromStep: string }
  | { type: "compensation:step"; executionId: string; stepName: string }
  | { type: "compensation:completed"; executionId: string }
  | { type: "compensation:failed"; executionId: string; error: CompensationError }
  | { type: "saga:completed"; executionId: string; output: unknown }
  | { type: "saga:failed"; executionId: string; error: SagaError }
  | { type: "saga:cancelled"; executionId: string };

type SagaEventListener = (event: SagaEvent) => void;
```

### 10.4 Execution Trace

Each saga execution produces a detailed trace:

```typescript
interface ExecutionTrace {
  readonly executionId: string;
  readonly sagaName: string;
  readonly input: unknown;
  readonly startedAt: Date;
  readonly completedAt?: Date;
  readonly status: SagaStatusType;
  readonly steps: StepTrace[];
  readonly compensation?: CompensationTrace;
  readonly output?: unknown;
  readonly error?: SagaError;
}

interface StepTrace {
  readonly stepName: string;
  readonly stepIndex: number;
  readonly status: "pending" | "running" | "completed" | "failed" | "skipped";
  readonly startedAt?: Date;
  readonly completedAt?: Date;
  readonly input?: unknown;
  readonly output?: unknown;
  readonly error?: Error;
  readonly retryCount: number;
}

interface CompensationTrace {
  readonly triggeredBy: string;
  readonly triggeredAt: Date;
  readonly completedAt?: Date;
  readonly steps: CompensationStepTrace[];
  readonly status: "running" | "completed" | "failed";
}

interface CompensationStepTrace {
  readonly stepName: string;
  readonly status: "pending" | "running" | "completed" | "failed" | "skipped";
  readonly startedAt?: Date;
  readonly completedAt?: Date;
  readonly error?: Error;
}
```

---

## 11. Execution Lifecycle

### 11.1 Normal Execution Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              SAGA LIFECYCLE                                   │
└──────────────────────────────────────────────────────────────────────────────┘

                         saga.execute(input)
                                │
                                ▼
                    ┌───────────────────────┐
                    │   Generate Execution  │
                    │         ID            │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   Emit: saga:started  │
                    └───────────┬───────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
          ▼                     ▼                     ▼
    ┌───────────┐        ┌───────────┐        ┌───────────┐
    │  Step 1   │───────▶│  Step 2   │───────▶│  Step N   │
    │           │        │           │        │           │
    │ • Resolve │        │ • Resolve │        │ • Resolve │
    │   port    │        │   port    │        │   port    │
    │ • Execute │        │ • Execute │        │ • Execute │
    │ • Store   │        │ • Store   │        │ • Store   │
    │   result  │        │   result  │        │   result  │
    └───────────┘        └───────────┘        └───────────┘
                                                    │
                                                    ▼
                              ┌───────────────────────────────┐
                              │   Map results to output       │
                              └───────────────┬───────────────┘
                                              │
                                              ▼
                              ┌───────────────────────────────┐
                              │   Emit: saga:completed        │
                              └───────────────┬───────────────┘
                                              │
                                              ▼
                              ┌───────────────────────────────┐
                              │   Return SagaResult (success) │
                              └───────────────────────────────┘
```

### 11.2 Failure and Compensation Flow

```
          Step 1 ✓           Step 2 ✓           Step 3 ✗
    ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
    │   Complete    │──▶│   Complete    │──▶│    FAILS      │
    │               │   │               │   │               │
    │ result stored │   │ result stored │   │ error caught  │
    └───────────────┘   └───────────────┘   └───────┬───────┘
                                                    │
                                                    ▼
                              ┌───────────────────────────────┐
                              │  Emit: compensation:started   │
                              └───────────────┬───────────────┘
                                              │
          ┌───────────────────────────────────┤
          │                                   │
          ▼                                   ▼
    ┌───────────────┐               ┌───────────────┐
    │ Compensate    │◀──────────────│ Compensate    │
    │   Step 1      │               │   Step 2      │
    │               │               │               │
    │ (reverse      │               │ (reverse      │
    │  order)       │               │  order)       │
    └───────────────┘               └───────────────┘
          │
          ▼
    ┌───────────────────────────────┐
    │ Emit: compensation:completed  │
    └───────────────┬───────────────┘
                    │
                    ▼
    ┌───────────────────────────────┐
    │ Return SagaResult (failure,   │
    │ compensated: true)            │
    └───────────────────────────────┘
```

### 11.3 Step Execution Details

```
                    Execute Step
                         │
                         ▼
              ┌─────────────────────┐
              │ Check condition     │
              │ (if defined)        │
              └──────────┬──────────┘
                         │
           ┌─────────────┴─────────────┐
           │                           │
           ▼                           ▼
    ┌─────────────┐             ┌─────────────┐
    │ Condition   │             │ Condition   │
    │ TRUE        │             │ FALSE       │
    └──────┬──────┘             └──────┬──────┘
           │                           │
           ▼                           ▼
    ┌─────────────┐             ┌─────────────┐
    │ Resolve     │             │ Skip step   │
    │ port from   │             │ Emit:       │
    │ container   │             │ step:skipped│
    └──────┬──────┘             └─────────────┘
           │
           ▼
    ┌─────────────────────────┐
    │ Build params from       │
    │ step context            │
    └──────────┬──────────────┘
               │
               ▼
    ┌─────────────────────────┐
    │ Invoke port with params │◀──────┐
    └──────────┬──────────────┘       │
               │                      │
     ┌─────────┴─────────┐            │
     │                   │            │
     ▼                   ▼            │
┌─────────┐        ┌─────────┐        │
│ SUCCESS │        │ ERROR   │        │
└────┬────┘        └────┬────┘        │
     │                  │             │
     │                  ▼             │
     │           ┌─────────────┐      │
     │           │ Retry?      │──YES─┘
     │           └──────┬──────┘
     │                  │ NO
     │                  ▼
     │           ┌─────────────┐
     │           │ Throw error │
     │           │ (triggers   │
     │           │ compensation│
     │           └─────────────┘
     │
     ▼
┌─────────────────────────┐
│ Store result in context │
│ Emit: step:completed    │
└─────────────────────────┘
```

---

## 12. Error Handling

### 12.1 SagaError

```typescript
class SagaError extends Error {
  constructor(
    message: string,
    public readonly type: SagaErrorType,
    public readonly stepName: string,
    public readonly stepIndex: number,
    public readonly cause: Error,
    public readonly completedSteps: string[],
    public readonly compensatedSteps: string[],
    public readonly executionId: string
  ) {
    super(message);
    this.name = "SagaError";
  }
}

type SagaErrorType =
  | "step_failed" // A step threw an error
  | "compensation_failed" // Compensation threw an error
  | "timeout" // Saga or step timed out
  | "cancelled" // Saga was cancelled
  | "validation_failed" // Input validation failed
  | "port_not_found" // Required port not in container
  | "persistence_failed"; // Failed to persist state
```

### 12.2 Error Properties

| Property           | Description                              |
| ------------------ | ---------------------------------------- |
| `type`             | Category of error                        |
| `stepName`         | Name of the step that failed             |
| `stepIndex`        | Index of the failed step                 |
| `cause`            | The underlying error                     |
| `completedSteps`   | Steps that completed successfully        |
| `compensatedSteps` | Steps that were successfully compensated |
| `executionId`      | Unique execution identifier              |

### 12.3 Handling Errors

```typescript
const result = await orderSaga.execute(orderInput);

if (!result.success) {
  const error = result.error;

  switch (error.type) {
    case "step_failed":
      console.error(`Step ${error.stepName} failed:`, error.cause.message);
      // Check if compensated
      if (result.compensated) {
        console.log("Successfully rolled back");
      } else {
        console.error("Failed to fully compensate");
      }
      break;

    case "timeout":
      console.error(`Saga timed out at step ${error.stepName}`);
      // May need to check step status externally
      break;

    case "cancelled":
      console.log(`Saga was cancelled. Completed: ${error.completedSteps.join(", ")}`);
      break;

    case "compensation_failed":
      console.error("Compensation failed! Manual intervention needed.");
      console.error("Failed to compensate:", error.stepName);
      console.error("Successfully compensated:", error.compensatedSteps);
      // Alert operations team
      break;
  }
}
```

### 12.4 Retry Configuration

```typescript
interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;

  /** Delay between retries (ms or function) */
  delay: number | ((attempt: number, error: Error) => number);

  /** Predicate to determine if error is retryable */
  retryIf?: (error: Error) => boolean;
}

// Example: Exponential backoff with jitter
const retryConfig: RetryConfig = {
  maxAttempts: 5,
  delay: attempt => {
    const base = Math.min(1000 * Math.pow(2, attempt), 30000);
    const jitter = Math.random() * 1000;
    return base + jitter;
  },
  retryIf: error => {
    // Only retry network and transient errors
    return (
      error.name === "NetworkError" ||
      error.name === "TimeoutError" ||
      (error as any).code === "ECONNRESET"
    );
  },
};
```

### 12.5 Timeout Handling

```typescript
// Step-level timeout
const SlowStep = defineStep("SlowStep")
  .input<{}>()
  .output<{}>()
  .invoke(SlowPort)
  .withParams(() => ({}))
  .timeout(30000) // 30 seconds
  .build();

// Saga-level timeout
const TimeBoundSaga = defineSaga("TimeBoundSaga")
  .input<{}>()
  .step(Step1)
  .step(Step2)
  .step(Step3)
  .output(r => r)
  .options({
    timeout: 120000, // 2 minutes for entire saga
  })
  .build();
```

---

## 13. Persistence & Resumption

### 13.1 SagaPersister Interface

```typescript
interface SagaPersister {
  /** Save saga execution state */
  save(state: SagaExecutionState): Promise<void>;

  /** Load saga execution state by ID */
  load(executionId: string): Promise<SagaExecutionState | null>;

  /** Delete saga execution state */
  delete(executionId: string): Promise<void>;

  /** List saga executions with optional filters */
  list(filters?: PersisterFilters): Promise<SagaExecutionState[]>;

  /** Update specific fields of execution state */
  update(executionId: string, updates: Partial<SagaExecutionState>): Promise<void>;
}

interface PersisterFilters {
  sagaName?: string;
  status?: SagaStatusType;
  startedAfter?: Date;
  startedBefore?: Date;
  limit?: number;
  offset?: number;
}
```

### 13.2 SagaExecutionState

```typescript
interface SagaExecutionState {
  /** Unique execution identifier */
  readonly executionId: string;

  /** Name of the saga being executed */
  readonly sagaName: string;

  /** Original input to the saga */
  readonly input: unknown;

  /** Current step index */
  readonly currentStep: number;

  /** Results from completed steps */
  readonly completedSteps: CompletedStepState[];

  /** Current execution status */
  readonly status: SagaStatusType;

  /** Error if failed */
  readonly error?: SerializedError;

  /** Compensation state if compensating */
  readonly compensation?: CompensationState;

  /** Timestamps */
  readonly startedAt: Date;
  readonly updatedAt: Date;
  readonly completedAt?: Date;

  /** Custom metadata */
  readonly metadata?: Record<string, unknown>;
}

interface CompletedStepState {
  readonly name: string;
  readonly index: number;
  readonly output: unknown;
  readonly completedAt: Date;
}

interface CompensationState {
  readonly triggeredBy: string;
  readonly currentStep: number;
  readonly compensatedSteps: string[];
  readonly startedAt: Date;
}

interface SerializedError {
  readonly name: string;
  readonly message: string;
  readonly stack?: string;
  readonly code?: string;
}
```

### 13.3 Persister Port

```typescript
const SagaPersisterPort = createPort<"SagaPersister", SagaPersister>({
  name: "SagaPersister",
  description: "Persistence layer for saga execution state",
});
```

### 13.4 Built-in Persisters

#### In-Memory Persister (for testing)

```typescript
const InMemoryPersisterAdapter = createAdapter(SagaPersisterPort, {
  lifetime: "singleton",
  factory: () => {
    const store = new Map<string, SagaExecutionState>();

    return {
      async save(state) {
        store.set(state.executionId, state);
      },
      async load(executionId) {
        return store.get(executionId) ?? null;
      },
      async delete(executionId) {
        store.delete(executionId);
      },
      async list(filters) {
        let results = Array.from(store.values());
        if (filters?.sagaName) {
          results = results.filter(s => s.sagaName === filters.sagaName);
        }
        if (filters?.status) {
          results = results.filter(s => s.status === filters.status);
        }
        return results;
      },
      async update(executionId, updates) {
        const existing = store.get(executionId);
        if (existing) {
          store.set(executionId, { ...existing, ...updates, updatedAt: new Date() });
        }
      },
    };
  },
});
```

#### PostgreSQL Persister Example

```typescript
const PostgresPersisterAdapter = createAdapter(SagaPersisterPort, {
  lifetime: "singleton",
  requires: [DatabasePort],
  factory: ({ database }) => ({
    async save(state) {
      await database.query(
        `
        INSERT INTO saga_executions (id, saga_name, state, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE
        SET state = $3, updated_at = NOW()
      `,
        [state.executionId, state.sagaName, JSON.stringify(state)]
      );
    },

    async load(executionId) {
      const result = await database.query("SELECT state FROM saga_executions WHERE id = $1", [
        executionId,
      ]);
      if (result.rows.length === 0) return null;
      return JSON.parse(result.rows[0].state);
    },

    async delete(executionId) {
      await database.query("DELETE FROM saga_executions WHERE id = $1", [executionId]);
    },

    async list(filters) {
      let query = "SELECT state FROM saga_executions WHERE 1=1";
      const params: unknown[] = [];

      if (filters?.sagaName) {
        params.push(filters.sagaName);
        query += ` AND saga_name = $${params.length}`;
      }
      if (filters?.status) {
        params.push(filters.status);
        query += ` AND state->>'status' = $${params.length}`;
      }
      if (filters?.limit) {
        params.push(filters.limit);
        query += ` LIMIT $${params.length}`;
      }

      const result = await database.query(query, params);
      return result.rows.map(r => JSON.parse(r.state));
    },

    async update(executionId, updates) {
      const existing = await this.load(executionId);
      if (existing) {
        await this.save({ ...existing, ...updates, updatedAt: new Date() });
      }
    },
  }),
});
```

### 13.5 Resumption

```typescript
// Resume a specific execution
const result = await orderSaga.resume("exec-123");

// Resume all pending sagas on startup
async function resumePendingSagas(container: Container) {
  const persister = container.resolve(SagaPersisterPort);
  const orderSaga = container.resolve(OrderSagaPort);

  const pending = await persister.list({
    status: "running",
    sagaName: "OrderSaga",
  });

  for (const state of pending) {
    console.log(`Resuming saga ${state.executionId}`);
    try {
      const result = await orderSaga.resume(state.executionId);
      if (result.success) {
        console.log(`Saga ${state.executionId} completed`);
      } else {
        console.error(`Saga ${state.executionId} failed:`, result.error);
      }
    } catch (error) {
      console.error(`Failed to resume ${state.executionId}:`, error);
    }
  }
}
```

---

## 14. HexDI Integration

### 14.1 Container Integration

Sagas integrate seamlessly with HexDI's container:

```typescript
// Build graph with all dependencies
const graph = createGraph()
  // Infrastructure
  .provide(HttpClientAdapter)
  .provide(DatabaseAdapter)
  .provide(PostgresPersisterAdapter)

  // Domain services
  .provide(InventoryAdapter)
  .provide(PaymentAdapter)
  .provide(ShippingAdapter)
  .provide(NotificationAdapter)

  // Sagas
  .provide(OrderSagaAdapter)
  .provide(PaymentSagaAdapter)
  .provide(FulfillmentSagaAdapter)

  .build();

// Create container and resolve saga
const container = createContainer(graph);
const orderSaga = container.resolve(OrderSagaPort);

// Execute
const result = await orderSaga.execute(orderInput);
```

### 14.2 Scoped Execution

Sagas respect HexDI's scoping rules:

```typescript
// Per-request scope
const scope = container.createScope();

// Request-scoped dependencies (e.g., auth context) are available
const orderSaga = scope.resolve(OrderSagaPort);
const result = await orderSaga.execute(orderInput);

// Cleanup
scope.dispose();
```

### 14.3 Resolution Flow

```
saga.execute(input)
       │
       ▼
┌─────────────────────────────────────────┐
│ For each step:                          │
│                                         │
│ 1. Get step's port                      │
│    const port = step.port;              │
│                                         │
│ 2. Resolve adapter from container       │
│    const adapter = container.resolve(port);
│                                         │
│ 3. Build params from context            │
│    const params = step.invoke(context); │
│                                         │
│ 4. Execute                              │
│    const result = await adapter(params);│
│                                         │
│ 5. Store result in context              │
│    context.results[step.name] = result; │
└─────────────────────────────────────────┘
```

### 14.4 Testing with Different Graphs

```typescript
// Production graph
const productionGraph = createGraph()
  .provide(HttpClientAdapter)
  .provide(StripePaymentAdapter)
  .provide(FedExShippingAdapter)
  .provide(OrderSagaAdapter)
  .build();

// Test graph with mocks
const testGraph = createGraph()
  .provide(MockHttpClientAdapter)
  .provide(MockPaymentAdapter)
  .provide(MockShippingAdapter)
  .provide(OrderSagaAdapter) // Same saga, different dependencies
  .build();

// Integration test
test("order saga completes successfully", async () => {
  const container = createContainer(testGraph);
  const orderSaga = container.resolve(OrderSagaPort);

  const result = await orderSaga.execute({
    orderId: "test-order",
    items: [{ productId: "prod-1", quantity: 1 }],
    paymentMethod: "card",
  });

  expect(result.success).toBe(true);
});
```

---

## 15. React Integration

### 15.1 useSaga Hook

```typescript
function useSaga<P extends SagaPort<string, unknown, unknown>>(port: P): UseSagaResult<P>;

interface UseSagaResult<P extends SagaPort<string, unknown, unknown>> {
  /** Current execution status */
  status: "idle" | "running" | "compensating" | "success" | "error";

  /** Execute the saga */
  execute: (input: InferSagaPortInput<P>) => Promise<SagaResult<InferSagaPortOutput<P>>>;

  /** Resume a previous execution */
  resume: (executionId: string) => Promise<SagaResult<InferSagaPortOutput<P>>>;

  /** Cancel the current execution */
  cancel: () => Promise<void>;

  /** Result data (if successful) */
  data: InferSagaPortOutput<P> | undefined;

  /** Error (if failed) */
  error: SagaError | null;

  /** Whether compensation completed */
  compensated: boolean;

  /** Current step name (when running) */
  currentStep: string | undefined;

  /** Execution ID */
  executionId: string | undefined;

  /** Reset to idle state */
  reset: () => void;
}
```

### 15.2 Usage Examples

#### Basic Usage

```typescript
function CheckoutButton({ order }: { order: OrderInput }) {
  const { execute, status, data, error } = useSaga(OrderSagaPort);

  const handleCheckout = async () => {
    const result = await execute(order);
    if (result.success) {
      router.push(`/order/${result.output.orderId}`);
    }
  };

  return (
    <div>
      <button onClick={handleCheckout} disabled={status === 'running'}>
        {status === 'running' ? 'Processing...' : 'Checkout'}
      </button>

      {status === 'compensating' && (
        <Alert>Something went wrong, rolling back...</Alert>
      )}

      {error && (
        <Alert type="error">
          Failed at step: {error.stepName}
          <p>{error.cause.message}</p>
        </Alert>
      )}
    </div>
  );
}
```

#### With Progress Tracking

```typescript
function OrderProgress({ order }: { order: OrderInput }) {
  const { execute, status, currentStep, error, compensated } = useSaga(OrderSagaPort);

  const steps = ['Validate', 'Reserve Stock', 'Charge Payment', 'Ship', 'Notify'];

  const currentIndex = steps.findIndex(
    s => s.toLowerCase().replace(' ', '') === currentStep?.toLowerCase()
  );

  return (
    <div>
      <Stepper activeStep={currentIndex}>
        {steps.map((step, i) => (
          <Step
            key={step}
            completed={i < currentIndex}
            error={status === 'error' && i === currentIndex}
          >
            {step}
          </Step>
        ))}
      </Stepper>

      {status === 'idle' && (
        <button onClick={() => execute(order)}>Start Order</button>
      )}

      {status === 'compensating' && (
        <Alert type="warning">
          Order failed, reversing changes...
        </Alert>
      )}

      {status === 'error' && compensated && (
        <Alert type="info">
          Order was cancelled. No charges were made.
        </Alert>
      )}
    </div>
  );
}
```

### 15.3 useSagaStatus Hook

Monitor status of a specific execution:

```typescript
function useSagaStatus<P extends SagaPort<string, unknown, unknown>>(
  port: P,
  executionId: string | undefined,
): SagaStatus | null;

// Usage
function OrderTracker({ executionId }: { executionId: string }) {
  const status = useSagaStatus(OrderSagaPort, executionId);

  if (!status) return <Spinner />;

  return (
    <div>
      <p>Status: {status.state}</p>
      {status.state === 'running' && <p>Current step: {status.stepName}</p>}
      {status.state === 'completed' && <p>Order complete!</p>}
      {status.state === 'failed' && <p>Order failed: {status.error.message}</p>}
    </div>
  );
}
```

### 15.4 useSagaHistory Hook

Track execution history:

```typescript
function useSagaHistory<P extends SagaPort<string, unknown, unknown>>(
  port: P,
  filters?: ExecutionFilters,
): {
  executions: SagaExecutionSummary[];
  isLoading: boolean;
  refresh: () => void;
};

// Usage
function OrderHistory() {
  const { executions, isLoading, refresh } = useSagaHistory(OrderSagaPort, {
    limit: 10,
  });

  if (isLoading) return <Spinner />;

  return (
    <div>
      <button onClick={refresh}>Refresh</button>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
            <th>Started</th>
          </tr>
        </thead>
        <tbody>
          {executions.map(exec => (
            <tr key={exec.executionId}>
              <td>{exec.executionId}</td>
              <td>{exec.status}</td>
              <td>{exec.startedAt.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### 15.5 SagaBoundary Component

Error boundary for saga failures:

```typescript
interface SagaBoundaryProps {
  children: React.ReactNode;
  fallback: (error: SagaError, retry: () => void) => React.ReactNode;
}

function SagaBoundary({ children, fallback }: SagaBoundaryProps): JSX.Element;

// Usage
function CheckoutPage() {
  return (
    <SagaBoundary
      fallback={(error, retry) => (
        <div>
          <h2>Checkout Failed</h2>
          <p>Failed at: {error.stepName}</p>
          <p>{error.cause.message}</p>
          <button onClick={retry}>Try Again</button>
        </div>
      )}
    >
      <CheckoutForm />
    </SagaBoundary>
  );
}
```

---

## 16. Testing Patterns

### 16.1 Test Harness

```typescript
function createSagaTestHarness<TSaga extends SagaDefinition<string, any, any, any>>(
  saga: TSaga
): SagaTestHarness<TSaga>;

interface SagaTestHarness<TSaga extends SagaDefinition<string, any, any, any>> {
  /** Mock a port used by the saga */
  mockPort<P extends Port<string, unknown>>(
    port: P,
    implementation: PortType<P>
  ): SagaTestHarness<TSaga>;

  /** Enable execution tracing */
  withTracing(): SagaTestHarness<TSaga>;

  /** Execute the saga */
  execute(input: InferSagaInput<TSaga>): Promise<SagaResult<InferSagaOutput<TSaga>>>;

  /** Get execution trace (requires withTracing) */
  getTrace(): ExecutionTrace;

  /** Get mock call history for a port */
  getCalls<P extends Port<string, unknown>>(port: P): MockCall[];

  /** Reset all mocks */
  reset(): void;
}

interface MockCall {
  args: unknown[];
  result?: unknown;
  error?: Error;
  timestamp: Date;
}
```

### 16.2 Testing Examples

#### Test Successful Execution

```typescript
describe("OrderSaga", () => {
  it("completes order successfully", async () => {
    const harness = createSagaTestHarness(OrderSaga)
      .mockPort(InventoryPort, {
        reserve: async () => ({ reservationId: "res-1" }),
        release: async () => ({ released: true }),
      })
      .mockPort(PaymentPort, {
        charge: async () => ({ transactionId: "txn-1" }),
        refund: async () => ({ refunded: true }),
      })
      .mockPort(ShippingPort, {
        ship: async () => ({ trackingNumber: "TRACK123" }),
        cancel: async () => ({ cancelled: true }),
      })
      .mockPort(NotificationPort, {
        send: async () => ({ notificationId: "notif-1" }),
      });

    const result = await harness.execute({
      orderId: "order-1",
      userId: "user-1",
      items: [{ productId: "prod-1", quantity: 1 }],
      paymentMethod: "card",
      shippingAddress: {
        /* ... */
      },
    });

    expect(result.success).toBe(true);
    expect(result.output).toEqual({
      orderId: "order-1",
      trackingNumber: "TRACK123",
      transactionId: "txn-1",
    });
  });
});
```

#### Test Compensation

```typescript
it("compensates on shipping failure", async () => {
  const releaseMock = vi.fn().mockResolvedValue({ released: true });
  const refundMock = vi.fn().mockResolvedValue({ refunded: true });

  const harness = createSagaTestHarness(OrderSaga)
    .mockPort(InventoryPort, {
      reserve: async () => ({ reservationId: "res-1" }),
      release: releaseMock,
    })
    .mockPort(PaymentPort, {
      charge: async () => ({ transactionId: "txn-1" }),
      refund: refundMock,
    })
    .mockPort(ShippingPort, {
      ship: async () => {
        throw new Error("Shipping unavailable");
      },
    });

  const result = await harness.execute(orderInput);

  expect(result.success).toBe(false);
  expect(result.error.stepName).toBe("ShipOrder");
  expect(result.compensated).toBe(true);

  // Verify compensation was called in reverse order
  expect(refundMock).toHaveBeenCalledWith({
    action: "refund",
    transactionId: "txn-1",
  });
  expect(releaseMock).toHaveBeenCalledWith({
    action: "release",
    reservationId: "res-1",
  });

  // Verify refund was called before release (reverse order)
  expect(refundMock.mock.invocationCallOrder[0]).toBeLessThan(
    releaseMock.mock.invocationCallOrder[0]
  );
});
```

#### Test Step Retry

```typescript
it("retries failed steps", async () => {
  let attempts = 0;

  const harness = createSagaTestHarness(OrderSaga).mockPort(InventoryPort, {
    reserve: async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error("Temporary failure");
      }
      return { reservationId: "res-1" };
    },
    release: async () => ({ released: true }),
  });
  // ... other mocks

  const result = await harness.execute(orderInput);

  expect(attempts).toBe(3); // 2 failures + 1 success
  expect(result.success).toBe(true);
});
```

#### Test Conditional Steps

```typescript
it("skips discount step when no code provided", async () => {
  const harness = createSagaTestHarness(OrderSaga).withTracing();
  // ... mocks

  await harness.execute({
    ...orderInput,
    discountCode: undefined, // No discount
  });

  const trace = harness.getTrace();
  const discountStep = trace.steps.find(s => s.stepName === "ApplyDiscount");

  expect(discountStep?.status).toBe("skipped");
});
```

#### Snapshot Testing

```typescript
it("execution trace matches snapshot", async () => {
  const harness = createSagaTestHarness(OrderSaga).withTracing();
  // ... mocks

  await harness.execute(orderInput);
  const trace = harness.getTrace();

  // Normalize timestamps for snapshot
  const normalizedTrace = {
    ...trace,
    startedAt: "[timestamp]",
    completedAt: "[timestamp]",
    steps: trace.steps.map(s => ({
      ...s,
      startedAt: "[timestamp]",
      completedAt: "[timestamp]",
    })),
  };

  expect(normalizedTrace).toMatchSnapshot();
});
```

### 16.3 Integration Testing

```typescript
describe("OrderSaga Integration", () => {
  let container: Container;

  beforeEach(() => {
    // Use real implementations with test database
    const graph = createGraph()
      .provide(TestDatabaseAdapter)
      .provide(InventoryAdapter)
      .provide(MockPaymentAdapter) // Mock external payment
      .provide(MockShippingAdapter) // Mock external shipping
      .provide(OrderSagaAdapter)
      .build();

    container = createContainer(graph);
  });

  afterEach(async () => {
    // Cleanup test data
    const db = container.resolve(DatabasePort);
    await db.query("DELETE FROM inventory_reservations");
    await db.query("DELETE FROM saga_executions");
  });

  it("reserves and releases inventory correctly", async () => {
    const db = container.resolve(DatabasePort);
    const saga = container.resolve(OrderSagaPort);

    // Add test inventory
    await db.query("INSERT INTO inventory (product_id, quantity) VALUES ($1, $2)", ["prod-1", 10]);

    // Execute saga (will fail at payment due to mock)
    const result = await saga.execute({
      orderId: "test-1",
      items: [{ productId: "prod-1", quantity: 5 }],
      paymentMethod: "fail", // Triggers mock failure
    });

    // Verify inventory was restored after compensation
    const inventory = await db.query("SELECT quantity FROM inventory WHERE product_id = $1", [
      "prod-1",
    ]);
    expect(inventory.rows[0].quantity).toBe(10); // Back to original
  });
});
```

---

## 17. Advanced Patterns

### 17.1 Long-Running Sagas

For sagas that span minutes to days:

```typescript
const OnboardingSaga = defineSaga("OnboardingSaga")
  .input<OnboardingInput>()
  .step(CreateAccountStep)
  .step(SendVerificationEmailStep)
  .step(AwaitEmailVerificationStep) // May take hours
  .step(CollectProfileInfoStep)
  .step(SetupPreferencesStep)
  .step(CompleteOnboardingStep)
  .output(results => ({
    userId: results.CreateAccount.userId,
    profileComplete: true,
  }))
  .options({
    persistent: true, // Required for long-running
    timeout: 7 * 24 * 60 * 60 * 1000, // 7 days
  })
  .build();

// Await step that polls or uses webhooks
const AwaitEmailVerificationStep = defineStep("AwaitEmailVerification")
  .input<{ email: string }>()
  .output<{ verified: boolean; verifiedAt: Date }>()
  .invoke(VerificationPort)
  .withParams(ctx => ({
    action: "await",
    email: ctx.results.CreateAccount.email,
    timeout: 24 * 60 * 60 * 1000, // 24 hours
  }))
  .skipCompensation() // Verification doesn't need rollback
  .build();
```

### 17.2 Idempotent Steps

Ensure steps can be safely retried:

```typescript
const ChargePaymentStep = defineStep("ChargePayment")
  .input<{ orderId: string; amount: number }>()
  .output<{ transactionId: string }>()
  .invoke(PaymentPort)
  .withParams(ctx => ({
    action: "charge",
    amount: ctx.results.CalculateTotal.total,
    // Use execution ID as idempotency key
    idempotencyKey: `${ctx.executionId}-charge`,
  }))
  .compensate(ctx => ({
    action: "refund",
    transactionId: ctx.stepResult.transactionId,
    idempotencyKey: `${ctx.executionId}-refund`,
  }))
  .retry({
    maxAttempts: 3,
    delay: 1000,
    // Only retry if payment provider says it's safe
    retryIf: error => (error as any).retryable === true,
  })
  .build();
```

### 17.3 Distributed Sagas

For sagas spanning multiple services:

```typescript
// Service A: Order Service
const OrderCreationSaga = defineSaga("OrderCreation")
  .input<OrderInput>()
  .step(ValidateOrderStep)
  .step(PublishOrderCreatedEventStep) // Triggers Service B
  .step(AwaitInventoryReservedStep) // Waits for Service B
  .step(PublishPaymentRequestStep) // Triggers Service C
  .step(AwaitPaymentCompletedStep) // Waits for Service C
  .output(results => results)
  .options({ persistent: true })
  .build();

// Event publishing step
const PublishOrderCreatedEventStep = defineStep("PublishOrderCreated")
  .input<OrderInput>()
  .output<{ eventId: string }>()
  .invoke(EventBusPort)
  .withParams(ctx => ({
    topic: "order.created",
    payload: {
      orderId: ctx.results.ValidateOrder.orderId,
      items: ctx.input.items,
      sagaId: ctx.executionId, // For correlation
    },
  }))
  .compensate(ctx => ({
    topic: "order.cancelled",
    payload: {
      orderId: ctx.results.ValidateOrder.orderId,
      sagaId: ctx.executionId,
    },
  }))
  .build();
```

### 17.4 Saga Orchestration Patterns

#### Sequential with Early Exit

```typescript
const ValidationSaga = defineSaga("Validation")
  .input<{ data: unknown }>()
  .step(SchemaValidationStep)
  .step(BusinessRulesValidationStep)
  .step(ExternalValidationStep)
  .output(results => ({
    valid: true,
    validatedData: results.ExternalValidation.data,
  }))
  .build();

// Each validation step can throw to abort early
const SchemaValidationStep = defineStep("SchemaValidation")
  .invoke(ValidationPort)
  .withParams(ctx => ({
    type: "schema",
    data: ctx.input.data,
  }))
  .skipCompensation() // Validation doesn't modify state
  .build();
```

#### Parallel with Aggregation

```typescript
const AggregationSaga = defineSaga("Aggregation")
  .input<{ userId: string }>()
  .parallel([
    FetchUserProfileStep,
    FetchUserOrdersStep,
    FetchUserPreferencesStep,
    FetchUserNotificationsStep,
  ])
  .step(AggregateDataStep)
  .output(results => ({
    profile: results.FetchUserProfile.profile,
    orders: results.FetchUserOrders.orders,
    preferences: results.FetchUserPreferences.preferences,
    notifications: results.FetchUserNotifications.notifications,
  }))
  .build();
```

### 17.5 Circuit Breaker Integration

```typescript
const ResilientStep = defineStep("ResilientStep")
  .input<{}>()
  .output<{}>()
  .invoke(ExternalServicePort)
  .withParams(ctx => ({
    /* ... */
  }))
  .options({
    retry: {
      maxAttempts: 3,
      delay: attempt => Math.pow(2, attempt) * 1000,
      retryIf: error => {
        // Don't retry if circuit is open
        if ((error as any).code === "CIRCUIT_OPEN") {
          return false;
        }
        return true;
      },
    },
  })
  .build();

// Circuit breaker adapter wraps the real adapter
const CircuitBreakerAdapter = createAdapter(ExternalServicePort, {
  requires: [RealExternalServicePort, CircuitBreakerPort],
  factory: ({ realService, circuitBreaker }) => {
    return async params => {
      return circuitBreaker.execute(() => realService(params));
    };
  },
});
```

---

## 18. API Reference

### 18.1 @hex-di/saga Exports

```typescript
// === Definition ===
export { defineStep } from "./definition/step";
export { defineSaga } from "./definition/saga";
export type {
  StepDefinition,
  StepOptions,
  RetryConfig,
  SagaDefinition,
  SagaOptions,
} from "./definition/types";

// === Ports ===
export { createSagaPort } from "./ports/saga-port";
export { SagaPersisterPort } from "./ports/persister";
export type { SagaPort, SagaExecutor, SagaPersister, SagaExecutionState } from "./ports/types";

// === Adapters ===
export { createSagaAdapter } from "./adapters/saga-adapter";
export type { SagaAdapter } from "./adapters/types";

// === Runtime ===
export { createSagaRunner } from "./runtime/runner";
export type { SagaRunner, ExecuteOptions } from "./runtime/types";

// === Types ===
export type {
  SagaResult,
  SagaStatus,
  SagaStatusType,
  SagaEvent,
  SagaEventListener,
  StepContext,
  CompensationContext,
  ExecutionTrace,
  StepTrace,
} from "./types";

// === Errors ===
export { SagaError, CompensationError } from "./errors";
export type { SagaErrorType } from "./errors/types";

// === Type Utilities ===
export type {
  InferSagaInput,
  InferSagaOutput,
  InferSagaName,
  InferStepOutput,
  InferStepName,
  InferSagaPortInput,
  InferSagaPortOutput,
} from "./types/utils";
```

### 18.2 @hex-di/saga/testing Exports

```typescript
export { createSagaTestHarness } from "./harness";
export { mockStep, mockPort } from "./mocks";
export type { SagaTestHarness, MockCall } from "./types";
```

### 18.3 @hex-di/saga-react Exports

```typescript
// === Hooks ===
export { useSaga } from "./hooks/use-saga";
export { useSagaStatus } from "./hooks/use-saga-status";
export { useSagaHistory } from "./hooks/use-saga-history";

// === Components ===
export { SagaBoundary } from "./components/saga-boundary";

// === Types ===
export type { UseSagaResult, SagaBoundaryProps } from "./types";
```

---

## 19. Integration with Flow

HexDI Saga and HexDI Flow complement each other:

| Concern          | Flow                    | Saga                       |
| ---------------- | ----------------------- | -------------------------- |
| **Primary Use**  | UI state machines       | Multi-service transactions |
| **Scope**        | Single entity lifecycle | Cross-service workflows    |
| **Duration**     | Session lifetime        | Minutes to days            |
| **Persistence**  | Optional                | Essential for long-running |
| **Compensation** | State rollback          | Business compensation      |
| **Typical Size** | 3-10 states             | 3-20 steps                 |

### 19.1 Flow Triggering Saga

```typescript
// Flow machine can trigger a saga as an effect
const OrderMachine = createMachine({
  id: "order",
  initial: "cart",
  states: {
    cart: {
      on: { CHECKOUT: "processing" },
    },
    processing: {
      // Trigger saga on entry
      entry: effects.saga(OrderSagaPort, ctx => ({
        orderId: ctx.orderId,
        items: ctx.items,
        paymentMethod: ctx.paymentMethod,
      })),
      on: {
        // Saga completion events
        SAGA_COMPLETED: {
          target: "confirmed",
          actions: assign({ orderResult: (_, event) => event.result }),
        },
        SAGA_FAILED: {
          target: "failed",
          actions: assign({ error: (_, event) => event.error }),
        },
      },
    },
    confirmed: {
      type: "final",
    },
    failed: {
      on: {
        RETRY: "processing",
        CANCEL: "cancelled",
      },
    },
    cancelled: {
      type: "final",
    },
  },
});
```

### 19.2 Saga Step Using Flow

```typescript
// A saga step can use a flow machine for complex sub-workflows
const ApprovalStep = defineStep("Approval")
  .input<{ requestId: string }>()
  .output<{ approved: boolean; approvedBy: string }>()
  .invoke(ApprovalFlowPort) // Port wraps a flow machine
  .withParams(ctx => ({
    requestId: ctx.input.requestId,
    amount: ctx.results.CalculateTotal.total,
  }))
  .compensate(ctx => ({
    action: "revoke",
    approvalId: ctx.stepResult.approvalId,
  }))
  .build();
```

---

## Appendix A: Comparison with Other Libraries

| Feature        | Temporal        | AWS Step Functions | Redux-Saga | HexDI Saga |
| -------------- | --------------- | ------------------ | ---------- | ---------- |
| Language       | Multi           | JSON/YAML          | JS         | TypeScript |
| Type Safety    | Partial         | None               | None       | Full       |
| DI Integration | Custom          | None               | None       | Native     |
| Compensation   | Manual          | Manual             | Manual     | Automatic  |
| Testing        | Complex         | Complex            | Medium     | Simple     |
| Persistence    | Built-in        | Built-in           | None       | Pluggable  |
| Infrastructure | Requires server | AWS                | In-process | In-process |

---

## Appendix B: Glossary

| Term                    | Definition                                               |
| ----------------------- | -------------------------------------------------------- |
| **Step**                | A single unit of work in a saga that invokes a port      |
| **Saga**                | An ordered sequence of steps with defined input/output   |
| **Compensation**        | The action that undoes a step's effects                  |
| **StepContext**         | Runtime context providing input and accumulated results  |
| **CompensationContext** | Context for compensation including step result and error |
| **SagaPort**            | A port that exposes a saga executor                      |
| **SagaAdapter**         | Binds a saga definition to a port with dependencies      |
| **Persister**           | Stores saga execution state for resumption               |
| **Execution ID**        | Unique identifier for a saga execution instance          |
| **Idempotency Key**     | Token ensuring an operation executes at most once        |

---

## Appendix C: Design Decisions

### Why Port-Based Steps?

Traditional saga implementations use arbitrary functions:

```typescript
// Traditional: Steps are functions
const saga = createSaga([
  async ctx => reserveStock(ctx.input),
  async ctx => chargePayment(ctx.input),
]);
```

HexDI Saga uses ports:

```typescript
// HexDI Saga: Steps invoke ports
const saga = defineSaga("Order")
  .step(ReserveStockStep) // Invokes InventoryPort
  .step(ChargePaymentStep) // Invokes PaymentPort
  .build();
```

Benefits:

1. **Testability** - Swap adapters to test saga logic
2. **Type Safety** - Ports enforce contracts
3. **Dependency Injection** - Steps get dependencies from container
4. **Observability** - Port invocations are traceable

### Why Builder Pattern?

The builder pattern provides:

1. **Type Inference** - Each method narrows the type
2. **Validation** - Build fails if required methods missing
3. **Discoverability** - IDE shows available methods
4. **Readability** - Fluent API reads like documentation

### Why Automatic Compensation?

Manual compensation is error-prone:

```typescript
// Manual: Easy to forget or get order wrong
try {
  await reserveStock();
  await chargePayment();
  await ship();
} catch (e) {
  await releaseStock(); // Did we remember all steps?
  await refundPayment(); // In the right order?
}
```

HexDI Saga automates it:

```typescript
// Automatic: Compensation defined with step, executed automatically
const step = defineStep('Reserve')
  .invoke(InventoryPort)
  .withParams(...)
  .compensate(...) // Defined here, executed automatically on failure
  .build();
```

---

_End of Specification_
