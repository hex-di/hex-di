/**
 * HardwareClockAdapter interface type-level tests — DoD 15/16
 */

import { describe, it, expectTypeOf } from "vitest";
import type {
  HardwareClockAdapter,
  HardwareClockAdapterOptions,
  HardwareClockStatus,
} from "../src/adapters/hardware-clock.js";
import type { ClockService } from "../src/ports/clock.js";
import type { ClockDiagnosticsService } from "../src/ports/diagnostics.js";

describe("HardwareClockAdapter type shape", () => {
  it("HardwareClockAdapter extends ClockPort (has monotonicNow, wallClockNow, highResNow)", () => {
    expectTypeOf<HardwareClockAdapter>().toMatchTypeOf<ClockService>();
  });

  it("HardwareClockAdapter extends ClockDiagnosticsPort (has getDiagnostics, getCapabilities)", () => {
    expectTypeOf<HardwareClockAdapter>().toMatchTypeOf<ClockDiagnosticsService>();
  });

  it("HardwareClockAdapter has readonly getHardwareStatus method returning HardwareClockStatus", () => {
    expectTypeOf<HardwareClockAdapter>().toHaveProperty("getHardwareStatus");
    expectTypeOf<HardwareClockAdapter["getHardwareStatus"]>().returns.toEqualTypeOf<HardwareClockStatus>();
  });

  it("HardwareClockStatus has readonly locked, estimatedAccuracyMs, sourceType, lastSyncCheckAt", () => {
    expectTypeOf<HardwareClockStatus["locked"]>().toEqualTypeOf<boolean>();
    expectTypeOf<HardwareClockStatus["estimatedAccuracyMs"]>().toEqualTypeOf<number | undefined>();
    expectTypeOf<HardwareClockStatus["lastSyncCheckAt"]>().toEqualTypeOf<number | undefined>();
  });

  it("HardwareClockStatus.sourceType is 'gps' | 'ptp' | 'rtc' | 'atomic' | 'custom'", () => {
    expectTypeOf<HardwareClockStatus["sourceType"]>().toEqualTypeOf<
      "gps" | "ptp" | "rtc" | "atomic" | "custom"
    >();
  });

  it("HardwareClockAdapterOptions has readonly adapterName (string) and optional gxp (boolean)", () => {
    expectTypeOf<HardwareClockAdapterOptions["adapterName"]>().toEqualTypeOf<string>();
    expectTypeOf<HardwareClockAdapterOptions["gxp"]>().toEqualTypeOf<boolean | undefined>();
  });
});
