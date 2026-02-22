/**
 * GxP tracestate validation tests.
 *
 * Verifies W3C Trace Context tracestate header validation
 * including size limits, member counts, and format checks.
 */

import { describe, it, expect } from "vitest";
import { extractTraceContext } from "../../src/index.js";

const VALID_TRACEPARENT = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";

describe("tracestate validation", () => {
  it("should accept valid tracestate", () => {
    const context = extractTraceContext({
      traceparent: VALID_TRACEPARENT,
      tracestate: "vendor1=value1,vendor2=value2",
    });
    expect(context).toBeDefined();
    expect(context?.traceState).toBe("vendor1=value1,vendor2=value2");
  });

  it("should reject tracestate exceeding 512 characters", () => {
    const longValue = "vendor=" + "x".repeat(510);
    expect(longValue.length).toBeGreaterThan(512);

    const context = extractTraceContext({
      traceparent: VALID_TRACEPARENT,
      tracestate: longValue,
    });
    // Context should still be extracted (traceparent is valid)
    expect(context).toBeDefined();
    // But tracestate should be dropped
    expect(context?.traceState).toBeUndefined();
  });

  it("should reject tracestate with more than 32 members", () => {
    const members = Array.from({ length: 33 }, (_, i) => `v${i}=val${i}`);
    const tracestate = members.join(",");

    const context = extractTraceContext({
      traceparent: VALID_TRACEPARENT,
      tracestate,
    });
    expect(context).toBeDefined();
    expect(context?.traceState).toBeUndefined();
  });

  it("should reject empty tracestate", () => {
    const context = extractTraceContext({
      traceparent: VALID_TRACEPARENT,
      tracestate: "",
    });
    expect(context).toBeDefined();
    // Empty tracestate is falsy, so it's simply not included
    expect(context?.traceState).toBeUndefined();
  });

  it("should reject tracestate without '=' in members", () => {
    const context = extractTraceContext({
      traceparent: VALID_TRACEPARENT,
      tracestate: "vendor1_no_equals,vendor2=ok",
    });
    expect(context).toBeDefined();
    // Invalid tracestate dropped
    expect(context?.traceState).toBeUndefined();
  });

  it("should propagate traceparent even when tracestate is rejected", () => {
    const context = extractTraceContext({
      traceparent: VALID_TRACEPARENT,
      tracestate: "invalid_no_equals",
    });
    expect(context).toBeDefined();
    expect(context?.traceId).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
    expect(context?.spanId).toBe("00f067aa0ba902b7");
    expect(context?.traceState).toBeUndefined();
  });
});
