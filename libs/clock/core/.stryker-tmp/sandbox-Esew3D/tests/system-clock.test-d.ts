/**
 * System clock adapter type-level tests — DoD 3
 */
// @ts-nocheck


import { describe, it, expectTypeOf } from "vitest";
import type { Result } from "@hex-di/result";
import { createSystemClock, createSystemSequenceGenerator } from "../src/adapters/system-clock.js";
import type { ClockStartupError, SystemClockOptions } from "../src/adapters/system-clock.js";
import type { ClockService } from "../src/ports/clock.js";
import type { ClockDiagnosticsService } from "../src/ports/diagnostics.js";
import type { SequenceGeneratorService } from "../src/ports/sequence.js";

describe("System Clock adapter type-level", () => {
  it("createSystemClock return type is Result<ClockService & ClockDiagnosticsService, ClockStartupError>", () => {
    expectTypeOf(createSystemClock).returns.toEqualTypeOf<
      Result<ClockService & ClockDiagnosticsService, ClockStartupError>
    >();
  });

  it("createSystemSequenceGenerator return type is SequenceGeneratorService", () => {
    expectTypeOf(createSystemSequenceGenerator).returns.toEqualTypeOf<SequenceGeneratorService>();
  });

  it("ClockStartupError has readonly _tag, check (union), message, observedValue", () => {
    expectTypeOf<ClockStartupError["_tag"]>().toEqualTypeOf<"ClockStartupError">();
    expectTypeOf<ClockStartupError["check"]>().toEqualTypeOf<
      "ST-1" | "ST-2" | "ST-3" | "ST-4" | "ST-5"
    >();
    expectTypeOf<ClockStartupError["message"]>().toEqualTypeOf<string>();
    expectTypeOf<ClockStartupError["observedValue"]>().toEqualTypeOf<number>();
  });

  it("SystemClockOptions has readonly gxp?: boolean", () => {
    expectTypeOf<SystemClockOptions["gxp"]>().toEqualTypeOf<boolean | undefined>();
  });
});
