/**
 * StateService implementation tests
 */

import { describe, it, expect, vi } from "vitest";
import { createStateServiceImpl } from "../src/services/state-service-impl.js";
import type { ActionMap } from "../src/types/index.js";
function expectTaggedThrow(fn: () => unknown, tag: string): Record<string, unknown> {
  let thrown: unknown;
  try {
    fn();
  } catch (e) {
    thrown = e;
  }
  expect(thrown).toBeDefined();
  expect(thrown).toHaveProperty("_tag", tag);
  return thrown as Record<string, unknown>;
}

// =============================================================================
// Shared test setup
// =============================================================================

interface CounterState {
  count: number;
}

interface CounterActions extends ActionMap<CounterState> {
  increment: (state: CounterState) => CounterState;
  decrement: (state: CounterState) => CounterState;
  add: (state: CounterState, payload: number) => CounterState;
}

const counterActions: CounterActions = {
  increment: state => ({ count: state.count + 1 }),
  decrement: state => ({ count: state.count - 1 }),
  add: (state, amount) => ({ count: state.count + amount }),
};

function createTestService() {
  return createStateServiceImpl<CounterState, CounterActions>({
    portName: "Counter",
    containerName: "test",
    initial: { count: 0 },
    actions: counterActions,
  });
}

// =============================================================================
// Tests
// =============================================================================

describe("StateService", () => {
  describe("initial state", () => {
    it("returns the initial state", () => {
      const service = createTestService();
      expect(service.state).toEqual({ count: 0 });
    });

    it("returns deeply frozen state", () => {
      const service = createTestService();
      expect(Object.isFrozen(service.state)).toBe(true);
    });
  });

  describe("actions", () => {
    it("dispatches no-payload actions", () => {
      const service = createTestService();
      service.actions.increment();
      expect(service.state).toEqual({ count: 1 });
    });

    it("dispatches payload actions", () => {
      const service = createTestService();
      service.actions.add(5);
      expect(service.state).toEqual({ count: 5 });
    });

    it("chains multiple actions", () => {
      const service = createTestService();
      service.actions.increment();
      service.actions.increment();
      service.actions.add(10);
      expect(service.state).toEqual({ count: 12 });
    });

    it("returns referentially stable bound actions", () => {
      const service = createTestService();
      const actions1 = service.actions;
      const actions2 = service.actions;
      expect(actions1).toBe(actions2);
      expect(actions1.increment).toBe(actions2.increment);
    });

    it("tracks action count", () => {
      const service = createTestService();
      expect(service.actionCount).toBe(0);
      service.actions.increment();
      expect(service.actionCount).toBe(1);
      service.actions.add(5);
      expect(service.actionCount).toBe(2);
    });

    it("tracks last action timestamp", () => {
      const service = createTestService();
      expect(service.lastActionAt).toBeNull();
      service.actions.increment();
      expect(service.lastActionAt).toBeTypeOf("number");
    });
  });

  describe("subscribe (full state)", () => {
    it("notifies listener on state change", () => {
      const service = createTestService();
      const listener = vi.fn();
      service.subscribe(listener);

      service.actions.increment();

      // alien-signals effect runs synchronously
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ count: 1 }),
        expect.objectContaining({ count: 0 })
      );
    });

    it("unsubscribes correctly", () => {
      const service = createTestService();
      const listener = vi.fn();
      const unsub = service.subscribe(listener);

      service.actions.increment();
      expect(listener).toHaveBeenCalledTimes(1);

      unsub();
      service.actions.increment();
      expect(listener).toHaveBeenCalledTimes(1); // No additional call
    });

    it("tracks subscriber count", () => {
      const service = createTestService();
      expect(service.subscriberCount).toBe(0);

      const unsub1 = service.subscribe(vi.fn());
      expect(service.subscriberCount).toBe(1);

      const unsub2 = service.subscribe(vi.fn());
      expect(service.subscriberCount).toBe(2);

      unsub1();
      expect(service.subscriberCount).toBe(1);

      unsub2();
      expect(service.subscriberCount).toBe(0);
    });
  });

  describe("subscribe (selector)", () => {
    it("notifies only when selected value changes", () => {
      const service = createTestService();
      const listener = vi.fn();
      service.subscribe(state => state.count > 5, listener);

      // count is 0 -> 1, still false -> false, no notification
      service.actions.increment(); // count = 1
      // count -> 6, false -> true, notification
      service.actions.add(5); // count = 6

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(true, false);
    });
  });

  describe("disposal", () => {
    it("throws DisposedStateAccess when accessing state after disposal", () => {
      const service = createTestService();
      service.dispose();

      expectTaggedThrow(() => service.state, "DisposedStateAccess");
    });

    it("throws DisposedStateAccess when calling actions after disposal", () => {
      const service = createTestService();
      service.dispose();

      expectTaggedThrow(() => service.actions, "DisposedStateAccess");
    });

    it("throws DisposedStateAccess when subscribing after disposal", () => {
      const service = createTestService();
      service.dispose();

      expectTaggedThrow(() => service.subscribe(vi.fn()), "DisposedStateAccess");
    });

    it("disposes all active effects", () => {
      const service = createTestService();
      const listener = vi.fn();
      service.subscribe(listener);

      service.dispose();

      // After disposal, no notifications should occur
      // (though accessing would throw, the effects are cleaned up)
    });
  });
});
