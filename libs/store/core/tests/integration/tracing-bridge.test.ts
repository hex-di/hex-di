/**
 * Store Tracing Bridge Integration Tests
 *
 * Verifies tracing hook integration with StateServiceImpl and ActionEvent traceId propagation.
 */

import { describe, it, expect } from "vitest";
import { createStateServiceImpl } from "../../src/services/state-service-impl.js";
import { createStoreTracingBridge } from "../../src/integration/tracing-bridge.js";
import type {
  StoreTracerLike,
  StoreTracingHook,
  StoreSpanContext,
} from "../../src/integration/tracing-bridge.js";
import type { ActionEvent } from "../../src/index.js";
import { ResultAsync } from "@hex-di/result";

// =============================================================================
// Helpers
// =============================================================================

function createMockTracer(): StoreTracerLike & {
  pushSpanCalls: Array<{ name: string; attributes?: Record<string, string> }>;
  popSpanCalls: Array<{ status: "ok" | "error" }>;
} {
  const pushSpanCalls: Array<{ name: string; attributes?: Record<string, string> }> = [];
  const popSpanCalls: Array<{ status: "ok" | "error" }> = [];
  return {
    pushSpanCalls,
    popSpanCalls,
    pushSpan(name: string, attributes?: Record<string, string>) {
      pushSpanCalls.push({ name, attributes });
    },
    popSpan(status: "ok" | "error") {
      popSpanCalls.push({ status });
    },
  };
}

function createMockTracingHook(): StoreTracingHook & {
  startCalls: Array<{ portName: string; actionName: string; containerName: string }>;
  endCalls: Array<{ ok: boolean }>;
} {
  const startCalls: Array<{ portName: string; actionName: string; containerName: string }> = [];
  const endCalls: Array<{ ok: boolean }> = [];
  return {
    startCalls,
    endCalls,
    onActionStart(portName: string, actionName: string, containerName: string): StoreSpanContext {
      startCalls.push({ portName, actionName, containerName });
      return { traceId: "mock-trace-id" };
    },
    onActionEnd(ok: boolean): void {
      endCalls.push({ ok });
    },
  };
}

// =============================================================================
// StateServiceImpl with tracing hook
// =============================================================================

describe("StateServiceImpl with tracing hook", () => {
  it("onActionStart is called on dispatch", () => {
    const hook = createMockTracingHook();

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      tracingHook: hook,
    });

    svc.actions.increment();

    expect(hook.startCalls).toHaveLength(1);
    expect(hook.startCalls[0]).toEqual({
      portName: "Counter",
      actionName: "increment",
      containerName: "root",
    });
  });

  it("onActionEnd(true) is called for successful dispatch", () => {
    const hook = createMockTracingHook();

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      tracingHook: hook,
    });

    svc.actions.increment();

    expect(hook.endCalls).toHaveLength(1);
    expect(hook.endCalls[0]?.ok).toBe(true);
  });

  it("onActionEnd(false) is called when sync effect throws", () => {
    const hook = createMockTracingHook();

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => {
          throw new Error("boom");
        },
      },
      tracingHook: hook,
    });

    svc.actions.increment();

    expect(hook.endCalls).toHaveLength(1);
    expect(hook.endCalls[0]?.ok).toBe(false);
  });

  it("traceId appears on ActionEvent to effect adapters", () => {
    const events: ActionEvent[] = [];
    const adapter = {
      onAction: (e: ActionEvent) => {
        events.push(e);
      },
    };

    const hook = createMockTracingHook();

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effectAdapters: [adapter],
      tracingHook: hook,
    });

    svc.actions.increment();

    expect(events).toHaveLength(1);
    expect(events[0]?.traceId).toBe("mock-trace-id");
  });

  it("traceId is undefined when no tracing hook is provided", () => {
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
    expect(events[0]?.traceId).toBeUndefined();
  });

  it("effect error path calls onActionEnd(false) for sync effects", () => {
    const hook = createMockTracingHook();

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
      onEffectError: () => {
        /* swallow */
      },
      tracingHook: hook,
    });

    svc.actions.increment();

    expect(hook.endCalls).toHaveLength(1);
    expect(hook.endCalls[0]?.ok).toBe(false);
  });

  it("async effect error path calls onActionEnd with ok=true initially (async resolves later)", async () => {
    const hook = createMockTracingHook();

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effects: {
        increment: () => ResultAsync.fromPromise(Promise.reject(new Error("async fail")), e => e),
      },
      onEffectError: () => {
        /* swallow */
      },
      tracingHook: hook,
    });

    svc.actions.increment();

    // The synchronous part of dispatch completes with actionOk=true
    // because the async ResultAsync error resolves later
    expect(hook.endCalls).toHaveLength(1);
    // After the async resolution, actionOk would be set to false inside the match callback,
    // but onActionEnd was already called synchronously
    expect(hook.endCalls[0]?.ok).toBe(true);
  });

  it("traceId propagates to effect-error phase events", () => {
    const events: ActionEvent[] = [];
    const adapter = {
      onAction: (e: ActionEvent) => {
        events.push(e);
      },
    };
    const hook = createMockTracingHook();

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
      effectAdapters: [adapter],
      tracingHook: hook,
    });

    svc.actions.increment();

    const errorEvents = events.filter(e => e.phase === "effect-error");
    expect(errorEvents).toHaveLength(1);
    expect(errorEvents[0]?.traceId).toBe("mock-trace-id");
  });

  it("dispatch without tracingHook works normally", () => {
    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
    });

    svc.actions.increment();
    expect(svc.state).toEqual({ count: 1 });
  });
});

// =============================================================================
// Full bridge integration (createStoreTracingBridge + StateServiceImpl)
// =============================================================================

describe("Full bridge integration", () => {
  it("bridge + StateServiceImpl: pushSpan/popSpan called on dispatch", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      tracingHook: hook,
    });

    svc.actions.increment();

    expect(tracer.pushSpanCalls).toHaveLength(1);
    expect(tracer.pushSpanCalls[0]?.name).toBe("store.Counter.increment");
    expect(tracer.popSpanCalls).toHaveLength(1);
    expect(tracer.popSpanCalls[0]?.status).toBe("ok");
  });

  it("bridge with getSpanContext propagates traceId to ActionEvent", () => {
    const tracer = createMockTracer();
    const events: ActionEvent[] = [];
    const adapter = {
      onAction: (e: ActionEvent) => {
        events.push(e);
      },
    };

    const hook = createStoreTracingBridge({
      tracer,
      getSpanContext: () => ({ traceId: "bridge-trace-id" }),
    });

    const svc = createStateServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        increment: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      effectAdapters: [adapter],
      tracingHook: hook,
    });

    svc.actions.increment();

    expect(events).toHaveLength(1);
    expect(events[0]?.traceId).toBe("bridge-trace-id");
  });

  it("bridge with filter skips tracing for filtered ports", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({
      tracer,
      filter: portName => portName === "Counter",
    });

    const svc = createStateServiceImpl({
      portName: "Internal",
      containerName: "root",
      initial: { count: 0 },
      actions: {
        update: (state: { count: number }) => ({ count: state.count + 1 }),
      },
      tracingHook: hook,
    });

    svc.actions.update();

    expect(tracer.pushSpanCalls).toHaveLength(0);
    expect(tracer.popSpanCalls).toHaveLength(0);
  });
});
