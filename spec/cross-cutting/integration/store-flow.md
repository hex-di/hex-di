# Integration: Store + Flow

[Previous: flow-saga.md](./flow-saga.md) | [README](./README.md) | [Next: store-saga.md](./store-saga.md)

---

## 1. Overview

Store manages persistent domain state (user data, cart items, UI preferences); Flow manages transient workflow state through state machines (checkout process, authentication flows, multi-step wizards). Together they model systems where domain state and workflow state coexist: a checkout machine advances through states while updating the order store, or an authentication store change triggers a machine event.

The two libraries never import each other. Integration happens through port composition in the GraphBuilder: machine effects invoke store ports via `Effect.invoke`, and activity subscriptions observe store changes and emit machine events.

### When to use machine context vs Store state

| Use machine context                                       | Use Store state                                   |
| --------------------------------------------------------- | ------------------------------------------------- |
| Transient workflow data (retry count, current step index) | Persistent domain data (user profile, cart items) |
| Only the machine reads/writes the data                    | Multiple components need the data                 |
| Data lifecycle matches the machine's lifetime             | Data outlives the machine                         |
| State transitions depend on the data                      | UI rendering depends on the data                  |

**Rule**: If multiple components need the data, use Store. If only the machine needs it, use context.

## 2. Integration Architecture

```
  +------------------+         Effect.invoke          +----------------+
  |   Flow Machine   | ----------------------------> |   Store Port   |
  |  (FlowService)   |   dispatch actions to store   | (StateService) |
  +------------------+                                +----------------+
          ^                                                  |
          |          syncWithStore activity                   |
          +--------------------------------------------------+
            store changes emit events to machine
```

The integration is bidirectional but asymmetric:

1. **Machine to Store** (effects): Machine transitions invoke store actions via `Effect.invoke(StorePort, "dispatch", action)`. This is explicit and declarative in the machine definition.
2. **Store to Machine** (activities): A `syncWithStore` activity subscribes to store state changes and emits events to the machine. This runs as a spawned activity with lifecycle tied to the machine's current state.

## 4. Integration Patterns

### Pattern 1: Machine Transitions Update Store

Machine transition effects dispatch actions to a Store port using `Effect.invoke`. The machine definition declares which store actions to call on each transition.

#### Port definitions

```typescript
import { createStatePort } from "@hex-di/store";
import { createFlowPort } from "@hex-di/flow";
import type { ActionMap, ActionReducer } from "@hex-di/store";

// Store port: order status
interface OrderState {
  readonly orderId: string | null;
  readonly status: "idle" | "processing" | "confirmed" | "failed";
  readonly error: string | null;
}

interface OrderActions extends ActionMap<OrderState> {
  setProcessing: ActionReducer<OrderState, { orderId: string }>;
  setConfirmed: ActionReducer<OrderState>;
  setFailed: ActionReducer<OrderState, { error: string }>;
  reset: ActionReducer<OrderState>;
}

const OrderStatePort = createStatePort<OrderState, OrderActions>()({
  name: "OrderState",
  category: "order",
});

// Flow port: checkout machine
type CheckoutState = "idle" | "validating" | "processing" | "confirmed" | "failed";

type CheckoutEvent =
  | { readonly type: "SUBMIT"; readonly orderId: string }
  | { readonly type: "VALIDATION_OK" }
  | { readonly type: "PAYMENT_OK" }
  | { readonly type: "PAYMENT_FAILED"; readonly error: string }
  | { readonly type: "RETRY" }
  | { readonly type: "RESET" };

interface CheckoutContext {
  readonly orderId: string | null;
  readonly retryCount: number;
}

const CheckoutFlowPort = createFlowPort<CheckoutState, CheckoutEvent, CheckoutContext>(
  "CheckoutFlow"
);
```

#### Machine definition with store effects

```typescript
import { defineMachine, Effect } from "@hex-di/flow";

const checkoutMachine = defineMachine({
  id: "checkout",
  initial: "idle",
  context: { orderId: null, retryCount: 0 },
  states: {
    idle: {
      on: {
        SUBMIT: {
          target: "validating",
          effects: [
            Effect.invoke(OrderStatePort, "dispatch", ["setProcessing", { orderId: "from-event" }]),
          ],
        },
      },
    },
    validating: {
      on: {
        VALIDATION_OK: { target: "processing" },
      },
    },
    processing: {
      on: {
        PAYMENT_OK: {
          target: "confirmed",
          effects: [Effect.invoke(OrderStatePort, "dispatch", ["setConfirmed"])],
        },
        PAYMENT_FAILED: {
          target: "failed",
          effects: [
            Effect.invoke(OrderStatePort, "dispatch", ["setFailed", { error: "Payment declined" }]),
          ],
        },
      },
    },
    confirmed: {
      type: "final",
    },
    failed: {
      on: {
        RETRY: {
          target: "processing",
          guard: ctx => ctx.retryCount < 3,
          effects: [
            Effect.invoke(OrderStatePort, "dispatch", [
              "setProcessing",
              { orderId: "from-context" },
            ]),
          ],
        },
        RESET: {
          target: "idle",
          effects: [Effect.invoke(OrderStatePort, "dispatch", ["reset"])],
        },
      },
    },
  },
});
```

#### How it works

1. When the machine transitions from `idle` to `validating` on `SUBMIT`, the `Effect.invoke` dispatches `setProcessing` to the `OrderStatePort`.
2. The `DIEffectExecutor` resolves `OrderStatePort` from the container scope, then calls the `dispatch` method with the action name and payload.
3. The store updates synchronously, and any subscribed components re-render with the new order status.
4. The machine's own context tracks transient data (`retryCount`); persistent domain state (`orderId`, `status`) lives in the store.

### Pattern 2: Store Changes Trigger Machine Events

A `syncWithStore` activity subscribes to a Store port and emits machine events when the store state changes. This enables the machine to react to external state changes without polling.

#### Activity definition

```typescript
import { activity } from "@hex-di/flow";
import type { EventSink } from "@hex-di/flow";

// Activity that watches an auth store and emits machine events
const AuthStoreWatcherActivity = activity({
  port: port<void>()({ name: "AuthStoreWatcher", direction: "outbound" }),
  requires: [AuthStatePort] as const,
  emits: ["AUTH_CHANGED", "SESSION_EXPIRED"] as const,
  execute: (deps, sink: EventSink, signal: AbortSignal) => {
    const unsubscribe = deps.AuthState.subscribe((state, prev) => {
      if (signal.aborted) return;

      if (state.isAuthenticated !== prev.isAuthenticated) {
        sink.emit({ type: "AUTH_CHANGED", isAuthenticated: state.isAuthenticated });
      }

      if (prev.isAuthenticated && !state.isAuthenticated && state.reason === "expired") {
        sink.emit({ type: "SESSION_EXPIRED" });
      }
    });

    // Cleanup when the machine exits the subscribing state
    signal.addEventListener("abort", () => {
      unsubscribe();
    });
  },
});
```

#### Machine using the activity

```typescript
import { defineMachine, Effect } from "@hex-di/flow";

type SessionState = "active" | "expired" | "reauthenticating";

type SessionEvent =
  | { readonly type: "AUTH_CHANGED"; readonly isAuthenticated: boolean }
  | { readonly type: "SESSION_EXPIRED" }
  | { readonly type: "REAUTH_SUCCESS" }
  | { readonly type: "REAUTH_FAILED" };

const sessionMachine = defineMachine({
  id: "session",
  initial: "active",
  context: {},
  states: {
    active: {
      entry: [Effect.spawn(AuthStoreWatcherActivity)],
      on: {
        SESSION_EXPIRED: { target: "expired" },
      },
    },
    expired: {
      on: {
        REAUTH_SUCCESS: { target: "active" },
        REAUTH_FAILED: { target: "expired" },
      },
      entry: [Effect.invoke(AuthStatePort, "dispatch", ["clearSession"])],
    },
    reauthenticating: {
      on: {
        REAUTH_SUCCESS: { target: "active" },
        REAUTH_FAILED: { target: "expired" },
      },
    },
  },
});
```

#### How it works

1. When the session machine enters the `active` state, it spawns the `AuthStoreWatcherActivity`.
2. The activity resolves `AuthStatePort` from the container and subscribes to state changes.
3. When the auth store's session expires, the activity emits a `SESSION_EXPIRED` event to the machine.
4. The machine transitions to `expired`, which dispatches a `clearSession` action back to the store.
5. When the machine exits `active`, the `AbortSignal` fires, and the activity's cleanup unsubscribes from the store.

### Pattern 3: Shared Domain State Guidelines

When both a machine and store are involved in the same domain, decide where each piece of state belongs.

#### Decision matrix

```
Is the data needed by multiple components?
  YES -> Store (StatePort or AtomPort)
  NO  -> Is the data lifecycle tied to the workflow?
           YES -> Machine context
           NO  -> Store
```

#### Example: E-commerce checkout

```
Machine context (transient):          Store state (persistent):
- retryCount: number                  - orderId: string
- currentStep: "address" | "payment"  - orderStatus: "processing" | "confirmed"
- validationAttempts: number          - cartItems: readonly CartItem[]
- paymentNonce: string | null         - shippingAddress: Address
                                      - billingInfo: BillingInfo
```

#### Adapter wiring

```typescript
import { createFlowAdapter } from "@hex-di/flow";

const checkoutFlowAdapter = createFlowAdapter({
  provides: CheckoutFlowPort,
  requires: [OrderStatePort, CartPort, PaymentPort] as const,
  machine: checkoutMachine,
  activities: [AuthStoreWatcherActivity],
  lifetime: "scoped",
});
```

The adapter's `requires` includes both store ports (for `Effect.invoke`) and infrastructure ports (for activities). The GraphBuilder validates that all required ports are satisfied.

## 6. Error Handling

Machine effects that invoke store ports can fail. The `DIEffectExecutor` wraps these failures in `EffectExecutionError`.

```typescript
import type { EffectExecutionError, TransitionError } from "@hex-di/flow";
import type { ResultAsync } from "@hex-di/result";

// When Effect.invoke(OrderStatePort, "dispatch", [...]) fails:
// The error is:
// {
//   readonly _tag: "InvokeError";
//   readonly portName: "OrderState";
//   readonly method: "dispatch";
//   readonly cause: StoreDispatchError;
// }

// In sendAndExecute, the error is part of the union:
const result: ResultAsync<void, TransitionError | EffectExecutionError> =
  flowService.sendAndExecute({ type: "SUBMIT", orderId: "order-123" });

result.match(
  () => {
    /* transition and effects succeeded */
  },
  error => {
    switch (error._tag) {
      case "TransitionError":
        // Event not valid in current state
        break;
      case "InvokeError":
        // Store dispatch or port resolution failed
        console.error(`${error.portName}.${error.method} failed:`, error.cause);
        break;
      case "Disposed":
        // Machine was disposed
        break;
    }
  }
);
```

## 7. Testing

Test the integration by providing mock store adapters and verifying machine behavior.

```typescript
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { describe, it, expect } from "vitest";

describe("Flow + Store: machine transitions update store", () => {
  it("dispatches setProcessing on SUBMIT", async () => {
    const orderAdapter = createStateAdapter({
      provides: OrderStatePort,
      initial: { orderId: null, status: "idle", error: null },
      actions: {
        setProcessing: (state, payload) => ({
          ...state,
          orderId: payload.orderId,
          status: "processing",
        }),
        setConfirmed: state => ({ ...state, status: "confirmed" }),
        setFailed: (state, payload) => ({
          ...state,
          status: "failed",
          error: payload.error,
        }),
        reset: () => ({ orderId: null, status: "idle", error: null }),
      },
      lifetime: "singleton",
    });

    const flowAdapter = createFlowAdapter({
      provides: CheckoutFlowPort,
      requires: [OrderStatePort] as const,
      machine: checkoutMachine,
      lifetime: "scoped",
    });

    const graph = GraphBuilder.create().provide(orderAdapter).provide(flowAdapter).build();

    const container = createContainer({ graph, name: "test" });
    const scope = container.createScope("checkout-test");

    const flow = scope.resolve(CheckoutFlowPort);
    const store = container.resolve(OrderStatePort);

    expect(store.state.status).toBe("idle");

    await flow.sendAndExecute({ type: "SUBMIT", orderId: "order-1" });

    expect(store.state.status).toBe("processing");
    expect(store.state.orderId).toBe("order-1");
  });
});
```

## 8. Anti-Patterns

### Anti-Pattern 1: Duplicating domain state in machine context

```typescript
// BAD: Cart items duplicated in machine context AND store
const badMachine = defineMachine({
  id: "checkout",
  initial: "idle",
  context: {
    // This duplicates CartPort state -- will diverge!
    cartItems: [],
    cartTotal: 0,
  },
  states: {
    /* ... */
  },
});
```

**Why it is wrong**: Machine context and store state will diverge. Read cart data from the store port via `Effect.invoke` instead of copying it into context.

### Anti-Pattern 2: Using store subscriptions without activity lifecycle

```typescript
// BAD: Manual subscription without AbortSignal cleanup
const badAdapter = createFlowAdapter({
  provides: CheckoutFlowPort,
  requires: [OrderStatePort] as const,
  machine: checkoutMachine,
  lifetime: "scoped",
  // Subscribing in the factory -- never cleaned up!
  factory: deps => {
    deps.OrderState.subscribe(state => {
      // This subscription leaks when the scope is disposed
    });
  },
});
```

**Why it is wrong**: Subscriptions created outside the activity system bypass `AbortSignal` cleanup. Use `Effect.spawn` with a `syncWithStore` activity so the subscription lifecycle is tied to the machine state.

### Anti-Pattern 3: Bidirectional sync without change detection

```typescript
// BAD: Store change -> machine event -> store change -> machine event -> ...
// The activity emits on every store change, and the machine effect updates the store,
// creating an infinite loop.
```

**Why it is wrong**: If a machine effect updates the store, and a `syncWithStore` activity emits an event on every store change, the event triggers another transition that updates the store again. Break the cycle by using a selector in the activity that only emits when the relevant subset of state changes, or by using guards in the machine to ignore events that reflect changes the machine itself caused.

---

[Previous: flow-saga.md](./flow-saga.md) | [README](./README.md) | [Next: store-saga.md](./store-saga.md)
