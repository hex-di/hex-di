import { describe, it, expect } from "vitest";
import {
  createMemoryLogger,
  withSpanInjection,
  createSpanProvider,
  getFormatter,
} from "../../src/index.js";
import type { SpanInfo, LogEntry } from "../../src/index.js";

/**
 * Mock span provider that returns a fixed span.
 */
const mockSpanProvider = (): ReadonlyArray<SpanInfo> | undefined => [
  { traceId: "trace-abc", spanId: "span-123" },
];

/**
 * Mock span provider that returns no spans (tracing not active).
 */
const inactiveSpanProvider = (): ReadonlyArray<SpanInfo> | undefined => undefined;

/**
 * Helper to build a LogEntry with spans for formatter tests.
 */
function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    level: "info",
    message: "test message",
    timestamp: new Date("2024-01-15T10:30:00.000Z").getTime(),
    context: {},
    annotations: {},
    ...overrides,
  };
}

describe("tracing integration", () => {
  it("log entries include traceId when span is active", () => {
    const memory = createMemoryLogger();
    const logger = withSpanInjection(memory, mockSpanProvider);

    logger.info("hello");

    const entries = memory.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].annotations.traceId).toBe("trace-abc");
  });

  it("log entries include spanId when span is active", () => {
    const memory = createMemoryLogger();
    const logger = withSpanInjection(memory, mockSpanProvider);

    logger.info("hello");

    const entries = memory.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].annotations.spanId).toBe("span-123");
  });

  it("log entries have no span annotations when tracing is not active", () => {
    const memory = createMemoryLogger();
    const logger = withSpanInjection(memory, inactiveSpanProvider);

    logger.info("hello");

    const entries = memory.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].annotations.traceId).toBeUndefined();
    expect(entries[0].annotations.spanId).toBeUndefined();
    expect(entries[0].annotations.__spans).toBeUndefined();
  });

  it("nested spans: inner span IDs appear in log entries", () => {
    let activeSpans: ReadonlyArray<SpanInfo> = [{ traceId: "trace-outer", spanId: "span-outer" }];

    const dynamicProvider = (): ReadonlyArray<SpanInfo> | undefined => activeSpans;

    const memory = createMemoryLogger();
    const logger = withSpanInjection(memory, dynamicProvider);

    logger.info("outer");

    // Simulate entering a nested span
    activeSpans = [
      { traceId: "trace-outer", spanId: "span-inner" },
      { traceId: "trace-outer", spanId: "span-outer" },
    ];

    logger.info("inner");

    const entries = memory.getEntries();
    expect(entries).toHaveLength(2);

    // First entry has the outer span
    expect(entries[0].annotations.spanId).toBe("span-outer");
    expect(entries[0].annotations.traceId).toBe("trace-outer");

    // Second entry has the inner (first) span
    expect(entries[1].annotations.spanId).toBe("span-inner");
    expect(entries[1].annotations.traceId).toBe("trace-outer");
    // All spans are available via __spans
    expect(entries[1].annotations.__spans).toEqual([
      { traceId: "trace-outer", spanId: "span-inner" },
      { traceId: "trace-outer", spanId: "span-outer" },
    ]);
  });

  it("JSON formatter outputs traceId and spanId from spans", () => {
    const formatter = getFormatter("json");
    const output = formatter.format(
      makeEntry({
        spans: [{ traceId: "trace-abc", spanId: "span-123" }],
      })
    );
    const parsed: Record<string, unknown> = JSON.parse(output);
    expect(parsed.traceId).toBe("trace-abc");
    expect(parsed.spanId).toBe("span-123");
  });

  it("pretty formatter appends traceId from spans", () => {
    const formatter = getFormatter("pretty");
    const output = formatter.format(
      makeEntry({
        spans: [{ traceId: "trace-abc", spanId: "span-123" }],
      })
    );
    expect(output).toContain("traceId=trace-abc");
  });
});

describe("createSpanProvider", () => {
  it("returns a no-op provider that yields undefined", () => {
    const provider = createSpanProvider();
    expect(provider()).toBeUndefined();
  });
});
