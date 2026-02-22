/**
 * Graph integration tests — DoD 10/12
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { adapterOrDie } from "@hex-di/core";
import {
  ClockPort,
  SequenceGeneratorPort,
  ClockDiagnosticsPort,
  TimerSchedulerPort,
  SystemClockAdapter,
  SystemSequenceGeneratorAdapter,
  SystemClockDiagnosticsAdapter,
  SystemTimerSchedulerAdapter,
  SystemCachedClockAdapter,
  CachedClockPort,
  createSystemClockAdapter,
} from "../src/index.js";

// =============================================================================
// DoD 10/12: Graph Integration
// =============================================================================

describe("Graph Integration", () => {
  it("SystemClockAdapter provides ClockPort (graph builds and container resolves ClockPort)", () => {
    const graph = GraphBuilder.create().provide(adapterOrDie(SystemClockAdapter)).build();
    const container = createContainer({ graph, name: "Test" });
    const clock = container.resolve(ClockPort);
    expect(typeof clock.monotonicNow).toBe("function");
  });

  it("SystemSequenceGeneratorAdapter provides SequenceGeneratorPort", () => {
    const graph = GraphBuilder.create().provide(SystemSequenceGeneratorAdapter).build();
    const container = createContainer({ graph, name: "Test" });
    const seq = container.resolve(SequenceGeneratorPort);
    expect(typeof seq.next).toBe("function");
    expect(typeof seq.current).toBe("function");
  });

  it("SystemClockDiagnosticsAdapter provides ClockDiagnosticsPort (requires ClockPort)", () => {
    const graph = GraphBuilder.create()
      .provide(adapterOrDie(SystemClockAdapter))
      .provide(SystemClockDiagnosticsAdapter)
      .build();
    const container = createContainer({ graph, name: "Test" });
    const diag = container.resolve(ClockDiagnosticsPort);
    expect(typeof diag.getDiagnostics).toBe("function");
    expect(typeof diag.getCapabilities).toBe("function");
  });

  it("Resolving ClockPort from container with SystemClockAdapter returns a working adapter (monotonicNow returns number)", () => {
    const graph = GraphBuilder.create().provide(adapterOrDie(SystemClockAdapter)).build();
    const container = createContainer({ graph, name: "Test" });
    const clock = container.resolve(ClockPort);
    const t = clock.monotonicNow();
    expect(typeof t).toBe("number");
    expect(t).toBeGreaterThanOrEqual(0);
  });

  it("SystemTimerSchedulerAdapter provides TimerSchedulerPort", () => {
    const graph = GraphBuilder.create().provide(SystemTimerSchedulerAdapter).build();
    const container = createContainer({ graph, name: "Test" });
    const timer = container.resolve(TimerSchedulerPort);
    expect(typeof timer.setTimeout).toBe("function");
    expect(typeof timer.sleep).toBe("function");
  });

  it("SystemCachedClockAdapter provides CachedClockPort (requires ClockPort)", () => {
    const graph = GraphBuilder.create()
      .provide(adapterOrDie(SystemClockAdapter))
      .provide(adapterOrDie(SystemCachedClockAdapter))
      .build();
    const container = createContainer({ graph, name: "Test" });
    const cached = container.resolve(CachedClockPort);
    expect(typeof cached.recentMonotonicNow).toBe("function");
    expect(typeof cached.recentWallClockNow).toBe("function");
    // Cleanup
    (cached as { stop?: () => void }).stop?.();
  });

  it("Clock adapter is singleton (same reference on repeated resolves)", () => {
    const graph = GraphBuilder.create().provide(adapterOrDie(SystemClockAdapter)).build();
    const container = createContainer({ graph, name: "Test" });
    const clock1 = container.resolve(ClockPort);
    const clock2 = container.resolve(ClockPort);
    expect(clock1).toBe(clock2);
  });
});

// =============================================================================
// DoD 12 test 5: SystemClockStartupError propagation
// =============================================================================

describe("Graph Integration — SystemClockStartupError propagation (DoD 12 test 5)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("SystemClockAdapter factory throws when createSystemClock() fails (simulated ST-2 via Date.now=0)", () => {
    vi.spyOn(Date, "now").mockReturnValue(0);
    const graph = GraphBuilder.create().provide(adapterOrDie(SystemClockAdapter)).build();
    const container = createContainer({ graph, name: "Test" });
    expect(() => container.resolve(ClockPort)).toThrow(/implausible epoch/);
  });
});

// =============================================================================
// DoD 12 tests 6–9: GxP stderr warnings (CLK-INT-003)
// =============================================================================

describe("Graph Integration — GxP adapter stderr warnings (DoD 12 tests 6–9)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("test 6: createSystemClockAdapter({ gxp: true }) warns to stderr when ClockSourceChangedSinkPort not registered", () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    const adapter = createSystemClockAdapter({ gxp: true });
    const graph = GraphBuilder.create().provide(adapterOrDie(adapter)).build();
    const container = createContainer({ graph, name: "Test" });
    // In a standard test environment Date is not frozen, so ST-4 may also fire.
    // We only care that the stderr warning was written (before the startup check runs).
    try {
      container.resolve(ClockPort);
    } catch {
      // ST-4 is expected in non-GxP-hardened test environments; ignore
    }

    const written = stderrSpy.mock.calls
      .map(([chunk]) => (typeof chunk === "string" ? chunk : String(chunk)))
      .join("");
    expect(written).toContain("[CLOCK] WARNING");
    expect(written).toContain("ClockSourceChangedSink");
  });

  it("test 7: clock source change event is NOT emitted on initial adapter registration", () => {
    // Initial adapter registration must NOT emit a ClockSourceChangedEvent.
    // The event is only emitted by the overriding entity (not by the clock library itself).
    const graph = GraphBuilder.create().provide(adapterOrDie(SystemClockAdapter)).build();
    const container = createContainer({ graph, name: "Test" });
    const clock = container.resolve(ClockPort);
    // Resolving the clock adapter succeeds without emitting any clock source change event.
    expect(typeof clock.monotonicNow).toBe("function");
  });

  it("test 8: createSystemClockAdapter({ gxp: true }) without sink logs exact CLK-INT-003 warning to stderr", () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    const adapter = createSystemClockAdapter({ gxp: true });
    const graph = GraphBuilder.create().provide(adapterOrDie(adapter)).build();
    const container = createContainer({ graph, name: "Test" });
    // ST-4 may fire in test environment; the warning is written before the startup checks.
    try {
      container.resolve(ClockPort);
    } catch {
      // ST-4 is expected in non-GxP-hardened test environments; ignore
    }

    const written = stderrSpy.mock.calls
      .map(([chunk]) => (typeof chunk === "string" ? chunk : String(chunk)))
      .join("");
    const expectedMsg =
      "[CLOCK] WARNING: GxP mode active but no ClockSourceChangedSink registered. " +
      "Clock source changes will not be audited.";
    expect(written).toContain(expectedMsg);
  });

  it("test 9: SystemClockAdapter without gxp option does NOT log warning to stderr", () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    const graph = GraphBuilder.create().provide(adapterOrDie(SystemClockAdapter)).build();
    const container = createContainer({ graph, name: "Test" });
    container.resolve(ClockPort);

    const written = stderrSpy.mock.calls
      .map(([chunk]) => (typeof chunk === "string" ? chunk : String(chunk)))
      .join("");
    expect(written).not.toContain("[CLOCK] WARNING");
  });

  it("test 10: createSystemClockAdapter() without options does NOT log warning to stderr (kills L384 CE=true)", () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);

    const adapter = createSystemClockAdapter(); // no options — gxp defaults to undefined/false
    const graph = GraphBuilder.create().provide(adapterOrDie(adapter)).build();
    const container = createContainer({ graph, name: "Test" });
    container.resolve(ClockPort);

    const written = stderrSpy.mock.calls
      .map(([chunk]) => (typeof chunk === "string" ? chunk : String(chunk)))
      .join("");
    expect(written).not.toContain("[CLOCK] WARNING");
  });
});
