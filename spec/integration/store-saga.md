# Integration: Store + Saga

[Previous: Store + Flow](./store-flow.md) | [README](./README.md) | [Next: Query + Saga](./query-saga.md)

---

## 1. Overview

Store and Saga serve complementary roles in the HexDI ecosystem. **Store** (`@hex-di/store`) manages reactive client-side state through `StatePort` and `AtomPort` definitions, while **Saga** (`@hex-di/saga`) orchestrates multi-step transactions across service boundaries through `SagaPort` definitions. Their integration enables sagas to read current application state as input, update state as a side effect of successful steps, and refresh state after saga completion -- all through port composition in `GraphBuilder`, with no direct imports between libraries.

Key integration scenarios:

- Saga steps that read Store state to inform business logic (e.g., validate cart contents before checkout)
- Saga steps that dispatch Store actions as side effects, with compensation that dispatches rollback actions
- Post-saga effects that refresh Store state to reflect the outcome of multi-step transactions

## 2. Integration Architecture

Store and Saga integrate through the standard HexDI port composition model. Both libraries define ports that resolve to services through adapters registered in the `GraphBuilder`. Saga steps declare port dependencies that the saga runtime resolves from the container at execution time.

```
                    GraphBuilder
                    +--------------------------+
                    |                          |
                    |  StatePort ──> Adapter   |
                    |  SagaPort  ──> Adapter   |
                    |  EffectPort ──> Adapter  |
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
                    |         └─> step resolves |
                    |             StatePort     |
                    +--------------------------+
```

The saga runtime resolves ports per step invocation, not upfront. This means each step reads the current Store state at the time it executes, and scoped adapters receive the correct scope context.

## 4. Integration Patterns

### Pattern 1: Saga Step Reads Store State

A saga step can resolve a `StatePort`-backed adapter to read current application state as input to its business logic. The step declares the state port in its port dependency, and the saga runtime resolves it from the container.

```typescript
import { createStatePort } from "@hex-di/store";
import { sagaPort, createSagaAdapter, defineStep, defineSaga } from "@hex-di/saga";
import type { ActionMap, ActionReducer } from "@hex-di/store";

// -- Store port for cart state --
interface CartState {
  readonly items: ReadonlyArray<{
    readonly productId: string;
    readonly quantity: number;
    readonly unitPrice: number;
  }>;
  readonly couponCode: string | undefined;
}

interface CartActions extends ActionMap<CartState> {
  addItem: ActionReducer<CartState, { productId: string; quantity: number; unitPrice: number }>;
  removeItem: ActionReducer<CartState, { productId: string }>;
  applyCoupon: ActionReducer<CartState, string>;
}

const CartPort = createStatePort<CartState, CartActions>()({
  name: "Cart",
});

// -- Port that validates stock availability --
const StockValidationPort = port<
  (
    items: ReadonlyArray<{ productId: string; quantity: number }>
  ) => ResultAsync<{ allAvailable: boolean; unavailable: readonly string[] }, StockCheckError>
>()({ name: "StockValidation" });

// -- Saga step that reads cart state to validate stock --
const ValidateStockStep = defineStep("ValidateStock")
  .io<{ orderId: string }, { allAvailable: boolean; validatedAt: number }>()
  .invoke(StockValidationPort, ctx => {
    // The cart state is read from the Store via the container
    // The saga context provides access to resolved ports
    return ctx.deps.Cart.state.items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
    }));
  })
  .requires([CartPort])
  .build();
```

The step declares `CartPort` in its `requires` array, making the resolved `StateService<CartState, CartActions>` available in `ctx.deps.Cart`. The step reads `ctx.deps.Cart.state` to get the current cart contents and passes them to the stock validation port.

### Pattern 2: Saga Step Updates Store State

A saga step can dispatch Store actions as side effects of its execution. Compensation dispatches rollback actions to undo the state change. This uses an "effect port" pattern where a port wraps Store dispatch operations.

```typescript
import { port } from "@hex-di/core";
import { createAdapter } from "@hex-di/core";
import type { ResultAsync } from "@hex-di/result";
import { ok } from "@hex-di/result";

// -- Domain types --
type OrderStatus = "pending" | "processing" | "completed" | "cancelled";

interface OrderState {
  readonly orderId: string;
  readonly status: OrderStatus;
  readonly updatedAt: number;
}

interface OrderActions extends ActionMap<OrderState> {
  setStatus: ActionReducer<OrderState, OrderStatus>;
}

const OrderStatePort = createStatePort<OrderState, OrderActions>()({
  name: "OrderState",
});

// -- Effect port that wraps store dispatch --
const OrderStatusEffectPort = port<{
  updateStatus(orderId: string, status: OrderStatus): ResultAsync<void, never>;
}>()({ name: "OrderStatusEffect" });

// Adapter bridges the effect port to the Store
const OrderStatusEffectAdapter = createAdapter(OrderStatusEffectPort, {
  requires: [OrderStatePort],
  factory: deps => ({
    updateStatus(orderId: string, status: OrderStatus) {
      deps.OrderState.actions.setStatus(status);
      return ok(undefined);
    },
  }),
});

// -- Saga step that updates order status with compensation --
const UpdateOrderStatusStep = defineStep("UpdateOrderStatus")
  .io<{ orderId: string; newStatus: OrderStatus }, { previousStatus: OrderStatus }>()
  .invoke(OrderStatusEffectPort, ctx => ({
    orderId: ctx.input.orderId,
    status: "processing",
  }))
  .compensate(OrderStatusEffectPort, ctx => ({
    // Roll back to the previous status captured in the step result
    orderId: ctx.input.orderId,
    status: "cancelled",
  }))
  .build();
```

The compensation handler dispatches `setStatus("cancelled")` to roll back the order status. Because compensation runs in the same scope as forward execution, the Store adapter instance is the same, ensuring consistent state.

### Pattern 3: Saga Completion Refreshes Store

After a saga completes, an effect adapter observes the completion and dispatches a refresh action to the Store. This keeps the Store in sync with the latest domain state after multi-step transactions.

```typescript
import { port, createAdapter } from "@hex-di/core";
import type { SagaEvent } from "@hex-di/saga";

// -- Port for post-saga store refresh --
const OrderRefreshPort = port<{
  onSagaComplete(executionId: string): ResultAsync<void, never>;
}>()({ name: "OrderRefresh" });

// Adapter that bridges saga completion to store actions
const OrderRefreshAdapter = createAdapter(OrderRefreshPort, {
  requires: [OrderStatePort, OrderListPort],
  factory: deps => ({
    onSagaComplete(executionId: string) {
      // Dispatch refresh actions to relevant store ports
      deps.OrderState.actions.setStatus("completed");
      deps.OrderList.actions.refreshOrders();
      return ok(undefined);
    },
  }),
});

// -- Wire it into a saga using the final step --
const RefreshStoreStep = defineStep("RefreshStore")
  .io<{ orderId: string }, void>()
  .invoke(OrderRefreshPort, ctx => ({
    executionId: ctx.executionId,
  }))
  .build();

// -- Complete saga definition --
const CheckoutSaga = defineSaga("Checkout")
  .input<CheckoutInput>()
  .step(ValidateStockStep)
  .step(UpdateOrderStatusStep)
  .step(ChargePaymentStep)
  .step(RefreshStoreStep) // Final step refreshes store
  .output(results => ({
    orderId: results.ValidateStock.orderId,
    transactionId: results.ChargePayment.transactionId,
  }))
  .build();

// -- Graph composition --
const graph = GraphBuilder.create()
  .provide(CartAdapter)
  .provide(OrderStateAdapter)
  .provide(OrderListAdapter)
  .provide(OrderStatusEffectAdapter)
  .provide(OrderRefreshAdapter)
  .provide(StockValidationAdapter)
  .provide(PaymentAdapter)
  .provide(createSagaAdapter(CheckoutSagaPort, { saga: CheckoutSaga }))
  .build();

const container = createContainer({ graph, name: "Checkout" });
```

The `RefreshStoreStep` runs as the final saga step. On success, it dispatches refresh actions to update the Store. If an earlier step fails and compensation runs, this step is never reached, so the Store is not prematurely refreshed.

## 6. Error Handling

Store + Saga error handling composes `ResolutionError`, `SagaError`, and store dispatch errors using `safeTry`:

```typescript
import { safeTry, ok } from "@hex-di/result";
import type { ResultAsync } from "@hex-di/result";
import type { ResolutionError } from "@hex-di/core";
import type { SagaError } from "@hex-di/saga";

interface StoreDispatchError {
  readonly _tag: "StoreDispatchError";
  readonly portName: string;
  readonly action: string;
  readonly cause: unknown;
}

function executeCheckoutWithState(
  scope: Scope,
  input: CheckoutInput
): ResultAsync<CheckoutOutput, ResolutionError | SagaError<CheckoutErrors> | StoreDispatchError> {
  return safeTry(async function* () {
    // Resolve store to read current state
    const cart = yield* scope.resolveResult(CartPort);

    // Validate cart is not empty before starting saga
    if (cart.state.items.length === 0) {
      return err({
        _tag: "StoreDispatchError" as const,
        portName: "Cart",
        action: "read",
        cause: "Cart is empty",
      });
    }

    // Resolve and execute the saga
    const checkoutSaga = yield* scope.resolveResult(CheckoutSagaPort);
    const result = yield* await checkoutSaga.execute({
      ...input,
      items: cart.state.items,
    });

    return ok(result.output);
  });
}
```

The `safeTry` generator composes three error channels into a single `ResultAsync`. Each `yield*` short-circuits on `Err`, propagating the typed error to the caller.

## 7. Testing

Test Store + Saga integration with in-memory adapters:

```typescript
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { createStateAdapter } from "@hex-di/store";
import { createSagaAdapter } from "@hex-di/saga";

// In-memory store adapter with initial state
const TestCartAdapter = createStateAdapter(CartPort, {
  initial: {
    items: [{ productId: "WIDGET-1", quantity: 2, unitPrice: 25 }],
    couponCode: undefined,
  },
  reducers: {
    addItem: (state, payload) => ({ ...state, items: [...state.items, payload] }),
    removeItem: (state, payload) => ({
      ...state,
      items: state.items.filter(i => i.productId !== payload.productId),
    }),
    applyCoupon: (state, code) => ({ ...state, couponCode: code }),
  },
});

// Fake saga adapter that returns fixed results
const FakeCheckoutAdapter = createAdapter(CheckoutSagaPort, {
  factory: () => ({
    execute: (input: CheckoutInput) =>
      okAsync({
        output: { orderId: input.orderId, transactionId: "txn-test-001" },
        executionId: "exec-test-001",
      }),
  }),
});

// Test graph
const testGraph = GraphBuilder.create()
  .provide(TestCartAdapter)
  .provide(TestOrderStateAdapter)
  .provide(FakeCheckoutAdapter)
  .build();

const container = createContainer({ graph: testGraph, name: "Test" });

// Test: saga reads cart state
test("checkout saga reads cart items", async () => {
  const cart = container.resolve(CartPort);
  expect(cart.state.items).toHaveLength(1);

  const saga = container.resolve(CheckoutSagaPort);
  const result = await saga.execute({ orderId: "order-test" });

  expect(result.isOk()).toBe(true);
  result.match(
    success => {
      expect(success.output.transactionId).toBe("txn-test-001");
    },
    error => {
      throw new Error(`Expected success but got ${error._tag}`);
    }
  );
});
```

For testing saga steps that update Store state, verify the Store state after saga execution:

```typescript
test("saga step updates order status", async () => {
  const scope = container.createScope("test-request");
  const orderState = scope.resolve(OrderStatePort);

  expect(orderState.state.status).toBe("pending");

  const saga = scope.resolve(CheckoutSagaPort);
  await saga.execute({ orderId: "order-1" });

  expect(orderState.state.status).toBe("completed");

  await scope.dispose();
});
```

## 8. Anti-Patterns

### 1. Saga Directly Mutating Store State

```typescript
// BAD: Saga step directly manipulates store internals
const BadStep = defineStep("BadStep")
  .io<Input, Output>()
  .invoke(SomePort, ctx => {
    // Bypasses port abstraction -- no compensation possible
    globalStore.setState({ status: "processing" });
    return {
      /* ... */
    };
  })
  .build();
```

Directly mutating store state from within a saga step bypasses the port abstraction and makes compensation impossible. Always dispatch through an effect port so that compensation handlers can dispatch rollback actions through the same port.

### 2. Store as Saga Persistence

```typescript
// BAD: Using store state as saga checkpoint storage
const BadSagaAdapter = createSagaAdapter(MySagaPort, {
  saga: MySaga,
  requires: [StorePort], // Using store for checkpoint state
});
```

Store state is reactive UI state, not durable saga checkpoint data. Store state is lost on page refresh, does not survive process restarts, and has no transactional guarantees. Use `SagaPersisterPort` with a proper persistence backend for saga checkpointing.

### 3. Reading Stale Store State Across Async Saga Steps

```typescript
// BAD: Reading store state once and assuming it stays valid
const BadStep = defineStep("BadStep")
  .io<Input, Output>()
  .invoke(SomePort, ctx => {
    // This state was captured when the step resolved its deps,
    // but may be stale if earlier async steps took time
    const items = ctx.deps.Cart.state.items;
    return { items };
  })
  .build();
```

Store state can change between saga steps because other parts of the application may dispatch actions concurrently. Each step should resolve its port dependencies fresh from the container (which the saga runtime does by default). Do not cache resolved state across step boundaries.

---

[Previous: Store + Flow](./store-flow.md) | [README](./README.md) | [Next: Query + Saga](./query-saga.md)
