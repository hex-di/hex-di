/**
 * HostBridgeClock type-level tests — DoD 26
 */
// @ts-nocheck


import { describe, it, expectTypeOf } from "vitest";
import type { HostClockBridge, HostBridgeClockOptions } from "../src/adapters/host-bridge-clock.js";
import { createHostBridgeClock } from "../src/adapters/host-bridge-clock.js";
import type { ClockService } from "../src/ports/clock.js";
import type { ClockDiagnosticsService } from "../src/ports/diagnostics.js";
import type { ClockStartupError } from "../src/adapters/system-clock.js";
import type { Result } from "@hex-di/result";

describe("HostClockBridge type shape", () => {
  it("HostClockBridge has monotonicNowMs() returning number", () => {
    expectTypeOf<HostClockBridge["monotonicNowMs"]>().returns.toEqualTypeOf<number>();
  });

  it("HostClockBridge has wallClockNowMs() returning number", () => {
    expectTypeOf<HostClockBridge["wallClockNowMs"]>().returns.toEqualTypeOf<number>();
  });

  it("HostClockBridge has optional highResNowMs (() => number | undefined)", () => {
    expectTypeOf<HostClockBridge["highResNowMs"]>().toEqualTypeOf<
      (() => number) | undefined
    >();
  });
});

describe("HostBridgeClockOptions type shape", () => {
  it("HostBridgeClockOptions has required adapterName (string)", () => {
    expectTypeOf<HostBridgeClockOptions["adapterName"]>().toEqualTypeOf<string>();
  });

  it("HostBridgeClockOptions has required platform union", () => {
    expectTypeOf<HostBridgeClockOptions["platform"]>().toEqualTypeOf<
      "react-native" | "wasm" | "unknown"
    >();
  });

  it("HostBridgeClockOptions has optional gxp (boolean | undefined)", () => {
    expectTypeOf<HostBridgeClockOptions["gxp"]>().toEqualTypeOf<boolean | undefined>();
  });
});

describe("createHostBridgeClock return type", () => {
  it("createHostBridgeClock returns Result<ClockService & ClockDiagnosticsService, ClockStartupError>", () => {
    const bridge: HostClockBridge = {
      monotonicNowMs: () => performance.now(),
      wallClockNowMs: () => Date.now(),
    };
    expectTypeOf(createHostBridgeClock(bridge, { adapterName: "T", platform: "unknown" }))
      .toEqualTypeOf<Result<ClockService & ClockDiagnosticsService, ClockStartupError>>();
  });
});
