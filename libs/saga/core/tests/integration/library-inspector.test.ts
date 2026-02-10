/**
 * Tests for createSagaLibraryInspector
 *
 * Verifies that the library inspector bridge correctly:
 * - Reports name "saga"
 * - Returns snapshot data from SagaInspector
 * - Freezes all snapshot data
 * - Forwards SagaEvents as LibraryEvents with correct source/type/payload
 * - Unsubscribe function works
 * - dispose() is a no-op
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi } from "vitest";
import { createSagaLibraryInspector } from "../../src/integration/library-inspector.js";
import type {
  SagaInspector,
  SagaDefinitionInfo,
  InspectorSagaExecutionSummary,
  CompensationStats,
  SagaSuggestion,
} from "../../src/introspection/types.js";
import type { SagaEventListener, Unsubscribe, SagaEvent } from "../../src/runtime/types.js";
import { ResultAsync } from "@hex-di/result";

// =============================================================================
// Test Helpers
// =============================================================================

function createMockDefinition(name: string): SagaDefinitionInfo {
  return {
    name,
    steps: [
      {
        name: "step1",
        port: "Port1",
        hasCompensation: true,
        isConditional: false,
        retryPolicy: undefined,
        timeout: undefined,
      },
    ],
    options: {
      compensationStrategy: "sequential",
      timeout: undefined,
      retryPolicy: undefined,
    },
    portDependencies: ["Port1"],
  };
}

function createMockExecution(id: string): InspectorSagaExecutionSummary {
  return {
    executionId: id,
    sagaName: "TestSaga",
    status: "running",
    currentStepName: "step1",
    currentStepIndex: 0,
    totalSteps: 2,
    completedStepCount: 0,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
    durationMs: null,
    error: null,
    compensationState: { active: false, compensatedSteps: [], failedSteps: [] },
    metadata: {},
  };
}

function createMockCompensationStats(): CompensationStats {
  return {
    totalCompensations: 5,
    successfulCompensations: 3,
    failedCompensations: 2,
    averageCompensationTime: 150,
    mostCompensatedSaga: "OrderSaga",
    bySaga: [],
  };
}

function createMockSuggestion(): SagaSuggestion {
  return {
    type: "saga_step_without_compensation",
    sagaName: "TestSaga",
    stepName: "step1",
    message: "Step has no compensation",
    action: "Add compensation handler",
  };
}

function createMockSagaInspector(overrides: Partial<SagaInspector> = {}): SagaInspector {
  return {
    getDefinitions: vi.fn().mockReturnValue([]),
    getActiveExecutions: vi.fn().mockReturnValue([]),
    getHistory: vi.fn().mockReturnValue(ResultAsync.ok([])),
    getTrace: vi.fn().mockReturnValue(null),
    getCompensationStats: vi.fn().mockReturnValue(createMockCompensationStats()),
    getSuggestions: vi.fn().mockReturnValue([]),
    subscribe: vi.fn().mockReturnValue(() => undefined),
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("createSagaLibraryInspector", () => {
  it("returns object with name 'saga'", () => {
    const inspector = createMockSagaInspector();
    const libraryInspector = createSagaLibraryInspector(inspector);

    expect(libraryInspector.name).toBe("saga");
  });

  it("getSnapshot returns definitions from SagaInspector", () => {
    const defs = [createMockDefinition("Saga1"), createMockDefinition("Saga2")];
    const inspector = createMockSagaInspector({
      getDefinitions: vi.fn().mockReturnValue(defs),
    });

    const libraryInspector = createSagaLibraryInspector(inspector);
    const snapshot = libraryInspector.getSnapshot();

    expect(snapshot.definitions).toEqual(defs);
  });

  it("getSnapshot returns active executions from SagaInspector", () => {
    const executions = [createMockExecution("exec-1"), createMockExecution("exec-2")];
    const inspector = createMockSagaInspector({
      getActiveExecutions: vi.fn().mockReturnValue(executions),
    });

    const libraryInspector = createSagaLibraryInspector(inspector);
    const snapshot = libraryInspector.getSnapshot();

    expect(snapshot.activeExecutions).toEqual(executions);
  });

  it("getSnapshot returns compensation stats from SagaInspector", () => {
    const stats = createMockCompensationStats();
    const inspector = createMockSagaInspector({
      getCompensationStats: vi.fn().mockReturnValue(stats),
    });

    const libraryInspector = createSagaLibraryInspector(inspector);
    const snapshot = libraryInspector.getSnapshot();

    expect(snapshot.compensationStats).toEqual(stats);
  });

  it("getSnapshot returns suggestions from SagaInspector", () => {
    const suggestions = [createMockSuggestion()];
    const inspector = createMockSagaInspector({
      getSuggestions: vi.fn().mockReturnValue(suggestions),
    });

    const libraryInspector = createSagaLibraryInspector(inspector);
    const snapshot = libraryInspector.getSnapshot();

    expect(snapshot.suggestions).toEqual(suggestions);
  });

  it("getSnapshot returns frozen snapshot", () => {
    const inspector = createMockSagaInspector({
      getDefinitions: vi.fn().mockReturnValue([createMockDefinition("Saga1")]),
      getActiveExecutions: vi.fn().mockReturnValue([createMockExecution("exec-1")]),
      getSuggestions: vi.fn().mockReturnValue([createMockSuggestion()]),
    });

    const libraryInspector = createSagaLibraryInspector(inspector);
    const snapshot = libraryInspector.getSnapshot();

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.definitions)).toBe(true);
    expect(Object.isFrozen(snapshot.activeExecutions)).toBe(true);
    expect(Object.isFrozen(snapshot.compensationStats)).toBe(true);
    expect(Object.isFrozen(snapshot.suggestions)).toBe(true);
  });

  it("subscribe forwards SagaEvents as LibraryEvents with correct source/type/payload", () => {
    let capturedListener: SagaEventListener | undefined;

    const inspector = createMockSagaInspector({
      subscribe: vi.fn((listener: SagaEventListener): Unsubscribe => {
        capturedListener = listener;
        return () => undefined;
      }),
    });

    const libraryInspector = createSagaLibraryInspector(inspector);
    const listener = vi.fn();
    libraryInspector.subscribe!(listener);

    expect(capturedListener).toBeDefined();

    const sagaEvent: SagaEvent = {
      type: "saga:started",
      executionId: "exec-1",
      sagaName: "OrderSaga",
      input: { orderId: "o-1" },
      stepCount: 3,
      metadata: undefined,
      timestamp: 1234567890,
    };

    capturedListener!(sagaEvent);

    expect(listener).toHaveBeenCalledOnce();
    const event = listener.mock.calls[0][0];
    expect(event.source).toBe("saga");
    expect(event.type).toBe("saga:started");
    expect(event.timestamp).toBe(1234567890);
    expect(event.payload.executionId).toBe("exec-1");
    expect(event.payload.sagaName).toBe("OrderSaga");
    expect(Object.isFrozen(event.payload)).toBe(true);
  });

  it("subscribe forwards step events with correct mapping", () => {
    let capturedListener: SagaEventListener | undefined;

    const inspector = createMockSagaInspector({
      subscribe: vi.fn((listener: SagaEventListener): Unsubscribe => {
        capturedListener = listener;
        return () => undefined;
      }),
    });

    const libraryInspector = createSagaLibraryInspector(inspector);
    const listener = vi.fn();
    libraryInspector.subscribe!(listener);

    const stepEvent: SagaEvent = {
      type: "step:completed",
      executionId: "exec-1",
      sagaName: "OrderSaga",
      stepName: "Reserve",
      stepIndex: 1,
      durationMs: 42,
      timestamp: 9999,
    };

    capturedListener!(stepEvent);

    const event = listener.mock.calls[0][0];
    expect(event.source).toBe("saga");
    expect(event.type).toBe("step:completed");
    expect(event.payload.stepName).toBe("Reserve");
    expect(event.payload.durationMs).toBe(42);
    expect(event.timestamp).toBe(9999);
  });

  it("subscribe returns unsubscribe function that works", () => {
    const unsubscribeFn = vi.fn();
    const inspector = createMockSagaInspector({
      subscribe: vi.fn().mockReturnValue(unsubscribeFn),
    });

    const libraryInspector = createSagaLibraryInspector(inspector);
    const unsub = libraryInspector.subscribe!(vi.fn());
    unsub();

    expect(unsubscribeFn).toHaveBeenCalledOnce();
  });

  it("dispose is a no-op and does not throw", () => {
    const inspector = createMockSagaInspector();
    const libraryInspector = createSagaLibraryInspector(inspector);

    expect(() => libraryInspector.dispose!()).not.toThrow();
  });
});
