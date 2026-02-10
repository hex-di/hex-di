/**
 * Unit tests for DataDog APM bridge.
 *
 * Tests verify span creation, lifecycle management, and dd-trace integration.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import { createDataDogBridge } from "../../src/bridge.js";
import type { DdSpan, DdTracer } from "../../src/types.js";
import type { SpanData } from "@hex-di/tracing";
import { mapSpanKindToDataDog } from "../../src/utils.js";

/**
 * Helper to create test SpanData with optional overrides
 */
function createTestSpanData(
  name: string,
  startTime: number,
  endTime: number,
  overrides?: Partial<SpanData>
): SpanData {
  return {
    context: {
      traceId: "trace123",
      spanId: name,
      traceFlags: 1,
    },
    name,
    kind: "internal",
    startTime,
    endTime,
    status: "ok",
    attributes: {},
    events: [],
    links: [],
    parentSpanId: undefined,
    ...overrides,
  };
}

/**
 * Helper to create a mock dd-trace span
 */
function createMockDdSpan(spanId: string): DdSpan {
  return {
    _spanId: spanId,
    setTag: vi.fn(),
    finish: vi.fn(),
  } as any;
}

/**
 * Helper to create a mock dd-trace tracer
 */
function createMockDdTracer(): DdTracer {
  const spans = new Map<string, DdSpan>();

  return {
    startSpan: vi.fn((name: string, _options?: any) => {
      const span = createMockDdSpan(name);
      spans.set(name, span);
      return span;
    }),
    flush: vi.fn(() => Promise.resolve()),
    _mockSpans: spans,
  } as any;
}

describe("createDataDogBridge", () => {
  let mockTracer: DdTracer & { _mockSpans: Map<string, DdSpan> };

  beforeEach(() => {
    mockTracer = createMockDdTracer() as any;
  });

  it("should create dd-trace spans with correct timing", async () => {
    const bridge = createDataDogBridge({ tracer: mockTracer });
    const spanData = createTestSpanData("test-span", 1000, 2000);

    await bridge.export([spanData]);

    expect(mockTracer.startSpan).toHaveBeenCalledWith("test-span", {
      startTime: 1000,
      childOf: undefined,
      tags: {},
    });

    const mockSpan = mockTracer._mockSpans.get("test-span");
    expect(mockSpan).toBeDefined();
    expect(mockSpan!.finish).toHaveBeenCalledWith(2000);
  });

  it("should convert HexDI attributes to DataDog tags", async () => {
    const bridge = createDataDogBridge({ tracer: mockTracer });
    const spanData = createTestSpanData("test", 1000, 2000, {
      attributes: {
        "http.method": "GET",
        "http.url": "/api/users",
        "custom.tag": "value",
      },
    });

    await bridge.export([spanData]);

    const mockSpan = mockTracer._mockSpans.get("test");
    expect(mockSpan!.setTag).toHaveBeenCalledWith("span.kind", "custom");
    expect(mockSpan!.setTag).toHaveBeenCalledWith("http.method", "GET");
    expect(mockSpan!.setTag).toHaveBeenCalledWith("http.url", "/api/users");
    expect(mockSpan!.setTag).toHaveBeenCalledWith("custom.tag", "value");
  });

  it("should map span.kind to DataDog conventions", async () => {
    const bridge = createDataDogBridge({ tracer: mockTracer });
    const spanData = createTestSpanData("test", 1000, 2000, {
      kind: "server",
    });

    await bridge.export([spanData]);

    const mockSpan = mockTracer._mockSpans.get("test");
    expect(mockSpan!.setTag).toHaveBeenCalledWith("span.kind", "web");
  });

  it("should set DataDog-specific trace context tags", async () => {
    const bridge = createDataDogBridge({ tracer: mockTracer });
    const spanData = createTestSpanData("test", 1000, 2000);

    await bridge.export([spanData]);

    const mockSpan = mockTracer._mockSpans.get("test");
    expect(mockSpan!.setTag).toHaveBeenCalledWith("dd.trace_id", "trace123");
    expect(mockSpan!.setTag).toHaveBeenCalledWith("dd.span_id", "test");
  });

  it("should set duration_ms tag", async () => {
    const bridge = createDataDogBridge({ tracer: mockTracer });
    const spanData = createTestSpanData("test", 1000, 2500);

    await bridge.export([spanData]);

    const mockSpan = mockTracer._mockSpans.get("test");
    expect(mockSpan!.setTag).toHaveBeenCalledWith("duration_ms", 1500);
  });

  it("should set service metadata tags when provided in config", async () => {
    const bridge = createDataDogBridge({
      tracer: mockTracer,
      serviceName: "my-service",
      environment: "production",
      version: "1.2.3",
    });
    const spanData = createTestSpanData("test", 1000, 2000);

    await bridge.export([spanData]);

    const mockSpan = mockTracer._mockSpans.get("test");
    expect(mockSpan!.setTag).toHaveBeenCalledWith("service.name", "my-service");
    expect(mockSpan!.setTag).toHaveBeenCalledWith("env", "production");
    expect(mockSpan!.setTag).toHaveBeenCalledWith("version", "1.2.3");
  });

  it("should not set service metadata tags when not provided", async () => {
    const bridge = createDataDogBridge({ tracer: mockTracer });
    const spanData = createTestSpanData("test", 1000, 2000);

    await bridge.export([spanData]);

    const mockSpan = mockTracer._mockSpans.get("test");
    const setTagCalls = (mockSpan!.setTag as any).mock.calls as Array<[string, unknown]>;
    const tagKeys = setTagCalls.map((call: [string, unknown]) => call[0]);
    expect(tagKeys).not.toContain("service.name");
    expect(tagKeys).not.toContain("env");
    expect(tagKeys).not.toContain("version");
  });

  it("should set dd.parent_id tag when parent span exists", async () => {
    const bridge = createDataDogBridge({ tracer: mockTracer });
    const spanData = createTestSpanData("child", 1000, 2000, {
      parentSpanId: "parent-123",
    });

    await bridge.export([spanData]);

    const mockSpan = mockTracer._mockSpans.get("child");
    expect(mockSpan!.setTag).toHaveBeenCalledWith("dd.parent_id", "parent-123");
  });

  it("should handle parent-child relationships via childOf", async () => {
    const bridge = createDataDogBridge({ tracer: mockTracer });

    // Export parent and child in same batch - child should NOT find parent
    // because parent is finished and cleaned up before child is processed
    const parentData = createTestSpanData("parent", 1000, 3000);
    const childData = createTestSpanData("child", 1500, 2500, {
      parentSpanId: "parent",
    });

    await bridge.export([parentData, childData]);

    // Both spans created, but child has no parent reference (already cleaned up)
    expect(mockTracer.startSpan).toHaveBeenCalledTimes(2);
    expect(mockTracer.startSpan).toHaveBeenNthCalledWith(1, "parent", {
      startTime: 1000,
      childOf: undefined,
      tags: {},
    });
    expect(mockTracer.startSpan).toHaveBeenNthCalledWith(2, "child", {
      startTime: 1500,
      childOf: undefined, // Parent already finished and removed from activeSpans
      tags: {},
    });
  });

  it("should handle error status by setting error tag", async () => {
    const bridge = createDataDogBridge({ tracer: mockTracer });
    const spanData = createTestSpanData("test", 1000, 2000, {
      status: "error",
      attributes: {
        "error.message": "Something went wrong",
      },
    });

    await bridge.export([spanData]);

    const mockSpan = mockTracer._mockSpans.get("test");
    expect(mockSpan!.setTag).toHaveBeenCalledWith("error", true);
    expect(mockSpan!.setTag).toHaveBeenCalledWith("error.message", "Something went wrong");
  });

  it("should handle error status with error.type attribute", async () => {
    const bridge = createDataDogBridge({ tracer: mockTracer });
    const spanData = createTestSpanData("test", 1000, 2000, {
      status: "error",
      attributes: {
        "error.message": "Not found",
        "error.type": "NotFoundError",
      },
    });

    await bridge.export([spanData]);

    const mockSpan = mockTracer._mockSpans.get("test");
    expect(mockSpan!.setTag).toHaveBeenCalledWith("error", true);
    expect(mockSpan!.setTag).toHaveBeenCalledWith("error.type", "NotFoundError");
  });

  it("should set resource.name tag from operation name or span name", async () => {
    const bridge = createDataDogBridge({ tracer: mockTracer });

    // Test with operation name attribute
    const spanData1 = createTestSpanData("test1", 1000, 2000, {
      attributes: { "operation.name": "custom-operation" },
    });
    await bridge.export([spanData1]);

    const mockSpan1 = mockTracer._mockSpans.get("test1");
    expect(mockSpan1!.setTag).toHaveBeenCalledWith("resource.name", "custom-operation");

    // Test without operation name - falls back to span name
    const spanData2 = createTestSpanData("test2", 1000, 2000);
    await bridge.export([spanData2]);

    const mockSpan2 = mockTracer._mockSpans.get("test2");
    expect(mockSpan2!.setTag).toHaveBeenCalledWith("resource.name", "test2");
  });

  it("should serialize span events as tags", async () => {
    const bridge = createDataDogBridge({ tracer: mockTracer });
    const spanData = createTestSpanData("test", 1000, 2000, {
      events: [
        {
          name: "exception",
          time: 1500,
          attributes: { "exception.type": "Error", "exception.message": "Failed" },
        },
        {
          name: "cache-hit",
          time: 1600,
          attributes: { "cache.key": "user:123" },
        },
      ],
    });

    await bridge.export([spanData]);

    const mockSpan = mockTracer._mockSpans.get("test");
    expect(mockSpan!.setTag).toHaveBeenCalledWith("span.events.count", 2);
    expect(mockSpan!.setTag).toHaveBeenCalledWith("event.0.name", "exception");
    expect(mockSpan!.setTag).toHaveBeenCalledWith("event.0.time", 1500);
    expect(mockSpan!.setTag).toHaveBeenCalledWith("event.0.exception.type", "Error");
    expect(mockSpan!.setTag).toHaveBeenCalledWith("event.0.exception.message", "Failed");
    expect(mockSpan!.setTag).toHaveBeenCalledWith("event.1.name", "cache-hit");
    expect(mockSpan!.setTag).toHaveBeenCalledWith("event.1.time", 1600);
    expect(mockSpan!.setTag).toHaveBeenCalledWith("event.1.cache.key", "user:123");
  });

  it("should clean up active spans after export", async () => {
    const bridge = createDataDogBridge({ tracer: mockTracer });

    // Export a parent span
    const parentData = createTestSpanData("parent", 1000, 2000);
    await bridge.export([parentData]);

    // Verify parent is NOT in active spans - it was cleaned up after finish
    const childData1 = createTestSpanData("child1", 1100, 1900, {
      parentSpanId: "parent",
    });
    await bridge.export([childData1]);

    // First child should NOT find parent (parent was cleaned up)
    expect(mockTracer.startSpan).toHaveBeenNthCalledWith(2, "child1", {
      startTime: 1100,
      childOf: undefined, // Parent already cleaned up
      tags: {},
    });

    // Export another child - child1 should also be gone
    const childData2 = createTestSpanData("child2", 1200, 1800, {
      parentSpanId: "child1",
    });
    await bridge.export([childData2]);

    expect(mockTracer.startSpan).toHaveBeenNthCalledWith(3, "child2", {
      startTime: 1200,
      childOf: undefined, // child1 already cleaned up too
      tags: {},
    });
  });

  it("should delegate forceFlush to dd-trace tracer", async () => {
    const bridge = createDataDogBridge({ tracer: mockTracer });

    await bridge.forceFlush();

    expect(mockTracer.flush).toHaveBeenCalledTimes(1);
  });

  it("should handle forceFlush when tracer returns void", async () => {
    mockTracer.flush = vi.fn(); // Returns void

    const bridge = createDataDogBridge({ tracer: mockTracer });

    // Should not throw
    await expect(bridge.forceFlush()).resolves.toBeUndefined();
  });

  it("should handle forceFlush errors gracefully", async () => {
    mockTracer.flush = vi.fn(() => Promise.reject(new Error("Flush failed")));

    const bridge = createDataDogBridge({ tracer: mockTracer });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Should not throw
    await expect(bridge.forceFlush()).resolves.toBeUndefined();

    // Should log the error
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleErrorSpy.mock.calls[0]![0]).toContain("forceFlush failed");

    consoleErrorSpy.mockRestore();
  });

  it("should clear active spans on shutdown", async () => {
    const bridge = createDataDogBridge({ tracer: mockTracer });

    // Export some spans
    await bridge.export([createTestSpanData("span1", 1000, 2000)]);
    await bridge.export([createTestSpanData("span2", 1000, 2000)]);

    // Shutdown should clear active spans
    await bridge.shutdown();

    // After shutdown, export should be a no-op
    await bridge.export([createTestSpanData("child", 3000, 4000)]);

    // Only the first 2 exports should have created spans
    expect(mockTracer.startSpan).toHaveBeenCalledTimes(2);
  });

  it("should be idempotent on shutdown", async () => {
    const bridge = createDataDogBridge({ tracer: mockTracer });

    // First shutdown
    await bridge.shutdown();
    expect(mockTracer.flush).toHaveBeenCalledTimes(1);

    // Second shutdown should be a no-op
    await bridge.shutdown();
    expect(mockTracer.flush).toHaveBeenCalledTimes(1);
  });

  it("should handle shutdown errors gracefully", async () => {
    mockTracer.flush = vi.fn(() => Promise.reject(new Error("Shutdown failed")));

    const bridge = createDataDogBridge({ tracer: mockTracer });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Should not throw
    await expect(bridge.shutdown()).resolves.toBeUndefined();

    // Should log the error
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleErrorSpy.mock.calls[0]![0]).toContain("shutdown failed");

    consoleErrorSpy.mockRestore();
  });

  it("should no-op export after shutdown", async () => {
    const bridge = createDataDogBridge({ tracer: mockTracer });
    await bridge.shutdown();

    // Export after shutdown should be a no-op
    await expect(bridge.export([createTestSpanData("test", 1000, 2000)])).resolves.toBeUndefined();
    expect(mockTracer.startSpan).not.toHaveBeenCalled();
  });

  it("should no-op forceFlush after shutdown", async () => {
    const bridge = createDataDogBridge({ tracer: mockTracer });
    await bridge.shutdown();

    // Reset flush call count
    (mockTracer.flush as ReturnType<typeof vi.fn>).mockClear();

    // forceFlush after shutdown should be a no-op
    await expect(bridge.forceFlush()).resolves.toBeUndefined();
    expect(mockTracer.flush).not.toHaveBeenCalled();
  });

  it("should handle individual span export errors without failing entire batch", async () => {
    const bridge = createDataDogBridge({ tracer: mockTracer });

    // Make setTag throw for one span
    mockTracer.startSpan = vi.fn((name: string) => {
      const span = createMockDdSpan(name);
      if (name === "bad-span") {
        span.setTag = vi.fn(() => {
          throw new Error("Tag error");
        });
      }
      return span;
    });

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const spans = [
      createTestSpanData("good-span-1", 1000, 2000),
      createTestSpanData("bad-span", 1000, 2000),
      createTestSpanData("good-span-2", 1000, 2000),
    ];

    // Should not throw - continues processing other spans
    await expect(bridge.export(spans)).resolves.toBeUndefined();

    // Should log the error for bad span
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleErrorSpy.mock.calls[0]![0]).toContain("Failed to export span bad-span");

    // All three spans should have been attempted
    expect(mockTracer.startSpan).toHaveBeenCalledTimes(3);

    consoleErrorSpy.mockRestore();
  });

  it("should handle batch export errors gracefully", async () => {
    mockTracer.startSpan = vi.fn(() => {
      throw new Error("startSpan failed");
    });

    const bridge = createDataDogBridge({ tracer: mockTracer });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const spans = [createTestSpanData("test", 1000, 2000)];

    // Should not throw - graceful degradation
    await expect(bridge.export(spans)).resolves.toBeUndefined();

    // Should log the error - individual span error, not batch error
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleErrorSpy.mock.calls[0]![0]).toContain("Failed to export span test");

    consoleErrorSpy.mockRestore();
  });

  it("should handle empty span batches", async () => {
    const bridge = createDataDogBridge({ tracer: mockTracer });

    // Empty array should not throw
    await expect(bridge.export([])).resolves.toBeUndefined();

    // Should not attempt to start any spans
    expect(mockTracer.startSpan).not.toHaveBeenCalled();
  });

  it("should handle spans with minimal fields", async () => {
    const bridge = createDataDogBridge({ tracer: mockTracer });

    const minimalSpan: SpanData = {
      context: { traceId: "t", spanId: "s", traceFlags: 0 },
      name: "minimal",
      kind: "internal",
      startTime: 1000,
      endTime: 2000,
      status: "unset",
      attributes: {},
      events: [],
      links: [],
      parentSpanId: undefined,
    };

    // Should not throw
    await expect(bridge.export([minimalSpan])).resolves.toBeUndefined();

    // Should create span
    expect(mockTracer.startSpan).toHaveBeenCalledWith("minimal", {
      startTime: 1000,
      childOf: undefined,
      tags: {},
    });
  });
});

describe("mapSpanKindToDataDog", () => {
  it("should map server to web", () => {
    expect(mapSpanKindToDataDog("server")).toBe("web");
  });

  it("should map client to http", () => {
    expect(mapSpanKindToDataDog("client")).toBe("http");
  });

  it("should map internal to custom", () => {
    expect(mapSpanKindToDataDog("internal")).toBe("custom");
  });

  it("should map producer to worker", () => {
    expect(mapSpanKindToDataDog("producer")).toBe("worker");
  });

  it("should map consumer to worker", () => {
    expect(mapSpanKindToDataDog("consumer")).toBe("worker");
  });
});
