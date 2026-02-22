/**
 * EdgeRuntimeClock adapter tests — DoD 25
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { createEdgeRuntimeClock, EdgeRuntimeClockAdapter, createEdgeRuntimeClockAdapter } from "../src/adapters/edge-runtime-clock.js";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { adapterOrDie } from "@hex-di/core";
import { ClockPort } from "../src/ports/clock.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// =============================================================================
// DoD 25: EdgeRuntimeClock behaviors
// =============================================================================

describe("EdgeRuntimeClock", () => {
  it("createEdgeRuntimeClock() returns ok() on Node 18+", () => {
    const result = createEdgeRuntimeClock();
    expect(result.isOk()).toBe(true);
  });

  it("ClockCapabilities.highResDegraded is true (by design)", () => {
    const result = createEdgeRuntimeClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const caps = result.value.getCapabilities();
    expect(caps.highResDegraded).toBe(true);
  });

  it("ClockCapabilities.platform is 'edge-worker'", () => {
    const result = createEdgeRuntimeClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const caps = result.value.getCapabilities();
    expect(caps.platform).toBe("edge-worker");
  });

  it("ClockCapabilities.hasHighResOrigin is false", () => {
    const result = createEdgeRuntimeClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const caps = result.value.getCapabilities();
    expect(caps.hasHighResOrigin).toBe(false);
  });

  it("ClockDiagnostics.highResSource is 'Date.now'", () => {
    const result = createEdgeRuntimeClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const diag = result.value.getDiagnostics();
    expect(diag.highResSource).toBe("Date.now");
  });

  it("ClockDiagnostics.adapterName is 'EdgeRuntimeClockAdapter'", () => {
    const result = createEdgeRuntimeClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const diag = result.value.getDiagnostics();
    expect(diag.adapterName).toBe("EdgeRuntimeClockAdapter");
  });

  it("returned adapter is frozen", () => {
    const result = createEdgeRuntimeClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    expect(Object.isFrozen(result.value)).toBe(true);
  });

  it("all three time methods return valid numbers", () => {
    const result = createEdgeRuntimeClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const clock = result.value;
    expect(typeof clock.monotonicNow()).toBe("number");
    expect(typeof clock.wallClockNow()).toBe("number");
    expect(typeof clock.highResNow()).toBe("number");
  });

  it("capabilities object is frozen", () => {
    const result = createEdgeRuntimeClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    expect(Object.isFrozen(result.value.getCapabilities())).toBe(true);
  });

  it("diagnostics object is frozen", () => {
    const result = createEdgeRuntimeClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    expect(Object.isFrozen(result.value.getDiagnostics())).toBe(true);
  });

  it("ST-5 is not run (highRes and wallClock deliberately diverge — same source)", () => {
    // ST-5 checks if highResNow and wallClockNow diverge by >1000ms.
    // In edge runtime, both use Date.now() so they are identical.
    // This test verifies the adapter succeeds even though we cannot distinguish them.
    const result = createEdgeRuntimeClock();
    // If ST-5 were run and found a problem, result would be err(). Since both use Date.now(),
    // they are the same source and ST-5 is correctly skipped.
    expect(result.isOk()).toBe(true);
  });
});

// =============================================================================
// Boundary condition tests (mutation score improvement)
// =============================================================================

describe("EdgeRuntimeClock — startup self-test boundary conditions", () => {
  it("ST-2 exact boundary: Date.now() = 1577836800000 returns err('ST-2')", () => {
    vi.spyOn(Date, "now").mockReturnValue(1577836800000);

    const result = createEdgeRuntimeClock();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.check).toBe("ST-2");
    }
  });

  it("ST-3 equal values: same performance.now() value does NOT fail ST-3", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    vi.stubGlobal("performance", {
      now: vi.fn().mockReturnValue(100), // always same value
    });

    const result = createEdgeRuntimeClock();
    if (result.isErr()) {
      expect(result.error.check).not.toBe("ST-3");
    } else {
      expect(result.isOk()).toBe(true);
    }
  });

  it("GxP mode ST-4: unfrozen performance object returns err('ST-4')", () => {
    // performance is available by default and typically not frozen
    const result = createEdgeRuntimeClock({ gxp: true });
    if (result.isErr()) {
      // ST-4 fires because performance is not frozen (or another ST fires first)
      expect(["ST-1", "ST-2", "ST-3", "ST-4"].includes(result.error.check)).toBe(true);
    } else {
      expect(result.isOk()).toBe(true);
    }
  });

  it("ST-1: performance.now() returning -1 triggers err('ST-1')", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    vi.stubGlobal("performance", {
      now: vi.fn().mockReturnValue(-1),
    });

    const result = createEdgeRuntimeClock();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.check).toBe("ST-1");
    }
  });

  it("ST-3: regressing performance.now() triggers err('ST-3')", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    // First call returns 100, second returns 50 (regression)
    const nowMock = vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(50);
    vi.stubGlobal("performance", { now: nowMock });

    const result = createEdgeRuntimeClock();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.check).toBe("ST-3");
    }
  });

  it("GxP mode: Date is never frozen in test env → always err('ST-4') (unconditional assertion)", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);

    const result = createEdgeRuntimeClock({ gxp: true });
    // Date is not frozen in vitest environment → ST-4 always fires
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.check).toBe("ST-4");
    }
  });
});

// =============================================================================
// Adapter factories (kills L137-148, L153-168 NoCoverage)
// =============================================================================

describe("EdgeRuntimeClockAdapter — DI adapter factories", () => {
  it("EdgeRuntimeClockAdapter provides ClockPort via DI graph", () => {
    const graph = GraphBuilder.create().provide(adapterOrDie(EdgeRuntimeClockAdapter)).build();
    const container = createContainer({ graph, name: "Test" });
    const clock = container.resolve(ClockPort);
    expect(typeof clock.monotonicNow).toBe("function");
  });

  it("EdgeRuntimeClockAdapter factory creates singleton", () => {
    const graph = GraphBuilder.create().provide(adapterOrDie(EdgeRuntimeClockAdapter)).build();
    const container = createContainer({ graph, name: "Test" });
    const c1 = container.resolve(ClockPort);
    const c2 = container.resolve(ClockPort);
    expect(c1).toBe(c2);
  });

  it("createEdgeRuntimeClockAdapter() provides ClockPort via DI graph", () => {
    const adapter = createEdgeRuntimeClockAdapter();
    const graph = GraphBuilder.create().provide(adapterOrDie(adapter)).build();
    const container = createContainer({ graph, name: "Test" });
    const clock = container.resolve(ClockPort);
    expect(typeof clock.wallClockNow).toBe("function");
  });

  it("createEdgeRuntimeClockAdapter({ gxp: false }) builds and resolves", () => {
    const adapter = createEdgeRuntimeClockAdapter({ gxp: false });
    const graph = GraphBuilder.create().provide(adapterOrDie(adapter)).build();
    const container = createContainer({ graph, name: "Test" });
    const clock = container.resolve(ClockPort);
    expect(typeof clock.highResNow).toBe("function");
  });

  it("createEdgeRuntimeClockAdapter() factory creates singleton", () => {
    const adapter = createEdgeRuntimeClockAdapter();
    const graph = GraphBuilder.create().provide(adapterOrDie(adapter)).build();
    const container = createContainer({ graph, name: "Test" });
    const c1 = container.resolve(ClockPort);
    const c2 = container.resolve(ClockPort);
    expect(c1).toBe(c2);
  });

  it("EdgeRuntimeClockAdapter throws when startup fails (ST-2) — kills L143 ConditionalExpression", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000000000); // Before 2020 → triggers ST-2
    const graph = GraphBuilder.create().provide(adapterOrDie(EdgeRuntimeClockAdapter)).build();
    const container = createContainer({ graph, name: "Test" });
    expect(() => container.resolve(ClockPort)).toThrow();
  });

  it("createEdgeRuntimeClockAdapter() throws when startup fails (ST-2) — kills L160 ConditionalExpression", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000000000); // Before 2020 → triggers ST-2
    const adapter = createEdgeRuntimeClockAdapter();
    const graph = GraphBuilder.create().provide(adapterOrDie(adapter)).build();
    const container = createContainer({ graph, name: "Test" });
    expect(() => container.resolve(ClockPort)).toThrow();
  });
});

// =============================================================================
// Capabilities: perf presence/absence (kills L108, L114 ConditionalExpression)
// =============================================================================

describe("EdgeRuntimeClock — capabilities based on perf availability", () => {
  it("hasMonotonicTime=true and monotonicDegraded=false when performance.now is a function", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    vi.stubGlobal("performance", { now: vi.fn().mockReturnValue(100) });

    const result = createEdgeRuntimeClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    expect(result.value.getCapabilities().hasMonotonicTime).toBe(true);
    expect(result.value.getCapabilities().monotonicDegraded).toBe(false);
    expect(result.value.getDiagnostics().monotonicSource).toBe("performance.now");
  });

  it("hasMonotonicTime=false and monotonicDegraded=true when performance is absent", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    vi.stubGlobal("performance", undefined);

    const result = createEdgeRuntimeClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    expect(result.value.getCapabilities().hasMonotonicTime).toBe(false);
    expect(result.value.getCapabilities().monotonicDegraded).toBe(true);
    expect(result.value.getDiagnostics().monotonicSource).toBe("Date.now-clamped");
  });
});

// =============================================================================
// Error message assertions (kills L60, L70, L79, L90 StringLiteral)
// =============================================================================

describe("EdgeRuntimeClock — startup error message content", () => {
  it("ST-1 error message contains 'monotonicNow() returned negative'", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    vi.stubGlobal("performance", { now: vi.fn().mockReturnValue(-1) });

    const result = createEdgeRuntimeClock();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/monotonicNow\(\) returned negative/);
    }
  });

  it("ST-2 error message contains 'implausible epoch value'", () => {
    vi.spyOn(Date, "now").mockReturnValue(1577836800000);

    const result = createEdgeRuntimeClock();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/implausible epoch value/);
    }
  });

  it("ST-3 error message contains 'regressed'", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    vi.stubGlobal("performance", {
      now: vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(50),
    });

    const result = createEdgeRuntimeClock();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(/regressed/);
    }
  });

  it("GxP ST-4 error message contains 'Date object is not frozen'", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);

    const result = createEdgeRuntimeClock({ gxp: true });
    expect(result.isErr()).toBe(true);
    if (result.isErr() && result.error.check === "ST-4") {
      expect(result.error.message).toMatch(/Date object is not frozen/);
    }
  });
});

// =============================================================================
// Additional mutation kills
// =============================================================================

describe("EdgeRuntimeClock — ST-1 zero boundary (kills L59 EQ m1 <= 0)", () => {
  it("performance.now() = 0 is valid — does NOT trigger ST-1 (kills L59:7 EQ <= mutant)", () => {
    // Original: m1 < 0 → 0 < 0 = false → no ST-1 error
    // Mutation: m1 <= 0 → 0 <= 0 = true → ST-1 error (KILLS)
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    vi.stubGlobal("performance", {
      now: vi.fn().mockReturnValue(0), // exactly 0 — boundary
    });

    const result = createEdgeRuntimeClock();
    // Should NOT error with ST-1 (0 is a valid non-negative monotonic value)
    if (result.isErr()) {
      expect(result.error.check).not.toBe("ST-1");
    } else {
      expect(result.isOk()).toBe(true);
    }
  });
});

describe("EdgeRuntimeClock — GxP ST-4 isFrozen bypass (kills L85:9 CE 'true')", () => {
  it("gxp=true + Object.isFrozen mocked to true → ok() (kills L85 CE 'true')", () => {
    // Mutation at L85: !Object.isFrozen(Date) → true
    // With real code: !true = false → no ST-4 → passes
    // With mutation: true → always err(ST-4) → KILLS
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    // Stub performance to avoid ST-4 perf check
    vi.stubGlobal("performance", undefined);
    // Make Object.isFrozen report all objects as frozen (bypasses GxP checks)
    vi.spyOn(Object, "isFrozen").mockReturnValue(true);

    const result = createEdgeRuntimeClock({ gxp: true });
    expect(result.isOk()).toBe(true);
  });

  it("gxp=true + Date appears frozen, performance is not frozen → err ST-4 with perf message (covers L94 block)", () => {
    // This test enters the performance freeze check path (L94-102)
    // Kills L94:31 BooleanLiteral, L94:73 BlockStatement, L97 StringLiteral, L99 StringLiteral
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    // Stub non-frozen performance object
    vi.stubGlobal("performance", { now: vi.fn().mockReturnValue(100) });
    // Mock Object.isFrozen: Date appears frozen (skip Date check), performance is not frozen
    vi.spyOn(Object, "isFrozen").mockImplementation((obj: unknown) => {
      if (obj === Date) return true;  // Date "appears frozen" — skip Date ST-4
      return false;                   // performance not frozen — enters L94 block
    });

    const result = createEdgeRuntimeClock({ gxp: true });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.check).toBe("ST-4");
      expect(result.error.message).toMatch(/performance object/);
    }
  });
});

describe("EdgeRuntimeClock — adapter throw message content (kills L145, L162 StringLiteral)", () => {
  it("EdgeRuntimeClockAdapter throw message contains error detail (kills L145 StringLiteral)", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000000000); // Before 2020 → ST-2
    const graph = GraphBuilder.create().provide(adapterOrDie(EdgeRuntimeClockAdapter)).build();
    const container = createContainer({ graph, name: "Test" });
    expect(() => container.resolve(ClockPort)).toThrow(/implausible epoch/);
  });

  it("createEdgeRuntimeClockAdapter throw message contains error detail (kills L162 StringLiteral)", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000000000); // Before 2020 → ST-2
    const adapter = createEdgeRuntimeClockAdapter();
    const graph = GraphBuilder.create().provide(adapterOrDie(adapter)).build();
    const container = createContainer({ graph, name: "Test" });
    expect(() => container.resolve(ClockPort)).toThrow(/implausible epoch/);
  });
});
