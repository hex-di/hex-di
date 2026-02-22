/**
 * EdgeRuntimeClock type-level tests — DoD 25
 */

import { describe, it, expectTypeOf } from "vitest";
import { createEdgeRuntimeClock } from "../src/adapters/edge-runtime-clock.js";
import type { EdgeRuntimeClockStartupError, EdgeRuntimeClockOptions } from "../src/adapters/edge-runtime-clock.js";
import type { ClockService } from "../src/ports/clock.js";
import type { ClockDiagnosticsService } from "../src/ports/diagnostics.js";
import type { Result } from "@hex-di/result";

describe("createEdgeRuntimeClock return type", () => {
  it("createEdgeRuntimeClock() returns Result<ClockService & ClockDiagnosticsService, EdgeRuntimeClockStartupError>", () => {
    expectTypeOf(createEdgeRuntimeClock()).toEqualTypeOf<
      Result<ClockService & ClockDiagnosticsService, EdgeRuntimeClockStartupError>
    >();
  });
});

describe("EdgeRuntimeClockOptions type shape", () => {
  it("EdgeRuntimeClockOptions has optional gxp (boolean | undefined)", () => {
    expectTypeOf<EdgeRuntimeClockOptions["gxp"]>().toEqualTypeOf<boolean | undefined>();
  });
});
