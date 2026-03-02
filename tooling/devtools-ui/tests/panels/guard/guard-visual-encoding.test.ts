/**
 * Unit tests for Guard Panel visual encoding utilities.
 *
 * Spec: 10-visual-encoding.md Sections 10.1-10.12
 */

import { describe, it, expect } from "vitest";
import {
  formatGuardDuration,
  getAllowRateZoneColor,
  getDecisionColor,
  getPolicyKindColor,
  getPolicyKindIcon,
} from "../../../src/panels/guard/visual-encoding.js";
import type { PolicyKind } from "@hex-di/guard";

// ── getDecisionColor ────────────────────────────────────────────────────────

describe("getDecisionColor", () => {
  it("maps all 4 decisions to distinct CSS custom property names", () => {
    const decisions = ["allow", "deny", "error", "skip"] as const;
    const colors = decisions.map(getDecisionColor);

    expect(new Set(colors).size).toBe(4);
    for (const color of colors) {
      expect(color).toMatch(/^var\(--hex-guard-/);
    }
  });

  it("returns allow color for 'allow'", () => {
    expect(getDecisionColor("allow")).toBe("var(--hex-guard-allow)");
  });

  it("returns deny color for 'deny'", () => {
    expect(getDecisionColor("deny")).toBe("var(--hex-guard-deny)");
  });
});

// ── getPolicyKindColor ──────────────────────────────────────────────────────

describe("getPolicyKindColor", () => {
  it("maps all 10 policy kinds to distinct CSS custom property names", () => {
    const kinds: readonly PolicyKind[] = [
      "hasPermission",
      "hasRole",
      "hasAttribute",
      "hasResourceAttribute",
      "hasSignature",
      "hasRelationship",
      "allOf",
      "anyOf",
      "not",
      "labeled",
    ];

    const colors = kinds.map(getPolicyKindColor);

    expect(new Set(colors).size).toBe(10);
    for (const color of colors) {
      expect(color).toMatch(/^var\(--hex-kind-/);
    }
  });
});

// ── getPolicyKindIcon ───────────────────────────────────────────────────────

describe("getPolicyKindIcon", () => {
  it("maps all 10 policy kinds to distinct icon characters", () => {
    const kinds: readonly PolicyKind[] = [
      "hasPermission",
      "hasRole",
      "hasAttribute",
      "hasResourceAttribute",
      "hasSignature",
      "hasRelationship",
      "allOf",
      "anyOf",
      "not",
      "labeled",
    ];

    const icons = kinds.map(getPolicyKindIcon);

    expect(new Set(icons).size).toBe(10);
    for (const icon of icons) {
      expect(icon.length).toBeGreaterThan(0);
    }
  });
});

// ── formatGuardDuration ─────────────────────────────────────────────────────

describe("formatGuardDuration", () => {
  it("returns '<0.01ms' for very small durations", () => {
    expect(formatGuardDuration(0)).toBe("<0.01ms");
    expect(formatGuardDuration(0.005)).toBe("<0.01ms");
  });

  it("returns fractional milliseconds for sub-ms durations", () => {
    expect(formatGuardDuration(0.42)).toBe("0.42ms");
    expect(formatGuardDuration(0.1)).toBe("0.1ms");
  });

  it("returns 1 decimal for durations < 10ms", () => {
    expect(formatGuardDuration(1.23)).toBe("1.2ms");
    expect(formatGuardDuration(9.87)).toBe("9.9ms");
  });

  it("returns integer for durations >= 10ms", () => {
    expect(formatGuardDuration(145)).toBe("145ms");
    expect(formatGuardDuration(999)).toBe("999ms");
  });

  it("returns seconds for >= 1000ms", () => {
    expect(formatGuardDuration(2300)).toBe("2.3s");
    expect(formatGuardDuration(59000)).toBe("59s");
  });

  it("returns minutes and seconds for >= 60s", () => {
    expect(formatGuardDuration(83_000)).toBe("1m 23s");
    expect(formatGuardDuration(120_000)).toBe("2m 0s");
  });
});

// ── getAllowRateZoneColor ───────────────────────────────────────────────────

describe("getAllowRateZoneColor", () => {
  it("returns 'green' for rate >= 95%", () => {
    expect(getAllowRateZoneColor(0.95)).toBe("green");
    expect(getAllowRateZoneColor(1.0)).toBe("green");
  });

  it("returns 'amber' for rate between 80% and 95%", () => {
    expect(getAllowRateZoneColor(0.8)).toBe("amber");
    expect(getAllowRateZoneColor(0.94)).toBe("amber");
  });

  it("returns 'red' for rate below 80%", () => {
    expect(getAllowRateZoneColor(0.79)).toBe("red");
    expect(getAllowRateZoneColor(0)).toBe("red");
  });
});
