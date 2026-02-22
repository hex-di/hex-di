/**
 * GxP batch processor metrics tests.
 *
 * Verifies TracingMetrics tracking in the OTel batch span processor
 * for GxP monitoring dashboards.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { createBatchSpanProcessor } from "../../src/processors/batch.js";
import type { SpanExporter, SpanData } from "@hex-di/tracing";

describe("BatchSpanProcessor - GxP metrics", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
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

  it("should track spansDropped when queue overflows", async () => {
    const exporter: SpanExporter = {
      export: vi.fn().mockResolvedValue(undefined),
      forceFlush: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn().mockResolvedValue(undefined),
    };

    const processor = createBatchSpanProcessor(exporter, {
      maxQueueSize: 2,
      maxExportBatchSize: 100,
      scheduledDelayMillis: 60_000, // high delay so it doesn't auto-flush
    });

    processor.onEnd(createTestSpan("span1"));
    processor.onEnd(createTestSpan("span2"));
    processor.onEnd(createTestSpan("span3")); // drops span1

    const metrics = processor.getMetrics();
    expect(metrics.spansDropped).toBe(1);

    await processor.shutdown();
  });

  it("should track spansExported and exportSuccesses on successful export", async () => {
    const exporter: SpanExporter = {
      export: vi.fn().mockResolvedValue(undefined),
      forceFlush: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn().mockResolvedValue(undefined),
    };

    const processor = createBatchSpanProcessor(exporter, {
      maxExportBatchSize: 10,
      scheduledDelayMillis: 100,
    });

    processor.onEnd(createTestSpan("span1"));
    processor.onEnd(createTestSpan("span2"));

    await processor.forceFlush();

    const metrics = processor.getMetrics();
    expect(metrics.spansExported).toBe(2);
    expect(metrics.exportSuccesses).toBe(1);
    expect(metrics.exportFailures).toBe(0);

    await processor.shutdown();
  });

  it("should track exportFailures on permanent failure", async () => {
    const exporter: SpanExporter = {
      export: vi.fn().mockRejectedValue(new Error("fail")),
      forceFlush: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn().mockResolvedValue(undefined),
    };

    const processor = createBatchSpanProcessor(exporter, {
      maxExportBatchSize: 10,
      scheduledDelayMillis: 100,
      maxRetryAttempts: 0, // No retries
    });

    processor.onEnd(createTestSpan("span1"));
    await processor.forceFlush();

    const metrics = processor.getMetrics();
    expect(metrics.exportFailures).toBe(1);
    expect(metrics.spansDropped).toBe(1);

    await processor.shutdown();
  });

  it("should flush remaining spans on shutdown", async () => {
    const exported: SpanData[][] = [];
    const exporter: SpanExporter = {
      export: vi.fn().mockImplementation((spans: SpanData[]) => {
        exported.push([...spans]);
        return Promise.resolve();
      }),
      forceFlush: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn().mockResolvedValue(undefined),
    };

    const processor = createBatchSpanProcessor(exporter, {
      maxExportBatchSize: 100,
      scheduledDelayMillis: 60_000,
    });

    processor.onEnd(createTestSpan("span1"));
    processor.onEnd(createTestSpan("span2"));

    await processor.shutdown();

    expect(exported.flat()).toHaveLength(2);
    const metrics = processor.getMetrics();
    expect(metrics.spansExported).toBe(2);
  });
});
