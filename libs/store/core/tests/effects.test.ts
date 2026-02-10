/**
 * DOD 7: Effects
 */

import { describe, expect, it, vi } from "vitest";
import { createStateServiceImpl } from "../src/services/state-service-impl.js";
import type {
  EffectFailedError,
  EffectAdapterError,
  EffectErrorHandlerError,
  StoreRuntimeError,
  ActionEvent,
} from "../src/index.js";
import { ResultAsync } from "@hex-di/result";

// =============================================================================
// Sync effects
// =============================================================================

describe("Sync effects", () => {
  it("sync effect (void return) fires after reducer completes", () => {
    const effectCalls: Array<{ state: number; prevState: number }> = [];

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: (ctx: { state: unknown; prevState: unknown }) => {
          effectCalls.push({
            state: (ctx.state as { count: number }).count,
            prevState: (ctx.prevState as { count: number }).count,
          });
        },
      },
    });

    svc.actions.increment();
    expect(effectCalls).toEqual([{ state: 1, prevState: 0 }]);
  });

  it("EffectContext contains correct state (after reducer)", () => {
    let capturedState: unknown;
    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: (ctx: { state: unknown }) => {
          capturedState = ctx.state;
        },
      },
    });

    svc.actions.increment();
    expect(capturedState).toEqual({ count: 1 });
  });

  it("EffectContext contains correct prevState (before reducer)", () => {
    let capturedPrevState: unknown;
    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 5 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: (ctx: { prevState: unknown }) => {
          capturedPrevState = ctx.prevState;
        },
      },
    });

    svc.actions.increment();
    expect(capturedPrevState).toEqual({ count: 5 });
  });

  it("EffectContext contains correct payload for payload actions", () => {
    let capturedPayload: unknown;
    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        add: (state: { count: number }, n: number) => ({ count: state.count + n }),
      },
      effects: {
        add: (ctx: { payload: unknown }) => {
          capturedPayload = ctx.payload;
        },
      },
    });

    svc.actions.add(42);
    expect(capturedPayload).toBe(42);
  });

  it("EffectContext payload is undefined for no-payload actions", () => {
    let capturedPayload: unknown = "NOT_SET";
    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: (ctx: { payload: unknown }) => {
          capturedPayload = ctx.payload;
        },
      },
    });

    svc.actions.increment();
    expect(capturedPayload).toBeUndefined();
  });

  it("effect execution is fire-and-forget (does not block state updates)", () => {
    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => {
          // This takes time but should not block
        },
      },
    });

    svc.actions.increment();
    expect(svc.state).toEqual({ count: 1 });
  });
});

// =============================================================================
// Async effects
// =============================================================================

describe("Async effects", () => {
  it("async effect Ok result: no error handler invocation", async () => {
    const errorHandler = vi.fn();
    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => ResultAsync.fromPromise(Promise.resolve(undefined), e => e),
      },
      onEffectError: errorHandler,
    });

    svc.actions.increment();
    await new Promise(r => setTimeout(r, 50));
    expect(errorHandler).not.toHaveBeenCalled();
  });

  it("async effect Err result: onEffectError receives EffectFailedError", async () => {
    let capturedError: EffectFailedError | undefined;
    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => ResultAsync.fromPromise(Promise.reject(new Error("api fail")), e => e),
      },
      onEffectError: (ctx: { error: EffectFailedError }) => {
        capturedError = ctx.error;
      },
    });

    svc.actions.increment();
    await new Promise(r => setTimeout(r, 50));
    expect(capturedError).toBeDefined();
    expect(capturedError?._tag).toBe("EffectFailed");
    expect(capturedError?.portName).toBe("Counter");
    expect(capturedError?.actionName).toBe("increment");
  });

  it("onEffectError handler receives bound actions for compensating actions", async () => {
    let receivedActions: Record<string, unknown> | undefined;
    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
        reset: () => ({ count: 0 }),
      },
      effects: {
        increment: () => ResultAsync.fromPromise(Promise.reject(new Error("fail")), e => e),
      },
      onEffectError: (ctx: { actions: Record<string, unknown> }) => {
        receivedActions = ctx.actions;
      },
    });

    svc.actions.increment();
    await new Promise(r => setTimeout(r, 50));
    expect(receivedActions).toBeDefined();
    expect(typeof receivedActions?.increment).toBe("function");
    expect(typeof receivedActions?.reset).toBe("function");
  });
});

// =============================================================================
// onEffectError handler errors
// =============================================================================

describe("onEffectError handler errors", () => {
  it("when onEffectError itself throws: EffectErrorHandlerError routed to onError, no propagation", async () => {
    const errors: StoreRuntimeError[] = [];

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => ResultAsync.fromPromise(Promise.reject(new Error("fail")), e => e),
      },
      onEffectError: () => {
        throw new Error("handler crash");
      },
      onError: error => {
        errors.push(error);
      },
    });

    svc.actions.increment();
    await new Promise(r => setTimeout(r, 50));

    // Should have routed the EffectErrorHandlerError to onError
    expect(errors.length).toBe(1);
    const err = errors[0] as EffectErrorHandlerError;
    expect(err._tag).toBe("EffectErrorHandlerFailed");
    expect(err.portName).toBe("Counter");
    expect(err.actionName).toBe("increment");
  });

  it("when no onEffectError is provided, effect Err results are swallowed", async () => {
    // No onEffectError configured - should not throw
    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => ResultAsync.fromPromise(Promise.reject(new Error("fail")), e => e),
      },
    });

    svc.actions.increment();
    await new Promise(r => setTimeout(r, 50));
    // If we get here without error, it's swallowed
    expect(svc.state).toEqual({ count: 1 });
  });
});

// =============================================================================
// EffectFailedError structure
// =============================================================================

describe("EffectFailedError structure", () => {
  it("has _tag: EffectFailed, portName, actionName, cause", () => {
    const error: EffectFailedError = {
      _tag: "EffectFailed",
      portName: "Counter",
      actionName: "increment",
      cause: new Error("api"),
    };
    expect(error._tag).toBe("EffectFailed");
    expect(error.portName).toBe("Counter");
    expect(error.actionName).toBe("increment");
    expect(error.cause).toBeInstanceOf(Error);
  });
});

// =============================================================================
// Effect adapter (effect-as-port)
// =============================================================================

describe("Effect adapter (effect-as-port pattern)", () => {
  it("effect adapter receives ActionEvent with all required fields", () => {
    const events: ActionEvent[] = [];
    const effectAdapter = {
      onAction: (event: ActionEvent) => {
        events.push(event);
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effectAdapters: [effectAdapter],
    });

    svc.actions.increment();
    expect(events).toHaveLength(1);
    expect(events[0]?.portName).toBe("Counter");
    expect(events[0]?.actionName).toBe("increment");
    expect(events[0]?.phase).toBe("action");
    expect(typeof events[0]?.timestamp).toBe("number");
    expect(events[0]?.prevState).toEqual({ count: 0 });
    expect(events[0]?.nextState).toEqual({ count: 1 });
  });

  it("ActionEvent.phase is action for normal dispatch", () => {
    const events: ActionEvent[] = [];
    const effectAdapter = {
      onAction: (event: ActionEvent) => {
        events.push(event);
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effectAdapters: [effectAdapter],
    });

    svc.actions.increment();
    expect(events[0]?.phase).toBe("action");
  });

  it("ActionEvent.phase is effect-error when effect returns Err", async () => {
    const events: ActionEvent[] = [];
    const effectAdapter = {
      onAction: (event: ActionEvent) => {
        events.push(event);
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => ResultAsync.fromPromise(Promise.reject(new Error("fail")), e => e),
      },
      effectAdapters: [effectAdapter],
    });

    svc.actions.increment();
    await new Promise(r => setTimeout(r, 50));

    const errorEvent = events.find(e => e.phase === "effect-error");
    expect(errorEvent).toBeDefined();
    expect(errorEvent?.error?._tag).toBe("EffectFailed");
  });
});

// =============================================================================
// Effect adapter edge cases
// =============================================================================

describe("Effect adapter edge cases", () => {
  it("empty effectAdapters array does not cause errors, actions still work", () => {
    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effectAdapters: [],
    });

    svc.actions.increment();
    expect(svc.state).toEqual({ count: 1 });
  });

  it("effectAdapter.onAction that throws is swallowed and routed to onError as EffectAdapterError", () => {
    const errors: StoreRuntimeError[] = [];
    const throwingAdapter = {
      onAction: () => {
        throw new Error("adapter crash");
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effectAdapters: [throwingAdapter],
      onError: error => {
        errors.push(error);
      },
    });

    svc.actions.increment();

    expect(svc.state).toEqual({ count: 1 });
    expect(errors).toHaveLength(1);
    const err = errors[0] as EffectAdapterError;
    expect(err._tag).toBe("EffectAdapterFailed");
    expect(err.cause).toBeInstanceOf(Error);
    expect((err.cause as Error).message).toBe("adapter crash");
  });

  it("effectAdapter.onAction that throws without onError is swallowed silently", () => {
    const throwingAdapter = {
      onAction: () => {
        throw new Error("adapter crash no handler");
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effectAdapters: [throwingAdapter],
      // no onError
    });

    // Should not throw
    svc.actions.increment();
    expect(svc.state).toEqual({ count: 1 });
  });

  it("multiple effectAdapters all receive events", () => {
    const events1: ActionEvent[] = [];
    const events2: ActionEvent[] = [];
    const events3: ActionEvent[] = [];

    const adapter1 = {
      onAction: (e: ActionEvent) => {
        events1.push(e);
      },
    };
    const adapter2 = {
      onAction: (e: ActionEvent) => {
        events2.push(e);
      },
    };
    const adapter3 = {
      onAction: (e: ActionEvent) => {
        events3.push(e);
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effectAdapters: [adapter1, adapter2, adapter3],
    });

    svc.actions.increment();

    expect(events1).toHaveLength(1);
    expect(events2).toHaveLength(1);
    expect(events3).toHaveLength(1);
    expect(events1[0]?.actionName).toBe("increment");
    expect(events2[0]?.actionName).toBe("increment");
    expect(events3[0]?.actionName).toBe("increment");
  });

  it("effectAdapter receives correct payload in ActionEvent", () => {
    const events: ActionEvent[] = [];
    const adapter = {
      onAction: (e: ActionEvent) => {
        events.push(e);
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        add: (state: { count: number }, n: number) => ({ count: state.count + n }),
      },
      effectAdapters: [adapter],
    });

    svc.actions.add(99);

    expect(events).toHaveLength(1);
    expect(events[0]?.payload).toBe(99);
    expect(events[0]?.prevState).toEqual({ count: 0 });
    expect(events[0]?.nextState).toEqual({ count: 99 });
  });
});

// =============================================================================
// Sync effect error handling
// =============================================================================

describe("Sync effect error handling", () => {
  it("sync effect that throws is caught as EffectFailedError and sent to onEffectError", () => {
    let capturedError: EffectFailedError | undefined;

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => {
          throw new Error("sync boom");
        },
      },
      onEffectError: (ctx: { error: EffectFailedError }) => {
        capturedError = ctx.error;
      },
    });

    svc.actions.increment();

    expect(capturedError).toBeDefined();
    expect(capturedError?._tag).toBe("EffectFailed");
    expect(capturedError?.portName).toBe("Counter");
    expect(capturedError?.actionName).toBe("increment");
    expect(capturedError?.cause).toBeInstanceOf(Error);
    expect((capturedError?.cause as Error).message).toBe("sync boom");
  });

  it("sync effect that throws without onEffectError is caught and swallowed", () => {
    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => {
          throw new Error("sync boom no handler");
        },
      },
      // no onEffectError, no onError
    });

    // Should not propagate
    svc.actions.increment();
    expect(svc.state).toEqual({ count: 1 });
  });

  it("sync effect that throws with onError routes EffectFailedError through onEffectError", () => {
    const onErrorCalls: StoreRuntimeError[] = [];
    let effectErrorCalled = false;

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => {
          throw new Error("sync effect fail");
        },
      },
      onEffectError: () => {
        effectErrorCalled = true;
      },
      onError: error => {
        onErrorCalls.push(error);
      },
    });

    svc.actions.increment();

    // onEffectError should be called (handleEffectError is invoked)
    expect(effectErrorCalled).toBe(true);
    // onError should NOT be called because onEffectError did not throw
    expect(onErrorCalls).toHaveLength(0);
  });
});

// =============================================================================
// Effect-free actions with effect adapters
// =============================================================================

describe("Effect-free actions with effect adapters", () => {
  it("action without inline effect still notifies effectAdapters with phase=action", () => {
    const events: ActionEvent[] = [];
    const adapter = {
      onAction: (e: ActionEvent) => {
        events.push(e);
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      // no effects defined
      effectAdapters: [adapter],
    });

    svc.actions.increment();

    expect(events).toHaveLength(1);
    expect(events[0]?.phase).toBe("action");
    expect(events[0]?.actionName).toBe("increment");
  });

  it("action with inline void effect (non-ResultAsync return) notifies effectAdapters", () => {
    const events: ActionEvent[] = [];
    const adapter = {
      onAction: (e: ActionEvent) => {
        events.push(e);
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => {
          // void return - no ResultAsync
        },
      },
      effectAdapters: [adapter],
    });

    svc.actions.increment();

    expect(events).toHaveLength(1);
    expect(events[0]?.phase).toBe("action");
  });
});

// =============================================================================
// hasMatchMethod type guard edge cases
// =============================================================================

describe("hasMatchMethod type guard edge cases", () => {
  it("effect returning a non-ResultAsync object with no .match method is treated as void", () => {
    const events: ActionEvent[] = [];
    const adapter = {
      onAction: (e: ActionEvent) => {
        events.push(e);
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => {
          return { someKey: "not a ResultAsync" } as any;
        },
      },
      effectAdapters: [adapter],
    });

    svc.actions.increment();

    expect(events).toHaveLength(1);
    expect(events[0]?.phase).toBe("action");
  });

  it("effect returning null is treated as void (hasMatchMethod returns false for null)", () => {
    const events: ActionEvent[] = [];
    const adapter = {
      onAction: (e: ActionEvent) => {
        events.push(e);
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => {
          return null as any;
        },
      },
      effectAdapters: [adapter],
    });

    svc.actions.increment();

    expect(events).toHaveLength(1);
    expect(events[0]?.phase).toBe("action");
  });

  it("effect returning undefined is treated as void", () => {
    const events: ActionEvent[] = [];
    const adapter = {
      onAction: (e: ActionEvent) => {
        events.push(e);
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => {
          return undefined;
        },
      },
      effectAdapters: [adapter],
    });

    svc.actions.increment();

    expect(events).toHaveLength(1);
    expect(events[0]?.phase).toBe("action");
  });
});

// =============================================================================
// hasMatchMethod individual condition killers
// =============================================================================

describe("hasMatchMethod individual conditions", () => {
  it("effect returning object with match property that is not a function → treated as void", () => {
    const events: ActionEvent[] = [];
    const adapter = {
      onAction: (e: ActionEvent) => {
        events.push(e);
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => {
          // Has "match" key but it's not a function → hasMatchMethod returns false
          return { match: "not a function" } as any;
        },
      },
      effectAdapters: [adapter],
    });

    svc.actions.increment();
    expect(events).toHaveLength(1);
    expect(events[0]?.phase).toBe("action");
  });

  it("effect returning a string (not object) → treated as void", () => {
    const events: ActionEvent[] = [];
    const adapter = {
      onAction: (e: ActionEvent) => {
        events.push(e);
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => {
          return "a string" as any;
        },
      },
      effectAdapters: [adapter],
    });

    svc.actions.increment();
    expect(events).toHaveLength(1);
    expect(events[0]?.phase).toBe("action");
  });

  it("effect returning a number (not object) → treated as void", () => {
    const events: ActionEvent[] = [];
    const adapter = {
      onAction: (e: ActionEvent) => {
        events.push(e);
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => {
          return 42 as any;
        },
      },
      effectAdapters: [adapter],
    });

    svc.actions.increment();
    expect(events).toHaveLength(1);
    expect(events[0]?.phase).toBe("action");
  });
});

// =============================================================================
// Async effect OK path: effectAdapters notification
// =============================================================================

describe("Async effect OK path with effectAdapters", () => {
  it("async effect Ok result notifies effectAdapters with phase=action", async () => {
    const events: ActionEvent[] = [];
    const adapter = {
      onAction: (e: ActionEvent) => {
        events.push(e);
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => {
          return ResultAsync.fromPromise(Promise.resolve(undefined), e => e);
        },
      },
      effectAdapters: [adapter],
    });

    svc.actions.increment();
    await new Promise(r => setTimeout(r, 50));

    // Should have at least one event with phase="action" from the async Ok path
    const actionPhaseEvents = events.filter(e => e.phase === "action");
    expect(actionPhaseEvents.length).toBeGreaterThanOrEqual(1);
    expect(actionPhaseEvents[0]?.actionName).toBe("increment");
  });

  it("async effect Err result notifies effectAdapters with phase=effect-error", async () => {
    const events: ActionEvent[] = [];
    const adapter = {
      onAction: (e: ActionEvent) => {
        events.push(e);
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => {
          return ResultAsync.fromPromise(Promise.reject(new Error("async fail")), e => e);
        },
      },
      effectAdapters: [adapter],
    });

    svc.actions.increment();
    await new Promise(r => setTimeout(r, 50));

    const errorPhaseEvents = events.filter(e => e.phase === "effect-error");
    expect(errorPhaseEvents.length).toBeGreaterThanOrEqual(1);
  });
});

// =============================================================================
// onEffectError handler conditional
// =============================================================================

describe("onEffectError handler conditional", () => {
  it("without onEffectError: effect error does not crash (handler conditional)", async () => {
    const events: ActionEvent[] = [];
    const adapter = {
      onAction: (e: ActionEvent) => {
        events.push(e);
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => {
          return ResultAsync.fromPromise(Promise.reject(new Error("fail")), e => e);
        },
      },
      effectAdapters: [adapter],
      // NO onEffectError - tests that config.onEffectError check works
    });

    svc.actions.increment();
    await new Promise(r => setTimeout(r, 50));

    // Should have received error phase event
    const errorEvents = events.filter(e => e.phase === "effect-error");
    expect(errorEvents.length).toBeGreaterThanOrEqual(1);
  });

  it("with onEffectError: handler is called with error details", async () => {
    let handlerCalled = false;
    let receivedError: EffectFailedError | undefined;

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => {
          return ResultAsync.fromPromise(Promise.reject(new Error("async fail")), e => e);
        },
      },
      onEffectError: (ctx: { error: EffectFailedError }) => {
        handlerCalled = true;
        receivedError = ctx.error;
      },
    });

    svc.actions.increment();
    await new Promise(r => setTimeout(r, 50));

    expect(handlerCalled).toBe(true);
    expect(receivedError?._tag).toBe("EffectFailed");
  });
});

// =============================================================================
// effectAdapters.length === 0 early return
// =============================================================================

describe("effectAdapters length check", () => {
  it("single effectAdapter with length 1 is notified (length !== 0)", () => {
    const events: ActionEvent[] = [];
    const adapter = {
      onAction: (e: ActionEvent) => {
        events.push(e);
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effectAdapters: [adapter],
    });

    svc.actions.increment();
    expect(events).toHaveLength(1);
  });
});

// =============================================================================
// onError optional chaining
// =============================================================================

describe("onError optional chaining", () => {
  it("onEffectError handler throws without onError: EffectErrorHandlerError swallowed", () => {
    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => {
          throw new Error("effect crash");
        },
      },
      onEffectError: () => {
        throw new Error("handler crash");
      },
      // NO onError — tests the optional chaining `config.onError?.(err)`
    });

    // Should not throw even though both effect and handler crash
    svc.actions.increment();
    expect(svc.state).toEqual({ count: 1 });
  });
});

// =============================================================================
// hasMatchMethod — object WITH function match (ResultAsync-like)
// =============================================================================

describe("hasMatchMethod — ResultAsync-like objects", () => {
  it("object with match function IS treated as ResultAsync: match callbacks are called", async () => {
    let matchOkCalled = false;

    const events: ActionEvent[] = [];
    const adapter = {
      onAction: (e: ActionEvent) => {
        events.push(e);
      },
    };

    const fakeResultAsync = {
      then: () => {},
      match: (onOk: (v: unknown) => unknown, _onErr: (e: unknown) => unknown) => {
        matchOkCalled = true;
        return Promise.resolve(onOk(undefined));
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => fakeResultAsync as any,
      },
      effectAdapters: [adapter],
    });

    svc.actions.increment();
    await new Promise(r => setTimeout(r, 50));

    expect(matchOkCalled).toBe(true);
    // The Ok callback inside should have called notifyEffectAdapters with phase="action"
    const actionEvents = events.filter(e => e.phase === "action");
    expect(actionEvents.length).toBeGreaterThanOrEqual(1);
  });

  it("ResultAsync-like object where match.onErr is called notifies with phase=effect-error", async () => {
    const events: ActionEvent[] = [];
    const adapter = {
      onAction: (e: ActionEvent) => {
        events.push(e);
      },
    };

    const fakeResultAsync = {
      then: () => {},
      match: (_onOk: (v: unknown) => unknown, onErr: (e: unknown) => unknown) => {
        return Promise.resolve(onErr(new Error("fake err")));
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => fakeResultAsync as any,
      },
      effectAdapters: [adapter],
    });

    svc.actions.increment();
    await new Promise(r => setTimeout(r, 50));

    const errorEvents = events.filter(e => e.phase === "effect-error");
    expect(errorEvents.length).toBeGreaterThanOrEqual(1);
  });
});

// =============================================================================
// EffectErrorHandlerError: handler throws, onError receives wrapped error
// =============================================================================

describe("EffectErrorHandlerError wrapping", () => {
  it("onEffectError handler throws → EffectErrorHandlerError routed to onError", () => {
    const errors: StoreRuntimeError[] = [];

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => {
          throw new Error("effect crash");
        },
      },
      onEffectError: () => {
        throw new Error("handler crash");
      },
      onError: error => {
        errors.push(error);
      },
    });

    svc.actions.increment();

    expect(errors).toHaveLength(1);
    // Should be EffectErrorHandlerError wrapping both errors
    const err = errors[0] as EffectErrorHandlerError;
    expect(err._tag).toBe("EffectErrorHandlerFailed");
    expect(err.portName).toBe("Counter");
    expect(err.originalError._tag).toBe("EffectFailed");
  });
});

// =============================================================================
// Effect state/prevState in effectContext
// =============================================================================

describe("Effect context state verification", () => {
  it("effectContext.state is the nextState (after reducer)", () => {
    let capturedState: unknown;
    let capturedPrevState: unknown;

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: (ctx: any) => {
          capturedState = ctx.state;
          capturedPrevState = ctx.prevState;
        },
      },
    });

    svc.actions.increment();
    expect(capturedState).toEqual({ count: 1 }); // nextState after reducer
    expect(capturedPrevState).toEqual({ count: 0 }); // prevState before reducer
  });

  it("effectContext state is frozen (deepFreeze applied)", () => {
    let stateIsFrozen = false;
    let prevStateIsFrozen = false;

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: (ctx: any) => {
          stateIsFrozen = Object.isFrozen(ctx.state);
          prevStateIsFrozen = Object.isFrozen(ctx.prevState);
        },
      },
    });

    svc.actions.increment();
    expect(stateIsFrozen).toBe(true);
    expect(prevStateIsFrozen).toBe(true);
  });
});

// =============================================================================
// notifyEffectAdapters: event fields verification
// =============================================================================

// =============================================================================
// hasMatchMethod type guard edge cases
// (kills individual conditions: value === null, value === undefined,
//  typeof value !== "object", !("match" in value), typeof value.match === "function")
// =============================================================================

describe("hasMatchMethod type guard edge cases", () => {
  // These tests deliberately return non-standard values from effects to test
  // the hasMatchMethod type guard at runtime. We use `any` for the effects
  // config to bypass the type constraint that requires void | ResultAsync.

  it("effect returning null → treated as void, effectAdapters notified", () => {
    const events: ActionEvent[] = [];
    const adapter = {
      onAction: (e: ActionEvent) => {
        events.push(e);
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => null,
      } as any,
      effectAdapters: [adapter],
    });

    svc.actions.increment();
    expect(events).toHaveLength(1);
    expect(events[0]?.phase).toBe("action");
  });

  it("effect returning undefined → treated as void, effectAdapters notified", () => {
    const events: ActionEvent[] = [];
    const adapter = {
      onAction: (e: ActionEvent) => {
        events.push(e);
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => undefined,
      } as any,
      effectAdapters: [adapter],
    });

    svc.actions.increment();
    expect(events).toHaveLength(1);
    expect(events[0]?.phase).toBe("action");
  });

  it("effect returning a number → treated as void, effectAdapters notified", () => {
    const events: ActionEvent[] = [];
    const adapter = {
      onAction: (e: ActionEvent) => {
        events.push(e);
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => 42,
      } as any,
      effectAdapters: [adapter],
    });

    svc.actions.increment();
    expect(events).toHaveLength(1);
    expect(events[0]?.phase).toBe("action");
  });

  it("effect returning object without .match → treated as void, effectAdapters notified", () => {
    const events: ActionEvent[] = [];
    const adapter = {
      onAction: (e: ActionEvent) => {
        events.push(e);
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => ({ someField: "hello" }),
      } as any,
      effectAdapters: [adapter],
    });

    svc.actions.increment();
    expect(events).toHaveLength(1);
    expect(events[0]?.phase).toBe("action");
  });

  it("effect returning object with non-function .match → treated as void, does not throw", () => {
    const events: ActionEvent[] = [];
    const adapter = {
      onAction: (e: ActionEvent) => {
        events.push(e);
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => ({ match: "not-a-function" }),
      } as any,
      effectAdapters: [adapter],
    });

    // Kills mutation: typeof value.match === "function" → true
    // With mutant, this would try to call "not-a-function" as a function → TypeError
    expect(() => svc.actions.increment()).not.toThrow();
    expect(events).toHaveLength(1);
    expect(events[0]?.phase).toBe("action");
  });

  it("effect returning a string → treated as void, effectAdapters notified", () => {
    const events: ActionEvent[] = [];
    const adapter = {
      onAction: (e: ActionEvent) => {
        events.push(e);
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => "hello",
      } as any,
      effectAdapters: [adapter],
    });

    svc.actions.increment();
    expect(events).toHaveLength(1);
    expect(events[0]?.phase).toBe("action");
  });
});

// =============================================================================
// Effect error WITHOUT onEffectError but WITH onError
// (kills: if (config.onEffectError) → true at state-service-impl.ts:143)
// =============================================================================

describe("Effect error without onEffectError handler", () => {
  it("sync effect error without onEffectError: onError does NOT receive EffectErrorHandlerError", () => {
    const errors: StoreRuntimeError[] = [];

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => {
          throw new Error("effect-boom");
        },
      } as any,
      // NO onEffectError handler
      onError: err => {
        errors.push(err);
      },
    });

    // With mutant (if(config.onEffectError) → true), the undefined handler would be called,
    // causing a TypeError wrapped in EffectErrorHandlerError, sent to onError
    svc.actions.increment();
    // Without mutant: no EffectErrorHandlerError reaches onError
    // (the EffectFailedError is just swallowed since there's no handler)
    const hasHandlerError = errors.some(e => e._tag === "EffectErrorHandlerFailed");
    expect(hasHandlerError).toBe(false);
  });
});

// =============================================================================
// Bound action checkDisposed string literal
// (kills: checkDisposed("actions") → checkDisposed("") at state-service-impl.ts:190)
// =============================================================================

describe("Bound action disposed operation string", () => {
  it("calling a stored action reference after dispose: operation is 'actions'", () => {
    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
    });

    // Store action reference BEFORE dispose
    const { increment } = svc.actions;
    svc.dispose();

    // Now call the stored action — this reaches the checkDisposed("actions") at line 190
    // (not the getter checkDisposed at line 320 which we already bypassed)
    try {
      increment();
      expect.unreachable("should throw");
    } catch (e) {
      expect((e as any).operation).toBe("actions");
    }
  });
});

// =============================================================================
// effectAdapter error forwarding to onError
// (kills BlockStatement: (err) => config.onError?.(err) → {})
// =============================================================================

describe("effectAdapter error forwarding to onError", () => {
  it("effectAdapter.onAction throwing → EffectAdapterError forwarded to onError callback", () => {
    const errors: StoreRuntimeError[] = [];
    const throwingAdapter = {
      onAction: () => {
        throw new Error("adapter-boom");
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effectAdapters: [throwingAdapter],
      onError: err => {
        errors.push(err);
      },
    });

    // With mutant (inspectErr body → {}), onError is never called
    svc.actions.increment();
    expect(errors).toHaveLength(1);
    const err = errors[0] as EffectAdapterError;
    expect(err._tag).toBe("EffectAdapterFailed");
    expect(err.cause).toBeInstanceOf(Error);
  });

  it("multiple effectAdapters: one throws, others still receive", () => {
    const events: string[] = [];
    const errors: StoreRuntimeError[] = [];

    const throwingAdapter = {
      onAction: () => {
        throw new Error("boom");
      },
    };
    const normalAdapter = {
      onAction: () => {
        events.push("received");
      },
    };

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effectAdapters: [throwingAdapter, normalAdapter],
      onError: err => {
        errors.push(err);
      },
    });

    svc.actions.increment();
    expect(errors).toHaveLength(1);
    expect((errors[0] as EffectAdapterError)._tag).toBe("EffectAdapterFailed");
    expect(events).toHaveLength(1);
  });
});

// =============================================================================
// notifyEffectAdapters: event fields verification
// =============================================================================

describe("notifyEffectAdapters event fields", () => {
  it("event has correct portName and actionName", () => {
    const events: ActionEvent[] = [];
    const adapter = {
      onAction: (e: ActionEvent) => {
        events.push(e);
      },
    };

    const svc = createStateServiceImpl({
      portName: "TodoList",
      containerName: "root",
      initial: { items: [] as string[] },
      actions: {
        addItem: (state: { items: string[] }, item: string) => ({ items: [...state.items, item] }),
      },
      effectAdapters: [adapter],
    });

    svc.actions.addItem("test");

    expect(events[0]?.portName).toBe("TodoList");
    expect(events[0]?.actionName).toBe("addItem");
    expect(events[0]?.payload).toBe("test");
    expect(events[0]?.timestamp).toBeGreaterThan(0);
    expect(events[0]?.prevState).toEqual({ items: [] });
    expect(events[0]?.nextState).toEqual({ items: ["test"] });
  });
});

// =============================================================================
// Effect adapter wiring through createStateAdapter with deps
// =============================================================================

import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { createStatePort, createStateAdapter } from "../src/index.js";

describe("Effect adapter wiring via createStateAdapter", () => {
  it("effects function receives resolved deps and fires on dispatch", async () => {
    interface TestState {
      readonly count: number;
    }
    const testActions = {
      increment: (state: TestState): TestState => ({ count: state.count + 1 }),
    };
    type TestActions = typeof testActions;

    const effectCalls: Array<{ state: unknown; prevState: unknown }> = [];

    const TestPort = createStatePort<TestState, TestActions>()({
      name: "Test",
    });

    const adapter = createStateAdapter({
      provides: TestPort,
      initial: { count: 0 },
      actions: testActions,
      effects: {
        increment: (ctx: { state: unknown; prevState: unknown }) => {
          effectCalls.push({ state: ctx.state, prevState: ctx.prevState });
        },
      },
    });

    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "effect-wiring" });

    const service = container.resolve(TestPort);
    service.actions.increment();

    expect(effectCalls).toHaveLength(1);
    expect(effectCalls[0]?.state).toEqual({ count: 1 });
    expect(effectCalls[0]?.prevState).toEqual({ count: 0 });

    await container.dispose();
  });

  it("effects as DI function receives resolved dependencies", async () => {
    interface TestState {
      readonly count: number;
    }
    const testActions = {
      increment: (state: TestState): TestState => ({ count: state.count + 1 }),
    };
    type TestActions = typeof testActions;

    let receivedDeps: Record<string, unknown> | undefined;
    const effectCalls: number[] = [];

    const TestPort = createStatePort<TestState, TestActions>()({
      name: "Test",
    });

    const adapter = createStateAdapter({
      provides: TestPort,
      initial: { count: 0 },
      actions: testActions,
      effects: deps => {
        receivedDeps = deps;
        return {
          increment: (ctx: { state: unknown }) => {
            effectCalls.push((ctx.state as TestState).count);
          },
        };
      },
    });

    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "effect-di-fn" });

    const service = container.resolve(TestPort);
    service.actions.increment();

    expect(receivedDeps).toBeDefined();
    expect(effectCalls).toEqual([1]);

    await container.dispose();
  });

  it("onEffectError wired through createStateAdapter catches async effect errors", async () => {
    interface TestState {
      readonly count: number;
    }
    const testActions = {
      increment: (state: TestState): TestState => ({ count: state.count + 1 }),
    };
    type TestActions = typeof testActions;

    let capturedErrorTag: string | undefined;

    const TestPort = createStatePort<TestState, TestActions>()({
      name: "Test",
    });

    const adapter = createStateAdapter({
      provides: TestPort,
      initial: { count: 0 },
      actions: testActions,
      effects: {
        increment: () => ResultAsync.fromPromise(Promise.reject(new Error("boom")), e => e),
      },
      onEffectError: (ctx: unknown) => {
        const c = ctx as { error: { _tag: string } };
        capturedErrorTag = c.error._tag;
      },
    });

    const graph = GraphBuilder.create().provide(adapter).build();
    const container = createContainer({ graph, name: "effect-error-wiring" });

    const service = container.resolve(TestPort);
    service.actions.increment();

    await new Promise(r => setTimeout(r, 50));

    expect(capturedErrorTag).toBe("EffectFailed");

    await container.dispose();
  });
});
