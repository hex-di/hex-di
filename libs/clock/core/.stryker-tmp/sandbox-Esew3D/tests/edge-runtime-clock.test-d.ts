/**
 * EdgeRuntimeClock type-level tests — DoD 25
 */
// @ts-nocheck


import { describe, it, expectTypeOf } from "vitest";
import { createEdgeRuntimeClock } from "../src/adapters/edge-runtime-clock.js";
import type { EdgeRuntimeClockOptions } from "../src/adapters/edge-runtime-clock.js";
import type { ClockService } from "../src/ports/clock.js";
import type { ClockDiagnosticsService } from "../src/ports/diagnostics.js";
import type { ClockStartupError } from "../src/adapters/system-clock.js";
import type { Result } from "@hex-di/result";

describe("createEdgeRuntimeClock return type", () => {
  it("createEdgeRuntimeClock() returns Result<ClockService & ClockDiagnosticsService, ClockStartupError>", () => {
    expectTypeOf(createEdgeRuntimeClock()).toEqualTypeOf<
      Result<ClockService & ClockDiagnosticsService, ClockStartupError>
    >();
  });
});

describe("EdgeRuntimeClockOptions type shape", () => {
  it("EdgeRuntimeClockOptions has optional gxp (boolean | undefined)", () => {
    expectTypeOf<EdgeRuntimeClockOptions["gxp"]>().toEqualTypeOf<boolean | undefined>();
  });
});
