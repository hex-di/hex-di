/**
 * Store Tracing Bridge Mutation Tests
 *
 * Targets surviving Stryker mutants in src/integration/tracing-bridge.ts.
 * Each test is designed to kill specific mutation patterns:
 * - String literal mutations in span names
 * - Conditional negation/removal mutations in shouldTrace and _*Active guards
 * - Operator mutations (e.g., ?? to ||, !== to ===)
 * - Assignment removal mutations (_*Active = true/false)
 * - Block removal mutations (entire if-bodies)
 * - Return value mutations (return {} vs return undefined)
 */

import { describe, it, expect, vi } from "vitest";
import { createStoreTracingBridge } from "../src/integration/tracing-bridge.js";
import type { StoreTracerLike } from "../src/integration/tracing-bridge.js";

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
// Span name string mutations
// =============================================================================

describe("span name string mutations", () => {
  it("onActionStart span name includes portName AND actionName with dots", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onActionStart("MyPort", "doThing", "container1");

    // Kills mutants that: remove portName, remove actionName, change separator, change prefix
    const name = tracer.pushSpanCalls[0]?.name;
    expect(name).toBe("store.MyPort.doThing");
    expect(name).toContain("MyPort");
    expect(name).toContain("doThing");
    expect(name).toMatch(/^store\./);
  });

  it("onAtomUpdate span name uses atom prefix with portName", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onAtomUpdate?.("AtomPort", "c1");

    const name = tracer.pushSpanCalls[0]?.name;
    expect(name).toBe("store.atom.AtomPort");
    // Kills mutant: prefix changed from "atom" to something else
    expect(name).toContain("atom");
    expect(name).toContain("AtomPort");
    // Kills mutant: "store.derived" or "store.async" used instead
    expect(name).not.toContain("derived");
    expect(name).not.toContain("async");
  });

  it("onDerivedRecompute span name uses derived prefix with portName", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onDerivedRecompute?.("DerivedPort", "c1");

    const name = tracer.pushSpanCalls[0]?.name;
    expect(name).toBe("store.derived.DerivedPort");
    expect(name).toContain("derived");
    expect(name).toContain("DerivedPort");
    // Kills mutant: "store.atom" or "store.async" used instead
    expect(name).not.toContain("atom");
    expect(name).not.toContain("async");
  });

  it("onAsyncDerivedFetch span name uses async prefix with portName", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onAsyncDerivedFetch?.("AsyncPort", "c1");

    const name = tracer.pushSpanCalls[0]?.name;
    expect(name).toBe("store.async.AsyncPort");
    expect(name).toContain("async");
    expect(name).toContain("AsyncPort");
    // Kills mutant: "store.atom" or "store.derived" used instead
    expect(name).not.toContain("atom");
    expect(name).not.toContain("derived");
  });

  it("span names differ for each method type given same portName", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onActionStart("Shared", "act", "c1");
    hook.onAtomUpdate?.("Shared", "c1");
    hook.onDerivedRecompute?.("Shared", "c1");
    hook.onAsyncDerivedFetch?.("Shared", "c1");

    const names = tracer.pushSpanCalls.map(c => c.name);
    expect(names[0]).toBe("store.Shared.act");
    expect(names[1]).toBe("store.atom.Shared");
    expect(names[2]).toBe("store.derived.Shared");
    expect(names[3]).toBe("store.async.Shared");

    // All four names must be distinct
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(4);
  });
});

// =============================================================================
// buildAttributes mutations
// =============================================================================

describe("buildAttributes mutations", () => {
  it("onActionStart attributes include store.action but atom/derived/async do not", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onActionStart("P", "myAction", "C");
    hook.onAtomUpdate?.("P", "C");
    hook.onDerivedRecompute?.("P", "C");
    hook.onAsyncDerivedFetch?.("P", "C");

    // Action has store.action attribute
    expect(tracer.pushSpanCalls[0]?.attributes?.["store.action"]).toBe("myAction");

    // Atom, derived, async do NOT have store.action
    expect(tracer.pushSpanCalls[1]?.attributes?.["store.action"]).toBeUndefined();
    expect(tracer.pushSpanCalls[2]?.attributes?.["store.action"]).toBeUndefined();
    expect(tracer.pushSpanCalls[3]?.attributes?.["store.action"]).toBeUndefined();
  });

  it("all methods include store.port with correct portName value", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onActionStart("ActionPort", "a", "c");
    hook.onAtomUpdate?.("AtomPort", "c");
    hook.onDerivedRecompute?.("DerivedPort", "c");
    hook.onAsyncDerivedFetch?.("AsyncPort", "c");

    expect(tracer.pushSpanCalls[0]?.attributes?.["store.port"]).toBe("ActionPort");
    expect(tracer.pushSpanCalls[1]?.attributes?.["store.port"]).toBe("AtomPort");
    expect(tracer.pushSpanCalls[2]?.attributes?.["store.port"]).toBe("DerivedPort");
    expect(tracer.pushSpanCalls[3]?.attributes?.["store.port"]).toBe("AsyncPort");
  });

  it("all methods include store.container with correct containerName value", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onActionStart("P", "a", "container-action");
    hook.onAtomUpdate?.("P", "container-atom");
    hook.onDerivedRecompute?.("P", "container-derived");
    hook.onAsyncDerivedFetch?.("P", "container-async");

    expect(tracer.pushSpanCalls[0]?.attributes?.["store.container"]).toBe("container-action");
    expect(tracer.pushSpanCalls[1]?.attributes?.["store.container"]).toBe("container-atom");
    expect(tracer.pushSpanCalls[2]?.attributes?.["store.container"]).toBe("container-derived");
    expect(tracer.pushSpanCalls[3]?.attributes?.["store.container"]).toBe("container-async");
  });

  it("scopeId is included in all methods when configured", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer, scopeId: "scope-x" });

    hook.onActionStart("P", "a", "c");
    hook.onAtomUpdate?.("P", "c");
    hook.onDerivedRecompute?.("P", "c");
    hook.onAsyncDerivedFetch?.("P", "c");

    for (const call of tracer.pushSpanCalls) {
      expect(call.attributes?.["store.scope_id"]).toBe("scope-x");
    }
  });

  it("scopeId is omitted from all methods when not configured", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onActionStart("P", "a", "c");
    hook.onAtomUpdate?.("P", "c");
    hook.onDerivedRecompute?.("P", "c");
    hook.onAsyncDerivedFetch?.("P", "c");

    for (const call of tracer.pushSpanCalls) {
      expect(call.attributes).toBeDefined();
      expect("store.scope_id" in (call.attributes ?? {})).toBe(false);
    }
  });

  it("scopeId !== undefined check: empty string scopeId is included", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer, scopeId: "" });

    hook.onActionStart("P", "a", "c");

    // Kills mutant: `if (config.scopeId)` instead of `if (config.scopeId !== undefined)`
    // Empty string is falsy but !== undefined, so it should be included
    expect(tracer.pushSpanCalls[0]?.attributes?.["store.scope_id"]).toBe("");
    expect("store.scope_id" in (tracer.pushSpanCalls[0]?.attributes ?? {})).toBe(true);
  });

  it("attribute object for action has exactly 4 keys with scopeId, 3 without", () => {
    const tracer = createMockTracer();
    const hookWithScope = createStoreTracingBridge({ tracer, scopeId: "s" });
    hookWithScope.onActionStart("P", "a", "c");
    expect(Object.keys(tracer.pushSpanCalls[0]?.attributes ?? {}).sort()).toEqual([
      "store.action",
      "store.container",
      "store.port",
      "store.scope_id",
    ]);

    const tracer2 = createMockTracer();
    const hookNoScope = createStoreTracingBridge({ tracer: tracer2 });
    hookNoScope.onActionStart("P", "a", "c");
    expect(Object.keys(tracer2.pushSpanCalls[0]?.attributes ?? {}).sort()).toEqual([
      "store.action",
      "store.container",
      "store.port",
    ]);
  });

  it("attribute object for non-action methods has exactly 3 keys with scopeId, 2 without", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer, scopeId: "s" });
    hook.onAtomUpdate?.("P", "c");
    expect(Object.keys(tracer.pushSpanCalls[0]?.attributes ?? {}).sort()).toEqual([
      "store.container",
      "store.port",
      "store.scope_id",
    ]);

    const tracer2 = createMockTracer();
    const hook2 = createStoreTracingBridge({ tracer: tracer2 });
    hook2.onAtomUpdate?.("P", "c");
    expect(Object.keys(tracer2.pushSpanCalls[0]?.attributes ?? {}).sort()).toEqual([
      "store.container",
      "store.port",
    ]);
  });
});

// =============================================================================
// shouldTrace / filter mutations
// =============================================================================

describe("shouldTrace / filter mutations", () => {
  it("filter receives the actual portName argument", () => {
    const tracer = createMockTracer();
    const filterFn = vi.fn().mockReturnValue(true);
    const hook = createStoreTracingBridge({ tracer, filter: filterFn });

    hook.onActionStart("MyPort", "act", "c");
    expect(filterFn).toHaveBeenCalledWith("MyPort");

    hook.onAtomUpdate?.("AtomX", "c");
    expect(filterFn).toHaveBeenCalledWith("AtomX");

    hook.onDerivedRecompute?.("DerivedY", "c");
    expect(filterFn).toHaveBeenCalledWith("DerivedY");

    hook.onAsyncDerivedFetch?.("AsyncZ", "c");
    expect(filterFn).toHaveBeenCalledWith("AsyncZ");
  });

  it("when filter returns false, no pushSpan is called and {} is returned", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer, filter: () => false });

    const r1 = hook.onActionStart("P", "a", "c");
    const r2 = hook.onAtomUpdate?.("P", "c");
    const r3 = hook.onDerivedRecompute?.("P", "c");
    const r4 = hook.onAsyncDerivedFetch?.("P", "c");

    expect(tracer.pushSpanCalls).toHaveLength(0);
    expect(r1).toEqual({});
    expect(r2).toEqual({});
    expect(r3).toEqual({});
    expect(r4).toEqual({});
  });

  it("when filter returns true, pushSpan IS called", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer, filter: () => true });

    hook.onActionStart("P", "a", "c");
    hook.onAtomUpdate?.("P", "c");
    hook.onDerivedRecompute?.("P", "c");
    hook.onAsyncDerivedFetch?.("P", "c");

    expect(tracer.pushSpanCalls).toHaveLength(4);
  });

  it("no filter means all ports are traced (shouldTrace returns true)", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onActionStart("AnyPort", "a", "c");
    hook.onAtomUpdate?.("AnyPort", "c");
    hook.onDerivedRecompute?.("AnyPort", "c");
    hook.onAsyncDerivedFetch?.("AnyPort", "c");

    expect(tracer.pushSpanCalls).toHaveLength(4);
  });

  it("filter skipping does NOT set _*Active flags (end methods are no-ops after filter skip)", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer, filter: () => false });

    hook.onActionStart("P", "a", "c");
    hook.onActionEnd(true);
    hook.onAtomUpdate?.("P", "c");
    hook.onAtomUpdateEnd?.(true);
    hook.onDerivedRecompute?.("P", "c");
    hook.onDerivedRecomputeEnd?.(true);
    hook.onAsyncDerivedFetch?.("P", "c");
    hook.onAsyncDerivedFetchEnd?.(true);

    // No pushSpan AND no popSpan should have been called
    expect(tracer.pushSpanCalls).toHaveLength(0);
    expect(tracer.popSpanCalls).toHaveLength(0);
  });

  it("filter is selective: only matching ports traced", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({
      tracer,
      filter: portName => portName === "Traced",
    });

    hook.onAtomUpdate?.("Traced", "c");
    hook.onAtomUpdate?.("NotTraced", "c");
    hook.onDerivedRecompute?.("Traced", "c");
    hook.onDerivedRecompute?.("NotTraced", "c");
    hook.onAsyncDerivedFetch?.("Traced", "c");
    hook.onAsyncDerivedFetch?.("NotTraced", "c");

    expect(tracer.pushSpanCalls).toHaveLength(3);
    expect(tracer.pushSpanCalls.every(c => c.name?.includes("Traced"))).toBe(true);
  });
});

// =============================================================================
// getSpanContext / ?? operator mutations
// =============================================================================

describe("getSpanContext / ?? operator mutations", () => {
  it("when getSpanContext is provided and returns context, context is returned", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({
      tracer,
      getSpanContext: () => ({ traceId: "t1", spanId: "s1" }),
    });

    const r1 = hook.onActionStart("P", "a", "c");
    const r2 = hook.onAtomUpdate?.("P", "c");
    const r3 = hook.onDerivedRecompute?.("P", "c");
    const r4 = hook.onAsyncDerivedFetch?.("P", "c");

    expect(r1).toEqual({ traceId: "t1", spanId: "s1" });
    expect(r2).toEqual({ traceId: "t1", spanId: "s1" });
    expect(r3).toEqual({ traceId: "t1", spanId: "s1" });
    expect(r4).toEqual({ traceId: "t1", spanId: "s1" });
  });

  it("when getSpanContext is NOT provided, all start methods return {}", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    const r1 = hook.onActionStart("P", "a", "c");
    const r2 = hook.onAtomUpdate?.("P", "c");
    const r3 = hook.onDerivedRecompute?.("P", "c");
    const r4 = hook.onAsyncDerivedFetch?.("P", "c");

    // Must be {} (not undefined, not null)
    expect(r1).toEqual({});
    expect(r2).toEqual({});
    expect(r3).toEqual({});
    expect(r4).toEqual({});

    // Kills mutant: return value is exactly an empty object, not undefined
    expect(r1).toBeDefined();
    expect(r2).toBeDefined();
    expect(r3).toBeDefined();
    expect(r4).toBeDefined();
  });

  it("getSpanContext is called AFTER pushSpan (ordering matters for real tracers)", () => {
    const callOrder: string[] = [];
    const tracer: StoreTracerLike = {
      pushSpan() {
        callOrder.push("pushSpan");
      },
      popSpan() {
        callOrder.push("popSpan");
      },
    };
    const hook = createStoreTracingBridge({
      tracer,
      getSpanContext: () => {
        callOrder.push("getSpanContext");
        return { traceId: "t" };
      },
    });

    hook.onActionStart("P", "a", "c");
    expect(callOrder).toEqual(["pushSpan", "getSpanContext"]);

    callOrder.length = 0;
    hook.onAtomUpdate?.("P", "c");
    expect(callOrder).toEqual(["pushSpan", "getSpanContext"]);

    callOrder.length = 0;
    hook.onDerivedRecompute?.("P", "c");
    expect(callOrder).toEqual(["pushSpan", "getSpanContext"]);

    callOrder.length = 0;
    hook.onAsyncDerivedFetch?.("P", "c");
    expect(callOrder).toEqual(["pushSpan", "getSpanContext"]);
  });

  it("getSpanContext returning empty object yields empty object (not confused with no-context)", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({
      tracer,
      getSpanContext: () => ({}),
    });

    const result = hook.onActionStart("P", "a", "c");
    expect(result).toEqual({});
    // Even though result is {}, pushSpan was still called (context is separate from tracing)
    expect(tracer.pushSpanCalls).toHaveLength(1);
  });
});

// =============================================================================
// _active guard mutations for onActionEnd
// =============================================================================

describe("_active guard mutations for onActionEnd", () => {
  it("onActionEnd without prior start is a no-op", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onActionEnd(true);
    hook.onActionEnd(false);

    expect(tracer.popSpanCalls).toHaveLength(0);
  });

  it("onActionEnd called twice after one start only pops once", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onActionStart("P", "a", "c");
    hook.onActionEnd(true);
    hook.onActionEnd(false);

    // Kills mutant: _active = false removed (would allow second popSpan)
    expect(tracer.popSpanCalls).toHaveLength(1);
    expect(tracer.popSpanCalls[0]?.status).toBe("ok");
  });

  it("after start-end cycle, a new start-end cycle works", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onActionStart("P", "a", "c");
    hook.onActionEnd(true);

    hook.onActionStart("P", "b", "c");
    hook.onActionEnd(false);

    expect(tracer.popSpanCalls).toHaveLength(2);
    expect(tracer.popSpanCalls[0]?.status).toBe("ok");
    expect(tracer.popSpanCalls[1]?.status).toBe("error");
  });
});

// =============================================================================
// _atomActive guard mutations for onAtomUpdateEnd
// =============================================================================

describe("_atomActive guard mutations for onAtomUpdateEnd", () => {
  it("onAtomUpdateEnd without prior start is a no-op", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onAtomUpdateEnd?.(true);
    hook.onAtomUpdateEnd?.(false);

    expect(tracer.popSpanCalls).toHaveLength(0);
  });

  it("onAtomUpdateEnd called twice after one start only pops once", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onAtomUpdate?.("P", "c");
    hook.onAtomUpdateEnd?.(true);
    hook.onAtomUpdateEnd?.(false);

    expect(tracer.popSpanCalls).toHaveLength(1);
    expect(tracer.popSpanCalls[0]?.status).toBe("ok");
  });

  it("after atom start-end cycle, a new cycle works", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onAtomUpdate?.("P", "c");
    hook.onAtomUpdateEnd?.(true);

    hook.onAtomUpdate?.("P", "c");
    hook.onAtomUpdateEnd?.(false);

    expect(tracer.popSpanCalls).toHaveLength(2);
    expect(tracer.popSpanCalls[0]?.status).toBe("ok");
    expect(tracer.popSpanCalls[1]?.status).toBe("error");
  });
});

// =============================================================================
// _derivedActive guard mutations for onDerivedRecomputeEnd
// =============================================================================

describe("_derivedActive guard mutations for onDerivedRecomputeEnd", () => {
  it("onDerivedRecomputeEnd without prior start is a no-op", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onDerivedRecomputeEnd?.(true);
    hook.onDerivedRecomputeEnd?.(false);

    expect(tracer.popSpanCalls).toHaveLength(0);
  });

  it("onDerivedRecomputeEnd called twice after one start only pops once", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onDerivedRecompute?.("P", "c");
    hook.onDerivedRecomputeEnd?.(true);
    hook.onDerivedRecomputeEnd?.(false);

    expect(tracer.popSpanCalls).toHaveLength(1);
    expect(tracer.popSpanCalls[0]?.status).toBe("ok");
  });

  it("after derived start-end cycle, a new cycle works", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onDerivedRecompute?.("P", "c");
    hook.onDerivedRecomputeEnd?.(true);

    hook.onDerivedRecompute?.("P", "c");
    hook.onDerivedRecomputeEnd?.(false);

    expect(tracer.popSpanCalls).toHaveLength(2);
    expect(tracer.popSpanCalls[0]?.status).toBe("ok");
    expect(tracer.popSpanCalls[1]?.status).toBe("error");
  });
});

// =============================================================================
// _asyncActive guard mutations for onAsyncDerivedFetchEnd
// =============================================================================

describe("_asyncActive guard mutations for onAsyncDerivedFetchEnd", () => {
  it("onAsyncDerivedFetchEnd without prior start is a no-op", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onAsyncDerivedFetchEnd?.(true);
    hook.onAsyncDerivedFetchEnd?.(false);

    expect(tracer.popSpanCalls).toHaveLength(0);
  });

  it("onAsyncDerivedFetchEnd called twice after one start only pops once", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onAsyncDerivedFetch?.("P", "c");
    hook.onAsyncDerivedFetchEnd?.(true);
    hook.onAsyncDerivedFetchEnd?.(false);

    expect(tracer.popSpanCalls).toHaveLength(1);
    expect(tracer.popSpanCalls[0]?.status).toBe("ok");
  });

  it("after async start-end cycle, a new cycle works", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onAsyncDerivedFetch?.("P", "c");
    hook.onAsyncDerivedFetchEnd?.(true);

    hook.onAsyncDerivedFetch?.("P", "c");
    hook.onAsyncDerivedFetchEnd?.(false);

    expect(tracer.popSpanCalls).toHaveLength(2);
    expect(tracer.popSpanCalls[0]?.status).toBe("ok");
    expect(tracer.popSpanCalls[1]?.status).toBe("error");
  });
});

// =============================================================================
// ok ? "ok" : "error" ternary mutations
// =============================================================================

describe("ok ? 'ok' : 'error' ternary mutations", () => {
  it("onActionEnd(true) produces 'ok', onActionEnd(false) produces 'error'", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onActionStart("P", "a", "c");
    hook.onActionEnd(true);

    hook.onActionStart("P", "a", "c");
    hook.onActionEnd(false);

    expect(tracer.popSpanCalls[0]?.status).toBe("ok");
    expect(tracer.popSpanCalls[1]?.status).toBe("error");
    // Kills mutant: ternary inverted or always returns same value
    expect(tracer.popSpanCalls[0]?.status).not.toBe("error");
    expect(tracer.popSpanCalls[1]?.status).not.toBe("ok");
  });

  it("onAtomUpdateEnd(true) produces 'ok', onAtomUpdateEnd(false) produces 'error'", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onAtomUpdate?.("P", "c");
    hook.onAtomUpdateEnd?.(true);

    hook.onAtomUpdate?.("P", "c");
    hook.onAtomUpdateEnd?.(false);

    expect(tracer.popSpanCalls[0]?.status).toBe("ok");
    expect(tracer.popSpanCalls[1]?.status).toBe("error");
  });

  it("onDerivedRecomputeEnd(true) produces 'ok', onDerivedRecomputeEnd(false) produces 'error'", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onDerivedRecompute?.("P", "c");
    hook.onDerivedRecomputeEnd?.(true);

    hook.onDerivedRecompute?.("P", "c");
    hook.onDerivedRecomputeEnd?.(false);

    expect(tracer.popSpanCalls[0]?.status).toBe("ok");
    expect(tracer.popSpanCalls[1]?.status).toBe("error");
  });

  it("onAsyncDerivedFetchEnd(true) produces 'ok', onAsyncDerivedFetchEnd(false) produces 'error'", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onAsyncDerivedFetch?.("P", "c");
    hook.onAsyncDerivedFetchEnd?.(true);

    hook.onAsyncDerivedFetch?.("P", "c");
    hook.onAsyncDerivedFetchEnd?.(false);

    expect(tracer.popSpanCalls[0]?.status).toBe("ok");
    expect(tracer.popSpanCalls[1]?.status).toBe("error");
  });
});

// =============================================================================
// Cross-guard independence mutations
// =============================================================================

describe("cross-guard independence mutations", () => {
  it("ending action does not end atom", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onAtomUpdate?.("P", "c");
    hook.onActionEnd(true); // action was never started, should be no-op

    expect(tracer.popSpanCalls).toHaveLength(0);

    hook.onAtomUpdateEnd?.(true);
    expect(tracer.popSpanCalls).toHaveLength(1);
  });

  it("ending atom does not end derived", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onDerivedRecompute?.("P", "c");
    hook.onAtomUpdateEnd?.(true); // atom was never started, should be no-op

    expect(tracer.popSpanCalls).toHaveLength(0);

    hook.onDerivedRecomputeEnd?.(true);
    expect(tracer.popSpanCalls).toHaveLength(1);
  });

  it("ending derived does not end async", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onAsyncDerivedFetch?.("P", "c");
    hook.onDerivedRecomputeEnd?.(true); // derived was never started, should be no-op

    expect(tracer.popSpanCalls).toHaveLength(0);

    hook.onAsyncDerivedFetchEnd?.(true);
    expect(tracer.popSpanCalls).toHaveLength(1);
  });

  it("ending async does not end action", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onActionStart("P", "a", "c");
    hook.onAsyncDerivedFetchEnd?.(true); // async was never started, should be no-op

    expect(tracer.popSpanCalls).toHaveLength(0);

    hook.onActionEnd(true);
    expect(tracer.popSpanCalls).toHaveLength(1);
  });

  it("all four active flags are independent", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    // Start all four
    hook.onActionStart("P", "a", "c");
    hook.onAtomUpdate?.("P", "c");
    hook.onDerivedRecompute?.("P", "c");
    hook.onAsyncDerivedFetch?.("P", "c");
    expect(tracer.pushSpanCalls).toHaveLength(4);

    // End only action
    hook.onActionEnd(true);
    expect(tracer.popSpanCalls).toHaveLength(1);

    // Trying to end action again: no-op
    hook.onActionEnd(false);
    expect(tracer.popSpanCalls).toHaveLength(1);

    // Other three still active
    hook.onAtomUpdateEnd?.(false);
    expect(tracer.popSpanCalls).toHaveLength(2);
    expect(tracer.popSpanCalls[1]?.status).toBe("error");

    hook.onDerivedRecomputeEnd?.(true);
    expect(tracer.popSpanCalls).toHaveLength(3);
    expect(tracer.popSpanCalls[2]?.status).toBe("ok");

    hook.onAsyncDerivedFetchEnd?.(false);
    expect(tracer.popSpanCalls).toHaveLength(4);
    expect(tracer.popSpanCalls[3]?.status).toBe("error");

    // All ended, all re-ends are no-ops
    hook.onActionEnd(true);
    hook.onAtomUpdateEnd?.(true);
    hook.onDerivedRecomputeEnd?.(true);
    hook.onAsyncDerivedFetchEnd?.(true);
    expect(tracer.popSpanCalls).toHaveLength(4);
  });
});

// =============================================================================
// Return value mutations for filtered-out calls
// =============================================================================

describe("return value mutations for filtered-out calls", () => {
  it("filtered onActionStart returns {} not undefined", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer, filter: () => false });

    const result = hook.onActionStart("P", "a", "c");

    expect(result).not.toBeUndefined();
    expect(result).not.toBeNull();
    expect(typeof result).toBe("object");
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("filtered onAtomUpdate returns {} not undefined", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer, filter: () => false });

    const result = hook.onAtomUpdate?.("P", "c");

    expect(result).not.toBeUndefined();
    expect(result).not.toBeNull();
    expect(typeof result).toBe("object");
    expect(Object.keys(result ?? {})).toHaveLength(0);
  });

  it("filtered onDerivedRecompute returns {} not undefined", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer, filter: () => false });

    const result = hook.onDerivedRecompute?.("P", "c");

    expect(result).not.toBeUndefined();
    expect(result).not.toBeNull();
    expect(typeof result).toBe("object");
    expect(Object.keys(result ?? {})).toHaveLength(0);
  });

  it("filtered onAsyncDerivedFetch returns {} not undefined", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer, filter: () => false });

    const result = hook.onAsyncDerivedFetch?.("P", "c");

    expect(result).not.toBeUndefined();
    expect(result).not.toBeNull();
    expect(typeof result).toBe("object");
    expect(Object.keys(result ?? {})).toHaveLength(0);
  });
});

// =============================================================================
// _*Active = true assignment removal mutations
// =============================================================================

describe("_*Active = true assignment removal mutations", () => {
  it("removing _active = true means onActionEnd never calls popSpan", () => {
    // This test validates that _active is set to true during onActionStart.
    // If the `_active = true` assignment is removed (mutant), then
    // onActionEnd will not call popSpan.
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onActionStart("P", "a", "c");
    hook.onActionEnd(true);

    // This catches the mutant: if _active = true is removed, popSpan won't be called
    expect(tracer.popSpanCalls).toHaveLength(1);
  });

  it("removing _atomActive = true means onAtomUpdateEnd never calls popSpan", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onAtomUpdate?.("P", "c");
    hook.onAtomUpdateEnd?.(true);

    expect(tracer.popSpanCalls).toHaveLength(1);
  });

  it("removing _derivedActive = true means onDerivedRecomputeEnd never calls popSpan", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onDerivedRecompute?.("P", "c");
    hook.onDerivedRecomputeEnd?.(true);

    expect(tracer.popSpanCalls).toHaveLength(1);
  });

  it("removing _asyncActive = true means onAsyncDerivedFetchEnd never calls popSpan", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onAsyncDerivedFetch?.("P", "c");
    hook.onAsyncDerivedFetchEnd?.(true);

    expect(tracer.popSpanCalls).toHaveLength(1);
  });
});

// =============================================================================
// Negation mutations in shouldTrace
// =============================================================================

describe("negation mutations in shouldTrace", () => {
  it("!config.filter mutated to config.filter: no filter means trace everything", () => {
    // If `!config.filter` is mutated to `config.filter`, then when there IS no filter,
    // config.filter is undefined (falsy), so shouldTrace would return false,
    // and nothing would be traced. This test catches that mutant.
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onActionStart("P", "a", "c");
    expect(tracer.pushSpanCalls).toHaveLength(1);
  });

  it("|| mutated to &&: with no filter, should still trace", () => {
    // If `||` is mutated to `&&` in `!config.filter || config.filter(portName)`:
    // !undefined && undefined(portName) → true && throws TypeError
    // This test catches that mutant by verifying no filter still works.
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onAtomUpdate?.("SomePort", "c");
    expect(tracer.pushSpanCalls).toHaveLength(1);
  });
});

// =============================================================================
// Comprehensive attribute correctness (port vs container not swapped)
// =============================================================================

describe("attribute correctness — port vs container not swapped", () => {
  it("portName goes to store.port and containerName goes to store.container in onAtomUpdate", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onAtomUpdate?.("thePort", "theContainer");

    const attrs = tracer.pushSpanCalls[0]?.attributes;
    expect(attrs?.["store.port"]).toBe("thePort");
    expect(attrs?.["store.container"]).toBe("theContainer");
    // Kills mutant: port and container swapped
    expect(attrs?.["store.port"]).not.toBe("theContainer");
    expect(attrs?.["store.container"]).not.toBe("thePort");
  });

  it("portName goes to store.port and containerName goes to store.container in onDerivedRecompute", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onDerivedRecompute?.("derivedPort", "derivedContainer");

    const attrs = tracer.pushSpanCalls[0]?.attributes;
    expect(attrs?.["store.port"]).toBe("derivedPort");
    expect(attrs?.["store.container"]).toBe("derivedContainer");
    expect(attrs?.["store.port"]).not.toBe("derivedContainer");
    expect(attrs?.["store.container"]).not.toBe("derivedPort");
  });

  it("portName goes to store.port and containerName goes to store.container in onAsyncDerivedFetch", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onAsyncDerivedFetch?.("asyncPort", "asyncContainer");

    const attrs = tracer.pushSpanCalls[0]?.attributes;
    expect(attrs?.["store.port"]).toBe("asyncPort");
    expect(attrs?.["store.container"]).toBe("asyncContainer");
    expect(attrs?.["store.port"]).not.toBe("asyncContainer");
    expect(attrs?.["store.container"]).not.toBe("asyncPort");
  });

  it("portName goes to store.port and containerName goes to store.container in onActionStart", () => {
    const tracer = createMockTracer();
    const hook = createStoreTracingBridge({ tracer });

    hook.onActionStart("actionPort", "actionAction", "actionContainer");

    const attrs = tracer.pushSpanCalls[0]?.attributes;
    expect(attrs?.["store.port"]).toBe("actionPort");
    expect(attrs?.["store.container"]).toBe("actionContainer");
    expect(attrs?.["store.action"]).toBe("actionAction");
    // Kills mutant: action and port swapped, or action and container swapped
    expect(attrs?.["store.port"]).not.toBe("actionContainer");
    expect(attrs?.["store.port"]).not.toBe("actionAction");
    expect(attrs?.["store.container"]).not.toBe("actionPort");
    expect(attrs?.["store.container"]).not.toBe("actionAction");
    expect(attrs?.["store.action"]).not.toBe("actionPort");
    expect(attrs?.["store.action"]).not.toBe("actionContainer");
  });
});
