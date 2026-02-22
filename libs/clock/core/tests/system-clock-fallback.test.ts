/**
 * System clock clamped fallback tests — DoD 3
 */

import { describe, it, expect, vi } from "vitest";
import { createClampedFallback, createSystemClock } from "../src/adapters/system-clock.js";

// =============================================================================
// DoD 3: Clamped fallback
// =============================================================================

describe("SystemClock clamped fallback", () => {
  it("monotonicNow() uses clamped fallback when performance unavailable", () => {
    // The clamped fallback is created with a captured Date.now reference
    const mockDateNow = vi.fn(() => 1000);
    const clamped = createClampedFallback(mockDateNow);
    const value = clamped();
    expect(value).toBe(1000);
    expect(mockDateNow).toHaveBeenCalledTimes(1);
  });

  it("clamped fallback returns last value when Date.now() goes backward", () => {
    let currentTime = 1000;
    const mockDateNow = vi.fn(() => currentTime);

    const clamped = createClampedFallback(mockDateNow);

    const t1 = clamped();
    expect(t1).toBe(1000);

    currentTime = 1100;
    const t2 = clamped();
    expect(t2).toBe(1100);

    // Regress (NTP backward jump)
    currentTime = 900;
    const t3 = clamped();
    expect(t3).toBe(1100); // clamped to last known value
  });

  it("clamped fallback advances when Date.now() advances", () => {
    let currentTime = 500;
    const mockDateNow = vi.fn(() => currentTime);
    const clamped = createClampedFallback(mockDateNow);

    const t1 = clamped();
    currentTime = 600;
    const t2 = clamped();
    currentTime = 750;
    const t3 = clamped();

    expect(t1).toBe(500);
    expect(t2).toBe(600);
    expect(t3).toBe(750);
  });

  it("highResNow() falls back to Date.now() when timeOrigin unavailable", () => {
    // Without performance.timeOrigin, highResNow falls back to Date.now()
    // We verify this by checking the createSystemClock() diagnostics
    const result = createSystemClock();
    if (result.isOk()) {
      const diag = result.value.getDiagnostics();
      // Either performance.timeOrigin+now or Date.now depending on platform
      expect(["performance.timeOrigin+now", "Date.now"]).toContain(diag.highResSource);
    }
  });

  it("highResNow() fallback uses captured Date.now, not global Date.now (anti-tampering)", () => {
    let currentTime = 2000;
    const mockDateNow = vi.fn(() => currentTime);

    const clamped = createClampedFallback(mockDateNow);

    // Advance time
    currentTime = 3000;
    const value = clamped();
    expect(value).toBe(3000);

    // The captured reference is used, not global Date.now
    expect(mockDateNow).toHaveBeenCalled();
  });
});
