# Integration: Query + Saga

[Previous: Store + Saga](./store-saga.md) | [README](./README.md) | [Next: Query + Flow](./query-flow.md)

---

## 1. Overview

Query and Saga address different data lifecycle concerns in the HexDI ecosystem. **Query** (`@hex-di/query`) manages data fetching with caching, deduplication, and staleness tracking through `QueryPort` and `MutationPort` definitions. **Saga** (`@hex-di/saga`) orchestrates multi-step transactions with compensation through `SagaPort` definitions. Their integration enables sagas to leverage the query cache for data fetching, invalidate stale queries after saga completion, and coordinate mutation sequences with compensation -- all through port composition in `GraphBuilder`, with no direct imports between libraries.

Key integration scenarios:

- Saga steps that fetch data through `QueryPort` adapters, benefiting from cache deduplication
- Post-saga cache invalidation that ensures the UI reflects the outcome of multi-step transactions
- Saga-managed mutation sequences where each step invokes a `MutationPort` with coordinated cache effects and compensation

## 2. Integration Architecture

Query and Saga integrate through the same port composition model as all HexDI libraries. Saga steps resolve query and mutation ports from the container at execution time. Cache invalidation after saga completion is handled through an effect adapter that resolves `QueryClientPort`.

```
                    GraphBuilder
                    +--------------------------+
                    |                          |
                    |  QueryPort  ──> Adapter  |
                    |  MutationPort ──> Adapter|
                    |  SagaPort   ──> Adapter  |
                    |  QueryClientPort ──> ... |
                    |                          |
                    +-------------|------------+
                                  |
                           createContainer
                                  |
                    +-------------|------------+
                    |         Container        |
                    |                          |
                    |  resolve(SagaPort)        |
                    |    └─> SagaExecutor       |
                    |         ├─> step resolves |
                    |         │   QueryPort     |
                    |         └─> step resolves |
                    |             MutationPort  |
                    +--------------------------+
```

The saga runtime resolves ports per step, so query cache state reflects the latest data at the time each step executes. The `QueryClientPort` provides access to the cache management API for post-saga invalidation.

## 4. Integration Patterns

### Pattern 1: Saga Step Fetches via Query Port

A saga step can resolve a `QueryFetcher` through a `QueryPort` adapter for its data needs. The query cache serves the data, and the saga step benefits from deduplication -- if multiple concurrent requests trigger the same saga, the underlying query fetch is deduplicated.

```typescript
import { createQueryPort, createQueryAdapter } from "@hex-di/query";
import { defineStep, defineSaga, sagaPort, createSagaAdapter } from "@hex-di/saga";
import type { ResultAsync } from "@hex-di/result";

// -- Query port for product data --
interface Product {
  readonly productId: string;
  readonly name: string;
  readonly price: number;
  readonly stockLevel: number;
}

interface ProductQueryError {
  readonly _tag: "ProductNotFound" | "ServiceUnavailable";
  readonly message: string;
}

const ProductsPort = createQueryPort<Product, { productId: string }, ProductQueryError>()({
  name: "Products",
  defaults: { staleTime: 60_000 },
});

// -- Saga step that fetches product data via QueryPort --
const FetchProductStep = defineStep("FetchProduct")
  .io<{ productId: string }, Product>()
  .invoke(ProductsPort, ctx => ({
    productId: ctx.input.productId,
  }))
  .build();

// The query cache serves the data. If the product was recently
// fetched (within staleTime), the cached value is returned
// without hitting the network. If the query fails, the saga
// step fails with the query's typed error (ProductQueryError),
// which the saga runtime wraps in SagaError<ProductQueryError>.
```

When the query fails, the saga step fails with `SagaError<ProductQueryError>`, and the `cause` field carries the original `ProductQueryError` with its `_tag` discriminant. This enables structured error handling in saga error handlers.

### Pattern 2: Saga Completion Invalidates Queries

After a saga completes, an effect adapter triggers cache invalidation for affected query ports. This ensures the UI receives fresh data that reflects the outcome of the multi-step transaction.

```typescript
import { port, createAdapter } from "@hex-di/core";
import type { QueryClient } from "@hex-di/query";

// -- QueryClientPort resolves to the QueryClient for cache management --
const QueryClientPort = port<QueryClient>()({ name: "QueryClient" });

// -- Effect port for post-saga cache invalidation --
const OrderCacheInvalidationPort = port<{
  invalidateOrderQueries(): ResultAsync<void, never>;
}>()({ name: "OrderCacheInvalidation" });

// Adapter that resolves QueryClientPort and invalidates affected queries
const OrderCacheInvalidationAdapter = createAdapter(OrderCacheInvalidationPort, {
  requires: [QueryClientPort],
  factory: deps => ({
    invalidateOrderQueries() {
      // Invalidate specific query ports affected by the order saga
      deps.QueryClient.invalidate(OrdersPort);
      deps.QueryClient.invalidate(OrderByIdPort);
      deps.QueryClient.invalidate(InventoryPort);
      return ok(undefined);
    },
  }),
});

// -- Saga step that invalidates caches after checkout --
const InvalidateCachesStep = defineStep("InvalidateCaches")
  .io<{ orderId: string }, void>()
  .invoke(OrderCacheInvalidationPort, ctx => ({
    // No input needed -- the adapter knows which ports to invalidate
  }))
  .build();

// -- Complete saga with cache invalidation as final step --
const CheckoutSaga = defineSaga("Checkout")
  .input<CheckoutInput>()
  .step(ValidateOrderStep)
  .step(ReserveStockStep)
  .step(ChargePaymentStep)
  .step(ShipOrderStep)
  .step(InvalidateCachesStep) // Final step invalidates query caches
  .output(results => ({
    orderId: results.ValidateOrder.orderId,
    trackingNumber: results.ShipOrder.trackingNumber,
  }))
  .build();

// -- Graph composition --
const graph = GraphBuilder.create()
  .provide(QueryClientAdapter)
  .provide(OrdersQueryAdapter)
  .provide(OrderByIdQueryAdapter)
  .provide(InventoryQueryAdapter)
  .provide(OrderCacheInvalidationAdapter)
  .provide(StockValidationAdapter)
  .provide(PaymentAdapter)
  .provide(ShippingAdapter)
  .provide(createSagaAdapter(CheckoutSagaPort, { saga: CheckoutSaga }))
  .build();
```

The invalidation step runs only when all preceding steps succeed. If any step fails and compensation runs, the invalidation step is never reached, so the cache retains its pre-saga state -- which is correct, since the saga's effects were rolled back.

### Pattern 3: Saga-Managed Mutation Sequence

Each saga step invokes a `MutationPort`, coordinating what would otherwise be independent mutations into a transactional sequence with compensation. Each mutation has its own cache effects (`invalidates`, `removes`), and on saga failure, compensation invokes reverse mutations.

```typescript
import { createMutationPort } from "@hex-di/query";
import { defineStep, defineSaga } from "@hex-di/saga";

// -- Mutation ports --
const ReserveStockMutation = createMutationPort<
  { reservationId: string },
  { productId: string; quantity: number },
  InventoryError
>()({
  name: "ReserveStock",
  effects: { invalidates: [InventoryPort] },
});

const ChargePaymentMutation = createMutationPort<
  { transactionId: string },
  { amount: number; method: string },
  PaymentError
>()({
  name: "ChargePayment",
  // No cache effects -- payment state is not cached
});

const CreateShipmentMutation = createMutationPort<
  { shipmentId: string; trackingNumber: string },
  { orderId: string; address: Address },
  ShippingError
>()({
  name: "CreateShipment",
  effects: { invalidates: [OrdersPort, OrderByIdPort] },
});

// -- Reverse mutation ports for compensation --
const ReleaseStockMutation = createMutationPort<void, { reservationId: string }>()({
  name: "ReleaseStock",
  effects: { invalidates: [InventoryPort] },
});

const RefundPaymentMutation = createMutationPort<void, { transactionId: string }>()({
  name: "RefundPayment",
});

// -- Saga steps wrapping mutations --
const ReserveStockStep = defineStep("ReserveStock")
  .io<{ productId: string; quantity: number }, { reservationId: string }>()
  .invoke(ReserveStockMutation, ctx => ({
    productId: ctx.input.productId,
    quantity: ctx.input.quantity,
  }))
  .compensate(ReleaseStockMutation, ctx => ({
    reservationId: ctx.stepResult.reservationId,
  }))
  .build();

const ChargePaymentStep = defineStep("ChargePayment")
  .io<{ amount: number; method: string }, { transactionId: string }>()
  .invoke(ChargePaymentMutation, ctx => ({
    amount: ctx.input.amount,
    method: ctx.input.method,
  }))
  .compensate(RefundPaymentMutation, ctx => ({
    transactionId: ctx.stepResult.transactionId,
  }))
  .build();

const CreateShipmentStep = defineStep("CreateShipment")
  .io<{ orderId: string; address: Address }, { shipmentId: string; trackingNumber: string }>()
  .invoke(CreateShipmentMutation, ctx => ({
    orderId: ctx.input.orderId,
    address: ctx.input.address,
  }))
  .build();

// -- Saga definition --
const OrderFulfillmentSaga = defineSaga("OrderFulfillment")
  .input<OrderFulfillmentInput>()
  .step(ReserveStockStep)
  .step(ChargePaymentStep)
  .step(CreateShipmentStep)
  .output(results => ({
    reservationId: results.ReserveStock.reservationId,
    transactionId: results.ChargePayment.transactionId,
    trackingNumber: results.CreateShipment.trackingNumber,
  }))
  .build();
```

Each mutation's `effects` are triggered independently by the query cache layer upon success. If `CreateShipmentStep` fails, compensation invokes `RefundPaymentMutation` and `ReleaseStockMutation` in reverse order. The reverse mutations have their own cache effects, so the cache is updated to reflect the rollback.

## 6. Error Handling

Query + Saga error handling composes `ResolutionError`, `SagaError`, and `QueryError` types using `safeTry`:

```typescript
import { safeTry, ok } from "@hex-di/result";
import type { ResultAsync } from "@hex-di/result";
import type { ResolutionError } from "@hex-di/core";
import type { SagaError } from "@hex-di/saga";

type QueryError =
  | { readonly _tag: "ProductNotFound"; readonly productId: string }
  | { readonly _tag: "ServiceUnavailable"; readonly message: string };

type OrderSagaErrors = QueryError | PaymentError | ShippingError;

function executeOrderWithQuery(
  scope: Scope,
  input: OrderInput
): ResultAsync<OrderOutput, ResolutionError | SagaError<OrderSagaErrors>> {
  return safeTry(async function* () {
    // Resolve the saga executor -- yields ResolutionError on failure
    const orderSaga = yield* scope.resolveResult(OrderSagaPort);

    // Execute the saga -- yields SagaError on failure
    // SagaError.cause may be QueryError | PaymentError | ShippingError
    const result = yield* await orderSaga.execute(input);

    return ok(result.output);
  });
}

// Handle the composed error types
const result = await executeOrderWithQuery(scope, orderInput);

result.match(
  success => {
    console.log("Order fulfilled:", success.trackingNumber);
  },
  error => {
    if (error._tag === "MissingAdapter") {
      console.error("Container misconfigured:", error.portName);
    } else if (error._tag === "StepFailed") {
      const cause = error.cause;
      switch (cause._tag) {
        case "ProductNotFound":
          console.error("Product not found:", cause.productId);
          break;
        case "ServiceUnavailable":
          console.error("Service down:", cause.message);
          break;
        case "PaymentDeclined":
          console.error("Payment declined");
          break;
        default:
          console.error("Step failed:", cause._tag);
      }
    }
  }
);
```

## 7. Testing

Test Query + Saga integration with fake adapters:

```typescript
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { createQueryAdapter, createMutationAdapter } from "@hex-di/query";
import { createSagaAdapter } from "@hex-di/saga";

// Fake query adapter returning fixed data
const FakeProductsAdapter = createQueryAdapter(ProductsPort, {
  fetcher: params =>
    okAsync({
      productId: params.productId,
      name: "Test Widget",
      price: 25,
      stockLevel: 100,
    }),
});

// Fake mutation adapter that records calls
const mutationCalls: Array<{ name: string; input: unknown }> = [];

const FakeReserveStockAdapter = createMutationAdapter(ReserveStockMutation, {
  executor: input => {
    mutationCalls.push({ name: "ReserveStock", input });
    return okAsync({ reservationId: "res-test-001" });
  },
});

const FakeChargePaymentAdapter = createMutationAdapter(ChargePaymentMutation, {
  executor: input => {
    mutationCalls.push({ name: "ChargePayment", input });
    return okAsync({ transactionId: "txn-test-001" });
  },
});

const FakeCreateShipmentAdapter = createMutationAdapter(CreateShipmentMutation, {
  executor: input => {
    mutationCalls.push({ name: "CreateShipment", input });
    return okAsync({ shipmentId: "ship-001", trackingNumber: "TRK-TEST-001" });
  },
});

// Test graph
const testGraph = GraphBuilder.create()
  .provide(FakeProductsAdapter)
  .provide(FakeReserveStockAdapter)
  .provide(FakeChargePaymentAdapter)
  .provide(FakeCreateShipmentAdapter)
  .provide(FakeReleaseStockAdapter)
  .provide(FakeRefundPaymentAdapter)
  .provide(FakeQueryClientAdapter)
  .provide(createSagaAdapter(OrderSagaPort, { saga: OrderFulfillmentSaga }))
  .build();

const container = createContainer({ graph: testGraph, name: "Test" });

test("saga executes mutations in sequence", async () => {
  mutationCalls.length = 0;
  const saga = container.resolve(OrderSagaPort);
  const result = await saga.execute(testInput);

  expect(result.isOk()).toBe(true);
  expect(mutationCalls.map(c => c.name)).toEqual([
    "ReserveStock",
    "ChargePayment",
    "CreateShipment",
  ]);
});

test("saga compensates mutations on failure", async () => {
  // Override CreateShipment to fail
  const failGraph = GraphBuilder.create()
    .provide(FakeProductsAdapter)
    .provide(FakeReserveStockAdapter)
    .provide(FakeChargePaymentAdapter)
    .provide(
      createMutationAdapter(CreateShipmentMutation, {
        executor: () =>
          errAsync({
            _tag: "ShippingUnavailable" as const,
            message: "Carrier down",
          }),
      })
    )
    .provide(FakeReleaseStockAdapter)
    .provide(FakeRefundPaymentAdapter)
    .provide(FakeQueryClientAdapter)
    .provide(createSagaAdapter(OrderSagaPort, { saga: OrderFulfillmentSaga }))
    .build();

  const failContainer = createContainer({ graph: failGraph, name: "FailTest" });
  const saga = failContainer.resolve(OrderSagaPort);
  const result = await saga.execute(testInput);

  expect(result.isErr()).toBe(true);
  result.match(
    () => {
      throw new Error("Expected failure");
    },
    error => {
      expect(error._tag).toBe("StepFailed");
      expect(error.stepName).toBe("CreateShipment");
      expect(error.compensatedSteps).toContain("ChargePayment");
      expect(error.compensatedSteps).toContain("ReserveStock");
    }
  );
});
```

## 8. Anti-Patterns

### 1. Saga Bypassing Query Cache

```typescript
// BAD: Direct HTTP call instead of going through QueryPort
const BadFetchStep = defineStep("BadFetch")
  .io<Input, Output>()
  .invoke(HttpClientPort, ctx => ({
    url: `/api/products/${ctx.input.productId}`,
    method: "GET",
  }))
  .build();
```

Fetching data directly through an HTTP client port bypasses the query cache, losing deduplication, staleness tracking, and cache benefits. Always fetch through a `QueryPort` adapter so that saga steps benefit from the query cache layer.

### 2. Over-Invalidation

```typescript
// BAD: Invalidating all queries after saga completion
const BadInvalidation = createAdapter(CacheInvalidationPort, {
  requires: [QueryClientPort],
  factory: deps => ({
    invalidateAll() {
      // Scorched-earth invalidation -- forces refetch of everything
      deps.QueryClient.invalidateAll();
      return ok(undefined);
    },
  }),
});
```

Invalidating all queries after a saga forces the entire application to refetch data, most of which was unaffected by the saga. Invalidate only the specific query ports that the saga's steps affected. Use the `effects.invalidates` declarations on `MutationPort` to guide targeted invalidation.

### 3. No Compensation for Mutation Side Effects

```typescript
// BAD: Mutation step without compensation leaves cache inconsistent
const BadMutationStep = defineStep("UpdateInventory")
  .io<Input, Output>()
  .invoke(UpdateInventoryMutation, ctx => ({
    /* ... */
  }))
  // No .compensate() -- if a later step fails, the inventory
  // mutation's cache effects have already fired but the business
  // operation is being rolled back
  .build();
```

When a mutation step succeeds, its cache effects (`invalidates`, `removes`) fire immediately. If a later saga step fails, the saga compensates business operations, but the cache effects from the succeeded mutation have already been applied. Without a compensation step that invokes a reverse mutation (which triggers its own cache effects), the cache is left reflecting a state that no longer matches reality. Always pair mutation steps with compensation mutations that carry appropriate cache effects.

---

[Previous: Store + Saga](./store-saga.md) | [README](./README.md) | [Next: Query + Flow](./query-flow.md)
