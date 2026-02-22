/**
 * Clock Source Bridge tests — DoD 14
 */

import { describe, it, expect } from "vitest";
import { createClockSourceBridge } from "../src/clock-source-bridge.js";
import { createSystemClock } from "../src/adapters/system-clock.js";

describe("createClockSourceBridge", () => {
  it("createClockSourceBridge() returns a frozen object", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const bridge = createClockSourceBridge(result.value);
    expect(Object.isFrozen(bridge)).toBe(true);
  });

  it("Bridge output is ISO 8601 UTC string with Z suffix", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const bridge = createClockSourceBridge(result.value);
    const iso = bridge.nowISO();
    expect(iso.endsWith("Z")).toBe(true);
  });

  it("Bridge calls wallClockNow() on the injected ClockPort", () => {
    let callCount = 0;
    const mockClock = {
      monotonicNow: () => 0 as never,
      highResNow: () => 0 as never,
      wallClockNow: () => {
        callCount++;
        return Date.now() as never;
      },
    };

    const bridge = createClockSourceBridge(mockClock);
    bridge.nowISO();
    expect(callCount).toBe(1);
    bridge.nowISO();
    expect(callCount).toBe(2);
  });

  it("Bridge output matches new Date(clock.wallClockNow()).toISOString()", () => {
    const fixedMs = 1700000000000;
    const mockClock = {
      monotonicNow: () => 0 as never,
      highResNow: () => 0 as never,
      wallClockNow: () => fixedMs as never,
    };

    const bridge = createClockSourceBridge(mockClock);
    expect(bridge.nowISO()).toBe(new Date(fixedMs).toISOString());
  });
});
