/**
 * Tests for span filtering functions.
 *
 * Verifies:
 * - Port name matching via attribute
 * - Scope ID matching via attribute
 * - Cached status matching via attribute
 * - Duration min/max filtering
 * - Time range filtering (since/until)
 * - Status filtering
 * - Trace ID filtering
 * - Combo filter with limit
 */

import { describe, it, expect } from "vitest";
import type { SpanData } from "../../src/types/index.js";
import { matchesFilter, filterSpans } from "../../src/inspection/filter.js";

/**
 * Helper to create a minimal SpanData for testing.
 */
function createSpan(overrides: {
  name?: string;
  startTime?: number;
  endTime?: number;
  status?: "unset" | "ok" | "error";
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  attributes?: Record<string, string | number | boolean | string[] | number[] | boolean[]>;
}): SpanData {
  return {
    context: {
      traceId: overrides.traceId ?? "aaaabbbbccccddddeeeeffffaaaabbbb",
      spanId: overrides.spanId ?? "1111222233334444",
      traceFlags: 0x01,
    },
    parentSpanId: overrides.parentSpanId,
    name: overrides.name ?? "test-span",
    kind: "internal",
    startTime: overrides.startTime ?? 1000,
    endTime: overrides.endTime ?? 1100,
    status: overrides.status ?? "ok",
    attributes: overrides.attributes ?? {},
    events: [],
    links: [],
  };
}

describe("matchesFilter", () => {
  it("should match by port name", () => {
    const span = createSpan({ attributes: { "hex-di.port.name": "UserService" } });

    expect(matchesFilter(span, { portName: "UserService" })).toBe(true);
    expect(matchesFilter(span, { portName: "OtherService" })).toBe(false);
  });

  it("should match by scope ID", () => {
    const span = createSpan({ attributes: { "hex-di.scope.id": "scope-123" } });

    expect(matchesFilter(span, { scopeId: "scope-123" })).toBe(true);
    expect(matchesFilter(span, { scopeId: "scope-999" })).toBe(false);
  });

  it("should match by cached status", () => {
    const cached = createSpan({ attributes: { "hex-di.resolution.cached": true } });
    const uncached = createSpan({ attributes: { "hex-di.resolution.cached": false } });

    expect(matchesFilter(cached, { cached: true })).toBe(true);
    expect(matchesFilter(cached, { cached: false })).toBe(false);
    expect(matchesFilter(uncached, { cached: false })).toBe(true);
    expect(matchesFilter(uncached, { cached: true })).toBe(false);
  });

  it("should filter by min/max duration", () => {
    const span = createSpan({ startTime: 1000, endTime: 1050 }); // 50ms duration

    expect(matchesFilter(span, { minDuration: 40 })).toBe(true);
    expect(matchesFilter(span, { minDuration: 60 })).toBe(false);
    expect(matchesFilter(span, { maxDuration: 60 })).toBe(true);
    expect(matchesFilter(span, { maxDuration: 40 })).toBe(false);
  });

  it("should filter by time range (since/until)", () => {
    const span = createSpan({ startTime: 1500, endTime: 1600 });

    expect(matchesFilter(span, { timeRange: { since: 1000 } })).toBe(true);
    expect(matchesFilter(span, { timeRange: { since: 2000 } })).toBe(false);
    expect(matchesFilter(span, { timeRange: { until: 2000 } })).toBe(true);
    expect(matchesFilter(span, { timeRange: { until: 1000 } })).toBe(false);
    expect(matchesFilter(span, { timeRange: { since: 1000, until: 2000 } })).toBe(true);
    expect(matchesFilter(span, { timeRange: { since: 1600, until: 2000 } })).toBe(false);
  });

  it("should filter by status", () => {
    const okSpan = createSpan({ status: "ok" });
    const errorSpan = createSpan({ status: "error" });

    expect(matchesFilter(okSpan, { status: "ok" })).toBe(true);
    expect(matchesFilter(okSpan, { status: "error" })).toBe(false);
    expect(matchesFilter(errorSpan, { status: "error" })).toBe(true);
  });

  it("should filter by trace ID", () => {
    const span = createSpan({ traceId: "aabb00112233445566778899aabbccdd" });

    expect(matchesFilter(span, { traceId: "aabb00112233445566778899aabbccdd" })).toBe(true);
    expect(matchesFilter(span, { traceId: "00000000000000000000000000000000" })).toBe(false);
  });

  it("should match when filter is empty", () => {
    const span = createSpan({});
    expect(matchesFilter(span, {})).toBe(true);
  });
});

describe("filterSpans", () => {
  it("should apply combo filter with limit", () => {
    const spans = [
      createSpan({
        name: "s1",
        status: "ok",
        startTime: 1000,
        endTime: 1050,
        attributes: { "hex-di.port.name": "Svc" },
      }),
      createSpan({
        name: "s2",
        status: "error",
        startTime: 1000,
        endTime: 1150,
        attributes: { "hex-di.port.name": "Svc" },
      }),
      createSpan({
        name: "s3",
        status: "ok",
        startTime: 1000,
        endTime: 1200,
        attributes: { "hex-di.port.name": "Svc" },
      }),
      createSpan({
        name: "s4",
        status: "ok",
        startTime: 1000,
        endTime: 1010,
        attributes: { "hex-di.port.name": "Other" },
      }),
    ];

    const result = filterSpans(spans, {
      portName: "Svc",
      status: "ok",
      limit: 1,
    });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("s1");
  });

  it("should return all matching spans when no limit", () => {
    const spans = [
      createSpan({ status: "ok" }),
      createSpan({ status: "error" }),
      createSpan({ status: "ok" }),
    ];

    const result = filterSpans(spans, { status: "ok" });
    expect(result).toHaveLength(2);
  });
});
