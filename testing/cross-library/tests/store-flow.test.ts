/**
 * Store + Flow Integration Tests
 *
 * Tests for cross-library integration patterns between @hex-di/store and @hex-di/flow.
 * Based on spec/integration/store-flow.md and spec/integration/17-definition-of-done.md.
 *
 * Patterns tested:
 * 1. Machine Transitions Update Store
 * 2. Store Changes Trigger Machine Events
 * 3. Shared Domain State Guidelines
 *
 * Anti-patterns tested:
 * 1. Duplicated domain state in machine context
 * 2. Store subscription without activity lifecycle leaks
 * 3. Bidirectional sync without change detection creates infinite loop
 */

import { describe, it, expect } from "vitest";
import { createInMemoryStateAdapter, createMockFlowService } from "../src/index.js";
import type { MockMachineDefinition } from "../src/index.js";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

interface OrderState {
  readonly orderId: string | null;
  readonly status: "idle" | "processing" | "confirmed" | "failed";
  readonly error: string | null;
}

// ---------------------------------------------------------------------------
// Pattern 1: Machine Transitions Update Store
// ---------------------------------------------------------------------------

describe("Store + Flow: Machine Transitions Update Store", () => {
  type CheckoutState = "idle" | "validating" | "processing" | "confirmed" | "failed";
  type CheckoutEvent =
    | "SUBMIT"
    | "VALIDATION_OK"
    | "PAYMENT_OK"
    | "PAYMENT_FAILED"
    | "RETRY"
    | "RESET";

  const checkoutMachine: MockMachineDefinition<
    CheckoutState,
    CheckoutEvent,
    { retryCount: number }
  > = {
    id: "checkout",
    initial: "idle",
    context: { retryCount: 0 },
    states: {
      idle: { on: { SUBMIT: "validating" } },
      validating: { on: { VALIDATION_OK: "processing" } },
      processing: {
        on: {
          PAYMENT_OK: "confirmed",
          PAYMENT_FAILED: "failed",
        },
      },
      confirmed: { type: "final" },
      failed: { on: { RETRY: "processing", RESET: "idle" } },
    },
  };

  function createCheckoutSetup() {
    const store = createInMemoryStateAdapter({
      name: "OrderState",
      initial: { orderId: null, status: "idle", error: null } satisfies OrderState,
      actions: {
        setProcessing: (state: OrderState, payload: { orderId: string }) => ({
          ...state,
          orderId: payload.orderId,
          status: "processing" as const,
        }),
        setConfirmed: (state: OrderState) => ({ ...state, status: "confirmed" as const }),
        setFailed: (state: OrderState, payload: { error: string }) => ({
          ...state,
          status: "failed" as const,
          error: payload.error,
        }),
        reset: (_state: OrderState) => ({ orderId: null, status: "idle" as const, error: null }),
      },
    });

    const flow = createMockFlowService({ machine: checkoutMachine });

    // Effect executor: dispatches store actions on transitions
    const executeTransition = (event: CheckoutEvent) => {
      const result = flow.send(event);

      if (result.success) {
        // Simulate Effect.invoke dispatching store actions
        if (event === "SUBMIT") {
          store.actions.setProcessing({ orderId: "order-1" });
        } else if (event === "PAYMENT_OK") {
          store.actions.setConfirmed();
        } else if (event === "PAYMENT_FAILED") {
          store.actions.setFailed({ error: "Payment declined" });
        } else if (event === "RESET") {
          store.actions.reset();
        } else if (event === "RETRY") {
          store.actions.setProcessing({ orderId: "order-1" });
        }
      }

      return result;
    };

    return { store, flow, executeTransition };
  }

  it("Effect.invoke dispatches store action on machine transition", () => {
    const { store, executeTransition } = createCheckoutSetup();

    executeTransition("SUBMIT");

    expect(store.spy.getByAction("setProcessing")).toHaveLength(1);
    expect(store.state.status).toBe("processing");
    expect(store.state.orderId).toBe("order-1");
  });

  it("store state reflects dispatched action after transition completes", () => {
    const { store, flow, executeTransition } = createCheckoutSetup();

    executeTransition("SUBMIT");
    executeTransition("VALIDATION_OK");
    executeTransition("PAYMENT_OK");

    expect(flow.state()).toBe("confirmed");
    expect(store.state.status).toBe("confirmed");
  });

  it("multiple transitions dispatch correct sequence of store actions", () => {
    const { store, executeTransition } = createCheckoutSetup();

    executeTransition("SUBMIT");
    executeTransition("VALIDATION_OK");
    executeTransition("PAYMENT_FAILED");

    const actions = store.spy.dispatched.map(d => d.actionName);
    expect(actions).toEqual(["setProcessing", "setFailed"]);

    // Retry and succeed
    executeTransition("RETRY");
    executeTransition("PAYMENT_OK");

    const allActions = store.spy.dispatched.map(d => d.actionName);
    expect(allActions).toEqual(["setProcessing", "setFailed", "setProcessing", "setConfirmed"]);
  });
});

// ---------------------------------------------------------------------------
// Pattern 2: Store Changes Trigger Machine Events
// ---------------------------------------------------------------------------

describe("Store + Flow: Store Changes Trigger Machine Events", () => {
  interface AuthState {
    readonly isAuthenticated: boolean;
    readonly reason: string | null;
  }

  type SessionState = "active" | "expired";
  type SessionEvent = "SESSION_EXPIRED" | "REAUTH_SUCCESS";

  const sessionMachine: MockMachineDefinition<SessionState, SessionEvent, Record<string, never>> = {
    id: "session",
    initial: "active",
    context: {},
    states: {
      active: { on: { SESSION_EXPIRED: "expired" } },
      expired: { on: { REAUTH_SUCCESS: "active" } },
    },
  };

  function createSessionSetup() {
    const store = createInMemoryStateAdapter({
      name: "AuthState",
      initial: { isAuthenticated: true, reason: null } satisfies AuthState,
      actions: {
        login: (_state: AuthState) => ({ isAuthenticated: true, reason: null }),
        logout: (_state: AuthState) => ({ isAuthenticated: false, reason: "logout" }),
        expire: (_state: AuthState) => ({ isAuthenticated: false, reason: "expired" }),
      },
    });

    const flow = createMockFlowService({ machine: sessionMachine });

    return { store, flow };
  }

  it("activity subscribes to store port and emits events to machine on state change", () => {
    const { store, flow } = createSessionSetup();

    // Simulate activity: subscribe to store, emit events to machine
    const unsub = store.subscribe((state, prevState) => {
      if (prevState.isAuthenticated && !state.isAuthenticated && state.reason === "expired") {
        flow.send("SESSION_EXPIRED");
      }
    });

    store.actions.expire();

    expect(flow.state()).toBe("expired");

    unsub();
  });

  it("machine transitions in response to store-emitted events", () => {
    const { store, flow } = createSessionSetup();

    const unsub = store.subscribe((state, prevState) => {
      if (prevState.isAuthenticated && !state.isAuthenticated) {
        flow.send("SESSION_EXPIRED");
      }
    });

    store.actions.logout();

    expect(flow.state()).toBe("expired");

    // Re-authenticate
    store.actions.login();
    flow.send("REAUTH_SUCCESS");

    expect(flow.state()).toBe("active");

    unsub();
  });

  it("activity cleanup unsubscribes from store when machine exits subscribing state", () => {
    const { store, flow } = createSessionSetup();

    // Simulate activity with AbortSignal lifecycle
    const controller = new AbortController();
    let subscriptionActive = true;

    const unsub = store.subscribe((state, prevState) => {
      if (controller.signal.aborted) return;

      if (prevState.isAuthenticated && !state.isAuthenticated) {
        flow.send("SESSION_EXPIRED");
      }
    });

    // Simulate machine exiting the subscribing state -> abort signal fires
    controller.signal.addEventListener("abort", () => {
      unsub();
      subscriptionActive = false;
    });

    // Machine exits active state
    controller.abort();

    // Store changes after cleanup should NOT trigger machine events
    const prevFlowState = flow.state();
    store.actions.expire();

    expect(flow.state()).toBe(prevFlowState); // No transition occurred
    expect(subscriptionActive).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Pattern 3: Shared Domain State Guidelines
// ---------------------------------------------------------------------------

describe("Store + Flow: Shared Domain State Guidelines", () => {
  it("machine context holds transient workflow data, store holds persistent domain data", () => {
    const store = createInMemoryStateAdapter({
      name: "OrderStore",
      initial: {
        orderId: "order-1",
        orderStatus: "pending",
        cartItems: ["item-a", "item-b"] as readonly string[],
      },
      actions: {
        setStatus: (
          state: { orderId: string; orderStatus: string; cartItems: readonly string[] },
          status: string
        ) => ({ ...state, orderStatus: status }),
      },
    });

    type WizardState = "idle" | "address" | "payment" | "done";
    type WizardEvent = "START" | "NEXT" | "SUBMIT";

    const wizardMachine: MockMachineDefinition<
      WizardState,
      WizardEvent,
      {
        retryCount: number;
        currentStep: "address" | "payment";
        validationAttempts: number;
      }
    > = {
      id: "checkout",
      initial: "idle",
      context: {
        retryCount: 0,
        currentStep: "address",
        validationAttempts: 0,
      },
      states: {
        idle: { on: { START: "address" } },
        address: { on: { NEXT: "payment" } },
        payment: { on: { SUBMIT: "done" } },
        done: { type: "final" },
      },
    };

    const flow = createMockFlowService({ machine: wizardMachine });

    // Machine context has transient data
    expect(flow.context().retryCount).toBe(0);
    expect(flow.context().currentStep).toBe("address");

    // Store has persistent domain data
    expect(store.state.orderId).toBe("order-1");
    expect(store.state.cartItems).toHaveLength(2);

    // Machine context does NOT duplicate store data
    const contextKeys = Object.keys(flow.context());
    expect(contextKeys).not.toContain("orderId");
    expect(contextKeys).not.toContain("cartItems");
  });

  it("machine reads store state via Effect.invoke rather than duplicating in context", () => {
    const store = createInMemoryStateAdapter({
      name: "CartStore",
      initial: { totalAmount: 100, discountApplied: false },
      actions: {
        applyDiscount: (state: { totalAmount: number; discountApplied: boolean }) => ({
          ...state,
          totalAmount: state.totalAmount * 0.9,
          discountApplied: true,
        }),
      },
    });

    // Simulate Effect.invoke reading store state (not copying into context)
    const readStoreState = () => store.state;

    const cartState = readStoreState();
    expect(cartState.totalAmount).toBe(100);

    store.actions.applyDiscount();

    // Reading again gets fresh state (not stale copy)
    const updatedState = readStoreState();
    expect(updatedState.totalAmount).toBe(90);
    expect(updatedState.discountApplied).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Anti-Patterns
// ---------------------------------------------------------------------------

describe("Store + Flow: Anti-Patterns", () => {
  it("duplicated domain state in machine context diverges from store state", () => {
    const store = createInMemoryStateAdapter({
      name: "CartStore",
      initial: { cartItems: ["item-a"] as readonly string[], cartTotal: 25 },
      actions: {
        addItem: (state: { cartItems: readonly string[]; cartTotal: number }, item: string) => ({
          cartItems: [...state.cartItems, item],
          cartTotal: state.cartTotal + 25,
        }),
      },
    });

    type DupState = "idle" | "processing";
    type DupEvent = "START";

    const dupMachine: MockMachineDefinition<
      DupState,
      DupEvent,
      {
        cartItems: readonly string[];
        cartTotal: number;
      }
    > = {
      id: "checkout",
      initial: "idle",
      context: {
        cartItems: ["item-a"],
        cartTotal: 25,
      },
      states: {
        idle: { on: { START: "processing" } },
        processing: { type: "final" },
      },
    };

    const flow = createMockFlowService({ machine: dupMachine });

    // Store state changes
    store.actions.addItem("item-b");

    // Machine context is now stale and divergent!
    expect(store.state.cartItems).toEqual(["item-a", "item-b"]);
    expect(store.state.cartTotal).toBe(50);

    // Context still has old data
    expect(flow.context().cartItems).toEqual(["item-a"]);
    expect(flow.context().cartTotal).toBe(25);

    // Verify divergence
    expect(store.state.cartItems).not.toEqual(flow.context().cartItems);
  });

  it("store subscription without activity lifecycle leaks on scope disposal", async () => {
    const store = createInMemoryStateAdapter({
      name: "LeakyStore",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
    });

    type LeakyState = "active" | "stopped";
    type LeakyEvent = "STOP";

    const leakyMachine: MockMachineDefinition<LeakyState, LeakyEvent, Record<string, never>> = {
      id: "leaky",
      initial: "active",
      context: {},
      states: {
        active: { on: { STOP: "stopped" } },
        stopped: { type: "final" },
      },
    };

    const flow = createMockFlowService({ machine: leakyMachine });

    // Anti-pattern: subscription without cleanup
    let leakedNotifications = 0;
    const leakedUnsub = store.subscribe(() => {
      leakedNotifications++;
    });

    // Machine disposes but subscription is NOT cleaned up
    await flow.dispose();

    // Store still notifies the leaked subscription
    store.actions.increment();
    store.actions.increment();

    expect(leakedNotifications).toBe(2); // Leaked!

    // Correct pattern: subscription with activity lifecycle
    let controlledNotifications = 0;
    const controller = new AbortController();
    const controlledUnsub = store.subscribe(() => {
      if (!controller.signal.aborted) {
        controlledNotifications++;
      }
    });

    controller.signal.addEventListener("abort", () => {
      controlledUnsub();
    });

    // Simulate scope disposal
    controller.abort();

    store.actions.increment();
    expect(controlledNotifications).toBe(0); // Properly cleaned up

    leakedUnsub(); // Clean up for test teardown
  });

  it("bidirectional sync without change detection creates infinite loop (detected)", () => {
    const store = createInMemoryStateAdapter({
      name: "SyncStore",
      initial: { value: 0 },
      actions: {
        setValue: (_state: { value: number }, value: number) => ({ value }),
      },
    });

    type SyncState = "watching";
    type SyncEvent = "UPDATE";

    const syncMachine: MockMachineDefinition<SyncState, SyncEvent, { value: number }> = {
      id: "sync",
      initial: "watching",
      context: { value: 0 },
      states: {
        watching: { on: { UPDATE: "watching" } },
      },
    };

    const flow = createMockFlowService({ machine: syncMachine });

    let loopCount = 0;
    const maxLoops = 5;
    let loopDetected = false;

    // Bidirectional sync: store -> machine -> store -> machine -> ...
    const storeUnsub = store.subscribe(state => {
      loopCount++;
      if (loopCount > maxLoops) {
        loopDetected = true;
        return; // Circuit breaker
      }
      flow.send("UPDATE");
      flow.setContext(() => ({ value: state.value }));
    });

    const flowUnsub = flow.subscribe(snapshot => {
      loopCount++;
      if (loopCount > maxLoops) {
        loopDetected = true;
        return; // Circuit breaker
      }
      // This triggers store subscription, which triggers flow, creating a loop
      store.actions.setValue(snapshot.context.value + 1);
    });

    // Trigger the chain
    store.actions.setValue(1);

    // Loop was detected and broken
    expect(loopDetected).toBe(true);
    expect(loopCount).toBeGreaterThan(maxLoops);

    storeUnsub();
    flowUnsub();
  });
});
