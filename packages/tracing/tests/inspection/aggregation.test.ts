/**
 * Tests for span aggregation functions.
 *
 * Verifies:
 * - Average duration computation
 * - Error count
 * - Cache hit rate
 * - Percentile computation (nearest-rank method)
 * - Trace tree building
 */

import { describe, it, expect } from "vitest";
import type { SpanData } from "../../src/types/index.js";
import {
  computeAverageDuration,
  computeErrorCount,
  computeCacheHitRate,
  computePercentiles,
  buildTraceTree,
} from "../../src/inspection/aggregation.js";

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

describe("computeAverageDuration", () => {
  it("should return undefined for empty spans", () => {
    expect(computeAverageDuration([])).toBeUndefined();
  });

  it("should compute correctly for multiple spans", () => {
    const spans = [
      createSpan({ startTime: 1000, endTime: 1100 }), // 100ms
      createSpan({ startTime: 2000, endTime: 2200 }), // 200ms
      createSpan({ startTime: 3000, endTime: 3300 }), // 300ms
    ];

    expect(computeAverageDuration(spans)).toBe(200);
  });

  it("should handle single span", () => {
    const spans = [createSpan({ startTime: 1000, endTime: 1050 })]; // 50ms
    expect(computeAverageDuration(spans)).toBe(50);
  });
});

describe("computeErrorCount", () => {
  it("should count error status spans", () => {
    const spans = [
      createSpan({ status: "ok" }),
      createSpan({ status: "error" }),
      createSpan({ status: "unset" }),
      createSpan({ status: "error" }),
    ];

    expect(computeErrorCount(spans)).toBe(2);
  });

  it("should return 0 when no errors", () => {
    const spans = [createSpan({ status: "ok" }), createSpan({ status: "unset" })];

    expect(computeErrorCount(spans)).toBe(0);
  });

  it("should return 0 for empty array", () => {
    expect(computeErrorCount([])).toBe(0);
  });
});

describe("computeCacheHitRate", () => {
  it("should return undefined for spans without cached attribute", () => {
    const spans = [createSpan({ attributes: { "hex-di.port.name": "Svc" } })];
    expect(computeCacheHitRate(spans)).toBeUndefined();
  });

  it("should compute correctly with mixed cached/uncached", () => {
    const spans = [
      createSpan({ attributes: { "hex-di.resolution.cached": true } }),
      createSpan({ attributes: { "hex-di.resolution.cached": false } }),
      createSpan({ attributes: { "hex-di.resolution.cached": true } }),
      createSpan({ attributes: { "hex-di.resolution.cached": false } }),
    ];

    expect(computeCacheHitRate(spans)).toBe(0.5);
  });

  it("should return 1 when all are cache hits", () => {
    const spans = [
      createSpan({ attributes: { "hex-di.resolution.cached": true } }),
      createSpan({ attributes: { "hex-di.resolution.cached": true } }),
    ];

    expect(computeCacheHitRate(spans)).toBe(1);
  });

  it("should return 0 when all are cache misses", () => {
    const spans = [createSpan({ attributes: { "hex-di.resolution.cached": false } })];

    expect(computeCacheHitRate(spans)).toBe(0);
  });

  it("should return undefined for empty array", () => {
    expect(computeCacheHitRate([])).toBeUndefined();
  });
});

describe("computePercentiles", () => {
  it("should compute using nearest-rank method", () => {
    // Durations: 10, 20, 30, 40, 50, 60, 70, 80, 90, 100
    const spans = [];
    for (let i = 1; i <= 10; i++) {
      spans.push(createSpan({ startTime: 1000, endTime: 1000 + i * 10 }));
    }

    const result = computePercentiles(spans, [50, 90, 99]);

    // p50: ceil(0.5 * 10) = 5 → index 4 → 50ms
    expect(result[50]).toBe(50);
    // p90: ceil(0.9 * 10) = 9 → index 8 → 90ms
    expect(result[90]).toBe(90);
    // p99: ceil(0.99 * 10) = 10 → index 9 → 100ms
    expect(result[99]).toBe(100);
  });

  it("should return 0 for all percentiles when empty", () => {
    const result = computePercentiles([], [50, 90, 99]);
    expect(result[50]).toBe(0);
    expect(result[90]).toBe(0);
    expect(result[99]).toBe(0);
  });

  it("should handle single span", () => {
    const spans = [createSpan({ startTime: 1000, endTime: 1042 })]; // 42ms

    const result = computePercentiles(spans, [50, 99]);
    expect(result[50]).toBe(42);
    expect(result[99]).toBe(42);
  });
});

describe("buildTraceTree", () => {
  it("should return undefined for unknown traceId", () => {
    const spans = [createSpan({ traceId: "aaaa0000aaaa0000aaaa0000aaaa0000" })];

    expect(buildTraceTree(spans, "bbbb0000bbbb0000bbbb0000bbbb0000")).toBeUndefined();
  });

  it("should build correct parent-child hierarchy", () => {
    const traceId = "aaaa0000aaaa0000aaaa0000aaaa0000";
    const spans = [
      createSpan({
        traceId,
        spanId: "root000000000000",
        name: "root",
      }),
      createSpan({
        traceId,
        spanId: "child00000000000",
        parentSpanId: "root000000000000",
        name: "child",
      }),
    ];

    const tree = buildTraceTree(spans, traceId);
    expect(tree).toBeDefined();
    expect(tree?.span.name).toBe("root");
    expect(tree?.children).toHaveLength(1);
    expect(tree?.children[0].span.name).toBe("child");
    expect(tree?.children[0].children).toHaveLength(0);
  });

  it("should handle multiple levels deep", () => {
    const traceId = "aaaa0000aaaa0000aaaa0000aaaa0000";
    const spans = [
      createSpan({
        traceId,
        spanId: "root000000000000",
        name: "root",
      }),
      createSpan({
        traceId,
        spanId: "child00000000000",
        parentSpanId: "root000000000000",
        name: "child",
      }),
      createSpan({
        traceId,
        spanId: "grand00000000000",
        parentSpanId: "child00000000000",
        name: "grandchild",
      }),
    ];

    const tree = buildTraceTree(spans, traceId);
    expect(tree).toBeDefined();
    expect(tree?.span.name).toBe("root");
    expect(tree?.children).toHaveLength(1);
    expect(tree?.children[0].span.name).toBe("child");
    expect(tree?.children[0].children).toHaveLength(1);
    expect(tree?.children[0].children[0].span.name).toBe("grandchild");
    expect(tree?.children[0].children[0].children).toHaveLength(0);
  });

  it("should return undefined for empty spans", () => {
    expect(buildTraceTree([], "aaaa0000aaaa0000aaaa0000aaaa0000")).toBeUndefined();
  });

  it("should handle multiple children of same parent", () => {
    const traceId = "aaaa0000aaaa0000aaaa0000aaaa0000";
    const spans = [
      createSpan({
        traceId,
        spanId: "root000000000000",
        name: "root",
      }),
      createSpan({
        traceId,
        spanId: "child10000000000",
        parentSpanId: "root000000000000",
        name: "child-1",
      }),
      createSpan({
        traceId,
        spanId: "child20000000000",
        parentSpanId: "root000000000000",
        name: "child-2",
      }),
    ];

    const tree = buildTraceTree(spans, traceId);
    expect(tree).toBeDefined();
    expect(tree?.children).toHaveLength(2);
  });
});
