/**
 * Tests for createAttributeFilter and createFilteringProcessor.
 *
 * Verifies GxP PII redaction, size enforcement, and key blocking.
 */

import { describe, it, expect } from "vitest";
import { createAttributeFilter, createFilteringProcessor } from "../../src/index.js";
import type { SpanProcessor, SpanData, Span } from "../../src/index.js";

function makeSpanData(attributes: Record<string, string | number | boolean> = {}): SpanData {
  return {
    context: { traceId: "a".repeat(32), spanId: "b".repeat(16), traceFlags: 1 },
    parentSpanId: undefined,
    name: "test-span",
    kind: "internal",
    startTime: 1000,
    endTime: 2000,
    status: "ok",
    attributes,
    events: [],
    links: [],
  };
}

describe("createAttributeFilter", () => {
  it("should remove blocked keys", () => {
    const filter = createAttributeFilter({
      blockedKeys: ["user.email", "user.ssn"],
    });

    const result = filter({
      "user.email": "test@example.com",
      "user.ssn": "123-45-6789",
      "http.method": "GET",
    });

    expect(result).toEqual({ "http.method": "GET" });
  });

  it("should remove keys matching blocked prefixes", () => {
    const filter = createAttributeFilter({
      blockedKeyPrefixes: ["pii.", "secret."],
    });

    const result = filter({
      "pii.email": "test@example.com",
      "pii.phone": "555-1234",
      "secret.token": "abc123",
      "http.method": "GET",
    });

    expect(result).toEqual({ "http.method": "GET" });
  });

  it("should truncate long string values", () => {
    const filter = createAttributeFilter({
      maxValueLength: 10,
    });

    const result = filter({
      short: "ok",
      long: "a".repeat(20),
    });

    expect(result["short"]).toBe("ok");
    expect(result["long"]).toBe("a".repeat(10) + "[TRUNCATED]");
  });

  it("should drop attributes with keys exceeding maxKeyLength", () => {
    const filter = createAttributeFilter({
      maxKeyLength: 10,
    });

    const result = filter({
      short: "ok",
      "this-is-a-very-long-key": "dropped",
    });

    expect(result).toEqual({ short: "ok" });
  });

  it("should truncate long arrays", () => {
    const filter = createAttributeFilter({
      maxArrayLength: 2,
    });

    const result = filter({
      tags: ["a", "b", "c", "d"],
    });

    expect(result["tags"]).toEqual(["a", "b"]);
  });

  it("should apply custom redactValue function", () => {
    const filter = createAttributeFilter({
      redactValue: (key, value) => {
        if (key.includes("email")) return "[REDACTED]";
        return value;
      },
    });

    const result = filter({
      "user.email": "test@example.com",
      "http.method": "GET",
    });

    expect(result["user.email"]).toBe("[REDACTED]");
    expect(result["http.method"]).toBe("GET");
  });

  it("should remove attribute when redactValue returns undefined", () => {
    const filter = createAttributeFilter({
      redactValue: key => {
        if (key === "remove.me") return undefined;
        return "kept";
      },
    });

    const result = filter({
      "remove.me": "value",
      "keep.me": "value",
    });

    expect(result).toEqual({ "keep.me": "kept" });
  });

  it("should use default limits when not configured", () => {
    const filter = createAttributeFilter({});

    // Default maxValueLength is 4096
    const result = filter({
      short: "ok",
      "at-limit": "x".repeat(4096),
      "over-limit": "x".repeat(4097),
    });

    expect(result["short"]).toBe("ok");
    expect(result["at-limit"]).toBe("x".repeat(4096));
    expect((result["over-limit"] as string).endsWith("[TRUNCATED]")).toBe(true);
  });

  it("should pass through numeric and boolean values unchanged", () => {
    const filter = createAttributeFilter({ blockedKeys: ["removed"] });

    const result = filter({
      count: 42,
      enabled: true,
      removed: "gone",
    });

    expect(result).toEqual({ count: 42, enabled: true });
  });

  it("should return attributes unchanged with empty config", () => {
    const filter = createAttributeFilter({});

    const input = { a: "alpha", b: 42, c: true };
    const result = filter(input);

    expect(result).toEqual(input);
  });

  it("should be reusable across multiple calls", () => {
    const filter = createAttributeFilter({ blockedKeys: ["secret"] });

    const r1 = filter({ secret: "a", safe: "1" });
    const r2 = filter({ secret: "b", safe: "2" });
    const r3 = filter({ safe: "3" });

    expect(r1).toEqual({ safe: "1" });
    expect(r2).toEqual({ safe: "2" });
    expect(r3).toEqual({ safe: "3" });
  });
});

describe("createFilteringProcessor", () => {
  it("should filter span attributes before passing to inner processor", () => {
    const receivedSpanData: SpanData[] = [];
    const innerProcessor: SpanProcessor = {
      onStart(_span: Span): void {},
      onEnd(spanData: SpanData): void {
        receivedSpanData.push(spanData);
      },
      forceFlush: () => Promise.resolve(),
      shutdown: () => Promise.resolve(),
    };

    const filter = createAttributeFilter({ blockedKeys: ["user.email"] });
    const processor = createFilteringProcessor(innerProcessor, filter);

    processor.onEnd(makeSpanData({ "user.email": "test@example.com", "http.method": "GET" }));

    expect(receivedSpanData).toHaveLength(1);
    expect(receivedSpanData[0].attributes).toEqual({ "http.method": "GET" });
  });

  it("should filter event attributes", () => {
    const receivedSpanData: SpanData[] = [];
    const innerProcessor: SpanProcessor = {
      onStart(_span: Span): void {},
      onEnd(spanData: SpanData): void {
        receivedSpanData.push(spanData);
      },
      forceFlush: () => Promise.resolve(),
      shutdown: () => Promise.resolve(),
    };

    const filter = createAttributeFilter({ blockedKeys: ["pii.name"] });
    const processor = createFilteringProcessor(innerProcessor, filter);

    const spanData: SpanData = {
      ...makeSpanData(),
      events: [{ name: "test-event", time: 1500, attributes: { "pii.name": "John", safe: "ok" } }],
    };

    processor.onEnd(spanData);

    expect(receivedSpanData[0].events[0].attributes).toEqual({ safe: "ok" });
  });

  it("should delegate forceFlush and shutdown", async () => {
    let flushed = false;
    let shutdown = false;
    const innerProcessor: SpanProcessor = {
      onStart(): void {},
      onEnd(): void {},
      forceFlush: () => {
        flushed = true;
        return Promise.resolve();
      },
      shutdown: () => {
        shutdown = true;
        return Promise.resolve();
      },
    };

    const filter = createAttributeFilter({});
    const processor = createFilteringProcessor(innerProcessor, filter);

    await processor.forceFlush();
    expect(flushed).toBe(true);

    await processor.shutdown();
    expect(shutdown).toBe(true);
  });

  it("should delegate onStart to inner processor unchanged", () => {
    let onStartCalled = false;
    const innerProcessor: SpanProcessor = {
      onStart(_span: Span): void {
        onStartCalled = true;
      },
      onEnd(): void {},
      forceFlush: () => Promise.resolve(),
      shutdown: () => Promise.resolve(),
    };

    const filter = createAttributeFilter({});
    const processor = createFilteringProcessor(innerProcessor, filter);

    const mockSpan = {} as Span;
    processor.onStart(mockSpan);

    expect(onStartCalled).toBe(true);
  });

  it("should not mutate original SpanData", () => {
    const receivedSpanData: SpanData[] = [];
    const innerProcessor: SpanProcessor = {
      onStart(): void {},
      onEnd(spanData: SpanData): void {
        receivedSpanData.push(spanData);
      },
      forceFlush: () => Promise.resolve(),
      shutdown: () => Promise.resolve(),
    };

    const filter = createAttributeFilter({ blockedKeys: ["pii.email"] });
    const processor = createFilteringProcessor(innerProcessor, filter);

    const original = makeSpanData({ "pii.email": "test@example.com", safe: "ok" });
    const originalAttrs = { ...original.attributes };

    processor.onEnd(original);

    // Original should be unchanged
    expect(original.attributes).toEqual(originalAttrs);
    // Filtered version should have PII removed
    expect(receivedSpanData[0].attributes).toEqual({ safe: "ok" });
  });
});
