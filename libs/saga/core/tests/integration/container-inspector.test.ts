/**
 * Integration tests for container inspector registration flow
 *
 * Verifies end-to-end: SagaInspector -> SagaLibraryInspector -> container registration.
 *
 * @packageDocumentation
 */

import { describe, it, expect } from "vitest";
import { isLibraryInspector } from "@hex-di/core";
import type { LibraryEvent, LibraryEventListener } from "@hex-di/core";
import { createPort } from "@hex-di/core";
import { createSagaLibraryInspector } from "../../src/integration/library-inspector.js";
import { createSagaInspector, emitToInspector } from "../../src/introspection/saga-inspector.js";
import { defineStep } from "../../src/step/builder.js";
import { defineSaga } from "../../src/saga/builder.js";

// =============================================================================
// Test Setup
// =============================================================================

const ValidatePort = createPort<"Validate", any>({ name: "Validate" });
const ReservePort = createPort<"Reserve", any>({ name: "Reserve" });

const ValidateStep = defineStep("Validate")
  .io<{ orderId: string }, { valid: boolean }>()
  .invoke(ValidatePort, ctx => ctx.input)
  .build();

const ReserveStep = defineStep("Reserve")
  .io<{ orderId: string }, { reservationId: string }>()
  .invoke(ReservePort, ctx => ctx.input)
  .compensate(ctx => ({ undo: ctx.stepResult.reservationId }))
  .build();

const OrderSaga = defineSaga("OrderSaga")
  .input<{ orderId: string }>()
  .step(ValidateStep)
  .step(ReserveStep)
  .output(r => ({ reservationId: r.Reserve.reservationId }))
  .build();

// =============================================================================
// Mock Container Inspector
// =============================================================================

function createMockContainerInspector(): {
  registerLibrary: (inspector: { name: string; getSnapshot: () => unknown }) => void;
  getLibraryInspector: (name: string) => { name: string; getSnapshot: () => unknown } | undefined;
  getUnifiedSnapshot: () => Record<string, unknown>;
  subscribeToLibrary: (name: string, listener: LibraryEventListener) => (() => void) | undefined;
} {
  const libraries = new Map<
    string,
    {
      name: string;
      getSnapshot: () => unknown;
      subscribe?: (listener: LibraryEventListener) => () => void;
    }
  >();

  return {
    registerLibrary(inspector) {
      libraries.set(inspector.name, inspector as any);
    },
    getLibraryInspector(name: string) {
      return libraries.get(name);
    },
    getUnifiedSnapshot() {
      const result: Record<string, unknown> = {};
      for (const [name, inspector] of libraries) {
        result[name] = inspector.getSnapshot();
      }
      return result;
    },
    subscribeToLibrary(name: string, listener: LibraryEventListener) {
      const lib = libraries.get(name);
      if (lib?.subscribe) {
        return lib.subscribe(listener);
      }
      return undefined;
    },
  };
}

// =============================================================================
// Integration Tests
// =============================================================================

describe("Container Inspector Integration", () => {
  it("SagaLibraryInspector passes isLibraryInspector type guard", () => {
    const sagaInspector = createSagaInspector({
      definitions: [OrderSaga],
    });

    const libraryInspector = createSagaLibraryInspector(sagaInspector);

    expect(isLibraryInspector(libraryInspector)).toBe(true);
  });

  it("registers with container inspector and can be retrieved by name", () => {
    const sagaInspector = createSagaInspector({
      definitions: [OrderSaga],
    });

    const libraryInspector = createSagaLibraryInspector(sagaInspector);
    const container = createMockContainerInspector();

    container.registerLibrary(libraryInspector);

    const retrieved = container.getLibraryInspector("saga");
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe("saga");
  });

  it("unified snapshot includes saga snapshot under 'saga' key", () => {
    const sagaInspector = createSagaInspector({
      definitions: [OrderSaga],
    });

    const libraryInspector = createSagaLibraryInspector(sagaInspector);
    const container = createMockContainerInspector();

    container.registerLibrary(libraryInspector);

    const unified = container.getUnifiedSnapshot();

    expect(unified.saga).toBeDefined();
    const sagaSnapshot = unified.saga as Record<string, unknown>;

    // Should have definitions
    const definitions = sagaSnapshot.definitions as readonly unknown[];
    expect(definitions).toHaveLength(1);
    expect((definitions[0] as { name: string }).name).toBe("OrderSaga");

    // Should have activeExecutions (empty since no running sagas)
    expect(sagaSnapshot.activeExecutions).toEqual([]);

    // Should have compensationStats
    expect(sagaSnapshot.compensationStats).toBeDefined();

    // Should have suggestions (steps without compensation should produce suggestions)
    const suggestions = sagaSnapshot.suggestions as readonly { stepName?: string }[];
    const noCompensation = suggestions.find(s => s.stepName === "Validate");
    expect(noCompensation).toBeDefined();
  });

  it("saga events flow through to container subscribers as LibraryEvents", () => {
    const sagaInspector = createSagaInspector({
      definitions: [OrderSaga],
    });

    const libraryInspector = createSagaLibraryInspector(sagaInspector);
    const container = createMockContainerInspector();

    container.registerLibrary(libraryInspector);

    const events: LibraryEvent[] = [];
    container.subscribeToLibrary("saga", event => {
      events.push(event);
    });

    // Emit a saga event through the inspector bridge
    emitToInspector(sagaInspector, {
      type: "saga:started",
      executionId: "exec-1",
      sagaName: "OrderSaga",
      input: { orderId: "o-1" },
      stepCount: 2,
      metadata: undefined,
      timestamp: Date.now(),
    });

    expect(events).toHaveLength(1);
    expect(events[0].source).toBe("saga");
    expect(events[0].type).toBe("saga:started");
    expect(events[0].payload.executionId).toBe("exec-1");
    expect(events[0].payload.sagaName).toBe("OrderSaga");
  });

  it("emitting multiple events produces multiple LibraryEvents", () => {
    const sagaInspector = createSagaInspector({
      definitions: [OrderSaga],
    });

    const libraryInspector = createSagaLibraryInspector(sagaInspector);
    const container = createMockContainerInspector();

    container.registerLibrary(libraryInspector);

    const events: LibraryEvent[] = [];
    container.subscribeToLibrary("saga", event => {
      events.push(event);
    });

    const now = Date.now();

    emitToInspector(sagaInspector, {
      type: "saga:started",
      executionId: "exec-1",
      sagaName: "OrderSaga",
      input: {},
      stepCount: 2,
      metadata: undefined,
      timestamp: now,
    });

    emitToInspector(sagaInspector, {
      type: "step:started",
      executionId: "exec-1",
      sagaName: "OrderSaga",
      stepName: "Validate",
      stepIndex: 0,
      timestamp: now + 1,
    });

    emitToInspector(sagaInspector, {
      type: "step:completed",
      executionId: "exec-1",
      sagaName: "OrderSaga",
      stepName: "Validate",
      stepIndex: 0,
      durationMs: 10,
      timestamp: now + 11,
    });

    expect(events).toHaveLength(3);
    expect(events[0].type).toBe("saga:started");
    expect(events[1].type).toBe("step:started");
    expect(events[2].type).toBe("step:completed");

    // Each event should have correct source
    for (const event of events) {
      expect(event.source).toBe("saga");
    }
  });

  it("unsubscribing stops further event delivery", () => {
    const sagaInspector = createSagaInspector({
      definitions: [OrderSaga],
    });

    const libraryInspector = createSagaLibraryInspector(sagaInspector);
    const container = createMockContainerInspector();

    container.registerLibrary(libraryInspector);

    const events: LibraryEvent[] = [];
    const unsub = container.subscribeToLibrary("saga", event => {
      events.push(event);
    });

    emitToInspector(sagaInspector, {
      type: "saga:started",
      executionId: "exec-1",
      sagaName: "OrderSaga",
      input: {},
      stepCount: 2,
      metadata: undefined,
      timestamp: Date.now(),
    });

    expect(events).toHaveLength(1);

    // Unsubscribe
    unsub?.();

    emitToInspector(sagaInspector, {
      type: "saga:completed",
      executionId: "exec-1",
      sagaName: "OrderSaga",
      totalDurationMs: 100,
      stepsExecuted: 2,
      stepsSkipped: 0,
      timestamp: Date.now(),
    });

    // Should still be 1 since we unsubscribed
    expect(events).toHaveLength(1);
  });
});
