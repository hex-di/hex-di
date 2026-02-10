/**
 * Tests for SagaRegistryAdapter
 *
 * Verifies that the adapter provides the correct port, has singleton lifetime,
 * creates a working registry, and properly disposes via the finalizer.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { SagaRegistryAdapter } from "../../src/integration/registry-adapter.js";
import { SagaRegistryPort } from "../../src/ports/factory.js";
import type { SagaRegistryEntry } from "../../src/introspection/types.js";

// =============================================================================
// Test Helpers
// =============================================================================

function createMockRegistryEntry(overrides: Partial<SagaRegistryEntry> = {}): SagaRegistryEntry {
  return {
    sagaName: "TestSaga",
    executionId: "exec-1",
    status: () => "running",
    currentStep: () => 0,
    trace: () => ({
      executionId: "exec-1",
      sagaName: "TestSaga",
      input: {},
      status: "running",
      steps: [],
      compensation: undefined,
      startedAt: Date.now(),
      completedAt: undefined,
      totalDurationMs: undefined,
      metadata: undefined,
    }),
    startedAt: Date.now(),
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("SagaRegistryAdapter", () => {
  it("provides SagaRegistryPort", () => {
    expect(SagaRegistryAdapter.provides).toBe(SagaRegistryPort);
  });

  it("requires no dependencies", () => {
    expect(SagaRegistryAdapter.requires).toHaveLength(0);
  });

  it("has singleton lifetime", () => {
    expect(SagaRegistryAdapter.lifetime).toBe("singleton");
  });

  it("has sync factoryKind", () => {
    expect(SagaRegistryAdapter.factoryKind).toBe("sync");
  });

  it("is not clonable", () => {
    expect(SagaRegistryAdapter.clonable).toBe(false);
  });

  it("is frozen", () => {
    expect(Object.isFrozen(SagaRegistryAdapter)).toBe(true);
  });

  it("factory creates a working registry", () => {
    const registry = SagaRegistryAdapter.factory({} as never);

    const entry = createMockRegistryEntry({
      sagaName: "OrderSaga",
      executionId: "exec-1",
    });

    registry.register(entry);

    const executions = registry.getAllExecutions();
    expect(executions).toHaveLength(1);
    expect(executions[0].sagaName).toBe("OrderSaga");
    expect(executions[0].executionId).toBe("exec-1");

    registry.dispose();
  });

  it("factory creates registry that supports unregister", () => {
    const registry = SagaRegistryAdapter.factory({} as never);

    registry.register(createMockRegistryEntry({ executionId: "exec-1" }));
    registry.register(createMockRegistryEntry({ executionId: "exec-2" }));

    expect(registry.getAllExecutions()).toHaveLength(2);

    registry.unregister("exec-1");
    expect(registry.getAllExecutions()).toHaveLength(1);
    expect(registry.getAllExecutions()[0].executionId).toBe("exec-2");

    registry.dispose();
  });

  it("factory creates registry that supports subscribe", () => {
    const registry = SagaRegistryAdapter.factory({} as never);
    const events: Array<{ type: string }> = [];

    registry.subscribe(event => {
      events.push({ type: event.type });
    });

    registry.register(createMockRegistryEntry({ executionId: "exec-1" }));
    registry.unregister("exec-1");

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("execution-registered");
    expect(events[1].type).toBe("execution-unregistered");

    registry.dispose();
  });

  it("finalizer disposes registry", () => {
    const registry = SagaRegistryAdapter.factory({} as never);

    registry.register(createMockRegistryEntry({ executionId: "exec-1" }));
    expect(registry.getAllExecutions()).toHaveLength(1);

    void SagaRegistryAdapter.finalizer?.(registry);

    // After disposal, registry should be cleared
    expect(registry.getAllExecutions()).toHaveLength(0);
  });
});
