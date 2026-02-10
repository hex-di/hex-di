/**
 * SagaRegistry Tests
 *
 * Tests the SagaRegistry: register/unregister, query methods,
 * subscribe/unsubscribe, dispose behavior, listener safety.
 */

import { describe, it, expect, vi } from "vitest";
import { createSagaRegistry } from "../src/introspection/saga-registry.js";
import type { SagaRegistryEntry, SagaRegistryEvent } from "../src/introspection/types.js";
import type { SagaStatusType } from "../src/errors/types.js";
import type { ExecutionTrace } from "../src/runtime/types.js";

// =============================================================================
// Helpers
// =============================================================================

function createEntry(
  overrides: Partial<SagaRegistryEntry> & { executionId: string; sagaName: string }
): SagaRegistryEntry {
  const trace: ExecutionTrace = {
    executionId: overrides.executionId,
    sagaName: overrides.sagaName,
    input: {},
    status: "running",
    steps: [],
    compensation: undefined,
    startedAt: Date.now(),
    completedAt: undefined,
    totalDurationMs: undefined,
    metadata: undefined,
  };

  return {
    sagaName: overrides.sagaName,
    executionId: overrides.executionId,
    status: overrides.status ?? (() => "running"),
    currentStep: overrides.currentStep ?? (() => 0),
    trace: overrides.trace ?? (() => trace),
    startedAt: overrides.startedAt ?? Date.now(),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("SagaRegistry", () => {
  it("register adds an entry retrievable by executionId", () => {
    const registry = createSagaRegistry();
    const entry = createEntry({ executionId: "exec-1", sagaName: "OrderSaga" });

    registry.register(entry);

    expect(registry.getExecution("exec-1")).toBe(entry);
  });

  it("unregister removes an entry", () => {
    const registry = createSagaRegistry();
    const entry = createEntry({ executionId: "exec-1", sagaName: "OrderSaga" });

    registry.register(entry);
    registry.unregister("exec-1");

    expect(registry.getExecution("exec-1")).toBeUndefined();
  });

  it("unregister on nonexistent entry does not notify", () => {
    const registry = createSagaRegistry();
    const listener = vi.fn();
    registry.subscribe(listener);

    registry.unregister("nonexistent");

    expect(listener).not.toHaveBeenCalled();
  });

  it("getAllExecutions returns all registered entries", () => {
    const registry = createSagaRegistry();
    const e1 = createEntry({ executionId: "exec-1", sagaName: "OrderSaga" });
    const e2 = createEntry({ executionId: "exec-2", sagaName: "PaymentSaga" });

    registry.register(e1);
    registry.register(e2);

    const all = registry.getAllExecutions();
    expect(all).toHaveLength(2);
    expect(all).toContain(e1);
    expect(all).toContain(e2);
  });

  it("getExecutionsBySaga filters by saga name", () => {
    const registry = createSagaRegistry();
    const e1 = createEntry({ executionId: "exec-1", sagaName: "OrderSaga" });
    const e2 = createEntry({ executionId: "exec-2", sagaName: "PaymentSaga" });
    const e3 = createEntry({ executionId: "exec-3", sagaName: "OrderSaga" });

    registry.register(e1);
    registry.register(e2);
    registry.register(e3);

    const orderExecs = registry.getExecutionsBySaga("OrderSaga");
    expect(orderExecs).toHaveLength(2);
    expect(orderExecs).toContain(e1);
    expect(orderExecs).toContain(e3);
  });

  it("getExecutionsByStatus filters by dynamic status", () => {
    const registry = createSagaRegistry();
    let status1: SagaStatusType = "running";
    const e1 = createEntry({
      executionId: "exec-1",
      sagaName: "OrderSaga",
      status: () => status1,
    });
    const e2 = createEntry({
      executionId: "exec-2",
      sagaName: "OrderSaga",
      status: () => "completed",
    });

    registry.register(e1);
    registry.register(e2);

    expect(registry.getExecutionsByStatus("running")).toHaveLength(1);
    expect(registry.getExecutionsByStatus("completed")).toHaveLength(1);

    // Status is dynamic - changing it reflects in query
    status1 = "completed";
    expect(registry.getExecutionsByStatus("running")).toHaveLength(0);
    expect(registry.getExecutionsByStatus("completed")).toHaveLength(2);
  });

  it("subscribe receives registration events", () => {
    const registry = createSagaRegistry();
    const events: SagaRegistryEvent[] = [];
    registry.subscribe(event => events.push(event));

    const entry = createEntry({ executionId: "exec-1", sagaName: "OrderSaga" });
    registry.register(entry);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("execution-registered");
    if (events[0].type === "execution-registered") {
      expect(events[0].entry).toBe(entry);
    }
  });

  it("subscribe receives unregistration events", () => {
    const registry = createSagaRegistry();
    const entry = createEntry({ executionId: "exec-1", sagaName: "OrderSaga" });
    registry.register(entry);

    const events: SagaRegistryEvent[] = [];
    registry.subscribe(event => events.push(event));

    registry.unregister("exec-1");

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("execution-unregistered");
    if (events[0].type === "execution-unregistered") {
      expect(events[0].executionId).toBe("exec-1");
    }
  });

  it("unsubscribe stops receiving events", () => {
    const registry = createSagaRegistry();
    const events: SagaRegistryEvent[] = [];
    const unsub = registry.subscribe(event => events.push(event));

    const e1 = createEntry({ executionId: "exec-1", sagaName: "OrderSaga" });
    registry.register(e1);
    expect(events).toHaveLength(1);

    unsub();

    const e2 = createEntry({ executionId: "exec-2", sagaName: "OrderSaga" });
    registry.register(e2);
    expect(events).toHaveLength(1); // No new events after unsubscribe
  });

  it("dispose clears entries and listeners", () => {
    const registry = createSagaRegistry();
    const events: SagaRegistryEvent[] = [];
    registry.subscribe(event => events.push(event));

    const entry = createEntry({ executionId: "exec-1", sagaName: "OrderSaga" });
    registry.register(entry);

    registry.dispose();

    expect(registry.getAllExecutions()).toHaveLength(0);
    expect(registry.getExecution("exec-1")).toBeUndefined();

    // After dispose, register is a no-op
    const e2 = createEntry({ executionId: "exec-2", sagaName: "OrderSaga" });
    registry.register(e2);
    expect(registry.getAllExecutions()).toHaveLength(0);

    // Listener was cleared, so only the initial register event
    expect(events).toHaveLength(1);
  });

  it("listener can safely unsubscribe during notification", () => {
    const registry = createSagaRegistry();
    const unsubRef: { current: (() => void) | undefined } = { current: undefined };

    const listener1 = vi.fn().mockImplementation(() => {
      unsubRef.current?.();
    });
    const listener2 = vi.fn();

    unsubRef.current = registry.subscribe(listener1);
    registry.subscribe(listener2);

    const entry = createEntry({ executionId: "exec-1", sagaName: "OrderSaga" });
    registry.register(entry);

    // Both listeners should be called (copy-before-iterate)
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);

    // On second register, listener1 should not be called (unsubscribed)
    const e2 = createEntry({ executionId: "exec-2", sagaName: "OrderSaga" });
    registry.register(e2);
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(2);
  });

  it("getExecution returns undefined for unknown id", () => {
    const registry = createSagaRegistry();
    expect(registry.getExecution("unknown")).toBeUndefined();
  });

  it("re-registering same executionId overwrites entry", () => {
    const registry = createSagaRegistry();
    const e1 = createEntry({ executionId: "exec-1", sagaName: "OrderSaga" });
    const e2 = createEntry({ executionId: "exec-1", sagaName: "PaymentSaga" });

    registry.register(e1);
    registry.register(e2);

    expect(registry.getExecution("exec-1")?.sagaName).toBe("PaymentSaga");
    expect(registry.getAllExecutions()).toHaveLength(1);
  });

  it("unregister after dispose is a no-op", () => {
    const registry = createSagaRegistry();
    const entry = createEntry({ executionId: "exec-1", sagaName: "OrderSaga" });
    registry.register(entry);
    registry.dispose();

    // Should not throw
    registry.unregister("exec-1");
    expect(registry.getAllExecutions()).toHaveLength(0);
  });
});
