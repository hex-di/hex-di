/**
 * DOD 4: ActionMap & BoundActions
 */

import { describe, expect, it } from "vitest";
import { createStateServiceImpl } from "../src/services/state-service-impl.js";

// =============================================================================
// ActionMap & BoundActions runtime tests
// =============================================================================

describe("ActionMap & BoundActions", () => {
  it("no-payload action reducer becomes () => void bound action", () => {
    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
    });

    // Should be callable with no args
    svc.actions.increment();
    expect(svc.state).toEqual({ count: 1 });
  });

  it("payload action reducer becomes (P) => void bound action", () => {
    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        add: (state: { count: number }, amount: number) => ({ count: state.count + amount }),
      },
    });

    svc.actions.add(5);
    expect(svc.state).toEqual({ count: 5 });
  });

  it("bound action dispatches reducer and updates state", () => {
    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
    });

    expect(svc.state).toEqual({ count: 0 });
    svc.actions.increment();
    expect(svc.state).toEqual({ count: 1 });
    svc.actions.increment();
    expect(svc.state).toEqual({ count: 2 });
  });

  it("bound action with payload passes payload to reducer", () => {
    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        add: (state: { count: number }, amount: number) => ({ count: state.count + amount }),
      },
    });

    svc.actions.add(3);
    svc.actions.add(7);
    expect(svc.state).toEqual({ count: 10 });
  });

  it("multiple actions on same port each dispatch independently", () => {
    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
        decrement: (state: { count: number }) => ({ count: state.count - 1 }),
        add: (state: { count: number }, n: number) => ({ count: state.count + n }),
      },
    });

    svc.actions.increment();
    expect(svc.state).toEqual({ count: 1 });

    svc.actions.decrement();
    expect(svc.state).toEqual({ count: 0 });

    svc.actions.add(10);
    expect(svc.state).toEqual({ count: 10 });
  });

  it("action dispatch notifies subscribers with new and previous state", () => {
    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
    });

    const changes: Array<{ current: number; prev: number }> = [];
    svc.subscribe((state, prev) => {
      changes.push({
        current: (state as { count: number }).count,
        prev: (prev as { count: number }).count,
      });
    });

    svc.actions.increment();
    expect(changes).toEqual([{ current: 1, prev: 0 }]);

    svc.actions.increment();
    expect(changes).toEqual([
      { current: 1, prev: 0 },
      { current: 2, prev: 1 },
    ]);
  });
});
