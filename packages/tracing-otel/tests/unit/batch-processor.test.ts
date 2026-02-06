/**
 * Unit tests for BatchSpanProcessor - buffering, batching, and scheduled flushing.
 *
 * Tests verify buffering behavior, FIFO drop policy, immediate flush on batch size,
 * scheduled flush on timer, shutdown behavior, and error handling.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { createBatchSpanProcessor } from "../../src/processors/batch.js";
import type { SpanExporter, SpanData } from "@hex-di/tracing";

describe("createBatchSpanProcessor", () => {
  let mockExporter: SpanExporter;
  let exportedBatches: SpanData[][];
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    exportedBatches = [];

    mockExporter = {
      export: vi.fn().mockImplementation((spans: SpanData[]) => {
        exportedBatches.push([...spans]);
        return Promise.resolve();
      }),
      forceFlush: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn().mockResolvedValue(undefined),
    };

    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it("should buffer spans below batch size", () => {
    const processor = createBatchSpanProcessor(mockExporter, {
      maxExportBatchSize: 10,
      scheduledDelayMillis: 5000,
    });

    processor.onEnd(createTestSpan("span1"));
    processor.onEnd(createTestSpan("span2"));
    processor.onEnd(createTestSpan("span3"));

    // No immediate export - spans are buffered
    expect(mockExporter.export).not.toHaveBeenCalled();
    expect(exportedBatches).toHaveLength(0);

    processor.shutdown();
  });

  it("should flush buffered spans after scheduled delay", async () => {
    const processor = createBatchSpanProcessor(mockExporter, {
      maxExportBatchSize: 10,
      scheduledDelayMillis: 5000,
    });

    processor.onEnd(createTestSpan("span1"));
    processor.onEnd(createTestSpan("span2"));

    // No immediate export
    expect(mockExporter.export).not.toHaveBeenCalled();

    // Advance time to trigger scheduled flush
    await vi.advanceTimersByTimeAsync(5000);

    // Verify export called with buffered spans
    expect(mockExporter.export).toHaveBeenCalledTimes(1);
    expect(exportedBatches).toHaveLength(1);
    expect(exportedBatches[0]).toHaveLength(2);
    expect(exportedBatches[0].map(s => s.name)).toEqual(["span1", "span2"]);

    await processor.shutdown();
  });

  it("should flush immediately when batch size reached", async () => {
    const processor = createBatchSpanProcessor(mockExporter, {
      maxExportBatchSize: 3,
      scheduledDelayMillis: 5000,
    });

    processor.onEnd(createTestSpan("span1"));
    processor.onEnd(createTestSpan("span2"));
    processor.onEnd(createTestSpan("span3"));

    // Immediate flush triggered
    await vi.runAllTimersAsync();

    expect(mockExporter.export).toHaveBeenCalledTimes(1);
    expect(exportedBatches[0]).toHaveLength(3);
    expect(exportedBatches[0].map(s => s.name)).toEqual(["span1", "span2", "span3"]);

    await processor.shutdown();
  });

  it("should drop oldest span when buffer exceeds maxQueueSize (FIFO)", async () => {
    const processor = createBatchSpanProcessor(mockExporter, {
      maxQueueSize: 3,
      maxExportBatchSize: 10,
      scheduledDelayMillis: 5000,
    });

    // Fill buffer beyond capacity
    processor.onEnd(createTestSpan("span1"));
    processor.onEnd(createTestSpan("span2"));
    processor.onEnd(createTestSpan("span3"));
    processor.onEnd(createTestSpan("span4")); // This should drop span1

    await processor.forceFlush();

    // Only spans 2, 3, 4 should be exported (span1 was dropped)
    expect(exportedBatches[0]).toHaveLength(3);
    expect(exportedBatches[0].map(s => s.name)).toEqual(["span2", "span3", "span4"]);

    await processor.shutdown();
  });

  it("should export multiple batches when buffer exceeds maxExportBatchSize", async () => {
    const processor = createBatchSpanProcessor(mockExporter, {
      maxQueueSize: 100,
      maxExportBatchSize: 3,
      scheduledDelayMillis: 5000,
    });

    // Add 7 spans
    for (let i = 1; i <= 7; i++) {
      processor.onEnd(createTestSpan(`span${i}`));
    }

    await processor.forceFlush();

    // Should export in multiple batches: [3, 3, 1]
    expect(exportedBatches.length).toBeGreaterThanOrEqual(2);
    const totalExported = exportedBatches.flat().length;
    expect(totalExported).toBe(7);

    await processor.shutdown();
  });

  it("should flush all buffered spans on shutdown", async () => {
    const processor = createBatchSpanProcessor(mockExporter, {
      maxExportBatchSize: 10,
      scheduledDelayMillis: 5000,
    });

    processor.onEnd(createTestSpan("span1"));
    processor.onEnd(createTestSpan("span2"));
    processor.onEnd(createTestSpan("span3"));

    // No export yet
    expect(mockExporter.export).not.toHaveBeenCalled();

    await processor.shutdown();

    // All spans should be flushed on shutdown
    expect(exportedBatches.flat().length).toBe(3);
    expect(exportedBatches.flat().map(s => s.name)).toEqual(["span1", "span2", "span3"]);
  });

  it("should call exporter.shutdown with timeout protection", async () => {
    const processor = createBatchSpanProcessor(mockExporter, {
      exportTimeoutMillis: 1000,
    });

    await processor.shutdown();

    expect(mockExporter.shutdown).toHaveBeenCalledTimes(1);
  });

  it("should handle slow exporter shutdown gracefully", async () => {
    const slowShutdownExporter: SpanExporter = {
      export: vi.fn().mockResolvedValue(undefined),
      forceFlush: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn().mockImplementation(() => {
        return new Promise(() => {
          // Never resolves - simulates hung shutdown
        });
      }),
    };

    const processor = createBatchSpanProcessor(slowShutdownExporter, {
      exportTimeoutMillis: 100,
    });

    const shutdownPromise = processor.shutdown();
    await vi.advanceTimersByTimeAsync(100);

    await expect(shutdownPromise).resolves.toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("BatchSpanProcessor shutdown error"),
      expect.any(Error)
    );
  });

  it("should handle export errors gracefully without throwing", async () => {
    const errorExporter: SpanExporter = {
      export: vi.fn().mockRejectedValue(new Error("Export failed")),
      forceFlush: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn().mockResolvedValue(undefined),
    };

    const processor = createBatchSpanProcessor(errorExporter, {
      maxExportBatchSize: 2,
      scheduledDelayMillis: 5000,
    });

    processor.onEnd(createTestSpan("span1"));
    processor.onEnd(createTestSpan("span2"));

    // Should not throw despite export error
    await vi.runAllTimersAsync();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("BatchSpanProcessor export failed"),
      expect.any(Error)
    );

    await processor.shutdown();
  });

  it("should become no-op after shutdown", async () => {
    const processor = createBatchSpanProcessor(mockExporter);

    await processor.shutdown();

    // Clear previous calls
    vi.mocked(mockExporter.export).mockClear();
    exportedBatches = [];

    // onEnd should not add spans after shutdown
    processor.onEnd(createTestSpan("span1"));
    processor.onEnd(createTestSpan("span2"));

    await vi.runAllTimersAsync();

    expect(mockExporter.export).not.toHaveBeenCalled();
    expect(exportedBatches).toHaveLength(0);
  });

  it("should not schedule multiple flush timers", async () => {
    const processor = createBatchSpanProcessor(mockExporter, {
      maxExportBatchSize: 10,
      scheduledDelayMillis: 5000,
    });

    processor.onEnd(createTestSpan("span1"));
    processor.onEnd(createTestSpan("span2"));
    processor.onEnd(createTestSpan("span3"));

    // All spans should share same flush timer
    await vi.advanceTimersByTimeAsync(5000);

    expect(mockExporter.export).toHaveBeenCalledTimes(1);
    expect(exportedBatches[0]).toHaveLength(3);

    await processor.shutdown();
  });

  it("should clear scheduled timer when immediate flush occurs", async () => {
    const processor = createBatchSpanProcessor(mockExporter, {
      maxExportBatchSize: 3,
      scheduledDelayMillis: 5000,
    });

    // Add 2 spans - schedules timer
    processor.onEnd(createTestSpan("span1"));
    processor.onEnd(createTestSpan("span2"));

    // Add 3rd span - triggers immediate flush and clears timer
    processor.onEnd(createTestSpan("span3"));

    await vi.runAllTimersAsync();

    // Should only export once (immediate flush), not twice (immediate + scheduled)
    expect(mockExporter.export).toHaveBeenCalledTimes(1);
    expect(exportedBatches[0]).toHaveLength(3);

    await processor.shutdown();
  });

  it("should handle forceFlush while shutdown is false", async () => {
    const processor = createBatchSpanProcessor(mockExporter, {
      maxExportBatchSize: 10,
    });

    processor.onEnd(createTestSpan("span1"));
    processor.onEnd(createTestSpan("span2"));

    await processor.forceFlush();

    expect(exportedBatches.flat().length).toBe(2);

    await processor.shutdown();
  });

  it("should not flush on forceFlush if already shutdown", async () => {
    const processor = createBatchSpanProcessor(mockExporter);

    processor.onEnd(createTestSpan("span1"));

    await processor.shutdown();

    // Clear previous calls
    vi.mocked(mockExporter.export).mockClear();

    // forceFlush should be no-op after shutdown
    await processor.forceFlush();

    expect(mockExporter.export).not.toHaveBeenCalled();
  });

  it("should use default configuration values", async () => {
    const processor = createBatchSpanProcessor(mockExporter);

    // Defaults: maxQueueSize=2048, scheduledDelayMillis=5000,
    //           exportTimeoutMillis=30000, maxExportBatchSize=512

    // Add 1 span - should schedule flush
    processor.onEnd(createTestSpan("span1"));

    expect(mockExporter.export).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5000);

    expect(mockExporter.export).toHaveBeenCalledTimes(1);

    await processor.shutdown();
  });

  it("should handle scheduled flush error gracefully", async () => {
    const errorExporter: SpanExporter = {
      export: vi.fn().mockRejectedValue(new Error("Scheduled export failed")),
      forceFlush: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn().mockResolvedValue(undefined),
    };

    const processor = createBatchSpanProcessor(errorExporter, {
      maxExportBatchSize: 10,
      scheduledDelayMillis: 5000,
    });

    processor.onEnd(createTestSpan("span1"));

    await vi.advanceTimersByTimeAsync(5000);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("BatchSpanProcessor export failed"),
      expect.any(Error)
    );

    await processor.shutdown();
  });
});
