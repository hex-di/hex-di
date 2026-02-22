/**
 * Unit tests for assertion helpers.
 */

import { describe, it, expect } from "vitest";
import { assertSpanExists } from "../../src/testing/assertions.js";
import type { SpanData } from "../../src/types/index.js";

describe("assertSpanExists", () => {
  // Helper to create minimal span data
  const createSpan = (overrides: Partial<SpanData> = {}): SpanData => ({
    context: {
      traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
      spanId: "00f067aa0ba902b7",
      traceFlags: 1,
    },
    name: "test-span",
    kind: "internal",
    startTime: 1000,
    endTime: 2000,
    status: "unset",
    attributes: {},
    events: [],
    links: [],
    ...overrides,
  });

  describe("name matching", () => {
    it("matches exact string name", () => {
      const spans = [createSpan({ name: "operation-a" }), createSpan({ name: "operation-b" })];

      const result = assertSpanExists(spans, { name: "operation-b" });

      expect(result.name).toBe("operation-b");
    });

    it("matches regex pattern", () => {
      const spans = [createSpan({ name: "GET /users" }), createSpan({ name: "POST /users" })];

      const result = assertSpanExists(spans, { name: /^GET / });

      expect(result.name).toBe("GET /users");
    });

    it("throws when no name matches", () => {
      const spans = [createSpan({ name: "operation-a" })];

      expect(() => {
        assertSpanExists(spans, { name: "operation-b" });
      }).toThrow('No span found matching criteria: { name: "operation-b" }');
    });

    it("includes available spans in error message", () => {
      const spans = [createSpan({ name: "span-1" }), createSpan({ name: "span-2" })];

      expect(() => {
        assertSpanExists(spans, { name: "missing" });
      }).toThrow('Available spans: "span-1", "span-2"');
    });
  });

  describe("status matching", () => {
    it("matches ok status", () => {
      const spans = [
        createSpan({ status: "unset" }),
        createSpan({ status: "ok", name: "success" }),
      ];

      const result = assertSpanExists(spans, { status: "ok" });

      expect(result.status).toBe("ok");
      expect(result.name).toBe("success");
    });

    it("matches error status", () => {
      const spans = [createSpan({ status: "ok" }), createSpan({ status: "error", name: "failed" })];

      const result = assertSpanExists(spans, { status: "error" });

      expect(result.status).toBe("error");
      expect(result.name).toBe("failed");
    });

    it("throws when no status matches", () => {
      const spans = [createSpan({ status: "ok" })];

      expect(() => {
        assertSpanExists(spans, { status: "error" });
      }).toThrow('No span found matching criteria: { status: "error" }');
    });
  });

  describe("attributes matching", () => {
    it("matches single attribute", () => {
      const spans = [
        createSpan({ attributes: { key: "value-a" } }),
        createSpan({ attributes: { key: "value-b" }, name: "match" }),
      ];

      const result = assertSpanExists(spans, {
        attributes: { key: "value-b" },
      });

      expect(result.name).toBe("match");
    });

    it("matches multiple attributes", () => {
      const spans = [
        createSpan({ attributes: { a: "1", b: "2" } }),
        createSpan({ attributes: { a: "1", b: "3", c: "4" }, name: "match" }),
      ];

      const result = assertSpanExists(spans, {
        attributes: { a: "1", c: "4" },
      });

      expect(result.name).toBe("match");
    });

    it("allows span to have extra attributes", () => {
      const spans = [createSpan({ attributes: { a: "1", b: "2", c: "3" }, name: "match" })];

      const result = assertSpanExists(spans, {
        attributes: { a: "1" },
      });

      expect(result.name).toBe("match");
    });

    it("throws when attribute value does not match", () => {
      const spans = [createSpan({ attributes: { key: "wrong" } })];

      expect(() => {
        assertSpanExists(spans, { attributes: { key: "expected" } });
      }).toThrow('No span found matching criteria: { attributes: { key: "expected" } }');
    });

    it("throws when attribute key is missing", () => {
      const spans = [createSpan({ attributes: { other: "value" } })];

      expect(() => {
        assertSpanExists(spans, { attributes: { key: "value" } });
      }).toThrow('attributes: { key: "value" }');
    });
  });

  describe("hasEvent matching", () => {
    it("matches when event exists", () => {
      const spans = [
        createSpan({ events: [] }),
        createSpan({
          events: [{ name: "cache.miss", time: 1500 }],
          name: "match",
        }),
      ];

      const result = assertSpanExists(spans, { hasEvent: "cache.miss" });

      expect(result.name).toBe("match");
    });

    it("matches when multiple events exist", () => {
      const spans = [
        createSpan({
          events: [
            { name: "event-a", time: 1500 },
            { name: "event-b", time: 1600 },
          ],
          name: "match",
        }),
      ];

      const result = assertSpanExists(spans, { hasEvent: "event-b" });

      expect(result.name).toBe("match");
    });

    it("throws when event does not exist", () => {
      const spans = [createSpan({ events: [{ name: "other", time: 1500 }] })];

      expect(() => {
        assertSpanExists(spans, { hasEvent: "missing" });
      }).toThrow('No span found matching criteria: { hasEvent: "missing" }');
    });

    it("throws when events array is empty", () => {
      const spans = [createSpan({ events: [] })];

      expect(() => {
        assertSpanExists(spans, { hasEvent: "any" });
      }).toThrow('hasEvent: "any"');
    });
  });

  describe("minDuration matching", () => {
    it("matches when duration meets minimum", () => {
      const spans = [
        createSpan({ startTime: 1000, endTime: 1050, name: "too-short" }),
        createSpan({ startTime: 1000, endTime: 1100, name: "match" }),
      ];

      const result = assertSpanExists(spans, { minDuration: 100 });

      expect(result.name).toBe("match");
    });

    it("matches when duration equals minimum", () => {
      const spans = [createSpan({ startTime: 1000, endTime: 1100, name: "match" })];

      const result = assertSpanExists(spans, { minDuration: 100 });

      expect(result.name).toBe("match");
    });

    it("throws when duration is below minimum", () => {
      const spans = [createSpan({ startTime: 1000, endTime: 1050 })];

      expect(() => {
        assertSpanExists(spans, { minDuration: 100 });
      }).toThrow("No span found matching criteria: { minDuration: 100ms }");
    });
  });

  describe("combined criteria", () => {
    it("matches all criteria simultaneously", () => {
      const spans = [
        createSpan({
          name: "operation",
          status: "error",
        }),
        createSpan({
          name: "operation",
          status: "ok",
          attributes: { key: "value" },
          events: [{ name: "milestone", time: 1500 }],
          startTime: 1000,
          endTime: 1200,
        }),
      ];

      const result = assertSpanExists(spans, {
        name: "operation",
        status: "ok",
        attributes: { key: "value" },
        hasEvent: "milestone",
        minDuration: 200,
      });

      expect(result.status).toBe("ok");
      expect(result.attributes.key).toBe("value");
    });

    it("throws when one criterion does not match", () => {
      const spans = [
        createSpan({
          name: "operation",
          status: "ok",
          attributes: { key: "value" },
        }),
      ];

      expect(() => {
        assertSpanExists(spans, {
          name: "operation",
          status: "ok",
          attributes: { key: "wrong" },
        });
      }).toThrow('attributes: { key: "wrong" }');
    });

    it("includes all criteria in error message", () => {
      const spans = [createSpan()];

      expect(() => {
        assertSpanExists(spans, {
          name: /pattern/,
          status: "error",
          attributes: { a: "1", b: "2" },
          hasEvent: "event",
          minDuration: 500,
        });
      }).toThrow(
        'name: /pattern/, status: "error", attributes: { a: "1", b: "2" }, hasEvent: "event", minDuration: 500ms'
      );
    });
  });

  describe("edge cases", () => {
    it("throws when spans array is empty", () => {
      expect(() => {
        assertSpanExists([], { name: "any" });
      }).toThrow("Available spans: none");
    });

    it("returns first match when multiple spans match", () => {
      const spans = [
        createSpan({ name: "match", attributes: { order: "first" } }),
        createSpan({ name: "match", attributes: { order: "second" } }),
      ];

      const result = assertSpanExists(spans, { name: "match" });

      expect(result.attributes.order).toBe("first");
    });

    it("works with empty matcher (matches any span)", () => {
      const spans = [createSpan({ name: "any" })];

      const result = assertSpanExists(spans, {});

      expect(result.name).toBe("any");
    });
  });

  describe("purity", () => {
    it("does not mutate input spans array", () => {
      const spans = [createSpan({ name: "original" })];
      const spansCopy = JSON.parse(JSON.stringify(spans));

      assertSpanExists(spans, { name: "original" });

      expect(spans).toEqual(spansCopy);
    });

    it("returns original span reference unchanged", () => {
      const originalSpan = createSpan({ name: "test" });
      const spans = [originalSpan];

      const result = assertSpanExists(spans, { name: "test" });

      // assertSpanExists returns the original object, not a copy
      expect(result).toBe(originalSpan);
    });
  });
});
