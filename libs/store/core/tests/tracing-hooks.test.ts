/**
 * Tracing hooks integration tests for Atom, Derived, and AsyncDerived services.
 */

import { describe, it, expect, vi } from "vitest";
import { createAtomServiceImpl } from "../src/services/atom-service-impl.js";
import { createDerivedServiceImpl } from "../src/services/derived-service-impl.js";
import { createAsyncDerivedServiceImpl } from "../src/services/async-derived-service-impl.js";
import type { StoreTracingHook, StoreSpanContext } from "../src/integration/tracing-bridge.js";
import { ResultAsync } from "@hex-di/result";

function createMockTracingHook(): StoreTracingHook & {
  calls: Array<{ method: string; args: unknown[] }>;
} {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const ctx: StoreSpanContext = { traceId: "test-trace", spanId: "test-span" };

  return {
    calls,
    onActionStart(portName: string, actionName: string, containerName: string): StoreSpanContext {
      calls.push({ method: "onActionStart", args: [portName, actionName, containerName] });
      return ctx;
    },
    onActionEnd(ok: boolean): void {
      calls.push({ method: "onActionEnd", args: [ok] });
    },
    onAtomUpdate(portName: string, containerName: string): StoreSpanContext {
      calls.push({ method: "onAtomUpdate", args: [portName, containerName] });
      return ctx;
    },
    onAtomUpdateEnd(ok: boolean): void {
      calls.push({ method: "onAtomUpdateEnd", args: [ok] });
    },
    onDerivedRecompute(portName: string, containerName: string): StoreSpanContext {
      calls.push({ method: "onDerivedRecompute", args: [portName, containerName] });
      return ctx;
    },
    onDerivedRecomputeEnd(ok: boolean): void {
      calls.push({ method: "onDerivedRecomputeEnd", args: [ok] });
    },
    onAsyncDerivedFetch(portName: string, containerName: string): StoreSpanContext {
      calls.push({ method: "onAsyncDerivedFetch", args: [portName, containerName] });
      return ctx;
    },
    onAsyncDerivedFetchEnd(ok: boolean): void {
      calls.push({ method: "onAsyncDerivedFetchEnd", args: [ok] });
    },
  };
}

function createThrowingTracingHook(): StoreTracingHook {
  return {
    onActionStart(): StoreSpanContext {
      throw new Error("hook boom");
    },
    onActionEnd(): void {
      throw new Error("hook boom");
    },
    onAtomUpdate(): StoreSpanContext {
      throw new Error("hook boom");
    },
    onAtomUpdateEnd(): void {
      throw new Error("hook boom");
    },
    onDerivedRecompute(): StoreSpanContext {
      throw new Error("hook boom");
    },
    onDerivedRecomputeEnd(): void {
      throw new Error("hook boom");
    },
    onAsyncDerivedFetch(): StoreSpanContext {
      throw new Error("hook boom");
    },
    onAsyncDerivedFetchEnd(): void {
      throw new Error("hook boom");
    },
  };
}

// =============================================================================
// AtomService tracing
// =============================================================================

describe("AtomService tracing hooks", () => {
  it("calls onAtomUpdate and onAtomUpdateEnd on set()", () => {
    const hook = createMockTracingHook();
    const atom = createAtomServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: 0,
      tracingHook: hook,
    });

    atom.set(42);

    const tracingCalls = hook.calls.filter(
      c => c.method === "onAtomUpdate" || c.method === "onAtomUpdateEnd"
    );
    expect(tracingCalls).toHaveLength(2);
    expect(tracingCalls[0]).toEqual({
      method: "onAtomUpdate",
      args: ["Counter", "root"],
    });
    expect(tracingCalls[1]).toEqual({
      method: "onAtomUpdateEnd",
      args: [true],
    });
  });

  it("calls onAtomUpdate and onAtomUpdateEnd on update()", () => {
    const hook = createMockTracingHook();
    const atom = createAtomServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: 10,
      tracingHook: hook,
    });

    atom.update(v => v + 5);

    const tracingCalls = hook.calls.filter(
      c => c.method === "onAtomUpdate" || c.method === "onAtomUpdateEnd"
    );
    expect(tracingCalls).toHaveLength(2);
    expect(tracingCalls[0]).toEqual({
      method: "onAtomUpdate",
      args: ["Counter", "root"],
    });
    expect(tracingCalls[1]).toEqual({
      method: "onAtomUpdateEnd",
      args: [true],
    });
    expect(atom.value).toBe(15);
  });

  it("does not crash when tracing hook throws on set()", () => {
    const hook = createThrowingTracingHook();
    const atom = createAtomServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: 0,
      tracingHook: hook,
    });

    atom.set(99);
    expect(atom.value).toBe(99);
  });

  it("does not crash when tracing hook throws on update()", () => {
    const hook = createThrowingTracingHook();
    const atom = createAtomServiceImpl({
      portName: "Counter",
      containerName: "root",
      initial: 5,
      tracingHook: hook,
    });

    atom.update(v => v * 2);
    expect(atom.value).toBe(10);
  });
});

// =============================================================================
// DerivedService tracing
// =============================================================================

describe("DerivedService tracing hooks", () => {
  it("calls onDerivedRecompute and onDerivedRecomputeEnd on recomputation", () => {
    const hook = createMockTracingHook();
    const sourceValue = 10;
    const derived = createDerivedServiceImpl({
      portName: "DoubleCounter",
      containerName: "root",
      select: () => sourceValue * 2,
      tracingHook: hook,
    });

    // Access value triggers computation
    const val = derived.value;
    expect(val).toBe(20);

    const tracingCalls = hook.calls.filter(
      c => c.method === "onDerivedRecompute" || c.method === "onDerivedRecomputeEnd"
    );
    expect(tracingCalls.length).toBeGreaterThanOrEqual(2);
    expect(tracingCalls[0]).toEqual({
      method: "onDerivedRecompute",
      args: ["DoubleCounter", "root"],
    });
    expect(tracingCalls[1]).toEqual({
      method: "onDerivedRecomputeEnd",
      args: [true],
    });
  });

  it("calls onDerivedRecomputeEnd with false when select throws", () => {
    const hook = createMockTracingHook();
    const derived = createDerivedServiceImpl({
      portName: "Broken",
      containerName: "root",
      select: () => {
        throw new Error("select boom");
      },
      tracingHook: hook,
    });

    expect(() => derived.value).toThrow();

    const endCalls = hook.calls.filter(c => c.method === "onDerivedRecomputeEnd");
    expect(endCalls.length).toBeGreaterThanOrEqual(1);
    expect(endCalls[0]).toEqual({
      method: "onDerivedRecomputeEnd",
      args: [false],
    });
  });

  it("does not crash when tracing hook throws", () => {
    const hook = createThrowingTracingHook();
    const sourceValue = 42;
    const derived = createDerivedServiceImpl({
      portName: "Safe",
      containerName: "root",
      select: () => sourceValue,
      tracingHook: hook,
    });

    expect(derived.value).toBe(42);
  });
});

// =============================================================================
// AsyncDerivedService tracing
// =============================================================================

describe("AsyncDerivedService tracing hooks", () => {
  it("calls onAsyncDerivedFetch and onAsyncDerivedFetchEnd on successful fetch", async () => {
    const hook = createMockTracingHook();
    const svc = createAsyncDerivedServiceImpl<string, Error>({
      portName: "UserData",
      containerName: "root",
      select: () =>
        ResultAsync.fromPromise(Promise.resolve("hello"), e =>
          e instanceof Error ? e : new Error(String(e))
        ),
      tracingHook: hook,
    });

    svc.refresh();

    // Let the async fetch complete
    await vi.waitFor(() => {
      expect(svc.snapshot.status).toBe("success");
    });

    const fetchCalls = hook.calls.filter(
      c => c.method === "onAsyncDerivedFetch" || c.method === "onAsyncDerivedFetchEnd"
    );
    expect(fetchCalls.length).toBeGreaterThanOrEqual(2);
    expect(fetchCalls[0]).toEqual({
      method: "onAsyncDerivedFetch",
      args: ["UserData", "root"],
    });

    const endCall = fetchCalls.find(c => c.method === "onAsyncDerivedFetchEnd");
    expect(endCall).toEqual({
      method: "onAsyncDerivedFetchEnd",
      args: [true],
    });
  });

  it("calls onAsyncDerivedFetchEnd(false) on failed fetch", async () => {
    const hook = createMockTracingHook();
    const svc = createAsyncDerivedServiceImpl<string, Error>({
      portName: "UserData",
      containerName: "root",
      select: () =>
        ResultAsync.fromPromise(Promise.reject(new Error("network error")), e =>
          e instanceof Error ? e : new Error(String(e))
        ),
      tracingHook: hook,
    });

    svc.refresh();

    await vi.waitFor(() => {
      expect(svc.snapshot.status).toBe("error");
    });

    const endCalls = hook.calls.filter(c => c.method === "onAsyncDerivedFetchEnd");
    expect(endCalls.length).toBeGreaterThanOrEqual(1);
    expect(endCalls[endCalls.length - 1]).toEqual({
      method: "onAsyncDerivedFetchEnd",
      args: [false],
    });
  });

  it("does not crash when tracing hook throws", async () => {
    const hook = createThrowingTracingHook();
    const svc = createAsyncDerivedServiceImpl<string, Error>({
      portName: "UserData",
      containerName: "root",
      select: () =>
        ResultAsync.fromPromise(Promise.resolve("data"), e =>
          e instanceof Error ? e : new Error(String(e))
        ),
      tracingHook: hook,
    });

    svc.refresh();

    await vi.waitFor(() => {
      expect(svc.snapshot.status).toBe("success");
    });

    expect(svc.snapshot.data).toBe("data");
  });
});
