/**
 * Extended Store Tracing Bridge Tests
 *
 * Covers onAtomUpdate, onAtomUpdateEnd, onDerivedRecompute, onDerivedRecomputeEnd,
 * onAsyncDerivedFetch, onAsyncDerivedFetchEnd — methods with NoCoverage in Stryker.
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
// onAtomUpdate / onAtomUpdateEnd
// =============================================================================

describe("createStoreTracingBridge — onAtomUpdate", () => {
  it("pushes span with correct name and attributes", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onAtomUpdate!("Theme", "root");

    expect(tracer.pushSpanCalls).toHaveLength(1);
    expect(tracer.pushSpanCalls[0]?.name).toBe("store.atom.Theme");
    expect(tracer.pushSpanCalls[0]?.attributes?.["store.port"]).toBe("Theme");
    expect(tracer.pushSpanCalls[0]?.attributes?.["store.container"]).toBe("root");
  });

  it("returns span context from getSpanContext", () => {
    const tracer = createMockTracer();
    const ctx: StoreSpanContext = { traceId: "atom-trace", spanId: "atom-span" };
    const hook = createStoreTracingBridge({ tracer, getSpanContext: () => ctx });

    const result = hook.onAtomUpdate!("Theme", "root");

    expect(result.traceId).toBe("atom-trace");
    expect(result.spanId).toBe("atom-span");
  });

  it("returns empty object without getSpanContext", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    const result = hook.onAtomUpdate!("Theme", "root");

    expect(result).toEqual({});
  });

  it("includes scopeId in attributes when configured", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer, scopeId: "scope-99" });

    hook.onAtomUpdate!("Theme", "root");

    expect(tracer.pushSpanCalls[0]?.attributes?.["store.scope_id"]).toBe("scope-99");
  });

  it("does not include scopeId when not configured", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onAtomUpdate!("Theme", "root");

    expect(tracer.pushSpanCalls[0]?.attributes?.["store.scope_id"]).toBeUndefined();
  });

  it("filter skips atom tracing when returning false", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer, filter: () => false });

    const result = hook.onAtomUpdate!("Theme", "root");

    expect(tracer.pushSpanCalls).toHaveLength(0);
    expect(result).toEqual({});
  });

  it("filter allows atom tracing when returning true", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer, filter: () => true });

    hook.onAtomUpdate!("Theme", "root");

    expect(tracer.pushSpanCalls).toHaveLength(1);
  });
});

describe("createStoreTracingBridge — onAtomUpdateEnd", () => {
  it("calls popSpan with ok when ok=true", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onAtomUpdate!("Theme", "root");
    hook.onAtomUpdateEnd!(true);

    expect(tracer.popSpanCalls).toHaveLength(1);
    expect(tracer.popSpanCalls[0]?.status).toBe("ok");
  });

  it("calls popSpan with error when ok=false", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onAtomUpdate!("Theme", "root");
    hook.onAtomUpdateEnd!(false);

    expect(tracer.popSpanCalls).toHaveLength(1);
    expect(tracer.popSpanCalls[0]?.status).toBe("error");
  });

  it("does not call popSpan when no prior onAtomUpdate", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onAtomUpdateEnd!(true);

    expect(tracer.popSpanCalls).toHaveLength(0);
  });

  it("does not call popSpan when filter blocked onAtomUpdate", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer, filter: () => false });

    hook.onAtomUpdate!("Theme", "root");
    hook.onAtomUpdateEnd!(true);

    expect(tracer.popSpanCalls).toHaveLength(0);
  });

  it("resets active flag after onAtomUpdateEnd", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onAtomUpdate!("Theme", "root");
    hook.onAtomUpdateEnd!(true);

    // Second call should be a no-op
    hook.onAtomUpdateEnd!(false);

    expect(tracer.popSpanCalls).toHaveLength(1);
  });
});

// =============================================================================
// onDerivedRecompute / onDerivedRecomputeEnd
// =============================================================================

describe("createStoreTracingBridge — onDerivedRecompute", () => {
  it("pushes span with correct name and attributes", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onDerivedRecompute!("Double", "root");

    expect(tracer.pushSpanCalls).toHaveLength(1);
    expect(tracer.pushSpanCalls[0]?.name).toBe("store.derived.Double");
    expect(tracer.pushSpanCalls[0]?.attributes?.["store.port"]).toBe("Double");
    expect(tracer.pushSpanCalls[0]?.attributes?.["store.container"]).toBe("root");
  });

  it("returns span context from getSpanContext", () => {
    const tracer = createMockTracer();
    const ctx: StoreSpanContext = { traceId: "derived-trace" };
    const hook = createStoreTracingBridge({ tracer, getSpanContext: () => ctx });

    const result = hook.onDerivedRecompute!("Double", "root");

    expect(result.traceId).toBe("derived-trace");
  });

  it("returns empty object without getSpanContext", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    const result = hook.onDerivedRecompute!("Double", "root");

    expect(result).toEqual({});
  });

  it("includes scopeId in attributes when configured", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer, scopeId: "scope-derived" });

    hook.onDerivedRecompute!("Double", "root");

    expect(tracer.pushSpanCalls[0]?.attributes?.["store.scope_id"]).toBe("scope-derived");
  });

  it("filter skips derived tracing when returning false", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer, filter: () => false });

    const result = hook.onDerivedRecompute!("Double", "root");

    expect(tracer.pushSpanCalls).toHaveLength(0);
    expect(result).toEqual({});
  });
});

describe("createStoreTracingBridge — onDerivedRecomputeEnd", () => {
  it("calls popSpan with ok when ok=true", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onDerivedRecompute!("Double", "root");
    hook.onDerivedRecomputeEnd!(true);

    expect(tracer.popSpanCalls).toHaveLength(1);
    expect(tracer.popSpanCalls[0]?.status).toBe("ok");
  });

  it("calls popSpan with error when ok=false", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onDerivedRecompute!("Double", "root");
    hook.onDerivedRecomputeEnd!(false);

    expect(tracer.popSpanCalls).toHaveLength(1);
    expect(tracer.popSpanCalls[0]?.status).toBe("error");
  });

  it("does not call popSpan when no prior onDerivedRecompute", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onDerivedRecomputeEnd!(true);

    expect(tracer.popSpanCalls).toHaveLength(0);
  });

  it("resets active flag after onDerivedRecomputeEnd", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onDerivedRecompute!("Double", "root");
    hook.onDerivedRecomputeEnd!(true);
    hook.onDerivedRecomputeEnd!(false);

    expect(tracer.popSpanCalls).toHaveLength(1);
  });
});

// =============================================================================
// onAsyncDerivedFetch / onAsyncDerivedFetchEnd
// =============================================================================

describe("createStoreTracingBridge — onAsyncDerivedFetch", () => {
  it("pushes span with correct name and attributes", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onAsyncDerivedFetch!("Rate", "root");

    expect(tracer.pushSpanCalls).toHaveLength(1);
    expect(tracer.pushSpanCalls[0]?.name).toBe("store.async.Rate");
    expect(tracer.pushSpanCalls[0]?.attributes?.["store.port"]).toBe("Rate");
    expect(tracer.pushSpanCalls[0]?.attributes?.["store.container"]).toBe("root");
  });

  it("returns span context from getSpanContext", () => {
    const tracer = createMockTracer();
    const ctx: StoreSpanContext = { traceId: "async-trace", spanId: "async-span" };
    const hook = createStoreTracingBridge({ tracer, getSpanContext: () => ctx });

    const result = hook.onAsyncDerivedFetch!("Rate", "root");

    expect(result.traceId).toBe("async-trace");
    expect(result.spanId).toBe("async-span");
  });

  it("returns empty object without getSpanContext", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    const result = hook.onAsyncDerivedFetch!("Rate", "root");

    expect(result).toEqual({});
  });

  it("includes scopeId in attributes when configured", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer, scopeId: "scope-async" });

    hook.onAsyncDerivedFetch!("Rate", "root");

    expect(tracer.pushSpanCalls[0]?.attributes?.["store.scope_id"]).toBe("scope-async");
  });

  it("filter skips async tracing when returning false", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer, filter: () => false });

    const result = hook.onAsyncDerivedFetch!("Rate", "root");

    expect(tracer.pushSpanCalls).toHaveLength(0);
    expect(result).toEqual({});
  });
});

describe("createStoreTracingBridge — onAsyncDerivedFetchEnd", () => {
  it("calls popSpan with ok when ok=true", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onAsyncDerivedFetch!("Rate", "root");
    hook.onAsyncDerivedFetchEnd!(true);

    expect(tracer.popSpanCalls).toHaveLength(1);
    expect(tracer.popSpanCalls[0]?.status).toBe("ok");
  });

  it("calls popSpan with error when ok=false", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onAsyncDerivedFetch!("Rate", "root");
    hook.onAsyncDerivedFetchEnd!(false);

    expect(tracer.popSpanCalls).toHaveLength(1);
    expect(tracer.popSpanCalls[0]?.status).toBe("error");
  });

  it("does not call popSpan when no prior onAsyncDerivedFetch", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onAsyncDerivedFetchEnd!(true);

    expect(tracer.popSpanCalls).toHaveLength(0);
  });

  it("resets active flag after onAsyncDerivedFetchEnd", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onAsyncDerivedFetch!("Rate", "root");
    hook.onAsyncDerivedFetchEnd!(true);
    hook.onAsyncDerivedFetchEnd!(false);

    expect(tracer.popSpanCalls).toHaveLength(1);
  });
});

// =============================================================================
// Mixed method calls — independence
// =============================================================================

describe("createStoreTracingBridge — method independence", () => {
  it("action and atom spans are independent", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onActionStart("Counter", "increment", "root");
    hook.onAtomUpdate!("Theme", "root");
    hook.onAtomUpdateEnd!(true);
    hook.onActionEnd(true);

    expect(tracer.pushSpanCalls).toHaveLength(2);
    expect(tracer.popSpanCalls).toHaveLength(2);
    expect(tracer.popSpanCalls[0]?.status).toBe("ok"); // atom
    expect(tracer.popSpanCalls[1]?.status).toBe("ok"); // action
  });

  it("derived and async spans are independent", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onDerivedRecompute!("Double", "root");
    hook.onAsyncDerivedFetch!("Rate", "root");
    hook.onDerivedRecomputeEnd!(true);
    hook.onAsyncDerivedFetchEnd!(false);

    expect(tracer.pushSpanCalls).toHaveLength(2);
    expect(tracer.popSpanCalls).toHaveLength(2);
    expect(tracer.popSpanCalls[0]?.status).toBe("ok"); // derived
    expect(tracer.popSpanCalls[1]?.status).toBe("error"); // async
  });

  it("ending one type does not affect other active types", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    // Start all four
    hook.onActionStart("Counter", "inc", "root");
    hook.onAtomUpdate!("Theme", "root");
    hook.onDerivedRecompute!("Double", "root");
    hook.onAsyncDerivedFetch!("Rate", "root");

    // End action — others still active
    hook.onActionEnd(true);
    expect(tracer.popSpanCalls).toHaveLength(1);

    // End atom
    hook.onAtomUpdateEnd!(true);
    expect(tracer.popSpanCalls).toHaveLength(2);

    // End derived
    hook.onDerivedRecomputeEnd!(true);
    expect(tracer.popSpanCalls).toHaveLength(3);

    // End async
    hook.onAsyncDerivedFetchEnd!(true);
    expect(tracer.popSpanCalls).toHaveLength(4);

    // All ended — further calls are no-ops
    hook.onActionEnd(false);
    hook.onAtomUpdateEnd!(false);
    hook.onDerivedRecomputeEnd!(false);
    hook.onAsyncDerivedFetchEnd!(false);
    expect(tracer.popSpanCalls).toHaveLength(4);
  });

  it("filter applies to all methods consistently", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({
      tracer,
      filter: portName => portName === "Allowed",
    });

    hook.onActionStart("Blocked", "inc", "root");
    hook.onAtomUpdate!("Blocked", "root");
    hook.onDerivedRecompute!("Blocked", "root");
    hook.onAsyncDerivedFetch!("Blocked", "root");

    expect(tracer.pushSpanCalls).toHaveLength(0);

    hook.onActionStart("Allowed", "inc", "root");
    hook.onAtomUpdate!("Allowed", "root");
    hook.onDerivedRecompute!("Allowed", "root");
    hook.onAsyncDerivedFetch!("Allowed", "root");

    expect(tracer.pushSpanCalls).toHaveLength(4);
  });
});

// =============================================================================
// buildAttributes — scopeId conditional
// =============================================================================

describe("createStoreTracingBridge — buildAttributes", () => {
  it("scopeId=undefined does not add store.scope_id to any method", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer, scopeId: undefined });

    hook.onActionStart("P", "a", "c");
    hook.onAtomUpdate!("P", "c");
    hook.onDerivedRecompute!("P", "c");
    hook.onAsyncDerivedFetch!("P", "c");

    for (const call of tracer.pushSpanCalls) {
      expect(call.attributes?.["store.scope_id"]).toBeUndefined();
      // Also check the key is not present at all (kills mutant where `if (true)` sets key to undefined)
      if (call.attributes) {
        expect(Object.keys(call.attributes)).not.toContain("store.scope_id");
      }
    }
  });

  it("scopeId='' (empty string) adds store.scope_id to all methods", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer, scopeId: "" });

    hook.onActionStart("P", "a", "c");
    hook.onAtomUpdate!("P", "c");
    hook.onDerivedRecompute!("P", "c");
    hook.onAsyncDerivedFetch!("P", "c");

    for (const call of tracer.pushSpanCalls) {
      expect(call.attributes?.["store.scope_id"]).toBe("");
    }
  });
});
