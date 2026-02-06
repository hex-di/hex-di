/**
 * Unit tests for SimpleSpanProcessor - immediate export behavior.
 *
 * Tests verify immediate export on span end, fire-and-forget behavior,
 * shutdown delegation, error handling, and no-op after shutdown.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { createSimpleSpanProcessor } from "../../src/processors/simple.js";
import type { SpanExporter, SpanData } from "@hex-di/tracing";

describe("createSimpleSpanProcessor", () => {
  let mockExporter: SpanExporter;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockExporter = {
      export: vi.fn().mockResolvedValue(undefined),
      forceFlush: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn().mockResolvedValue(undefined),
    };

    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  function createTestSpan(name: string): SpanData {
    return {
      context: { traceId: "trace", spanId: name, traceFlags: 1 },
      name,
      kind: "internal",
      startTime: Date.now(),
      endTime: Date.now() + 100,
      status: "ok",
      attributes: {},
      events: [],
      links: [],
      parentSpanId: undefined,
    };
  }

  it("should export immediately on span end", () => {
    const processor = createSimpleSpanProcessor(mockExporter);
    const span = createTestSpan("test");

    processor.onEnd(span);

    // Export called immediately (synchronously)
    expect(mockExporter.export).toHaveBeenCalledTimes(1);
    expect(mockExporter.export).toHaveBeenCalledWith([span]);
  });

  it("should export each span individually", () => {
    const processor = createSimpleSpanProcessor(mockExporter);
    const span1 = createTestSpan("span1");
    const span2 = createTestSpan("span2");
    const span3 = createTestSpan("span3");

    processor.onEnd(span1);
    processor.onEnd(span2);
    processor.onEnd(span3);

    // Each span exported in separate call
    expect(mockExporter.export).toHaveBeenCalledTimes(3);
    expect(mockExporter.export).toHaveBeenNthCalledWith(1, [span1]);
    expect(mockExporter.export).toHaveBeenNthCalledWith(2, [span2]);
    expect(mockExporter.export).toHaveBeenNthCalledWith(3, [span3]);
  });

  it("should not block on export (fire-and-forget)", async () => {
    // Make export slow
    let resolveExport: () => void;
    const exportPromise = new Promise<void>(resolve => {
      resolveExport = resolve;
    });

    mockExporter.export = vi.fn(() => exportPromise);

    const processor = createSimpleSpanProcessor(mockExporter);
    const span = createTestSpan("test");

    // This should return immediately
    const start = Date.now();
    processor.onEnd(span);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(10); // Should be ~0ms

    // Resolve export
    resolveExport!();
    await exportPromise;

    await processor.shutdown();
  });

  it("should handle export errors gracefully", async () => {
    mockExporter.export = vi.fn().mockRejectedValue(new Error("Export failed"));

    const processor = createSimpleSpanProcessor(mockExporter);
    const span = createTestSpan("test");

    // Should not throw
    expect(() => processor.onEnd(span)).not.toThrow();

    // Error should be logged eventually (after promise rejection)
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("SimpleSpanProcessor export failed"),
      expect.any(Error)
    );

    await processor.shutdown();
  });

  it("should become no-op after shutdown", async () => {
    const processor = createSimpleSpanProcessor(mockExporter);

    await processor.shutdown();

    // onEnd should not call export after shutdown
    processor.onEnd(createTestSpan("test"));
    expect(mockExporter.export).not.toHaveBeenCalled();
  });

  it("should call exporter.shutdown on shutdown", async () => {
    const processor = createSimpleSpanProcessor(mockExporter);

    await processor.shutdown();

    expect(mockExporter.shutdown).toHaveBeenCalledTimes(1);
  });

  it("should handle slow exporter shutdown with timeout protection", async () => {
    vi.useFakeTimers();

    const slowShutdownExporter: SpanExporter = {
      export: vi.fn().mockResolvedValue(undefined),
      forceFlush: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn().mockImplementation(() => {
        return new Promise(() => {
          // Never resolves - simulates hung shutdown
        });
      }),
    };

    const processor = createSimpleSpanProcessor(slowShutdownExporter, {
      exportTimeoutMillis: 100,
    });

    const shutdownPromise = processor.shutdown();
    await vi.advanceTimersByTimeAsync(100);

    await expect(shutdownPromise).resolves.toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("SimpleSpanProcessor shutdown error"),
      expect.any(Error)
    );

    vi.useRealTimers();
  });

  it("should delegate forceFlush to exporter", async () => {
    const processor = createSimpleSpanProcessor(mockExporter);

    await processor.forceFlush();

    expect(mockExporter.forceFlush).toHaveBeenCalledTimes(1);
  });

  it("should handle forceFlush errors gracefully", async () => {
    mockExporter.forceFlush = vi.fn().mockRejectedValue(new Error("Flush failed"));

    const processor = createSimpleSpanProcessor(mockExporter);

    // Should not throw
    await expect(processor.forceFlush()).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("SimpleSpanProcessor forceFlush failed"),
      expect.any(Error)
    );

    await processor.shutdown();
  });

  it("should not flush after shutdown", async () => {
    const processor = createSimpleSpanProcessor(mockExporter);

    await processor.shutdown();

    // Clear previous calls
    vi.mocked(mockExporter.forceFlush).mockClear();

    // forceFlush should be no-op after shutdown
    await processor.forceFlush();

    expect(mockExporter.forceFlush).not.toHaveBeenCalled();
  });

  it("should handle shutdown being called multiple times", async () => {
    const processor = createSimpleSpanProcessor(mockExporter);

    await processor.shutdown();
    await processor.shutdown();
    await processor.shutdown();

    // Shutdown should only be called once
    expect(mockExporter.shutdown).toHaveBeenCalledTimes(1);
  });

  it("should use default timeout value", async () => {
    // Default timeout is 30000ms
    const processor = createSimpleSpanProcessor(mockExporter);

    await processor.shutdown();

    expect(mockExporter.shutdown).toHaveBeenCalledTimes(1);
  });

  it("should use custom timeout value", async () => {
    const processor = createSimpleSpanProcessor(mockExporter, {
      exportTimeoutMillis: 5000,
    });

    await processor.shutdown();

    expect(mockExporter.shutdown).toHaveBeenCalledTimes(1);
  });

  it("should have no-op onStart", () => {
    const processor = createSimpleSpanProcessor(mockExporter);

    // onStart should be a no-op - just ensure it doesn't throw
    expect(() => {
      // Mock span object - onStart doesn't use it
      processor.onStart({} as never);
    }).not.toThrow();
  });
});
