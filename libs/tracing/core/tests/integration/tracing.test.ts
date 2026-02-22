/**
 * Integration tests for @hex-di/tracing package.
 *
 * Verifies:
 * - End-to-end tracing workflow
 * - W3C Trace Context round-trip compliance
 * - Cross-adapter interoperability
 * - Complete public API surface from main exports
 */

import { describe, it, expect } from "vitest";
import * as TracingExports from "../../src/index.js";
import { getPortMetadata } from "@hex-di/core";
import {
  createMemoryTracer,
  parseTraceparent,
  formatTraceparent,
  extractTraceContext,
  injectTraceContext,
  generateTraceId,
  generateSpanId,
  isValidTraceId,
  isValidSpanId,
  NOOP_TRACER,
  NOOP_SPAN,
  NoOpTracerAdapter,
  MemoryTracerAdapter,
  ConsoleTracerAdapter,
  TracerPort,
  SpanExporterPort,
  SpanProcessorPort,
  TraceContextVar,
  ActiveSpanVar,
  CorrelationIdVar,
} from "../../src/index.js";

describe("end-to-end tracing workflow", () => {
  it("should trace a complete request lifecycle", () => {
    const tracer = createMemoryTracer();

    tracer.withSpan("http.request", requestSpan => {
      requestSpan.setAttribute("http.method", "GET");
      requestSpan.setAttribute("http.url", "/api/users/123");

      tracer.withSpan("db.query", dbSpan => {
        dbSpan.setAttribute("db.system", "postgresql");
        dbSpan.setAttribute("db.statement", "SELECT * FROM users WHERE id=$1");
      });

      tracer.withSpan("cache.set", cacheSpan => {
        cacheSpan.setAttribute("cache.key", "user:123");
        cacheSpan.setStatus("ok");
      });

      requestSpan.setAttribute("http.status_code", 200);
    });

    const spans = tracer.getCollectedSpans();
    expect(spans).toHaveLength(3);

    // Verify hierarchy: all share same traceId
    const traceId = spans[0].context.traceId;
    expect(spans.every(s => s.context.traceId === traceId)).toBe(true);

    // db.query and cache.set should be children of http.request
    const dbSpan = spans.find(s => s.name === "db.query");
    const cacheSpan = spans.find(s => s.name === "cache.set");
    const requestSpan = spans.find(s => s.name === "http.request");

    expect(dbSpan?.parentSpanId).toBe(requestSpan?.context.spanId);
    expect(cacheSpan?.parentSpanId).toBe(requestSpan?.context.spanId);

    // Verify attributes
    expect(requestSpan?.attributes["http.method"]).toBe("GET");
    expect(requestSpan?.attributes["http.status_code"]).toBe(200);
    expect(dbSpan?.attributes["db.system"]).toBe("postgresql");
    expect(cacheSpan?.attributes["cache.key"]).toBe("user:123");
  });

  it("should handle error propagation across spans", async () => {
    const tracer = createMemoryTracer();

    await expect(
      tracer.withSpanAsync("http.request", async () => {
        return tracer.withSpanAsync("db.query", async () => {
          throw new Error("Connection refused");
        });
      })
    ).rejects.toThrow("Connection refused");

    const spans = tracer.getCollectedSpans();
    expect(spans).toHaveLength(2);

    // Both spans should have error status
    expect(spans[0].status).toBe("error"); // db.query
    expect(spans[1].status).toBe("error"); // http.request
  });
});

describe("W3C Trace Context round-trip", () => {
  it("should propagate context through HTTP headers", () => {
    const tracer = createMemoryTracer();

    // Service A: Create span and inject context into outgoing headers
    const outgoingHeaders: Record<string, string> = {};
    tracer.withSpan("service-a.request", span => {
      injectTraceContext(span.context, outgoingHeaders);
    });

    // Verify headers were injected
    expect(outgoingHeaders.traceparent).toBeDefined();

    // Service B: Extract context from incoming headers
    const extractedContext = extractTraceContext(outgoingHeaders);
    expect(extractedContext).toBeDefined();

    // Verify trace continuity
    const serviceASpan = tracer.getCollectedSpans()[0];
    expect(extractedContext?.traceId).toBe(serviceASpan.context.traceId);
    expect(extractedContext?.spanId).toBe(serviceASpan.context.spanId);
  });

  it("should complete format/parse/extract/inject round-trip", () => {
    const traceId = generateTraceId();
    const spanId = generateSpanId();
    const traceFlags = 0x01;

    // Step 1: Format as traceparent
    const formatted = formatTraceparent({ traceId, spanId, traceFlags });
    expect(formatted).toContain(traceId);
    expect(formatted).toContain(spanId);

    // Step 2: Parse the formatted header
    const parsed = parseTraceparent(formatted);
    expect(parsed?.traceId).toBe(traceId);
    expect(parsed?.spanId).toBe(spanId);
    expect(parsed?.traceFlags).toBe(traceFlags);

    // Step 3: Inject into headers
    const headers: Record<string, string> = {};
    if (parsed) {
      injectTraceContext(parsed, headers);
    }
    expect(headers.traceparent).toBe(formatted);

    // Step 4: Extract from headers
    const extracted = extractTraceContext(headers);
    expect(extracted?.traceId).toBe(traceId);
    expect(extracted?.spanId).toBe(spanId);
  });

  it("should validate generated IDs", () => {
    for (let i = 0; i < 100; i++) {
      const traceId = generateTraceId();
      const spanId = generateSpanId();

      expect(isValidTraceId(traceId)).toBe(true);
      expect(isValidSpanId(spanId)).toBe(true);

      // Verify they work in traceparent headers
      const header = formatTraceparent({
        traceId,
        spanId,
        traceFlags: 0x01,
      });
      const parsed = parseTraceparent(header);
      expect(parsed).toBeDefined();
    }
  });
});

describe("public API surface", () => {
  it("should export all ports", () => {
    expect(TracerPort).toBeDefined();
    expect(SpanExporterPort).toBeDefined();
    expect(SpanProcessorPort).toBeDefined();
  });

  it("should export all adapter values", () => {
    expect(NoOpTracerAdapter).toBeDefined();
    expect(MemoryTracerAdapter).toBeDefined();
    expect(ConsoleTracerAdapter).toBeDefined();
    expect(NOOP_TRACER).toBeDefined();
    expect(NOOP_SPAN).toBeDefined();
  });

  it("should export context propagation functions", () => {
    expect(typeof parseTraceparent).toBe("function");
    expect(typeof formatTraceparent).toBe("function");
    expect(typeof extractTraceContext).toBe("function");
    expect(typeof injectTraceContext).toBe("function");
  });

  it("should export context variables", () => {
    expect(TraceContextVar).toBeDefined();
    expect(ActiveSpanVar).toBeDefined();
    expect(CorrelationIdVar).toBeDefined();
  });

  it("should export utility functions", () => {
    expect(typeof generateTraceId).toBe("function");
    expect(typeof generateSpanId).toBe("function");
    expect(typeof isValidTraceId).toBe("function");
    expect(typeof isValidSpanId).toBe("function");
  });

  it("should export all expected runtime values", () => {
    const exports: Record<string, unknown> = { ...TracingExports };

    const expectedExports = [
      // Ports
      "TracerPort",
      "SpanExporterPort",
      "SpanProcessorPort",
      // NoOp adapter
      "NoOpTracerAdapter",
      "NOOP_TRACER",
      "NOOP_SPAN",
      // Memory adapter
      "MemoryTracerAdapter",
      "MemoryTracer",
      "createMemoryTracer",
      "MemorySpan",
      // Console adapter
      "ConsoleTracerAdapter",
      "createConsoleTracer",
      "ConsoleTracer",
      // Context propagation
      "parseTraceparent",
      "formatTraceparent",
      "extractTraceContext",
      "injectTraceContext",
      // Context variables
      "TraceContextVar",
      "ActiveSpanVar",
      "CorrelationIdVar",
      // Utilities
      "generateTraceId",
      "generateSpanId",
      "isAttributeValue",
      "isSpanKind",
      "isSpanStatus",
      "isValidTraceId",
      "isValidSpanId",
      "getHighResTimestamp",
      "formatDuration",
      // Instrumentation
      "instrumentContainer",
      "instrumentContainerTree",
      "createTracingHook",
      "evaluatePortFilter",
      "isPredicateFilter",
      "isDeclarativeFilter",
      "DEFAULT_INSTRUMENT_OPTIONS",
      "matchesPortPattern",
      "shouldTracePort",
      "pushSpan",
      "popSpan",
      "getActiveSpan",
      "clearStack",
      "getStackDepth",
      // Testing utilities
      "assertSpanExists",
      "hasAttribute",
      "hasEvent",
      "hasStatus",
      "hasDuration",
      // Inspection
      "matchesFilter",
      "filterSpans",
      "computeAverageDuration",
      "computeErrorCount",
      "computeCacheHitRate",
      "computePercentiles",
      "buildTraceTree",
      "createTracingQueryApi",
      "TracingLibraryInspectorPort",
      "createTracingLibraryInspector",
      "TracingQueryApiPort",
      "TracingLibraryInspectorAdapter",
      // Bridge
      "TracerLikePort",
      "createTracerLikeAdapter",
      "tracerLikeAdapter",
      // GxP: Attribute filtering
      "createAttributeFilter",
      "createFilteringProcessor",
      // GxP: Tracing warnings
      "warnTracingDisabled",
      "suppressTracingWarnings",
      // GxP: Async context
      "initAsyncSpanContext",
      "runInAsyncContext",
    ];

    // Verify all expected exports exist
    for (const name of expectedExports) {
      expect(exports[name], `Expected export '${name}' to exist`).toBeDefined();
    }

    // Verify no unexpected exports
    const actualExports = Object.keys(exports);
    expect(actualExports.sort()).toEqual(expectedExports.sort());
  });
});

describe("tracing port metadata category for library detection", () => {
  it("TracerPort sets category to tracing/tracer", () => {
    expect(getPortMetadata(TracerPort)?.category).toBe("tracing/tracer");
  });

  it("SpanProcessorPort sets category to tracing/processor", () => {
    expect(getPortMetadata(SpanProcessorPort)?.category).toBe("tracing/processor");
  });

  it("SpanExporterPort sets category to tracing/exporter", () => {
    expect(getPortMetadata(SpanExporterPort)?.category).toBe("tracing/exporter");
  });
});
