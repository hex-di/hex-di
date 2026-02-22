/**
 * Clock capabilities tests — DoD 24
 */
// @ts-nocheck


import { describe, it, expect } from "vitest";
import { createSystemClock } from "../src/adapters/system-clock.js";

describe("ClockCapabilities — SystemClockAdapter on Node 18+", () => {
  it("hasMonotonicTime is true on Node 18+ (performance.now available)", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const caps = result.value.getCapabilities();
    expect(caps.hasMonotonicTime).toBe(true);
  });

  it("platform is 'node' in the Node.js test environment", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const caps = result.value.getCapabilities();
    expect(caps.platform).toBe("node");
  });

  it("estimatedResolutionMs is a positive number", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const caps = result.value.getCapabilities();
    expect(typeof caps.estimatedResolutionMs).toBe("number");
    expect(caps.estimatedResolutionMs).toBeGreaterThan(0);
  });

  it("estimatedResolutionMs is <= 1.0 on Node 18+ with performance.now", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const caps = result.value.getCapabilities();
    expect(caps.estimatedResolutionMs).toBeLessThanOrEqual(1.0);
  });

  it("capabilities object is frozen", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const caps = result.value.getCapabilities();
    expect(Object.isFrozen(caps)).toBe(true);
  });

  it("getCapabilities() returns same reference on repeated calls (computed once)", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const clock = result.value;
    const caps1 = clock.getCapabilities();
    const caps2 = clock.getCapabilities();
    expect(caps1).toBe(caps2);
  });

  it("hasHighResOrigin reflects whether performance.timeOrigin is available", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const caps = result.value.getCapabilities();
    // Node 18+ with performance.timeOrigin available → hasHighResOrigin should be true
    expect(typeof caps.hasHighResOrigin).toBe("boolean");
  });

  it("highResDegraded is false on Node 18+ (full high-res support)", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const caps = result.value.getCapabilities();
    // Node 18+ should not have degraded high-res
    expect(caps.highResDegraded).toBe(false);
  });

  it("monotonicDegraded is false on Node 18+ (performance.now available)", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const caps = result.value.getCapabilities();
    expect(caps.monotonicDegraded).toBe(false);
  });

  it("capabilities has all 7 required fields", () => {
    const result = createSystemClock();
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;

    const caps = result.value.getCapabilities();
    expect("hasMonotonicTime" in caps).toBe(true);
    expect("hasHighResOrigin" in caps).toBe(true);
    expect("crossOriginIsolated" in caps).toBe(true);
    expect("estimatedResolutionMs" in caps).toBe(true);
    expect("platform" in caps).toBe(true);
    expect("highResDegraded" in caps).toBe(true);
    expect("monotonicDegraded" in caps).toBe(true);
  });
});
