/**
 * Tests for tracing types: hasTracingAccess() and DEFAULT_RETENTION_POLICY.
 */

import { describe, it, expect } from "vitest";
import { hasTracingAccess, DEFAULT_RETENTION_POLICY } from "../src/index.js";

// =============================================================================
// hasTracingAccess()
// =============================================================================

describe("hasTracingAccess()", () => {
  const TRACING_SYMBOL = Symbol.for("hex-di/tracing-access");

  it("returns true for an object with the tracing access symbol", () => {
    const container = {
      [TRACING_SYMBOL]: {
        getTraces: () => [],
        getStats: () => ({}),
        pause: () => {},
        resume: () => {},
        clear: () => {},
        subscribe: () => () => {},
        isPaused: () => false,
        pin: () => {},
        unpin: () => {},
      },
    };
    expect(hasTracingAccess(container)).toBe(true);
  });

  it("returns false for null", () => {
    expect(hasTracingAccess(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(hasTracingAccess(undefined)).toBe(false);
  });

  it("returns false for a string", () => {
    expect(hasTracingAccess("container")).toBe(false);
  });

  it("returns false for a number", () => {
    expect(hasTracingAccess(42)).toBe(false);
  });

  it("returns false for an empty object (missing tracing symbol)", () => {
    expect(hasTracingAccess({})).toBe(false);
  });

  it("returns false for an object with a different symbol", () => {
    const container = {
      [Symbol.for("other-symbol")]: {},
    };
    expect(hasTracingAccess(container)).toBe(false);
  });

  it("returns true when tracing symbol is present even with other properties", () => {
    const container = {
      [TRACING_SYMBOL]: {},
      resolve: () => {},
      createScope: () => {},
    };
    expect(hasTracingAccess(container)).toBe(true);
  });
});

// =============================================================================
// DEFAULT_RETENTION_POLICY
// =============================================================================

describe("DEFAULT_RETENTION_POLICY", () => {
  it("has maxTraces set to 1000", () => {
    expect(DEFAULT_RETENTION_POLICY.maxTraces).toBe(1000);
  });

  it("has maxPinnedTraces set to 100", () => {
    expect(DEFAULT_RETENTION_POLICY.maxPinnedTraces).toBe(100);
  });

  it("has slowThresholdMs set to 100", () => {
    expect(DEFAULT_RETENTION_POLICY.slowThresholdMs).toBe(100);
  });

  it("has expiryMs set to 300000", () => {
    expect(DEFAULT_RETENTION_POLICY.expiryMs).toBe(300000);
  });
});
