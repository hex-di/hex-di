/**
 * Unit tests for span matcher predicates.
 */

import { describe, it, expect } from "vitest";
import { hasAttribute, hasEvent, hasStatus, hasDuration } from "../../src/testing/matchers.js";
import type { SpanData } from "../../src/types/index.js";

describe("matcher predicates", () => {
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

  describe("hasAttribute", () => {
    it("returns true when attribute key exists", () => {
      const span = createSpan({ attributes: { key: "value" } });

      expect(hasAttribute(span, "key")).toBe(true);
    });

    it("returns false when attribute key does not exist", () => {
      const span = createSpan({ attributes: { other: "value" } });

      expect(hasAttribute(span, "key")).toBe(false);
    });

    it("returns true when attribute value matches", () => {
      const span = createSpan({ attributes: { key: "expected" } });

      expect(hasAttribute(span, "key", "expected")).toBe(true);
    });

    it("returns false when attribute value does not match", () => {
      const span = createSpan({ attributes: { key: "actual" } });

      expect(hasAttribute(span, "key", "expected")).toBe(false);
    });

    it("handles numeric attribute values", () => {
      const span = createSpan({ attributes: { count: 42 } });

      expect(hasAttribute(span, "count", 42)).toBe(true);
      expect(hasAttribute(span, "count", 99)).toBe(false);
    });

    it("handles boolean attribute values", () => {
      const span = createSpan({ attributes: { flag: true } });

      expect(hasAttribute(span, "flag", true)).toBe(true);
      expect(hasAttribute(span, "flag", false)).toBe(false);
    });

    it("handles array attribute values", () => {
      const span = createSpan({ attributes: { tags: ["a", "b", "c"] } });

      expect(hasAttribute(span, "tags")).toBe(true);
      // Array comparison uses reference equality
      expect(hasAttribute(span, "tags", ["a", "b", "c"])).toBe(false);
      expect(hasAttribute(span, "tags", span.attributes.tags)).toBe(true);
    });

    it("returns false when attribute is undefined", () => {
      const span = createSpan({ attributes: {} });

      expect(hasAttribute(span, "missing")).toBe(false);
    });

    it("is pure - does not mutate span", () => {
      const span = createSpan({ attributes: { key: "value" } });
      const original = JSON.parse(JSON.stringify(span));

      hasAttribute(span, "key", "value");

      expect(span).toEqual(original);
    });
  });

  describe("hasEvent", () => {
    it("returns true when event name exists", () => {
      const span = createSpan({
        events: [{ name: "cache.miss", time: 1500 }],
      });

      expect(hasEvent(span, "cache.miss")).toBe(true);
    });

    it("returns false when event name does not exist", () => {
      const span = createSpan({
        events: [{ name: "cache.miss", time: 1500 }],
      });

      expect(hasEvent(span, "cache.hit")).toBe(false);
    });

    it("returns true when event is in multiple events", () => {
      const span = createSpan({
        events: [
          { name: "event-a", time: 1500 },
          { name: "event-b", time: 1600 },
          { name: "event-c", time: 1700 },
        ],
      });

      expect(hasEvent(span, "event-b")).toBe(true);
    });

    it("returns false when events array is empty", () => {
      const span = createSpan({ events: [] });

      expect(hasEvent(span, "any")).toBe(false);
    });

    it("requires exact name match (not partial)", () => {
      const span = createSpan({
        events: [{ name: "cache.miss", time: 1500 }],
      });

      expect(hasEvent(span, "cache")).toBe(false);
      expect(hasEvent(span, "miss")).toBe(false);
    });

    it("is case-sensitive", () => {
      const span = createSpan({
        events: [{ name: "Event", time: 1500 }],
      });

      expect(hasEvent(span, "Event")).toBe(true);
      expect(hasEvent(span, "event")).toBe(false);
    });

    it("is pure - does not mutate span", () => {
      const span = createSpan({
        events: [{ name: "test", time: 1500 }],
      });
      const original = JSON.parse(JSON.stringify(span));

      hasEvent(span, "test");

      expect(span).toEqual(original);
    });
  });

  describe("hasStatus", () => {
    it("returns true when status matches unset", () => {
      const span = createSpan({ status: "unset" });

      expect(hasStatus(span, "unset")).toBe(true);
    });

    it("returns true when status matches ok", () => {
      const span = createSpan({ status: "ok" });

      expect(hasStatus(span, "ok")).toBe(true);
    });

    it("returns true when status matches error", () => {
      const span = createSpan({ status: "error" });

      expect(hasStatus(span, "error")).toBe(true);
    });

    it("returns false when status does not match", () => {
      const span = createSpan({ status: "ok" });

      expect(hasStatus(span, "error")).toBe(false);
      expect(hasStatus(span, "unset")).toBe(false);
    });

    it("is pure - does not mutate span", () => {
      const span = createSpan({ status: "ok" });
      const original = JSON.parse(JSON.stringify(span));

      hasStatus(span, "ok");

      expect(span).toEqual(original);
    });
  });

  describe("hasDuration", () => {
    describe("minimum duration", () => {
      it("returns true when duration exceeds minimum", () => {
        const span = createSpan({ startTime: 1000, endTime: 1200 });

        expect(hasDuration(span, 100)).toBe(true);
      });

      it("returns true when duration equals minimum", () => {
        const span = createSpan({ startTime: 1000, endTime: 1100 });

        expect(hasDuration(span, 100)).toBe(true);
      });

      it("returns false when duration is below minimum", () => {
        const span = createSpan({ startTime: 1000, endTime: 1050 });

        expect(hasDuration(span, 100)).toBe(false);
      });

      it("handles zero minimum", () => {
        const span = createSpan({ startTime: 1000, endTime: 1001 });

        expect(hasDuration(span, 0)).toBe(true);
      });
    });

    describe("maximum duration", () => {
      it("returns true when duration is below maximum", () => {
        const span = createSpan({ startTime: 1000, endTime: 1050 });

        expect(hasDuration(span, undefined, 100)).toBe(true);
      });

      it("returns true when duration equals maximum", () => {
        const span = createSpan({ startTime: 1000, endTime: 1100 });

        expect(hasDuration(span, undefined, 100)).toBe(true);
      });

      it("returns false when duration exceeds maximum", () => {
        const span = createSpan({ startTime: 1000, endTime: 1200 });

        expect(hasDuration(span, undefined, 100)).toBe(false);
      });
    });

    describe("duration range", () => {
      it("returns true when duration is within range", () => {
        const span = createSpan({ startTime: 1000, endTime: 1150 });

        expect(hasDuration(span, 100, 200)).toBe(true);
      });

      it("returns true when duration equals min bound", () => {
        const span = createSpan({ startTime: 1000, endTime: 1100 });

        expect(hasDuration(span, 100, 200)).toBe(true);
      });

      it("returns true when duration equals max bound", () => {
        const span = createSpan({ startTime: 1000, endTime: 1200 });

        expect(hasDuration(span, 100, 200)).toBe(true);
      });

      it("returns false when duration is below range", () => {
        const span = createSpan({ startTime: 1000, endTime: 1050 });

        expect(hasDuration(span, 100, 200)).toBe(false);
      });

      it("returns false when duration is above range", () => {
        const span = createSpan({ startTime: 1000, endTime: 1300 });

        expect(hasDuration(span, 100, 200)).toBe(false);
      });
    });

    describe("no bounds", () => {
      it("returns true when no bounds specified", () => {
        const span = createSpan({ startTime: 1000, endTime: 9999 });

        expect(hasDuration(span)).toBe(true);
      });

      it("returns true for zero duration", () => {
        const span = createSpan({ startTime: 1000, endTime: 1000 });

        expect(hasDuration(span)).toBe(true);
      });
    });

    describe("edge cases", () => {
      it("handles very long durations", () => {
        const span = createSpan({ startTime: 0, endTime: 1000000 });

        expect(hasDuration(span, 999999)).toBe(true);
        expect(hasDuration(span, 1000001)).toBe(false);
      });

      it("handles fractional milliseconds", () => {
        const span = createSpan({ startTime: 1000.5, endTime: 1001.7 });

        expect(hasDuration(span, 1)).toBe(true);
        expect(hasDuration(span, 2)).toBe(false);
      });
    });

    it("is pure - does not mutate span", () => {
      const span = createSpan({ startTime: 1000, endTime: 2000 });
      const original = JSON.parse(JSON.stringify(span));

      hasDuration(span, 100, 200);

      expect(span).toEqual(original);
    });
  });

  describe("predicate composition", () => {
    it("can combine multiple predicates", () => {
      const span = createSpan({
        status: "ok",
        attributes: { key: "value" },
        events: [{ name: "milestone", time: 1500 }],
        startTime: 1000,
        endTime: 1200,
      });

      expect(hasStatus(span, "ok")).toBe(true);
      expect(hasAttribute(span, "key", "value")).toBe(true);
      expect(hasEvent(span, "milestone")).toBe(true);
      expect(hasDuration(span, 100, 300)).toBe(true);
    });

    it("returns false when any predicate fails", () => {
      const span = createSpan({
        status: "ok",
        attributes: { key: "value" },
      });

      const allMatch =
        hasStatus(span, "ok") &&
        hasAttribute(span, "key", "value") &&
        hasEvent(span, "missing") &&
        hasDuration(span, 100);

      expect(allMatch).toBe(false);
    });
  });
});
