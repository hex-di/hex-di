/**
 * Auto-Recording Integration Tests
 *
 * Tests that actions dispatched on StateService are auto-recorded
 * in the inspector history when `inspection: true` is set.
 */

import { describe, it, expect } from "vitest";
import { ResultAsync } from "@hex-di/result";
import { createStoreRegistry } from "../../src/inspection/store-registry.js";
import { createStoreInspectorImpl } from "../../src/inspection/store-inspector-impl.js";
import { createStateServiceImpl } from "../../src/services/state-service-impl.js";
import type { ActionMap } from "../../src/types/actions.js";

// =============================================================================
// Helpers
// =============================================================================

interface CounterState {
  readonly count: number;
}

const counterActions = {
  increment: (state: CounterState) => ({ count: state.count + 1 }),
  add: (state: CounterState, amount: number) => ({ count: state.count + amount }),
} satisfies ActionMap<CounterState>;

// =============================================================================
// Tests
// =============================================================================

describe("Auto-Recording", () => {
  it("records actions dispatched on StateService", () => {
    const registry = createStoreRegistry();
    const inspector = createStoreInspectorImpl({ registry });

    const service = createStateServiceImpl({
      portName: "Counter",
      containerName: "default",
      initial: { count: 0 },
      actions: counterActions,
      inspector,
    });

    service.actions.increment();
    service.actions.increment();

    const history = inspector.getActionHistory();
    expect(history).toHaveLength(2);
  });

  it("getActionHistory() returns entries with correct data", () => {
    const registry = createStoreRegistry();
    const inspector = createStoreInspectorImpl({ registry });

    const service = createStateServiceImpl({
      portName: "Counter",
      containerName: "default",
      initial: { count: 0 },
      actions: counterActions,
      inspector,
    });

    service.actions.add(5);

    const history = inspector.getActionHistory();
    expect(history).toHaveLength(1);
    const entry = history[0];
    expect(entry).toBeDefined();
    expect(entry?.portName).toBe("Counter");
    expect(entry?.actionName).toBe("add");
    expect(entry?.payload).toBe(5);
    expect(entry?.prevState).toEqual({ count: 0 });
    expect(entry?.nextState).toEqual({ count: 5 });
  });

  it("records prevState and nextState correctly across multiple actions", () => {
    const inspector = createStoreInspectorImpl();

    const service = createStateServiceImpl({
      portName: "Counter",
      containerName: "default",
      initial: { count: 0 },
      actions: counterActions,
      inspector,
    });

    service.actions.increment();
    service.actions.add(10);

    const history = inspector.getActionHistory();
    expect(history).toHaveLength(2);

    expect(history[0]?.prevState).toEqual({ count: 0 });
    expect(history[0]?.nextState).toEqual({ count: 1 });

    expect(history[1]?.prevState).toEqual({ count: 1 });
    expect(history[1]?.nextState).toEqual({ count: 11 });
  });

  it("records effectStatus as 'none' when no effects", () => {
    const inspector = createStoreInspectorImpl();

    const service = createStateServiceImpl({
      portName: "Counter",
      containerName: "default",
      initial: { count: 0 },
      actions: counterActions,
      inspector,
    });

    service.actions.increment();

    const history = inspector.getActionHistory();
    expect(history[0]?.effectStatus).toBe("none");
  });

  it("records effectStatus as 'completed' for sync effects", () => {
    const inspector = createStoreInspectorImpl();

    const service = createStateServiceImpl({
      portName: "Counter",
      containerName: "default",
      initial: { count: 0 },
      actions: counterActions,
      effects: {
        increment: () => {
          // sync effect that returns void
        },
      },
      inspector,
    });

    service.actions.increment();

    const history = inspector.getActionHistory();
    expect(history[0]?.effectStatus).toBe("completed");
  });

  it("assigns unique IDs and incrementing order to entries", () => {
    const inspector = createStoreInspectorImpl();

    const service = createStateServiceImpl({
      portName: "Counter",
      containerName: "default",
      initial: { count: 0 },
      actions: counterActions,
      inspector,
    });

    service.actions.increment();
    service.actions.increment();
    service.actions.increment();

    const history = inspector.getActionHistory();
    expect(history).toHaveLength(3);

    const ids = new Set(history.map(e => e.id));
    expect(ids.size).toBe(3);

    expect(history[0]?.order).toBeLessThan(history[1]?.order ?? 0);
    expect(history[1]?.order).toBeLessThan(history[2]?.order ?? 0);
  });

  it("propagates tracing span context to history entries", () => {
    const inspector = createStoreInspectorImpl();

    const service = createStateServiceImpl({
      portName: "Counter",
      containerName: "default",
      initial: { count: 0 },
      actions: counterActions,
      inspector,
      tracingHook: {
        onActionStart: () => ({ traceId: "trace-123", spanId: "span-456" }),
        onActionEnd: () => {},
      },
    });

    service.actions.increment();

    const history = inspector.getActionHistory();
    expect(history[0]?.traceId).toBe("trace-123");
    expect(history[0]?.spanId).toBe("span-456");
  });

  it("pendingEffects counter increments on async effect start and decrements on completion", async () => {
    const inspector = createStoreInspectorImpl();

    let resolveEffect: (() => void) | undefined;
    const effectPromise = new Promise<void>(resolve => {
      resolveEffect = resolve;
    });

    const service = createStateServiceImpl({
      portName: "Counter",
      containerName: "default",
      initial: { count: 0 },
      actions: counterActions,
      effects: {
        increment: () => ResultAsync.fromPromise(effectPromise, () => "effect-error"),
      },
      inspector,
    });

    service.actions.increment();

    // While effect is pending, pendingEffects should be > 0
    expect(inspector.getSnapshot().pendingEffects).toBe(1);

    // Resolve the effect
    resolveEffect?.();
    await effectPromise;
    // Give microtask queue time to settle
    await new Promise<void>(r => setTimeout(r, 10));

    expect(inspector.getSnapshot().pendingEffects).toBe(0);
  });

  it("without inspector, no recording occurs", () => {
    const service = createStateServiceImpl({
      portName: "Counter",
      containerName: "default",
      initial: { count: 0 },
      actions: counterActions,
    });

    // Should not throw
    service.actions.increment();
    service.actions.increment();
  });
});
