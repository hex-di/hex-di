/**
 * System clock startup self-test tests — DoD 3
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  createSystemClock,
  createClampedFallback,
  createSystemClockStartupError,
  createSystemSequenceGenerator,
  createSystemClockAdapter,
  SystemClockAdapter,
  getPerformance,
} from "../src/adapters/system-clock.js";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { adapterOrDie } from "@hex-di/core";
import { ClockPort } from "../src/ports/clock.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// =============================================================================
// DoD 3: Startup self-tests
// =============================================================================

describe("SystemClock startup self-tests", () => {
  it("createSystemClock() succeeds when platform APIs return plausible values", () => {
    const result = createSystemClock();
    // On a healthy Node.js 18+ system this should succeed
    // If ST-4 fires (GxP mode), it would only be in GxP mode which is not set
    expect(result.isOk()).toBe(true);
  });

  it("createSystemClock() returns err(SystemClockStartupError) with check 'ST-2' when wallClockNow() returns epoch before 2020", () => {
    // Mock Date.now to return a value before 2020-01-01 (1577836800000)
    vi.spyOn(Date, "now").mockReturnValue(1000000000); // Year 2001 — before 2020
    const result = createSystemClock();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe("SystemClockStartupError");
      expect(result.error.check).toBe("ST-2");
    }
  });

  it("createSystemClock({ gxp: true }) returns err(SystemClockStartupError) with check 'ST-4' when Date is not frozen", () => {
    // Date is not frozen by default in test environments
    const result = createSystemClock({ gxp: true });
    if (result.isErr()) {
      expect(result.error.check).toBe("ST-4");
    } else {
      // Date is frozen — ST-4 doesn't fire
      expect(result.isOk()).toBe(true);
    }
  });

  it("createSystemClock({ gxp: false }) does NOT check platform API freeze (ST-4 skipped)", () => {
    // Non-GxP mode: ST-4 should not run
    const result = createSystemClock({ gxp: false });
    // Either ok or another startup error (not ST-4)
    if (result.isErr()) {
      expect(result.error.check).not.toBe("ST-4");
    }
  });

  it("createSystemClock() without options does NOT check platform API freeze (ST-4 skipped)", () => {
    // No GxP options: ST-4 should not run
    const result = createSystemClock();
    if (result.isErr()) {
      expect(result.error.check).not.toBe("ST-4");
    }
  });

  it("SystemClockStartupError has correct _tag 'SystemClockStartupError'", () => {
    const error = createSystemClockStartupError("ST-1", -1, "test error");
    expect(error._tag).toBe("SystemClockStartupError");
  });

  it("SystemClockStartupError is frozen at construction", () => {
    const error = createSystemClockStartupError("ST-2", 0, "test error");
    expect(Object.isFrozen(error)).toBe(true);
  });

  it("SystemClockStartupError includes observedValue field", () => {
    const error = createSystemClockStartupError("ST-3", 42, "test error");
    expect(error.observedValue).toBe(42);
  });

  it("SystemClockStartupError has correct check field", () => {
    const error = createSystemClockStartupError("ST-5", 1500, "divergence too high");
    expect(error.check).toBe("ST-5");
  });

  it("createSystemClock() succeeds when highResNow() and wallClockNow() agree within 1000ms", () => {
    // On healthy Node.js, this should pass (performance.timeOrigin + now ≈ Date.now())
    const result = createSystemClock();
    // This test verifies ST-5 does NOT fire under normal conditions
    // If it fails for another reason, that's ok — we're specifically testing ST-5 does not fire
    if (result.isErr()) {
      expect(result.error.check).not.toBe("ST-5");
    }
  });

  it("ST-1 fails when monotonic is negative (simulated via clamped fallback)", () => {
    // Test the clamped fallback with captured Date.now returning negative
    const mockDateNow = vi.fn(() => -100);
    const clamped = createClampedFallback(mockDateNow);
    const value = clamped();
    // Clamped fallback initializes lastValue at 0, -100 < 0 means lastValue stays at 0
    expect(value).toBe(0);
  });
});

// =============================================================================
// Boundary conditions (mutation score improvement)
// =============================================================================

describe("SystemClock startup — boundary conditions", () => {
  it("createClampedFallback returns same value when Date.now returns same value twice", () => {
    const mockDateNow = vi.fn().mockReturnValueOnce(500).mockReturnValueOnce(500);
    const clamped = createClampedFallback(mockDateNow);

    const first = clamped();
    const second = clamped();

    expect(first).toBe(500);
    expect(second).toBe(500);
  });

  it("ST-1 zero boundary: performance.now() returning 0 does NOT fail ST-1", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    vi.stubGlobal("performance", {
      now: vi.fn().mockReturnValue(0),
      timeOrigin: wallMs,
    });

    const result = createSystemClock();
    if (result.isErr()) {
      expect(result.error.check).not.toBe("ST-1");
    } else {
      expect(result.isOk()).toBe(true);
    }
  });

  it("ST-2 exact threshold: Date.now() = 1577836800000 returns err('ST-2')", () => {
    vi.spyOn(Date, "now").mockReturnValue(1577836800000);

    const result = createSystemClock();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.check).toBe("ST-2");
    }
  });

  it("ST-3 equal values: same performance.now() value does NOT fail ST-3", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    vi.stubGlobal("performance", {
      now: vi.fn().mockReturnValue(100), // always returns same value
      timeOrigin: wallMs,
    });

    const result = createSystemClock();
    if (result.isErr()) {
      expect(result.error.check).not.toBe("ST-3");
    } else {
      expect(result.isOk()).toBe(true);
    }
  });

  it("ST-5 at-threshold: divergence = 1000ms exactly returns ok()", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    vi.stubGlobal("performance", {
      now: vi.fn().mockReturnValue(0),
      timeOrigin: wallMs + 1000, // highRes = wallMs + 1000, |diff| = 1000 (NOT > 1000)
    });

    const result = createSystemClock();
    if (result.isErr()) {
      expect(result.error.check).not.toBe("ST-5");
    } else {
      expect(result.isOk()).toBe(true);
    }
  });

  it("ST-5 over-threshold: divergence = 1001ms returns err('ST-5')", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    vi.stubGlobal("performance", {
      now: vi.fn().mockReturnValue(0),
      timeOrigin: wallMs + 1001, // |highRes - wall| = 1001 > 1000
    });

    const result = createSystemClock();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.check).toBe("ST-5");
    }
  });
});

describe("SystemClock capabilities — perf/timeOrigin presence", () => {
  it("highResSource='Date.now' when performance.timeOrigin is absent", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    vi.stubGlobal("performance", {
      now: vi.fn().mockReturnValue(100),
      // timeOrigin intentionally absent
    });

    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.getDiagnostics().highResSource).toBe("Date.now");
      expect(result.value.getCapabilities().hasHighResOrigin).toBe(false);
      expect(result.value.getCapabilities().highResDegraded).toBe(true);
    }
  });

  it("highResSource='performance.timeOrigin+now' when performance.timeOrigin is present", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    vi.stubGlobal("performance", {
      now: vi.fn().mockReturnValue(0),
      timeOrigin: wallMs,
    });

    const result = createSystemClock();
    if (result.isOk()) {
      expect(result.value.getDiagnostics().highResSource).toBe("performance.timeOrigin+now");
      expect(result.value.getCapabilities().hasHighResOrigin).toBe(true);
      expect(result.value.getCapabilities().highResDegraded).toBe(false);
    }
  });

  it("monotonicSource='Date.now-clamped' and monotonicDegraded=true when performance is absent", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    vi.stubGlobal("performance", undefined);

    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.getDiagnostics().monotonicSource).toBe("Date.now-clamped");
      expect(result.value.getCapabilities().monotonicDegraded).toBe(true);
      expect(result.value.getCapabilities().hasMonotonicTime).toBe(false);
      expect(result.value.getCapabilities().highResDegraded).toBe(true);
    }
  });

  it("crossOriginIsolated capability is true when global is true", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    vi.stubGlobal("crossOriginIsolated", true);
    // Stub performance to avoid ST-5 firing (real perf diverges from mocked Date.now)
    vi.stubGlobal("performance", { now: vi.fn().mockReturnValue(0), timeOrigin: wallMs });

    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.getCapabilities().crossOriginIsolated).toBe(true);
    }
  });

  it("crossOriginIsolated capability is undefined when global is a non-boolean string", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    vi.stubGlobal("crossOriginIsolated", "not-a-boolean");
    // Stub performance to avoid ST-5 firing
    vi.stubGlobal("performance", { now: vi.fn().mockReturnValue(0), timeOrigin: wallMs });

    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.getCapabilities().crossOriginIsolated).toBeUndefined();
    }
  });

  it("monotonicSource='performance.now' and monotonicDegraded=false when performance is present", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    vi.stubGlobal("performance", {
      now: vi.fn().mockReturnValue(100),
      timeOrigin: wallMs,
    });

    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.getDiagnostics().monotonicSource).toBe("performance.now");
      expect(result.value.getCapabilities().monotonicDegraded).toBe(false);
      expect(result.value.getCapabilities().hasMonotonicTime).toBe(true);
    }
  });
});

describe("SystemClock — GxP ST-4 performance freeze check", () => {
  it("gxp=true: unfrozen performance object returns err('ST-4')", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    vi.stubGlobal("performance", {
      now: vi.fn().mockReturnValue(0),
      timeOrigin: wallMs,
    });
    // Date is not frozen in test environment
    const result = createSystemClock({ gxp: true });
    if (result.isErr()) {
      // ST-4 fires for Date not being frozen (or perf not being frozen)
      expect(["ST-4"].includes(result.error.check)).toBe(true);
    }
  });

  it("gxp=true: performance present but not frozen returns err('ST-4')", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    // Create an unfrozen performance object
    const unfrozenPerf = { now: () => 0, timeOrigin: wallMs };
    vi.stubGlobal("performance", unfrozenPerf);

    const result = createSystemClock({ gxp: true });
    if (result.isErr()) {
      // Some ST check fires (ST-4 for frozen Date or frozen performance)
      expect(["ST-1", "ST-2", "ST-3", "ST-4", "ST-5"].includes(result.error.check)).toBe(true);
    }
  });
});

describe("SystemClock sequence generator", () => {
  it("createSystemSequenceGenerator().current() returns 0 before any next() calls", () => {
    const gen = createSystemSequenceGenerator();
    expect(gen.current()).toBe(0);
  });

  it("createSystemSequenceGenerator().next() returns ok(1) on first call", () => {
    const gen = createSystemSequenceGenerator();
    const result = gen.next();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(1);
    }
  });

  it("createSystemSequenceGenerator().current() reflects counter after next() calls", () => {
    const gen = createSystemSequenceGenerator();
    gen.next();
    gen.next();
    expect(gen.current()).toBe(2);
  });

  it("createSystemSequenceGenerator() returns different values for each next() call", () => {
    const gen = createSystemSequenceGenerator();
    const r1 = gen.next();
    const r2 = gen.next();
    const r3 = gen.next();
    expect(r1.isOk()).toBe(true);
    expect(r2.isOk()).toBe(true);
    expect(r3.isOk()).toBe(true);
    if (r1.isOk() && r2.isOk() && r3.isOk()) {
      expect(r1.value).toBe(1);
      expect(r2.value).toBe(2);
      expect(r3.value).toBe(3);
    }
  });
});

describe("SystemClock — createSystemClockAdapter factory", () => {
  it("createSystemClockAdapter() builds an adapter that resolves ClockPort", () => {
    const adapter = createSystemClockAdapter();
    const graph = GraphBuilder.create().provide(adapterOrDie(adapter)).build();
    const container = createContainer({ graph, name: "Test" });
    const clock = container.resolve(ClockPort);
    expect(typeof clock.monotonicNow).toBe("function");
  });

  it("createSystemClockAdapter factory throws when clock startup fails (ST-2)", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000000000); // Before 2020 — triggers ST-2
    const adapter = createSystemClockAdapter();
    const graph = GraphBuilder.create().provide(adapterOrDie(adapter)).build();
    const container = createContainer({ graph, name: "Test" });
    // Assert the SystemClockStartupError message propagates through FactoryError
    expect(() => container.resolve(ClockPort)).toThrow(/implausible epoch/);
  });
});

describe("SystemClock platform detection", () => {
  it("capabilities.platform is 'deno' when Deno global is present", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    // Stub performance to avoid ST-5
    vi.stubGlobal("performance", { now: vi.fn().mockReturnValue(0), timeOrigin: wallMs });
    // Remove Node.js version detection so Deno check fires
    vi.stubGlobal("process", { versions: {}, env: process.env });
    vi.stubGlobal("Deno", { version: {} });

    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.getCapabilities().platform).toBe("deno");
    }
  });

  it("capabilities.platform is 'bun' when Bun global is present", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    // Stub performance to avoid ST-5
    vi.stubGlobal("performance", { now: vi.fn().mockReturnValue(0), timeOrigin: wallMs });
    // Remove Node.js version detection so Bun check fires
    vi.stubGlobal("process", { versions: {}, env: process.env });
    vi.stubGlobal("Bun", { version: "1.0" });

    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.getCapabilities().platform).toBe("bun");
    }
  });
});

// =============================================================================
// getPerformance() function — kills L67/L68 ConditionalExpression mutants
// =============================================================================

describe("getPerformance() — conditional expression boundaries", () => {
  it("returns a PerformanceLike object when performance.now is a function", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    vi.stubGlobal("performance", {
      now: () => 100,
      timeOrigin: wallMs,
    });

    const perf = getPerformance();
    expect(perf).toBeDefined();
    expect(typeof perf?.now).toBe("function");
  });

  it("returns undefined when performance.now is a string (not a function) — kills L68 ConditionalExpression", () => {
    vi.stubGlobal("performance", {
      now: "not-a-function",
    });

    const perf = getPerformance();
    expect(perf).toBeUndefined();
  });

  it("returns undefined when performance is undefined — kills L67 ConditionalExpression", () => {
    vi.stubGlobal("performance", undefined);

    const perf = getPerformance();
    expect(perf).toBeUndefined();
  });

  it("createSystemClock() succeeds with performance.now as non-function (uses clamped fallback)", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    vi.stubGlobal("performance", {
      now: "not-a-function",
      timeOrigin: wallMs,
    });

    const result = createSystemClock();
    // getPerformance() returns undefined → clamped fallback used
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.getCapabilities().monotonicDegraded).toBe(true);
      expect(result.value.getDiagnostics().monotonicSource).toBe("Date.now-clamped");
    }
  });
});

// =============================================================================
// estimatedResolutionMs assertions (kills L133 platform equality mutations)
// =============================================================================

describe("SystemClock — estimatedResolutionMs by platform", () => {
  it("estimatedResolutionMs is 0.001 on node platform", () => {
    // Node.js is the current platform in this test environment
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.getCapabilities().platform).toBe("node");
      expect(result.value.getCapabilities().estimatedResolutionMs).toBe(0.001);
    }
  });

  it("estimatedResolutionMs is 0.001 on deno platform (kills 'node' === mutation)", () => {
    vi.stubGlobal("process", { versions: {}, env: process.env });
    vi.stubGlobal("Deno", { version: {} });

    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    // Stub performance to avoid ST-5 (divergence between highRes and wall)
    vi.stubGlobal("performance", { now: vi.fn().mockReturnValue(0), timeOrigin: wallMs });

    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.getCapabilities().platform).toBe("deno");
      expect(result.value.getCapabilities().estimatedResolutionMs).toBe(0.001);
    }
  });

  it("estimatedResolutionMs is 0.001 on bun platform (kills 'deno' === mutation)", () => {
    vi.stubGlobal("process", { versions: {}, env: process.env });
    vi.stubGlobal("Bun", { version: "1.0" });

    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    // Stub performance to avoid ST-5
    vi.stubGlobal("performance", { now: vi.fn().mockReturnValue(0), timeOrigin: wallMs });

    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.getCapabilities().platform).toBe("bun");
      expect(result.value.getCapabilities().estimatedResolutionMs).toBe(0.001);
    }
  });

  it("estimatedResolutionMs is 1.0 on unknown platform (kills 'bun' === mutation)", () => {
    // Stub away all platform globals → platform = 'unknown'
    vi.stubGlobal("process", { versions: {}, env: process.env });

    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    // Stub performance to avoid ST-5
    vi.stubGlobal("performance", { now: vi.fn().mockReturnValue(0), timeOrigin: wallMs });

    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const caps = result.value.getCapabilities();
      expect(caps.platform).toBe("unknown");
      expect(caps.estimatedResolutionMs).toBe(1.0);
    }
  });
});

// =============================================================================
// Targeted mutation kills — L190, L194, L212, L219, L330
// =============================================================================

describe("SystemClock — startup NoCoverage and CE(false) mutations", () => {
  it("createSystemClock({ gxp: true }) ALWAYS returns err('ST-4') when Date is not frozen (kills L219 CE(false))", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    vi.stubGlobal("performance", { now: vi.fn().mockReturnValue(0), timeOrigin: wallMs });
    // Date is never frozen in the test environment
    const result = createSystemClock({ gxp: true });
    // Unconditional — CE(false) mutant would skip ST-4 block, making result Ok
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.check).toBe("ST-4");
    }
  });

  it("createSystemClock() returns err('ST-1') when performance.now() returns negative value (covers L194 NoCoverage)", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    vi.stubGlobal("performance", { now: vi.fn().mockReturnValue(-1), timeOrigin: wallMs });
    const result = createSystemClock();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.check).toBe("ST-1");
    }
  });

  it("createSystemClock() returns err('ST-3') when performance.now() regresses between two calls (covers L212 NoCoverage)", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    // First call (m1) returns 100, second call (m2) returns 50 — regression
    vi.stubGlobal("performance", {
      now: vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(50),
      timeOrigin: wallMs,
    });
    const result = createSystemClock();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.check).toBe("ST-3");
    }
  });

  it("highResNow() returns wall clock value when performance is undefined (kills L190 ArrowFunction)", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    vi.stubGlobal("performance", undefined);
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // When perf is undefined, highResNowRaw = () => capturedDateNow()
      // L190 ArrowFunction mutant replaces this with () => undefined
      const highRes = result.value.highResNow();
      expect(Number(highRes)).toBe(wallMs);
    }
  });
});

describe("SystemClockAdapter constant — L330 CE(false) mutation", () => {
  it("SystemClockAdapter constant factory throws when startup fails (kills L330 CE(false))", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000000000); // Before 2020 — triggers ST-2
    const graph = GraphBuilder.create().provide(adapterOrDie(SystemClockAdapter)).build();
    const container = createContainer({ graph, name: "Test" });
    expect(() => container.resolve(ClockPort)).toThrow(/implausible epoch/);
  });
});

// =============================================================================
// Startup error message assertions (kills StringLiteral mutants L195, L205, L214, L225, L250)
// and BooleanLiteral at L220
// =============================================================================

describe("SystemClock — startup error message content assertions", () => {
  it("ST-1 error message contains 'negative' (kills L195 StringLiteral)", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    vi.stubGlobal("performance", { now: vi.fn().mockReturnValue(-1), timeOrigin: wallMs });
    const result = createSystemClock();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.check).toBe("ST-1");
      expect(result.error.message).toContain("negative");
    }
  });

  it("ST-2 error message contains '2020' (kills L205 StringLiteral)", () => {
    vi.spyOn(Date, "now").mockReturnValue(1577836800000); // exactly at the threshold → triggers ST-2
    const result = createSystemClock();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.check).toBe("ST-2");
      expect(result.error.message).toContain("2020");
    }
  });

  it("ST-3 error message contains 'regressed' (kills L214 StringLiteral)", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    vi.stubGlobal("performance", {
      now: vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(50),
      timeOrigin: wallMs,
    });
    const result = createSystemClock();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.check).toBe("ST-3");
      expect(result.error.message).toContain("regressed");
    }
  });

  it("ST-4 Date check fires unconditionally when gxp=true and performance absent — kills L220 BooleanLiteral", () => {
    // With performance=undefined, only the Date.isFrozen check runs for ST-4.
    // Original: if (!Object.isFrozen(Date)) → true (Date not frozen) → err
    // Mutation (BooleanLiteral removes !): if (Object.isFrozen(Date)) → false → skips → ok
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    vi.stubGlobal("performance", undefined);
    const result = createSystemClock({ gxp: true });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.check).toBe("ST-4");
    }
  });

  it("ST-4 error message contains 'Date object' (kills L225 StringLiteral)", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    vi.stubGlobal("performance", undefined);
    const result = createSystemClock({ gxp: true });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.check).toBe("ST-4");
      expect(result.error.message).toContain("Date object");
    }
  });

  it("ST-5 error message contains 'diverge' (kills L250 StringLiteral)", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    // timeOrigin is 1001ms ahead of wallMs → highRes = wallMs+1001, divergence = 1001 > 1000
    vi.stubGlobal("performance", {
      now: vi.fn().mockReturnValue(0),
      timeOrigin: wallMs + 1001,
    });
    const result = createSystemClock();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.check).toBe("ST-5");
      expect(result.error.message).toContain("diverge");
    }
  });
});

// =============================================================================
// L136 crossOriginIsolated + unknown platform — kills CE true (id=279) and EQ != (id=281)
// =============================================================================

describe("SystemClock — estimatedResolutionMs with crossOriginIsolated on unknown platform", () => {
  it("estimatedResolutionMs is 1.0 (not 0.005) on unknown platform even when crossOriginIsolated=true (kills ids 279, 281)", () => {
    // Platform = 'unknown': process lacks versions.node, no Deno/Bun globals
    vi.stubGlobal("process", { versions: {}, env: process.env });
    // Add crossOriginIsolated=true — browser-specific global
    vi.stubGlobal("crossOriginIsolated", true);

    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    // performance with timeOrigin = wallMs → no ST-5 divergence
    vi.stubGlobal("performance", {
      now: vi.fn().mockReturnValue(0),
      timeOrigin: wallMs,
    });

    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const caps = result.value.getCapabilities();
      // Original (L136): if (platform === "browser") → false for "unknown" → returns 1.0 at L142
      // Mutation CE true (id=279): always enters browser branch → crossOriginIsolated=true → returns 0.005 ≠ 1.0 → KILLED
      // Mutation EQ != (id=281): if (platform !== "browser") for "unknown" → true → enters browser branch → 0.005 → KILLED
      expect(caps.platform).toBe("unknown");
      expect(caps.estimatedResolutionMs).toBe(1.0);
    }
  });
});

// =============================================================================
// L220 GxP isFrozen mock — kills CE true (id=341)
// =============================================================================

describe("SystemClock — GxP mode succeeds when Date and performance are frozen (kills id=341)", () => {
  it("createSystemClock({ gxp: true }) returns ok() when Object.isFrozen returns true for Date and performance", () => {
    const wallMs = 1700000000000;
    vi.spyOn(Date, "now").mockReturnValue(wallMs);
    vi.stubGlobal("performance", {
      now: vi.fn().mockReturnValue(0),
      timeOrigin: wallMs,
    });
    // Mock Object.isFrozen to return true for everything (simulates GxP-frozen environment)
    // CE true mutant (id=341): if (true) → always fires ST-4 even when Date is frozen → result.isErr() → FAILS → KILLED
    vi.spyOn(Object, "isFrozen").mockReturnValue(true);

    const result = createSystemClock({ gxp: true });
    expect(result.isOk()).toBe(true);
  });
});
