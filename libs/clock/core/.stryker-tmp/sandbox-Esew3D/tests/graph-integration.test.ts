/**
 * Graph integration tests — DoD 10/12
 */
// @ts-nocheck


import { describe, it, expect } from "vitest";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
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
} from "../src/index.js";

// =============================================================================
// DoD 10/12: Graph Integration
// =============================================================================

describe("Graph Integration", () => {
  it("SystemClockAdapter provides ClockPort (graph builds and container resolves ClockPort)", () => {
    const graph = GraphBuilder.create().provide(SystemClockAdapter).build();
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
      .provide(SystemClockAdapter)
      .provide(SystemClockDiagnosticsAdapter)
      .build();
    const container = createContainer({ graph, name: "Test" });
    const diag = container.resolve(ClockDiagnosticsPort);
    expect(typeof diag.getDiagnostics).toBe("function");
    expect(typeof diag.getCapabilities).toBe("function");
  });

  it("Resolving ClockPort from container with SystemClockAdapter returns a working adapter (monotonicNow returns number)", () => {
    const graph = GraphBuilder.create().provide(SystemClockAdapter).build();
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
      .provide(SystemClockAdapter)
      .provide(SystemCachedClockAdapter)
      .build();
    const container = createContainer({ graph, name: "Test" });
    const cached = container.resolve(CachedClockPort);
    expect(typeof cached.recentMonotonicNow).toBe("function");
    expect(typeof cached.recentWallClockNow).toBe("function");
    // Cleanup
    (cached as { stop?: () => void }).stop?.();
  });

  it("Clock adapter is singleton (same reference on repeated resolves)", () => {
    const graph = GraphBuilder.create().provide(SystemClockAdapter).build();
    const container = createContainer({ graph, name: "Test" });
    const clock1 = container.resolve(ClockPort);
    const clock2 = container.resolve(ClockPort);
    expect(clock1).toBe(clock2);
  });
});
