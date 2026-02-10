/**
 * Integration tests for the Tracing Query API.
 *
 * Uses MemoryTracer to create real spans and exercises the full
 * query API pipeline (source → filter → aggregation).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createMemoryTracer } from "../../src/adapters/memory/tracer.js";
import { createTracingQueryApi } from "../../src/inspection/query-api.js";
import type { TracingQueryAPI } from "../../src/inspection/types.js";
import type { MemoryTracer } from "../../src/adapters/memory/tracer.js";

describe("TracingQueryAPI", () => {
  let tracer: MemoryTracer;
  let api: TracingQueryAPI;

  beforeEach(() => {
    tracer = createMemoryTracer();
    api = createTracingQueryApi(() => tracer.getCollectedSpans());
  });

  /**
   * Helper: create a span with hex-di attributes via the tracer.
   */
  function createResolutionSpan(opts: {
    portName: string;
    cached?: boolean;
    error?: boolean;
    durationMs?: number;
    scopeId?: string;
  }): void {
    const span = tracer.startSpan(`resolve:${opts.portName}`, {
      attributes: {
        "hex-di.port.name": opts.portName,
        "hex-di.resolution.cached": opts.cached ?? false,
        ...(opts.scopeId ? { "hex-di.scope.id": opts.scopeId } : {}),
      },
    });

    if (opts.error) {
      span.recordException(new Error("resolution failed"));
      span.setStatus("error");
    } else {
      span.setStatus("ok");
    }

    // Simulate duration by setting end time explicitly
    // We can't control real time precisely, so we just end the span
    span.end();
  }

  describe("querySpans", () => {
    it("should filter spans by criteria", () => {
      createResolutionSpan({ portName: "UserService" });
      createResolutionSpan({ portName: "LogService" });
      createResolutionSpan({ portName: "UserService" });

      const result = api.querySpans({ portName: "UserService" });
      expect(result).toHaveLength(2);
    });
  });

  describe("getAverageDuration", () => {
    it("should return undefined when no spans", () => {
      expect(api.getAverageDuration("NonExistent")).toBeUndefined();
    });

    it("should compute average duration across matching spans", () => {
      createResolutionSpan({ portName: "Svc" });
      createResolutionSpan({ portName: "Svc" });

      const avg = api.getAverageDuration("Svc");
      // Durations will be very small (sub-ms) but should be defined
      expect(avg).toBeDefined();
      expect(typeof avg).toBe("number");
    });
  });

  describe("getErrorCount", () => {
    it("should count error spans", () => {
      createResolutionSpan({ portName: "Svc", error: false });
      createResolutionSpan({ portName: "Svc", error: true });
      createResolutionSpan({ portName: "Svc", error: true });

      expect(api.getErrorCount("Svc")).toBe(2);
    });

    it("should count all errors when no portName specified", () => {
      createResolutionSpan({ portName: "A", error: true });
      createResolutionSpan({ portName: "B", error: true });
      createResolutionSpan({ portName: "C", error: false });

      expect(api.getErrorCount()).toBe(2);
    });
  });

  describe("getCacheHitRate", () => {
    it("should compute cache hit rate", () => {
      createResolutionSpan({ portName: "Svc", cached: true });
      createResolutionSpan({ portName: "Svc", cached: false });

      const rate = api.getCacheHitRate("Svc");
      expect(rate).toBe(0.5);
    });

    it("should return undefined when no matching spans", () => {
      expect(api.getCacheHitRate("NonExistent")).toBeUndefined();
    });
  });

  describe("getPercentiles", () => {
    it("should compute percentiles for a port", () => {
      // Create several spans
      for (let i = 0; i < 10; i++) {
        createResolutionSpan({ portName: "Svc" });
      }

      const result = api.getPercentiles("Svc", [50, 90, 99]);
      expect(typeof result[50]).toBe("number");
      expect(typeof result[90]).toBe("number");
      expect(typeof result[99]).toBe("number");
    });
  });

  describe("getSlowResolutions", () => {
    it("should find spans slower than threshold", () => {
      createResolutionSpan({ portName: "A" });
      createResolutionSpan({ portName: "B" });

      // With threshold 0, all spans should match (duration >= 0)
      const result = api.getSlowResolutions(0);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it("should return empty for very high threshold", () => {
      createResolutionSpan({ portName: "A" });

      const result = api.getSlowResolutions(999999);
      expect(result).toHaveLength(0);
    });
  });

  describe("getErrorSpans", () => {
    it("should return only error spans", () => {
      createResolutionSpan({ portName: "Svc", error: false });
      createResolutionSpan({ portName: "Svc", error: true });
      createResolutionSpan({ portName: "Other", error: true });

      const result = api.getErrorSpans("Svc");
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("error");
    });

    it("should return all error spans when no portName", () => {
      createResolutionSpan({ portName: "A", error: true });
      createResolutionSpan({ portName: "B", error: true });

      const result = api.getErrorSpans();
      expect(result).toHaveLength(2);
    });
  });

  describe("getTraceTree", () => {
    it("should build a trace tree from nested spans", () => {
      // Create a parent-child hierarchy via the tracer
      tracer.withSpan("root-op", rootSpan => {
        rootSpan.setAttribute("hex-di.port.name", "Root");
        tracer.withSpan("child-op", childSpan => {
          childSpan.setAttribute("hex-di.port.name", "Child");
        });
      });

      const spans = tracer.getCollectedSpans();
      // Root span is the last one (parent ends after children)
      const rootSpan = spans[spans.length - 1];
      const traceId = rootSpan.context.traceId;

      const tree = api.getTraceTree(traceId);
      expect(tree).toBeDefined();
      expect(tree?.span.name).toBe("root-op");
      expect(tree?.children).toHaveLength(1);
      expect(tree?.children[0].span.name).toBe("child-op");
    });

    it("should return undefined for unknown trace", () => {
      expect(api.getTraceTree("00000000000000000000000000000000")).toBeUndefined();
    });
  });

  describe("getResolutionCount", () => {
    it("should count matching resolutions", () => {
      createResolutionSpan({ portName: "A" });
      createResolutionSpan({ portName: "A" });
      createResolutionSpan({ portName: "B" });

      expect(api.getResolutionCount("A")).toBe(2);
      expect(api.getResolutionCount()).toBe(3);
    });
  });
});
