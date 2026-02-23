/**
 * GxP span eviction audit trail tests.
 *
 * Verifies droppedSpanCount tracking, onDrop callback,
 * and reset behavior on clear().
 */

import { describe, it, expect } from "vitest";
import { MemoryTracer } from "../../src/index.js";
import type { SpanData } from "../../src/index.js";

describe("MemoryTracer - span eviction audit trail", () => {
  it("should increment droppedSpanCount when buffer overflows", () => {
    const tracer = new MemoryTracer({ maxSpans: 3 });

    for (let i = 0; i < 5; i++) {
      tracer.withSpan(`span-${i}`, () => {});
    }

    expect(tracer.droppedSpanCount).toBe(2); // 5 spans, capacity 3 → 2 dropped
    expect(tracer.getCollectedSpans()).toHaveLength(3);
  });

  it("should invoke onDrop callback with evicted SpanData and count", () => {
    const droppedSpans: Array<{ data: SpanData; count: number }> = [];

    const tracer = new MemoryTracer({
      maxSpans: 2,
      onDrop: (spanData, droppedCount) => {
        droppedSpans.push({ data: spanData, count: droppedCount });
      },
    });

    tracer.withSpan("span-0", () => {});
    tracer.withSpan("span-1", () => {});
    // Buffer full, next span evicts span-0
    tracer.withSpan("span-2", () => {});
    // Buffer still full, next span evicts span-1
    tracer.withSpan("span-3", () => {});

    expect(droppedSpans).toHaveLength(2);
    expect(droppedSpans[0].data.name).toBe("span-0");
    expect(droppedSpans[0].count).toBe(1);
    expect(droppedSpans[1].data.name).toBe("span-1");
    expect(droppedSpans[1].count).toBe(2);
  });

  it("should reset droppedSpanCount on clear()", () => {
    const tracer = new MemoryTracer({ maxSpans: 2 });

    for (let i = 0; i < 5; i++) {
      tracer.withSpan(`span-${i}`, () => {});
    }
    expect(tracer.droppedSpanCount).toBe(3);

    tracer.clear();
    expect(tracer.droppedSpanCount).toBe(0);
    expect(tracer.getCollectedSpans()).toHaveLength(0);
  });

  it("should not drop when buffer is under capacity", () => {
    const tracer = new MemoryTracer({ maxSpans: 10 });

    for (let i = 0; i < 5; i++) {
      tracer.withSpan(`span-${i}`, () => {});
    }

    expect(tracer.droppedSpanCount).toBe(0);
    expect(tracer.getCollectedSpans()).toHaveLength(5);
  });

  it("should accumulate correct count during continuous overflow", () => {
    const tracer = new MemoryTracer({ maxSpans: 1 });

    for (let i = 0; i < 100; i++) {
      tracer.withSpan(`span-${i}`, () => {});
    }

    // Only 1 retained, 99 dropped
    expect(tracer.droppedSpanCount).toBe(99);
    expect(tracer.getCollectedSpans()).toHaveLength(1);
    expect(tracer.getCollectedSpans()[0].name).toBe("span-99");
  });

  it("should not invoke onDrop when buffer has capacity", () => {
    let called = false;
    const tracer = new MemoryTracer({
      maxSpans: 100,
      onDrop: () => {
        called = true;
      },
    });

    for (let i = 0; i < 50; i++) {
      tracer.withSpan(`span-${i}`, () => {});
    }

    expect(called).toBe(false);
  });
});
