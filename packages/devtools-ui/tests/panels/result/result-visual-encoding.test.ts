/**
 * Unit tests for Result Panel visual encoding utilities.
 *
 * Spec: 10-visual-encoding.md Sections 10.1-10.12
 */

import { describe, it, expect } from "vitest";
import {
  formatDuration,
  getCategoryColor,
  getCategoryIcon,
  getDurationBarColor,
  getStabilityZoneColor,
} from "../../../src/panels/result/visual-encoding.js";
import type { ResultCategoryName } from "../../../src/panels/result/types.js";

// ── formatDuration ──────────────────────────────────────────────────────────

describe("formatDuration", () => {
  it("returns '<1us' for 0 microseconds", () => {
    expect(formatDuration(0)).toBe("<1us");
  });

  it("returns '42us' for 42 microseconds", () => {
    expect(formatDuration(42)).toBe("42us");
  });

  it("returns '1.2ms' for 1200 microseconds", () => {
    expect(formatDuration(1200)).toBe("1.2ms");
  });

  it("returns '145ms' for 145000 microseconds", () => {
    expect(formatDuration(145_000)).toBe("145ms");
  });

  it("returns '2.3s' for 2300000 microseconds", () => {
    expect(formatDuration(2_300_000)).toBe("2.3s");
  });

  it("returns '1m 23s' for 83000000 microseconds", () => {
    expect(formatDuration(83_000_000)).toBe("1m 23s");
  });
});

// ── getCategoryColor ────────────────────────────────────────────────────────

describe("getCategoryColor", () => {
  it("maps all 9 categories to distinct CSS custom property names", () => {
    const categories: readonly ResultCategoryName[] = [
      "constructor",
      "transformation",
      "chaining",
      "recovery",
      "observation",
      "extraction",
      "conversion",
      "combinator",
      "generator",
    ];

    const colors = categories.map(getCategoryColor);

    // All distinct
    expect(new Set(colors).size).toBe(9);

    // All are CSS custom property references
    for (const color of colors) {
      expect(color).toMatch(/^var\(--hex-cat-/);
    }
  });
});

// ── getCategoryIcon ─────────────────────────────────────────────────────────

describe("getCategoryIcon", () => {
  it("maps all 9 categories to distinct icon characters", () => {
    const categories: readonly ResultCategoryName[] = [
      "constructor",
      "transformation",
      "chaining",
      "recovery",
      "observation",
      "extraction",
      "conversion",
      "combinator",
      "generator",
    ];

    const icons = categories.map(getCategoryIcon);

    // All distinct
    expect(new Set(icons).size).toBe(9);

    // All are non-empty strings
    for (const icon of icons) {
      expect(icon.length).toBeGreaterThan(0);
    }
  });
});

// ── getDurationBarColor ─────────────────────────────────────────────────────

describe("getDurationBarColor", () => {
  it("returns 'ok' for duration below p50", () => {
    expect(getDurationBarColor({ durationMicros: 100, p50: 500, p90: 1000, track: "ok" })).toBe(
      "ok"
    );
  });

  it("returns 'warning' for duration between p50 and p90", () => {
    expect(getDurationBarColor({ durationMicros: 700, p50: 500, p90: 1000, track: "ok" })).toBe(
      "warning"
    );
  });

  it("returns 'error' for duration above p90", () => {
    expect(getDurationBarColor({ durationMicros: 1500, p50: 500, p90: 1000, track: "ok" })).toBe(
      "error"
    );
  });

  it("returns 'error' for Err track regardless of duration", () => {
    expect(getDurationBarColor({ durationMicros: 10, p50: 500, p90: 1000, track: "err" })).toBe(
      "error"
    );
  });
});

// ── getStabilityZoneColor ───────────────────────────────────────────────────

describe("getStabilityZoneColor", () => {
  it("returns 'green' for stability >= 95%", () => {
    expect(getStabilityZoneColor(0.95)).toBe("green");
    expect(getStabilityZoneColor(1.0)).toBe("green");
  });

  it("returns 'amber' for stability between 80% and 95%", () => {
    expect(getStabilityZoneColor(0.8)).toBe("amber");
    expect(getStabilityZoneColor(0.94)).toBe("amber");
  });

  it("returns 'red' for stability below 80%", () => {
    expect(getStabilityZoneColor(0.79)).toBe("red");
    expect(getStabilityZoneColor(0)).toBe("red");
  });
});
