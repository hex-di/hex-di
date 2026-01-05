/**
 * Tests for Scope lifecycle event subscriptions.
 *
 * These tests verify that scopes emit lifecycle events when disposed,
 * enabling reactive patterns where external code can respond to disposal.
 *
 * @packageDocumentation
 */

import { describe, test, expect, vi } from "vitest";
import { createPort } from "@hex-di/ports";
import { createAdapter, GraphBuilder } from "@hex-di/graph";
import { createContainer } from "../src/container/factory.js";
import type { ScopeLifecycleEvent, ScopeDisposalState } from "../src/scope/lifecycle-events.js";

// =============================================================================
// Test Fixtures
// =============================================================================

interface TestService {
  name: string;
}

const TestPort = createPort<"Test", TestService>("Test");

const TestAdapter = createAdapter({
  provides: TestPort,
  requires: [],
  lifetime: "singleton",
  factory: () => ({ name: "test" }),
});

const ScopedPort = createPort<"Scoped", TestService>("Scoped");

const ScopedAdapter = createAdapter({
  provides: ScopedPort,
  requires: [],
  lifetime: "scoped",
  factory: () => ({ name: "scoped" }),
});

function createTestGraph() {
  return GraphBuilder.create().provide(TestAdapter).provide(ScopedAdapter).build();
}

// =============================================================================
// Lifecycle Event Tests
// =============================================================================

describe("Scope lifecycle events", () => {
  describe("subscribe()", () => {
    test("listener is called with 'disposing' when dispose() is called", async () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Test" });
      const scope = container.createScope();

      const events: ScopeLifecycleEvent[] = [];
      scope.subscribe(event => {
        events.push(event);
      });

      await scope.dispose();

      expect(events).toContain("disposing");
    });

    test("listener is called with 'disposed' after disposal completes", async () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Test" });
      const scope = container.createScope();

      const events: ScopeLifecycleEvent[] = [];
      scope.subscribe(event => {
        events.push(event);
      });

      await scope.dispose();

      expect(events).toContain("disposed");
    });

    test("'disposing' is emitted before 'disposed'", async () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Test" });
      const scope = container.createScope();

      const events: ScopeLifecycleEvent[] = [];
      scope.subscribe(event => {
        events.push(event);
      });

      await scope.dispose();

      expect(events).toEqual(["disposing", "disposed"]);
    });

    test("multiple listeners are called in registration order", async () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Test" });
      const scope = container.createScope();

      const callOrder: number[] = [];
      scope.subscribe(() => callOrder.push(1));
      scope.subscribe(() => callOrder.push(2));
      scope.subscribe(() => callOrder.push(3));

      await scope.dispose();

      // Each listener is called twice (disposing + disposed)
      expect(callOrder).toEqual([1, 2, 3, 1, 2, 3]);
    });

    test("unsubscribe prevents future event delivery", async () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Test" });
      const scope = container.createScope();

      const listener = vi.fn();
      const unsubscribe = scope.subscribe(listener);

      // Unsubscribe before disposal
      unsubscribe();

      await scope.dispose();

      expect(listener).not.toHaveBeenCalled();
    });

    test("unsubscribe after dispose is a no-op", async () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Test" });
      const scope = container.createScope();

      const listener = vi.fn();
      const unsubscribe = scope.subscribe(listener);

      await scope.dispose();

      // Should not throw
      expect(() => unsubscribe()).not.toThrow();
    });

    test("listener errors do not prevent disposal or other listeners", async () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Test" });
      const scope = container.createScope();

      const goodListener = vi.fn();
      const badListener = vi.fn(() => {
        throw new Error("listener error");
      });

      scope.subscribe(badListener);
      scope.subscribe(goodListener);

      // Should not throw despite bad listener
      await expect(scope.dispose()).resolves.not.toThrow();

      // Good listener should still have been called
      expect(goodListener).toHaveBeenCalled();
    });
  });

  describe("getDisposalState()", () => {
    test("returns 'active' for fresh scope", () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Test" });
      const scope = container.createScope();

      expect(scope.getDisposalState()).toBe("active");
    });

    test("returns 'disposing' during async disposal", async () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Test" });
      const scope = container.createScope();

      const states: ScopeDisposalState[] = [];
      scope.subscribe(() => {
        states.push(scope.getDisposalState());
      });

      await scope.dispose();

      // First call should see 'disposing'
      expect(states[0]).toBe("disposing");
    });

    test("returns 'disposed' after disposal completes", async () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Test" });
      const scope = container.createScope();

      await scope.dispose();

      expect(scope.getDisposalState()).toBe("disposed");
    });

    test("state transitions are synchronous with event emission", async () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Test" });
      const scope = container.createScope();

      const observations: Array<{ event: ScopeLifecycleEvent; state: ScopeDisposalState }> = [];
      scope.subscribe(event => {
        observations.push({
          event,
          state: scope.getDisposalState(),
        });
      });

      await scope.dispose();

      expect(observations).toEqual([
        { event: "disposing", state: "disposing" },
        { event: "disposed", state: "disposed" },
      ]);
    });
  });

  describe("child scopes", () => {
    test("parent disposal triggers child disposal events", async () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Test" });
      const parentScope = container.createScope();
      const childScope = parentScope.createScope();

      const parentEvents: ScopeLifecycleEvent[] = [];
      const childEvents: ScopeLifecycleEvent[] = [];

      parentScope.subscribe(event => parentEvents.push(event));
      childScope.subscribe(event => childEvents.push(event));

      await parentScope.dispose();

      // Both scopes should emit events
      expect(parentEvents).toEqual(["disposing", "disposed"]);
      expect(childEvents).toEqual(["disposing", "disposed"]);
    });

    test("child listeners called before parent disposal completes", async () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Test" });
      const parentScope = container.createScope();
      const childScope = parentScope.createScope();

      const order: string[] = [];

      parentScope.subscribe(event => order.push(`parent-${event}`));
      childScope.subscribe(event => order.push(`child-${event}`));

      await parentScope.dispose();

      // Child events should come before parent 'disposed'
      const childDisposedIndex = order.indexOf("child-disposed");
      const parentDisposedIndex = order.indexOf("parent-disposed");

      expect(childDisposedIndex).toBeLessThan(parentDisposedIndex);
    });
  });

  describe("integration with React pattern", () => {
    test("useSyncExternalStore pattern works with subscribe/getSnapshot", async () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Test" });
      const scope = container.createScope();

      // Simulate useSyncExternalStore pattern
      let currentState: ScopeDisposalState = scope.getDisposalState();
      const onStoreChange = vi.fn(() => {
        currentState = scope.getDisposalState();
      });

      const unsubscribe = scope.subscribe(() => {
        onStoreChange();
      });

      expect(currentState).toBe("active");

      await scope.dispose();

      // onStoreChange should have been called
      expect(onStoreChange).toHaveBeenCalled();
      expect(currentState).toBe("disposed");

      unsubscribe();
    });

    test("multiple subscribers share the same scope lifecycle", async () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Test" });
      const scope = container.createScope();

      // Simulate multiple React components subscribing
      const component1Updates = vi.fn();
      const component2Updates = vi.fn();

      scope.subscribe(() => component1Updates());
      scope.subscribe(() => component2Updates());

      await scope.dispose();

      // Both components should have been notified
      expect(component1Updates).toHaveBeenCalledTimes(2); // disposing + disposed
      expect(component2Updates).toHaveBeenCalledTimes(2);
    });
  });

  describe("idempotent disposal", () => {
    test("disposing already disposed scope does not emit events again", async () => {
      const graph = createTestGraph();
      const container = createContainer(graph, { name: "Test" });
      const scope = container.createScope();

      const listener = vi.fn();
      scope.subscribe(listener);

      await scope.dispose();
      const callCount = listener.mock.calls.length;

      await scope.dispose();

      // No additional calls
      expect(listener.mock.calls.length).toBe(callCount);
    });
  });
});
