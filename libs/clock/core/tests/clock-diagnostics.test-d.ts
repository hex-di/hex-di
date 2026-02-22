/**
 * Clock Diagnostics Port type-level tests — DoD 6
 */

import { describe, it, expectTypeOf } from "vitest";
import { ClockDiagnosticsPort } from "../src/ports/diagnostics.js";
import type { ClockDiagnosticsService, ClockDiagnostics, ClockCapabilities } from "../src/ports/diagnostics.js";

describe("ClockDiagnosticsPort type shape", () => {
  it("ClockDiagnosticsPort has getDiagnostics and getCapabilities methods", () => {
    expectTypeOf<ClockDiagnosticsService>().toHaveProperty("getDiagnostics");
    expectTypeOf<ClockDiagnosticsService>().toHaveProperty("getCapabilities");
  });

  it("ClockDiagnostics has all required readonly fields", () => {
    expectTypeOf<ClockDiagnostics["adapterName"]>().toEqualTypeOf<string>();
    expectTypeOf<ClockDiagnostics["platformResolutionMs"]>().toEqualTypeOf<number | undefined>();
    expectTypeOf<ClockDiagnostics["cryptoFipsMode"]>().toEqualTypeOf<boolean | undefined>();
  });

  it("monotonicSource is a union type of known sources (including 'host-bridge')", () => {
    expectTypeOf<ClockDiagnostics["monotonicSource"]>().toEqualTypeOf<
      "performance.now" | "Date.now-clamped" | "host-bridge"
    >();
  });

  it("highResSource is a union type of known sources (including 'host-bridge', 'host-bridge-wallclock')", () => {
    expectTypeOf<ClockDiagnostics["highResSource"]>().toEqualTypeOf<
      | "performance.timeOrigin+now"
      | "Date.now"
      | "host-bridge"
      | "host-bridge-wallclock"
    >();
  });

  it("ClockCapabilities has all 7 fields", () => {
    expectTypeOf<ClockCapabilities["hasMonotonicTime"]>().toEqualTypeOf<boolean>();
    expectTypeOf<ClockCapabilities["hasHighResOrigin"]>().toEqualTypeOf<boolean>();
    expectTypeOf<ClockCapabilities["crossOriginIsolated"]>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<ClockCapabilities["estimatedResolutionMs"]>().toEqualTypeOf<number>();
    expectTypeOf<ClockCapabilities["highResDegraded"]>().toEqualTypeOf<boolean>();
    expectTypeOf<ClockCapabilities["monotonicDegraded"]>().toEqualTypeOf<boolean>();
  });

  it("ClockDiagnosticsPort is defined as a directed port", () => {
    expectTypeOf(ClockDiagnosticsPort).toHaveProperty("__portName");
  });
});
