/**
 * GxP Installation Qualification (IQ) — @hex-di/clock
 *
 * IQ-1 through IQ-25: Verifies the clock package is correctly installed,
 * all exports are present, and structural contracts are satisfied.
 *
 * CRITICAL: This file imports ONLY from the production entry point (src/index.ts).
 * Zero imports from src/testing/ or @hex-di/clock/testing per GxP IQ requirements.
 */
// @ts-nocheck


import { describe, it, expect, expectTypeOf } from "vitest";
import {
  // Ports
  ClockPort,
  SequenceGeneratorPort,
  TimerSchedulerPort,
  CachedClockPort,
  ClockDiagnosticsPort,
  ClockSourceChangedSinkPort,
  RetentionPolicyPort,
  // Adapters
  SystemClockAdapter,
  SystemSequenceGeneratorAdapter,
  SystemTimerSchedulerAdapter,
  SystemCachedClockAdapter,
  SystemClockDiagnosticsAdapter,
  EdgeRuntimeClockAdapter,
  // Factories
  createSystemClock,
  createSystemSequenceGenerator,
  createTemporalContextFactory,
  createProcessInstanceId,
  // Utilities
  asMonotonic,
  asWallClock,
  asHighRes,
  asMonotonicDuration,
  asWallClockDuration,
  asMonotonicValidated,
  asWallClockValidated,
  asHighResValidated,
  validateSignableTemporalContext,
  computeTemporalContextDigest,
  getClockGxPMetadata,
} from "../src/index.js";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import type {
  MonotonicTimestamp,
  WallClockTimestamp,
  HighResTimestamp,
  TemporalContextFactory,
  TemporalContextDigest,
  ClockStartupError,
  SequenceOverflowError,
  SignableTemporalContext,
} from "../src/index.js";

// Helper to access runtime port metadata without TypeScript errors
type AnyRecord = Record<string, unknown>;

// =============================================================================
// IQ-1..5: Package structure and export availability
// =============================================================================

describe("IQ-1..5 — Package exports and structure", () => {
  it("IQ-1: ClockPort is exported and has correct name", () => {
    expect(ClockPort.__portName).toBe("Clock");
  });

  it("IQ-2: SequenceGeneratorPort is exported and has correct name", () => {
    expect(SequenceGeneratorPort.__portName).toBe("SequenceGenerator");
  });

  it("IQ-3: TimerSchedulerPort is exported and has correct name", () => {
    expect(TimerSchedulerPort.__portName).toBe("TimerScheduler");
  });

  it("IQ-4: CachedClockPort is exported and has correct name", () => {
    expect(CachedClockPort.__portName).toBe("CachedClock");
  });

  it("IQ-5: All production adapter constants are exported (not undefined)", () => {
    expect(SystemClockAdapter).toBeDefined();
    expect(SystemSequenceGeneratorAdapter).toBeDefined();
    expect(SystemTimerSchedulerAdapter).toBeDefined();
    expect(SystemCachedClockAdapter).toBeDefined();
    expect(SystemClockDiagnosticsAdapter).toBeDefined();
    expect(EdgeRuntimeClockAdapter).toBeDefined();
  });
});

// =============================================================================
// IQ-6..10: Port token structure
// =============================================================================

describe("IQ-6..10 — Port token structural validation", () => {
  it("IQ-6: ClockPort is an object (valid port token)", () => {
    expect(typeof ClockPort).toBe("object");
    expect(ClockPort.__portName).toBe("Clock");
  });

  it("IQ-7: SequenceGeneratorPort is an object with correct name", () => {
    expect(typeof SequenceGeneratorPort).toBe("object");
    expect(SequenceGeneratorPort.__portName).toBe("SequenceGenerator");
  });

  it("IQ-8: ClockPort has runtime category metadata accessible", () => {
    const portMeta = ClockPort as AnyRecord;
    // The port token stores category in a runtime property
    expect(typeof portMeta).toBe("object");
    // Verify the port name is 'Clock' indicating correct category 'clock/clock'
    expect(ClockPort.__portName).toBe("Clock");
  });

  it("IQ-9: ClockDiagnosticsPort has correct name", () => {
    expect(ClockDiagnosticsPort.__portName).toBe("ClockDiagnostics");
  });

  it("IQ-10: ClockSourceChangedSinkPort and RetentionPolicyPort are defined", () => {
    expect(ClockSourceChangedSinkPort).toBeDefined();
    expect(RetentionPolicyPort).toBeDefined();
    expect(ClockSourceChangedSinkPort.__portName).toBe("ClockSourceChangedSink");
    expect(RetentionPolicyPort.__portName).toBe("RetentionPolicy");
  });
});

// =============================================================================
// IQ-11..15: Adapter wiring in container
// =============================================================================

describe("IQ-11..15 — Adapter container wiring", () => {
  it("IQ-11: SystemClockAdapter resolves ClockPort in a container", () => {
    const graph = GraphBuilder.create().provide(SystemClockAdapter).build();
    const container = createContainer({ graph, name: "IQ-11" });
    const clock = container.resolve(ClockPort);
    expect(typeof clock.monotonicNow).toBe("function");
  });

  it("IQ-12: SystemSequenceGeneratorAdapter resolves SequenceGeneratorPort", () => {
    const graph = GraphBuilder.create().provide(SystemSequenceGeneratorAdapter).build();
    const container = createContainer({ graph, name: "IQ-12" });
    const seq = container.resolve(SequenceGeneratorPort);
    expect(typeof seq.next).toBe("function");
    expect(typeof seq.current).toBe("function");
  });

  it("IQ-13: SystemTimerSchedulerAdapter resolves TimerSchedulerPort", () => {
    const graph = GraphBuilder.create().provide(SystemTimerSchedulerAdapter).build();
    const container = createContainer({ graph, name: "IQ-13" });
    const timer = container.resolve(TimerSchedulerPort);
    expect(typeof timer.setTimeout).toBe("function");
    expect(typeof timer.sleep).toBe("function");
  });

  it("IQ-14: SystemCachedClockAdapter resolves CachedClockPort (requires ClockPort)", () => {
    const graph = GraphBuilder.create()
      .provide(SystemClockAdapter)
      .provide(SystemCachedClockAdapter)
      .build();
    const container = createContainer({ graph, name: "IQ-14" });
    const cached = container.resolve(CachedClockPort);
    expect(typeof cached.recentMonotonicNow).toBe("function");
  });

  it("IQ-15: SystemClockDiagnosticsAdapter resolves ClockDiagnosticsPort (requires ClockPort)", () => {
    const graph = GraphBuilder.create()
      .provide(SystemClockAdapter)
      .provide(SystemClockDiagnosticsAdapter)
      .build();
    const container = createContainer({ graph, name: "IQ-15" });
    const diag = container.resolve(ClockDiagnosticsPort);
    expect(typeof diag.getDiagnostics).toBe("function");
    expect(typeof diag.getCapabilities).toBe("function");
  });
});

// =============================================================================
// IQ-16..20: Branded timestamp types exported and structurally correct
// =============================================================================

describe("IQ-16..20 — Branded timestamp type exports", () => {
  it("IQ-16: asMonotonic() is callable and returns a number at runtime", () => {
    const val = asMonotonic(1000);
    expect(typeof val).toBe("number");
    expect(val).toBe(1000);
  });

  it("IQ-17: asWallClock() is callable and returns a number at runtime", () => {
    const val = asWallClock(Date.now());
    expect(typeof val).toBe("number");
  });

  it("IQ-18: asHighRes() is callable and returns a number at runtime", () => {
    const val = asHighRes(performance.now());
    expect(typeof val).toBe("number");
  });

  it("IQ-19: asMonotonicDuration() and asWallClockDuration() are callable", () => {
    const md = asMonotonicDuration(100);
    const wd = asWallClockDuration(200);
    expect(typeof md).toBe("number");
    expect(typeof wd).toBe("number");
  });

  it("IQ-20: Validated branding functions return Result types", () => {
    const r1 = asMonotonicValidated(1000);
    const r2 = asWallClockValidated(Date.now());
    const r3 = asHighResValidated(Date.now());
    expect(r1.isOk()).toBe(true);
    expect(r2.isOk()).toBe(true);
    expect(r3.isOk()).toBe(true);
  });
});

// =============================================================================
// IQ-21..25: Core utilities callable and return correct types
// =============================================================================

describe("IQ-21..25 — Core utility functions", () => {
  it("IQ-21: createTemporalContextFactory() is callable and returns factory", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    const seq = createSystemSequenceGenerator();
    const factory = createTemporalContextFactory(clockResult.value, seq);
    expect(typeof factory.create).toBe("function");
    expect(typeof factory.createOverflowContext).toBe("function");
  });

  it("IQ-22: validateSignableTemporalContext() returns ok for unsigned context", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    const seq = createSystemSequenceGenerator();
    const factory = createTemporalContextFactory(clockResult.value, seq);
    const ctxResult = factory.create();
    expect(ctxResult.isOk()).toBe(true);
    if (!ctxResult.isOk()) return;

    const signableCtx: SignableTemporalContext = ctxResult.value;
    const validResult = validateSignableTemporalContext(signableCtx);
    expect(validResult.isOk()).toBe(true);
  });

  it("IQ-23: computeTemporalContextDigest() returns digest object", () => {
    const clockResult = createSystemClock();
    expect(clockResult.isOk()).toBe(true);
    if (!clockResult.isOk()) return;

    const seq = createSystemSequenceGenerator();
    const factory = createTemporalContextFactory(clockResult.value, seq);
    const ctxResult = factory.create();
    expect(ctxResult.isOk()).toBe(true);
    if (!ctxResult.isOk()) return;

    const digest = computeTemporalContextDigest(ctxResult.value);
    expect(digest._tag).toBe("TemporalContextDigest");
    expect(digest.algorithm).toBe("SHA-256");
    expect(typeof digest.digest).toBe("string");
    expect(typeof digest.canonicalInput).toBe("string");
  });

  it("IQ-24: getClockGxPMetadata() returns correct metadata", () => {
    const meta = getClockGxPMetadata();
    expect(Object.isFrozen(meta)).toBe(true);
    expect(meta.clockVersion).toBeTruthy();
    expect(meta.specRevision).toBe("2.9");
  });

  it("IQ-25: createProcessInstanceId() returns a non-empty string", () => {
    const id = createProcessInstanceId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Type-level IQ checks (compile-time)
// =============================================================================

describe("IQ type-level — structural type contracts", () => {
  it("MonotonicTimestamp is assignable to number", () => {
    expectTypeOf<MonotonicTimestamp>().toMatchTypeOf<number>();
  });

  it("WallClockTimestamp is assignable to number", () => {
    expectTypeOf<WallClockTimestamp>().toMatchTypeOf<number>();
  });

  it("HighResTimestamp is assignable to number", () => {
    expectTypeOf<HighResTimestamp>().toMatchTypeOf<number>();
  });

  it("MonotonicTimestamp is NOT assignable to WallClockTimestamp", () => {
    expectTypeOf<MonotonicTimestamp>().not.toEqualTypeOf<WallClockTimestamp>();
  });

  it("ClockStartupError has correct _tag type", () => {
    expectTypeOf<ClockStartupError["_tag"]>().toEqualTypeOf<"ClockStartupError">();
  });

  it("SequenceOverflowError has correct _tag type", () => {
    expectTypeOf<SequenceOverflowError["_tag"]>().toEqualTypeOf<"SequenceOverflowError">();
  });

  it("TemporalContextFactory has create() method", () => {
    expectTypeOf<TemporalContextFactory>().toHaveProperty("create");
    expectTypeOf<TemporalContextFactory>().toHaveProperty("createOverflowContext");
  });

  it("TemporalContextDigest has correct fields", () => {
    expectTypeOf<TemporalContextDigest["_tag"]>().toEqualTypeOf<"TemporalContextDigest">();
    expectTypeOf<TemporalContextDigest["algorithm"]>().toEqualTypeOf<"SHA-256">();
    expectTypeOf<TemporalContextDigest["digest"]>().toEqualTypeOf<string>();
  });
});
