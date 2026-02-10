/**
 * Store Tracing Bridge Unit Tests
 */

import { describe, it, expect } from "vitest";
import { createStoreTracingBridge } from "../src/integration/tracing-bridge.js";
import type { StoreTracerLike, StoreSpanContext } from "../src/integration/tracing-bridge.js";

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

// =============================================================================
// createStoreTracingBridge
// =============================================================================

describe("createStoreTracingBridge", () => {
  it("returns a StoreTracingHook with onActionStart and onActionEnd", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    expect(typeof hook.onActionStart).toBe("function");
    expect(typeof hook.onActionEnd).toBe("function");
  });

  it("onActionStart calls pushSpan with correct span name", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onActionStart("Counter", "increment", "root");

    expect(tracer.pushSpanCalls).toHaveLength(1);
    expect(tracer.pushSpanCalls[0]?.name).toBe("store.Counter.increment");
  });

  it("onActionStart passes correct attributes", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onActionStart("Counter", "increment", "root");

    const attrs = tracer.pushSpanCalls[0]?.attributes;
    expect(attrs?.["store.port"]).toBe("Counter");
    expect(attrs?.["store.action"]).toBe("increment");
    expect(attrs?.["store.container"]).toBe("root");
  });

  it("onActionStart includes scopeId in attributes when provided", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer, scopeId: "scope-42" });

    hook.onActionStart("Counter", "increment", "root");

    const attrs = tracer.pushSpanCalls[0]?.attributes;
    expect(attrs?.["store.scope_id"]).toBe("scope-42");
  });

  it("onActionStart does not include scopeId when not provided", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onActionStart("Counter", "increment", "root");

    const attrs = tracer.pushSpanCalls[0]?.attributes;
    expect(attrs?.["store.scope_id"]).toBeUndefined();
  });

  it("onActionEnd(true) calls popSpan with ok status", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onActionStart("Counter", "increment", "root");
    hook.onActionEnd(true);

    expect(tracer.popSpanCalls).toHaveLength(1);
    expect(tracer.popSpanCalls[0]?.status).toBe("ok");
  });

  it("onActionEnd(false) calls popSpan with error status", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onActionStart("Counter", "increment", "root");
    hook.onActionEnd(false);

    expect(tracer.popSpanCalls).toHaveLength(1);
    expect(tracer.popSpanCalls[0]?.status).toBe("error");
  });

  it("onActionEnd without prior onActionStart does not call popSpan", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onActionEnd(true);

    expect(tracer.popSpanCalls).toHaveLength(0);
  });

  it("getSpanContext return value is propagated from onActionStart", () => {
    const tracer = createMockTracer();
    const spanContext: StoreSpanContext = { traceId: "trace-abc", spanId: "span-123" };
    const hook = createStoreTracingBridge({
      tracer,
      getSpanContext: () => spanContext,
    });

    const result = hook.onActionStart("Counter", "increment", "root");

    expect(result.traceId).toBe("trace-abc");
    expect(result.spanId).toBe("span-123");
  });

  it("without getSpanContext, onActionStart returns empty object", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    const result = hook.onActionStart("Counter", "increment", "root");

    expect(result).toEqual({});
  });

  it("filter prevents span creation when returning false", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({
      tracer,
      filter: portName => portName !== "Internal",
    });

    const result = hook.onActionStart("Internal", "update", "root");

    expect(tracer.pushSpanCalls).toHaveLength(0);
    expect(result).toEqual({});
  });

  it("filter allows span creation when returning true", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({
      tracer,
      filter: portName => portName === "Counter",
    });

    hook.onActionStart("Counter", "increment", "root");

    expect(tracer.pushSpanCalls).toHaveLength(1);
  });

  it("filter returns empty context and onActionEnd is a no-op for filtered port", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({
      tracer,
      filter: () => false,
      getSpanContext: () => ({ traceId: "should-not-appear" }),
    });

    const result = hook.onActionStart("Counter", "increment", "root");
    hook.onActionEnd(true);

    expect(result).toEqual({});
    expect(tracer.pushSpanCalls).toHaveLength(0);
    expect(tracer.popSpanCalls).toHaveLength(0);
  });

  it("sequential onActionStart/onActionEnd calls work correctly", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onActionStart("Counter", "increment", "root");
    hook.onActionEnd(true);

    hook.onActionStart("Counter", "decrement", "root");
    hook.onActionEnd(false);

    expect(tracer.pushSpanCalls).toHaveLength(2);
    expect(tracer.popSpanCalls).toHaveLength(2);
    expect(tracer.popSpanCalls[0]?.status).toBe("ok");
    expect(tracer.popSpanCalls[1]?.status).toBe("error");
  });
});
