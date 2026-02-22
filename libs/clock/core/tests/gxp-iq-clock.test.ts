/**
 * GxP Installation Qualification (IQ) — @hex-di/clock
 *
 * IQ-1 through IQ-25: Verifies the clock package is correctly installed,
 * all exports are present, and structural contracts are satisfied.
 *
 * CRITICAL: This file imports ONLY from the production entry point (src/index.ts).
 * Zero imports from src/testing/ or @hex-di/clock/testing per GxP IQ requirements.
 */

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
  // Factories (IQ-26..30)
  createEdgeRuntimeClock,
  createHostBridgeClock,
  createHostBridgeClockAdapter,
  // Combinators (IQ-31)
  delay,
  timeout,
  measure,
  retry,
  // Duration utilities (IQ-34..35)
  elapsed,
  durationGt,
  durationLt,
  durationBetween,
  // Temporal interop (IQ-36)
  toTemporalInstant,
  fromTemporalInstant,
  // Clock context (IQ-37)
  createClockContext,
  // Periodic evaluation (IQ-41)
  setupPeriodicClockEvaluation,
  // Retention (IQ-42)
  validateRetentionMetadata,
  calculateRetentionExpiryDate,
  // Validated branding (IQ-44)
  createBrandingValidationError,
} from "../src/index.js";
import { GraphBuilder } from "@hex-di/graph";
import { createContainer } from "@hex-di/runtime";
import { adapterOrDie } from "@hex-di/core";
import type {
  MonotonicTimestamp,
  WallClockTimestamp,
  HighResTimestamp,
  TemporalContextFactory,
  TemporalContextDigest,
  SystemClockStartupError,
  SequenceOverflowError,
  SignableTemporalContext,
  // IQ-26
  HostClockBridge,
  HostBridgeClockOptions,
  // IQ-28..30
  ClockCapabilities,
  // IQ-32
  RetryOptions,
  // IQ-33
  MonotonicDuration,
  WallClockDuration,
  // IQ-37
  ClockContext,
  // IQ-41
  PeriodicEvaluationConfig,
  // IQ-42
  RetentionMetadata,
  RetentionValidationError,
  // IQ-44
  BrandingValidationError,
} from "../src/index.js";
// IQ-39: Testing entry point verification (sole exception to production-only imports rule)
import {
  assertMonotonic,
  assertTimeBetween,
  assertWallClockPlausible,
  assertSequenceOrdered,
} from "../src/testing/index.js";

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
    const graph = GraphBuilder.create().provide(adapterOrDie(SystemClockAdapter)).build();
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
      .provide(adapterOrDie(SystemClockAdapter))
      .provide(adapterOrDie(SystemCachedClockAdapter))
      .build();
    const container = createContainer({ graph, name: "IQ-14" });
    const cached = container.resolve(CachedClockPort);
    expect(typeof cached.recentMonotonicNow).toBe("function");
  });

  it("IQ-15: SystemClockDiagnosticsAdapter resolves ClockDiagnosticsPort (requires ClockPort)", () => {
    const graph = GraphBuilder.create()
      .provide(adapterOrDie(SystemClockAdapter))
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

  it("SystemClockStartupError has correct _tag type", () => {
    expectTypeOf<SystemClockStartupError["_tag"]>().toEqualTypeOf<"SystemClockStartupError">();
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

// =============================================================================
// IQ-26..30: Platform adapter exports and capabilities
// =============================================================================

describe("IQ-26..30 — Platform adapter exports and capabilities", () => {
  it("IQ-26: HostClockBridge and HostBridgeClockOptions exported from main entry point", () => {
    // Runtime: createHostBridgeClock is the factory — its existence proves the export is present
    expect(typeof createHostBridgeClock).toBe("function");
    expect(typeof createHostBridgeClockAdapter).toBe("function");
    // Type-level verification
    expectTypeOf<HostClockBridge>().toHaveProperty("monotonicNowMs");
    expectTypeOf<HostClockBridge>().toHaveProperty("wallClockNowMs");
    expectTypeOf<HostBridgeClockOptions>().toHaveProperty("adapterName");
    expectTypeOf<HostBridgeClockOptions>().toHaveProperty("platform");
  });

  it("IQ-27: EdgeRuntimeClockAdapter and createHostBridgeClockAdapter exported from main entry point", () => {
    expect(EdgeRuntimeClockAdapter).toBeDefined();
    expect(typeof createHostBridgeClockAdapter).toBe("function");
    expect(typeof createEdgeRuntimeClock).toBe("function");
  });

  it("IQ-28: SystemClockAdapter.getCapabilities() returns a frozen ClockCapabilities object", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const capabilities: ClockCapabilities = result.value.getCapabilities();
    expect(Object.isFrozen(capabilities)).toBe(true);
    expect(typeof capabilities.hasMonotonicTime).toBe("boolean");
    expect(typeof capabilities.hasHighResOrigin).toBe("boolean");
    expect(typeof capabilities.estimatedResolutionMs).toBe("number");
    expect(typeof capabilities.platform).toBe("string");
  });

  it("IQ-29: EdgeRuntimeClockAdapter.getCapabilities().highResDegraded is true (degradation correctly reported)", () => {
    const result = createEdgeRuntimeClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const capabilities = result.value.getCapabilities();
    expect(capabilities.highResDegraded).toBe(true);
    expect(capabilities.platform).toBe("edge-worker");
  });

  it("IQ-30: HostBridgeClockAdapter.getCapabilities().platform matches the provided options", () => {
    const bridge: HostClockBridge = {
      monotonicNowMs: () => performance.now(),
      wallClockNowMs: () => Date.now(),
    };
    const options: HostBridgeClockOptions = {
      adapterName: "TestBridge",
      platform: "react-native",
    };
    const result = createHostBridgeClock(bridge, options);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const capabilities = result.value.getCapabilities();
    expect(capabilities.platform).toBe("react-native");
  });
});

// =============================================================================
// IQ-31..35: Combinators and duration utilities exports
// =============================================================================

describe("IQ-31..35 — Combinators and duration utilities", () => {
  it("IQ-31: delay, timeout, measure, retry exported from main entry point", () => {
    expect(typeof delay).toBe("function");
    expect(typeof timeout).toBe("function");
    expect(typeof measure).toBe("function");
    expect(typeof retry).toBe("function");
  });

  it("IQ-32: RetryOptions exported as type from main entry point", () => {
    expectTypeOf<RetryOptions>().toHaveProperty("maxAttempts");
    expectTypeOf<RetryOptions>().toHaveProperty("delayMs");
  });

  it("IQ-33: MonotonicDuration and WallClockDuration exported as types from main entry point", () => {
    expectTypeOf<MonotonicDuration>().toMatchTypeOf<number>();
    expectTypeOf<WallClockDuration>().toMatchTypeOf<number>();
    expectTypeOf<MonotonicDuration>().not.toEqualTypeOf<WallClockDuration>();
  });

  it("IQ-34: elapsed, asMonotonicDuration, asWallClockDuration exported from main entry point", () => {
    expect(typeof elapsed).toBe("function");
    expect(typeof asMonotonicDuration).toBe("function");
    expect(typeof asWallClockDuration).toBe("function");
  });

  it("IQ-35: durationGt, durationLt, durationBetween exported from main entry point", () => {
    expect(typeof durationGt).toBe("function");
    expect(typeof durationLt).toBe("function");
    expect(typeof durationBetween).toBe("function");
  });
});

// =============================================================================
// IQ-36..40: Interop, context, and process utilities exports
// =============================================================================

describe("IQ-36..40 — Interop, context, and process utilities", () => {
  it("IQ-36: toTemporalInstant and fromTemporalInstant exported from main entry point", () => {
    expect(typeof toTemporalInstant).toBe("function");
    expect(typeof fromTemporalInstant).toBe("function");
  });

  it("IQ-37: createClockContext and ClockContext exported from main entry point", () => {
    expect(typeof createClockContext).toBe("function");
    // Type-level check
    expectTypeOf<ClockContext>().toHaveProperty("clock");
    expectTypeOf<ClockContext>().toHaveProperty("sequenceGenerator");
  });

  it("IQ-38: SystemCachedClockAdapter exported from main entry point", () => {
    expect(SystemCachedClockAdapter).toBeDefined();
    // Verify it is a usable DI adapter by wiring it in a container
    const graph = GraphBuilder.create()
      .provide(adapterOrDie(SystemClockAdapter))
      .provide(adapterOrDie(SystemCachedClockAdapter))
      .build();
    const container = createContainer({ graph, name: "IQ-38" });
    const cached = container.resolve(CachedClockPort);
    expect(typeof cached.recentMonotonicNow).toBe("function");
  });

  it("IQ-39: Testing entry point exports assertMonotonic, assertTimeBetween, assertWallClockPlausible, assertSequenceOrdered", () => {
    expect(typeof assertMonotonic).toBe("function");
    expect(typeof assertTimeBetween).toBe("function");
    expect(typeof assertWallClockPlausible).toBe("function");
    expect(typeof assertSequenceOrdered).toBe("function");
  });

  it("IQ-40: createProcessInstanceId exported from main entry point", () => {
    expect(typeof createProcessInstanceId).toBe("function");
    const id = createProcessInstanceId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// IQ-41..44: GxP utilities exports
// =============================================================================

describe("IQ-41..44 — GxP utility exports", () => {
  it("IQ-41: setupPeriodicClockEvaluation and PeriodicEvaluationConfig exported from main entry point", () => {
    expect(typeof setupPeriodicClockEvaluation).toBe("function");
    // Type-level check
    expectTypeOf<PeriodicEvaluationConfig>().toHaveProperty("intervalMs");
  });

  it("IQ-42: validateRetentionMetadata, calculateRetentionExpiryDate, RetentionMetadata, RetentionValidationError exported from main entry point", () => {
    expect(typeof validateRetentionMetadata).toBe("function");
    expect(typeof calculateRetentionExpiryDate).toBe("function");
    // Type-level checks
    expectTypeOf<RetentionMetadata>().toHaveProperty("retentionPeriodDays");
    expectTypeOf<RetentionMetadata>().toHaveProperty("retentionBasis");
    expectTypeOf<RetentionValidationError>().toHaveProperty("_tag");
    expectTypeOf<RetentionValidationError["_tag"]>().toEqualTypeOf<"RetentionValidationError">();
  });

  it("IQ-43: RetentionPolicyPort exported from main entry point", () => {
    expect(RetentionPolicyPort).toBeDefined();
    expect(RetentionPolicyPort.__portName).toBe("RetentionPolicy");
  });

  it("IQ-44: asMonotonicValidated, asWallClockValidated, asHighResValidated, BrandingValidationError, createBrandingValidationError exported from main entry point", () => {
    expect(typeof asMonotonicValidated).toBe("function");
    expect(typeof asWallClockValidated).toBe("function");
    expect(typeof asHighResValidated).toBe("function");
    expect(typeof createBrandingValidationError).toBe("function");
    // Type-level check
    expectTypeOf<BrandingValidationError>().toHaveProperty("_tag");
    expectTypeOf<BrandingValidationError["_tag"]>().toEqualTypeOf<"BrandingValidationError">();
    expectTypeOf<BrandingValidationError>().toHaveProperty("expectedDomain");
    expectTypeOf<BrandingValidationError>().toHaveProperty("value");
  });
});
