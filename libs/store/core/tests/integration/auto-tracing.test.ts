/**
 * Auto-Tracing Integration Tests
 *
 * Tests that StoreTracingHookPort resolves to a tracing hook and
 * that adapters with tracing hooks call tracing methods on action dispatch.
 */

import { describe, it, expect, vi } from "vitest";
import { createStoreTracingBridge } from "../../src/integration/tracing-bridge.js";
import { createStoreTracingHookAdapter } from "../../src/integration/tracing-hook-adapter.js";
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
} satisfies ActionMap<CounterState>;

function createMockTracer(): {
  pushSpan: ReturnType<typeof vi.fn<(name: string, attributes?: Record<string, string>) => void>>;
  popSpan: ReturnType<typeof vi.fn<(status: "ok" | "error") => void>>;
} {
  return {
    pushSpan: vi.fn<(name: string, attributes?: Record<string, string>) => void>(),
    popSpan: vi.fn<(status: "ok" | "error") => void>(),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("Auto-Tracing", () => {
  it("StoreTracingHookAdapter creates a valid tracing hook", () => {
    const tracer = createMockTracer();
    const adapter = createStoreTracingHookAdapter({ tracer });

    expect(adapter.provides.__portName).toBe("StoreTracingHook");
    expect(adapter.lifetime).toBe("singleton");

    const hook = adapter.factory({});
    expect(hook.onActionStart).toBeTypeOf("function");
    expect(hook.onActionEnd).toBeTypeOf("function");
  });

  it("tracing hook is called on action dispatch", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    const service = createStateServiceImpl({
      portName: "Counter",
      containerName: "default",
      initial: { count: 0 },
      actions: counterActions,
      tracingHook: hook,
    });

    service.actions.increment();

    expect(tracer.pushSpan).toHaveBeenCalledOnce();
    expect(tracer.pushSpan).toHaveBeenCalledWith(
      "store.Counter.increment",
      expect.objectContaining({
        "store.port": "Counter",
        "store.action": "increment",
        "store.container": "default",
      })
    );
    expect(tracer.popSpan).toHaveBeenCalledWith("ok");
  });

  it("filter controls which ports are traced", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({
      tracer,
      filter: portName => portName !== "Counter",
    });

    const service = createStateServiceImpl({
      portName: "Counter",
      containerName: "default",
      initial: { count: 0 },
      actions: counterActions,
      tracingHook: hook,
    });

    service.actions.increment();

    expect(tracer.pushSpan).not.toHaveBeenCalled();
    expect(tracer.popSpan).not.toHaveBeenCalled();
  });

  it("adapter factory with filter creates filtered hook", () => {
    const tracer = createMockTracer();
    const adapter = createStoreTracingHookAdapter({
      tracer,
      filter: portName => portName === "Allowed",
    });

    const hook = adapter.factory({});

    // Should not trace "Counter"
    hook.onActionStart("Counter", "increment", "default");
    expect(tracer.pushSpan).not.toHaveBeenCalled();

    // Should trace "Allowed"
    hook.onActionStart("Allowed", "doSomething", "default");
    expect(tracer.pushSpan).toHaveBeenCalledOnce();
  });

  it("tracing hook reports error status on failed effects", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    const service = createStateServiceImpl({
      portName: "Counter",
      containerName: "default",
      initial: { count: 0 },
      actions: counterActions,
      effects: {
        increment: () => {
          throw new Error("effect failed");
        },
      },
      tracingHook: hook,
    });

    service.actions.increment();

    expect(tracer.popSpan).toHaveBeenCalledWith("error");
  });
});
