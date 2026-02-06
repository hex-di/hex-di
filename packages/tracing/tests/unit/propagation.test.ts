/**
 * Tests for W3C Trace Context parsing and propagation.
 *
 * Verifies:
 * - traceparent header parsing (valid/invalid)
 * - traceparent header formatting
 * - Case-insensitive header extraction
 * - Context injection into headers
 * - All-zeros rejection per W3C spec
 * - tracestate passthrough
 */

import { describe, it, expect } from "vitest";
import {
  parseTraceparent,
  formatTraceparent,
  extractTraceContext,
  injectTraceContext,
} from "../../src/index.js";

describe("parseTraceparent", () => {
  it("should parse a valid traceparent header", () => {
    const context = parseTraceparent("00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01");
    expect(context).toBeDefined();
    expect(context?.traceId).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
    expect(context?.spanId).toBe("00f067aa0ba902b7");
    expect(context?.traceFlags).toBe(1);
  });

  it("should parse unsampled trace (flags=00)", () => {
    const context = parseTraceparent("00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00");
    expect(context).toBeDefined();
    expect(context?.traceFlags).toBe(0);
  });

  it("should reject all-zeros trace ID", () => {
    const context = parseTraceparent("00-00000000000000000000000000000000-00f067aa0ba902b7-01");
    expect(context).toBeUndefined();
  });

  it("should reject all-zeros span ID", () => {
    const context = parseTraceparent("00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01");
    expect(context).toBeUndefined();
  });

  it("should reject non-00 version", () => {
    const context = parseTraceparent("01-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01");
    expect(context).toBeUndefined();
  });

  it("should reject wrong number of parts", () => {
    expect(parseTraceparent("00-abc-01")).toBeUndefined();
    expect(parseTraceparent("")).toBeUndefined();
    expect(parseTraceparent("00-a-b-c-d")).toBeUndefined();
  });

  it("should reject invalid hex in trace ID", () => {
    const context = parseTraceparent("00-ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ-00f067aa0ba902b7-01");
    expect(context).toBeUndefined();
  });

  it("should reject invalid hex in span ID", () => {
    const context = parseTraceparent("00-4bf92f3577b34da6a3ce929d0e0e4736-ZZZZZZZZZZZZZZZZ-01");
    expect(context).toBeUndefined();
  });

  it("should reject invalid flags", () => {
    const context = parseTraceparent("00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-zz");
    expect(context).toBeUndefined();
  });

  it("should reject short trace ID", () => {
    const context = parseTraceparent("00-4bf92f3577b34da6-00f067aa0ba902b7-01");
    expect(context).toBeUndefined();
  });

  it("should reject short span ID", () => {
    const context = parseTraceparent("00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa-01");
    expect(context).toBeUndefined();
  });

  it("should reject uppercase hex in trace ID", () => {
    const context = parseTraceparent("00-4BF92F3577B34DA6A3CE929D0E0E4736-00f067aa0ba902b7-01");
    expect(context).toBeUndefined();
  });
});

describe("formatTraceparent", () => {
  it("should format a span context as traceparent header", () => {
    const header = formatTraceparent({
      traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
      spanId: "00f067aa0ba902b7",
      traceFlags: 1,
    });
    expect(header).toBe("00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01");
  });

  it("should pad single-digit flags with leading zero", () => {
    const header = formatTraceparent({
      traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
      spanId: "00f067aa0ba902b7",
      traceFlags: 0,
    });
    expect(header).toContain("-00");
    expect(header).toBe("00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00");
  });

  it("should round-trip with parseTraceparent", () => {
    const original = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
    const context = parseTraceparent(original);
    expect(context).toBeDefined();
    if (context) {
      const formatted = formatTraceparent(context);
      expect(formatted).toBe(original);
    }
  });
});

describe("extractTraceContext", () => {
  it("should extract from standard traceparent header", () => {
    const context = extractTraceContext({
      traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
    });
    expect(context).toBeDefined();
    expect(context?.traceId).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
  });

  it("should handle case-insensitive header names", () => {
    const context = extractTraceContext({
      Traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
    });
    expect(context).toBeDefined();
    expect(context?.traceId).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
  });

  it("should handle UPPERCASE header names", () => {
    const context = extractTraceContext({
      TRACEPARENT: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
    });
    expect(context).toBeDefined();
    expect(context?.traceId).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
  });

  it("should return undefined when no traceparent header", () => {
    const context = extractTraceContext({});
    expect(context).toBeUndefined();
  });

  it("should return undefined for invalid traceparent", () => {
    const context = extractTraceContext({
      traceparent: "invalid",
    });
    expect(context).toBeUndefined();
  });

  it("should include tracestate when present", () => {
    const context = extractTraceContext({
      traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      tracestate: "vendor1=value1,vendor2=value2",
    });
    expect(context).toBeDefined();
    expect(context?.traceState).toBe("vendor1=value1,vendor2=value2");
  });

  it("should handle case-insensitive tracestate header", () => {
    const context = extractTraceContext({
      Traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      Tracestate: "vendor=value",
    });
    expect(context).toBeDefined();
    expect(context?.traceState).toBe("vendor=value");
  });

  it("should work without tracestate", () => {
    const context = extractTraceContext({
      traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
    });
    expect(context).toBeDefined();
    expect(context?.traceState).toBeUndefined();
  });
});

describe("injectTraceContext", () => {
  it("should inject traceparent header", () => {
    const headers: Record<string, string> = {};
    injectTraceContext(
      {
        traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
        spanId: "00f067aa0ba902b7",
        traceFlags: 1,
      },
      headers
    );

    expect(headers.traceparent).toBe("00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01");
  });

  it("should inject tracestate when present", () => {
    const headers: Record<string, string> = {};
    injectTraceContext(
      {
        traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
        spanId: "00f067aa0ba902b7",
        traceFlags: 1,
        traceState: "vendor=value",
      },
      headers
    );

    expect(headers.tracestate).toBe("vendor=value");
  });

  it("should not inject tracestate when absent", () => {
    const headers: Record<string, string> = {};
    injectTraceContext(
      {
        traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
        spanId: "00f067aa0ba902b7",
        traceFlags: 1,
      },
      headers
    );

    expect(headers.tracestate).toBeUndefined();
  });

  it("should round-trip with extractTraceContext", () => {
    const original = {
      traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
      spanId: "00f067aa0ba902b7",
      traceFlags: 1,
      traceState: "vendor=val",
    };

    const headers: Record<string, string> = {};
    injectTraceContext(original, headers);

    const extracted = extractTraceContext(headers);
    expect(extracted).toBeDefined();
    expect(extracted?.traceId).toBe(original.traceId);
    expect(extracted?.spanId).toBe(original.spanId);
    expect(extracted?.traceFlags).toBe(original.traceFlags);
    expect(extracted?.traceState).toBe(original.traceState);
  });
});
