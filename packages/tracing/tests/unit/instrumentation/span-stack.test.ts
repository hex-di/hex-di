/**
 * Tests for the span stack module.
 *
 * Verifies:
 * - LIFO ordering for push/pop operations
 * - Empty stack behavior
 * - getActiveSpan non-destructive access
 * - clearStack reset functionality
 * - getStackDepth accurate tracking
 * - Nested push/pop maintains correct parent relationships
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  pushSpan,
  popSpan,
  getActiveSpan,
  clearStack,
  getStackDepth,
} from "../../../src/instrumentation/span-stack.js";
import type { Span } from "../../../src/types/index.js";

/**
 * Creates a mock span for testing.
 * Uses a simple object with just the context property to satisfy the Span interface.
 */
function createMockSpan(id: string): Span {
  return {
    context: {
      traceId: "00000000000000000000000000000001",
      spanId: id.padStart(16, "0"),
      traceFlags: 0x01,
    },
    setAttribute: () => ({}) as Span,
    setAttributes: () => ({}) as Span,
    addEvent: () => ({}) as Span,
    setStatus: () => ({}) as Span,
    recordException: () => ({}) as Span,
    end: () => {},
    isRecording: () => true,
  };
}

describe("span-stack", () => {
  beforeEach(() => {
    clearStack();
  });

  describe("pushSpan/popSpan", () => {
    it("should maintain LIFO ordering", () => {
      const spanA = createMockSpan("a");
      const spanB = createMockSpan("b");
      const spanC = createMockSpan("c");

      pushSpan(spanA);
      pushSpan(spanB);
      pushSpan(spanC);

      // Pop in reverse order: C, B, A
      expect(popSpan()).toBe(spanC);
      expect(popSpan()).toBe(spanB);
      expect(popSpan()).toBe(spanA);
    });

    it("should return undefined when popping empty stack", () => {
      expect(popSpan()).toBeUndefined();
    });

    it("should handle single span push/pop", () => {
      const span = createMockSpan("single");

      pushSpan(span);
      expect(popSpan()).toBe(span);
      expect(popSpan()).toBeUndefined();
    });

    it("should handle multiple push/pop cycles", () => {
      const span1 = createMockSpan("1");
      const span2 = createMockSpan("2");

      pushSpan(span1);
      expect(popSpan()).toBe(span1);

      pushSpan(span2);
      expect(popSpan()).toBe(span2);

      expect(popSpan()).toBeUndefined();
    });
  });

  describe("getActiveSpan", () => {
    it("should return top span without removing it", () => {
      const spanA = createMockSpan("a");
      const spanB = createMockSpan("b");

      pushSpan(spanA);
      pushSpan(spanB);

      // Get active span multiple times - should always return spanB
      expect(getActiveSpan()).toBe(spanB);
      expect(getActiveSpan()).toBe(spanB);
      expect(getActiveSpan()).toBe(spanB);

      // Stack should still have both spans
      expect(popSpan()).toBe(spanB);
      expect(popSpan()).toBe(spanA);
    });

    it("should return undefined when stack is empty", () => {
      expect(getActiveSpan()).toBeUndefined();
    });

    it("should return correct span as stack changes", () => {
      const spanA = createMockSpan("a");
      const spanB = createMockSpan("b");
      const spanC = createMockSpan("c");

      pushSpan(spanA);
      expect(getActiveSpan()).toBe(spanA);

      pushSpan(spanB);
      expect(getActiveSpan()).toBe(spanB);

      pushSpan(spanC);
      expect(getActiveSpan()).toBe(spanC);

      popSpan();
      expect(getActiveSpan()).toBe(spanB);

      popSpan();
      expect(getActiveSpan()).toBe(spanA);

      popSpan();
      expect(getActiveSpan()).toBeUndefined();
    });
  });

  describe("clearStack", () => {
    it("should reset stack to empty state", () => {
      const spanA = createMockSpan("a");
      const spanB = createMockSpan("b");
      const spanC = createMockSpan("c");

      pushSpan(spanA);
      pushSpan(spanB);
      pushSpan(spanC);

      expect(getStackDepth()).toBe(3);

      clearStack();

      expect(getStackDepth()).toBe(0);
      expect(getActiveSpan()).toBeUndefined();
      expect(popSpan()).toBeUndefined();
    });

    it("should be idempotent on empty stack", () => {
      clearStack();
      clearStack();
      clearStack();

      expect(getStackDepth()).toBe(0);
    });

    it("should allow push after clear", () => {
      const spanA = createMockSpan("a");
      const spanB = createMockSpan("b");

      pushSpan(spanA);
      clearStack();

      pushSpan(spanB);

      expect(getActiveSpan()).toBe(spanB);
      expect(getStackDepth()).toBe(1);
    });
  });

  describe("getStackDepth", () => {
    it("should track depth accurately", () => {
      expect(getStackDepth()).toBe(0);

      pushSpan(createMockSpan("1"));
      expect(getStackDepth()).toBe(1);

      pushSpan(createMockSpan("2"));
      expect(getStackDepth()).toBe(2);

      pushSpan(createMockSpan("3"));
      expect(getStackDepth()).toBe(3);

      popSpan();
      expect(getStackDepth()).toBe(2);

      popSpan();
      expect(getStackDepth()).toBe(1);

      popSpan();
      expect(getStackDepth()).toBe(0);
    });

    it("should return 0 for empty stack", () => {
      expect(getStackDepth()).toBe(0);
    });

    it("should handle large depth", () => {
      const spans = Array.from({ length: 100 }, (_, i) => createMockSpan(String(i)));

      spans.forEach(span => pushSpan(span));
      expect(getStackDepth()).toBe(100);

      spans.reverse().forEach(span => {
        expect(popSpan()).toBe(span);
      });
      expect(getStackDepth()).toBe(0);
    });
  });

  describe("nested push/pop maintains correct parent relationships", () => {
    it("should handle nested resolution pattern", () => {
      // Simulate: resolve A -> resolve B (nested) -> resolve C (nested in B)
      const spanA = createMockSpan("a");
      const spanB = createMockSpan("b");
      const spanC = createMockSpan("c");

      // Start resolving A
      pushSpan(spanA);
      expect(getActiveSpan()).toBe(spanA);
      expect(getStackDepth()).toBe(1);

      // A triggers nested resolution of B
      pushSpan(spanB);
      expect(getActiveSpan()).toBe(spanB); // B is now active
      expect(getStackDepth()).toBe(2);

      // B triggers nested resolution of C
      pushSpan(spanC);
      expect(getActiveSpan()).toBe(spanC); // C is now active
      expect(getStackDepth()).toBe(3);

      // Complete C
      expect(popSpan()).toBe(spanC);
      expect(getActiveSpan()).toBe(spanB); // Back to B
      expect(getStackDepth()).toBe(2);

      // Complete B
      expect(popSpan()).toBe(spanB);
      expect(getActiveSpan()).toBe(spanA); // Back to A
      expect(getStackDepth()).toBe(1);

      // Complete A
      expect(popSpan()).toBe(spanA);
      expect(getActiveSpan()).toBeUndefined();
      expect(getStackDepth()).toBe(0);
    });

    it("should handle parallel siblings correctly", () => {
      // Simulate: resolve A -> resolve B, complete B -> resolve C, complete C -> complete A
      const spanA = createMockSpan("a");
      const spanB = createMockSpan("b");
      const spanC = createMockSpan("c");

      pushSpan(spanA);

      // First child B
      pushSpan(spanB);
      expect(getActiveSpan()).toBe(spanB);
      popSpan(); // Complete B
      expect(getActiveSpan()).toBe(spanA); // Back to parent A

      // Second child C (sibling to B)
      pushSpan(spanC);
      expect(getActiveSpan()).toBe(spanC);
      popSpan(); // Complete C
      expect(getActiveSpan()).toBe(spanA); // Back to parent A

      // Complete parent A
      popSpan();
      expect(getActiveSpan()).toBeUndefined();
    });

    it("should handle deeply nested resolutions", () => {
      const depth = 10;
      const spans = Array.from({ length: depth }, (_, i) => createMockSpan(String(i)));

      // Push all spans (simulating nested resolutions)
      spans.forEach((span, i) => {
        pushSpan(span);
        expect(getStackDepth()).toBe(i + 1);
        expect(getActiveSpan()).toBe(span);
      });

      // Pop all spans in reverse order
      for (let i = depth - 1; i >= 0; i--) {
        expect(getActiveSpan()).toBe(spans[i]);
        expect(popSpan()).toBe(spans[i]);
        expect(getStackDepth()).toBe(i);
      }

      expect(getActiveSpan()).toBeUndefined();
      expect(getStackDepth()).toBe(0);
    });
  });
});
